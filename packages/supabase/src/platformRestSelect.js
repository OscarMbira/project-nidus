/**
 * Direct PostgREST GET for the Platform (public) schema.
 * Bypasses supabase-js query execution for lightweight lists when the client
 * pipeline appears to hang (infinite loading in the UI).
 */
import { platformDb } from './supabaseClient'

const baseUrl = () => String(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
const anonKey = () => String(import.meta.env.VITE_SUPABASE_ANON_KEY || '')

/**
 * @param {AbortSignal} [signal]
 */
async function getAccessToken(signal) {
  const sessionPromise = platformDb.auth.getSession().then(({ data }) => data?.session ?? null)

  if (!signal) {
    const session = await sessionPromise
    return session?.access_token ?? anonKey()
  }

  return Promise.race([
    sessionPromise.then(s => s?.access_token ?? anonKey()),
    new Promise((_, rej) => {
      const fail = () => rej(new DOMException('Aborted', 'AbortError'))
      if (signal.aborted) fail()
      else signal.addEventListener('abort', fail, { once: true })
    }),
  ])
}

/**
 * @param {string} table — PostgREST table name (public schema)
 * @param {string} query — query string without leading ?, e.g. "select=id&is_deleted=eq.false"
 * @param {{ signal?: AbortSignal }} [opts]
 * @returns {Promise<any[]>}
 */
export async function platformPublicSelect(table, query, opts = {}) {
  const { signal } = opts
  const root = baseUrl()
  const anon = anonKey()
  if (!root || !anon) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.')
  }

  const token = await getAccessToken(signal)

  const url = `${root}/rest/v1/${encodeURIComponent(table)}?${query}`

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      apikey: anon,
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Accept-Profile': 'public',
    },
    signal,
  })

  if (!res.ok) {
    let msg = `Could not load ${table} (${res.status}).`
    try {
      const j = await res.json()
      if (j?.message) msg = String(j.message)
      else if (j?.error_description) msg = String(j.error_description)
      else if (typeof j?.hint === 'string' && j.hint) msg = `${msg} ${j.hint}`
    } catch {
      /* keep msg */
    }
    throw new Error(msg)
  }

  const data = await res.json()
  return Array.isArray(data) ? data : []
}
