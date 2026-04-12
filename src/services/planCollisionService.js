/**
 * Portfolio collision alerts (M7)
 */

import { platformDb } from './supabase/supabaseClient'

export async function detectCollisions(orgId) {
  const { data, error } = await platformDb.rpc('detect_portfolio_collisions', { p_org_id: orgId })
  if (error) throw error
  return data
}

export async function getCollisionAlerts(orgId, filters = {}) {
  let q = platformDb.from('plan_collision_alerts').select('*').eq('organisation_id', orgId)

  if (filters.severity) q = q.eq('severity', filters.severity)
  if (filters.collision_type) q = q.eq('collision_type', filters.collision_type)
  if (filters.status) q = q.eq('status', filters.status)

  q = q.order('detected_at', { ascending: false })
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function acknowledgeAlert(id) {
  const { data, error } = await platformDb
    .from('plan_collision_alerts')
    .update({ status: 'acknowledged' })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function resolveAlert(id, resolvedByProfileId) {
  const { data, error } = await platformDb
    .from('plan_collision_alerts')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      resolved_by: resolvedByProfileId ?? null,
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}
