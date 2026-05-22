import { simDb } from '../supabase/supabaseClient'

export async function getTeamCharter(projectId) {
  const { data, error } = await simDb
    .from('team_charters')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .maybeSingle()
  if (error) throw error
  return data
}

export async function createTeamCharter(payload) {
  const { data, error } = await simDb
    .from('team_charters')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateTeamCharter(id, payload) {
  const { data, error } = await simDb
    .from('team_charters')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteTeamCharter(id) {
  const { error } = await simDb
    .from('team_charters')
    .update({ is_deleted: true })
    .eq('id', id)
  if (error) throw error
}
