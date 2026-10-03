import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  computeWeekEndDate,
  aggregateWeeklyTimesheet,
  decideWeeklyTimesheet,
  createApprovalSettings,
} from './timesheetPeriodService'

const mockFrom = vi.fn()

vi.mock('./supabase/supabaseClient', () => ({
  platformDb: {
    from: (...args) => mockFrom(...args),
  },
}))

/** Chainable query-builder mock: every chain method returns itself; awaiting
 * the builder directly (no .single()) resolves via `then`, matching how the
 * real supabase-js builder is itself a thenable. */
function makeBuilder(result) {
  const builder = {}
  ;['select', 'eq', 'gte', 'lte', 'in', 'order', 'upsert', 'update', 'insert'].forEach((m) => {
    builder[m] = vi.fn(() => builder)
  })
  builder.single = vi.fn(() => Promise.resolve(result))
  builder.maybeSingle = vi.fn(() => Promise.resolve(result))
  builder.then = (resolve) => Promise.resolve(result).then(resolve)
  return builder
}

describe('timesheetPeriodService', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  describe('computeWeekEndDate', () => {
    it('returns the date 6 days after week start', () => {
      expect(computeWeekEndDate('2026-01-05')).toBe('2026-01-11')
    })

    it('throws on an invalid date', () => {
      expect(() => computeWeekEndDate('not-a-date')).toThrow()
    })
  })

  describe('aggregateWeeklyTimesheet — entry→period aggregation', () => {
    it('sums hours_worked for the week, upserts the period row, and links every entry via timesheet_id', async () => {
      const entries = [
        { id: 'e1', hours_worked: 3.5 },
        { id: 'e2', hours_worked: 4 },
        { id: 'e3', hours_worked: '2.25' }, // supabase can return numeric as string
      ]
      const timesheetRow = {
        id: 't1',
        project_id: 'p1',
        user_id: 'u1',
        week_start_date: '2026-01-05',
        week_end_date: '2026-01-11',
        total_hours: 9.75,
      }

      const selectBuilder = makeBuilder({ data: entries, error: null })
      const upsertBuilder = makeBuilder({ data: timesheetRow, error: null })
      const updateBuilder = makeBuilder({ data: null, error: null })

      mockFrom
        .mockImplementationOnce(() => selectBuilder) // .from('timesheet_entries').select(...)
        .mockImplementationOnce(() => upsertBuilder) // .from('timesheets').upsert(...)
        .mockImplementationOnce(() => updateBuilder) // .from('timesheet_entries').update(...).in(...)

      const result = await aggregateWeeklyTimesheet('p1', 'u1', '2026-01-05')

      expect(mockFrom).toHaveBeenNthCalledWith(1, 'timesheet_entries')
      expect(mockFrom).toHaveBeenNthCalledWith(2, 'timesheets')
      expect(mockFrom).toHaveBeenNthCalledWith(3, 'timesheet_entries')

      // Sums numeric + string hours correctly (3.5 + 4 + 2.25 = 9.75)
      expect(upsertBuilder.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          project_id: 'p1',
          user_id: 'u1',
          week_start_date: '2026-01-05',
          week_end_date: '2026-01-11',
          total_hours: 9.75,
        }),
        { onConflict: 'project_id,user_id,week_start_date' }
      )

      // Links all three entries found in the window to the upserted period
      expect(updateBuilder.update).toHaveBeenCalledWith({ timesheet_id: 't1' })
      expect(updateBuilder.in).toHaveBeenCalledWith('id', ['e1', 'e2', 'e3'])

      expect(result).toEqual(expect.objectContaining({ id: 't1', total_hours: 9.75, entryCount: 3 }))
    })

    it('upserts a zero-hour period and skips the link step when no entries fall in the week', async () => {
      const timesheetRow = {
        id: 't2',
        project_id: 'p1',
        user_id: 'u1',
        week_start_date: '2026-02-02',
        week_end_date: '2026-02-08',
        total_hours: 0,
      }
      const selectBuilder = makeBuilder({ data: [], error: null })
      const upsertBuilder = makeBuilder({ data: timesheetRow, error: null })

      mockFrom.mockImplementationOnce(() => selectBuilder).mockImplementationOnce(() => upsertBuilder)

      const result = await aggregateWeeklyTimesheet('p1', 'u1', '2026-02-02')

      expect(mockFrom).toHaveBeenCalledTimes(2) // no third (link) call
      expect(upsertBuilder.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ total_hours: 0 }),
        { onConflict: 'project_id,user_id,week_start_date' }
      )
      expect(result.entryCount).toBe(0)
    })

    it('rejects when required arguments are missing', async () => {
      await expect(aggregateWeeklyTimesheet(null, 'u1', '2026-01-05')).rejects.toThrow()
      expect(mockFrom).not.toHaveBeenCalled()
    })

    it('propagates a query error from the entries fetch without upserting', async () => {
      const selectBuilder = makeBuilder({ data: null, error: new Error('boom') })
      mockFrom.mockImplementationOnce(() => selectBuilder)

      await expect(aggregateWeeklyTimesheet('p1', 'u1', '2026-01-05')).rejects.toThrow('boom')
      expect(mockFrom).toHaveBeenCalledTimes(1)
    })
  })

  describe('decideWeeklyTimesheet', () => {
    it('records the approval decision and updates the period status', async () => {
      const approvalBuilder = makeBuilder({ data: { id: 'a1', approval_status: 'approved' }, error: null })
      const updateBuilder = makeBuilder({ data: { id: 't1', approval_status: 'approved' }, error: null })
      mockFrom.mockImplementationOnce(() => approvalBuilder).mockImplementationOnce(() => updateBuilder)

      const { approval, timesheet } = await decideWeeklyTimesheet('t1', 'approver1', 'approved', 'Looks good')

      expect(approvalBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          timesheet_id: 't1',
          approver_user_id: 'approver1',
          approval_status: 'approved',
          approval_comment: 'Looks good',
        })
      )
      expect(updateBuilder.update).toHaveBeenCalledWith({ approval_status: 'approved' })
      expect(approval.id).toBe('a1')
      expect(timesheet.approval_status).toBe('approved')
    })

    it('rejects an invalid decision value without touching the database', async () => {
      await expect(decideWeeklyTimesheet('t1', 'approver1', 'maybe')).rejects.toThrow()
      expect(mockFrom).not.toHaveBeenCalled()
    })
  })

  describe('createApprovalSettings', () => {
    it('inserts a settings row and returns it', async () => {
      const builder = makeBuilder({ data: { id: 's1', approver_role: 'project_manager' }, error: null })
      mockFrom.mockImplementationOnce(() => builder)

      const data = await createApprovalSettings({ approver_role: 'project_manager', escalation_days: 3 })

      expect(mockFrom).toHaveBeenCalledWith('timesheet_approval_settings')
      expect(builder.insert).toHaveBeenCalledWith({ approver_role: 'project_manager', escalation_days: 3 })
      expect(data.id).toBe('s1')
    })
  })
})
