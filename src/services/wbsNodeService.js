import { platformDb } from './supabase/supabaseClient'

export async function listWbsNodes(projectId) {
  const { data, error } = await platformDb
    .from('wbs_nodes')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .order('sort_order', { ascending: true })
    .order('wbs_code', { ascending: true })
  if (error) return { success: false, error: error.message }
  return { success: true, data: data || [] }
}

export async function saveWbsNode(projectId, payload, authUserId) {
  const row = {
    project_id: projectId,
    parent_id: payload.parent_id || null,
    wbs_code: payload.wbs_code || null,
    title: payload.title,
    description: payload.description ?? null,
    level_num: payload.level_num ?? 1,
    work_package_id: payload.work_package_id || null,
    sort_order: payload.sort_order ?? 0,
    updated_at: new Date().toISOString(),
  }
  if (payload.id) {
    const { data, error } = await platformDb
      .from('wbs_nodes')
      .update(row)
      .eq('id', payload.id)
      .eq('project_id', projectId)
      .select()
      .single()
    if (error) return { success: false, error: error.message }
    return { success: true, data }
  }
  const { data, error } = await platformDb
    .from('wbs_nodes')
    .insert(row)
    .select()
    .single()
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function softDeleteWbsNode(nodeId, projectId, authUserId) {
  const { error } = await platformDb
    .from('wbs_nodes')
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq('id', nodeId)
    .eq('project_id', projectId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}
