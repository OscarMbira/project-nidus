import { platformDb } from './supabase/supabaseClient'

export async function listReleases(projectId) {
  const { data, error } = await platformDb
    .from('agile_releases')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .order('target_date', { ascending: true })
  if (error) throw error
  return data || []
}

export async function getRelease(releaseId) {
  const { data, error } = await platformDb.from('agile_releases').select('*').eq('id', releaseId).single()
  if (error) throw error
  return data
}

export async function saveRelease(payload) {
  if (payload.id) {
    const { data, error } = await platformDb.from('agile_releases').update(payload).eq('id', payload.id).select().single()
    if (error) throw error
    return data
  }
  const { data, error } = await platformDb.from('agile_releases').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function listReleaseStories(releaseId) {
  const { data, error } = await platformDb
    .from('release_stories')
    .select('*, user_stories(*)')
    .eq('release_id', releaseId)
  if (error) throw error
  return data || []
}

export async function linkStoryToRelease(releaseId, userStoryId) {
  const { data, error } = await platformDb
    .from('release_stories')
    .insert({ release_id: releaseId, user_story_id: userStoryId })
    .select()
    .single()
  if (error) throw error
  return data
}
