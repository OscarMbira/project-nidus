import { platformDb } from './supabase/supabaseClient'

export async function listCIBuilds(projectId) {
  const { data, error } = await platformDb
    .from('xp_ci_builds')
    .select('*')
    .eq('project_id', projectId)
    .order('build_date', { ascending: false })
    .limit(100)
  if (error) throw error
  return data || []
}

export async function createCIBuild(row) {
  const { data, error } = await platformDb.from('xp_ci_builds').insert(row).select().single()
  if (error) throw error
  return data
}
