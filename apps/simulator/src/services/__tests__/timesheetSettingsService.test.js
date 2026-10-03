import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()
const mockGetUser = vi.fn()

vi.mock('../supabase/supabaseClient', () => ({
  platformDb: { from: (...args) => mockFrom(...args), auth: { getUser: (...args) => mockGetUser(...args) } },
}))

import {
  TIMESHEET_SETTINGS_DEFAULTS,
  mergeTimesheetSettings,
  resolveTimesheetSettings,
  buildProjectTimesheetSettingsPayload,
  userCanManageProjectTimesheetSettings,
} from '../timesheetSettingsService'

// Chainable mock matching Supabase's query builder: every .eq() returns the same object, and the
// object itself resolves (via .then) to `result` when awaited directly — covers both call sites
// that terminate with .maybeSingle() and the ones (v1178 fix) that just await the .eq() chain.
function chainableResult(result) {
  const obj = {
    eq: () => obj,
    maybeSingle: () => Promise.resolve(result),
    then: (resolve) => resolve(result),
  }
  return obj
}

describe('timesheetSettingsService — mergeTimesheetSettings (pure)', () => {
  it('falls back to defaults when no org row exists', () => {
    const r = mergeTimesheetSettings(null, null)
    expect(r.standard_daily_hours).toBe(TIMESHEET_SETTINGS_DEFAULTS.standard_daily_hours)
    expect(r.working_days).toEqual(TIMESHEET_SETTINGS_DEFAULTS.working_days)
    expect(r.overrides).toEqual({
      standard_daily_hours: false, max_overtime_per_day: false, max_overtime_per_week: false, working_days: false,
      work_plan_period_type: false,
    })
  })

  it('applies org defaults over the hardcoded fallback', () => {
    const orgRow = { standard_daily_hours: 7, max_overtime_per_day: 3, max_overtime_per_week: 8, working_days: ['sun', 'mon', 'tue', 'wed', 'thu'] }
    const r = mergeTimesheetSettings(orgRow, null)
    expect(r.standard_daily_hours).toBe(7)
    expect(r.working_days).toEqual(['sun', 'mon', 'tue', 'wed', 'thu'])
    expect(r.overrides.standard_daily_hours).toBe(false)
  })

  it('project override wins over org default for only the overridden fields', () => {
    const orgRow = { standard_daily_hours: 8, max_overtime_per_day: 4, max_overtime_per_week: 10, working_days: ['mon', 'tue', 'wed', 'thu', 'fri'] }
    const projectRow = { standard_daily_hours: 6, max_overtime_per_day: null, max_overtime_per_week: null, working_days: null }
    const r = mergeTimesheetSettings(orgRow, projectRow)
    expect(r.standard_daily_hours).toBe(6)
    expect(r.overrides.standard_daily_hours).toBe(true)
    expect(r.max_overtime_per_day).toBe(4) // inherited, not overridden
    expect(r.overrides.max_overtime_per_day).toBe(false)
  })
})

describe('timesheetSettingsService — buildProjectTimesheetSettingsPayload (pure)', () => {
  it('only includes values for fields flagged as overridden', () => {
    const payload = buildProjectTimesheetSettingsPayload(
      { standard_daily_hours: true, max_overtime_per_day: false, max_overtime_per_week: false, working_days: false },
      { standard_daily_hours: 6, max_overtime_per_day: 2, max_overtime_per_week: 5, working_days: ['mon', 'tue', 'wed', 'thu', 'fri'] }
    )
    expect(payload).toEqual({
      standard_daily_hours: 6,
      max_overtime_per_day: null,
      max_overtime_per_week: null,
      working_days: null,
      work_plan_period_type: null,
    })
  })
})

describe('timesheetSettingsService — resolveTimesheetSettings (DB-backed)', () => {
  beforeEach(() => { mockFrom.mockReset() })

  it('fetches org row only when no projectId is given', async () => {
    mockFrom.mockImplementation((table) => {
      expect(table).toBe('organisation_timesheet_settings')
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { standard_daily_hours: 7.5 }, error: null }),
            }),
          }),
        }),
      }
    })
    const r = await resolveTimesheetSettings('acct-1')
    expect(r.standard_daily_hours).toBe(7.5)
    expect(mockFrom).toHaveBeenCalledTimes(1)
  })

  it('fetches both org and project rows when projectId is given, and merges them', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'organisation_timesheet_settings') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: { standard_daily_hours: 8 }, error: null }),
              }),
            }),
          }),
        }
      }
      if (table === 'project_timesheet_settings') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: { standard_daily_hours: 6 }, error: null }),
              }),
            }),
          }),
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    })
    const r = await resolveTimesheetSettings('acct-1', 'proj-1')
    expect(r.standard_daily_hours).toBe(6)
    expect(r.overrides.standard_daily_hours).toBe(true)
  })
})

describe('timesheetSettingsService — userCanManageProjectTimesheetSettings (v1178 fix)', () => {
  beforeEach(() => {
    mockFrom.mockReset()
    mockGetUser.mockReset()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-1' } } })
  })

  it('returns true via the legacy projects.project_manager_user_id column', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'users') return { select: () => chainableResult({ data: { id: 'uid-1' }, error: null }) }
      if (table === 'projects') return { select: () => chainableResult({ data: { project_manager_user_id: 'uid-1' }, error: null }) }
      throw new Error(`Unexpected table: ${table}`)
    })
    const r = await userCanManageProjectTimesheetSettings('proj-1', 'acct-1')
    expect(r).toBe(true)
  })

  it('returns true when the project-scoped user_roles assignment is project_manager, even without the legacy column set', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'users') return { select: () => chainableResult({ data: { id: 'uid-1' }, error: null }) }
      if (table === 'projects') return { select: () => chainableResult({ data: { project_manager_user_id: null }, error: null }) }
      if (table === 'user_roles') return { select: () => chainableResult({ data: [{ roles: { role_name: 'project_manager' } }], error: null }) }
      throw new Error(`Unexpected table: ${table}`)
    })
    const r = await userCanManageProjectTimesheetSettings('proj-1', 'acct-1')
    expect(r).toBe(true)
  })

  it('returns true for a programme_manager role assignment', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'users') return { select: () => chainableResult({ data: { id: 'uid-1' }, error: null }) }
      if (table === 'projects') return { select: () => chainableResult({ data: { project_manager_user_id: null }, error: null }) }
      if (table === 'user_roles') return { select: () => chainableResult({ data: [{ roles: { role_name: 'programme_manager' } }], error: null }) }
      throw new Error(`Unexpected table: ${table}`)
    })
    const r = await userCanManageProjectTimesheetSettings('proj-1', 'acct-1')
    expect(r).toBe(true)
  })

  it('does not throw when the user holds multiple active roles on the same project ("Multiple roles")', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'users') return { select: () => chainableResult({ data: { id: 'uid-1' }, error: null }) }
      if (table === 'projects') return { select: () => chainableResult({ data: { project_manager_user_id: null }, error: null }) }
      if (table === 'user_roles') {
        return {
          select: () => chainableResult({
            data: [{ roles: { role_name: 'team_member' } }, { roles: { role_name: 'project_manager' } }],
            error: null,
          }),
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    })
    const r = await userCanManageProjectTimesheetSettings('proj-1', 'acct-1')
    expect(r).toBe(true)
  })

  it('falls through to PMO Admin/owner when neither the legacy column nor a role assignment matches', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'users') return { select: () => chainableResult({ data: { id: 'uid-1' }, error: null }) }
      if (table === 'projects') return { select: () => chainableResult({ data: { project_manager_user_id: 'someone-else' }, error: null }) }
      if (table === 'user_roles') return { select: () => chainableResult({ data: [{ roles: { role_name: 'team_member' } }], error: null }) }
      if (table === 'accounts') return { select: () => chainableResult({ data: { owner_user_id: 'uid-1' }, error: null }) }
      throw new Error(`Unexpected table: ${table}`)
    })
    const r = await userCanManageProjectTimesheetSettings('proj-1', 'acct-1')
    expect(r).toBe(true)
  })

  it('returns false when no path grants access', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'users') return { select: () => chainableResult({ data: { id: 'uid-1' }, error: null }) }
      if (table === 'projects') return { select: () => chainableResult({ data: { project_manager_user_id: 'someone-else' }, error: null }) }
      if (table === 'user_roles') return { select: () => chainableResult({ data: [{ roles: { role_name: 'team_member' } }], error: null }) }
      if (table === 'accounts') return { select: () => chainableResult({ data: { owner_user_id: 'someone-else' }, error: null }) }
      throw new Error(`Unexpected table: ${table}`)
    })
    const r = await userCanManageProjectTimesheetSettings('proj-1', 'acct-1')
    expect(r).toBe(false)
  })
})
