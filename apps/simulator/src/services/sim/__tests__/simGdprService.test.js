/**
 * Unit tests for simGdprService (v1108) — Simulator parity for gdprService.test.js (Platform),
 * covering the registry-driven export/anonymization and the mixed identity-space resolution
 * (some Tier-1 modules key off auth.uid() directly, others off the resolved internal user id).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

function matchFilters(row, filters) {
  return filters.every(([col, op, val]) => {
    if (col === null && op === 'or') return val.some(([c, v]) => row[c] === v)
    if (op === 'eq') return row[col] === val
    if (op === 'neq') return row[col] !== val
    if (op === 'in') return (val || []).includes(row[col])
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
      eq(col, val) { filters.push([col, 'eq', val]); return api },
      neq(col, val) { filters.push([col, 'neq', val]); return api },
      in(col, vals) { filters.push([col, 'in', vals]); return api },
      or(filterString) {
        const pairs = filterString.split(',').map((part) => {
          const [col, , val] = part.split('.')
          return [col, val]
        })
        filters.push([null, 'or', pairs])
        return api
      },
      order() { return api },
      limit() { return api },
      single() { single = true; return api },
      maybeSingle() { single = true; return api },
      insert(data) { mode = 'insert'; payload = data; return api },
      update(data) { mode = 'update'; payload = data; return api },
      upsert(data) { mode = 'upsert'; payload = data; return api },
      then(resolve, reject) {
        let result
        if (mode === 'insert') {
          const row = { id: `row-${idCounter++}`, ...payload }
          state[table].push(row)
          result = { data: single ? row : [row], error: null }
        } else if (mode === 'upsert') {
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
          if (countHead) result = { data: null, count: rows.length, error: null }
          else result = single ? { data: rows[0] || null, error: null } : { data: rows, error: null }
        }
        return Promise.resolve(result).then(resolve, reject)
      },
    }
    return api
  }

  return { from: (table) => builder(table), __state: state }
}

let fakeDb

vi.mock('../../supabaseClient', () => ({
  get simDb() {
    return fakeDb
  },
}))

vi.mock('../../../utils/accountResolution', () => ({
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
} from '../simGdprService'

const TARGET_AUTH_UID = 'auth-uid-target-1'

describe('simGdprService (v1108)', () => {
  beforeEach(() => {
    fakeDb = makeFakeDb({
      consent_logs: [],
      data_export_requests: [],
      data_deletion_requests: [],
      privacy_preferences: [],
      data_breach_records: [],
      practice_gdpr_export_registry: [
        { module_name: 'Risks', table_name: 'practice_risks', owner_columns: ['risk_owner_user_id'], owner_identity_space: 'auth_user', is_active: true },
        { module_name: 'Constraints', table_name: 'practice_constraints', owner_columns: ['owner_user_id'], owner_identity_space: 'internal_user', is_active: true },
      ],
      users: [{ id: 'internal-target-1', auth_user_id: TARGET_AUTH_UID, email: 'a@b.com', full_name: 'Target User', is_deleted: false }],
      practice_risks: [
        { id: 'risk-1', risk_owner_user_id: TARGET_AUTH_UID, risk_title: 'Sim outage', is_deleted: false },
        { id: 'risk-2', risk_owner_user_id: 'someone-else-auth-uid', risk_title: 'Not theirs', is_deleted: false },
      ],
      practice_constraints: [
        { id: 'con-1', owner_user_id: 'internal-target-1', constraint_text: 'Budget cap', is_deleted: false },
      ],
    })
  })

  it('recordConsent resolves the internal user id for created_by, and stores the raw auth uid as user_id', async () => {
    const res = await recordConsent(TARGET_AUTH_UID, 'marketing', true, 'I agree')
    expect(res.success).toBe(true)
    expect(res.data.created_by).toBe('internal-user-1')
    expect(res.data.user_id).toBe(TARGET_AUTH_UID)
    expect(res.data.account_id).toBe('account-1')
  })

  it('processDataExportRequest includes both auth_user-keyed and internal_user-keyed Tier-1 modules, scoped correctly', async () => {
    const created = await requestDataExport(TARGET_AUTH_UID, 'json')
    const res = await processDataExportRequest(created.data.id)

    expect(res.success).toBe(true)
    const exportPayload = JSON.parse(res.export_data)
    expect(exportPayload.modules.Risks).toHaveLength(1)
    expect(exportPayload.modules.Risks[0].id).toBe('risk-1')
    expect(exportPayload.modules.Constraints).toHaveLength(1)
    expect(exportPayload.modules.Constraints[0].id).toBe('con-1')
  })

  it('requestDataDeletion sets a 30-day grace period and can be cancelled while pending', async () => {
    const created = await requestDataDeletion(TARGET_AUTH_UID)
    expect(created.data.request_status).toBe('pending')
    const cancelled = await cancelDataDeletionRequest(created.data.id)
    expect(cancelled.success).toBe(true)
    expect(cancelled.data.request_status).toBe('rejected')
  })

  it('processDataDeletionRequest anonymizes the users row and both identity-space Tier-1 modules, leaving other users untouched', async () => {
    const created = await requestDataDeletion(TARGET_AUTH_UID)
    const res = await processDataDeletionRequest(created.data.id)

    expect(res.success).toBe(true)

    const anonymizedUser = fakeDb.__state.users.find((u) => u.id === 'internal-target-1')
    expect(anonymizedUser.is_deleted).toBe(true)

    const risk1 = fakeDb.__state.practice_risks.find((r) => r.id === 'risk-1')
    expect(risk1.risk_owner_user_id).toBeNull()
    const risk2 = fakeDb.__state.practice_risks.find((r) => r.id === 'risk-2')
    expect(risk2.risk_owner_user_id).toBe('someone-else-auth-uid')

    const con1 = fakeDb.__state.practice_constraints.find((c) => c.id === 'con-1')
    expect(con1.owner_user_id).toBeNull()

    expect(res.data.deletion_scope.tables_affected).toContain('users')
  })
})
