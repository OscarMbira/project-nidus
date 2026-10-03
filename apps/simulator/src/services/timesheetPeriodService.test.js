import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  computeWeekEndDate,
  aggregateWeeklyTimesheet,
  decideWeeklyTimesheet,
  createApprovalSettings,
} from './timesheetPeriodService'

const mockFrom = vi.fn()

vi.mock('./supabaseClient', () => ({
  simDb: {
    from: (...args) => mockFrom(...args),
  },
}))

/** Chainable query-builder mock — see platform's timesheetPeriodService.test.js for notes. */
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

describe('timesheetPeriodService (simulator)', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  describe('computeWeekEndDate', () => {
    it('returns the date 6 days after week start', () => {
      expect(computeWeekEndDate('2026-01-05')).toBe('2026-01-11')
    })
  })

  describe('aggregateWeeklyTimesheet — entry→period aggregation', () => {
    it('sums hours_worked for the week, upserts the period row, and links every entry via timesheet_id', async () => {
      const entries = [
        { id: 'e1', hours_worked: 3.5 },
        { id: 'e2', hours_worked: 4 },
      ]
      const timesheetRow = {
        id: 't1',
        project_id: 'p1',
        user_id: 'u1',
        week_start_date: '2026-01-05',
        week_end_date: '2026-01-11',
        total_hours: 7.5,
      }

      const selectBuilder = makeBuilder({ data: entries, error: null })
      const upsertBuilder = makeBuilder({ data: timesheetRow, error: null })
      const updateBuilder = makeBuilder({ data: null, error: null })

      mockFrom
        .mockImplementationOnce(() => selectBuilder)
        .mockImplementationOnce(() => upsertBuilder)
        .mockImplementationOnce(() => updateBuilder)

      const result = await aggregateWeeklyTimesheet('p1', 'u1', '2026-01-05')

      expect(mockFrom).toHaveBeenNthCalledWith(1, 'timesheet_entries')
      expect(mockFrom).toHaveBeenNthCalledWith(2, 'timesheets')
      expect(mockFrom).toHaveBeenNthCalledWith(3, 'timesheet_entries')
      expect(upsertBuilder.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ total_hours: 7.5 }),
        { onConflict: 'project_id,user_id,week_start_date' }
      )
      expect(updateBuilder.in).toHaveBeenCalledWith('id', ['e1', 'e2'])
      expect(result).toEqual(expect.objectContaining({ id: 't1', entryCount: 2 }))
    })

    it('rejects when required arguments are missing', async () => {
      await expect(aggregateWeeklyTimesheet(null, 'u1', '2026-01-05')).rejects.toThrow()
      expect(mockFrom).not.toHaveBeenCalled()
    })
  })

  describe('decideWeeklyTimesheet', () => {
    it('records the approval decision and updates the period status', async () => {
      const approvalBuilder = makeBuilder({ data: { id: 'a1', approval_status: 'rejected' }, error: null })
      const updateBuilder = makeBuilder({ data: { id: 't1', approval_status: 'rejected' }, error: null })
      mockFrom.mockImplementationOnce(() => approvalBuilder).mockImplementationOnce(() => updateBuilder)

      const { approval, timesheet } = await decideWeeklyTimesheet('t1', 'approver1', 'rejected', 'Missing hours')

      expect(approvalBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({ approval_status: 'rejected', approval_comment: 'Missing hours' })
      )
      expect(approval.id).toBe('a1')
      expect(timesheet.approval_status).toBe('rejected')
    })
  })

  describe('createApprovalSettings', () => {
    it('inserts a settings row and returns it', async () => {
      const builder = makeBuilder({ data: { id: 's1' }, error: null })
      mockFrom.mockImplementationOnce(() => builder)
      const data = await createApprovalSettings({ approver_role: 'project_manager' })
      expect(mockFrom).toHaveBeenCalledWith('timesheet_approval_settings')
      expect(data.id).toBe('s1')
    })
  })
})
