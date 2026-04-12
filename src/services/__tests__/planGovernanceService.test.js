import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getGovernanceFindings } from '../planGovernanceService'

const mockFrom = vi.fn()

vi.mock('../supabase/supabaseClient', () => ({
  platformDb: {
    from: (...args) => mockFrom(...args),
  },
}))

describe('planGovernanceService', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('getGovernanceFindings queries plan_governance_findings', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    mockFrom.mockReturnValue(chain)
    await getGovernanceFindings('p1')
    expect(mockFrom).toHaveBeenCalledWith('plan_governance_findings')
    expect(chain.eq).toHaveBeenCalledWith('project_id', 'p1')
  })
})
