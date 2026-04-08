/**
 * Practice test runs & executions (sim schema) — Simulator parity.
 */
import { simDb } from '../supabase/supabaseClient'

export async function getPracticeTestRuns(practiceProjectId, filters = {}) {
  let query = simDb
    .from('practice_test_runs')
    .select(`
      *,
      suite:practice_test_suites(id, name),
      run_by_user:users!practice_test_runs_run_by_fkey(id, full_name, email)
    `)
    .eq('practice_project_id', practiceProjectId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  if (filters.status) query = query.eq('status', filters.status)
  if (filters.environment) query = query.eq('environment', filters.environment)
  if (filters.suite_id) query = query.eq('suite_id', filters.suite_id)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function getPracticeTestRunById(runId) {
  const { data, error } = await simDb
    .from('practice_test_runs')
    .select(`
      *,
      suite:practice_test_suites(id, name, suite_type),
      run_by_user:users!practice_test_runs_run_by_fkey(id, full_name, email)
    `)
    .eq('id', runId)
    .eq('is_deleted', false)
    .single()
  if (error) throw error
  return data
}

export async function createPracticeTestRun(row) {
  const { data, error } = await simDb.from('practice_test_runs').insert(row).select().single()
  if (error) throw error
  return data
}

export async function updatePracticeTestRun(runId, updates) {
  const { data, error } = await simDb
    .from('practice_test_runs')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', runId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deletePracticeTestRun(runId, deletedBy) {
  const { data, error } = await simDb
    .from('practice_test_runs')
    .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: deletedBy })
    .eq('id', runId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function bootstrapPracticeTestRunExecutions(runId, practiceProjectId, suiteId) {
  const { data: cases, error: cErr } = await simDb
    .from('practice_test_cases')
    .select('id')
    .eq('suite_id', suiteId)
    .eq('is_deleted', false)
    .eq('status', 'active')
  if (cErr) throw cErr
  if (!cases?.length) return []

  const executions = cases.map((tc) => ({
    run_id: runId,
    test_case_id: tc.id,
    practice_project_id: practiceProjectId,
    status: 'pending',
  }))
  const { data, error } = await simDb.from('practice_test_case_executions').insert(executions).select()
  if (error) throw error
  return data
}

export async function getPracticeExecutionsByRun(runId) {
  const { data, error } = await simDb
    .from('practice_test_case_executions')
    .select(`
      *,
      test_case:practice_test_cases(id, test_case_ref, title, priority, test_type, description, expected_result,
        steps:practice_test_case_steps(step_number, action, expected_result, test_data)
      ),
      executed_by_user:users!practice_test_case_executions_executed_by_fkey(id, full_name, email),
      defect:practice_defects(id, defect_ref, title, severity, status)
    `)
    .eq('run_id', runId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function updatePracticeExecution(executionId, updates) {
  if (updates.status && updates.status !== 'pending' && !updates.executed_at) {
    updates.executed_at = new Date().toISOString()
  }
  const { data, error } = await simDb
    .from('practice_test_case_executions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', executionId)
    .select(
      `
      *,
      defect:practice_defects(id, defect_ref, title, severity, status)
    `,
    )
    .single()
  if (error) throw error
  return data
}

export async function getPracticeRunStats(practiceProjectId) {
  const { data, error } = await simDb
    .from('practice_test_runs')
    .select('status, summary, run_date')
    .eq('practice_project_id', practiceProjectId)
    .eq('is_deleted', false)
    .order('run_date', { ascending: false })
    .limit(20)
  if (error) throw error
  return data || []
}
