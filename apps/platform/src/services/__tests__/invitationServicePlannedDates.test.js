import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resolveProjectPlannedDatesForProject } from '../invitationService'

const mockRpc = vi.hoisted(() => vi.fn())

vi.mock('../supabase/supabaseClient', () => ({
  appDb: {
    rpc: (...args) => mockRpc(...args),
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    }),
  },
}))

describe('resolveProjectPlannedDatesForProject', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns existing dates when both are present', async () => {
    const result = await resolveProjectPlannedDatesForProject('proj-1', {
      planned_start_date: '2026-01-01',
      planned_end_date: '2026-12-31',
    })
    expect(result).toEqual({
      planned_start_date: '2026-01-01',
      planned_end_date: '2026-12-31',
    })
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('fills missing dates from get_invitation_project_dates RPC', async () => {
    mockRpc.mockResolvedValue({
      data: [{ planned_start_date: '2026-03-15', planned_end_date: '2026-09-30' }],
      error: null,
    })

    const result = await resolveProjectPlannedDatesForProject('proj-1', {})
    expect(mockRpc).toHaveBeenCalledWith('get_invitation_project_dates', {
      p_project_id: 'proj-1',
    })
    expect(result).toEqual({
      planned_start_date: '2026-03-15',
      planned_end_date: '2026-09-30',
    })
  })
})
