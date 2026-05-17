import { platformDb } from '../../../services/supabase/supabaseClient'

/** Resolve public.users.id + platform account for LDE (same for Platform and Simulator UI). */
export async function resolveLdeAccountForCurrentUser() {
  const { data: { session } } = await platformDb.auth.getSession()
  const authUser = session?.user
  if (!authUser) return { userInternalId: null, accountId: null }

  const { data: userRecord } = await platformDb
    .from('users')
    .select('id')
    .eq('auth_user_id', authUser.id)
    .maybeSingle()
  if (!userRecord?.id) return { userInternalId: null, accountId: null }

  const userInternalId = userRecord.id

  const { data: owned } = await platformDb
    .from('accounts')
    .select('id')
    .eq('owner_user_id', userInternalId)
    .maybeSingle()
  if (owned?.id) return { userInternalId, accountId: owned.id }

  const { data: proj } = await platformDb
    .from('projects')
    .select('account_id')
    .eq('owner_user_id', userInternalId)
    .eq('is_deleted', false)
    .limit(1)
    .maybeSingle()

  return { userInternalId, accountId: proj?.account_id || null }
}
