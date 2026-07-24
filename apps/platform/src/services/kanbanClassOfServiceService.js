import { platformDb } from './supabase/supabaseClient'

export async function listClassesForBoard(boardId) {
  const { data, error } = await platformDb
    .from('kanban_classes_of_service')
    .select('*')
    .eq('board_id', boardId)
    .eq('is_deleted', false)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data || []
}

export async function saveClassOfService(row) {
  if (row.id) {
    const { data, error } = await platformDb.from('kanban_classes_of_service').update(row).eq('id', row.id).select().single()
    if (error) throw error
    return data
  }
  const { data, error } = await platformDb.from('kanban_classes_of_service').insert(row).select().single()
  if (error) throw error
  return data
}
