import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()

vi.mock('../supabase/supabaseClient', () => ({
  platformDb: { from: (...args) => mockFrom(...args) },
}))

import { getTimesheetOverview } from '../timesheetOverviewService'

function makeProjectsTable(projects) {
  return {
    select: () => ({
      eq: () => ({
        eq: () => Promise.resolve({ data: projects, error: null }),
      }),
    }),
  }
}

describe('timesheetOverviewService — getTimesheetOverview', () => {
  beforeEach(() => { mockFrom.mockReset() })

  it('org-wide (no projectIds): queries every project in the account', async () => {
    const projects = [{ id: 'p1', project_name: 'Alpha', project_code: 'A1' }, { id: 'p2', project_name: 'Beta', project_code: 'B1' }]
    let projectsEqCalledWithIn = false
    mockFrom.mockImplementation((table) => {
      if (table === 'projects') {
        return {
          select: () => ({
            eq: (col, val) => {
              expect(col).toBe('account_id')
              return {
                eq: () => Promise.resolve({ data: projects, error: null }),
              }
            },
          }),
        }
      }
      if (table === 'timesheet_entries') {
        return {
          select: () => ({
            in: (col) => {
              projectsEqCalledWithIn = col === 'project_id'
              return {
                eq: () => ({
                  gte: () => ({
                    lte: () => Promise.resolve({
                      data: [
                        { project_id: 'p1', user_id: 'u1', hours_worked: 5, is_overtime: false, status: 'approved', entry_date: '2026-09-29' },
                        { project_id: 'p2', user_id: 'u2', hours_worked: 3, is_overtime: true, status: 'submitted', entry_date: '2026-09-29' },
                      ],
                      error: null,
                    }),
                  }),
                }),
              }
            },
          }),
        }
      }
      if (table === 'timesheet_day_locations') {
        return {
          select: () => ({
            in: () => ({
              gte: () => ({
                lte: () => Promise.resolve({ data: [{ project_id: 'p1', user_id: 'u1', work_location: 'onsite' }], error: null }),
              }),
            }),
          }),
        }
      }
      if (table === 'users') {
        return {
          select: () => ({
            in: () => Promise.resolve({ data: [{ auth_user_id: 'u1', full_name: 'Alice' }, { auth_user_id: 'u2', full_name: 'Bob' }], error: null }),
          }),
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    })

    const result = await getTimesheetOverview('acct-1', '2026-09-28', '2026-10-04', null)
    expect(result.success).toBe(true)
    expect(projectsEqCalledWithIn).toBe(true)
    expect(result.data.totals.totalHours).toBe(8)
    expect(result.data.totals.overtimeHours).toBe(3)
    expect(result.data.totals.onsiteDays).toBe(1)
    expect(result.data.byProject.length).toBe(2)
    expect(result.data.byPerson.find((r) => r.id === 'u1').label).toBe('Alice')
  })

  it('project-scoped: restricts the projects query to the given ids', async () => {
    let inCalledWith = null
    mockFrom.mockImplementation((table) => {
      if (table === 'projects') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                in: (col, ids) => { inCalledWith = ids; return Promise.resolve({ data: [{ id: 'p1', project_name: 'Alpha', project_code: 'A1' }], error: null }) },
              }),
            }),
          }),
        }
      }
      if (table === 'timesheet_entries') {
        return { select: () => ({ in: () => ({ eq: () => ({ gte: () => ({ lte: () => Promise.resolve({ data: [], error: null }) }) }) }) }) }
      }
      if (table === 'timesheet_day_locations') {
        return { select: () => ({ in: () => ({ gte: () => ({ lte: () => Promise.resolve({ data: [], error: null }) }) }) }) }
      }
      throw new Error(`Unexpected table: ${table}`)
    })

    await getTimesheetOverview('acct-1', '2026-09-28', '2026-10-04', ['p1'])
    expect(inCalledWith).toEqual(['p1'])
  })

  it('returns an empty result without querying entries when no projects match', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'projects') return makeProjectsTable([])
      throw new Error(`Unexpected table: ${table}`)
    })
    const result = await getTimesheetOverview('acct-1', '2026-09-28', '2026-10-04', null)
    expect(result.data.byProject).toEqual([])
    expect(result.data.byPerson).toEqual([])
  })
})
