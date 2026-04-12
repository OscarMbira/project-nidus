import { simDb } from './supabase/supabaseClient'

export async function listStoryMapItems(practiceProjectId) {
  const { data, error } = await simDb
    .from('story_map_items')
    .select('*')
    .eq('practice_project_id', practiceProjectId)
    .eq('is_deleted', false)
    .order('col_order')
    .order('row_order')
  if (error) throw error
  return data || []
}

export async function saveStoryMapItem(payload) {
  if (payload.id) {
    const { data, error } = await simDb.from('story_map_items').update(payload).eq('id', payload.id).select().single()
    if (error) throw error
    return data
  }
  const { data, error } = await simDb.from('story_map_items').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function softDeleteStoryMapItem(id) {
  const { error } = await simDb
    .from('story_map_items')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}
