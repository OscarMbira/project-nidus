import { simDb } from '../supabase/supabaseClient'

function nest(flat, parentId = null) {
  return (flat || [])
    .filter((n) => n.parent_id === parentId)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((n) => ({ ...n, children: nest(flat, n.id) }))
}

export async function getPBSTree(practiceProjectId) {
  const { data, error } = await simDb.from('plan_pbs_nodes').select('*').eq('practice_project_id', practiceProjectId)
  if (error) throw error
  return nest(data || [])
}

export async function createPBSNode(payload) {
  const { data, error } = await simDb.from('plan_pbs_nodes').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function updatePBSNode(id, patch) {
  const { data, error } = await simDb
    .from('plan_pbs_nodes')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deletePBSNode(id) {
  const { error } = await simDb.from('plan_pbs_nodes').delete().eq('id', id)
  if (error) throw error
}

export async function getPFDEdges(practiceProjectId) {
  const { data, error } = await simDb.from('plan_pfd_edges').select('*').eq('practice_project_id', practiceProjectId)
  if (error) throw error
  return data || []
}

export async function createPFDEdge(payload) {
  const { data, error } = await simDb.from('plan_pfd_edges').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function deletePFDEdge(id) {
  const { error } = await simDb.from('plan_pfd_edges').delete().eq('id', id)
  if (error) throw error
}
