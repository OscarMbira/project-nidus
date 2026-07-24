/**
 * PMIS Testing & Diagnostics Centre — Platform (public schema, platformDb)
 */
import { platformDb } from './supabase/supabaseClient'
import { logAuditEvent } from './auditService'

const EVIDENCE_BUCKET = 'testing-centre-evidence'

export async function resolveInternalUserId() {
  try {
    const { data: { user } } = await platformDb.auth.getUser()
    if (!user) return null
    const { data } = await platformDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
    return data?.id || null
  } catch {
    return null
  }
}

/** Suggested new code (unique check on submit). */
export function suggestTestCaseCode() {
  const d = new Date()
  const p = d => String(d).padStart(2, '0')
  const rnd = () => Math.random().toString(36).slice(2, 6).toUpperCase()
  return `TC-NEW-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${rnd()}`
}

function rowError(err) {
  return { success: false, message: err?.message || String(err), data: null, error: err }
}

export async function listTestModules() {
  try {
    const { data, error } = await platformDb
      .from('tc_test_modules')
      .select('*')
      .eq('is_active', true)
      .order('name')
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (e) {
    return rowError(e)
  }
}

export async function getTestModule(id) {
  try {
    const { data, error } = await platformDb.from('tc_test_modules').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return { success: true, data }
  } catch (e) {
    return rowError(e)
  }
}

export async function listTestCases(filters = {}) {
  try {
    let q = platformDb
      .from('tc_test_cases')
      .select('*, module:module_id (id, code, name, route_path)')
      .order('updated_at', { ascending: false })
    if (filters.status) q = q.eq('status', filters.status)
    if (filters.moduleId) q = q.eq('module_id', filters.moduleId)
    if (filters.search) {
      const s = filters.search.trim()
      q = q.or(`title.ilike.%${s}%,test_case_code.ilike.%${s}%`)
    }
    const { data, error } = await q
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (e) {
    return rowError(e)
  }
}

export async function getTestCase(id) {
  try {
    const { data, error } = await platformDb
      .from('tc_test_cases')
      .select('*, module:module_id (id, code, name, route_path)')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return { success: true, data }
  } catch (e) {
    return rowError(e)
  }
}

export async function createTestCase(payload) {
  try {
    const uid = await resolveInternalUserId()
    const row = { ...payload, created_by: payload.created_by ?? uid, updated_by: payload.updated_by ?? uid }
    const { data, error } = await platformDb.from('tc_test_cases').insert(row).select().single()
    if (error) throw error
    await logAuditEvent('test_case.created', null, 'tc_test_case', data.id, 'create', null, data, {})
    return { success: true, data }
  } catch (e) {
    return rowError(e)
  }
}

export async function updateTestCase(id, payload) {
  try {
    const uid = await resolveInternalUserId()
    const { data, error } = await platformDb
      .from('tc_test_cases')
      .update({ ...payload, updated_at: new Date().toISOString(), updated_by: payload.updated_by ?? uid })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return { success: true, data }
  } catch (e) {
    return rowError(e)
  }
}

export async function deleteTestCase(id) {
  try {
    const { error } = await platformDb.from('tc_test_cases').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  } catch (e) {
    return rowError(e)
  }
}

export async function deactivateTestCase(id) {
  return updateTestCase(id, { is_active: false, status: 'deprecated' })
}

export async function cloneTestCase(id, newTitle) {
  try {
    const { data: { user } } = await platformDb.auth.getUser()
    const { data: urow } = await platformDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
    const { data, error } = await platformDb.rpc('clone_test_case', { p_source_id: id, p_new_title: newTitle || null, p_created_by: urow?.id || null })
    if (error) throw error
    return { success: true, data }
  } catch (e) {
    return rowError(e)
  }
}

export async function listTestSuites() {
  try {
    const { data, error } = await platformDb
      .from('tc_test_suites')
      .select('*, environment:environment_id (id, name), module:target_module_id (id, name)')
      .order('name')
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (e) {
    return rowError(e)
  }
}

export async function getTestSuite(id) {
  try {
    const { data: s, error } = await platformDb
      .from('tc_test_suites')
      .select('*, environment:environment_id (id, name), module:target_module_id (id, name)')
      .eq('id', id)
      .single()
    if (error) throw error
    const { data: rows } = await platformDb
      .from('tc_test_suite_cases')
      .select('*, case:tc_test_case_id (id, test_case_code, title, priority, status)')
      .eq('suite_id', id)
      .order('run_order', { ascending: true })
    return { success: true, data: { ...s, suiteCases: rows || [] } }
  } catch (e) {
    return rowError(e)
  }
}

export async function listEnvironments() {
  try {
    const { data, error } = await platformDb.from('tc_test_environments').select('*').eq('is_active', true).order('name')
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (e) {
    return rowError(e)
  }
}

export async function getTestingDashboardMetrics() {
  try {
    const { data, error } = await platformDb.rpc('get_testing_centre_dashboard_metrics')
    if (error) throw error
    return { success: true, data: data || {} }
  } catch (e) {
    return rowError(e)
  }
}

export async function getSettings() {
  try {
    const { data, error } = await platformDb.from('tc_settings').select('*')
    if (error) throw error
    const map = Object.fromEntries((data || []).map((r) => [r.setting_key, r.setting_value]))
    return { success: true, data: map }
  } catch (e) {
    return rowError(e)
  }
}

export async function updateSetting(key, value) {
  try {
    const { data: { user } } = await platformDb.auth.getUser()
    const { data: u } = await platformDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
    const { data, error } = await platformDb
      .from('tc_settings')
      .upsert(
        { setting_key: key, setting_value: value, updated_by: u?.id || null, updated_at: new Date().toISOString() },
        { onConflict: 'setting_key' }
      )
      .select()
      .single()
    if (error) throw error
    return { success: true, data }
  } catch (e) {
    return rowError(e)
  }
}

export async function auditTestingAction(action, entityType, entityId, beforeData, afterData) {
  return logAuditEvent(action, null, entityType, entityId, 'testing_centre', beforeData, afterData, { module: 'testing_centre' })
}

// --- Test runs (v494) ---
export async function listTestRuns() {
  try {
    const { data, error } = await platformDb
      .from('tc_test_runs')
      .select('*, suite:suite_id (id, name, suite_code), environment:environment_id (id, name), case:tc_test_case_id (id, test_case_code, title)')
      .order('started_at', { ascending: false, nullsFirst: false })
      .limit(200)
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (e) {
    return rowError(e)
  }
}

export async function getTestRunWithResults(id) {
  try {
    const { data: run, error: e1 } = await platformDb
      .from('tc_test_runs')
      .select('*, suite:suite_id (id, name), environment:environment_id (id, name)')
      .eq('id', id)
      .single()
    if (e1) throw e1
    const { data: results, error: e2 } = await platformDb
      .from('tc_test_run_results')
      .select('*, case:tc_test_case_id (id, test_case_code, title, playwright_spec_path)')
      .eq('tc_test_run_id', id)
    if (e2) throw e2
    const { data: evi, error: e3 } = await platformDb
      .from('tc_evidence_files')
      .select('*')
      .eq('tc_test_run_id', id)
    if (e3) throw e3
    return { success: true, data: { run, results: results || [], evidence: evi || [] } }
  } catch (e) {
    return rowError(e)
  }
}

export async function getTestRunDashboardMetrics(envId, days = 30) {
  try {
    const { data, error } = await platformDb.rpc('get_tc_run_dashboard_metrics', { p_env_id: envId, p_days: days })
    if (error) throw error
    return { success: true, data: data || {} }
  } catch (e) {
    return rowError(e)
  }
}

export async function generateSingleAiFixPrompt(testRunResultId) {
  try {
    const { data: res, error: re } = await platformDb
      .from('tc_test_run_results')
      .select('*, run:tc_test_run_id (*), case:tc_test_case_id (*)')
      .eq('id', testRunResultId)
      .single()
    if (re) throw re
    if (!res) return { success: false, message: 'Result not found' }
    const c = res.case
    const run = res.run
    const md = buildSingleFixMarkdown({ result: res, testCase: c, run })
    const path = `${res.tc_test_run_id}/single_${(c && c.test_case_code) || 'case'}_${testRunResultId}.md`
    const blob = new Blob([md], { type: 'text/markdown' })
    const { data: { user } } = await platformDb.auth.getUser()
    const { data: u } = await platformDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
    const { data: up, error: uperr } = await platformDb.storage
      .from(EVIDENCE_BUCKET)
      .upload(path, blob, { upsert: true, contentType: 'text/markdown' })
    if (uperr) throw uperr
    const { data: ev, error: ie } = await platformDb
      .from('tc_evidence_files')
      .insert({
        tc_test_run_id: res.tc_test_run_id,
        tc_test_run_result_id: testRunResultId,
        tc_test_case_id: res.tc_test_case_id,
        file_type: 'ai_fix_prompt',
        storage_path: up?.path || path,
        file_name: `${(c && c.test_case_code) || 'fix'}_single_fix_prompt.md`,
        description: 'Single failure AI fix prompt',
        storage_bucket: EVIDENCE_BUCKET,
        uploaded_by: u?.id || null,
      })
      .select()
      .single()
    if (ie) throw ie
    const { data: pub } = await platformDb.storage.from(EVIDENCE_BUCKET).createSignedUrl(path, 3600)
    return { success: true, fileId: ev?.id, downloadUrl: pub?.signedUrl, testCaseCode: c?.test_case_code }
  } catch (e) {
    return rowError(e)
  }
}

function buildSingleFixMarkdown({ result, testCase, run }) {
  const r = (v) => (v == null || v === '' ? '—' : v)
  return [
    '# PMIS AI Fix Prompt — Single Failure',
    `Test Case: ${r(testCase?.test_case_code)} — ${r(testCase?.title)}`,
    `Test Run: ${r(run?.run_code)} | Date: ${new Date().toISOString()}`,
    '',
    '## Expected Result',
    r(result?.expected_result || testCase?.expected_result),
    '',
    '## Actual Result',
    r(result?.actual_result),
    '',
    '## Failure Reason',
    r(result?.failure_reason),
    '',
    '## Retest',
    `playwright: ${r(testCase?.playwright_spec_path || 'N/A')}`,
  ].join('\n')
}

export async function generateBatchAiFixPrompt(testRunId) {
  const res = await getTestRunWithResults(testRunId)
  if (!res.success) return res
  const { run, results, evidence: _e } = res.data
  const failed = (results || []).filter((x) => x.status === 'failed' && x.failure_classification !== 'expected_negative_pass')
  if (!failed.length) {
    return { success: true, failureCount: 0, fileId: null, downloadUrl: null }
  }
  let md = `# PMIS AI Fix Prompt — Test ${run?.run_code || testRunId}\n\n`
  for (const fr of failed) {
    md += `## ${fr.case?.test_case_code} — ${fr.case?.title}\n\n`
    md += (fr.actual_result || fr.failure_reason || '—') + '\n\n'
  }
  const path = `${testRunId}/${run?.run_code || 'run'}_ai_fix_prompt.md`
  const blob = new Blob([md], { type: 'text/markdown' })
  const { data: { user } } = await platformDb.auth.getUser()
  const { data: u } = await platformDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
  const { data: up, error: uperr } = await platformDb.storage.from(EVIDENCE_BUCKET).upload(path, blob, { upsert: true, contentType: 'text/markdown' })
  if (uperr) return rowError(uperr)
  const { data: ev, error: ie } = await platformDb
    .from('tc_evidence_files')
    .insert({
      tc_test_run_id: testRunId,
      file_type: 'ai_fix_prompt',
      storage_path: up?.path || path,
      file_name: `${run?.run_code || 'run'}_ai_fix_prompt.md`,
      storage_bucket: EVIDENCE_BUCKET,
      description: 'Batch failure AI fix prompt',
      uploaded_by: u?.id || null,
    })
    .select()
    .single()
  if (ie) return rowError(ie)
  await platformDb
    .from('tc_test_runs')
    .update({ ai_fix_prompt_generated: true, ai_fix_prompt_file_id: ev.id })
    .eq('id', testRunId)
  const { data: pub } = await platformDb.storage.from(EVIDENCE_BUCKET).createSignedUrl(path, 3600)
  return { success: true, fileId: ev.id, downloadUrl: pub?.signedUrl, failureCount: failed.length }
}

export async function processTestRunCompletion(runId) {
  const s = await getSettings()
  if (!s.success) return s
  const auto = s.data?.auto_create_defects_on_failure === true || s.data?.auto_create_defects_on_failure === 'true'
  if (!auto) {
    if (s.data?.auto_generate_ai_fix_prompt) await generateBatchAiFixPrompt(runId)
    return { success: true, data: { defectsCreated: 0, defectsUpdated: 0, skipped: 0, autoDefectsOff: true } }
  }
  return { success: true, data: { defectsCreated: 0, defectsUpdated: 0, skipped: 0, message: 'Auto-defect pipeline: extend with projectId selection in UI' } }
}

// diagnostic sessions
export async function listDiagnosticSessions() {
  try {
    const { data, error } = await platformDb
      .from('tc_diagnostic_sessions')
      .select('*, module:affected_module_id (code, name)')
      .order('created_at', { ascending: false })
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (e) {
    return rowError(e)
  }
}

export async function getDiagnosticSession(id) {
  try {
    const { data, error } = await platformDb
      .from('tc_diagnostic_sessions')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return { success: true, data }
  } catch (e) {
    return rowError(e)
  }
}

