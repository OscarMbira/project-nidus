import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getDelaysByProject,
  getDelayTemplates,
  getDelaySummary,
  copyTemplateToDelayObject,
} from '../delayService'

const mockFrom = vi.fn()

vi.mock('../supabase/supabaseClient', () => ({
  platformDb: {
    from: (...args) => mockFrom(...args),
  },
}))

describe('delayService', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('getDelaysByProject queries project_delays', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    mockFrom.mockReturnValue(chain)
    await getDelaysByProject('proj-1')
    expect(mockFrom).toHaveBeenCalledWith('project_delays')
    expect(chain.eq).toHaveBeenCalledWith('project_id', 'proj-1')
  })

  it('getDelayTemplates queries delay_templates with organisation', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    mockFrom.mockReturnValue(chain)
    await getDelayTemplates('org-1')
    expect(mockFrom).toHaveBeenCalledWith('delay_templates')
    expect(chain.eq).toHaveBeenCalledWith('organisation_id', 'org-1')
  })

  it('getDelaySummary aggregates counts', () => {
    const s = getDelaySummary([
      { status: 'identified', impact_schedule_days: 2, is_auto_linked: true, delay_category: 'technical' },
      { status: 'resolved', impact_schedule_days: 1, is_auto_linked: false, delay_category: 'technical' },
    ])
    expect(s.total).toBe(2)
    expect(s.openCount).toBe(1)
    expect(s.resolvedCount).toBe(1)
    expect(s.totalDaysLost).toBe(3)
    expect(s.autoLinkedCount).toBe(1)
  })

  it('copyTemplateToDelayObject sets from_template', () => {
    const o = copyTemplateToDelayObject(
      {
        id: 't1',
        name: 'Vendor late',
        delay_category: 'external_dependency',
        delay_cause: 'x',
        responsible_party: 'vendor',
        default_severity: 'high',
        resolution_plan_template: 'call vendor',
      },
      'p1',
      'o1'
    )
    expect(o.source_type).toBe('from_template')
    expect(o.template_id).toBe('t1')
    expect(o.project_id).toBe('p1')
  })
})
