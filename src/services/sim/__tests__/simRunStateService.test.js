import { describe, it, expect } from 'vitest'
import {
  applyHealthImpactMerge,
  interpolatePvAtDay,
  computeEvmMetrics,
} from '../simRunStateService'

describe('simRunStateService', () => {
  it('applyHealthImpactMerge clamps 0–100 for percentage metrics', () => {
    expect(applyHealthImpactMerge({ quality_score: 95 }, { quality_score: 20 }).quality_score).toBe(100)
    expect(applyHealthImpactMerge({ team_morale: 5 }, { team_morale: -20 }).team_morale).toBe(0)
  })

  it('applyHealthImpactMerge adds schedule_variance_days', () => {
    expect(applyHealthImpactMerge({ schedule_variance_days: 2 }, { schedule_variance_days: 3 }).schedule_variance_days).toBe(5)
  })

  it('interpolatePvAtDay interpolates mid-segment', () => {
    const curve = [
      { sim_day: 0, pv: 0 },
      { sim_day: 10, pv: 100 },
    ]
    expect(interpolatePvAtDay(curve, 5)).toBe(50)
  })

  it('computeEvmMetrics returns CPI/SPI/EAC/TCP', () => {
    const m = computeEvmMetrics({ pv: 100, ev: 90, ac: 80, bac: 200 })
    expect(m.cpi).toBeCloseTo(1.125, 3)
    expect(m.spi).toBeCloseTo(0.9, 3)
    expect(m.eac).toBeGreaterThan(0)
    expect(m.tcpi).toBeDefined()
  })
})
