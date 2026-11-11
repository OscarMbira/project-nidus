/**
 * v1339 (D6): the `average` calculation — e.g. Change Readiness score = average of five dimension
 * scores (1–5), shown as a % of the maximum.
 */
import { describe, it, expect } from 'vitest'
import { applyCalculations, evaluateCalculation, formatCalculatedValue } from '../registerCalculations'

const DIMENSIONS = ['aware', 'understand', 'accept', 'able', 'sustain']

describe('average calculation', () => {
  it('averages the listed fields', () => {
    expect(evaluateCalculation({ op: 'average', fields: ['a', 'b', 'c'] }, { a: 2, b: 3, c: 4 })).toBe(3)
  })

  it('ignores empty values and averages the ones that are set', () => {
    expect(evaluateCalculation({ op: 'average', fields: ['a', 'b', 'c'] }, { a: 2, b: '', c: 4 })).toBe(3)
    expect(evaluateCalculation({ op: 'average', fields: ['a', 'b'] }, { a: 5 })).toBe(5)
  })

  it('is empty when no listed field has a number', () => {
    expect(evaluateCalculation({ op: 'average', fields: ['a', 'b'] }, { a: '', b: null })).toBeNull()
    expect(evaluateCalculation({ op: 'average', fields: [] }, {})).toBeNull()
    expect(evaluateCalculation({ op: 'average' }, { a: 1 })).toBeNull()
  })

  it('shows the average as a percentage of `of` (3.8 of 5 → 76)', () => {
    const rule = { op: 'average', fields: DIMENSIONS, of: 5, decimals: 1, display: 'percent' }
    expect(evaluateCalculation(rule, { aware: 4, understand: 4, accept: 3, able: 4, sustain: 4 })).toBe(76)
    expect(formatCalculatedValue({ calculation: rule }, 76)).toBe('76%')
  })

  it('respects decimals (default 2)', () => {
    expect(evaluateCalculation({ op: 'average', fields: ['a', 'b', 'c'] }, { a: 1, b: 2, c: 2 })).toBe(1.67)
    expect(evaluateCalculation({ op: 'average', fields: ['a', 'b', 'c'], decimals: 0 }, { a: 1, b: 2, c: 2 })).toBe(2)
    expect(evaluateCalculation({ op: 'average', fields: ['a', 'b', 'c'], of: 5, decimals: 1 }, { a: 1, b: 2, c: 2 })).toBe(33.3)
  })

  it('difference has no floating-point noise (3.4 − 4 = −0.6), and respects decimals', () => {
    expect(evaluateCalculation({ op: 'difference', minuend: 'a', subtrahend: 'b' }, { a: 3.4, b: 4 })).toBe(-0.6)
    expect(evaluateCalculation({ op: 'difference', minuend: 'a', subtrahend: 'b' }, { a: 1.8, b: 2 })).toBe(-0.2)
    expect(evaluateCalculation({ op: 'difference', minuend: 'a', subtrahend: 'b', decimals: 0 }, { a: 10.6, b: 2 })).toBe(9)
    expect(evaluateCalculation({ op: 'difference', minuend: 'a', subtrahend: 'b' }, { a: 6816033, b: 6816021 })).toBe(12)
  })

  it('runs in field order and can use an earlier calculated value', () => {
    const fields = [
      { field_key: 'received', field_type: 'number' },
      { field_key: 'loaded', field_type: 'number' },
      { field_key: 'success', field_type: 'number', calculation: { op: 'percent', numerator: 'loaded', denominator: 'received' } },
      { field_key: 'quality', field_type: 'number' },
      { field_key: 'overall', field_type: 'number', calculation: { op: 'average', fields: ['success', 'quality'] } },
    ]
    const out = applyCalculations(fields, { received: 200, loaded: 180, quality: 80 })
    expect(out.success).toBe(90)
    expect(out.overall).toBe(85)
    expect(applyCalculations(fields, { overall: 50 })).not.toHaveProperty('overall')
  })
})
