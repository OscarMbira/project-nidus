/**
 * v1265 S2 — progress against the active baseline (PRD stories 14–18, 41; D6).
 * Pure functions, no I/O.
 *
 *   Planned % complete = working days of the task's baseline that have passed by the status
 *     date ÷ baseline working days (0 before the baseline start, 100 on / after its finish).
 *   Actual % complete  = the task's % done.
 *   % Deviation        = Actual − Planned (negative = behind).
 *   Summaries: both weighted by leaf duration, like summary % complete (D4). Leaves without a
 *     baseline are left out of the planned figure; a summary with none shows no planned value.
 *   Slip since original = active baseline finish − original (B0) finish, in working days.
 */
import { workingDaysBetween, buildCalendar } from '../engine/schedule.js'
import { leavesUnder } from './planOutline.js'

const round1 = (n) => Math.round(n * 10) / 10

/** Planned % for one baseline span on a status date (YYYY-MM-DD). Null without a baseline start. */
export function plannedPercent(baselineStart, baselineFinish, statusDate, calendar = buildCalendar()) {
  if (!baselineStart || !statusDate) return null
  const finish = baselineFinish || baselineStart
  if (statusDate < baselineStart) return 0
  if (statusDate >= finish) return 100
  const total = workingDaysBetween(baselineStart, finish, calendar) + 1
  const done = workingDaysBetween(baselineStart, statusDate, calendar) + 1
  return total > 0 ? round1(Math.min(100, Math.max(0, (done / total) * 100))) : 0
}

const durationOf = (t) => (t.is_milestone ? 0 : Math.max(0, Number(t.estimated_duration_days ?? 1) || 0))

/**
 * { planned, actual, deviation } by task id for every task (leaves and summaries).
 * `tasks` are DB rows (leaf values; summaries are worked out here). Planned/deviation are null
 * when there is no baseline.
 */
export function progressByTask(tasks, { statusDate, calendar = buildCalendar() } = {}) {
  const leaves = leavesUnder(tasks)
  const byId = new Map(tasks.map((t) => [t.id, t]))
  const leafPlanned = new Map()
  for (const t of tasks) {
    const own = leaves.get(t.id)
    if (own?.length === 1 && own[0] === t.id) leafPlanned.set(t.id, plannedPercent(t.baseline_start_date, t.baseline_end_date, statusDate, calendar))
  }
  const out = new Map()
  for (const t of tasks) {
    const ids = leaves.get(t.id) || [t.id]
    const rows = ids.map((id) => byId.get(id)).filter(Boolean)
    let pw = 0; let pd = 0; let pn = 0; let pc = 0
    let aw = 0; let ad = 0; let as = 0
    for (const l of rows) {
      const d = durationOf(l)
      const a = Number(l.percentage_complete || 0)
      aw += d * a; ad += d; as += a
      const p = leafPlanned.get(l.id)
      if (p !== null && p !== undefined) { pw += d * p; pd += d; pn += p; pc += 1 }
    }
    const actual = rows.length ? round1(ad > 0 ? aw / ad : as / rows.length) : 0
    const planned = pc ? round1(pd > 0 ? pw / pd : pn / pc) : null
    out.set(t.id, { planned, actual, deviation: planned === null ? null : round1(actual - planned) })
  }
  return out
}

/** A task's dates in a baseline snapshot (by id, then task code). Null when not in it. */
export function baselineEntry(baseline, task) {
  const list = baseline?.baseline_data?.tasks || []
  const e = list.find((x) => x.id === task.id) || (task.task_code ? list.find((x) => x.task_code === task.task_code) : null)
  return e ? { start: e.start || null, finish: e.finish || null, duration: e.duration ?? null } : null
}

/** Working days the active baseline finish has moved since the original (B0). Null if either is missing. */
export function slipSinceOriginal(task, original, calendar = buildCalendar()) {
  const b0 = baselineEntry(original, task)
  if (!b0?.finish || !task.baseline_end_date) return null
  return workingDaysBetween(b0.finish, task.baseline_end_date, calendar)
}

/** "−5", "0", "+3" for deviation; "—" without a baseline. */
export function formatDeviation(v) {
  if (v === null || v === undefined) return '—'
  const n = Math.round(v)
  return n > 0 ? `+${n}` : String(n)
}

/** Tone for a deviation: behind (red), ahead (green), on plan. */
export const deviationTone = (v) => (v === null || v === undefined || Math.round(v) === 0 ? 'neutral' : v < 0 ? 'behind' : 'ahead')
