import { describe, it, expect } from 'vitest'
import { calculateEvmMetrics, calculateRiskScore, calculateThreePointDuration, parseShorthandNumber } from '../formCalculations'

describe('formCalculations', () => {
  it('calculates risk score', () => {
    expect(calculateRiskScore(3, 4)).toBe(12)
  })

  it('calculates three point duration', () => {
    expect(calculateThreePointDuration(1, 2, 7)).toBe(2.6666666666666665)
  })

  it('parses shorthand values', () => {
    expect(parseShorthandNumber('10t')).toBe(10000)
    expect(parseShorthandNumber('3m')).toBe(3000000)
  })

  it('returns core evm fields', () => {
    const evm = calculateEvmMetrics({ pv: 100, ev: 80, ac: 90, bac: 120 })
    expect(evm).toHaveProperty('sv')
    expect(evm).toHaveProperty('tcpi')
  })
})
