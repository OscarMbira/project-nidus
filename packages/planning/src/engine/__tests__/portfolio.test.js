/** v1359 (L1) — portfolio scoring and optimiser: hand-worked vectors, brute-force agreement, greedy above the cap. */
import { describe, expect, it } from 'vitest'
import vectors from '../__vectors__/portfolio.json'
import { projectScore, weightTotal, weightsAreValid, confidenceToScore } from '../portfolioScoring.js'
import { EXACT_LIMIT, bruteForcePortfolio, optimisePortfolio } from '../portfolioOptimiser.js'

const ids = (r) => r.chosen.map((c) => c.projectId).sort()

describe('portfolio scoring', () => {
  const criteria = [{ id: 'fit', weight: 50 }, { id: 'value', weight_percent: 30 }, { id: 'risk', weight: 20 }]
  it('weights must total 100 and all be positive', () => {
    expect(weightTotal(criteria)).toBe(100)
    expect(weightsAreValid(criteria)).toBe(true)
    expect(weightsAreValid([{ id: 'a', weight: 60 }, { id: 'b', weight: 30 }])).toBe(false)
    expect(weightsAreValid([{ id: 'a', weight: 100 }, { id: 'b', weight: 0 }])).toBe(false)
  })
  it('scores the weighted average and skips unscored criteria', () => {
    expect(projectScore(criteria, { fit: 5, value: 3, risk: 1 })).toBe(3.6)
    expect(projectScore(criteria, { fit: 4 })).toBe(2)
  })
  it('maps strategic-contribution confidence to the 1–5 scale', () => {
    expect([confidenceToScore('High'), confidenceToScore('medium'), confidenceToScore('LOW'), confidenceToScore('?')]).toEqual([5, 3, 1, null])
  })
})

describe('portfolio optimiser vectors', () => {
  for (const v of vectors.cases) {
    it(v.name, () => {
      const out = optimisePortfolio(v.input)
      expect(ids(out)).toEqual([...v.expect.chosen].sort())
      expect(out.totalScore).toBe(v.expect.totalScore)
      expect(out.method).toBe(v.expect.method)
      for (const [id, shift] of Object.entries(v.expect.shifts || {})) {
        expect(out.chosen.find((c) => c.projectId === id)?.shift).toBe(shift)
      }
      for (const [id, reason] of Object.entries(v.expect.leftOutReason || {})) {
        expect(out.leftOut.find((l) => l.projectId === id)?.reason).toBe(reason)
      }
      // The brute-force search must reach the same best score.
      expect(bruteForcePortfolio(v.input).totalScore).toBe(v.expect.totalScore)
    })
  }
})

describe('exact search against brute force on random small sets', () => {
  // Seeded so a failure can be reproduced.
  let seed = 1359
  const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648 }
  it('agrees on 60 random portfolios of up to 8 projects with rules and start shifts', () => {
    for (let t = 0; t < 60; t++) {
      const n = 3 + Math.floor(rand() * 6)
      const projects = Array.from({ length: n }, (_, i) => ({ id: `P${i}`, name: `Project ${i}`, score: Math.round(rand() * 50) / 10, cost: Math.round(rand() * 60), demand: Math.round(rand() * 30) }))
      const rules = []
      if (rand() < 0.5) rules.push({ type: 'requires', projectId: 'P0', otherId: `P${n - 1}` })
      if (rand() < 0.5) rules.push({ type: 'exclusive', projectId: 'P1', otherId: 'P2' })
      const input = {
        periods: [{ id: 'a', budget: 80 + rand() * 60, capacity: 40 + rand() * 30 }, { id: 'b', budget: 60, capacity: 30 }],
        maxShift: rand() < 0.5 ? 0 : 1,
        projects,
        rules,
      }
      expect(optimisePortfolio(input).totalScore, `case ${t}`).toBe(bruteForcePortfolio(input).totalScore)
    }
  })
})

describe('large portfolios', () => {
  it(`uses the labelled greedy method above ${EXACT_LIMIT} candidates and stays within limits`, () => {
    const projects = Array.from({ length: EXACT_LIMIT + 5 }, (_, i) => ({ id: `P${i}`, name: `Project ${i}`, score: (i % 7) + 1, cost: 10 + (i % 5), demand: 5 }))
    const out = optimisePortfolio({ periods: [{ id: 'p1', budget: 200, capacity: 100 }], maxShift: 0, projects })
    expect(out.method).toBe('greedy')
    expect(out.budgetUsed[0]).toBeLessThanOrEqual(200)
    expect(out.capacityUsed[0]).toBeLessThanOrEqual(100)
    expect(out.chosen.length + out.leftOut.length).toBe(projects.length)
  })
})
