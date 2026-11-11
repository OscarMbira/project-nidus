/**
 * v1337 runbook: order / checkpoint warnings and the live run summary.
 */
import { describe, it, expect } from 'vitest'
import { needsSequenceCheck, sequenceWarnings, appendOverrideReason, sameRunbook } from '../runbookSequencing'
import { summariseRunbook, runbookProgressText, orderSteps } from '../runbookSummary'

const RB = [{ id: 'rb1', label: 'LREG-2027-001 – Mock 2 static' }]
const step = (id, sequence, status, extra = {}) => ({
  id, title: `Step ${sequence}`, status,
  field_values: { runbook: RB, sequence, batch: 'static_data', window: 'static', step_type: 'load', ...extra },
})

describe('needsSequenceCheck', () => {
  it('checks only when a step is first started or finished', () => {
    expect(needsSequenceCheck('not_started', 'in_progress')).toBe(true)
    expect(needsSequenceCheck(undefined, 'done')).toBe(true)
    expect(needsSequenceCheck('in_progress', 'done')).toBe(false)
    expect(needsSequenceCheck('not_started', 'blocked')).toBe(false)
  })
})

describe('sequenceWarnings', () => {
  const steps = [
    step('s1', 1, 'done'),
    step('s2', 2, 'in_progress'),
    step('s3', 3, 'not_started', { can_run_in_parallel: true }),
    step('s4', 4, 'not_started', { batch: 'balance_sheet' }),
    step('c5', 5, 'done', { step_type: 'checkpoint', checkpoint_decision: 'stop' }),
    step('s6', 6, 'skipped'),
    step('o1', 1, 'not_started', { runbook: [{ id: 'rb2', label: 'Other' }] }),
  ]

  it('lists earlier unfinished steps of the same batch and unpassed checkpoints', () => {
    const w = sequenceWarnings(step('s7', 7, 'in_progress'), steps)
    expect(w.map((x) => x.stepId)).toEqual(['s2', 'c5'])
    expect(w[0]).toMatchObject({ kind: 'order', text: 'Step 2 – Step 2 is not done yet' })
    expect(w[1]).toMatchObject({ kind: 'checkpoint', text: 'Checkpoint 5 – Step 5 has not been passed' })
  })

  it('skips order warnings for a parallel step but still checks checkpoints', () => {
    const w = sequenceWarnings(step('s7', 7, 'in_progress', { can_run_in_parallel: true }), steps)
    expect(w.map((x) => x.stepId)).toEqual(['c5'])
  })

  it('treats a passed checkpoint as clear and ignores other runbooks', () => {
    const passed = steps.map((s) => (s.id === 'c5' ? { ...s, field_values: { ...s.field_values, checkpoint_decision: 'proceed_with_conditions' } } : s))
    expect(sequenceWarnings(step('s7', 7, 'in_progress'), passed).map((x) => x.stepId)).toEqual(['s2'])
    expect(sameRunbook(steps[0], steps[6])).toBe(false)
    expect(sequenceWarnings(step('x', 'n/a', 'done'), steps)).toEqual([])
  })
})

describe('appendOverrideReason', () => {
  it('adds a table row (When | By | Reason), newest last', () => {
    const at = new Date('2027-04-10T15:05:00Z')
    expect(appendOverrideReason('', ' Vendor ready early ', { at })).toBe('2027-04-10 15:05 UTC\t\tVendor ready early')
    expect(appendOverrideReason('first', 'second', { at, by: 'Data lead' })).toBe('first\n2027-04-10 15:05 UTC\tData lead\tsecond')
  })

  it('keeps a reason with tabs or line breaks on one row', () => {
    const at = new Date('2027-04-10T15:05:00Z')
    expect(appendOverrideReason('', 'line one\nline\ttwo', { at })).toBe('2027-04-10 15:05 UTC\t\tline one line two')
  })
})

describe('summariseRunbook', () => {
  const steps = [
    step('a', 2, 'done', { records_received: 1000, records_loaded: 990, time_taken_minutes: 50, budget_minutes: 40, budget_variance_minutes: 10 }),
    step('b', 1, 'in_progress', { records_received: 500, records_loaded: 0, budget_minutes: 30 }),
    step('c', 3, 'failed', { step_type: 'backup', window: 'financial', records_received: 99 }),
    step('d', 4, 'skipped', { window: 'financial' }),
  ]

  it('totals status, records and time per window', () => {
    const s = summariseRunbook(steps, { windowLabels: { static: 'Static window' } })
    expect(s).toMatchObject({ total: 4, done: 1, skipped: 1, inProgress: 1, failed: 1, overBudget: 1, received: 1500, loaded: 990, failedRecords: 510, successPercent: 66 })
    expect(s.windows).toEqual([
      { key: 'static', label: 'Static window', steps: 2, done: 1, budgetMinutes: 70, takenMinutes: 50, varianceMinutes: -20 },
      { key: 'financial', label: 'financial', steps: 2, done: 1, budgetMinutes: 0, takenMinutes: 0, varianceMinutes: null },
    ])
    expect(runbookProgressText(s)).toBe('2 / 4 steps done · 1 failed')
    expect(orderSteps(steps).map((x) => x.id)).toEqual(['b', 'a', 'c', 'd'])
  })

  it('handles an empty runbook', () => {
    const s = summariseRunbook([])
    expect(s.successPercent).toBeNull()
    expect(runbookProgressText(s)).toBe('No steps yet')
  })
})
