/**
 * Read the current auth user from the local session without a network round-trip
 * to `/auth/v1/user`. Prefer this over `auth.getUser()` in UI hot paths — repeated
 * getUser() calls can spam 403 console errors when JWT validation fails transiently.
 */

import { platformDb } from '@nidus/supabase'

/**
 * @returns {Promise<{ user: import('@supabase/supabase-js').User | null, error: Error | null }>}
 */
export async function getAuthenticatedUser() {
  try {
    const { data: { session }, error } = await platformDb.auth.getSession()
    if (error) return { user: null, error }
    return { user: session?.user ?? null, error: null }
  } catch (error) {
    return { user: null, error }
  }
}

export default { getAuthenticatedUser }
