import { describe, it, expect } from 'vitest'
import { planSummaryText, practicePidToForm, practicePidFormToUpdate, toleranceLines } from '../practicePidForm'

describe('practice PID form helpers', () => {
  const row = {
    pid_title: 'PID — Mobile inspections',
    project_objectives: ['Same-day results', 'No re-keying'],
    interfaces: ['Asset register'],
    project_plan_summary: { summary: 'Three stages' },
    stage_plan_summary: {},
    tolerance_levels: { time: '2 weeks', cost: '10%', risk: 'Board review' },
    exclusions: null,
  }

  it('reads plan summaries as text, including the {} default', () => {
    expect(planSummaryText('plain')).toBe('plain')
    expect(planSummaryText({ summary: 'x' })).toBe('x')
    expect(planSummaryText({})).toBe('')
    expect(planSummaryText(null)).toBe('')
  })

  it('maps a row to string form fields', () => {
    const form = practicePidToForm(row)
    expect(form.project_objectives).toBe('Same-day results\nNo re-keying')
    expect(form.interfaces).toBe('Asset register')
    expect(form.project_plan_summary).toBe('Three stages')
    expect(form.stage_plan_summary).toBe('')
    expect(form.tolerance_time).toBe('2 weeks')
    expect(form.tolerance_scope).toBe('')
    expect(form.exclusions).toBe('')
  })

  it('builds the update payload with arrays and JSON, keeping tolerances not on the form', () => {
    const form = { ...practicePidToForm(row), project_objectives: 'A\n\n B ', stage_plan_summary: 'Pilot first', tolerance_cost: '' }
    const out = practicePidFormToUpdate(form, row)
    expect(out.project_objectives).toEqual(['A', 'B'])
    expect(out.project_plan_summary).toEqual({ summary: 'Three stages' })
    expect(out.stage_plan_summary).toEqual({ summary: 'Pilot first' })
    expect(out.tolerance_levels).toEqual({ time: '2 weeks', risk: 'Board review' })
    expect(out.exclusions).toBeNull()
  })

  it('lists tolerances for display', () => {
    expect(toleranceLines({ time: '2 weeks', cost: '' })).toBe('Time: 2 weeks')
    expect(toleranceLines(null)).toBe('')
  })
})
