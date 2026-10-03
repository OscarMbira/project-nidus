import { describe, it, expect } from 'vitest'
import { applyAssessmentDecisionLevels, buildGapSummary, mapAssessmentRowToSeamDisplay, mapAttitudeToSeamLevel } from '../stakeholderSEAMUtils'

describe('stakeholderSEAMUtils', () => {
  it('buildGapSummary returns Aligned when levels match', () => {
    expect(buildGapSummary('neutral', 'neutral')).toBe('Aligned')
  })

  it('mapAttitudeToSeamLevel maps champion to leading', () => {
    expect(mapAttitudeToSeamLevel('champion')).toBe('leading')
  })

  it('mapAssessmentRowToSeamDisplay maps stakeholder join', () => {
    const row = mapAssessmentRowToSeamDisplay({
      id: 'a1',
      stakeholder_id: 's1',
      current_level: 'resistant',
      desired_level: 'supportive',
      stakeholder: { stakeholder_name: 'Bob', photo_path: 'photos/bob.jpg', user_id: 'u1', account_id: 'a1' },
    })
    expect(row.stakeholder_name).toBe('Bob')
    expect(row.photo_path).toBe('photos/bob.jpg')
    expect(row.user_id).toBe('u1')
    expect(row.account_id).toBe('a1')
    expect(row.currentLevel).toBe('resistant')
    expect(row.gap).toContain('Resistant')
  })

  it('applyAssessmentDecisionLevels uses the assessment current and desired levels', () => {
    const [row] = applyAssessmentDecisionLevels(
      [{ project_id: 'p1', stakeholder_id: 's1', engagement_level: 'blocking', target_engagement_level: 'leading' }],
      [{ project_id: 'p1', stakeholder_id: 's1', current_level: 'resistant', desired_level: 'neutral' }],
    )
    expect(row.engagement_level).toBe('resistant')
    expect(row.target_engagement_level).toBe('neutral')
  })
})
