import { describe, it, expect, vi } from 'vitest'

// simRunStateService.js imports simDb at module scope (unused by the pure
// functions under test here) — without a mock, evaluating the real
// supabaseClient.js crashes with "window is not defined" in this
// non-browser test environment. Matches the standard mock pattern used
// everywhere else in this directory.
vi.mock('../../supabase/supabaseClient', () => ({
  simDb: { from: vi.fn(), rpc: vi.fn() },
}))

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
