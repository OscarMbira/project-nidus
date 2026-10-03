import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()

vi.mock('../supabase/supabaseClient', () => ({
  platformDb: { from: (...args) => mockFrom(...args) },
}))

import { getDayLocations, setDayLocation, getDayLocationsForProject } from '../timesheetDayLocationService'

describe('timesheetDayLocationService', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('getDayLocations scopes to project, user, and date range', async () => {
    const rows = [{ entry_date: '2026-09-30', work_location: 'onsite' }]
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            gte: () => ({
              lte: () => Promise.resolve({ data: rows, error: null }),
            }),
          }),
        }),
      }),
    })
    const r = await getDayLocations('proj-1', 'user-1', '2026-09-28', '2026-10-04')
    expect(mockFrom).toHaveBeenCalledWith('timesheet_day_locations')
    expect(r).toEqual({ success: true, data: rows })
  })

  it('setDayLocation upserts on (project_id, user_id, entry_date)', async () => {
    const saved = { entry_date: '2026-09-30', work_location: 'offshore' }
    let upsertArgs
    mockFrom.mockReturnValue({
      upsert: (payload, opts) => {
        upsertArgs = { payload, opts }
        return {
          select: () => ({
            single: () => Promise.resolve({ data: saved, error: null }),
          }),
        }
      },
    })
    const r = await setDayLocation('proj-1', 'user-1', '2026-09-30', 'offshore')
    expect(upsertArgs.opts).toEqual({ onConflict: 'project_id,user_id,entry_date' })
    expect(upsertArgs.payload).toEqual({ project_id: 'proj-1', user_id: 'user-1', entry_date: '2026-09-30', work_location: 'offshore' })
    expect(r).toEqual({ success: true, data: saved })
  })

  it('getDayLocationsForProject scopes to project and date range only (no user filter)', async () => {
    const rows = [{ user_id: 'user-1', entry_date: '2026-09-30', work_location: 'onsite' }]
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          gte: () => ({
            lte: () => Promise.resolve({ data: rows, error: null }),
          }),
        }),
      }),
    })
    const r = await getDayLocationsForProject('proj-1', '2026-09-28', '2026-10-04')
    expect(r).toEqual({ success: true, data: rows })
  })
})
