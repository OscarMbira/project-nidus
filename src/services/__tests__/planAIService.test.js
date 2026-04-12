import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getAISessions } from '../planAIService'

const mockFrom = vi.fn()

vi.mock('../supabase/supabaseClient', () => ({
  platformDb: {
    from: (...args) => mockFrom(...args),
    functions: { invoke: vi.fn() },
  },
}))

describe('planAIService', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('getAISessions queries plan_ai_sessions', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    mockFrom.mockReturnValue(chain)
    await getAISessions('p1')
    expect(mockFrom).toHaveBeenCalledWith('plan_ai_sessions')
    expect(chain.eq).toHaveBeenCalledWith('project_id', 'p1')
  })
})
