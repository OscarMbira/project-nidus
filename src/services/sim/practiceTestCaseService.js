/**
 * Practice test cases (sim.practice_test_cases) — Simulator parity.
 */
import { simDb } from '../supabase/supabaseClient'
import { isTestCaseUuidSegment } from '../testCaseService'

export async function getPracticeTestCases(practiceProjectId, filters = {}) {
  let query = simDb
    .from('practice_test_cases')
    .select(`
      *,
      suite:practice_test_suites(id, name),
      created_by_user:users!practice_test_cases_created_by_fkey(id, full_name, email)
    `)
    .eq('practice_project_id', practiceProjectId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  if (filters.suite_id) query = query.eq('suite_id', filters.suite_id)
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.priority) query = query.eq('priority', filters.priority)
  if (filters.test_type) query = query.eq('test_type', filters.test_type)
  if (filters.search) {
    query = query.or(`title.ilike.%${filters.search}%,test_case_ref.ilike.%${filters.search}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function getPracticeTestCaseById(caseIdOrRef) {
  const key = typeof caseIdOrRef === 'string' ? caseIdOrRef.trim() : String(caseIdOrRef ?? '').trim()
  if (!key) throw new Error('Missing test case identifier')
  const col = isTestCaseUuidSegment(key) ? 'id' : 'test_case_ref'
  const { data, error } = await simDb
    .from('practice_test_cases')
    .select(`
      *,
      suite:practice_test_suites(id, name),
      steps:practice_test_case_steps(id, step_number, action, expected_result, test_data),
      created_by_user:users!practice_test_cases_created_by_fkey(id, full_name, email)
    `)
    .eq(col, key)
    .eq('is_deleted', false)
    .maybeSingle()
  if (error) throw error
  return data ?? null
}

export async function createPracticeTestCase(caseData) {
  const { steps, ...testCase } = caseData
  const { data, error } = await simDb.from('practice_test_cases').insert(testCase).select().single()
  if (error) throw error
  if (steps?.length) await upsertPracticeTestCaseSteps(data.id, steps)
  return data
}

export async function updatePracticeTestCase(caseId, updates) {
  const { steps, ...caseUpdates } = updates
  const { data, error } = await simDb
    .from('practice_test_cases')
    .update({ ...caseUpdates, updated_at: new Date().toISOString() })
    .eq('id', caseId)
    .select()
    .single()
  if (error) throw error
  if (steps !== undefined) await upsertPracticeTestCaseSteps(caseId, steps)
  return data
}

export async function deletePracticeTestCase(caseId, deletedBy) {
  const { data, error } = await simDb
    .from('practice_test_cases')
    .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: deletedBy })
    .eq('id', caseId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function upsertPracticeTestCaseSteps(caseId, steps) {
  const { error: deleteError } = await simDb.from('practice_test_case_steps').delete().eq('test_case_id', caseId)
  if (deleteError) throw deleteError
  if (!steps?.length) return []
  const stepsToInsert = steps.map((step, index) => ({
    test_case_id: caseId,
    step_number: index + 1,
    action: step.action,
    expected_result: step.expected_result || null,
    test_data: step.test_data || null,
  }))
  const { data, error } = await simDb.from('practice_test_case_steps').insert(stepsToInsert).select()
  if (error) throw error
  return data
}

export async function batchCreatePracticeTestCases(testCases) {
  const results = { created: 0, failed: 0, errors: [] }
  const BATCH_SIZE = 50
  for (let i = 0; i < testCases.length; i += BATCH_SIZE) {
    const batch = testCases.slice(i, i + BATCH_SIZE)
    const { data, error } = await simDb
      .from('practice_test_cases')
      .insert(batch)
      .select('id, test_case_ref, title')
    if (error) {
      results.failed += batch.length
      results.errors.push({ rows: `${i + 1}-${i + batch.length}`, message: error.message })
    } else {
      results.created += data.length
    }
  }
  return results
}

export async function getPracticeTestCaseStats(practiceProjectId) {
  const { data, error } = await simDb
    .from('practice_test_cases')
    .select('status, priority, test_type')
    .eq('practice_project_id', practiceProjectId)
    .eq('is_deleted', false)
  if (error) throw error
  const stats = { total: data.length, byStatus: {}, byPriority: {}, byType: {} }
  data.forEach(({ status, priority, test_type }) => {
    stats.byStatus[status] = (stats.byStatus[status] || 0) + 1
    stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1
    stats.byType[test_type] = (stats.byType[test_type] || 0) + 1
  })
  return stats
}
