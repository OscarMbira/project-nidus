import { platformDb } from './supabase/supabaseClient'

export async function getScopeManagementPlanByProject(projectId) {
  const { data, error } = await platformDb
    .from('scope_management_plans')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) return { success: false, error: error.message }
  return { success: true, data: data || null }
}

export async function saveScopeManagementPlan(projectId, payload, authUserId) {
  const { data: userRow } = await platformDb
    .from('users')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle()
  const uid = userRow?.id || null

  const existing = await getScopeManagementPlanByProject(projectId)
  const row = {
    project_id: projectId,
    scope_definition_approach: payload.scope_definition_approach ?? null,
    change_control_process: payload.change_control_process ?? null,
    scope_validation_method: payload.scope_validation_method ?? null,
    deliverable_acceptance_process: payload.deliverable_acceptance_process ?? null,
    roles_responsibilities: payload.roles_responsibilities ?? null,
    wbs_maintenance_process: payload.wbs_maintenance_process ?? null,
    scope_baseline_info: payload.scope_baseline_info ?? null,
    status: payload.status || 'draft',
    version: payload.version || '1.0',
    updated_at: new Date().toISOString(),
  }

  if (existing.data?.id) {
    const { data, error } = await platformDb
      .from('scope_management_plans')
      .update({ ...row, updated_by: uid })
      .eq('id', existing.data.id)
      .select()
      .single()
    if (error) return { success: false, error: error.message }
    return { success: true, data, operation: 'updated' }
  }

  const { data, error } = await platformDb
    .from('scope_management_plans')
    .insert({ ...row, created_by: uid })
    .select()
    .single()
  if (error) return { success: false, error: error.message }
  return { success: true, data, operation: 'created' }
}
