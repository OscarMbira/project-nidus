/**
 * Lean Control Accounts — public.control_accounts (v1025)
 */
import { platformDb } from '@nidus/supabase'

export async function listControlAccounts(projectId) {
  const { data, error } = await platformDb
    .from('control_accounts')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .order('name', { ascending: true })
  if (error) return { success: false, data: [], error: error.message }
  return { success: true, data: data || [] }
}

export async function getControlAccount(id) {
  const { data, error } = await platformDb
    .from('control_accounts')
    .select('*')
    .eq('id', id)
    .eq('is_deleted', false)
    .maybeSingle()
  if (error) return { success: false, data: null, error: error.message }
  return { success: true, data }
}

export async function createControlAccount(projectId, fields, userId) {
  const row = {
    project_id: projectId,
    display_id: '',
    name: fields.name,
    code: fields.code || null,
    wbs_node_id: fields.wbs_node_id || null,
    work_package_id: fields.work_package_id || null,
    owner_user_id: fields.owner_user_id || null,
    budget_amount: fields.budget_amount ?? null,
    currency_code: fields.currency_code || null,
    status: fields.status || 'active',
    notes: fields.notes || null,
    created_by: userId || null,
    updated_by: userId || null,
  }
  const { data, error } = await platformDb.from('control_accounts').insert(row).select().single()
  if (error) return { success: false, data: null, error: error.message }
  return { success: true, data }
}

export async function updateControlAccount(id, fields, userId) {
  const patch = {
    name: fields.name,
    code: fields.code ?? null,
    wbs_node_id: fields.wbs_node_id || null,
    work_package_id: fields.work_package_id || null,
    owner_user_id: fields.owner_user_id || null,
    budget_amount: fields.budget_amount ?? null,
    currency_code: fields.currency_code || null,
    status: fields.status || 'active',
    notes: fields.notes || null,
    updated_by: userId || null,
    updated_at: new Date().toISOString(),
  }
  const { data, error } = await platformDb
    .from('control_accounts')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) return { success: false, data: null, error: error.message }
  return { success: true, data }
}

export async function softDeleteControlAccount(id, userId) {
  const { error } = await platformDb
    .from('control_accounts')
    .update({
      is_deleted: true,
      updated_by: userId || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) return { success: false, error: error.message }
  return { success: true }
}
