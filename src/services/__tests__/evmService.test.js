import { describe, it, expect } from 'vitest'
import { computeEvmMetrics } from '../evmService'

describe('evmService.computeEvmMetrics', () => {
  it('computes SPI, CPI, EAC from snapshot and BAC', () => {
    const snap = { planned_value: 100, earned_value: 80, actual_cost: 100 }
    const m = computeEvmMetrics(snap, 1000)
    expect(m.sv).toBe(-20)
    expect(m.cv).toBe(-20)
    expect(m.spi).toBeCloseTo(0.8)
    expect(m.cpi).toBeCloseTo(0.8)
    expect(m.eac).toBeCloseTo(1250)
  })
})
