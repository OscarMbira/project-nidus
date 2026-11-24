import { describe, it, expect } from 'vitest'
import vector from '../__vectors__/qra-small.json'
import {
  createRng, inverseNormal, normalCdf, sampleTriangular, sampleRange, distributionMean, GROUP_STRENGTH,
  prepareGroupDraws,
} from '../distributions.js'
import {
  scoreFromPercent, midpointFromScore, riskEmv, exposureTotals, quantifiedProblem, applyQuickRange,
  DEFAULT_PROBABILITY_BANDS,
} from '../riskExposure.js'
import { percentile, spearman, contingency, chanceOfMeeting } from '../results.js'
import { buildAnalysisModel } from '../model.js'
import { runAnalysis, runCostIteration } from '../runAnalysis.js'
import { scheduleProject as schedule, buildCalendar as calBuilder } from '../../schedule.js'

describe('probability bands and EMV', () => {
  it('maps a percent onto the 1–5 band and back to the band mid-point', () => {
    expect(scoreFromPercent(10, DEFAULT_PROBABILITY_BANDS)).toBe(1)
    expect(scoreFromPercent(50, DEFAULT_PROBABILITY_BANDS)).toBe(3)
    expect(scoreFromPercent(75, DEFAULT_PROBABILITY_BANDS)).toBe(4)
    expect(scoreFromPercent(99, DEFAULT_PROBABILITY_BANDS)).toBe(5)
    expect(midpointFromScore(3)).toBe(50.5)
  })

  it('uses the band mid-point when no percent is given and marks it estimated', () => {
    const row = riskEmv({ pre_probability: 3, pre_cost_ml: 1000 }, { basis: 'pre' })
    expect(row.estimatedFromScore).toBe(true)
    expect(row.probability).toBeCloseTo(0.505, 5)
    expect(row.costEmv).toBeCloseTo(505, 5)
  })

  it('treats an opportunity (negative impact) as negative EMV', () => {
    const row = riskEmv({
      pre_probability_percent: 50,
      pre_cost_min: -3000,
      pre_cost_ml: -2000,
      pre_cost_max: -1000,
      impact_distribution: 'triangular',
    })
    expect(row.estimatedFromScore).toBe(false)
    expect(row.costMean).toBeCloseTo(-2000, 5)
    expect(row.costEmv).toBeCloseTo(-1000, 5)
    const totals = exposureTotals([
      { pre_probability_percent: 50, pre_cost_ml: 4000 },
      { pre_probability_percent: 50, pre_cost_ml: -2000 },
    ])
    expect(totals.costEmv).toBeCloseTo(1000, 5)
  })

  it('rejects a percent outside 1–99 and an out-of-order range', () => {
    expect(quantifiedProblem({ p: 0 }, { percentKey: 'p' })).toMatch(/1 to 99/)
    expect(quantifiedProblem({ a: 5, b: 1, c: 3 }, { percentKey: 'p', minKey: 'a', mlKey: 'b', maxKey: 'c' })).toMatch(/out of order/)
    expect(quantifiedProblem({ b: 10 }, { percentKey: 'p', minKey: 'a', mlKey: 'b', maxKey: 'c' })).toBeNull()
  })

  it('applies a quick percent range around a point estimate', () => {
    expect(applyQuickRange(10, -10, 25)).toEqual({ min: 9, ml: 10, max: 12.5 })
  })
})

describe('distributions', () => {
  it('inverse normal and the normal CDF agree around the centre', () => {
    expect(inverseNormal(0.5)).toBeCloseTo(0, 4)
    expect(inverseNormal(0.975)).toBeCloseTo(1.96, 2)
    expect(normalCdf(inverseNormal(0.8))).toBeCloseTo(0.8, 3)
  })

  it('triangular and PERT means sit near the formula over many draws', () => {
    const rng = createRng(11)
    let tri = 0
    let pert = 0
    const n = 4000
    for (let i = 0; i < n; i++) {
      tri += sampleTriangular(1, 2, 9, rng.next())
      pert += sampleRange(rng, { min: 1, mode: 2, max: 9, distribution: 'pert' })
    }
    expect(tri / n).toBeCloseTo(distributionMean('triangular', 1, 2, 9), 1)
    expect(pert / n).toBeCloseTo(distributionMean('pert', 1, 2, 9), 0)
  })

  it('repeats the same draws from the same seed', () => {
    const a = []
    const b = []
    const ra = createRng(42)
    const rb = createRng(42)
    for (let i = 0; i < 20; i++) {
      a.push(sampleRange(ra, { min: 1, mode: 5, max: 20, distribution: 'triangular' }))
      b.push(sampleRange(rb, { min: 1, mode: 5, max: 20, distribution: 'triangular' }))
    }
    expect(a).toEqual(b)
  })

  it('high-strength group members move together', () => {
    const rng = createRng(7)
    const xs = []
    const ys = []
    for (let i = 0; i < 500; i++) {
      const draws = prepareGroupDraws(rng, [{ id: 'g' }])
      const item = { min: 0, mode: 50, max: 100, distribution: 'triangular', groupId: 'g', strength: 'high' }
      xs.push(sampleRange(rng, item, draws))
      ys.push(sampleRange(rng, item, draws))
    }
    expect(GROUP_STRENGTH.high).toBe(0.9)
    expect(spearman(xs, ys)).toBeGreaterThan(0.75)
  })
})

describe('schedule and cost simulation', () => {
  const chain = () => ({
    seed: 5,
    iterations: 1000,
    basis: 'pre',
    kind: 'schedule',
    projectStart: vector.projectStart,
    calendar: calBuilder(),
    confidence: 80,
    includeRisks: true,
    tasks: [
      { id: 'a', name: 'Prepare', point: 5, mode: 5, isMilestone: false, scheduleMode: 'auto', constraintType: 'asap' },
      { id: 'b', name: 'Install', point: 5, mode: 5, isMilestone: false, scheduleMode: 'auto', constraintType: 'asap' },
    ],
    dependencies: [{ pred: 'a', succ: 'b', type: 'FS', lag: 0 }],
    risks: [],
    groups: [],
    costLines: [],
    bands: DEFAULT_PROBABILITY_BANDS,
  })

  it('matches the deterministic engine when every range is a point and no risk occurs', async () => {
    const model = chain()
    const expected = schedule({
      projectStart: model.projectStart,
      calendar: model.calendar,
      tasks: model.tasks.map((t) => ({ id: t.id, duration: t.point })),
      dependencies: model.dependencies,
    })
    const { summary } = await runAnalysis(model)
    expect(summary.schedule.p10).toBe(expected.projectFinish)
    expect(summary.schedule.p90).toBe(expected.projectFinish)
    expect(summary.schedule.chance).toBeNull()
  })

  it('adds a certain risk onto the linked task and the delay flows to the successor', async () => {
    const model = chain()
    model.risks = [{
      id: 'r', name: 'Supplier slips', probability: 1,
      daysMin: 2, daysMode: 2, daysMax: 2, distribution: 'triangular', taskIds: ['a'],
      costMin: null, costMode: null, costMax: null,
    }]
    const expected = schedule({
      projectStart: model.projectStart,
      calendar: model.calendar,
      tasks: [{ id: 'a', duration: 7 }, { id: 'b', duration: 5 }],
      dependencies: model.dependencies,
    })
    const { summary } = await runAnalysis(model)
    expect(summary.schedule.p50).toBe(expected.projectFinish)
    const bare = schedule({
      projectStart: model.projectStart,
      calendar: model.calendar,
      tasks: [{ id: 'a', duration: 5 }, { id: 'b', duration: 5 }],
      dependencies: model.dependencies,
    })
    expect(summary.schedule.p50 > bare.projectFinish).toBe(true)
  })

  it('stores a seed and repeats the identical P-values', async () => {
    const model = buildAnalysisModel({
      seed: 99,
      iterations: 1000,
      projectStart: '2026-10-12',
      basis: 'pre',
      includeCost: false,
      tasks: [
        { id: 'a', task_name: 'Prepare', estimated_duration_days: 10 },
        { id: 'b', task_name: 'Install', estimated_duration_days: 8 },
      ],
      ranges: [{ task_id: 'a', min_days: 8, ml_days: 10, max_days: 20, distribution: 'triangular' }],
      dependencies: [{ predecessor_task_id: 'a', successor_task_id: 'b', dependency_type: 'finish_to_start' }],
      risks: [{ id: 'r', risk_title: 'Access delayed', pre_probability_percent: 40, pre_schedule_days_min: 0, pre_schedule_days_ml: 3, pre_schedule_days_max: 8 }],
      links: [{ risk_id: 'r', task_id: 'b' }],
    })
    const first = await runAnalysis(model)
    const second = await runAnalysis(model)
    expect(first.summary.seed).toBe(99)
    expect(second.summary.schedule.p80).toBe(first.summary.schedule.p80)
    expect(second.summary.schedule.p50).toBe(first.summary.schedule.p50)
    expect(first.summary.criticality.find((t) => t.taskId === 'a').criticality).toBeGreaterThan(0)
  })

  it('grows a per-day cost with the simulated delay', () => {
    const model = {
      costLines: [{ id: 'labour', name: 'Site team', point: 1000, mode: 1000, min: null, max: null, isTimeDependent: true, dailyRate: 100 }],
      risks: [],
      groups: [],
    }
    const rng = createRng(1)
    const early = runCostIteration({ model, rng, groupDraws: new Map(), occurrences: new Map(), delayDays: 0 })
    const late = runCostIteration({ model, rng, groupDraws: new Map(), occurrences: new Map(), delayDays: 4 })
    expect(late.total - early.total).toBeCloseTo(400, 5)
  })

  it('recommends contingency as the P-value minus the base, against what is held', () => {
    const row = contingency({ pCost: 180, baseBudget: 100, held: 50, pDay: 40, plannedDay: 30 })
    expect(row.recommendedCost).toBe(80)
    expect(row.gap).toBe(30)
    expect(row.recommendedScheduleDays).toBe(10)
    expect(chanceOfMeeting([90, 110, 80], 100)).toBeCloseTo(2 / 3, 5)
    expect(percentile([1, 2, 3, 4], 50)).toBeCloseTo(2.5, 5)
  })

  it('cancels without a summary when stopped before the first iteration', async () => {
    const model = chain()
    const result = await runAnalysis(model, { shouldCancel: () => true })
    expect(result.cancelled).toBe(true)
    expect(result.summary).toBeNull()
  })
})

describe('model builder', () => {
  it('drops risks for a schedule-only caller and keeps a task range', () => {
    const model = buildAnalysisModel({
      includeRisks: false,
      includeCost: false,
      projectStart: '2026-10-12',
      tasks: [{ id: 'a', task_name: 'Prepare', estimated_duration_days: 10 }],
      ranges: [{ task_id: 'a', min_days: 8, ml_days: 10, max_days: 14, distribution: 'pert' }],
      risks: [{ id: 'r', risk_title: 'Ignored', pre_probability_percent: 40 }],
    })
    expect(model.risks).toEqual([])
    expect(model.tasks[0].distribution).toBe('pert')
    expect(model.tasks[0].min).toBe(8)
    expect(model.iterations).toBe(5000)
  })
})
