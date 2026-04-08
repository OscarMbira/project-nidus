import { platformDb } from './supabase/supabaseClient'

/** True if string looks like a UUID (path segment is id); otherwise treat as test_case_ref. */
export function isTestCaseUuidSegment(s) {
  if (s == null || typeof s !== 'string') return false
  const t = s.trim()
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t)
}

/** Prefer human-readable ref in URLs; fall back to id when ref missing. */
export function testCaseDetailPathSegment(record) {
  if (!record) return ''
  const ref = typeof record.test_case_ref === 'string' ? record.test_case_ref.trim() : ''
  if (ref) return encodeURIComponent(ref)
  return record.id || ''
}

// ─── Test Cases ──────────────────────────────────────────────────────────────

export async function getTestCases(projectId, filters = {}) {
  let query = platformDb
    .from('test_cases')
    .select(`
      *,
      suite:test_suites(id, name),
      created_by_user:users!test_cases_created_by_fkey(id, full_name, email)
    `)
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  if (filters.suite_id)   query = query.eq('suite_id', filters.suite_id)
  if (filters.status)     query = query.eq('status', filters.status)
  if (filters.priority)   query = query.eq('priority', filters.priority)
  if (filters.test_type)  query = query.eq('test_type', filters.test_type)
  if (filters.search) {
    query = query.or(`title.ilike.%${filters.search}%,test_case_ref.ilike.%${filters.search}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function getTestCaseById(caseIdOrRef) {
  const key = typeof caseIdOrRef === 'string' ? caseIdOrRef.trim() : String(caseIdOrRef ?? '').trim()
  if (!key) throw new Error('Missing test case identifier')
  const col = isTestCaseUuidSegment(key) ? 'id' : 'test_case_ref'
  const { data, error } = await platformDb
    .from('test_cases')
    .select(`
      *,
      suite:test_suites(id, name),
      steps:test_case_steps(id, step_number, action, expected_result, test_data),
      created_by_user:users!test_cases_created_by_fkey(id, full_name, email)
    `)
    .eq(col, key)
    .eq('is_deleted', false)
    .maybeSingle()
  if (error) throw error
  return data ?? null
}

export async function createTestCase(caseData) {
  const { steps, ...testCase } = caseData
  const { data, error } = await platformDb
    .from('test_cases')
    .insert(testCase)
    .select()
    .single()
  if (error) throw error

  // Insert steps if provided
  if (steps && steps.length > 0) {
    await upsertTestCaseSteps(data.id, steps)
  }
  return data
}

export async function updateTestCase(caseId, updates) {
  const { steps, ...caseUpdates } = updates
  const { data, error } = await platformDb
    .from('test_cases')
    .update({ ...caseUpdates, updated_at: new Date().toISOString() })
    .eq('id', caseId)
    .select()
    .single()
  if (error) throw error

  if (steps !== undefined) {
    await upsertTestCaseSteps(caseId, steps)
  }
  return data
}

export async function deleteTestCase(caseId, deletedBy) {
  const { data, error } = await platformDb
    .from('test_cases')
    .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: deletedBy })
    .eq('id', caseId)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Test Case Steps ─────────────────────────────────────────────────────────

export async function getTestCaseSteps(caseId) {
  const { data, error } = await platformDb
    .from('test_case_steps')
    .select('*')
    .eq('test_case_id', caseId)
    .order('step_number', { ascending: true })
  if (error) throw error
  return data || []
}

export async function upsertTestCaseSteps(caseId, steps) {
  // Delete existing steps and re-insert (simplest approach for step reordering)
  const { error: deleteError } = await platformDb
    .from('test_case_steps')
    .delete()
    .eq('test_case_id', caseId)
  if (deleteError) throw deleteError

  if (!steps || steps.length === 0) return []

  const stepsToInsert = steps.map((step, index) => ({
    test_case_id:    caseId,
    step_number:     index + 1,
    action:          step.action,
    expected_result: step.expected_result || null,
    test_data:       step.test_data || null,
  }))

  const { data, error } = await platformDb
    .from('test_case_steps')
    .insert(stepsToInsert)
    .select()
  if (error) throw error
  return data
}

// ─── Batch Import ─────────────────────────────────────────────────────────────

export async function batchCreateTestCases(testCases) {
  const results = { created: 0, failed: 0, errors: [] }
  const BATCH_SIZE = 50

  for (let i = 0; i < testCases.length; i += BATCH_SIZE) {
    const batch = testCases.slice(i, i + BATCH_SIZE)
    const { data, error } = await platformDb
      .from('test_cases')
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

// ─── Statistics ───────────────────────────────────────────────────────────────

export async function getTestCaseStats(projectId) {
  const { data, error } = await platformDb
    .from('test_cases')
    .select('status, priority, test_type')
    .eq('project_id', projectId)
    .eq('is_deleted', false)
  if (error) throw error

  const stats = { total: data.length, byStatus: {}, byPriority: {}, byType: {} }
  data.forEach(({ status, priority, test_type }) => {
    stats.byStatus[status]    = (stats.byStatus[status] || 0) + 1
    stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1
    stats.byType[test_type]   = (stats.byType[test_type] || 0) + 1
  })
  return stats
}
