import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  listSchedules,
  getSchedule,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  listRuns,
  runScheduleNow,
} from './scheduledHealthReportService'

const mockFrom = vi.fn()
const mockRpc = vi.fn()
const mockGetUser = vi.fn(() => Promise.resolve({ data: { user: { id: 'u1' } } }))

vi.mock('./supabase/supabaseClient', () => ({
  platformDb: {
    from: (...args) => mockFrom(...args),
    rpc: (...args) => mockRpc(...args),
    auth: { getUser: (...args) => mockGetUser(...args) },
  },
}))

function makeBuilder(result) {
  const builder = {}
  ;['select', 'eq', 'order', 'insert', 'update'].forEach((m) => {
    builder[m] = vi.fn(() => builder)
  })
  builder.single = vi.fn(() => Promise.resolve(result))
  builder.maybeSingle = vi.fn(() => Promise.resolve(result))
  builder.then = (resolve) => Promise.resolve(result).then(resolve)
  return builder
}

describe('scheduledHealthReportService', () => {
  beforeEach(() => {
    mockFrom.mockReset()
    mockGetUser.mockClear()
  })

  it('listSchedules filters by project when provided', async () => {
    const builder = makeBuilder({ data: [{ id: 's1' }], error: null })
    mockFrom.mockReturnValue(builder)
    const rows = await listSchedules({ projectId: 'p1' })
    expect(mockFrom).toHaveBeenCalledWith('scheduled_health_reports')
    expect(builder.eq).toHaveBeenCalledWith('project_id', 'p1')
    expect(rows).toEqual([{ id: 's1' }])
  })

  it('getSchedule returns a single row', async () => {
    const builder = makeBuilder({ data: { id: 's1' }, error: null })
    mockFrom.mockReturnValue(builder)
    const row = await getSchedule('s1')
    expect(row.id).toBe('s1')
  })

  it('createSchedule stamps created_by from the current user', async () => {
    const builder = makeBuilder({ data: { id: 's1' }, error: null })
    mockFrom.mockReturnValue(builder)
    await createSchedule({ schedule_name: 'Weekly Health', project_id: 'p1', frequency: 'weekly' })
    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ schedule_name: 'Weekly Health', created_by: 'u1' })
    )
  })

  it('updateSchedule stamps updated_at', async () => {
    const builder = makeBuilder({ data: { id: 's1' }, error: null })
    mockFrom.mockReturnValue(builder)
    await updateSchedule('s1', { is_active: false })
    expect(builder.update).toHaveBeenCalledWith(expect.objectContaining({ is_active: false, updated_at: expect.any(String) }))
  })

  it('deleteSchedule soft-deletes', async () => {
    const builder = makeBuilder({ data: null, error: null })
    mockFrom.mockReturnValue(builder)
    await deleteSchedule('s1')
    expect(builder.update).toHaveBeenCalledWith({ is_deleted: true })
    expect(builder.eq).toHaveBeenCalledWith('id', 's1')
  })

  it('listRuns orders by created_at descending', async () => {
    const builder = makeBuilder({ data: [{ id: 'r1' }], error: null })
    mockFrom.mockReturnValue(builder)
    const rows = await listRuns('s1')
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(rows).toEqual([{ id: 'r1' }])
  })

  it('runScheduleNow queues a real run through the background job RPC (v1352)', async () => {
    mockRpc.mockResolvedValueOnce({ data: { id: 'r1', run_status: 'pending' }, error: null })
    const run = await runScheduleNow('s1')
    expect(mockRpc).toHaveBeenCalledWith('scheduled_health_report_run_now', { p_schedule_id: 's1' })
    expect(mockFrom).not.toHaveBeenCalled()
    expect(run).toEqual({ id: 'r1', run_status: 'pending' })
  })

  it('runScheduleNow surfaces an RPC error (no placeholder run)', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: new Error('You do not have access to this project') })
    await expect(runScheduleNow('s1')).rejects.toThrow(/access/)
  })
})
