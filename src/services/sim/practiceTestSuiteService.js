/**
 * Practice test suites (sim.practice_test_suites) — Simulator parity for Test Management.
 */
import { simDb } from '../supabase/supabaseClient'

export async function getPracticeTestSuites(practiceProjectId, filters = {}) {
  let query = simDb
    .from('practice_test_suites')
    .select('*, created_by_user:users!practice_test_suites_created_by_fkey(id, full_name, email)')
    .eq('practice_project_id', practiceProjectId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  if (filters.status) query = query.eq('status', filters.status)
  if (filters.suite_type) query = query.eq('suite_type', filters.suite_type)
  if (filters.search) query = query.ilike('name', `%${filters.search}%`)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function getPracticeTestSuiteById(suiteId) {
  const { data, error } = await simDb
    .from('practice_test_suites')
    .select(
      `
      *,
      created_by_user:users!practice_test_suites_created_by_fkey(id, full_name, email),
      test_cases:practice_test_cases(id, test_case_ref, title, priority, status, test_type)
    `,
    )
    .eq('id', suiteId)
    .eq('is_deleted', false)
    .single()
  if (error) throw error
  return data
}

export async function createPracticeTestSuite(row) {
  const { data, error } = await simDb.from('practice_test_suites').insert(row).select().single()
  if (error) throw error
  return data
}

export async function updatePracticeTestSuite(suiteId, updates) {
  const { data, error } = await simDb
    .from('practice_test_suites')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', suiteId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deletePracticeTestSuite(suiteId, deletedBy) {
  const { data, error } = await simDb
    .from('practice_test_suites')
    .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: deletedBy })
    .eq('id', suiteId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getPracticeTestSuiteStats(practiceProjectId) {
  const { data, error } = await simDb
    .from('practice_test_suites')
    .select('status, suite_type')
    .eq('practice_project_id', practiceProjectId)
    .eq('is_deleted', false)
  if (error) throw error

  const stats = { total: data.length, byStatus: {}, bySuiteType: {} }
  data.forEach(({ status, suite_type }) => {
    stats.byStatus[status] = (stats.byStatus[status] || 0) + 1
    stats.bySuiteType[suite_type] = (stats.bySuiteType[suite_type] || 0) + 1
  })
  return stats
}
