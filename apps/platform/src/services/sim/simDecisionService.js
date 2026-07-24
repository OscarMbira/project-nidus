import { simDb } from '../supabase/supabaseClient'

export async function getDecisions(projectId, filters = {}) {
  let q = simDb
    .from('project_decisions')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  if (filters.status) q = q.eq('status', filters.status)
  if (filters.priority) q = q.eq('priority', filters.priority)
  if (filters.category) q = q.eq('category', filters.category)

  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function getDecision(id) {
  const { data, error } = await simDb
    .from('project_decisions')
    .select('*')
    .eq('id', id)
    .eq('is_deleted', false)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function createDecision(payload) {
  const { data, error } = await simDb
    .from('project_decisions')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateDecision(id, payload) {
  const { data, error } = await simDb
    .from('project_decisions')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteDecision(id) {
  const { error } = await simDb
    .from('project_decisions')
    .update({ is_deleted: true })
    .eq('id', id)
  if (error) throw error
}
