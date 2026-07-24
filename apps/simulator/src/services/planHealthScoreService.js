/**
 * Plan health scores (M4)
 */

import { platformDb } from './supabase/supabaseClient'

export async function calculateScore(projectId) {
  const { data: scoreId, error } = await platformDb.rpc('calculate_plan_health', { p_project_id: projectId })
  if (error) throw error
  const { data: row } = await platformDb.from('plan_health_scores').select('*').eq('id', scoreId).single()
  return row
}

export async function getScoreHistory(projectId, limit = 10) {
  const { data, error } = await platformDb
    .from('plan_health_scores')
    .select('*')
    .eq('project_id', projectId)
    .order('scored_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}

export async function getLatestScore(projectId) {
  const { data, error } = await platformDb
    .from('plan_health_scores')
    .select('*')
    .eq('project_id', projectId)
    .order('scored_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getPortfolioScores(orgId) {
  const { data: projects, error: pErr } = await platformDb.from('projects').select('id, project_name').eq('organisation_id', orgId)
  if (pErr) throw pErr
  const out = []
  for (const p of projects || []) {
    const latest = await getLatestScore(p.id)
    if (latest) out.push({ project_id: p.id, project_name: p.project_name, ...latest })
  }
  return out.sort((a, b) => (b.overall_score ?? 0) - (a.overall_score ?? 0))
}
