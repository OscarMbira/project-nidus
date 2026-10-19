// v1272 Phase 3 — rule-based adaptive difficulty.
import { describe, expect, it } from 'vitest'
import { nextDifficultyLevel, performanceBand, responseDeadlineDays, selectTemplates, startingLevel, templateControls } from '../simAdaptiveDifficulty.js'

describe('performanceBand', () => {
  it('reads struggling, on track and excelling from the run metrics', () => {
    expect(performanceBand({ health: { budget: 40, schedule: 45 }, eventScores: [40, 50] }).band).toBe('struggling')
    expect(performanceBand({ health: { budget: 70, schedule: 65 }, eventScores: [70] }).band).toBe('on_track')
    expect(performanceBand({ health: { budget: 90 }, eventScores: [95, 92], trust: [60], assessor: [85] }).band).toBe('excelling')
    expect(performanceBand({}).band).toBe('on_track')
  })
  it('ignores schedule variance days (not a 0–100 metric)', () => {
    expect(performanceBand({ health: { budget: 80, schedule_variance_days: -40 } }).parts.health).toBe(80)
  })
})

describe('difficulty level', () => {
  const scenario = { min_difficulty: 2, max_difficulty: 4 }
  it('starts mid-range and moves one step, never outside the author range', () => {
    expect(startingLevel(scenario)).toBe(3)
    expect(nextDifficultyLevel(3, 'excelling', scenario)).toBe(4)
    expect(nextDifficultyLevel(4, 'excelling', scenario)).toBe(4)
    expect(nextDifficultyLevel(2, 'struggling', scenario)).toBe(2)
    expect(nextDifficultyLevel(5, 'on_track', scenario)).toBe(4)
    expect(nextDifficultyLevel(3, 'excelling', { ...scenario, adaptive_enabled: false })).toBe(3)
  })
})

describe('template controls', () => {
  const templates = [
    { template_code: 'a', severity: 'critical', weight: 10, cooldown_days: 7 },
    { template_code: 'b', severity: 'medium', weight: 20, cooldown_days: 7 },
    { template_code: 'c', severity: 'low', weight: 10, cooldown_days: 7 },
  ]
  it('caps severity and is deterministic', () => {
    const easy = selectTemplates(templates, templateControls(1), { simDay: 10 })
    expect(easy.map((t) => t.template_code)).toEqual(['b', 'c']) // equal adjusted weight: template code breaks the tie
    const hard = selectTemplates(templates, templateControls(5), { simDay: 10 })
    expect(hard.map((t) => t.template_code)).toEqual(['b', 'a', 'c'])
    expect(selectTemplates(templates, templateControls(5), { simDay: 10 })).toEqual(hard)
  })
  it('scales cooldowns and response time; low trust shortens it', () => {
    expect(selectTemplates(templates, templateControls(1), { simDay: 12, fired: { c: 2, b: 0 } }).map((t) => t.template_code)).toEqual(['b'])
    expect(responseDeadlineDays(templateControls(1))).toBe(4)
    expect(responseDeadlineDays(templateControls(1), -50)).toBe(3)
    expect(responseDeadlineDays(templateControls(5), -50)).toBe(1)
  })
})
