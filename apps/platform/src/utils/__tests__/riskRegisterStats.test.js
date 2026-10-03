import { describe, it, expect } from 'vitest'
import { summariseProjectRisks, topOpenRisks } from '../riskRegisterStats'

describe('summariseProjectRisks', () => {
  const risks = [
    { id: '1', pre_risk_score: 'high', status_enum: 'identified', response_strategy: '' },
    { id: '2', pre_risk_score: 'very_high', status_enum: 'monitoring', response_category: 'mitigate' },
    { id: '3', pre_risk_score: 'medium', status_enum: 'identified', response_strategy: 'accept' },
    { id: '4', pre_risk_score: 'high', status_enum: 'closed', response_strategy: '' },
    { id: '5', pre_probability: 4, pre_impact: 4, status_enum: 'identified' },
  ]

  it('counts total, active, and high from the same rows', () => {
    const stats = summariseProjectRisks(risks)
    expect(stats.total).toBe(5)
    expect(stats.active).toBe(4)
    expect(stats.high).toBe(4)
  })

  it('counts a missing response plan only for active high risks', () => {
    const stats = summariseProjectRisks(risks)
    expect(stats.withoutResponsePlan.map((risk) => risk.id)).toEqual(['1', '5'])
  })
})

describe('topOpenRisks', () => {
  it('lists open risks by expected value and skips closed rows', () => {
    const rows = topOpenRisks([
      { id: 'a', risk_title: 'Closed', pre_expected_value: 20, status_enum: 'closed', pre_risk_score: 'very_high' },
      { id: 'b', risk_title: 'Lower', pre_expected_value: 8, status_enum: 'identified', pre_risk_score: 'medium', risk_identifier: 'RSK-2' },
      { id: 'c', risk_title: 'Higher', pre_expected_value: 16, status_enum: 'identified', pre_risk_score: 'high', risk_code: 'RSK-1' },
    ], 5)
    expect(rows.map((row) => row.risk_id)).toEqual(['c', 'b'])
    expect(rows[0].risk_identifier).toBe('RSK-1')
  })
})
