import { simDb } from '../supabase/supabaseClient'

export async function calculateScore(practiceProjectId) {
  const { count, error: cErr } = await simDb
    .from('plan_intelligence_findings')
    .select('id', { count: 'exact', head: true })
    .eq('practice_project_id', practiceProjectId)
    .eq('status', 'open')
  if (cErr) throw cErr
  const openFindings = count ?? 0

  const overall = Math.max(0, 100 - Math.min(100, openFindings * 8))
  const dim = overall
  const row = {
    practice_project_id: practiceProjectId,
    overall_score: overall,
    logic_quality: dim,
    dependency_completeness: dim,
    milestone_realism: dim,
    critical_path_stability: dim,
    baseline_discipline: dim,
    resource_feasibility: dim,
    scope_traceability: dim,
    risk_exposure: dim,
    change_pressure: dim,
    governance_readiness: dim,
    summary_notes: 'Derived from open intelligence findings count in simulator.',
    findings_count: openFindings || 0,
  }
  const { data, error } = await simDb.from('plan_health_scores').insert(row).select().single()
  if (error) throw error
  return data
}

export async function getLatestScore(practiceProjectId) {
  const { data, error } = await simDb
    .from('plan_health_scores')
    .select('*')
    .eq('practice_project_id', practiceProjectId)
    .order('scored_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getScoreHistory(practiceProjectId, limit = 10) {
  const { data, error } = await simDb
    .from('plan_health_scores')
    .select('*')
    .eq('practice_project_id', practiceProjectId)
    .order('scored_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}
