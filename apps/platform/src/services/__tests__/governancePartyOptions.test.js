import { describe, it, expect } from 'vitest'
import {
  normalizeEscalationSteps,
  normalizeReportingEntries,
  normalizeDecisionEntries,
  emptyEscalationStep,
  emptyDecisionEntry,
} from '../governancePartyOptions'

describe('governancePartyOptions normalize', () => {
  it('uses escalation_steps JSON when present', () => {
    const rows = normalizeEscalationSteps({
      escalation_steps: [{ level: 2, whom: 'PM', timeframe: '2 days', notes: '' }],
      escalation_path: 'ignored',
    })
    expect(rows).toHaveLength(1)
    expect(rows[0].whom).toBe('PM')
    expect(rows[0].level).toBe(2)
  })

  it('falls back to legacy escalation_path lines', () => {
    const rows = normalizeEscalationSteps({
      escalation_steps: [],
      escalation_path: 'Team Lead\nProject Manager',
    })
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ level: 1, whom: 'Team Lead' })
    expect(rows[1].whom).toBe('Project Manager')
  })

  it('falls back reporting_lines into notes when entries empty', () => {
    const rows = normalizeReportingEntries({
      reporting_entries: [],
      reporting_lines: 'PM → Board — monthly',
    })
    expect(rows).toHaveLength(1)
    expect(rows[0].notes).toBe('PM → Board — monthly')
  })

  it('uses decision_entries JSON when present', () => {
    const rows = normalizeDecisionEntries({
      decision_entries: [{ decision: 'Scope change', decided_by: 'Board', method: 'Consensus', notes: '' }],
      decision_flow: 'ignored',
    })
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ decision: 'Scope change', decided_by: 'Board', method: 'Consensus' })
  })

  it('falls back decision_flow into decision when entries empty', () => {
    const rows = normalizeDecisionEntries({
      decision_entries: [],
      decision_flow: 'Budget to Board\nRisks to SC',
    })
    expect(rows).toHaveLength(2)
    expect(rows[0].decision).toBe('Budget to Board')
    expect(rows[1].decision).toBe('Risks to SC')
  })

  it('emptyEscalationStep defaults level', () => {
    expect(emptyEscalationStep(3).level).toBe(3)
  })

  it('emptyDecisionEntry has blank fields', () => {
    expect(emptyDecisionEntry()).toEqual({ decision: '', decided_by: '', method: '', notes: '' })
  })
})
