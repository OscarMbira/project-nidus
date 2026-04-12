import { describe, it, expect, beforeEach, vi } from 'vitest'
import { listCostEntries } from '../projectCostService'

const fromMock = vi.fn()

vi.mock('../supabase/supabaseClient', () => ({
  platformDb: {
    from: (...args) => fromMock(...args),
  },
}))

describe('projectCostService.listCostEntries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns rows for project', async () => {
    const rows = [{ id: '1', amount: 50 }]
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: rows, error: null }),
    }
    chain.eq.mockReturnValue(chain)
    fromMock.mockReturnValue(chain)

    const result = await listCostEntries('proj-1')
    expect(fromMock).toHaveBeenCalledWith('project_cost_entries')
    expect(result).toEqual(rows)
  })
})
