/**
 * Timesheet Approvals — period-level (weekly) workflow (v963 Phase 19, GAP-13).
 *
 * Distinct from `timesheetService.js` (entry-level approve/reject on
 * `timesheet_entries`, untouched by this file). This service rolls a user's
 * `timesheet_entries` for a given week up into a `timesheets` row (v644),
 * then drives the weekly submit -> approve/reject workflow on top via
 * `timesheet_approvals` / `timesheet_approval_settings`.
 */

import { platformDb } from './supabase/supabaseClient'

const MS_PER_DAY = 24 * 60 * 60 * 1000

/** Compute the (inclusive) week_end_date, 6 days after week_start_date. */
export function computeWeekEndDate(weekStartDate) {
  const start = new Date(`${weekStartDate}T00:00:00Z`)
  if (Number.isNaN(start.getTime())) throw new Error('Invalid week start date')
  const end = new Date(start.getTime() + 6 * MS_PER_DAY)
  return end.toISOString().slice(0, 10)
}

/**
 * Aggregation: roll this user's timesheet_entries for [weekStartDate, weekStartDate+6]
 * on this project into a single `timesheets` row (find-or-create by the
 * (project_id, user_id, week_start_date) unique key), then attach the
 * `timesheet_id` FK to every entry in that window so the period and its
 * entries stay linked. Safe to call repeatedly (idempotent upsert + re-sum).
 */
export async function aggregateWeeklyTimesheet(projectId, userId, weekStartDate) {
  if (!projectId || !userId || !weekStartDate) {
    throw new Error('projectId, userId and weekStartDate are required')
  }
  const weekEndDate = computeWeekEndDate(weekStartDate)

  const { data: entries, error: entriesError } = await platformDb
    .from('timesheet_entries')
    .select('id, hours_worked')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .gte('entry_date', weekStartDate)
    .lte('entry_date', weekEndDate)
  if (entriesError) throw entriesError

  const totalHours = (entries || []).reduce((sum, e) => sum + (parseFloat(e.hours_worked) || 0), 0)

  const { data: timesheet, error: upsertError } = await platformDb
    .from('timesheets')
    .upsert(
      {
        project_id: projectId,
        user_id: userId,
        week_start_date: weekStartDate,
        week_end_date: weekEndDate,
        total_hours: totalHours,
      },
      { onConflict: 'project_id,user_id,week_start_date' }
    )
    .select()
    .single()
  if (upsertError) throw upsertError

  const entryIds = (entries || []).map((e) => e.id)
  if (entryIds.length > 0) {
    const { error: linkError } = await platformDb
      .from('timesheet_entries')
      .update({ timesheet_id: timesheet.id })
      .in('id', entryIds)
    if (linkError) throw linkError
  }

  return { ...timesheet, entryCount: entryIds.length }
}

export async function getWeeklyTimesheet(id) {
  const { data, error } = await platformDb.from('timesheets').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function listWeeklyTimesheetEntries(timesheetId) {
  const { data, error } = await platformDb
    .from('timesheet_entries')
    .select('*')
    .eq('timesheet_id', timesheetId)
    .eq('is_deleted', false)
    .order('entry_date', { ascending: true })
  if (error) throw error
  return data || []
}

export async function listMyWeeklyTimesheets(projectId, userId) {
  let q = platformDb
    .from('timesheets')
    .select('*')
    .eq('is_deleted', false)
    .order('week_start_date', { ascending: false })
  if (projectId) q = q.eq('project_id', projectId)
  if (userId) q = q.eq('user_id', userId)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function submitWeeklyTimesheet(id) {
  const { data, error } = await platformDb
    .from('timesheets')
    .update({ approval_status: 'submitted', submitted_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Approver queue: pending/under-review period submissions, optionally project-scoped. */
export async function listPendingWeeklyApprovals({ projectId } = {}) {
  let q = platformDb
    .from('timesheets')
    .select('*')
    .in('approval_status', ['submitted', 'under_review'])
    .eq('is_deleted', false)
    .order('submitted_at', { ascending: true })
  if (projectId) q = q.eq('project_id', projectId)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function listApprovalHistory(timesheetId) {
  const { data, error } = await platformDb
    .from('timesheet_approvals')
    .select('*')
    .eq('timesheet_id', timesheetId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

/**
 * Approve or reject a weekly timesheet submission. Records the decision in
 * `timesheet_approvals` and updates the period's `approval_status`.
 */
export async function decideWeeklyTimesheet(timesheetId, approverId, decision, comment = '') {
  if (!['approved', 'rejected'].includes(decision)) {
    throw new Error('decision must be "approved" or "rejected"')
  }
  const { data: approval, error: approvalError } = await platformDb
    .from('timesheet_approvals')
    .insert({
      timesheet_id: timesheetId,
      approver_user_id: approverId,
      approval_status: decision,
      approval_comment: comment || null,
      decided_at: new Date().toISOString(),
    })
    .select()
    .single()
  if (approvalError) throw approvalError

  const { data: timesheet, error: updateError } = await platformDb
    .from('timesheets')
    .update({ approval_status: decision })
    .eq('id', timesheetId)
    .select()
    .single()
  if (updateError) throw updateError

  return { approval, timesheet }
}

// ── Approval settings (approver role / escalation / auto-approve) ──────────

export async function listApprovalSettings({ accountId, projectId } = {}) {
  let q = platformDb.from('timesheet_approval_settings').select('*').eq('is_deleted', false).order('created_at', { ascending: false })
  if (accountId) q = q.eq('account_id', accountId)
  if (projectId) q = q.eq('project_id', projectId)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function getApprovalSettingById(id) {
  const { data, error } = await platformDb.from('timesheet_approval_settings').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function createApprovalSettings(payload) {
  const { data, error } = await platformDb.from('timesheet_approval_settings').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function updateApprovalSettings(id, payload) {
  const { data, error } = await platformDb
    .from('timesheet_approval_settings')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteApprovalSettings(id) {
  const { error } = await platformDb.from('timesheet_approval_settings').update({ is_deleted: true }).eq('id', id)
  if (error) throw error
}
