/**
 * Scheduled Health Reports — Simulator mirror (v963 Phase 20, GAP-23).
 * See apps/platform/src/services/scheduledHealthReportService.js.
 */

import { simDb } from './supabaseClient'

export async function listSchedules({ projectId } = {}) {
  let q = simDb
    .from('scheduled_health_reports')
    .select('*')
    .eq('is_deleted', false)
    .order('schedule_name', { ascending: true })
  if (projectId) q = q.eq('project_id', projectId)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function getSchedule(id) {
  const { data, error } = await simDb.from('scheduled_health_reports').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function createSchedule(payload) {
  const {
    data: { user },
  } = await simDb.auth.getUser()
  const row = { ...payload, created_by: user?.id || null }
  const { data, error } = await simDb.from('scheduled_health_reports').insert(row).select().single()
  if (error) throw error
  return data
}

export async function updateSchedule(id, payload) {
  const { data, error } = await simDb
    .from('scheduled_health_reports')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteSchedule(id) {
  const { error } = await simDb.from('scheduled_health_reports').update({ is_deleted: true }).eq('id', id)
  if (error) throw error
}

export async function listRuns(scheduleId) {
  const { data, error } = await simDb
    .from('scheduled_report_runs')
    .select('*')
    .eq('schedule_id', scheduleId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function runScheduleNow(scheduleId) {
  const schedule = await getSchedule(scheduleId)
  const { data, error } = await simDb
    .from('scheduled_report_runs')
    .insert({
      schedule_id: scheduleId,
      run_status: 'completed',
      report_data: { triggered: 'manual', schedule_name: schedule?.schedule_name || null },
      sent_at: new Date().toISOString(),
    })
    .select()
    .single()
  if (error) throw error
  return data
}
