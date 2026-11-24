/**
 * v1354 — Resource levelling (pure). Delays tasks so a person's assigned hours on a day
 * stay within the same capacity the workload view uses. Never splits a task or changes
 * who it is assigned to. Dates are YYYY-MM-DD. Duration d ≥ 1 finishes d−1 working days
 * after the start.
 */
import { addWorkingDays, buildCalendar, isWorkingDay, workingDaysBetween } from './schedule.js'

const PRIORITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 }
const DAY_MS = 86400000

function toUtc(dateStr) {
  const [y, m, d] = String(dateStr).slice(0, 10).split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}
function fromUtc(ms) {
  return new Date(ms).toISOString().slice(0, 10)
}

function workingDates(from, to, calendar) {
  const out = []
  for (let ms = toUtc(from); ms <= toUtc(to); ms += DAY_MS) {
    const d = fromUtc(ms)
    if (isWorkingDay(d, calendar)) out.push(d)
  }
  return out
}

const finishOf = (start, duration, calendar) => (
  duration > 0 ? addWorkingDays(start, duration - 1, calendar) : addWorkingDays(start, 0, calendar)
)
const startFromFinish = (finish, duration, calendar) => (
  duration > 0 ? addWorkingDays(finish, -(duration - 1), calendar) : addWorkingDays(finish, 0, calendar)
)

function depType(type) {
  const t = String(type || 'FS').toUpperCase()
  if (t === 'FINISH_TO_START' || t === 'FS') return 'FS'
  if (t === 'START_TO_START' || t === 'SS') return 'SS'
  if (t === 'FINISH_TO_FINISH' || t === 'FF') return 'FF'
  if (t === 'START_TO_FINISH' || t === 'SF') return 'SF'
  return 'FS'
}

/**
 * @param {{ tasks: Array, dependencies?: Array, calendar?: object, capacity?: object,
 *   externalLoad?: Array<{userId, date, hours}>, mode?: 'within_float'|'beyond_float',
 *   crossProject?: boolean, defaultHoursPerDay?: number }} input
 */
export function levelSchedule(input) {
  const calendar = input.calendar || buildCalendar()
  const mode = input.mode === 'within_float' ? 'within_float' : 'beyond_float'
  const crossProject = !!input.crossProject
  const defaultHours = Number(input.defaultHoursPerDay ?? 8) || 8
  const tasks = (input.tasks || []).map((t) => ({
    id: String(t.id),
    projectId: t.projectId || t.project_id || null,
    name: t.name || t.task_name || '',
    start: t.start || t.planned_start_date ? String(t.start || t.planned_start_date).slice(0, 10) : '',
    finish: t.finish || t.planned_end_date ? String(t.finish || t.planned_end_date).slice(0, 10) : '',
    duration: Math.max(0, Math.round(Number(t.duration ?? t.estimated_duration_days) || 0)),
    hours: Number(t.hours ?? t.estimated_hours) || 0,
    assignee: t.assignee || t.assigned_to_user_id || null,
    priority: String(t.priority || 'medium').toLowerCase(),
    critical: !!(t.critical ?? t.is_critical_path),
    slack: Math.max(0, Math.round(Number(t.slack ?? t.slack_days) || 0)),
    pinned: !!(t.pinned ?? t.is_level_pinned) || t.schedule_mode === 'manual' || t.mode === 'manual',
    percent: Number(t.percent ?? t.percentage_complete) || 0,
    milestone: !!(t.milestone ?? t.is_milestone),
    summary: !!(t.summary ?? t.is_summary),
    constraintType: t.constraintType || t.constraint_type || 'asap',
    constraintDate: t.constraintDate || t.constraint_date ? String(t.constraintDate || t.constraint_date).slice(0, 10) : '',
    projectPriority: Number.isFinite(Number(t.projectPriority)) ? Number(t.projectPriority) : 999,
    unlevelled: false,
    forcedByDependency: false,
  }))
  const byId = new Map(tasks.map((t) => [t.id, t]))
  const deps = (input.dependencies || [])
    .map((d) => ({
      pred: d.pred || d.predecessor_task_id,
      succ: d.succ || d.successor_task_id,
      type: depType(d.type || d.dependency_type),
      lag: Math.round(Number(d.lag ?? d.lag_days) || 0),
    }))
    .filter((d) => byId.has(d.pred) && byId.has(d.succ) && d.pred !== d.succ)
  const preds = new Map(tasks.map((t) => [t.id, []]))
  for (const d of deps) preds.get(d.succ).push(d)

  const load = new Map()
  const addLoad = (user, date, hours) => {
    if (!user || !hours) return
    if (!load.has(user)) load.set(user, new Map())
    const m = load.get(user)
    m.set(date, (m.get(date) || 0) + hours)
  }
  const used = (user, date) => load.get(user)?.get(date) || 0
  const capOf = (user, date) => {
    if (!isWorkingDay(date, calendar)) return 0
    const c = (input.capacity || {})[user] || {}
    if (c.days && date in c.days) return Number(c.days[date]) || 0
    return c.hoursPerDay != null ? Number(c.hoursPerDay) : defaultHours
  }
  for (const e of input.externalLoad || []) addLoad(e.userId, String(e.date).slice(0, 10), Number(e.hours) || 0)

  const placed = new Map()
  const occupy = (t, start) => {
    const finish = t.finish && t.pinned ? (t.finish || finishOf(start, t.duration, calendar)) : finishOf(start, t.duration, calendar)
    const days = workingDates(start, finish, calendar)
    if (t.assignee && t.hours > 0 && days.length) {
      const per = t.hours / days.length
      for (const d of days) addLoad(t.assignee, d, per)
    }
    placed.set(t.id, { start, finish })
  }
  const fits = (t, start) => {
    const finish = finishOf(start, t.duration, calendar)
    if (t.constraintType === 'fnlt' && t.constraintDate && finish > t.constraintDate) return false
    if (!t.assignee || !(t.hours > 0)) return true
    const days = workingDates(start, finish, calendar)
    if (!days.length) return false
    const per = t.hours / days.length
    return days.every((d) => used(t.assignee, d) + per <= capOf(t.assignee, d) + 1e-6)
  }

  const immovable = (t) => t.pinned || t.percent >= 100 || t.summary || !t.start
  for (const t of tasks) {
    if (immovable(t) && t.start) occupy(t, addWorkingDays(t.start, 0, calendar))
  }

  const earliest = (t) => {
    let start = t.start ? addWorkingDays(t.start, 0, calendar) : addWorkingDays(input.projectStart || '2026-01-05', 0, calendar)
    let forced = false
    for (const d of preds.get(t.id) || []) {
      const p = placed.get(d.pred)
      if (!p) continue
      let candidate
      if (d.type === 'SS') candidate = addWorkingDays(p.start, d.lag, calendar)
      else if (d.type === 'FF') candidate = startFromFinish(addWorkingDays(p.finish, d.lag, calendar), t.duration, calendar)
      else if (d.type === 'SF') candidate = startFromFinish(addWorkingDays(p.start, d.lag - 1, calendar), t.duration, calendar)
      else candidate = addWorkingDays(p.finish, d.lag + 1, calendar)
      if (candidate > start) { start = candidate; forced = true }
    }
    if (t.constraintType === 'snet' && t.constraintDate && t.constraintDate > start) start = addWorkingDays(t.constraintDate, 0, calendar)
    if (t.constraintType === 'mso' && t.constraintDate) start = addWorkingDays(t.constraintDate, 0, calendar)
    return { start, forced }
  }
  const latest = (t, from) => {
    if (t.constraintType === 'mso' && t.constraintDate) return addWorkingDays(t.constraintDate, 0, calendar)
    if (mode === 'within_float') return addWorkingDays(t.start || from, t.slack, calendar)
    return addWorkingDays(from, 260, calendar)
  }

  const ready = (id) => (preds.get(id) || []).every((d) => placed.has(d.pred))
  const before = (a, b) => {
    const ka = byId.get(a)
    const kb = byId.get(b)
    const keys = (t) => [
      crossProject ? t.projectPriority : 0,
      t.critical ? 0 : 1,
      PRIORITY_RANK[t.priority] ?? 2,
      t.slack,
      t.start || '9999-99-99',
      t.id,
    ]
    const xa = keys(ka)
    const xb = keys(kb)
    for (let i = 0; i < xa.length; i++) {
      if (xa[i] < xb[i]) return -1
      if (xa[i] > xb[i]) return 1
    }
    return 0
  }

  let remaining = tasks.filter((t) => !placed.has(t.id)).map((t) => t.id)
  let guard = 0
  while (remaining.length && guard++ < tasks.length + 5) {
    const candidates = remaining.filter(ready).sort(before)
    if (!candidates.length) break
    const t = byId.get(candidates[0])
    const { start: from, forced } = earliest(t)
    const to = latest(t, from)
    let chosen = null
    if (from <= to) {
      let d = from
      let steps = 0
      while (d <= to && steps++ < 400) {
        if (fits(t, d)) { chosen = d; break }
        const next = addWorkingDays(d, 1, calendar)
        if (next <= d) break
        d = next
      }
    }
    if (!chosen) {
      t.unlevelled = true
      t.forcedByDependency = forced && from > (t.start || from)
      occupy(t, from <= (t.start || from) ? (t.start ? addWorkingDays(t.start, 0, calendar) : from) : from)
    } else {
      t.forcedByDependency = forced && chosen > (t.start || chosen) && fits(t, t.start || chosen) === false
      occupy(t, chosen)
    }
    remaining = remaining.filter((id) => id !== t.id)
  }
  for (const id of remaining) {
    const t = byId.get(id)
    if (t.start) occupy(t, addWorkingDays(t.start, 0, calendar))
  }

  const moves = []
  for (const t of tasks) {
    const p = placed.get(t.id)
    if (!p || !t.start || p.start === t.start) continue
    const delay = workingDaysBetween(t.start, p.start, calendar)
    if (delay <= 0) continue
    let reason = 'Delayed so the assigned person stays within their daily hours'
    if (t.unlevelled) reason = 'Left as late as the links allow: no date in range keeps the hours within capacity'
    else if (t.forcedByDependency && fits(t, t.start)) reason = 'Moved to follow a predecessor'
    else if (crossProject && t.projectPriority > 1) reason = 'Delayed so a higher-priority project keeps its dates'
    moves.push({
      taskId: t.id,
      projectId: t.projectId,
      taskName: t.name,
      oldStart: t.start,
      oldEnd: t.finish || p.finish,
      newStart: p.start,
      newEnd: p.finish,
      delayDays: delay,
      reason,
      accepted: true,
    })
  }

  const oldFinish = tasks.map((t) => t.finish).filter(Boolean).sort().at(-1) || ''
  const newFinish = [...placed.values()].map((p) => p.finish).filter(Boolean).sort().at(-1) || ''
  return {
    moves,
    placements: Object.fromEntries([...placed].map(([id, p]) => [id, p])),
    projectFinishBefore: oldFinish,
    projectFinishAfter: newFinish,
    finishDelayDays: oldFinish && newFinish ? workingDaysBetween(oldFinish, newFinish, calendar) : 0,
    unlevelled: tasks.filter((t) => t.unlevelled).map((t) => t.id),
  }
}

/** Fixed daily hours from tasks outside the set being levelled (D6). */
export function dailyLoad(tasks, calendar) {
  const out = []
  for (const t of tasks || []) {
    const hours = Number(t.estimated_hours ?? t.hours) || 0
    const userId = t.assigned_to_user_id || t.assignee
    const start = t.planned_start_date || t.start
    const finish = t.planned_end_date || t.finish || start
    if (!userId || hours <= 0 || Number(t.percentage_complete || t.percent || 0) >= 100 || !start) continue
    const days = workingDates(String(start).slice(0, 10), String(finish).slice(0, 10), calendar || buildCalendar())
    if (!days.length) continue
    const per = hours / days.length
    for (const date of days) out.push({ userId, date, hours: per })
  }
  return out
}

/** Task rows with the levelled dates, for the shared workload calculation. */
export function tasksAfterMoves(tasks, moves) {
  const byId = new Map((moves || []).map((m) => [m.taskId, m]))
  return (tasks || []).map((t) => {
    const m = byId.get(t.id)
    if (!m) return t
    return { ...t, planned_start_date: m.newStart, planned_end_date: m.newEnd, start: m.newStart, finish: m.newEnd }
  })
}
