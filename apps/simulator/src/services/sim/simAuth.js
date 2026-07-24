/** Helpers for sim schema services — simulation_run.user_id & practice_projects.user_id reference auth.users */
import { simDb } from '../supabase/supabaseClient'

export async function getSimAuthUserId() {
  const {
    data: { user },
    error,
  } = await simDb.auth.getUser()
  if (error || !user?.id) throw new Error('Not authenticated')
  return user.id
}
