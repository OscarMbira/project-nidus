import { platformDb } from './supabase/supabaseClient'
import { createNotification } from '@nidus/shared/utils/notificationUtils'
import { sendEmail } from './emailIntegrationService'

const SELECT = '*'

const REASON_TABLE_BY_DECISION = {
  approved: 'timesheet_entry_approve_reasons',
  rejected: 'timesheet_entry_reject_reasons',
}

/**
 * Derive hours worked from a start/end time pair (v1175). If end is earlier than (or equal to)
 * start, the shift is assumed to span past midnight (e.g. 22:00 -> 06:00 = 8h) rather than
 * treated as a data error — entry_date already anchors the day the shift started.
 * @param {string|null|undefined} startTime - 'HH:MM' or 'HH:MM:SS'
 * @param {string|null|undefined} endTime
 * @returns {number|null} hours rounded to the nearest quarter hour, or null if either is missing/invalid
 */
export function computeHoursFromTimeRange(startTime, endTime) {
  if (!startTime || !endTime) return null
  const toMinutes = (t) => {
    const [h, m] = String(t).split(':').map(Number)
    if (Number.isNaN(h) || Number.isNaN(m)) return null
    return h * 60 + m
  }
  const startMin = toMinutes(startTime)
  const endMin = toMinutes(endTime)
  if (startMin === null || endMin === null) return null
  let diff = endMin - startMin
  if (diff <= 0) diff += 24 * 60
  return Math.round((diff / 60) * 4) / 4
}

export async function getMyTimesheets(projectId, userId, filters = {}) {
  let q = platformDb
    .from('timesheet_entries')
    .select(SELECT)
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .order('entry_date', { ascending: false })

  if (filters.status) q = q.eq('status', filters.status)
  if (filters.from) q = q.gte('entry_date', filters.from)
  if (filters.to) q = q.lte('entry_date', filters.to)

  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function getTeamTimesheets(projectId, filters = {}) {
  let q = platformDb
    .from('timesheet_entries')
    .select(SELECT)
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .order('entry_date', { ascending: false })

  if (filters.status) q = q.eq('status', filters.status)
  if (filters.userId) q = q.eq('user_id', filters.userId)
  if (filters.from) q = q.gte('entry_date', filters.from)
  if (filters.to) q = q.lte('entry_date', filters.to)

  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function getTimesheetEntry(id) {
  const { data, error } = await platformDb
    .from('timesheet_entries')
    .select(SELECT)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createTimesheetEntry(payload) {
  const { data, error } = await platformDb
    .from('timesheet_entries')
    .insert(payload)
    .select(SELECT)
    .single()
  if (error) throw error
  return data
}

export async function updateTimesheetEntry(id, payload) {
  const { data, error } = await platformDb
    .from('timesheet_entries')
    .update(payload)
    .eq('id', id)
    .select(SELECT)
    .single()
  if (error) throw error
  return data
}

export async function submitTimesheetEntry(id) {
  return updateTimesheetEntry(id, { status: 'submitted' })
}

/**
 * Bulk-submit every draft entry for a project/user/week in one action (v1170 weekly grid's
 * "Submit Week" button) — same per-entry 'submitted' status as submitTimesheetEntry(), just
 * applied to every draft row in range at once instead of one row at a time.
 * @param {string} projectId
 * @param {string} userId - auth user id
 * @param {string} weekStart - ISO date (inclusive)
 * @param {string} weekEnd - ISO date (inclusive)
 * @returns {Promise<Array>} the updated rows
 */
export async function submitTimesheetEntriesForWeek(projectId, userId, weekStart, weekEnd) {
  const { data, error } = await platformDb
    .from('timesheet_entries')
    .update({ status: 'submitted' })
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .eq('status', 'draft')
    .eq('is_deleted', false)
    .gte('entry_date', weekStart)
    .lte('entry_date', weekEnd)
    .select(SELECT)
  if (error) throw error
  return data || []
}

/**
 * Record an approve/reject decision on a timesheet entry (v1169). Writes an append-only row
 * to timesheet_entry_reviews (so a resubmission's prior decision is never lost), updates the
 * entry's own status/reviewed_by/review_notes for current-state reads, then notifies the
 * submitter in-app and by email. At least one reason is required — mirrors CLAUDE.md rule 53's
 * mandatory-justification pattern; also enforced at the DB level by a CHECK constraint.
 * @param {string} id - timesheet_entries.id
 * @param {string} reviewerId - auth user id of the reviewer
 * @param {'approved'|'rejected'} decision
 * @param {string[]} reasonIds - at least one id from the matching reason catalog
 * @param {string} [notes]
 */
async function decideTimesheetEntry(id, reviewerId, decision, reasonIds, notes = '') {
  if (!Array.isArray(reasonIds) || reasonIds.length === 0) {
    throw new Error('At least one reason is required')
  }

  const { error: reviewError } = await platformDb.from('timesheet_entry_reviews').insert({
    entry_id: id,
    decision,
    reviewer_id: reviewerId,
    reason_ids: reasonIds,
    notes: notes || null,
  })
  if (reviewError) throw reviewError

  const updated = await updateTimesheetEntry(id, {
    status: decision,
    reviewed_by: reviewerId,
    review_notes: notes || null,
  })

  await notifySubmitterOfDecision(updated, decision, reasonIds, notes)

  return updated
}

export async function approveTimesheetEntry(id, reviewerId, reasonIds = [], notes = '') {
  return decideTimesheetEntry(id, reviewerId, 'approved', reasonIds, notes)
}

export async function rejectTimesheetEntry(id, reviewerId, reasonIds = [], notes = '') {
  return decideTimesheetEntry(id, reviewerId, 'rejected', reasonIds, notes)
}

/** Reverse-chronological decision history for one entry (v1169) — raw rows; resolve
 * reason_ids/reviewer_id against the reason catalogs / users table in the caller. */
export async function listTimesheetEntryReviewHistory(entryId) {
  const { data, error } = await platformDb
    .from('timesheet_entry_reviews')
    .select('*')
    .eq('entry_id', entryId)
    .order('decided_at', { ascending: false })
  if (error) throw error
  return data || []
}

/** Reverse-chronological edit history for one entry (v1177) — a BEFORE UPDATE trigger snapshots
 * the row's prior values whenever a tracked field actually changes; this just reads that log. */
export async function listTimesheetEntryEditHistory(entryId) {
  const { data, error } = await platformDb
    .from('timesheet_entry_edit_history')
    .select('*')
    .eq('entry_id', entryId)
    .order('edited_at', { ascending: false })
  if (error) throw error
  return data || []
}

/** Best-effort — a notification/email failure must never block the approve/reject itself. */
async function notifySubmitterOfDecision(entry, decision, reasonIds, notes) {
  try {
    const { data: submitter } = await platformDb
      .from('users')
      .select('id, email, full_name')
      .eq('auth_user_id', entry.user_id)
      .maybeSingle()
    if (!submitter) return

    const reasonTable = REASON_TABLE_BY_DECISION[decision]
    const { data: reasons } = await platformDb.from(reasonTable).select('name').in('id', reasonIds)
    const reasonText = (reasons || []).map((r) => r.name).join(', ')

    const title = decision === 'approved' ? 'Timesheet entry approved' : 'Timesheet entry rejected'
    const reasonLine = reasonText ? `Reasons: ${reasonText}.` : ''
    const notesLine = notes ? ` Notes: ${notes}` : ''
    const message = `Your ${formatEntryDateForMessage(entry.entry_date)} time entry (${entry.hours_worked}h) was ${decision}. ${reasonLine}${notesLine}`.trim()

    await createNotification({
      userId: submitter.id,
      type: decision === 'approved' ? 'success' : 'warning',
      title,
      message,
      entityType: 'timesheet_entries',
      entityId: entry.id,
      projectId: entry.project_id,
      deliveryMethod: 'both',
    })

    if (submitter.email) {
      await sendEmail(submitter.email, title, `<p>Hi ${submitter.full_name || ''},</p><p>${message}</p>`)
    }
  } catch (e) {
    console.error('notifySubmitterOfDecision:', e)
  }
}

function formatEntryDateForMessage(v) {
  if (!v) return 'recent'
  return new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export async function deleteTimesheetEntry(id) {
  const { error } = await platformDb
    .from('timesheet_entries')
    .update({ is_deleted: true })
    .eq('id', id)
  if (error) throw error
}

// ── Exceptions & Utilisation (taxonomy §3 Resources > Timesheets) ─────────────────────────────
// timesheet_entries has no built-in "exception"/overtime flag — these are computed from entries
// already being fetched by the calling page (no extra round trip needed).

// v1173: these are now the fallback defaults only — computeTimesheetExceptions()/
// computeUtilisation() take an optional resolved settings object (see
// timesheetSettingsService.resolveTimesheetSettings) and use these constants only when the
// caller hasn't resolved org/project settings yet.
const DAILY_OVERTIME_HOURS = 8
const WEEKLY_OVERTIME_HOURS = 40
const STANDARD_WEEKLY_HOURS = 40

function toDateOnly(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

// Local calendar date, NOT toISOString() — that converts to UTC first, which silently shifts
// the date by one day in any positive-UTC-offset timezone (e.g. Central Africa Time).
function isoDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isWeekday(d) {
  const day = d.getDay()
  return day !== 0 && day !== 6
}

function mondayOf(d) {
  const copy = new Date(d)
  copy.setDate(copy.getDate() - ((copy.getDay() + 6) % 7))
  return toDateOnly(copy)
}

/**
 * Pure function: derive Overtime / Missing / Rejected exceptions from a set of already-fetched
 * timesheet_entries rows for ONE user, over a trailing window of calendar days.
 * @param {Array} entries - rows with entry_date, hours_worked, status (is_deleted already excluded)
 * @param {{ windowDays?: number, today?: Date, settings?: { standard_daily_hours?: number, max_overtime_per_week?: number } }} [options]
 *   settings - resolved org/project settings (v1173); falls back to the 8h/40h constants when omitted
 * @returns {{ overtime: Array<{type:'day'|'week', date:string, hours:number}>, missing: Array<{date:string}>, rejected: Array }}
 */
export function computeTimesheetExceptions(entries = [], options = {}) {
  const windowDays = options.windowDays ?? 14
  const today = toDateOnly(options.today || new Date())
  const windowStart = new Date(today)
  windowStart.setDate(windowStart.getDate() - windowDays)
  const dailyThreshold = options.settings?.standard_daily_hours ?? DAILY_OVERTIME_HOURS
  const weeklyThreshold = options.settings?.max_overtime_per_week != null
    ? (options.settings?.standard_daily_hours ?? DAILY_OVERTIME_HOURS) * 5 + options.settings.max_overtime_per_week
    : WEEKLY_OVERTIME_HOURS

  const byDate = new Map()
  for (const e of entries) {
    if (!e.entry_date) continue
    const key = e.entry_date.slice(0, 10)
    byDate.set(key, (byDate.get(key) || 0) + (parseFloat(e.hours_worked) || 0))
  }

  // Overtime — any single day over the daily threshold, within the window.
  const overtimeDays = []
  for (const [date, hours] of byDate) {
    const d = toDateOnly(new Date(date))
    if (d < windowStart || d > today) continue
    if (hours > dailyThreshold) overtimeDays.push({ type: 'day', date, hours })
  }

  // Overtime — any week (Mon-start) whose total exceeds the weekly threshold, within the window.
  const byWeek = new Map()
  for (const [date, hours] of byDate) {
    const d = toDateOnly(new Date(date))
    if (d < windowStart || d > today) continue
    const weekKey = isoDate(mondayOf(d))
    byWeek.set(weekKey, (byWeek.get(weekKey) || 0) + hours)
  }
  const overtimeWeeks = [...byWeek.entries()]
    .filter(([, hours]) => hours > weeklyThreshold)
    .map(([date, hours]) => ({ type: 'week', date, hours }))

  // Missing — expected working days (Mon-Fri) in the window with no entry at all.
  const missing = []
  for (let d = new Date(windowStart); d <= today; d.setDate(d.getDate() + 1)) {
    if (!isWeekday(d)) continue
    const key = isoDate(toDateOnly(d))
    if (!byDate.has(key)) missing.push({ date: key })
  }

  const rejected = entries.filter((e) => e.status === 'rejected')

  return { overtime: [...overtimeDays, ...overtimeWeeks], missing, rejected }
}

/**
 * Utilisation % for one user over a period: hours logged ÷ standard hours for that period.
 * Assumes full-time (100%) allocation — a per-person allocation_percentage (team_members) isn't
 * joined here since team membership isn't guaranteed to map 1:1 onto project membership; this is
 * a deliberately simple baseline, not a claim of precise capacity accounting.
 * @param {Array} entries - rows with entry_date, hours_worked for one user
 * @param {{ periodStart: string, periodEnd: string }} period - inclusive ISO dates
 * @returns {{ hoursLogged: number, standardHours: number, utilisationPct: number }}
 */
export function computeUtilisation(entries = [], period) {
  const start = toDateOnly(new Date(period.periodStart))
  const end = toDateOnly(new Date(period.periodEnd))
  const hoursLogged = entries.reduce((sum, e) => {
    if (!e.entry_date) return sum
    const d = toDateOnly(new Date(e.entry_date))
    if (d < start || d > end) return sum
    return sum + (parseFloat(e.hours_worked) || 0)
  }, 0)

  let weekdayCount = 0
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (isWeekday(d)) weekdayCount += 1
  }
  const standardHours = (weekdayCount / 5) * STANDARD_WEEKLY_HOURS

  return {
    hoursLogged,
    standardHours,
    utilisationPct: standardHours > 0 ? Math.round((hoursLogged / standardHours) * 100) : 0,
  }
}
