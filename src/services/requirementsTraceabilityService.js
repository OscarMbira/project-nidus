import { platformDb } from './supabase/supabaseClient'

export async function listTraceabilityForProject(projectId) {
  const { data: reqs, error: e1 } = await platformDb
    .from('requirements_register')
    .select('id, requirement_code, name')
    .eq('project_id', projectId)
    .eq('is_deleted', false)
  if (e1) return { success: false, error: e1.message }
  const ids = (reqs || []).map((r) => r.id)
  if (ids.length === 0) return { success: true, data: [], requirements: [] }

  const { data: rows, error: e2 } = await platformDb
    .from('requirements_traceability_matrix')
    .select('*')
    .in('requirement_id', ids)
    .eq('is_deleted', false)
  if (e2) return { success: false, error: e2.message }
  return { success: true, data: rows || [], requirements: reqs || [] }
}

export async function saveTraceabilityRow(payload) {
  const row = {
    requirement_id: payload.requirement_id,
    wbs_node_id: payload.wbs_node_id || null,
    deliverable_description: payload.deliverable_description ?? null,
    linked_test_id: payload.linked_test_id || null,
    status: payload.status || 'open',
    updated_at: new Date().toISOString(),
  }
  if (payload.id) {
    const { data, error } = await platformDb
      .from('requirements_traceability_matrix')
      .update(row)
      .eq('id', payload.id)
      .select()
      .single()
    if (error) return { success: false, error: error.message }
    return { success: true, data }
  }
  const { data, error } = await platformDb
    .from('requirements_traceability_matrix')
    .insert(row)
    .select()
    .single()
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function softDeleteTraceabilityRow(id) {
  const { error } = await platformDb
    .from('requirements_traceability_matrix')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { success: false, error: error.message }
  return { success: true }
}
