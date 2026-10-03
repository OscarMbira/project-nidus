import { simDb } from '../supabase/supabaseClient'

function sortEnvironments(rows) {
  return [...(rows || [])].sort((a, b) => {
    const byName = String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' })
    if (byName) return byName
    return String(a.created_at || '').localeCompare(String(b.created_at || ''))
  })
}

export async function getPracticeTestEnvironments(practiceProjectId, { activeOnly = false } = {}) {
  if (!practiceProjectId) return []
  let query = simDb
    .from('practice_test_environments')
    .select('id, practice_project_id, name, description, is_active, created_at, updated_at, created_by, updated_by')
    .eq('practice_project_id', practiceProjectId)
    .eq('is_deleted', false)
    .order('name', { ascending: true })
  if (activeOnly) query = query.eq('is_active', true)
  const { data, error } = await query
  if (error) throw error
  return sortEnvironments((data || []).filter((row) => String(row.practice_project_id) === String(practiceProjectId)))
}

export async function getPracticeTestEnvironment(practiceProjectId, key) {
  if (!practiceProjectId || !key) return null
  const decoded = decodeURIComponent(String(key))
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decoded)
  let query = simDb
    .from('practice_test_environments')
    .select('id, practice_project_id, name, description, is_active, created_at, updated_at, created_by, updated_by')
    .eq('practice_project_id', practiceProjectId)
    .eq('is_deleted', false)
  query = isUuid ? query.eq('id', decoded) : query.ilike('name', decoded)
  const { data, error } = await query.maybeSingle()
  if (error) throw error
  if (!data || String(data.practice_project_id) !== String(practiceProjectId)) return null
  return data
}

export async function createPracticeTestEnvironment(payload) {
  const { data, error } = await simDb
    .from('practice_test_environments')
    .insert(payload)
    .select('id, practice_project_id, name, description, is_active, created_at, updated_at, created_by, updated_by')
    .single()
  if (error) throw error
  return data
}

export async function updatePracticeTestEnvironment(id, updates) {
  const { data, error } = await simDb
    .from('practice_test_environments')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, practice_project_id, name, description, is_active, created_at, updated_at, created_by, updated_by')
    .single()
  if (error) throw error
  return data
}

export async function deletePracticeTestEnvironment(id, deletedBy) {
  const { data, error } = await simDb
    .from('practice_test_environments')
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
