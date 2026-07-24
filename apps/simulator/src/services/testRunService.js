import { platformDb } from './supabase/supabaseClient'

// ─── Test Runs ────────────────────────────────────────────────────────────────

export async function getTestRuns(projectId, filters = {}) {
  let query = platformDb
    .from('test_runs')
    .select(`
      *,
      suite:test_suites(id, name),
      run_by_user:users!test_runs_run_by_fkey(id, full_name, email)
    `)
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  if (filters.status)      query = query.eq('status', filters.status)
  if (filters.environment) query = query.eq('environment', filters.environment)
  if (filters.suite_id)    query = query.eq('suite_id', filters.suite_id)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function getTestRunById(runId) {
  const { data, error } = await platformDb
    .from('test_runs')
    .select(`
      *,
      suite:test_suites(id, name, suite_type),
      run_by_user:users!test_runs_run_by_fkey(id, full_name, email)
    `)
    .eq('id', runId)
    .eq('is_deleted', false)
    .single()
  if (error) throw error
  return data
}

export async function createTestRun(runData) {
  const { data, error } = await platformDb
    .from('test_runs')
    .insert(runData)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateTestRun(runId, updates) {
  const { data, error } = await platformDb
    .from('test_runs')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', runId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteTestRun(runId, deletedBy) {
  const { data, error } = await platformDb
    .from('test_runs')
    .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: deletedBy })
    .eq('id', runId)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Bootstrap a run: create pending execution rows for all cases in a suite ──

export async function bootstrapTestRunExecutions(runId, projectId, suiteId) {
  // Fetch all active test cases in the suite
  const { data: cases, error: cErr } = await platformDb
    .from('test_cases')
    .select('id')
    .eq('suite_id', suiteId)
    .eq('is_deleted', false)
    .eq('status', 'active')
  if (cErr) throw cErr

  if (!cases || cases.length === 0) return []

  const executions = cases.map(tc => ({
    run_id:       runId,
    test_case_id: tc.id,
    project_id:   projectId,
    status:       'pending',
  }))

  const { data, error } = await platformDb
    .from('test_case_executions')
    .insert(executions)
    .select()
  if (error) throw error
  return data
}

// ─── Test Case Executions ─────────────────────────────────────────────────────

export async function getExecutionsByRun(runId) {
  const { data, error } = await platformDb
    .from('test_case_executions')
    .select(`
      *,
      test_case:test_cases(id, test_case_ref, title, priority, test_type, description, expected_result,
        steps:test_case_steps(step_number, action, expected_result, test_data)
      ),
      executed_by_user:users!test_case_executions_executed_by_fkey(id, full_name, email),
      defect:defects(id, defect_ref, title, severity, status)
    `)
    .eq('run_id', runId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function updateExecution(executionId, updates) {
  // If marking as executed, set executed_at timestamp
  if (updates.status && updates.status !== 'pending' && !updates.executed_at) {
    updates.executed_at = new Date().toISOString()
  }
  const { data, error } = await platformDb
    .from('test_case_executions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', executionId)
    .select(`
      *,
      defect:defects(id, defect_ref, title, severity, status)
    `)
    .single()
  if (error) throw error
  return data
}

// ─── Statistics ───────────────────────────────────────────────────────────────

export async function getRunStats(projectId) {
  const { data, error } = await platformDb
    .from('test_runs')
    .select('status, summary, run_date')
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .order('run_date', { ascending: false })
    .limit(20)
  if (error) throw error
  return data || []
}
