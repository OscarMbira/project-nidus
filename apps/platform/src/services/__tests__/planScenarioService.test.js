import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getScenarios, getScenario } from '../planScenarioService'

const mockFrom = vi.fn()

vi.mock('../supabase/supabaseClient', () => ({
  platformDb: {
    from: (...args) => mockFrom(...args),
  },
}))

describe('planScenarioService', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('getScenarios queries plan_scenarios by project_id', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    mockFrom.mockReturnValue(chain)
    await getScenarios('p1')
    expect(mockFrom).toHaveBeenCalledWith('plan_scenarios')
    expect(chain.eq).toHaveBeenCalledWith('project_id', 'p1')
  })

  it('getScenario selects scenario with snapshots', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 's1', project_id: 'p1', plan_scenario_task_snapshots: [] },
        error: null,
      }),
    }
    mockFrom.mockReturnValue(chain)
    const row = await getScenario('s1')
    expect(chain.select).toHaveBeenCalled()
    expect(row.id).toBe('s1')
  })
})
