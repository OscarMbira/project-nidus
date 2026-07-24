/**
 * Recovery planning (M8)
 */

import { platformDb } from './supabase/supabaseClient'

export async function getRecoveryOptions(projectId) {
  const { data, error } = await platformDb
    .from('plan_recovery_options')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createRecoveryOption(payload) {
  const row = {
    project_id: payload.project_id,
    trigger_type: payload.trigger_type,
    trigger_source_id: payload.trigger_source_id ?? null,
    strategy: payload.strategy,
    strategy_description: payload.strategy_description,
    schedule_saving_days: payload.schedule_saving_days ?? 0,
    cost_impact: payload.cost_impact ?? 0,
    risk_impact: payload.risk_impact ?? null,
    requires_approval: !!payload.requires_approval,
    status: payload.status || 'suggested',
    generated_by_ai: !!payload.generated_by_ai,
  }
  const { data, error } = await platformDb.from('plan_recovery_options').insert(row).select().single()
  if (error) throw error
  return data
}

export async function suggestRecovery(projectId, payload) {
  return createRecoveryOption({
    ...payload,
    project_id: projectId,
    generated_by_ai: true,
    status: 'suggested',
  })
}

export async function applyRecovery(id) {
  const { data, error } = await platformDb
    .from('plan_recovery_options')
    .update({ status: 'applied', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function approveRecovery(id, approverId) {
  const { data, error } = await platformDb
    .from('plan_recovery_options')
    .update({
      status: 'approved',
      approved_by: approverId,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}
