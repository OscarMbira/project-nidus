/**
 * Simulator Control Accounts — sim.control_accounts
 */
import { simDb } from '@nidus/supabase'

export async function listControlAccounts(practiceProjectId) {
  const { data, error } = await simDb
    .from('control_accounts')
    .select('*')
    .eq('practice_project_id', practiceProjectId)
    .eq('is_deleted', false)
    .order('name', { ascending: true })
  if (error) return { success: false, data: [], error: error.message }
  return { success: true, data: data || [] }
}

export async function createControlAccount(practiceProjectId, fields, userId) {
  const row = {
    practice_project_id: practiceProjectId,
    display_id: '',
    name: fields.name,
    code: fields.code || null,
    wbs_node_id: fields.wbs_node_id || null,
    budget_amount: fields.budget_amount ?? null,
    status: fields.status || 'active',
    notes: fields.notes || null,
    created_by: userId || null,
    updated_by: userId || null,
  }
  const { data, error } = await simDb.from('control_accounts').insert(row).select().single()
  if (error) return { success: false, data: null, error: error.message }
  return { success: true, data }
}

export async function updateControlAccount(id, fields, userId) {
  const { data, error } = await simDb
    .from('control_accounts')
    .update({
      name: fields.name,
      code: fields.code ?? null,
      wbs_node_id: fields.wbs_node_id || null,
      budget_amount: fields.budget_amount ?? null,
      status: fields.status || 'active',
      notes: fields.notes || null,
      updated_by: userId || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) return { success: false, data: null, error: error.message }
  return { success: true, data }
}

export async function softDeleteControlAccount(id, userId) {
  const { error } = await simDb
    .from('control_accounts')
    .update({ is_deleted: true, updated_by: userId || null, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { success: false, error: error.message }
  return { success: true }
}
