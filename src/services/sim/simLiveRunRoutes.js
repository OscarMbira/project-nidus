/** Resolve latest in-progress NPC simulation run for /simulator/run/active/* */
import { simDb } from '../supabase/supabaseClient'
import { getSimAuthUserId } from './simAuth'

export async function fetchLatestInProgressNpcRunId() {
  const uid = await getSimAuthUserId()
  const { data, error } = await simDb
    .from('simulation_runs')
    .select('id, simulation_state')
    .eq('user_id', uid)
    .eq('status', 'in_progress')
    .order('last_activity_at', { ascending: false })
    .limit(5)

  if (error) return { success: false, error: error.message, runId: null }

  const npcRun = (data || []).find((r) => r.simulation_state && typeof r.simulation_state === 'object' && r.simulation_state.v505)
  const fallback = data?.[0]

  const runId = npcRun?.id || fallback?.id || null
  return { success: !!runId, runId, error: runId ? null : 'No active run' }
}
