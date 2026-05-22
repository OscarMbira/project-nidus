/**
 * Centralised sign-out for Platform and Simulator.
 * Uses fetch timeouts so logout never hangs indefinitely.
 */

import { platformDb, simDb } from './supabase/supabaseClient'

const SIGN_OUT_TIMEOUT_MS = 6_000

const SESSION_CACHE_PREFIXES = [
  'nidus-pm-member-mgmt-projects',
  'nidus-internal-user-id',
]

/**
 * Clear app session caches (not auth tokens — signOut handles those).
 */
export function clearAppSessionCaches() {
  if (typeof sessionStorage === 'undefined') return
  const keys = []
  for (let i = 0; i < sessionStorage.length; i += 1) {
    const key = sessionStorage.key(i)
    if (key && SESSION_CACHE_PREFIXES.some((p) => key.startsWith(p))) {
      keys.push(key)
    }
  }
  keys.forEach((k) => sessionStorage.removeItem(k))
}

/**
 * @param {string} [pathname]
 * @returns {string}
 */
export function getLogoutRedirectPath(pathname = '') {
  return String(pathname || '').startsWith('/simulator')
    ? '/simulator/login'
    : '/platform/login'
}

/**
 * @param {{ simulator?: boolean }} [options]
 */
export async function performLogout(options = {}) {
  const db = options.simulator ? simDb : platformDb
  clearAppSessionCaches()

  const signOut = async () => {
    try {
      const { error } = await db.auth.signOut()
      if (error) throw error
    } catch (e) {
      console.warn('[performLogout] signOut:', e?.message || e)
      try {
        await db.auth.signOut({ scope: 'local' })
      } catch {
        /* ensure local session is cleared */
      }
    }
  }

  await Promise.race([
    signOut(),
    new Promise((resolve) => setTimeout(resolve, SIGN_OUT_TIMEOUT_MS)),
  ])
}
