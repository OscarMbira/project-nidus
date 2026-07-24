import { describe, it, expect, vi, beforeEach } from 'vitest'
import { countMicroPlansByWorkPackage, getMicroPlanSummary, getVersionHistory, getDraftPlans } from '../microPlanService'

const mockFrom = vi.fn()

vi.mock('../supabase/supabaseClient', () => ({
  platformDb: {
    from: (...args) => mockFrom(...args),
    auth: { getUser: vi.fn() },
  },
}))

describe('microPlanService', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('countMicroPlansByWorkPackage returns head count', async () => {
    let eqCount = 0
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn((...args) => {
        eqCount += 1
        if (eqCount === 3) {
          return Promise.resolve({ count: 3, error: null })
        }
        return chain
      }),
    }
    mockFrom.mockReturnValue(chain)
    const n = await countMicroPlansByWorkPackage('proj-1', 'wp-1')
    expect(mockFrom).toHaveBeenCalledWith('project_micro_plans')
    expect(n).toBe(3)
  })

  it('getMicroPlanSummary aggregates RAG and types', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          { plan_type: 'team_delivery', status: 'draft', is_draft: true, overall_rag: 'green' },
          { plan_type: 'team_delivery', status: 'approved', is_draft: false, overall_rag: 'red' },
        ],
        error: null,
      }),
    }
    mockFrom.mockReturnValue(chain)
    const s = await getMicroPlanSummary('proj-1')
    expect(s.total).toBe(2)
    expect(s.byRag.green).toBe(1)
    expect(s.byRag.red).toBe(1)
  })

  it('getVersionHistory queries micro_plan_versions', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [{ id: 'v1' }], error: null }),
    }
    mockFrom.mockReturnValue(chain)
    const rows = await getVersionHistory('mp-1')
    expect(mockFrom).toHaveBeenCalledWith('micro_plan_versions')
    expect(chain.eq).toHaveBeenCalledWith('micro_plan_id', 'mp-1')
    expect(rows.length).toBe(1)
  })

  it('getDraftPlans filters by owner and draft flags (RLS-friendly client filter)', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    mockFrom.mockReturnValue(chain)
    await getDraftPlans('user-1')
    expect(mockFrom).toHaveBeenCalledWith('project_micro_plans')
    expect(chain.eq).toHaveBeenCalledWith('owner_id', 'user-1')
    expect(chain.eq).toHaveBeenCalledWith('is_draft', true)
    expect(chain.eq).toHaveBeenCalledWith('is_deleted', false)
  })
})
