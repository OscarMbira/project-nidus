import { simDb } from './supabase/supabaseClient'

export async function listReleases(practiceProjectId) {
  const { data, error } = await simDb
    .from('agile_releases')
    .select('*')
    .eq('practice_project_id', practiceProjectId)
    .eq('is_deleted', false)
    .order('target_date', { ascending: true })
  if (error) throw error
  return data || []
}

export async function getRelease(releaseId) {
  const { data, error } = await simDb.from('agile_releases').select('*').eq('id', releaseId).single()
  if (error) throw error
  return data
}

export async function saveRelease(payload) {
  const row = { ...payload }
  if (row.id) {
    const { data, error } = await simDb.from('agile_releases').update(row).eq('id', row.id).select().single()
    if (error) throw error
    return data
  }
  const { data, error } = await simDb.from('agile_releases').insert(row).select().single()
  if (error) throw error
  return data
}

export async function listReleaseStories(releaseId) {
  const { data, error } = await simDb.from('release_stories').select('*').eq('release_id', releaseId)
  if (error) throw error
  return data || []
}

export async function linkStoryToRelease(releaseId, userStoryId) {
  const { data, error } = await simDb
    .from('release_stories')
    .insert({ release_id: releaseId, user_story_id: userStoryId })
    .select()
    .single()
  if (error) throw error
  return data
}
