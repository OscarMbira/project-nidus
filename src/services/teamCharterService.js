import { platformDb } from './supabase/supabaseClient'

const SELECT = '*'

export async function getTeamCharter(projectId) {
  const { data, error } = await platformDb
    .from('team_charters')
    .select(SELECT)
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function createTeamCharter(payload) {
  const { data, error } = await platformDb
    .from('team_charters')
    .insert(payload)
    .select(SELECT)
    .single()
  if (error) throw error
  return data
}

export async function updateTeamCharter(id, payload) {
  const { data, error } = await platformDb
    .from('team_charters')
    .update(payload)
    .eq('id', id)
    .select(SELECT)
    .single()
  if (error) throw error
  return data
}

export async function deleteTeamCharter(id) {
  const { error } = await platformDb
    .from('team_charters')
    .update({ is_deleted: true })
    .eq('id', id)
  if (error) throw error
}
