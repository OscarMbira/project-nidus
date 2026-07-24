/**
 * Project revenue entries (Platform)
 */

import { platformDb } from './supabase/supabaseClient'

export async function listRevenueEntries(projectId) {
  const { data, error } = await platformDb
    .from('project_revenue_entries')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .order('revenue_date', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createRevenueEntry(payload) {
  const { data, error } = await platformDb
    .from('project_revenue_entries')
    .insert({
      project_id: payload.project_id,
      revenue_date: payload.revenue_date || new Date().toISOString().slice(0, 10),
      amount: Number(payload.amount) || 0,
      currency: payload.currency || 'USD',
      revenue_type: payload.revenue_type || 'other',
      description: payload.description || null,
      is_confirmed: !!payload.is_confirmed,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateRevenueEntry(id, patch) {
  const { data, error } = await platformDb
    .from('project_revenue_entries')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export function sumAmounts(rows) {
  return (rows || []).reduce((s, r) => s + (Number(r.amount) || 0), 0)
}
