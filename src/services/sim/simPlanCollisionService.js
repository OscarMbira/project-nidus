import { simDb } from '../supabase/supabaseClient'

export async function getCollisionAlerts(practiceProjectId) {
  const { data, error } = await simDb
    .from('plan_collision_alerts')
    .select('*')
    .or(`practice_project_a_id.eq.${practiceProjectId},practice_project_b_id.eq.${practiceProjectId}`)
    .order('detected_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function acknowledgeAlert(id) {
  const { data, error } = await simDb.from('plan_collision_alerts').update({ status: 'acknowledged' }).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function resolveAlert(id) {
  const { data, error } = await simDb.from('plan_collision_alerts').update({ status: 'resolved' }).eq('id', id).select().single()
  if (error) throw error
  return data
}
