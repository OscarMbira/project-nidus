/** Simulator — practice project costs (sim.project_cost_entries) */
import { simDb } from './supabase/supabaseClient'

export async function listSimCostEntries(practiceProjectId) {
  const { data, error } = await simDb
    .from('project_cost_entries')
    .select('*')
    .eq('practice_project_id', practiceProjectId)
    .eq('is_deleted', false)
    .order('entry_date', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createSimCostEntry(payload) {
  const { data, error } = await simDb
    .from('project_cost_entries')
    .insert({
      practice_project_id: payload.practice_project_id,
      budget_category_id: payload.budget_category_id || null,
      entry_date: payload.entry_date || new Date().toISOString().slice(0, 10),
      amount: Number(payload.amount) || 0,
      currency: payload.currency || 'USD',
      description: payload.description || null,
      entered_by_user_id: payload.entered_by_user_id,
      approval_status: payload.approval_status || 'recorded',
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function listSimBaselines(practiceProjectId) {
  const { data, error } = await simDb
    .from('project_budget_baselines')
    .select('*')
    .eq('practice_project_id', practiceProjectId)
    .eq('is_deleted', false)
    .order('version_number', { ascending: false })
  if (error) throw error
  return data || []
}
