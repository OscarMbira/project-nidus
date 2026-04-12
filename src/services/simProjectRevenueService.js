import { simDb } from './supabase/supabaseClient'
import { sumAmounts } from './projectRevenueService'

export async function listSimRevenueEntries(practiceProjectId) {
  const { data, error } = await simDb
    .from('project_revenue_entries')
    .select('*')
    .eq('practice_project_id', practiceProjectId)
    .eq('is_deleted', false)
    .order('revenue_date', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createSimRevenueEntry(payload) {
  const { data, error } = await simDb
    .from('project_revenue_entries')
    .insert({
      practice_project_id: payload.practice_project_id,
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

export { sumAmounts }
