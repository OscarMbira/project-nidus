import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getFindings } from '../planIntelligenceService'

const mockFrom = vi.fn()

vi.mock('../supabase/supabaseClient', () => ({
  platformDb: {
    from: (...args) => mockFrom(...args),
  },
}))

describe('planIntelligenceService', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('getFindings queries plan_intelligence_findings', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    mockFrom.mockReturnValue(chain)
    await getFindings('proj-1')
    expect(mockFrom).toHaveBeenCalledWith('plan_intelligence_findings')
    expect(chain.eq).toHaveBeenCalledWith('project_id', 'proj-1')
  })
})
