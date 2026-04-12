import { platformDb } from './supabase/supabaseClient'

export async function listPairSessions(projectId) {
  const { data, error } = await platformDb
    .from('xp_pair_sessions')
    .select('*')
    .eq('project_id', projectId)
    .order('session_date', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createPairSession(row) {
  const { data, error } = await platformDb.from('xp_pair_sessions').insert(row).select().single()
  if (error) throw error
  return data
}
