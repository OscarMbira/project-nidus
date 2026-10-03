import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()
const mockCreateNotification = vi.fn()
const mockSendEmail = vi.fn()

vi.mock('../supabase/supabaseClient', () => ({
  platformDb: { from: (...args) => mockFrom(...args) },
}))

vi.mock('../../utils/notificationUtils', () => ({
  createNotification: (...args) => mockCreateNotification(...args),
}))

vi.mock('../emailIntegrationService', () => ({
  sendEmail: (...args) => mockSendEmail(...args),
}))

import { approveTimesheetEntry, rejectTimesheetEntry, listTimesheetEntryReviewHistory, submitTimesheetEntriesForWeek, computeTimesheetExceptions, computeHoursFromTimeRange, listTimesheetEntryEditHistory } from '../timesheetService'

describe('timesheetService — v1169 approval workflow', () => {
  beforeEach(() => {
    mockFrom.mockReset()
    mockCreateNotification.mockReset()
    mockSendEmail.mockReset()
    mockCreateNotification.mockResolvedValue({ success: true })
    mockSendEmail.mockResolvedValue({ success: true })
  })

  it('approveTimesheetEntry rejects when no reasons are given (mandatory justification)', async () => {
    await expect(approveTimesheetEntry('entry-1', 'reviewer-1', [])).rejects.toThrow(/at least one reason/i)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('rejectTimesheetEntry rejects when no reasons are given (mandatory justification)', async () => {
    await expect(rejectTimesheetEntry('entry-1', 'reviewer-1', [])).rejects.toThrow(/at least one reason/i)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('approveTimesheetEntry writes an append-only review row, updates the entry, and notifies the submitter', async () => {
    const entry = { id: 'entry-1', user_id: 'auth-submitter', entry_date: '2026-09-30', hours_worked: 5, project_id: 'proj-1' }
    const submitter = { id: 'internal-submitter', email: 'sub@example.com', full_name: 'Sub Mitter' }
    const reasons = [{ name: 'Accurate and complete' }]

    mockFrom.mockImplementation((table) => {
      if (table === 'timesheet_entry_reviews') {
        return { insert: () => Promise.resolve({ error: null }) }
      }
      if (table === 'timesheet_entries') {
        return {
          update: () => ({
            eq: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: entry, error: null }),
              }),
            }),
          }),
        }
      }
      if (table === 'users') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: submitter, error: null }),
            }),
          }),
        }
      }
      if (table === 'timesheet_entry_approve_reasons') {
        return {
          select: () => ({
            in: () => Promise.resolve({ data: reasons, error: null }),
          }),
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    })

    const result = await approveTimesheetEntry('entry-1', 'reviewer-1', ['reason-1'], 'Looks good')

    expect(result).toEqual(entry)
    expect(mockFrom).toHaveBeenCalledWith('timesheet_entry_reviews')
    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: submitter.id, deliveryMethod: 'both' })
    )
    expect(mockSendEmail).toHaveBeenCalledWith(submitter.email, expect.any(String), expect.any(String))
  })

  it('a notification/email failure does not block the decision itself', async () => {
    const entry = { id: 'entry-1', user_id: 'auth-submitter', entry_date: '2026-09-30', hours_worked: 5, project_id: 'proj-1' }

    mockFrom.mockImplementation((table) => {
      if (table === 'timesheet_entry_reviews') {
        return { insert: () => Promise.resolve({ error: null }) }
      }
      if (table === 'timesheet_entries') {
        return {
          update: () => ({
            eq: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: entry, error: null }),
              }),
            }),
          }),
        }
      }
      if (table === 'users') {
        return { select: () => ({ eq: () => ({ maybeSingle: () => { throw new Error('boom') } }) }) }
      }
      throw new Error(`Unexpected table: ${table}`)
    })

    const result = await rejectTimesheetEntry('entry-1', 'reviewer-1', ['reason-1'], 'Missing details')
    expect(result).toEqual(entry)
  })

  it('listTimesheetEntryReviewHistory orders by decided_at descending', async () => {
    const rows = [{ id: 'rev-2', decided_at: '2026-09-29' }, { id: 'rev-1', decided_at: '2026-09-20' }]
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          order: (col, opts) => {
            expect(col).toBe('decided_at')
            expect(opts).toEqual({ ascending: false })
            return Promise.resolve({ data: rows, error: null })
          },
        }),
      }),
    })
    const r = await listTimesheetEntryReviewHistory('entry-1')
    expect(r).toEqual(rows)
    expect(mockFrom).toHaveBeenCalledWith('timesheet_entry_reviews')
  })

  it('submitTimesheetEntriesForWeek bulk-updates every draft entry in the project/user/week range', async () => {
    const updated = [{ id: 'e1', status: 'submitted' }, { id: 'e2', status: 'submitted' }]
    const calls = { eq: [], gte: null, lte: null }
    mockFrom.mockReturnValue({
      update: (payload) => {
        calls.payload = payload
        return {
          eq: (col, val) => {
            calls.eq.push([col, val])
            return {
              eq: (col2, val2) => {
                calls.eq.push([col2, val2])
                return {
                  eq: (col3, val3) => {
                    calls.eq.push([col3, val3])
                    return {
                      eq: (col4, val4) => {
                        calls.eq.push([col4, val4])
                        return {
                          gte: (col5, val5) => {
                            calls.gte = [col5, val5]
                            return {
                              lte: (col6, val6) => {
                                calls.lte = [col6, val6]
                                return { select: () => Promise.resolve({ data: updated, error: null }) }
                              },
                            }
                          },
                        }
                      },
                    }
                  },
                }
              },
            }
          },
        }
      },
    })
    const r = await submitTimesheetEntriesForWeek('proj-1', 'user-1', '2026-09-28', '2026-10-04')
    expect(mockFrom).toHaveBeenCalledWith('timesheet_entries')
    expect(calls.payload).toEqual({ status: 'submitted' })
    expect(calls.eq).toContainEqual(['project_id', 'proj-1'])
    expect(calls.eq).toContainEqual(['user_id', 'user-1'])
    expect(calls.eq).toContainEqual(['status', 'draft'])
    expect(calls.gte).toEqual(['entry_date', '2026-09-28'])
    expect(calls.lte).toEqual(['entry_date', '2026-10-04'])
    expect(r).toEqual(updated)
  })
})

describe('computeTimesheetExceptions — v1173 configurable thresholds', () => {
  it('uses the hardcoded 8h/40h fallback when no settings are passed', () => {
    const entries = [{ entry_date: '2026-09-29', hours_worked: 9 }] // Tue, 9h > default 8h
    const r = computeTimesheetExceptions(entries, { today: new Date('2026-09-30') })
    expect(r.overtime.some((o) => o.type === 'day' && o.date === '2026-09-29')).toBe(true)
  })

  it('does not flag a day as overtime once the daily threshold is configured higher', () => {
    const entries = [{ entry_date: '2026-09-29', hours_worked: 9 }]
    const r = computeTimesheetExceptions(entries, {
      today: new Date('2026-09-30'),
      settings: { standard_daily_hours: 10 },
    })
    expect(r.overtime.some((o) => o.type === 'day')).toBe(false)
  })

  it('flags a day as overtime with a lower configured threshold that would not trip the default', () => {
    const entries = [{ entry_date: '2026-09-29', hours_worked: 7 }] // under the 8h default
    const r = computeTimesheetExceptions(entries, {
      today: new Date('2026-09-30'),
      settings: { standard_daily_hours: 6 },
    })
    expect(r.overtime.some((o) => o.type === 'day' && o.date === '2026-09-29')).toBe(true)
  })

  it('derives the weekly threshold from standard_daily_hours*5 + max_overtime_per_week', () => {
    // Mon-Fri, 7h/day = 35h total. standard_daily_hours=6 -> weekly threshold = 6*5 + 2 = 32.
    const entries = [
      { entry_date: '2026-09-28', hours_worked: 7 }, // Mon
      { entry_date: '2026-09-29', hours_worked: 7 },
      { entry_date: '2026-09-30', hours_worked: 7 },
      { entry_date: '2026-10-01', hours_worked: 7 },
      { entry_date: '2026-10-02', hours_worked: 7 }, // Fri — total 35h
    ]
    const r = computeTimesheetExceptions(entries, {
      today: new Date('2026-10-02'),
      settings: { standard_daily_hours: 6, max_overtime_per_week: 2 },
    })
    expect(r.overtime.some((o) => o.type === 'week')).toBe(true)
  })
})

describe('computeHoursFromTimeRange — v1175', () => {
  it('returns null when either time is missing', () => {
    expect(computeHoursFromTimeRange('', '17:00')).toBeNull()
    expect(computeHoursFromTimeRange('09:00', '')).toBeNull()
    expect(computeHoursFromTimeRange(null, null)).toBeNull()
  })

  it('computes a same-day range', () => {
    expect(computeHoursFromTimeRange('09:00', '17:00')).toBe(8)
    expect(computeHoursFromTimeRange('09:00', '12:30')).toBe(3.5)
  })

  it('rounds to the nearest quarter hour', () => {
    expect(computeHoursFromTimeRange('09:00', '12:40')).toBe(3.75)
  })

  it('treats end earlier than (or equal to) start as spanning past midnight', () => {
    expect(computeHoursFromTimeRange('22:00', '06:00')).toBe(8)
    expect(computeHoursFromTimeRange('23:00', '23:00')).toBe(24)
  })
})

describe('listTimesheetEntryEditHistory — v1177', () => {
  it('orders by edited_at descending', async () => {
    const rows = [{ id: 'h2', edited_at: '2026-09-29' }, { id: 'h1', edited_at: '2026-09-20' }]
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          order: (col, opts) => {
            expect(col).toBe('edited_at')
            expect(opts).toEqual({ ascending: false })
            return Promise.resolve({ data: rows, error: null })
          },
        }),
      }),
    })
    const r = await listTimesheetEntryEditHistory('entry-1')
    expect(r).toEqual(rows)
    expect(mockFrom).toHaveBeenCalledWith('timesheet_entry_edit_history')
  })
})
