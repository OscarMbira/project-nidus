import { platformDb } from './supabase/supabaseClient'

function sortEnvironments(rows) {
  return [...(rows || [])].sort((a, b) => {
    const byName = String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' })
    if (byName) return byName
    return String(a.created_at || '').localeCompare(String(b.created_at || ''))
  })
}

export async function getTestEnvironments(projectId, { activeOnly = false } = {}) {
  if (!projectId) return []
  let query = platformDb
    .from('test_environments')
    .select('id, project_id, name, description, is_active, created_at, updated_at, created_by, updated_by')
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .order('name', { ascending: true })
  if (activeOnly) query = query.eq('is_active', true)
  const { data, error } = await query
  if (error) throw error
  return sortEnvironments((data || []).filter((row) => String(row.project_id) === String(projectId)))
}

export async function getTestEnvironment(projectId, key) {
  if (!projectId || !key) return null
  const decoded = decodeURIComponent(String(key))
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decoded)
  let query = platformDb
    .from('test_environments')
    .select('id, project_id, name, description, is_active, created_at, updated_at, created_by, updated_by')
    .eq('project_id', projectId)
    .eq('is_deleted', false)
  query = isUuid ? query.eq('id', decoded) : query.ilike('name', decoded)
  const { data, error } = await query.maybeSingle()
  if (error) throw error
  if (!data || String(data.project_id) !== String(projectId)) return null
  return data
}

export async function createTestEnvironment(payload) {
  const { data, error } = await platformDb
    .from('test_environments')
    .insert(payload)
    .select('id, project_id, name, description, is_active, created_at, updated_at, created_by, updated_by')
    .single()
  if (error) throw error
  return data
}

export async function updateTestEnvironment(id, updates) {
  const { data, error } = await platformDb
    .from('test_environments')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, project_id, name, description, is_active, created_at, updated_at, created_by, updated_by')
    .single()
  if (error) throw error
  return data
}

export async function deleteTestEnvironment(id, deletedBy) {
  const { data, error } = await platformDb
    .from('test_environments')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: deletedBy,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id, name')
    .single()
  if (error) throw error
  return data
}
