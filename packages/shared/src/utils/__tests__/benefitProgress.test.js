import { describe, it, expect } from 'vitest'
import { benefitGapProgressPercent } from '../benefitProgress.js'

describe('benefitGapProgressPercent', () => {
  it('measures how far a falling measure has moved from baseline to target', () => {
    expect(benefitGapProgressPercent({
      baseline_value: 28, current_value: 18, target_value: 12,
    })).toBeCloseTo(62.5)

    expect(benefitGapProgressPercent({
      baseline_value: 14, current_value: 9, target_value: 6,
    })).toBeCloseTo(62.5)

    expect(benefitGapProgressPercent({
      baseline_value: 42, current_value: 16, target_value: 15,
    })).toBeCloseTo(96.296, 2)
  })

  it('measures how far a rising measure has moved from baseline to target', () => {
    expect(benefitGapProgressPercent({
      baseline_value: 86, current_value: 92, target_value: 96,
    })).toBeCloseTo(60)
  })

  it('goes above 100 when the reading has passed the target in the intended direction', () => {
    expect(benefitGapProgressPercent({
      baseline_value: 4.8, current_value: 3.85, target_value: 3.9,
    })).toBeCloseTo(105.555, 2)
  })

  it('uses the realized reading when one is recorded', () => {
    expect(benefitGapProgressPercent({
      baseline_value: 42, realized_value: 16, current_value: 40, target_value: 15,
    })).toBeCloseTo(96.296, 2)
  })

  it('returns 0 when the reading has moved away from the target', () => {
    expect(benefitGapProgressPercent({
      baseline_value: 28, current_value: 30, target_value: 12,
    })).toBe(0)
  })

  it('returns 0 when baseline, target, or the reading is missing', () => {
    expect(benefitGapProgressPercent({ current_value: 18, target_value: 12 })).toBe(0)
    expect(benefitGapProgressPercent({ baseline_value: 28, current_value: 18 })).toBe(0)
    expect(benefitGapProgressPercent({})).toBe(0)
  })

  it('returns 100 when baseline and target are the same and the reading matches them', () => {
    expect(benefitGapProgressPercent({
      baseline_value: 10, current_value: 10, target_value: 10,
    })).toBe(100)
  })
})
