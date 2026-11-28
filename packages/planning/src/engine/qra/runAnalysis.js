/**
 * v1355 — one Monte Carlo run over the schedule and, when cost lines are present, the cost
 * model (D5, D6, D8). Each iteration reuses the deterministic schedule engine. A zero range
 * and no occurring risk reproduces that engine's finish. The same seed reproduces the run.
 */

import { addWorkingDays, scheduleProject, workingDaysBetween, buildCalendar } from '../schedule.js'
import { prepareGroupDraws, createRng, sampleRange } from './distributions.js'
import { exposureTotals } from './riskExposure.js'
import {
  percentile, percentileDate, chanceOfMeeting, histogram, sCurve, tornado, criticalityIndex, contingency,
} from './results.js'

function ranged(item) {
  return item.min != null && item.max != null && item.min !== item.max
}

function sampleItem(rng, item, draws) {
  return sampleRange(rng, {
    min: item.min,
    mode: item.mode,
    max: item.max,
    distribution: item.distribution,
    groupId: item.groupId,
    strength: item.strength,
  }, draws)
}

/**
 * One schedule iteration. Returns the finish date, critical task ids, sampled durations
 * and the schedule impact applied for each risk (0 when it does not occur).
 */
export function runScheduleIteration({ model, rng, groupDraws, occurrences }) {
  const cal = model.calendar || buildCalendar()
  const durationByTask = new Map()
  const sampledDuration = {}
  for (const task of model.tasks) {
    const duration = task.isMilestone ? 0 : (ranged(task) ? sampleItem(rng, task, groupDraws) : task.mode ?? task.point)
    const rounded = Math.max(0, Math.round(duration))
    durationByTask.set(task.id, rounded)
    sampledDuration[task.id] = rounded
  }
  const riskImpact = {}
  let looseDays = 0
  for (const risk of model.risks) {
    const occurs = occurrences.get(risk.id)
    if (!occurs) {
      riskImpact[risk.id] = 0
      continue
    }
    const days = Math.round(sampleRange(rng, {
      min: risk.daysMin, mode: risk.daysMode, max: risk.daysMax,
      distribution: risk.distribution, groupId: risk.groupId, strength: risk.strength,
    }, groupDraws))
    riskImpact[risk.id] = days
    if (!risk.taskIds.length) looseDays += days
    else {
      for (const taskId of risk.taskIds) {
        if (!durationByTask.has(taskId)) continue
        durationByTask.set(taskId, Math.max(0, durationByTask.get(taskId) + days))
      }
    }
  }
  const scheduled = scheduleProject({
    projectStart: model.projectStart,
    calendar: cal,
    tasks: model.tasks.map((t) => ({
      id: t.id,
      duration: durationByTask.get(t.id) ?? 0,
      mode: t.scheduleMode === 'manual' ? 'manual' : 'auto',
      start: t.start,
      constraintType: t.constraintType,
      constraintDate: t.constraintDate,
    })),
    dependencies: model.dependencies,
  })
  let finish = scheduled.projectFinish
  if (looseDays) finish = addWorkingDays(finish, looseDays, cal)
  const critical = model.tasks.filter((t) => scheduled.tasks[t.id]?.critical).map((t) => t.id)
  return { finish, critical, sampledDuration, riskImpact, delayDays: workingDaysBetween(model.projectStart, finish, cal) }
}

/** Cost of one iteration. `delayDays` is the simulated finish minus the planned finish, in working days. */
export function runCostIteration({ model, rng, groupDraws, occurrences, delayDays }) {
  let total = 0
  const sampled = {}
  for (const line of model.costLines) {
    let amount = ranged(line) ? sampleItem(rng, line, groupDraws) : (line.mode ?? line.point)
    if (line.isTimeDependent) amount += (line.dailyRate || 0) * delayDays
    sampled[line.id] = amount
    total += amount
  }
  const riskCost = {}
  for (const risk of model.risks) {
    if (!occurrences.get(risk.id)) {
      riskCost[risk.id] = 0
      continue
    }
    const cost = sampleRange(rng, {
      min: risk.costMin, mode: risk.costMode, max: risk.costMax,
      distribution: risk.distribution, groupId: risk.groupId, strength: risk.strength,
    }, groupDraws)
    riskCost[risk.id] = cost
    total += cost
  }
  return { total, sampled, riskCost }
}

function deterministic(model) {
  const cal = model.calendar || buildCalendar()
  if (!model.tasks.length) {
    return { finish: model.projectStart, day: 0 }
  }
  const scheduled = scheduleProject({
    projectStart: model.projectStart,
    calendar: cal,
    tasks: model.tasks.map((t) => ({
      id: t.id,
      duration: t.isMilestone ? 0 : Math.max(0, Math.round(t.point ?? t.mode ?? 0)),
      mode: t.scheduleMode === 'manual' ? 'manual' : 'auto',
      start: t.start,
      constraintType: t.constraintType,
      constraintDate: t.constraintDate,
    })),
    dependencies: model.dependencies,
  })
  return {
    finish: scheduled.projectFinish,
    day: workingDaysBetween(model.projectStart, scheduled.projectFinish, cal),
  }
}

function baseCost(model) {
  if (model.baseBudget != null) return Number(model.baseBudget)
  return model.costLines.reduce((s, line) => s + (line.mode ?? line.point ?? 0), 0)
}

function emptyDriver(id, label, kind) {
  return { id, label, kind, samples: [] }
}

/**
 * Run the model. `shouldCancel` is checked every `yieldEvery` iterations (0 = never yield).
 * Returns `{ cancelled, summary }` — summary is null when cancelled before any iteration.
 */
export async function runAnalysis(model, { onProgress, shouldCancel, yieldEvery = 0 } = {}) {
  const cal = model.calendar || buildCalendar()
  // v1359 (Q5): one calendar for every iteration, so its working-day index is built once.
  if (!model.calendar) model = { ...model, calendar: cal }
  const rng = createRng(model.seed)
  const planned = deterministic(model)
  const iterations = model.iterations
  const finishes = []
  const finishDays = []
  const costs = []
  const hits = {}
  const drivers = []
  const driverById = new Map()
  const track = (id, label, kind) => {
    const row = emptyDriver(id, label, kind)
    drivers.push(row)
    driverById.set(id, row)
    return row
  }
  for (const task of model.tasks) {
    if (ranged(task)) track(`task:${task.id}`, task.name, 'task')
  }
  for (const risk of model.risks) track(`risk:${risk.id}`, risk.name, 'risk')
  for (const line of model.costLines) {
    if (ranged(line) || line.isTimeDependent) track(`cost:${line.id}`, line.name, 'cost')
  }

  let ran = 0
  for (let i = 0; i < iterations; i++) {
    if (shouldCancel?.()) {
      return { cancelled: true, ran, summary: ran ? summarise() : null }
    }
    const groupDraws = prepareGroupDraws(rng, model.groups)
    const occurrences = new Map()
    for (const risk of model.risks) occurrences.set(risk.id, rng.next() < risk.probability)
    const schedule = model.tasks.length
      ? runScheduleIteration({ model, rng, groupDraws, occurrences })
      : { finish: model.projectStart, critical: [], sampledDuration: {}, riskImpact: {}, delayDays: 0 }
    const delayAgainstPlan = schedule.delayDays - planned.day
    const cost = model.costLines.length || model.risks.some((r) => r.costMode != null || r.costMin != null)
      ? runCostIteration({ model, rng, groupDraws, occurrences, delayDays: delayAgainstPlan })
      : null
    finishes.push(schedule.finish)
    finishDays.push(schedule.delayDays)
    if (cost) costs.push(cost.total)
    for (const id of schedule.critical) hits[id] = (hits[id] || 0) + 1
    for (const task of model.tasks) {
      const row = driverById.get(`task:${task.id}`)
      if (row) row.samples.push(schedule.sampledDuration[task.id] ?? 0)
    }
    for (const risk of model.risks) {
      const row = driverById.get(`risk:${risk.id}`)
      if (row) row.samples.push(schedule.riskImpact[risk.id] || 0)
    }
    if (cost) {
      for (const line of model.costLines) {
        const row = driverById.get(`cost:${line.id}`)
        if (row) row.samples.push(cost.sampled[line.id] ?? 0)
      }
    }
    ran += 1
    if (yieldEvery && ran % yieldEvery === 0) {
      onProgress?.(ran, iterations)
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  }
  onProgress?.(iterations, iterations)
  return { cancelled: false, ran, summary: summarise() }

  function summarise() {
    const sortedDates = [...finishes].sort()
    const sortedDays = [...finishDays].sort((a, b) => a - b)
    const sortedCosts = [...costs].sort((a, b) => a - b)
    const confidence = model.confidence || 80
    const schedule = {
      plannedFinish: planned.finish,
      plannedDay: planned.day,
      p10: percentileDate(sortedDates, 10),
      p50: percentileDate(sortedDates, 50),
      p80: percentileDate(sortedDates, 80),
      p90: percentileDate(sortedDates, 90),
      p10Day: percentile(sortedDays, 10),
      p50Day: percentile(sortedDays, 50),
      p80Day: percentile(sortedDays, 80),
      p90Day: percentile(sortedDays, 90),
      chance: chanceOfMeeting(finishes, model.targetDate, { dates: true }),
      histogram: histogram(finishDays, 12),
      tornado: tornado(drivers.filter((d) => d.kind !== 'cost'), finishDays),
    }
    schedule.sCurve = sCurve(schedule.histogram)
    const cost = sortedCosts.length
      ? {
          p10: percentile(sortedCosts, 10),
          p50: percentile(sortedCosts, 50),
          p80: percentile(sortedCosts, 80),
          p90: percentile(sortedCosts, 90),
          chance: chanceOfMeeting(costs, model.targetCost),
          histogram: histogram(costs, 12),
          tornado: tornado(drivers.filter((d) => d.kind !== 'task'), costs),
        }
      : null
    if (cost) cost.sCurve = sCurve(cost.histogram)
    const pCost = cost ? cost[`p${confidence}`] ?? cost.p80 : null
    const pDay = schedule[`p${confidence}Day`] ?? schedule.p80Day
    const held = model.contingencyHeld || 0
    const base = model.costLines.length || model.baseBudget != null ? baseCost(model) : null
    const cont = contingency({
      pCost,
      baseBudget: base,
      held,
      pDay,
      plannedDay: planned.day,
    })
    const exposure = {
      pre: exposureFromBasis('pre'),
      post: exposureFromBasis('post'),
    }
    return {
      seed: model.seed,
      iterations: ran,
      basis: model.basis,
      kind: model.kind,
      confidence,
      schedule,
      cost,
      contingency: {
        confidence,
        ...cont,
        pFinish: schedule[`p${confidence}`] ?? schedule.p80,
      },
      criticality: criticalityIndex(hits, ran).map((row) => ({
        ...row,
        label: model.tasks.find((t) => t.id === row.taskId)?.name || row.taskId,
      })),
      exposure,
      calendarNote: cal.workingDays ? 'working-day calendar' : null,
    }
  }

  function exposureFromBasis(basis) {
    if (!model.includeRisks) return { costEmv: 0, scheduleEmvDays: 0, estimatedCount: 0, riskCount: 0 }
    // The model is already resolved for one basis. Report that basis's EMV on its key and
    // leave the other key for the caller, which passes both via `exposureRisks` when present.
    if (basis !== model.basis && model.exposureByBasis?.[basis]) return model.exposureByBasis[basis]
    if (basis !== model.basis) return { costEmv: null, scheduleEmvDays: null, estimatedCount: null, riskCount: model.risks.length }
    const totals = exposureTotals(model.exposureRisks || [], { basis, bands: model.bands })
    if (model.exposureRisks) return pickTotals(totals)
    const costEmv = model.risks.reduce((s, r) => s + r.probability * (r.costMode ?? 0), 0)
    const scheduleEmvDays = model.risks.reduce((s, r) => s + r.probability * (r.daysMode ?? 0), 0)
    return { costEmv, scheduleEmvDays, estimatedCount: 0, riskCount: model.risks.length }
  }
}

function pickTotals(totals) {
  return {
    costEmv: totals.costEmv,
    scheduleEmvDays: totals.scheduleEmvDays,
    estimatedCount: totals.estimatedCount,
    riskCount: totals.riskCount,
  }
}

/** Attach pre and post EMV (from the original risk rows) onto a model before the run. */
export function withExposure(model, risks, bands) {
  return {
    ...model,
    exposureRisks: risks,
    exposureByBasis: {
      pre: pickTotals(exposureTotals(risks, { basis: 'pre', bands })),
      post: pickTotals(exposureTotals(risks, { basis: 'post', bands })),
    },
  }
}
