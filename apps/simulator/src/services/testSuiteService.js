import { platformDb } from './supabase/supabaseClient'

// ─── Test Suites ─────────────────────────────────────────────────────────────

export async function getTestSuites(projectId, filters = {}) {
  let query = platformDb
    .from('test_suites')
    .select('*, created_by_user:users!test_suites_created_by_fkey(id, full_name, email)')
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  if (filters.status) query = query.eq('status', filters.status)
  if (filters.suite_type) query = query.eq('suite_type', filters.suite_type)
  if (filters.search) query = query.ilike('name', `%${filters.search}%`)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function getTestSuiteById(suiteId) {
  const { data, error } = await platformDb
    .from('test_suites')
    .select(`
      *,
      created_by_user:users!test_suites_created_by_fkey(id, full_name, email),
      test_cases(id, test_case_ref, title, priority, status, test_type)
    `)
    .eq('id', suiteId)
    .eq('is_deleted', false)
    .single()
  if (error) throw error
  return data
}

export async function createTestSuite(suiteData) {
  const { data, error } = await platformDb
    .from('test_suites')
    .insert(suiteData)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateTestSuite(suiteId, updates) {
  const { data, error } = await platformDb
    .from('test_suites')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', suiteId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteTestSuite(suiteId, deletedBy) {
  const { data, error } = await platformDb
    .from('test_suites')
    .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: deletedBy })
    .eq('id', suiteId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getTestSuiteStats(projectId) {
  const { data, error } = await platformDb
    .from('test_suites')
    .select('status, suite_type')
    .eq('project_id', projectId)
    .eq('is_deleted', false)
  if (error) throw error

  const stats = {
    total: data.length,
    byStatus: {},
    bySuiteType: {},
  }
  data.forEach(({ status, suite_type }) => {
    stats.byStatus[status] = (stats.byStatus[status] || 0) + 1
    stats.bySuiteType[suite_type] = (stats.bySuiteType[suite_type] || 0) + 1
  })
  return stats
}
