import { platformDb } from './supabase/supabaseClient'

export async function listKaizenItems(projectId) {
  const { data, error } = await platformDb
    .from('lean_kaizen_items')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function saveKaizenItem(row) {
  if (row.id) {
    const { data, error } = await platformDb.from('lean_kaizen_items').update(row).eq('id', row.id).select().single()
    if (error) throw error
    return data
  }
  const { data, error } = await platformDb.from('lean_kaizen_items').insert(row).select().single()
  if (error) throw error
  return data
}
