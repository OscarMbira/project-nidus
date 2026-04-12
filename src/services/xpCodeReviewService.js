import { platformDb } from './supabase/supabaseClient'

export async function listCodeReviews(projectId) {
  const { data, error } = await platformDb
    .from('xp_code_reviews')
    .select('*')
    .eq('project_id', projectId)
    .order('review_date', { ascending: false })
  if (error) throw error
  return data || []
}

export async function saveCodeReview(row) {
  if (row.id) {
    const { data, error } = await platformDb.from('xp_code_reviews').update(row).eq('id', row.id).select().single()
    if (error) throw error
    return data
  }
  const { data, error } = await platformDb.from('xp_code_reviews').insert(row).select().single()
  if (error) throw error
  return data
}
