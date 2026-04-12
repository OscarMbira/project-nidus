/**
 * Confidence forecasts (M9)
 */

import { platformDb } from './supabase/supabaseClient'

export async function getConfidenceForecasts(projectId) {
  const { data, error } = await platformDb
    .from('plan_confidence_forecasts')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function setConfidence(payload) {
  const base = {
    project_id: payload.project_id,
    milestone_id: payload.milestone_id ?? null,
    task_id: payload.task_id ?? null,
    confidence_pct: payload.confidence_pct ?? 50,
    optimistic_date: payload.optimistic_date ?? null,
    likely_date: payload.likely_date ?? null,
    pessimistic_date: payload.pessimistic_date ?? null,
    uncertainty_band_days: payload.uncertainty_band_days ?? 0,
    basis_notes: payload.basis_notes ?? null,
    created_by: payload.created_by ?? null,
    updated_at: new Date().toISOString(),
  }

  let existing = null
  if (payload.task_id) {
    const { data } = await platformDb
      .from('plan_confidence_forecasts')
      .select('id')
      .eq('project_id', payload.project_id)
      .eq('task_id', payload.task_id)
      .maybeSingle()
    existing = data
  } else if (payload.milestone_id) {
    const { data } = await platformDb
      .from('plan_confidence_forecasts')
      .select('id')
      .eq('project_id', payload.project_id)
      .eq('milestone_id', payload.milestone_id)
      .maybeSingle()
    existing = data
  }

  if (existing?.id) {
    const { data, error } = await platformDb
      .from('plan_confidence_forecasts')
      .update(base)
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  const { data, error } = await platformDb.from('plan_confidence_forecasts').insert(base).select().single()
  if (error) throw error
  return data
}

export async function getProjectConfidenceSummary(projectId) {
  const rows = await getConfidenceForecasts(projectId)
  if (!rows.length) return { averagePct: null, count: 0 }
  const sum = rows.reduce((a, r) => a + (r.confidence_pct || 0), 0)
  return { averagePct: Math.round(sum / rows.length), count: rows.length }
}
