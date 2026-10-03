import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()
const mockGetUser = vi.fn()

vi.mock('../supabase/supabaseClient', () => ({
  platformDb: { from: (...args) => mockFrom(...args), auth: { getUser: (...args) => mockGetUser(...args) } },
}))

import {
  matchWorkPlanItemToTimesheetEntries,
  computeWorkPlanVariance,
  userCanManageWorkPlanApprovals,
  submitWorkPlan,
  getOrCreateWorkPlan,
} from '../projectWorkPlanService'

function chainableResult(result) {
  const obj = {
    eq: () => obj,
    order: () => obj,
    select: () => obj,
    single: () => Promise.resolve(result),
    maybeSingle: () => Promise.resolve(result),
    then: (resolve) => resolve(result),
  }
  return obj
}

describe('matchWorkPlanItemToTimesheetEntries (pure)', () => {
  const entries = [
    { id: 'e1', task_id: 'task-1', work_category: 'general', hours_worked: 2, is_overtime: false },
    { id: 'e2', task_id: null, work_category: 'meeting', hours_worked: 1.5, is_overtime: false },
    { id: 'e3', task_id: null, work_category: 'general', hours_worked: 3, is_overtime: false },
    { id: 'e4', task_id: 'task-1', work_category: null, hours_worked: 1, is_overtime: true },
  ]

  it('matches by task_id when the item has one, ignoring overtime entries', () => {
    const r = matchWorkPlanItemToTimesheetEntries({ task_id: 'task-1', work_category: null }, entries)
    expect(r.matchType).toBe('task')
    expect(r.entries.map((e) => e.id)).toEqual(['e1'])
  })

  it('falls back to work_category when there is no task_id match', () => {
    const r = matchWorkPlanItemToTimesheetEntries({ task_id: null, work_category: 'general' }, entries)
    expect(r.matchType).toBe('category')
    expect(r.entries.map((e) => e.id).sort()).toEqual(['e1', 'e3'])
  })

  it('falls back to work_category when the task_id is set but matches nothing', () => {
    const r = matchWorkPlanItemToTimesheetEntries({ task_id: 'task-999', work_category: 'meeting' }, entries)
    expect(r.matchType).toBe('category')
    expect(r.entries.map((e) => e.id)).toEqual(['e2'])
  })

  it('is unmatched when neither task_id nor work_category is set or matches', () => {
    const r = matchWorkPlanItemToTimesheetEntries({ task_id: null, work_category: null }, entries)
    expect(r.matchType).toBe('unmatched')
    expect(r.entries).toEqual([])
  })
})

describe('computeWorkPlanVariance (pure)', () => {
  const entries = [
    { id: 'e1', task_id: 'task-1', work_category: 'general', hours_worked: 2, is_overtime: false },
    { id: 'e2', task_id: null, work_category: 'meeting', hours_worked: 1.5, is_overtime: false },
    { id: 'e3', task_id: null, work_category: null, hours_worked: 4, is_overtime: false }, // unplanned
  ]
  const items = [
    { id: 'i1', task_id: 'task-1', work_category: null, estimated_hours: 5 },
    { id: 'i2', task_id: null, work_category: 'meeting', estimated_hours: 2 },
    { id: 'i3', task_id: null, work_category: 'support', estimated_hours: 3 }, // no matching entries
  ]

  it('sums planned vs actual hours and computes variance', () => {
    const r = computeWorkPlanVariance(items, entries)
    expect(r.plannedHours).toBe(10) // 5 + 2 + 3
    expect(r.actualHours).toBe(3.5) // 2 + 1.5
    expect(r.varianceHours).toBeCloseTo(-6.5)
    expect(r.variancePct).toBeCloseTo(-65)
  })

  it('flags items with planned hours but zero logged hours', () => {
    const r = computeWorkPlanVariance(items, entries)
    const i3 = r.items.find((i) => i.itemId === 'i3')
    expect(i3.noHoursLogged).toBe(true)
    expect(i3.matchType).toBe('unmatched')
  })

  it('reports unplanned hours — entries that match no plan item', () => {
    const r = computeWorkPlanVariance(items, entries)
    expect(r.unplannedHours).toBe(4)
    expect(r.unplannedEntryCount).toBe(1)
  })

  it('returns a null variancePct when nothing was planned', () => {
    const r = computeWorkPlanVariance([], entries)
    expect(r.plannedHours).toBe(0)
    expect(r.variancePct).toBeNull()
  })
})

describe('userCanManageWorkPlanApprovals (v1180)', () => {
  beforeEach(() => {
    mockFrom.mockReset()
    mockGetUser.mockReset()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-1' } } })
  })

  it('returns true for a team_lead role assignment (broader than Timesheet Settings approval)', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'users') return { select: () => chainableResult({ data: { id: 'uid-1' }, error: null }) }
      if (table === 'projects') return { select: () => chainableResult({ data: { project_manager_user_id: null }, error: null }) }
      if (table === 'user_roles') return { select: () => chainableResult({ data: [{ roles: { role_name: 'team_lead' } }], error: null }) }
      throw new Error(`Unexpected table: ${table}`)
    })
    const r = await userCanManageWorkPlanApprovals('proj-1', 'acct-1')
    expect(r).toBe(true)
  })

  it('returns false for a plain team_member role with no PMO/owner fallback', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'users') return { select: () => chainableResult({ data: { id: 'uid-1' }, error: null }) }
      if (table === 'projects') return { select: () => chainableResult({ data: { project_manager_user_id: 'someone-else' }, error: null }) }
      if (table === 'user_roles') return { select: () => chainableResult({ data: [{ roles: { role_name: 'team_member' } }], error: null }) }
      if (table === 'accounts') return { select: () => chainableResult({ data: { owner_user_id: 'someone-else' }, error: null }) }
      throw new Error(`Unexpected table: ${table}`)
    })
    const r = await userCanManageWorkPlanApprovals('proj-1', 'acct-1')
    expect(r).toBe(false)
  })
})

describe('submitWorkPlan (v1180)', () => {
  beforeEach(() => { mockFrom.mockReset() })

  it('rejects submitting a plan with zero items', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'project_work_plan_items') return { select: () => chainableResult({ data: [], error: null }) }
      throw new Error(`Unexpected table: ${table}`)
    })
    await expect(submitWorkPlan('plan-1')).rejects.toThrow(/at least one item/i)
  })

  it('submits a plan that has at least one item', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'project_work_plan_items') return { select: () => chainableResult({ data: [{ id: 'item-1' }], error: null }) }
      if (table === 'project_work_plans') {
        return {
          update: () => ({ eq: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: 'plan-1', status: 'submitted' }, error: null }) }) }) }),
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    })
    const r = await submitWorkPlan('plan-1')
    expect(r.status).toBe('submitted')
  })
})

describe('getOrCreateWorkPlan (v1180) — check-then-insert race', () => {
  beforeEach(() => { mockFrom.mockReset() })

  it('recovers from a lost race (23505 unique violation) by fetching the row the other caller created, instead of throwing', async () => {
    let selectCallCount = 0
    mockFrom.mockImplementation((table) => {
      if (table !== 'project_work_plans') throw new Error(`Unexpected table: ${table}`)
      return {
        select: () => {
          selectCallCount += 1
          // First select (the initial "does it exist" check) finds nothing; the second
          // select (after losing the insert race) finds the row the other caller created.
          const data = selectCallCount === 1 ? null : { id: 'plan-1', status: 'draft' }
          return chainableResult({ data, error: null })
        },
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint "uq_project_work_plans_person_period"' } }),
          }),
        }),
      }
    })
    const r = await getOrCreateWorkPlan('proj-1', 'user-1', 'weekly', '2026-08-17', '2026-08-23')
    expect(r).toEqual({ id: 'plan-1', status: 'draft' })
  })

  it('still throws for a non-race insert error', async () => {
    mockFrom.mockImplementation((table) => {
      if (table !== 'project_work_plans') throw new Error(`Unexpected table: ${table}`)
      return {
        select: () => chainableResult({ data: null, error: null }),
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: null, error: { code: '42501', message: 'permission denied' } }),
          }),
        }),
      }
    })
    await expect(getOrCreateWorkPlan('proj-1', 'user-1', 'weekly', '2026-08-17', '2026-08-23')).rejects.toMatchObject({ code: '42501' })
  })
})
