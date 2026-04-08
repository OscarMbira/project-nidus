import { platformDb } from '../services/supabase/supabaseClient'

/** Resolves public.users.id for the current auth session. */
export async function resolveInternalUserId() {
  const { data: { user }, error: aErr } = await platformDb.auth.getUser()
  if (aErr || !user) return null
  const { data } = await platformDb
    .from('users')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('is_deleted', false)
    .maybeSingle()
  return data?.id ?? null
}
