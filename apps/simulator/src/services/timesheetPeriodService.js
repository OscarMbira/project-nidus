/**
 * Timesheet Approvals — period-level (weekly) workflow, Simulator mirror
 * (v963 Phase 19, GAP-13). Mirrors apps/platform/src/services/timesheetPeriodService.js
 * against the `sim` schema (v963u_sim_timesheet_report_integration_tables.sql).
 * Distinct from apps/simulator's entry-level TeamTimesheetsPage flow.
 */

import { simDb } from './supabaseClient'

const MS_PER_DAY = 24 * 60 * 60 * 1000

export function computeWeekEndDate(weekStartDate) {
  const start = new Date(`${weekStartDate}T00:00:00Z`)
  if (Number.isNaN(start.getTime())) throw new Error('Invalid week start date')
  const end = new Date(start.getTime() + 6 * MS_PER_DAY)
  return end.toISOString().slice(0, 10)
}

export async function aggregateWeeklyTimesheet(projectId, userId, weekStartDate) {
  if (!projectId || !userId || !weekStartDate) {
    throw new Error('projectId, userId and weekStartDate are required')
  }
  const weekEndDate = computeWeekEndDate(weekStartDate)

  const { data: entries, error: entriesError } = await simDb
    .from('timesheet_entries')
    .select('id, hours_worked')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .gte('entry_date', weekStartDate)
    .lte('entry_date', weekEndDate)
  if (entriesError) throw entriesError

  const totalHours = (entries || []).reduce((sum, e) => sum + (parseFloat(e.hours_worked) || 0), 0)

  const { data: timesheet, error: upsertError } = await simDb
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
    const { error: linkError } = await simDb
      .from('timesheet_entries')
      .update({ timesheet_id: timesheet.id })
      .in('id', entryIds)
    if (linkError) throw linkError
  }

  return { ...timesheet, entryCount: entryIds.length }
}

export async function getWeeklyTimesheet(id) {
  const { data, error } = await simDb.from('timesheets').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function listWeeklyTimesheetEntries(timesheetId) {
  const { data, error } = await simDb
    .from('timesheet_entries')
    .select('*')
    .eq('timesheet_id', timesheetId)
    .eq('is_deleted', false)
    .order('entry_date', { ascending: true })
  if (error) throw error
  return data || []
}

export async function listMyWeeklyTimesheets(projectId, userId) {
  let q = simDb.from('timesheets').select('*').eq('is_deleted', false).order('week_start_date', { ascending: false })
  if (projectId) q = q.eq('project_id', projectId)
  if (userId) q = q.eq('user_id', userId)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function submitWeeklyTimesheet(id) {
  const { data, error } = await simDb
    .from('timesheets')
    .update({ approval_status: 'submitted', submitted_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function listPendingWeeklyApprovals({ projectId } = {}) {
  let q = simDb
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
  const { data, error } = await simDb
    .from('timesheet_approvals')
    .select('*')
    .eq('timesheet_id', timesheetId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function decideWeeklyTimesheet(timesheetId, approverId, decision, comment = '') {
  if (!['approved', 'rejected'].includes(decision)) {
    throw new Error('decision must be "approved" or "rejected"')
  }
  const { data: approval, error: approvalError } = await simDb
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

  const { data: timesheet, error: updateError } = await simDb
    .from('timesheets')
    .update({ approval_status: decision })
    .eq('id', timesheetId)
    .select()
    .single()
  if (updateError) throw updateError

  return { approval, timesheet }
}

export async function listApprovalSettings({ accountId, projectId } = {}) {
  let q = simDb.from('timesheet_approval_settings').select('*').eq('is_deleted', false).order('created_at', { ascending: false })
  if (accountId) q = q.eq('account_id', accountId)
  if (projectId) q = q.eq('project_id', projectId)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function getApprovalSettingById(id) {
  const { data, error } = await simDb.from('timesheet_approval_settings').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function createApprovalSettings(payload) {
  const { data, error } = await simDb.from('timesheet_approval_settings').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function updateApprovalSettings(id, payload) {
  const { data, error } = await simDb
    .from('timesheet_approval_settings')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteApprovalSettings(id) {
  const { error } = await simDb.from('timesheet_approval_settings').update({ is_deleted: true }).eq('id', id)
  if (error) throw error
}
