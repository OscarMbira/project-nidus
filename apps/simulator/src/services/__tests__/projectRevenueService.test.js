import { describe, it, expect } from 'vitest'
import { sumAmounts } from '../projectRevenueService'

describe('projectRevenueService.sumAmounts', () => {
  it('sums numeric amounts', () => {
    expect(sumAmounts([{ amount: 10 }, { amount: '20.5' }])).toBeCloseTo(30.5)
  })

  it('returns 0 for empty or invalid', () => {
    expect(sumAmounts([])).toBe(0)
    expect(sumAmounts(null)).toBe(0)
  })
})
