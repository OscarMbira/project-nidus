/**
 * v1343 (PRD A2) — timesheet flags, reminder candidates and who may do what on Team Timesheets.
 * Tables: timesheet_entry_flags, timesheet_entry_flag_reasons, timesheet_reminders (SQL v1473).
 * Both apps' timesheet pages read the public timesheet tables, so this lives in @nidus/shared.
 * Sending a reminder (notification + email) is app-bound: see the apps' timesheetService.
 *
 * Ids: timesheet_entries.user_id is the AUTH user id; users.id is the internal id used by
 * flags (raised_by), reminders (sent_by, recipient_user_ids) and user_projects.
 */
import { platformDb } from '@nidus/supabase'

export const DECIDER_ROLES = ['project_manager', 'team_lead', 'team_manager']
export const COORDINATOR_ROLES = [...DECIDER_ROLES, 'project_administrator']

/**
 * Members to remind for a period: no entry at all ("missing") or at least one draft entry.
 * @param {Array<{id: string, auth_user_id: string|null, full_name?: string, email?: string}>} members
 * @param {Array<{user_id: string, entry_date: string, status: string}>} entries  the project's entries
 * @param {{ periodStart: string, periodEnd: string }} period  ISO dates (inclusive)
 * @returns {Array<{userId: string, authUserId: string|null, name: string, email: string|null, state: 'missing'|'draft', draftCount: number}>}
 */
export function computeReminderRecipients(members = [], entries = [], { periodStart, periodEnd } = {}) {
  const inPeriod = (entries || []).filter((e) => {
    const d = String(e.entry_date || '').slice(0, 10)
    return d && (!periodStart || d >= periodStart) && (!periodEnd || d <= periodEnd)
  })
  const byAuth = new Map()
  for (const e of inPeriod) {
    if (!byAuth.has(e.user_id)) byAuth.set(e.user_id, [])
    byAuth.get(e.user_id).push(e)
  }
  const seen = new Set()
  const out = []
  for (const m of members || []) {
    if (!m?.id || seen.has(m.id)) continue
    seen.add(m.id)
    const mine = m.auth_user_id ? byAuth.get(m.auth_user_id) || [] : []
    const drafts = mine.filter((e) => e.status === 'draft').length
    if (mine.length === 0 || drafts > 0) {
      out.push({
        userId: m.id,
        authUserId: m.auth_user_id || null,
        name: m.full_name || m.email || 'Team member',
        email: m.email || null,
        state: mine.length === 0 ? 'missing' : 'draft',
        draftCount: drafts,
      })
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
}

/** Default reminder period: last week, Monday to Sunday. */
export function lastWeekPeriod(today = new Date()) {
  const d = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))
  const dow = (d.getUTCDay() + 6) % 7 // Monday = 0
  const thisMonday = new Date(d)
  thisMonday.setUTCDate(d.getUTCDate() - dow)
  const start = new Date(thisMonday)
  start.setUTCDate(thisMonday.getUTCDate() - 7)
  const end = new Date(thisMonday)
  end.setUTCDate(thisMonday.getUTCDate() - 1)
  return { periodStart: start.toISOString().slice(0, 10), periodEnd: end.toISOString().slice(0, 10) }
}

/** Current user's internal id and what they may do on this project's timesheets. */
export async function getTimesheetCapabilities(projectId) {
  const none = { userId: null, canDecide: false, canFlag: false, canRemind: false }
  if (!projectId) return none
  const { data: sessionData } = await platformDb.auth.getSession()
  const authId = sessionData?.session?.user?.id
  if (!authId) return none
  const { data: me } = await platformDb.from('users').select('id').eq('auth_user_id', authId).maybeSingle()
  if (!me?.id) return none
  const [decider, coordinator] = await Promise.all([
    platformDb.rpc('project_user_has_project_role', { p_user_id: me.id, p_project_id: projectId, p_roles: DECIDER_ROLES }),
    platformDb.rpc('project_user_has_project_role', { p_user_id: me.id, p_project_id: projectId, p_roles: COORDINATOR_ROLES }),
  ])
  const canDecide = decider.data === true
  const canCoordinate = coordinator.data === true
  return { userId: me.id, canDecide, canFlag: canCoordinate, canRemind: canCoordinate }
}

/** Project members (user_projects) with their auth ids, for reminders. */
export async function loadReminderCandidates(projectId, { periodStart, periodEnd }) {
  if (!projectId) return []
  const { data: links, error } = await platformDb
    .from('user_projects')
    .select('user_id')
    .eq('project_id', projectId)
    .eq('is_deleted', false)
  if (error) throw error
  const ids = [...new Set((links || []).map((l) => l.user_id).filter(Boolean))]
  if (ids.length === 0) return []
  const [usersRes, entriesRes] = await Promise.all([
    platformDb.from('users').select('id, auth_user_id, full_name, email').in('id', ids),
    platformDb
      .from('timesheet_entries')
      .select('user_id, entry_date, status')
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .gte('entry_date', periodStart)
      .lte('entry_date', periodEnd),
  ])
  if (usersRes.error) throw usersRes.error
  if (entriesRes.error) throw entriesRes.error
  return computeReminderRecipients(usersRes.data || [], entriesRes.data || [], { periodStart, periodEnd })
}

export async function logTimesheetReminder({ projectId, periodStart, periodEnd, sentBy, recipientIds, note = null }) {
  const { data, error } = await platformDb
    .from('timesheet_reminders')
    .insert({
      project_id: projectId,
      period_start: periodStart,
      period_end: periodEnd,
      sent_by: sentBy,
      recipient_user_ids: recipientIds,
      recipient_count: recipientIds.length,
      note,
    })
    .select('id, created_at')
    .single()
  if (error) throw error
  return data
}

/** Open flags for the given entries, keyed by entry id. */
export async function listOpenFlagsForEntries(entryIds = []) {
  const ids = [...new Set((entryIds || []).filter(Boolean))]
  if (ids.length === 0) return new Map()
  const { data, error } = await platformDb
    .from('timesheet_entry_flags')
    .select('id, entry_id, reason_ids, note, status, raised_by, raised_at')
    .in('entry_id', ids)
    .eq('status', 'open')
  if (error) throw error
  const map = new Map()
  for (const f of data || []) {
    if (!map.has(f.entry_id)) map.set(f.entry_id, [])
    map.get(f.entry_id).push(f)
  }
  return map
}

export async function raiseTimesheetFlag({ entryId, reasonIds, note, raisedBy }) {
  if (!entryId) throw new Error('Entry is required')
  if (!Array.isArray(reasonIds) || reasonIds.length === 0) throw new Error('Pick at least one reason')
  const { data, error } = await platformDb
    .from('timesheet_entry_flags')
    .insert({ entry_id: entryId, reason_ids: reasonIds, note: (note || '').trim() || null, raised_by: raisedBy })
    .select('id, entry_id, reason_ids, note, status, raised_by, raised_at')
    .single()
  if (error) throw error
  return data
}

export async function withdrawTimesheetFlag(flagId) {
  const { data, error } = await platformDb
    .from('timesheet_entry_flags')
    .update({ status: 'withdrawn' })
    .eq('id', flagId)
    .select('id, status')
    .single()
  if (error) throw error
  return data
}

/** Flags raised by a user (My Approvals › Timesheet flags), newest first, optionally one project. */
export async function listFlagsRaisedBy(userId, { projectId = null } = {}) {
  if (!userId) return []
  let q = platformDb
    .from('timesheet_entry_flags')
    .select('id, entry_id, project_id, reason_ids, note, status, raised_at, resolved_at, resolution')
    .eq('raised_by', userId)
    .order('raised_at', { ascending: false })
  if (projectId) q = q.eq('project_id', projectId)
  const { data, error } = await q
  if (error) throw error
  return data || []
}
