import { simDb } from '../supabase/supabaseClient'

export async function getRecoveryOptions(practiceProjectId) {
  const { data, error } = await simDb
    .from('plan_recovery_options')
    .select('*')
    .eq('practice_project_id', practiceProjectId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createRecoveryOption(payload) {
  const { data, error } = await simDb.from('plan_recovery_options').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function applyRecovery(id) {
  const { data, error } = await simDb.from('plan_recovery_options').update({ status: 'applied' }).eq('id', id).select().single()
  if (error) throw error
  return data
}
