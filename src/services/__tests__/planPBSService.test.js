import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getPBSTree } from '../planPBSService'

const mockFrom = vi.fn()

vi.mock('../supabase/supabaseClient', () => ({
  platformDb: {
    from: (...args) => mockFrom(...args),
  },
}))

describe('planPBSService', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('getPBSTree loads plan_pbs_nodes for project', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    mockFrom.mockReturnValue(chain)
    const tree = await getPBSTree('p1')
    expect(mockFrom).toHaveBeenCalledWith('plan_pbs_nodes')
    expect(chain.eq).toHaveBeenCalledWith('project_id', 'p1')
    expect(Array.isArray(tree)).toBe(true)
  })
})
