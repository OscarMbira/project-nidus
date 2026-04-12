import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getDelaysByPracticeProject, getDelayTemplates, getDelaySummary } from '../sim/simDelayService'

const mockFrom = vi.fn()

vi.mock('../supabase/supabaseClient', () => ({
  simDb: {
    from: (...args) => mockFrom(...args),
  },
}))

describe('simDelayService', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('getDelaysByPracticeProject queries sim.project_delays', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    mockFrom.mockReturnValue(chain)
    await getDelaysByPracticeProject('pp-1')
    expect(mockFrom).toHaveBeenCalledWith('project_delays')
    expect(chain.eq).toHaveBeenCalledWith('practice_project_id', 'pp-1')
  })

  it('getDelayTemplates queries sim.delay_templates', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    mockFrom.mockReturnValue(chain)
    await getDelayTemplates('org-1')
    expect(mockFrom).toHaveBeenCalledWith('delay_templates')
  })

  it('getDelaySummary matches platform logic', () => {
    const s = getDelaySummary([{ status: 'closed', impact_schedule_days: 5, is_auto_linked: false }])
    expect(s.resolvedCount).toBe(1)
    expect(s.totalDaysLost).toBe(5)
  })
})
