import { platformDb } from './supabase/supabaseClient'

export async function listStoryMapItems(projectId) {
  const { data, error } = await platformDb
    .from('story_map_items')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .order('col_order')
    .order('row_order')
  if (error) throw error
  return data || []
}

export async function saveStoryMapItem(payload) {
  if (payload.id) {
    const { data, error } = await platformDb.from('story_map_items').update(payload).eq('id', payload.id).select().single()
    if (error) throw error
    return data
  }
  const { data, error } = await platformDb.from('story_map_items').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function softDeleteStoryMapItem(id) {
  const { error } = await platformDb.from('story_map_items').update({ is_deleted: true, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}
