import { describe, it, expect, beforeEach, vi } from 'vitest'
import { groupProjectAttributeOptions, projectAttributeLabel, listProjectAttributeOptions } from '../projectAttributeOptionsService'

const ROWS = [
  { attribute: 'priority', code: 'high', label: 'High', display_order: 30 },
  { attribute: 'priority', code: 'low', label: 'Low', display_order: 10 },
  { attribute: 'billing_type', code: 'fixed_price', label: 'Fixed Price', display_order: 20 },
  { attribute: 'classification', code: 'strategic', label: 'Strategic', display_order: 10 },
]

function db(rows, calls) {
  const q = {
    select: () => q,
    eq: () => q,
    then: (res, rej) => { calls.push('query'); return Promise.resolve({ data: rows, error: null }).then(res, rej) },
  }
  return { from: () => q }
}

beforeEach(() => sessionStorage.clear())

describe('projectAttributeOptionsService (v1344)', () => {
  it('groups by attribute in display order', () => {
    const g = groupProjectAttributeOptions(ROWS)
    expect(g.priority.map((o) => o.value)).toEqual(['low', 'high'])
    expect(g.billing_type[0]).toMatchObject({ value: 'fixed_price', label: 'Fixed Price' })
    expect(g.classification).toHaveLength(1)
  })

  it('labels a code, tidying unknown codes', () => {
    const g = groupProjectAttributeOptions(ROWS)
    expect(projectAttributeLabel(g, 'priority', 'high')).toBe('High')
    expect(projectAttributeLabel(g, 'billing_type', 'time_and_material')).toBe('Time and material')
    expect(projectAttributeLabel(g, 'priority', '')).toBe('')
  })

  it('reads once per session (rule 66 cache)', async () => {
    const calls = []
    const client = db(ROWS, calls)
    await listProjectAttributeOptions(client)
    const again = await listProjectAttributeOptions(client)
    expect(calls).toHaveLength(1)
    expect(again.priority.map((o) => o.label)).toEqual(['Low', 'High'])
  })
})
