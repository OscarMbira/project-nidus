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

/**
 * ?projectId= on the Simulator Decision Log pages names a practice project by its
 * project_code (what PlanningProjectBar writes) or its UUID. Returns the UUID, or null.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function resolvePracticeProjectId(key) {
  const value = String(key || '').trim()
  if (!value) return null
  if (UUID_RE.test(value)) return value
  const { data, error } = await simDb
    .from('practice_projects')
    .select('id')
    .eq('project_code', value)
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data?.id || null
}
