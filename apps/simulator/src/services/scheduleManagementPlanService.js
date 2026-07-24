import { platformDb } from './supabase/supabaseClient'

export async function getScheduleManagementPlanByProject(projectId) {
  const { data, error } = await platformDb
    .from('schedule_management_plans')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) return { success: false, error: error.message }
  return { success: true, data: data || null }
}

export async function saveScheduleManagementPlan(projectId, payload, authUserId) {
  const { data: userRow } = await platformDb
    .from('users')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle()
  const uid = userRow?.id || null

  const existing = await getScheduleManagementPlanByProject(projectId)
  const row = {
    project_id: projectId,
    scheduling_methodology: payload.scheduling_methodology ?? null,
    scheduling_tool: payload.scheduling_tool ?? null,
    level_of_accuracy: payload.level_of_accuracy ?? null,
    units_of_measure: payload.units_of_measure ?? null,
    control_thresholds: payload.control_thresholds || {},
    reporting_formats: payload.reporting_formats ?? null,
    schedule_model_maintenance: payload.schedule_model_maintenance ?? null,
    variance_thresholds: payload.variance_thresholds || {},
    status: payload.status || 'draft',
    version: payload.version || '1.0',
    updated_at: new Date().toISOString(),
  }

  if (existing.data?.id) {
    const { data, error } = await platformDb
      .from('schedule_management_plans')
      .update({ ...row, updated_by: uid })
      .eq('id', existing.data.id)
      .select()
      .single()
    if (error) return { success: false, error: error.message }
    return { success: true, data, operation: 'updated' }
  }
  const { data, error } = await platformDb
    .from('schedule_management_plans')
    .insert({ ...row, created_by: uid })
    .select()
    .single()
  if (error) return { success: false, error: error.message }
  return { success: true, data, operation: 'created' }
}
