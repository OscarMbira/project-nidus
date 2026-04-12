import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getLatestScore } from '../planHealthScoreService'

const mockFrom = vi.fn()

vi.mock('../supabase/supabaseClient', () => ({
  platformDb: {
    from: (...args) => mockFrom(...args),
  },
}))

describe('planHealthScoreService', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('getLatestScore queries plan_health_scores for project', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { overall_score: 72 }, error: null }),
    }
    mockFrom.mockReturnValue(chain)
    const row = await getLatestScore('p1')
    expect(mockFrom).toHaveBeenCalledWith('plan_health_scores')
    expect(chain.eq).toHaveBeenCalledWith('project_id', 'p1')
    expect(row?.overall_score).toBe(72)
  })
})
