import { platformDb } from './supabase/supabaseClient'

export async function listActivities(projectId) {
  const { data, error } = await platformDb
    .from('activity_list')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .order('activity_code', { ascending: true })
  if (error) return { success: false, error: error.message }
  return { success: true, data: data || [] }
}

export async function getActivity(projectId, actId) {
  const { data, error } = await platformDb
    .from('activity_list')
    .select('*')
    .eq('id', actId)
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .maybeSingle()
  if (error) return { success: false, error: error.message }
  return { success: true, data: data || null }
}

export async function saveActivity(projectId, payload, authUserId) {
  const { data: userRow } = await platformDb
    .from('users')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle()
  const uid = userRow?.id || null

  const row = {
    project_id: projectId,
    wbs_node_id: payload.wbs_node_id || null,
    activity_code: payload.activity_code || null,
    name: payload.name,
    description: payload.description ?? null,
    is_milestone: !!payload.is_milestone,
    planned_start_date: payload.planned_start_date || null,
    planned_end_date: payload.planned_end_date || null,
    actual_start_date: payload.actual_start_date || null,
    actual_end_date: payload.actual_end_date || null,
    estimation_technique: payload.estimation_technique || null,
    optimistic_duration: payload.optimistic_duration ?? null,
    most_likely_duration: payload.most_likely_duration ?? null,
    pessimistic_duration: payload.pessimistic_duration ?? null,
    duration_unit: payload.duration_unit || 'days',
    basis_of_estimate: payload.basis_of_estimate ?? null,
    resource_requirements: payload.resource_requirements ?? null,
    constraints: payload.constraints ?? null,
    assumptions: payload.assumptions ?? null,
    status: payload.status || 'not_started',
    updated_at: new Date().toISOString(),
  }

  if (payload.id) {
    const { data, error } = await platformDb
      .from('activity_list')
      .update({ ...row, updated_by: uid })
      .eq('id', payload.id)
      .eq('project_id', projectId)
      .select()
      .single()
    if (error) return { success: false, error: error.message }
    return { success: true, data }
  }
  const { data, error } = await platformDb
    .from('activity_list')
    .insert({ ...row, created_by: uid })
    .select()
    .single()
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}
