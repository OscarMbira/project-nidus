import { simDb } from '../services/supabase/supabaseClient'

/** Resolves sim schema users.id for the current auth session. */
export async function resolveSimInternalUserId() {
  const {
    data: { user },
    error: aErr,
  } = await simDb.auth.getUser()
  if (aErr || !user) return null
  const { data } = await simDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
  return data?.id ?? null
}
