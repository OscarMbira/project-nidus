import { describe, expect, it } from 'vitest'
import { hydrateDelayForm, normalizeDelayPayload } from '../delayImpactLists'

const ISSUE_A = '11111111-1111-4111-8111-111111111111'
const ISSUE_B = '22222222-2222-4222-8222-222222222222'

describe('delay impact and link lists', () => {
  it('turns an existing single day count and cost into one list line', () => {
    const form = hydrateDelayForm({ impact_schedule_days: 4, impact_cost: 2500 })
    expect(form.impact_schedule_entries).toBe('4')
    expect(form.impact_cost_entries).toBe('2500')
  })

  it('sums schedule days and cost shorthand, and keeps the first linked id', () => {
    const { payload, error } = normalizeDelayPayload({
      title: 'Late delivery',
      impact_schedule_entries: '5\n3',
      impact_cost_entries: '10k\n500',
      impact_scope: 'Floor plan\nSignage',
      linked_issue_ids_text: `${ISSUE_A}\n${ISSUE_B}`,
      projects: { id: 'should-not-save' },
    })
    expect(error).toBeUndefined()
    expect(payload.impact_schedule_days).toBe(8)
    expect(payload.impact_schedule_entries).toBe('5\n3')
    expect(payload.impact_cost).toBe(10500)
    expect(payload.impact_cost_entries).toBe('10k\n500')
    expect(payload.impact_scope).toBe('Floor plan\nSignage')
    expect(payload.linked_issue_ids).toEqual([ISSUE_A, ISSUE_B])
    expect(payload.linked_issue_id).toBe(ISSUE_A)
    expect(payload.linked_issue_ids_text).toBeUndefined()
    expect(payload.projects).toBeUndefined()
  })

  it('rejects a schedule line that is not a whole number of days', () => {
    const { error } = normalizeDelayPayload({ impact_schedule_entries: '2.5' })
    expect(error).toMatch(/whole number/)
  })

  it('rejects a link that is not a record id', () => {
    const { error } = normalizeDelayPayload({ linked_issue_ids_text: 'not-an-id' })
    expect(error).toMatch(/record id/)
  })
})
