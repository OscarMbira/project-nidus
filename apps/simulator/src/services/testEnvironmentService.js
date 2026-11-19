import { platformDb } from './supabase/supabaseClient'
import {
  CORE_ENVIRONMENTS_REGISTER_ID,
  DECOMMISSIONED_STATUS,
  ENVIRONMENT_RECORD_COLUMNS,
  environmentFromRecord,
  sortEnvironments,
} from '@nidus/shared/utils/environmentRegister'

/**
 * v1342: environments live in the Environments register (core_environments, SQL v1467 / v1468),
 * same ids as the old test_environments rows, so test suites' environment_ids still resolve.
 * Returns the same { id, project_id, name, description, is_active, … } shape as before.
 * activeOnly leaves out Decommissioned environments.
 */
export async function getTestEnvironments(projectId, { activeOnly = false } = {}) {
  if (!projectId) return []
  let query = platformDb
    .from('local_register_records')
    .select(ENVIRONMENT_RECORD_COLUMNS)
    .eq('register_id', CORE_ENVIRONMENTS_REGISTER_ID)
    .eq('record_project_id', projectId)
    .eq('is_deleted', false)
  if (activeOnly) query = query.neq('status', DECOMMISSIONED_STATUS)
  const { data, error } = await query
  if (error) throw error
  return sortEnvironments((data || [])
    .filter((row) => String(row.record_project_id) === String(projectId))
    .map((row) => environmentFromRecord(row, 'project_id')))
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
