/**
 * v1239 Slice 4.2 — Workload: estimated hours assigned to each person per week, against their
 * capacity.
 *
 * Assigned hours: a task's estimated_hours are spread evenly over the working days between its
 * planned start and finish (project calendar).
 * Capacity per working day, in order of preference:
 *   1. that person's resource calendar entry for the day (available_hours, or 0 when unavailable);
 *   2. their resource record (default hours/day × default capacity %);
 *   3. the project calendar's hours per day (8 if none).
 * The Simulator has no resource tables, so it always uses 3.
 */
import { platformDb } from '@nidus/supabase'
import { isWorkingDay } from '../engine/schedule.js'

const DAY_MS = 86400000
const toMs = (d) => {
  const [y, m, day] = String(d).slice(0, 10).split('-').map(Number)
  return Date.UTC(y, m - 1, day)
}
const iso = (ms) => new Date(ms).toISOString().slice(0, 10)

/** Monday of the week containing `date`. */
export function weekStart(date) {
  const ms = toMs(date)
  const dow = new Date(ms).getUTCDay()
  return iso(ms - ((dow + 6) % 7) * DAY_MS)
}

export function weekStarts(from, count) {
  const first = toMs(weekStart(from))
  return Array.from({ length: count }, (_, i) => iso(first + i * 7 * DAY_MS))
}

function workingDaysIn(from, to, calendar) {
  const out = []
  for (let ms = toMs(from); ms <= toMs(to); ms += DAY_MS) {
    const d = iso(ms)
    if (isWorkingDay(d, calendar)) out.push(d)
  }
  return out
}

/**
 * @param {{ tasks, calendar, weeks: string[], defaultHoursPerDay?: number,
 *           capacity?: Record<userId, { hoursPerDay?: number, days?: Record<date, number> }> }} input
 * @returns {Array<{ userId, weeks: Record<weekStart, { assigned: number, capacity: number }>, totalAssigned, unscheduledHours }>}
 */
export function computeWorkload({ tasks, calendar, weeks, defaultHoursPerDay = 8, capacity = {} }) {
  if (!weeks.length) return []
  const rangeStart = weeks[0]
  const rangeEnd = iso(toMs(weeks[weeks.length - 1]) + 6 * DAY_MS)
  const people = new Map()
  const person = (userId) => {
    if (!people.has(userId)) {
      people.set(userId, { userId, weeks: Object.fromEntries(weeks.map((w) => [w, { assigned: 0, capacity: 0 }])), totalAssigned: 0, unscheduledHours: 0 })
    }
    return people.get(userId)
  }

  for (const t of tasks) {
    const hours = Number(t.estimated_hours) || 0
    if (!t.assigned_to_user_id || hours <= 0 || Number(t.percentage_complete || 0) >= 100) continue
    const p = person(t.assigned_to_user_id)
    if (!t.planned_start_date) { p.unscheduledHours += hours; continue }
    const days = workingDaysIn(t.planned_start_date, t.planned_end_date || t.planned_start_date, calendar)
    if (!days.length) { p.unscheduledHours += hours; continue }
    const perDay = hours / days.length
    for (const d of days) {
      if (d < rangeStart || d > rangeEnd) continue
      p.weeks[weekStart(d)].assigned += perDay
      p.totalAssigned += perDay
    }
  }

  const rangeDays = workingDaysIn(rangeStart, rangeEnd, calendar)
  for (const p of people.values()) {
    const cap = capacity[p.userId] || {}
    for (const d of rangeDays) {
      const h = cap.days && d in cap.days ? cap.days[d] : (cap.hoursPerDay ?? defaultHoursPerDay)
      p.weeks[weekStart(d)].capacity += h
    }
    for (const w of weeks) {
      p.weeks[w].assigned = Math.round(p.weeks[w].assigned * 10) / 10
      p.weeks[w].capacity = Math.round(p.weeks[w].capacity * 10) / 10
    }
    p.totalAssigned = Math.round(p.totalAssigned * 10) / 10
  }
  return [...people.values()]
}

/** Names for the people on the plan (public users, read-only, both modes). */
export async function loadPeople(userIds) {
  if (!userIds.length) return {}
  const { data, error } = await platformDb.from('users').select('id, full_name, email').in('id', userIds)
  if (error) throw new Error(error.message || 'Could not load people.')
  return Object.fromEntries((data || []).map((u) => [u.id, u.full_name || u.email || 'Unnamed']))
}

/** Capacity from resources + resource_calendar (Platform / Planner only). */
export async function loadCapacity(userIds, from, to) {
  if (!userIds.length) return {}
  const { data: resources, error } = await platformDb
    .from('resources')
    .select('id, user_id, default_capacity_hours_per_day, default_capacity_percentage')
    .in('user_id', userIds)
    .eq('is_deleted', false)
  if (error) throw new Error(error.message || 'Could not load resource capacity.')
  const out = {}
  const byResource = new Map()
  for (const r of resources || []) {
    const hoursPerDay = (Number(r.default_capacity_hours_per_day ?? 8)) * (Number(r.default_capacity_percentage ?? 100) / 100)
    out[r.user_id] = { hoursPerDay, days: {} }
    byResource.set(r.id, r.user_id)
  }
  if (!byResource.size) return out
  const { data: entries, error: calError } = await platformDb
    .from('resource_calendar')
    .select('resource_id, calendar_date, availability_type, available_hours, capacity_percentage')
    .in('resource_id', [...byResource.keys()])
    .gte('calendar_date', from)
    .lte('calendar_date', to)
    .eq('is_deleted', false)
  if (calError) throw new Error(calError.message || 'Could not load resource calendars.')
  for (const e of entries || []) {
    const userId = byResource.get(e.resource_id)
    const base = out[userId].hoursPerDay
    out[userId].days[e.calendar_date] = e.availability_type === 'unavailable'
      ? 0
      : e.available_hours != null ? Number(e.available_hours) : base * (Number(e.capacity_percentage ?? 100) / 100)
  }
  return out
}
