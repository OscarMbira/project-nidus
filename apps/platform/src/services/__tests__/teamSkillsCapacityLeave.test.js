/**
 * Unit tests for teamSkillsService / teamCapacityService / teamLeaveService (v1109).
 * The actual project-team-visibility rule lives in RLS (SQL/v1129, not unit-testable here) — these
 * tests cover the service-layer logic: resolving project team members (internal id + auth uid),
 * and that list*() functions correctly scope to those members and attach the resolved member info.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

function matchFilters(row, filters) {
  return filters.every(([col, op, val]) => {
    if (op === 'eq') return row[col] === val
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

    const api = {
      select() { if (!mode) mode = 'select'; return api },
      eq(col, val) { filters.push([col, 'eq', val]); return api },
      in(col, vals) { filters.push([col, 'in', vals]); return api },
      order() { return api },
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
          result = { data: row, error: null }
        } else if (mode === 'upsert') {
          const existingIdx = state[table].findIndex(
            (r) => r.user_id === payload.user_id && r.skill_id === payload.skill_id,
          )
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
          result = single ? { data: rows[0] || null, error: null } : { data: rows, error: null }
        }
        return Promise.resolve(result).then(resolve, reject)
      },
    }
    return api
  }

  return {
    from: (table) => builder(table),
    auth: { getUser: () => Promise.resolve({ data: { user: { id: 'caller-auth-uid' } } }) },
    __state: state,
  }
}

let fakeDb

vi.mock('../supabaseClient', () => ({
  get platformDb() {
    return fakeDb
  },
}))

import { listProjectTeamMembers, listMemberSkills, upsertMemberSkill } from '../teamSkillsService'
import { listProjectCapacity, upsertCapacitySetting } from '../teamCapacityService'
import { listProjectLeave, addLeaveEntry } from '../teamLeaveService'

describe('teamSkillsService / teamCapacityService / teamLeaveService (v1109)', () => {
  beforeEach(() => {
    fakeDb = makeFakeDb({
      project_memberships: [
        { user_id: 'internal-1', project_id: 'proj-1', is_active: true, users: { id: 'internal-1', auth_user_id: 'auth-1', full_name: 'Alice', email: 'alice@x.com', avatar_url: null } },
        { user_id: 'internal-2', project_id: 'proj-1', is_active: true, users: { id: 'internal-2', auth_user_id: 'auth-2', full_name: 'Bob', email: 'bob@x.com', avatar_url: null } },
      ],
      member_skills: [
        { id: 'ms-1', user_id: 'auth-1', skill_id: 'skill-1', competency_level: 4, is_deleted: false },
        { id: 'ms-2', user_id: 'someone-not-on-project', skill_id: 'skill-1', competency_level: 2, is_deleted: false },
      ],
      workload_capacity_settings: [
        { id: 'cap-1', user_id: 'auth-2', project_id: 'proj-1', hours_per_day: 6, is_deleted: false },
      ],
      workload_leave_calendar: [
        { id: 'leave-1', user_id: 'auth-1', leave_type: 'annual_leave', start_date: '2026-10-01', end_date: '2026-10-03', is_deleted: false },
      ],
    })
  })

  it('listProjectTeamMembers resolves internal id + auth uid for each active member', async () => {
    const res = await listProjectTeamMembers('proj-1')
    expect(res.success).toBe(true)
    expect(res.data).toHaveLength(2)
    expect(res.data[0]).toMatchObject({ userId: 'internal-1', authUserId: 'auth-1', fullName: 'Alice' })
  })

  it('listMemberSkills only returns rows for this project\'s team members, with member info attached', async () => {
    const res = await listMemberSkills('proj-1')
    expect(res.success).toBe(true)
    expect(res.data).toHaveLength(1)
    expect(res.data[0].id).toBe('ms-1')
    expect(res.data[0].member.fullName).toBe('Alice')
  })

  it('upsertMemberSkill creates a new row, then updates the same row on conflict (no duplicate)', async () => {
    const first = await upsertMemberSkill('acct-1', 'auth-1', 'skill-2', 3, 'first pass')
    expect(first.success).toBe(true)
    expect(first.data.account_id).toBe('acct-1')
    const second = await upsertMemberSkill('acct-1', 'auth-1', 'skill-2', 5, 'reassessed')
    expect(second.success).toBe(true)
    const rows = fakeDb.__state.member_skills.filter((r) => r.user_id === 'auth-1' && r.skill_id === 'skill-2')
    expect(rows).toHaveLength(1)
    expect(rows[0].competency_level).toBe(5)
  })

  it('listProjectCapacity scopes to project team members', async () => {
    const res = await listProjectCapacity('proj-1')
    expect(res.success).toBe(true)
    expect(res.data).toHaveLength(1)
    expect(res.data[0].member.fullName).toBe('Bob')
  })

  it('upsertCapacitySetting inserts a new row when no id is given', async () => {
    const res = await upsertCapacitySetting({
      accountId: 'acct-1', projectId: 'proj-1', authUserId: 'auth-1',
      hoursPerDay: 8, hoursPerWeek: 40, effectiveFrom: '2026-10-01',
    })
    expect(res.success).toBe(true)
    expect(res.data.hours_per_day).toBe(8)
  })

  it('listProjectLeave scopes to project team members', async () => {
    const res = await listProjectLeave('proj-1')
    expect(res.success).toBe(true)
    expect(res.data).toHaveLength(1)
    expect(res.data[0].member.fullName).toBe('Alice')
  })

  it('addLeaveEntry stamps created_by from the current auth session', async () => {
    const res = await addLeaveEntry({
      accountId: 'acct-1', authUserId: 'auth-2', leaveType: 'sick_leave',
      startDate: '2026-11-01', endDate: '2026-11-02',
    })
    expect(res.success).toBe(true)
    expect(res.data.created_by).toBe('caller-auth-uid')
  })
})
