import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getProjectCalendar,
  saveProjectCalendar,
  listCalendarExceptions,
  getCalendarException,
  createCalendarException,
  updateCalendarException,
  deleteCalendarException,
} from '../projectCalendarService'

const mockFrom = vi.fn()

vi.mock('../supabase/supabaseClient', () => ({
  platformDb: {
    from: (...args) => mockFrom(...args),
  },
}))

describe('projectCalendarService', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('getProjectCalendar queries project_calendars by project_id', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'cal-1', project_id: 'proj-1' }, error: null }),
    }
    mockFrom.mockReturnValue(chain)
    const res = await getProjectCalendar('proj-1')
    expect(mockFrom).toHaveBeenCalledWith('project_calendars')
    expect(chain.eq).toHaveBeenCalledWith('project_id', 'proj-1')
    expect(res.success).toBe(true)
    expect(res.data.id).toBe('cal-1')
  })

  it('getProjectCalendar returns null data when no project id given', async () => {
    const res = await getProjectCalendar(null)
    expect(res.success).toBe(true)
    expect(res.data).toBeNull()
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('saveProjectCalendar inserts a new row when none exists', async () => {
    const usersChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'user-1' }, error: null }),
    }
    const calendarSelectChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
    const insertChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'cal-new', project_id: 'proj-1' }, error: null }),
    }
    // Stateful mock: the first project_calendars call (inside getProjectCalendar, checking for
    // an existing row) resolves to the select chain (no existing row); the second call is the
    // write path, which resolves to the insert chain.
    let calendarCallCount = 0
    mockFrom.mockImplementation((table) => {
      if (table === 'users') return usersChain
      calendarCallCount += 1
      return calendarCallCount === 1 ? calendarSelectChain : insertChain
    })

    const res = await saveProjectCalendar('proj-1', { monday: true, hours_per_day: 8 }, 'auth-1')
    expect(res.success).toBe(true)
    expect(res.operation).toBe('created')
    expect(insertChain.insert).toHaveBeenCalled()
  })

  it('listCalendarExceptions orders by exception_date ascending', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [{ id: 'exc-1' }], error: null }),
    }
    mockFrom.mockReturnValue(chain)
    const res = await listCalendarExceptions('proj-1')
    expect(mockFrom).toHaveBeenCalledWith('project_calendar_exceptions')
    expect(chain.order).toHaveBeenCalledWith('exception_date', { ascending: true })
    expect(res.success).toBe(true)
    expect(res.data).toHaveLength(1)
  })

  it('getCalendarException fetches a single exception by id', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'exc-1', exception_date: '2026-12-25' }, error: null }),
    }
    mockFrom.mockReturnValue(chain)
    const res = await getCalendarException('exc-1')
    expect(res.success).toBe(true)
    expect(res.data.exception_date).toBe('2026-12-25')
  })

  it('createCalendarException inserts with calendar_id resolved from the project calendar', async () => {
    const calendarChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'cal-1' }, error: null }),
    }
    const insertChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'exc-new', calendar_id: 'cal-1' }, error: null }),
    }
    mockFrom.mockImplementation((table) => (table === 'project_calendars' ? calendarChain : insertChain))

    const res = await createCalendarException('proj-1', { exception_date: '2026-12-25', exception_type: 'holiday' })
    expect(res.success).toBe(true)
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ project_id: 'proj-1', calendar_id: 'cal-1', exception_date: '2026-12-25' })
    )
  })

  it('updateCalendarException updates the given exception id', async () => {
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'exc-1', exception_type: 'other' }, error: null }),
    }
    mockFrom.mockReturnValue(chain)
    const res = await updateCalendarException('exc-1', { exception_date: '2026-12-26', exception_type: 'other' })
    expect(res.success).toBe(true)
    expect(chain.eq).toHaveBeenCalledWith('id', 'exc-1')
  })

  it('deleteCalendarException soft-deletes by setting is_deleted true', async () => {
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    }
    mockFrom.mockReturnValue(chain)
    const res = await deleteCalendarException('exc-1')
    expect(res.success).toBe(true)
    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ is_deleted: true }))
  })
})
