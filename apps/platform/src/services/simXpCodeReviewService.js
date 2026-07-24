import { simDb } from './supabase/supabaseClient'

export async function listCodeReviews(practiceProjectId) {
  const { data, error } = await simDb
    .from('xp_code_reviews')
    .select('*')
    .eq('practice_project_id', practiceProjectId)
    .order('review_date', { ascending: false })
  if (error) throw error
  return data || []
}

export async function saveCodeReview(row) {
  if (row.id) {
    const { data, error } = await simDb.from('xp_code_reviews').update(row).eq('id', row.id).select().single()
    if (error) throw error
    return data
  }
  const { data, error } = await simDb.from('xp_code_reviews').insert(row).select().single()
  if (error) throw error
  return data
}
