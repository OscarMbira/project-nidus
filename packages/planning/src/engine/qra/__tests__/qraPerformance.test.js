/**
 * v1359 (Q2) — the v1355 plan's performance check: 5,000 iterations over a 500-task schedule with ranges, 50 risks
 * and dependencies. Skipped in normal runs (slow); run with  QRA_PERF=1 npx vitest run qraPerformance
 * The result is recorded in projectplan/v1355_quantitative_risk_analysis_plan.md (Review).
 */
import { describe, expect, it } from 'vitest'
import { buildAnalysisModel, runAnalysis } from '../index.js'

const ON = Boolean(globalThis.process?.env?.QRA_PERF)

function bigSchedule() {
  const tasks = []
  const ranges = []
  const dependencies = []
  // 10 parallel workstreams of 50 tasks each, chained; every 10th task depends on the previous stream too.
  for (let s = 0; s < 10; s++) {
    for (let i = 0; i < 50; i++) {
      const id = `t${s}-${i}`
      const days = 2 + ((s * 7 + i * 3) % 9)
      tasks.push({ id, task_name: `Task ${s}.${i}`, estimated_duration_days: days })
      ranges.push({ task_id: id, min_days: Math.max(1, days - 1), ml_days: days, max_days: days + 3, distribution: i % 2 ? 'pert' : 'triangular' })
      if (i > 0) dependencies.push({ predecessor_task_id: `t${s}-${i - 1}`, successor_task_id: id, dependency_type: 'finish_to_start' })
      if (s > 0 && i % 10 === 0) dependencies.push({ predecessor_task_id: `t${s - 1}-${i}`, successor_task_id: id, dependency_type: 'finish_to_start' })
    }
  }
  const risks = Array.from({ length: 50 }, (_, r) => ({
    id: `r${r}`, risk_title: `Risk ${r}`, pre_probability_percent: 10 + (r % 5) * 10,
    pre_schedule_days_min: 0, pre_schedule_days_ml: 2, pre_schedule_days_max: 6,
  }))
  const links = risks.map((r, i) => ({ risk_id: r.id, task_id: tasks[(i * 37) % tasks.length].id }))
  return { tasks, ranges, dependencies, risks, links }
}

describe('QRA performance (v1355 plan risk mitigation)', () => {
  it.skipIf(!ON)('runs 5,000 iterations over 500 tasks in a reasonable time', async () => {
    const model = buildAnalysisModel({ seed: 7, iterations: 5000, projectStart: '2026-10-12', basis: 'pre', includeCost: false, ...bigSchedule() })
    expect(model.tasks).toHaveLength(500)
    const started = Date.now()
    const { summary } = await runAnalysis(model)
    const seconds = (Date.now() - started) / 1000
    console.log(`QRA performance: 5000 iterations x 500 tasks in ${seconds.toFixed(1)} s (P50 ${summary.schedule.p50}, P80 ${summary.schedule.p80})`)
    expect(summary.iterations ?? 5000).toBe(5000)
    expect(seconds).toBeLessThan(120)
  }, 300_000)
})
