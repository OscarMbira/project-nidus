import { simDb } from './supabase/supabaseClient'

export async function listCIBuilds(practiceProjectId) {
  const { data, error } = await simDb
    .from('xp_ci_builds')
    .select('*')
    .eq('practice_project_id', practiceProjectId)
    .order('build_date', { ascending: false })
    .limit(100)
  if (error) throw error
  return data || []
}

export async function createCIBuild(row) {
  const { data, error } = await simDb.from('xp_ci_builds').insert(row).select().single()
  if (error) throw error
  return data
}
