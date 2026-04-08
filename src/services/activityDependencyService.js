import { platformDb } from './supabase/supabaseClient'

export async function listDependencies(projectId) {
  const { data, error } = await platformDb
    .from('activity_dependencies')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_deleted', false)
  if (error) return { success: false, error: error.message }
  return { success: true, data: data || [] }
}

export async function saveDependency(projectId, payload) {
  const row = {
    project_id: projectId,
    predecessor_activity_id: payload.predecessor_activity_id,
    successor_activity_id: payload.successor_activity_id,
    dependency_type: payload.dependency_type || 'FS',
    lag_days: payload.lag_days ?? 0,
    dependency_category: payload.dependency_category || null,
    notes: payload.notes ?? null,
    updated_at: new Date().toISOString(),
  }
  if (payload.id) {
    const { data, error } = await platformDb
      .from('activity_dependencies')
      .update(row)
      .eq('id', payload.id)
      .eq('project_id', projectId)
      .select()
      .single()
    if (error) return { success: false, error: error.message }
    return { success: true, data }
  }
  const { data, error } = await platformDb
    .from('activity_dependencies')
    .insert(row)
    .select()
    .single()
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function softDeleteDependency(id, projectId) {
  const { error } = await platformDb
    .from('activity_dependencies')
    .update({ is_deleted: true })
    .eq('id', id)
    .eq('project_id', projectId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}
