/**
 * Testing & Diagnostics Centre — Simulator (sim schema, simDb)
 */
import { simDb } from './supabase/supabaseClient'

function err(e) {
  return { success: false, message: e?.message || String(e), data: null }
}

export function suggestTestCaseCode() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `TC-SIM-NEW-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
}

async function resolveUserId() {
  const { data: { user } } = await simDb.auth.getUser()
  if (!user) return null
  const { data } = await simDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
  return data?.id || null
}

export async function createTestCase(payload) {
  try {
    const uid = await resolveUserId()
    const row = { ...payload, created_by: payload.created_by ?? uid, updated_by: payload.updated_by ?? uid }
    const { data, error } = await simDb.from('tc_test_cases').insert(row).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (e) {
    return err(e)
  }
}

export async function updateTestCase(id, payload) {
  try {
    const uid = await resolveUserId()
    const { data, error } = await simDb
      .from('tc_test_cases')
      .update({ ...payload, updated_at: new Date().toISOString(), updated_by: payload.updated_by ?? uid })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return { success: true, data }
  } catch (e) {
    return err(e)
  }
}

export async function getTestingDashboardMetrics() {
  try {
    const [c, s, e] = await Promise.all([
      simDb.from('tc_test_cases').select('id', { count: 'exact', head: true }).eq('is_active', true),
      simDb.from('tc_test_suites').select('id', { count: 'exact', head: true }).eq('is_active', true),
      simDb.from('tc_test_environments').select('id', { count: 'exact', head: true }).eq('is_active', true),
    ])
    return {
      success: true,
      data: {
        total_cases: c.count ?? 0,
        ready_cases: 0,
        automated_cases: 0,
        manual_cases: 0,
        draft_cases: 0,
        deprecated_cases: 0,
        active_suites: s.count ?? 0,
        active_environments: e.count ?? 0,
      },
    }
  } catch (e) {
    return err(e)
  }
}

export async function getTestRunDashboardMetrics(pEnv, days) {
  try {
    const { data, error } = await simDb
      .from('tc_test_runs')
      .select('passed_tests, failed_tests')
    if (error) throw error
    const passed = (data || []).reduce((a, r) => a + (r.passed_tests || 0), 0)
    const failed = (data || []).reduce((a, r) => a + (r.failed_tests || 0), 0)
    return { success: true, data: { passed, failed, runs_last_days: (data || []).length } }
  } catch (e) {
    return err(e)
  }
}

export async function getTestCase(id) {
  try {
    const { data, error } = await simDb
      .from('tc_test_cases')
      .select('*, module:module_id (id, code, name, route_path)')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return { success: true, data }
  } catch (e) {
    return err(e)
  }
}

export async function listTestCases(filters = {}) {
  try {
    let q = simDb
      .from('tc_test_cases')
      .select('*, module:module_id (id, code, name, route_path)')
      .order('updated_at', { ascending: false })
    if (filters.status) q = q.eq('status', filters.status)
    const { data, error } = await q
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (e) {
    return err(e)
  }
}

export async function getTestRunWithResults(id) {
  try {
    const { data: run, error: e1 } = await simDb
      .from('tc_test_runs')
      .select('*')
      .eq('id', id)
      .single()
    if (e1) throw e1
    const { data: results, error: e2 } = await simDb
      .from('tc_test_run_results')
      .select('*, case:tc_test_case_id (id, test_case_code, title, playwright_spec_path)')
      .eq('tc_test_run_id', id)
    if (e2) throw e2
    const { data: evi, error: e3 } = await simDb.from('tc_evidence_files').select('*').eq('tc_test_run_id', id)
    if (e3) throw e3
    return { success: true, data: { run, results: results || [], evidence: evi || [] } }
  } catch (e) {
    return err(e)
  }
}

export async function listTestRuns() {
  try {
    const { data, error } = await simDb
      .from('tc_test_runs')
      .select('*')
      .order('started_at', { ascending: false, nullsFirst: false })
      .limit(200)
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (e) {
    return err(e)
  }
}

export async function listTestSuites() {
  try {
    const { data, error } = await simDb.from('tc_test_suites').select('*').order('name')
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (e) {
    return err(e)
  }
}

export async function listTestModules() {
  try {
    const { data, error } = await simDb.from('tc_test_modules').select('*').order('name')
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (e) {
    return err(e)
  }
}

export async function listEnvironments() {
  try {
    const { data, error } = await simDb.from('tc_test_environments').select('*').order('name')
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (e) {
    return err(e)
  }
}

export async function getTestSuite() {
  return { success: true, data: null }
}

export async function getSettings() {
  try {
    const { data, error } = await simDb.from('tc_settings').select('*')
    if (error) throw error
    return { success: true, data: Object.fromEntries((data || []).map((r) => [r.setting_key, r.setting_value])) }
  } catch (e) {
    return err(e)
  }
}

export async function getDiagnosticSession() { return { success: true, data: null } }
export async function listDiagnosticSessions() {
  try {
    const { data, error } = await simDb.from('tc_diagnostic_sessions').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (e) {
    return err(e)
  }
}

export async function generateSingleAiFixPrompt() { return { success: false, message: 'not implemented' } }
export async function generateBatchAiFixPrompt() { return { success: false, message: 'not implemented' } }
export async function processTestRunCompletion() { return { success: true, data: {} } }
