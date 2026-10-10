import { describe, it, expect } from 'vitest'
import { describeRevisionChanges, totalOf } from '../budgetRevisionChanges'

describe('describeRevisionChanges', () => {
  it('reports added, removed and changed lines by category', () => {
    const before = [
      { category_name: 'Labour', budget_amount: 420000 },
      { category_name: 'Contingency', budget_amount: 90000 },
    ]
    const after = [
      { category_name: 'Labour', budget_amount: 450000 },
      { category_name: 'Training', budget_amount: 15000 },
    ]

    expect(describeRevisionChanges(before, after)).toEqual([
      { type: 'changed', name: 'Labour', from: 420000, to: 450000 },
      { type: 'added', name: 'Training', to: 15000 },
      { type: 'removed', name: 'Contingency', from: 90000 },
    ])
  })

  it('returns nothing for unchanged lines', () => {
    const lines = [{ category_name: 'Labour', budget_amount: 420000 }]
    expect(describeRevisionChanges(lines, lines)).toEqual([])
  })

  it('treats missing snapshots as empty', () => {
    expect(describeRevisionChanges(null, [{ category_name: 'Labour', budget_amount: 1 }])).toEqual([
      { type: 'added', name: 'Labour', to: 1 },
    ])
  })
})

describe('describeRevisionChanges — renames and funding sources', () => {
  const names = { fs1: 'Loan / Financing' }

  it('reports a rename by matching the line in the same position', () => {
    const before = [{ category_name: 'Routing software', budget_amount: 180000, funding_source_id: null, display_order: 1 }]
    const after = [{ category_name: 'Routing platform', budget_amount: 180000, funding_source_id: null, display_order: 1 }]

    expect(describeRevisionChanges(before, after, names)).toEqual([
      { type: 'renamed', from: 'Routing software', to: 'Routing platform' },
    ])
  })

  it('reports a funding source change on an otherwise unchanged line', () => {
    const before = [{ category_name: 'Training', budget_amount: 15000, funding_source_id: null, display_order: 0 }]
    const after = [{ category_name: 'Training', budget_amount: 15000, funding_source_id: 'fs1', display_order: 0 }]

    expect(describeRevisionChanges(before, after, names)).toEqual([
      { type: 'funding', name: 'Training', from: null, to: 'fs1' },
    ])
  })

  it('reports a rename and an amount change together', () => {
    const before = [{ category_name: 'Labour', budget_amount: 420000, funding_source_id: null, display_order: 0 }]
    const after = [{ category_name: 'Staff costs', budget_amount: 450000, funding_source_id: null, display_order: 0 }]

    expect(describeRevisionChanges(before, after, names)).toEqual([
      { type: 'renamed', from: 'Labour', to: 'Staff costs' },
      { type: 'changed', name: 'Staff costs', from: 420000, to: 450000 },
    ])
  })
})

describe('totalOf', () => {
  it('sums budget amounts, treating missing values as zero', () => {
    expect(totalOf([{ budget_amount: 100 }, { budget_amount: '50' }, {}])).toBe(150)
  })
})
