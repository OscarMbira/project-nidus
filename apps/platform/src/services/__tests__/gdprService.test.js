/**
 * Unit tests for gdprService (v1108 rewrite) — focused on the new registry-driven export/
 * anonymization logic and the created_by/account_id resolution fix (previously wrote the raw
 * auth UUID into a column FK'd to public.users.id).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

function matchFilters(row, filters) {
  return filters.every(([col, op, val]) => {
    if (op === 'eq') return row[col] === val
    if (op === 'neq') return row[col] !== val
    if (op === 'in') return (val || []).includes(row[col])
    if (op === 'or') {
      // val: [[col, value], ...] — true if ANY pair matches
      return val.some(([c, v]) => row[c] === v)
    }
    return true
  })
}

function makeFakeDb(initialState) {
  const state = initialState
  let idCounter = 1

  function builder(table) {
    let mode = null
    let payload = null
    const filters = []
    let single = false
    let countHead = false

    const api = {
      select(_cols, opts) {
        if (!mode) mode = 'select'
        if (opts?.count === 'exact' && opts?.head) countHead = true
        return api
      },
      eq(col, val) {
        filters.push([col, 'eq', val])
        return api
      },
      neq(col, val) {
        filters.push([col, 'neq', val])
        return api
      },
      in(col, vals) {
        filters.push([col, 'in', vals])
        return api
      },
      or(filterString) {
        const pairs = filterString.split(',').map((part) => {
          const [col, , val] = part.split('.')
          return [col, val]
        })
        filters.push([null, 'or', pairs])
        return api
      },
      order() {
        return api
      },
      limit() {
        return api
      },
      single() {
        single = true
        return api
      },
      maybeSingle() {
        single = true
        return api
      },
      insert(data) {
        mode = 'insert'
        payload = data
        return api
      },
      update(data) {
        mode = 'update'
        payload = data
        return api
      },
      upsert(data) {
        mode = 'upsert'
        payload = data
        return api
      },
      then(resolve, reject) {
        let result
        if (mode === 'insert') {
          const row = { id: `row-${idCounter++}`, ...payload }
          state[table].push(row)
          result = { data: single ? row : [row], error: null }
        } else if (mode === 'upsert') {
          const key = filters.find(([, op]) => op === 'eq')
          const existingIdx = state[table].findIndex((r) => payload.user_id && r.user_id === payload.user_id)
          if (existingIdx >= 0) {
            state[table][existingIdx] = { ...state[table][existingIdx], ...payload }
            result = { data: state[table][existingIdx], error: null }
          } else {
            const row = { id: `row-${idCounter++}`, ...payload }
            state[table].push(row)
            result = { data: row, error: null }
          }
        } else if (mode === 'update') {
          const affected = []
          state[table] = state[table].map((r) => {
            if (matchFilters(r, filters)) {
              const updated = { ...r, ...payload }
              affected.push(updated)
              return updated
            }
            return r
          })
          result = { data: single ? affected[0] || null : affected, error: null }
        } else {
          const rows = state[table].filter((r) => matchFilters(r, filters))
          if (countHead) {
            result = { data: null, count: rows.length, error: null }
          } else {
            result = single ? { data: rows[0] || null, error: null } : { data: rows, error: null }
          }
        }
        return Promise.resolve(result).then(resolve, reject)
      },
    }
    return api
  }

  return { from: (table) => builder(table), __state: state }
}

let fakeDb

vi.mock('../supabaseClient', () => ({
  get supabase() {
    return fakeDb
  },
}))

vi.mock('@nidus/shared/utils/accountResolution', () => ({
  getCurrentUserInternalUserId: vi.fn(() => Promise.resolve('internal-user-1')),
  getCurrentUserAccountId: vi.fn(() => Promise.resolve('account-1')),
}))

import {
  recordConsent,
  requestDataExport,
  processDataExportRequest,
  requestDataDeletion,
  processDataDeletionRequest,
  cancelDataDeletionRequest,
} from '../gdprService'

describe('gdprService (v1108)', () => {
  beforeEach(() => {
    fakeDb = makeFakeDb({
      consent_logs: [],
      data_export_requests: [],
      data_deletion_requests: [],
      privacy_preferences: [],
      data_breach_records: [],
      gdpr_export_registry: [
        { module_name: 'Risks', table_name: 'risks', owner_columns: ['risk_owner_user_id'], is_active: true },
      ],
      users: [{ id: 'target-user-1', email: 'a@b.com', full_name: 'Target User', is_deleted: false }],
      user_projects: [],
      tasks: [],
      user_preferences: [],
      risks: [
        { id: 'risk-1', risk_owner_user_id: 'target-user-1', risk_title: 'Server outage', is_deleted: false },
        { id: 'risk-2', risk_owner_user_id: 'someone-else', risk_title: 'Not theirs', is_deleted: false },
      ],
    })
  })

  it('recordConsent resolves the internal user id, not the raw auth uid, for created_by', async () => {
    const res = await recordConsent('target-user-1', 'marketing', true, 'I agree')
    expect(res.success).toBe(true)
    expect(res.data.created_by).toBe('internal-user-1')
    expect(res.data.account_id).toBe('account-1')
  })

  it('requestDataExport sets account_id and created_by correctly', async () => {
    const res = await requestDataExport('target-user-1', 'json')
    expect(res.success).toBe(true)
    expect(res.data.created_by).toBe('internal-user-1')
    expect(res.data.account_id).toBe('account-1')
    expect(res.data.request_status).toBe('pending')
  })

  it('processDataExportRequest includes the Tier-1 registry module data, scoped to the target user', async () => {
    const created = await requestDataExport('target-user-1', 'json')
    const res = await processDataExportRequest(created.data.id)

    expect(res.success).toBe(true)
    expect(res.data.request_status).toBe('completed')
    expect(res.data.processed_by).toBe('internal-user-1')

    const exportPayload = JSON.parse(res.export_data)
    expect(exportPayload.modules.Risks).toHaveLength(1)
    expect(exportPayload.modules.Risks[0].id).toBe('risk-1')
  })

  it('requestDataDeletion sets a 30-day grace period and can be cancelled while pending', async () => {
    const created = await requestDataDeletion('target-user-1', 'no longer needed')
    expect(created.success).toBe(true)
    expect(created.data.request_status).toBe('pending')
    const scheduled = new Date(created.data.scheduled_deletion_date)
    const daysOut = (scheduled - Date.now()) / (24 * 60 * 60 * 1000)
    expect(daysOut).toBeGreaterThan(29)
    expect(daysOut).toBeLessThan(31)

    const cancelled = await cancelDataDeletionRequest(created.data.id)
    expect(cancelled.success).toBe(true)
    expect(cancelled.data.request_status).toBe('rejected')
  })

  it('processDataDeletionRequest anonymizes the users row and the Tier-1 module rows, leaving other users untouched', async () => {
    const created = await requestDataDeletion('target-user-1')
    const res = await processDataDeletionRequest(created.data.id)

    expect(res.success).toBe(true)
    expect(res.data.request_status).toBe('completed')

    const anonymizedUser = fakeDb.__state.users.find((u) => u.id === 'target-user-1')
    expect(anonymizedUser.is_deleted).toBe(true)
    expect(anonymizedUser.full_name).toBe('Deleted User')

    const risk1 = fakeDb.__state.risks.find((r) => r.id === 'risk-1')
    expect(risk1.risk_owner_user_id).toBeNull()
    const risk2 = fakeDb.__state.risks.find((r) => r.id === 'risk-2')
    expect(risk2.risk_owner_user_id).toBe('someone-else')

    expect(res.data.deletion_scope.tables_affected).toContain('users')
    expect(res.data.deletion_scope.tables_affected.some((t) => t.startsWith('risks'))).toBe(true)
  })
})
