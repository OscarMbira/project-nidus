import { simDb } from '../supabase/supabaseClient'

export async function getMyTimesheets(projectId, userId, filters = {}) {
  let q = simDb
    .from('timesheet_entries')
    .select('*')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .order('entry_date', { ascending: false })

  if (filters.status) q = q.eq('status', filters.status)
  if (filters.from_date) q = q.gte('entry_date', filters.from_date)
  if (filters.to_date) q = q.lte('entry_date', filters.to_date)

  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function getTeamTimesheets(projectId, filters = {}) {
  let q = simDb
    .from('timesheet_entries')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .order('entry_date', { ascending: false })

  if (filters.status) q = q.eq('status', filters.status)
  if (filters.user_id) q = q.eq('user_id', filters.user_id)

  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function getTimesheetEntry(id) {
  const { data, error } = await simDb
    .from('timesheet_entries')
    .select('*')
    .eq('id', id)
    .eq('is_deleted', false)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function createTimesheetEntry(payload) {
  const { data, error } = await simDb
    .from('timesheet_entries')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateTimesheetEntry(id, payload) {
  const { data, error } = await simDb
    .from('timesheet_entries')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function submitTimesheetEntry(id) {
  return updateTimesheetEntry(id, { status: 'submitted' })
}

export async function approveTimesheetEntry(id, reviewerId, notes = '') {
  return updateTimesheetEntry(id, {
    status: 'approved',
    reviewed_by: reviewerId,
    review_notes: notes,
  })
}

export async function rejectTimesheetEntry(id, reviewerId, notes = '') {
  return updateTimesheetEntry(id, {
    status: 'rejected',
    reviewed_by: reviewerId,
    review_notes: notes,
  })
}

export async function deleteTimesheetEntry(id) {
  const { error } = await simDb
    .from('timesheet_entries')
    .update({ is_deleted: true })
    .eq('id', id)
  if (error) throw error
}
