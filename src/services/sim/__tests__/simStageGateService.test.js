import { describe, it, expect, vi, beforeEach } from 'vitest'
import { simDb } from '../../supabase/supabaseClient'
import { submitStageGateReview, createStageGateReview } from '../simStageGateService'

vi.mock('../../supabase/supabaseClient', () => ({
  simDb: {
    from: vi.fn(),
  },
}))

vi.mock('../simRunStateService', () => ({
  checkPhaseGateCompliance: vi.fn(),
  advancePhase: vi.fn(),
}))

describe('simStageGateService', () => {
  beforeEach(() => {
    vi.mocked(simDb.from).mockReset()
  })

  it('createStageGateReview returns inserted row', async () => {
    const row = { id: 'rev-1', run_id: 'r1', stage_name: 'initiation' }
    vi.mocked(simDb.from).mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: row, error: null }),
    })

    const r = await createStageGateReview('r1', 'initiation')
    expect(r.success).toBe(true)
    expect(r.data).toEqual(row)
  })

  it('submitStageGateReview updates review to submitted', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(simDb.from).mockReturnValue({
      update: vi.fn(() => ({ eq })),
    })

    const r = await submitStageGateReview('rev-9', { score: 72, board_response: { q: 1 } })
    expect(r.success).toBe(true)
    expect(eq).toHaveBeenCalledWith('id', 'rev-9')
  })
})
