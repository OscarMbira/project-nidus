import { simDb } from './supabase/supabaseClient'

export async function listKaizenItems(practiceProjectId) {
  const { data, error } = await simDb
    .from('lean_kaizen_items')
    .select('*')
    .eq('practice_project_id', practiceProjectId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function saveKaizenItem(row) {
  if (row.id) {
    const { data, error } = await simDb.from('lean_kaizen_items').update(row).eq('id', row.id).select().single()
    if (error) throw error
    return data
  }
  const { data, error } = await simDb.from('lean_kaizen_items').insert(row).select().single()
  if (error) throw error
  return data
}
