import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildSnapshotFromTemplate } from '../industryTemplateService'

vi.mock('../supabase/supabaseClient', () => ({
  platformDb: {
    from: vi.fn(),
    auth: { getUser: vi.fn() },
  },
}))

describe('buildSnapshotFromTemplate', () => {
  it('maps template children to included JSONB arrays', () => {
    const snap = buildSnapshotFromTemplate({
      phases: [{ id: 'p1', phase_number: 1, phase_name: 'Discovery' }],
      activities: [{ id: 'a1', phase_id: 'p1', activity_name: 'Kick-off', activity_type: 'meeting' }],
      deliverables: [{ id: 'd1', deliverable_name: 'PRD' }],
      risks: [{ id: 'r1', risk_title: 'Scope creep', likelihood: 'high', impact: 'high' }],
      milestones: [{ id: 'm1', milestone_name: 'Go-Live' }],
      roles: [{ id: 'ro1', role_title: 'PM', is_key_role: true }],
    })
    expect(snap.included_phases).toHaveLength(1)
    expect(snap.included_phases[0].included).toBe(true)
    expect(snap.included_activities[0].activity_name).toBe('Kick-off')
    expect(snap.included_roles[0].is_key_role).toBe(true)
  })
})
