import { platformDb } from './supabase/supabaseClient'

const SELECT = '*'

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
  const { error } = await platformDb
    .from('timesheet_entries')
    .update({ is_deleted: true })
    .eq('id', id)
  if (error) throw error
}
