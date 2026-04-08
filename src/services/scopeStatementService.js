import { platformDb } from './supabase/supabaseClient'

export async function getScopeStatementByProject(projectId) {
  const { data, error } = await platformDb
    .from('scope_statements')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) return { success: false, error: error.message }
  return { success: true, data: data || null }
}

export async function saveScopeStatement(projectId, payload, authUserId) {
  const { data: userRow } = await platformDb
    .from('users')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle()
  const uid = userRow?.id || null

  const existing = await getScopeStatementByProject(projectId)
  const row = {
    project_id: projectId,
    project_description: payload.project_description ?? null,
    product_scope_description: payload.product_scope_description ?? null,
    in_scope: payload.in_scope?.length ? payload.in_scope : [],
    out_of_scope: payload.out_of_scope?.length ? payload.out_of_scope : [],
    key_deliverables: payload.key_deliverables?.length ? payload.key_deliverables : [],
    acceptance_criteria: payload.acceptance_criteria?.length ? payload.acceptance_criteria : [],
    constraints: payload.constraints?.length ? payload.constraints : [],
    assumptions: payload.assumptions?.length ? payload.assumptions : [],
    exclusions: payload.exclusions?.length ? payload.exclusions : [],
    revision_history: payload.revision_history || [],
    status: payload.status || 'draft',
    version: payload.version || '1.0',
    updated_at: new Date().toISOString(),
  }

  if (existing.data?.id) {
    const { data, error } = await platformDb
      .from('scope_statements')
      .update({ ...row, updated_by: uid })
      .eq('id', existing.data.id)
      .select()
      .single()
    if (error) return { success: false, error: error.message }
    return { success: true, data, operation: 'updated' }
  }
  const { data, error } = await platformDb
    .from('scope_statements')
    .insert({ ...row, created_by: uid })
    .select()
    .single()
  if (error) return { success: false, error: error.message }
  return { success: true, data, operation: 'created' }
}
