import { simDb } from './supabase/supabaseClient'

export async function listMaps(practiceProjectId) {
  const { data, error } = await simDb
    .from('lean_value_stream_maps')
    .select('*')
    .eq('practice_project_id', practiceProjectId)
    .eq('is_deleted', false)
  if (error) throw error
  return data || []
}

export async function saveMap(row) {
  if (row.id) {
    const { data, error } = await simDb.from('lean_value_stream_maps').update(row).eq('id', row.id).select().single()
    if (error) throw error
    return data
  }
  const { data, error } = await simDb.from('lean_value_stream_maps').insert(row).select().single()
  if (error) throw error
  return data
}
