import { platformDb } from './supabase/supabaseClient'

const SELECT = '*'

export async function getDecisions(projectId, filters = {}) {
  let q = platformDb
    .from('project_decisions')
    .select(SELECT)
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
  const { data, error } = await platformDb
    .from('project_decisions')
    .select(SELECT)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createDecision(payload) {
  const { data, error } = await platformDb
    .from('project_decisions')
    .insert(payload)
    .select(SELECT)
    .single()
  if (error) throw error
  return data
}

export async function updateDecision(id, payload) {
  const { data, error } = await platformDb
    .from('project_decisions')
    .update(payload)
    .eq('id', id)
    .select(SELECT)
    .single()
  if (error) throw error
  return data
}

export async function deleteDecision(id) {
  const { error } = await platformDb
    .from('project_decisions')
    .update({ is_deleted: true })
    .eq('id', id)
  if (error) throw error
}
