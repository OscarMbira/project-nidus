/**
 * v1355 — turn register / schedule rows into the model the simulation runs.
 * Pure: no database. Planner passes includeRisks: false and no cost lines (D11).
 */

import { numberOrNull } from './distributions.js'
import { midpointFromScore, normaliseBands } from './riskExposure.js'

const DEP_TYPE = {
  finish_to_start: 'FS', start_to_start: 'SS', finish_to_finish: 'FF', start_to_finish: 'SF',
  fs: 'FS', ss: 'SS', ff: 'FF', sf: 'SF', FS: 'FS', SS: 'SS', FF: 'FF', SF: 'SF',
}

export function dependencyType(value) {
  return DEP_TYPE[value] || DEP_TYPE[String(value || '').toLowerCase()] || 'FS'
}

function strengthOf(groupId, groups) {
  return groups.find((g) => g.id === groupId)?.strength || null
}

function riskProbability(risk, basis, bands) {
  const prefix = basis === 'post' ? 'post' : 'pre'
  const explicit = numberOrNull(risk[`${prefix}_probability_percent`] ?? (prefix === 'pre' ? risk.probability_percent : null))
  if (explicit != null) return explicit / 100
  const score = Number(risk[`${prefix}_probability`] ?? risk.probability) || 3
  return midpointFromScore(score, bands) / 100
}

function riskRange(risk, basis, kind) {
  const prefix = basis === 'post' ? 'post' : 'pre'
  const min = numberOrNull(risk[`${prefix}_${kind}_min`])
  const mode = numberOrNull(risk[`${prefix}_${kind}_ml`])
  const max = numberOrNull(risk[`${prefix}_${kind}_max`])
  if (mode == null && min == null && max == null) {
    const point = numberOrNull(kind === 'cost' ? risk[`${prefix}_cost_impact`] : risk[`${prefix}_schedule_impact_days`])
    return { min: null, mode: point, max: null }
  }
  return { min, mode, max }
}

/**
 * @param {object} input rows as stored, plus projectStart, calendar, basis, seed, iterations,
 *   targetDate, targetCost, confidence (50|80|90), baseBudget, contingencyHeld, includeRisks, includeCost
 */
export function buildAnalysisModel(input) {
  const bands = normaliseBands(input.bands)
  const groups = (input.groups || []).map((g) => ({
    id: g.id,
    name: g.name || g.group_name || 'Group',
    strength: g.strength || 'medium',
  }))
  const basis = input.basis === 'post' ? 'post' : 'pre'
  const includeRisks = input.includeRisks !== false
  const linksByRisk = new Map()
  for (const link of input.links || []) {
    const riskId = link.riskId || link.risk_id
    const taskId = link.taskId || link.task_id
    if (!riskId || !taskId) continue
    if (!linksByRisk.has(riskId)) linksByRisk.set(riskId, [])
    linksByRisk.get(riskId).push(taskId)
  }
  const rangeByTask = new Map((input.ranges || []).map((r) => [r.task_id || r.taskId, r]))
  const tasks = (input.tasks || []).filter((t) => !t.is_summary).map((t) => {
    const range = rangeByTask.get(t.id) || {}
    const point = t.is_milestone ? 0 : Number(t.estimated_duration_days ?? t.duration ?? 0) || 0
    const groupId = range.qra_group_id || range.groupId || null
    return {
      id: t.id,
      name: t.task_name || t.name || t.task_code || 'Task',
      point,
      min: numberOrNull(range.min_days ?? range.min),
      mode: numberOrNull(range.ml_days ?? range.ml) ?? point,
      max: numberOrNull(range.max_days ?? range.max),
      distribution: range.distribution || input.defaultDistribution || 'triangular',
      groupId,
      strength: strengthOf(groupId, groups),
      scheduleMode: t.schedule_mode || t.mode || 'auto',
      start: t.planned_start_date || t.start || null,
      constraintType: t.constraint_type || t.constraintType || 'asap',
      constraintDate: t.constraint_date || t.constraintDate || null,
      isMilestone: Boolean(t.is_milestone),
    }
  })
  const risks = includeRisks
    ? (input.risks || []).filter((r) => !r.is_deleted && r.status !== 'closed').map((r) => {
        const groupId = r.qra_group_id || r.groupId || null
        const days = riskRange(r, basis, 'schedule_days')
        const cost = riskRange(r, basis, 'cost')
        return {
          id: r.id,
          name: r.risk_title || r.name || 'Risk',
          probability: riskProbability(r, basis, bands),
          distribution: r.impact_distribution || input.defaultDistribution || 'triangular',
          groupId,
          strength: strengthOf(groupId, groups),
          daysMin: days.min,
          daysMode: days.mode,
          daysMax: days.max,
          costMin: cost.min,
          costMode: cost.mode,
          costMax: cost.max,
          taskIds: linksByRisk.get(r.id) || [],
        }
      })
    : []
  const costLines = input.includeCost === false
    ? []
    : (input.costLines || []).map((line) => {
        const groupId = line.qra_group_id || line.groupId || null
        const point = numberOrNull(line.amount ?? line.ml_amount ?? line.budget_amount) ?? 0
        return {
          id: line.id,
          name: line.line_label || line.name || 'Cost line',
          point,
          min: numberOrNull(line.min_amount ?? line.min),
          mode: numberOrNull(line.ml_amount ?? line.ml) ?? point,
          max: numberOrNull(line.max_amount ?? line.max),
          distribution: line.distribution || input.defaultDistribution || 'triangular',
          groupId,
          strength: strengthOf(groupId, groups),
          isTimeDependent: Boolean(line.is_time_dependent ?? line.isTimeDependent),
          dailyRate: numberOrNull(line.daily_rate ?? line.dailyRate) ?? 0,
        }
      })
  return {
    seed: Number(input.seed) || 1,
    iterations: clampIterations(input.iterations),
    basis,
    kind: input.kind || (costLines.length && tasks.length ? 'both' : costLines.length ? 'cost' : 'schedule'),
    projectStart: String(input.projectStart || '2026-01-05').slice(0, 10),
    calendar: input.calendar || null,
    targetDate: input.targetDate ? String(input.targetDate).slice(0, 10) : null,
    targetCost: numberOrNull(input.targetCost),
    confidence: [50, 80, 90].includes(Number(input.confidence)) ? Number(input.confidence) : 80,
    baseBudget: numberOrNull(input.baseBudget),
    contingencyHeld: numberOrNull(input.contingencyHeld) ?? 0,
    includeRisks,
    tasks,
    dependencies: (input.dependencies || []).map((d) => ({
      pred: d.pred || d.predecessor_task_id,
      succ: d.succ || d.successor_task_id,
      type: dependencyType(d.type || d.dependency_type),
      lag: Number(d.lag ?? d.lag_days) || 0,
    })),
    risks,
    groups,
    costLines,
    bands,
  }
}

export function clampIterations(value) {
  const n = Number(value) || 5000
  return Math.min(20000, Math.max(1000, Math.round(n)))
}
