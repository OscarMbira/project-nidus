/**
 * v1239 — Working-calendar-aware scheduling engine (client preview; decision D7).
 *
 * The database RPC public.recalculate_project_schedule / sim.recalculate_project_schedule
 * (SQL/v1245) implements the same rules and is the authority on save. Keep the two in step;
 * SQL/v1245_schedule_engine_test_vectors.sql checks the database against this file's cases.
 *
 * Conventions
 *   - Dates are 'YYYY-MM-DD' strings (no time zone drift).
 *   - Durations and lag are working days. A task of duration d ≥ 1 finishes d-1 working days
 *     after it starts (start and finish inclusive); duration 0 is a milestone (finish = start).
 *   - FS: successor starts the working day after the predecessor finishes, + lag.
 *     SS: successor starts when the predecessor starts, + lag.
 *     FF: successor finishes when the predecessor finishes, + lag.
 *     SF: successor finishes the working day before the predecessor starts, + lag.
 *   - Constraints (auto tasks): snet = start no earlier than; mso = must start on;
 *     fnlt = finish no later than (caps the late finish). Manual tasks keep their start.
 */

const DAY_MS = 86400000

function toUtc(dateStr) {
  const [y, m, d] = String(dateStr).slice(0, 10).split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}
function fromUtc(ms) {
  return new Date(ms).toISOString().slice(0, 10)
}

export class ScheduleCycleError extends Error {
  constructor(taskIds) {
    super(`Circular dependency between tasks: ${taskIds.join(', ')}`)
    this.name = 'ScheduleCycleError'
    this.taskIds = taskIds
  }
}

/**
 * workingDays: weekday numbers (0 = Sunday … 6 = Saturday); exceptions: non-working dates;
 * extraWorkingDays: dates that are working days although their weekday is not (calendar
 * exceptions with is_working_day = true).
 */
export function buildCalendar({ workingDays = [1, 2, 3, 4, 5], exceptions = [], extraWorkingDays = [] } = {}) {
  const days = new Set(workingDays.map(Number))
  if (days.size === 0) throw new Error('A calendar needs at least one working weekday')
  return {
    workingDays: days,
    exceptions: new Set(exceptions.map((d) => String(d).slice(0, 10))),
    extra: new Set(extraWorkingDays.map((d) => String(d).slice(0, 10))),
  }
}

/*
 * v1359 (Q5): answers are remembered per calendar object. The Monte Carlo simulation (v1355) schedules the same
 * project thousands of times and asks the same "date + n working days" questions millions of times; the day-by-day
 * walk with Date objects made 5,000 iterations of a 500-task schedule take over 7 minutes. Results are identical —
 * only repeated work is skipped. A calendar is treated as unchanging once built (buildCalendar); the cache is
 * dropped if it grows past CACHE_LIMIT entries.
 */
const CACHE_LIMIT = 500000
const calendarCaches = new WeakMap()
function cacheOf(calendar) {
  let c = calendarCaches.get(calendar)
  if (!c || c.size > CACHE_LIMIT) {
    c = { working: new Map(), byDay: new Map(), index: null, rules: null, size: 0 }
    calendarCaches.set(calendar, c)
  }
  return c
}

/** Working day by day number (UTC ms / DAY_MS): the date text is built once per day, not once per question. */
function isWorkingMs(ms, calendar) {
  if (!calendar || typeof calendar !== 'object') return computeIsWorkingDay(fromUtc(ms), calendar)
  const cache = cacheOf(calendar)
  const day = Math.round(ms / DAY_MS)
  let hit = cache.byDay.get(day)
  if (hit === undefined) {
    hit = computeIsWorkingDay(fromUtc(ms), calendar)
    cache.byDay.set(day, hit)
    cache.size++
  }
  return hit
}

function computeIsWorkingDay(iso, calendar) {
  const weekday = new Date(toUtc(iso)).getUTCDay()
  if (calendar.extra?.has(iso)) return true
  return calendar.workingDays.has(weekday) && !calendar.exceptions.has(iso)
}

export function isWorkingDay(dateStr, calendar) {
  const iso = String(dateStr).slice(0, 10)
  if (!calendar || typeof calendar !== 'object') return computeIsWorkingDay(iso, calendar)
  const cache = cacheOf(calendar)
  let hit = cache.working.get(iso)
  if (hit === undefined) {
    hit = computeIsWorkingDay(iso, calendar)
    cache.working.set(iso, hit)
    cache.size++
  }
  return hit
}

function step(ms, dir) {
  return ms + dir * DAY_MS
}

// ── Working-day index (v1359 Q5) ──────────────────────────────────────────
// Per calendar: the working days of a window of day numbers (UTC days since 1970), in order, and a running count.
// "date + n working days" and "working days between" become two lookups instead of a walk over every day.
// The window grows when a date falls outside it; the old day-by-day functions remain the fallback (and the
// source of the "no working day" errors).
const DAY_CACHE = new Map()
function dayOf(dateStr) {
  const iso = String(dateStr).slice(0, 10)
  let d = DAY_CACHE.get(iso)
  if (d === undefined) {
    d = Math.round(toUtc(iso) / DAY_MS)
    if (DAY_CACHE.size > 200000) DAY_CACHE.clear()
    DAY_CACHE.set(iso, d)
  }
  return d
}
const ISO_CACHE = new Map()
function isoOf(day) {
  let iso = ISO_CACHE.get(day)
  if (iso === undefined) {
    iso = fromUtc(day * DAY_MS)
    if (ISO_CACHE.size > 200000) ISO_CACHE.clear()
    ISO_CACHE.set(day, iso)
  }
  return iso
}

const SPAN = 7300 // about 20 years either side of the first date asked about

/** Exceptions and extra working days as day numbers (once per calendar), so the index needs no date text. */
function dayRules(calendar) {
  const cache = cacheOf(calendar)
  if (!cache.rules) {
    const toDays = (set) => new Set([...(set || [])].map((iso) => Math.round(toUtc(iso) / DAY_MS)))
    cache.rules = { exceptions: toDays(calendar.exceptions), extra: toDays(calendar.extra) }
  }
  return cache.rules
}
/** Same answer as computeIsWorkingDay, from the day number: 1970-01-01 (day 0) was a Thursday (weekday 4). */
function isWorkingDayNumber(day, calendar, rules) {
  if (rules.extra.has(day)) return true
  const weekday = (((day % 7) + 7) % 7 + 4) % 7
  return calendar.workingDays.has(weekday) && !rules.exceptions.has(day)
}

function indexFor(calendar, lo, hi) {
  const cache = cacheOf(calendar)
  let idx = cache.index
  if (idx && lo >= idx.base && hi <= idx.end) return idx
  const base = Math.min(lo, idx ? idx.base : lo) - (idx ? SPAN : SPAN)
  const end = Math.max(hi, idx ? idx.end : hi) + SPAN
  const prefix = new Int32Array(end - base + 1)
  const list = []
  let count = 0
  const rules = dayRules(calendar)
  for (let d = base; d <= end; d++) {
    if (isWorkingDayNumber(d, calendar, rules)) { list.push(d); count++ }
    prefix[d - base] = count
  }
  idx = { base, end, prefix, list }
  cache.index = idx
  return idx
}
/** Working days with day number ≤ d. */
function countTo(idx, d) {
  return d < idx.base ? 0 : idx.prefix[Math.min(d, idx.end) - idx.base]
}

/**
 * Move n working days from dateStr (n may be negative). A non-working start date first rolls to
 * the next (n ≥ 0) or previous (n < 0) working day, which counts as day 0.
 */
export function addWorkingDays(dateStr, n, calendar) {
  if (!calendar || typeof calendar !== 'object' || !Number.isInteger(n)) return computeAddWorkingDays(dateStr, n, calendar)
  const d = dayOf(dateStr)
  if (!Number.isFinite(d)) return computeAddWorkingDays(dateStr, n, calendar)
  const reach = Math.abs(n) * 2 + 3660
  const idx = indexFor(calendar, d - reach, d + reach)
  const start = n < 0 ? countTo(idx, d) - 1 : countTo(idx, d - 1)
  const target = idx.list[start + n]
  if (target === undefined || start < 0 || start >= idx.list.length) return computeAddWorkingDays(dateStr, n, calendar)
  return isoOf(target)
}

function computeAddWorkingDays(dateStr, n, calendar) {
  const dir = n < 0 ? -1 : 1
  let ms = toUtc(dateStr)
  let guard = 0
  while (!isWorkingMs(ms, calendar)) {
    ms = step(ms, dir)
    if (++guard > 3660) throw new Error('No working day found within 10 years — check the calendar')
  }
  let remaining = Math.abs(n)
  while (remaining > 0) {
    ms = step(ms, dir)
    if (isWorkingMs(ms, calendar)) remaining--
    if (++guard > 366000) throw new Error('Working-day calculation did not finish — check the calendar')
  }
  return fromUtc(ms)
}

/** Working days from a to b, excluding a (negative when b is before a). */
export function workingDaysBetween(a, b, calendar) {
  if (!calendar || typeof calendar !== 'object') return computeWorkingDaysBetween(a, b, calendar)
  const from = dayOf(a)
  const to = dayOf(b)
  if (!Number.isFinite(from) || !Number.isFinite(to)) return computeWorkingDaysBetween(a, b, calendar)
  if (from === to) return 0
  const idx = indexFor(calendar, Math.min(from, to) - 1, Math.max(from, to))
  // (a, b] going forward; [b, a) going back, as negative.
  return to > from ? countTo(idx, to) - countTo(idx, from) : -(countTo(idx, from - 1) - countTo(idx, to - 1))
}

function computeWorkingDaysBetween(a, b, calendar) {
  const from = toUtc(a)
  const to = toUtc(b)
  if (from === to) return 0
  const dir = to > from ? 1 : -1
  let count = 0
  for (let ms = step(from, dir); dir > 0 ? ms <= to : ms >= to; ms = step(ms, dir)) {
    if (isWorkingMs(ms, calendar)) count++
  }
  return dir * count
}

const finishFrom = (start, duration, cal) => (duration > 0 ? addWorkingDays(start, duration - 1, cal) : addWorkingDays(start, 0, cal))
const startFrom = (finish, duration, cal) => (duration > 0 ? addWorkingDays(finish, -(duration - 1), cal) : addWorkingDays(finish, 0, cal))
const maxDate = (a, b) => (a >= b ? a : b)
const minDate = (a, b) => (a <= b ? a : b)

function topologicalOrder(ids, deps) {
  const indegree = new Map(ids.map((id) => [id, 0]))
  const next = new Map(ids.map((id) => [id, []]))
  for (const d of deps) {
    next.get(d.pred).push(d.succ)
    indegree.set(d.succ, indegree.get(d.succ) + 1)
  }
  const queue = ids.filter((id) => indegree.get(id) === 0)
  const order = []
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i]
    order.push(id)
    for (const s of next.get(id)) {
      indegree.set(s, indegree.get(s) - 1)
      if (indegree.get(s) === 0) queue.push(s)
    }
  }
  if (order.length !== ids.length) {
    throw new ScheduleCycleError(ids.filter((id) => indegree.get(id) > 0))
  }
  return order
}

/**
 * @param {{ projectStart: string, calendar: object,
 *   tasks: Array<{ id: string, duration: number, mode?: 'auto'|'manual', start?: string,
 *                  constraintType?: 'asap'|'snet'|'fnlt'|'mso', constraintDate?: string }>,
 *   dependencies: Array<{ pred: string, succ: string, type?: 'FS'|'SS'|'FF'|'SF', lag?: number }> }} input
 * @returns {{ tasks: Record<string, { es, ef, ls, lf, slack, critical }>, projectFinish: string }}
 */
export function scheduleProject({ projectStart, calendar, tasks, dependencies = [] }) {
  const cal = calendar || buildCalendar()
  const byId = new Map(tasks.map((t) => [t.id, { ...t, duration: Math.max(0, Math.round(Number(t.duration) || 0)) }]))
  const ids = [...byId.keys()]
  const deps = dependencies
    .filter((d) => byId.has(d.pred) && byId.has(d.succ) && d.pred !== d.succ)
    .map((d) => ({ ...d, type: (d.type || 'FS').toUpperCase(), lag: Math.round(Number(d.lag) || 0) }))
  const order = topologicalOrder(ids, deps)
  const preds = new Map(ids.map((id) => [id, []]))
  const succs = new Map(ids.map((id) => [id, []]))
  for (const d of deps) {
    preds.get(d.succ).push(d)
    succs.get(d.pred).push(d)
  }

  // Forward pass
  const es = new Map()
  const ef = new Map()
  const start0 = addWorkingDays(projectStart, 0, cal)
  for (const id of order) {
    const t = byId.get(id)
    let start
    if (t.mode === 'manual' && t.start) {
      start = addWorkingDays(t.start, 0, cal)
    } else if (t.constraintType === 'mso' && t.constraintDate) {
      start = addWorkingDays(t.constraintDate, 0, cal)
    } else {
      start = start0
      if (t.constraintType === 'snet' && t.constraintDate) start = maxDate(start, addWorkingDays(t.constraintDate, 0, cal))
      for (const d of preds.get(id)) {
        let candidate
        if (d.type === 'SS') candidate = addWorkingDays(es.get(d.pred), d.lag, cal)
        else if (d.type === 'FF') candidate = startFrom(addWorkingDays(ef.get(d.pred), d.lag, cal), t.duration, cal)
        else if (d.type === 'SF') candidate = startFrom(addWorkingDays(es.get(d.pred), d.lag - 1, cal), t.duration, cal)
        else candidate = addWorkingDays(ef.get(d.pred), d.lag + 1, cal)
        start = maxDate(start, candidate)
      }
    }
    es.set(id, start)
    ef.set(id, finishFrom(start, t.duration, cal))
  }
  const projectFinish = ids.length ? [...ef.values()].reduce(maxDate) : start0

  // Backward pass
  const ls = new Map()
  const lf = new Map()
  for (const id of [...order].reverse()) {
    const t = byId.get(id)
    let finish = projectFinish
    if (t.constraintType === 'fnlt' && t.constraintDate) finish = minDate(finish, addWorkingDays(t.constraintDate, 0, cal))
    for (const d of succs.get(id)) {
      const s = byId.get(d.succ)
      let candidate
      if (d.type === 'SS') candidate = finishFrom(addWorkingDays(ls.get(d.succ), -d.lag, cal), t.duration, cal)
      else if (d.type === 'FF') candidate = addWorkingDays(lf.get(d.succ), -d.lag, cal)
      else if (d.type === 'SF') candidate = finishFrom(addWorkingDays(lf.get(d.succ), -(d.lag - 1), cal), t.duration, cal)
      else candidate = addWorkingDays(ls.get(d.succ), -(d.lag + 1), cal)
      void s
      finish = minDate(finish, candidate)
    }
    lf.set(id, finish)
    ls.set(id, startFrom(finish, t.duration, cal))
  }

  const out = {}
  for (const id of ids) {
    const slack = workingDaysBetween(es.get(id), ls.get(id), cal)
    out[id] = { es: es.get(id), ef: ef.get(id), ls: ls.get(id), lf: lf.get(id), slack, critical: slack <= 0 }
  }
  return { tasks: out, projectFinish }
}
