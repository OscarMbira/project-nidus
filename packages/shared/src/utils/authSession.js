/**
 * Read the current auth user from the local session without a network round-trip
 * to `/auth/v1/user`. Prefer this over `auth.getUser()` in UI hot paths — repeated
 * getUser() calls can spam 403 console errors when JWT validation fails transiently.
 *
 * platformDb and simDb share one auth storage key (packages/supabase), so either client reads
 * the same session; Simulator callers may pass simDb but do not need to.
 */

import { platformDb } from '@nidus/supabase'

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} [client]
 * @returns {Promise<{ user: import('@supabase/supabase-js').User | null, error: Error | null }>}
 */
export async function getAuthenticatedUser(client = platformDb) {
  try {
    const { data: { session }, error } = await client.auth.getSession()
    if (error) return { user: null, error }
    return { user: session?.user ?? null, error: null }
  } catch (error) {
    return { user: null, error }
  }
}

export default { getAuthenticatedUser }
