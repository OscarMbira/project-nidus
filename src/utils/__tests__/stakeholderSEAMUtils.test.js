import { describe, it, expect } from 'vitest'
import { buildGapSummary, mapAssessmentRowToSeamDisplay, mapAttitudeToSeamLevel } from '../stakeholderSEAMUtils'

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
      stakeholder: { stakeholder_name: 'Bob' },
    })
    expect(row.stakeholder_name).toBe('Bob')
    expect(row.currentLevel).toBe('resistant')
    expect(row.gap).toContain('Resistant')
  })
})
