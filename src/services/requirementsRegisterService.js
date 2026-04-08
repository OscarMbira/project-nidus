import { platformDb } from './supabase/supabaseClient'

export async function listRequirements(projectId) {
  const { data, error } = await platformDb
    .from('requirements_register')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .order('requirement_code', { ascending: true })
  if (error) return { success: false, error: error.message }
  return { success: true, data: data || [] }
}

export async function getRequirement(projectId, reqId) {
  const { data, error } = await platformDb
    .from('requirements_register')
    .select('*')
    .eq('id', reqId)
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .maybeSingle()
  if (error) return { success: false, error: error.message }
  return { success: true, data: data || null }
}

export async function saveRequirement(projectId, payload, authUserId) {
  const { data: userRow } = await platformDb
    .from('users')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle()
  const uid = userRow?.id || null

  const row = {
    project_id: projectId,
    requirement_code: payload.requirement_code || null,
    name: payload.name,
    description: payload.description ?? null,
    category: payload.category || null,
    source_stakeholder_id: payload.source_stakeholder_id || null,
    priority: payload.priority || null,
    status: payload.status || 'draft',
    acceptance_criteria: payload.acceptance_criteria ?? null,
    traceability_tag: payload.traceability_tag ?? null,
    version: payload.version || '1.0',
    updated_at: new Date().toISOString(),
  }

  if (payload.id) {
    const { data, error } = await platformDb
      .from('requirements_register')
      .update({ ...row, updated_by: uid })
      .eq('id', payload.id)
      .eq('project_id', projectId)
      .select()
      .single()
    if (error) return { success: false, error: error.message }
    return { success: true, data, operation: 'updated' }
  }
  const { data, error } = await platformDb
    .from('requirements_register')
    .insert({ ...row, created_by: uid })
    .select()
    .single()
  if (error) return { success: false, error: error.message }
  return { success: true, data, operation: 'created' }
}

export async function softDeleteRequirement(reqId, projectId, authUserId) {
  const { data: userRow } = await platformDb
    .from('users')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle()
  const { error } = await platformDb
    .from('requirements_register')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: userRow?.id || null,
    })
    .eq('id', reqId)
    .eq('project_id', projectId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}
