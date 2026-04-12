/**
 * Project cost actuals + budget baselines (Platform public schema)
 */

import { platformDb } from './supabase/supabaseClient'

export async function listCostEntries(projectId) {
  const { data, error } = await platformDb
    .from('project_cost_entries')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .order('entry_date', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createCostEntry(payload) {
  const { data, error } = await platformDb
    .from('project_cost_entries')
    .insert({
      project_id: payload.project_id,
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

export async function updateCostEntry(id, patch) {
  const { data, error } = await platformDb
    .from('project_cost_entries')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCostEntry(id) {
  const { error } = await platformDb
    .from('project_cost_entries')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function listBudgetBaselines(projectId) {
  const { data, error } = await platformDb
    .from('project_budget_baselines')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .order('version_number', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createBudgetBaseline(payload) {
  const { data, error } = await platformDb
    .from('project_budget_baselines')
    .insert({
      project_id: payload.project_id,
      baseline_name: payload.baseline_name || 'Baseline',
      version_number: payload.version_number || 1,
      total_amount: payload.total_amount ?? null,
      categories_snapshot: payload.categories_snapshot || [],
      created_by_user_id: payload.created_by_user_id,
      is_locked: !!payload.is_locked,
      locked_at: payload.is_locked ? new Date().toISOString() : null,
    })
    .select()
    .single()
  if (error) throw error
  return data
}
