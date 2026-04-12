import { simDb } from '../supabase/supabaseClient'

export async function getConfidenceForecasts(practiceProjectId) {
  const { data, error } = await simDb
    .from('plan_confidence_forecasts')
    .select('*')
    .eq('practice_project_id', practiceProjectId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function setConfidence(payload) {
  const row = {
    practice_project_id: payload.practice_project_id,
    confidence_pct: payload.confidence_pct ?? 50,
    optimistic_date: payload.optimistic_date ?? null,
    likely_date: payload.likely_date ?? null,
    pessimistic_date: payload.pessimistic_date ?? null,
    uncertainty_band_days: payload.uncertainty_band_days ?? 0,
    basis_notes: payload.basis_notes ?? null,
    created_by: payload.created_by ?? null,
  }
  const { data, error } = await simDb.from('plan_confidence_forecasts').insert(row).select().single()
  if (error) throw error
  return data
}
