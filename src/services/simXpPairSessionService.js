import { simDb } from './supabase/supabaseClient'

export async function listPairSessions(practiceProjectId) {
  const { data, error } = await simDb
    .from('xp_pair_sessions')
    .select('*')
    .eq('practice_project_id', practiceProjectId)
    .order('session_date', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createPairSession(row) {
  const { data, error } = await simDb.from('xp_pair_sessions').insert(row).select().single()
  if (error) throw error
  return data
}
