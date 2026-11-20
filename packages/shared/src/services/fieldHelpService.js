/**
 * Field-level contextual help — data access (v1345).
 *
 * Help text lives in public.field_help (+ public.field_help_aliases for Simulator keys, PD1) and
 * is read through the Platform client by every app (reference content, not practice data).
 * Usage events go to the calling app's own schema (PD5): pass that app's client as `eventsDb`
 * (platformDb → public.field_help_events, simDb → sim.field_help_events).
 *
 * Cache (rule 66, P8): help rows are kept in sessionStorage. Once per page load the newest
 * updated_at is read; when it differs from the cached version the cache is cleared, so edited
 * help shows up without a sign-out.
 */
import { platformDb } from '@nidus/supabase'

// v2: v1 entries could hold empty results from the form_key filter bug (fixed below) — discard them.
const CACHE_KEY = 'nidus:fieldHelp:v2'
const OPENED_KEY = 'nidus:fieldHelp:opened:v1'
const SESSION_KEY = 'nidus:fieldHelp:session:v1'

let versionCheck = null // one check per page load

function readCache() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null')
    if (parsed && typeof parsed === 'object' && parsed.entries) return parsed
  } catch { /* ignore */ }
  return { version: null, entries: {} }
}

function writeCache(cache) {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache)) } catch { /* quota / private mode */ }
}

/** For tests: forget the page-load version check. */
export function resetFieldHelpCacheForTests() {
  versionCheck = null
  try { sessionStorage.removeItem(CACHE_KEY); sessionStorage.removeItem(OPENED_KEY) } catch { /* ignore */ }
}

async function ensureFreshCache(db) {
  if (!versionCheck) {
    versionCheck = (async () => {
      const { data } = await db.from('field_help').select('updated_at').order('updated_at', { ascending: false }).limit(1)
      const latest = data?.[0]?.updated_at || null
      const cache = readCache()
      if (cache.version !== latest) writeCache({ version: latest, entries: {} })
    })().catch(() => { /* keep whatever is cached */ })
  }
  await versionCheck
}

const cacheId = (key, formKey, locale) => `${locale}|${formKey}|${key}`

/**
 * Load help for a set of field keys. Simulator keys (sim.*) resolve through aliases.
 * A form override (formKey) wins over the shared default.
 * @param {string[]} keys
 * @param {{ formKey?: string, locale?: string, db?: object }} [opts]
 * @returns {Promise<Record<string, object|null>>} key → help row (null when none exists)
 */
export async function loadFieldHelp(keys, { formKey = '', locale = 'en', db = platformDb } = {}) {
  const wanted = [...new Set((keys || []).filter(Boolean))]
  if (!wanted.length) return {}
  await ensureFreshCache(db)
  const cache = readCache()
  const result = {}
  const missing = []
  for (const key of wanted) {
    const id = cacheId(key, formKey, locale)
    if (Object.prototype.hasOwnProperty.call(cache.entries, id)) result[key] = cache.entries[id]
    else missing.push(key)
  }
  if (!missing.length) return result

  try {
    const aliasKeys = missing.filter((k) => k.startsWith('sim.'))
    const aliasMap = {}
    if (aliasKeys.length) {
      const { data, error } = await db.from('field_help_aliases').select('alias_key, help_key').in('alias_key', aliasKeys)
      if (error) throw error
      for (const row of data || []) aliasMap[row.alias_key] = row.help_key
    }
    const targetFor = (k) => aliasMap[k] || k
    const targets = [...new Set(missing.map(targetFor))]
    const { data, error } = await db
      .from('field_help')
      .select('help_key, form_key, title, purpose, examples, format_notes, extra_notes, learn_more_kind, learn_more_key, module_code, updated_at')
      .in('help_key', targets)
      .eq('locale', locale)
    // form_key is filtered here, not in the query: PostgREST cannot express '' inside in.() —
    // supabase-js sends in.() (an empty list), which matches nothing.
    if (error) throw error
    const byKey = {}
    for (const row of (data || []).filter((h) => !h.form_key || h.form_key === formKey)) {
      const current = byKey[row.help_key]
      if (!current || (row.form_key && !current.form_key)) byKey[row.help_key] = row
    }
    const fresh = readCache()
    for (const key of missing) {
      const row = byKey[targetFor(key)] || null
      result[key] = row
      fresh.entries[cacheId(key, formKey, locale)] = row
    }
    writeCache(fresh)
  } catch {
    // Help is an aid, never a blocker: on failure show plain labels (no false affordance, D10).
    for (const key of missing) result[key] = null
  }
  return result
}

function sessionId() {
  try {
    let id = sessionStorage.getItem(SESSION_KEY)
    if (!id) {
      id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
      sessionStorage.setItem(SESSION_KEY, id)
    }
    return id
  } catch {
    return null
  }
}

/** Record a popover open — at most once per key per browser session (P9). Fire-and-forget. */
export async function recordFieldHelpOpen(eventsDb, helpKey) {
  if (!eventsDb || !helpKey) return
  try {
    const opened = JSON.parse(sessionStorage.getItem(OPENED_KEY) || '[]')
    if (opened.includes(helpKey)) return
    sessionStorage.setItem(OPENED_KEY, JSON.stringify([...opened, helpKey]))
  } catch { /* still record */ }
  try {
    await eventsDb.from('field_help_events').insert({ help_key: helpKey, event_type: 'open', session_id: sessionId() })
  } catch { /* usage data is best-effort */ }
}

/** Record "Was this helpful?" — one vote per user per key; a new vote replaces the old (P9). */
export async function recordFieldHelpVote(eventsDb, helpKey, helpful) {
  if (!eventsDb || !helpKey) return { success: false }
  try {
    await eventsDb.from('field_help_events').delete().eq('help_key', helpKey).in('event_type', ['helpful_yes', 'helpful_no'])
    const { error } = await eventsDb.from('field_help_events')
      .insert({ help_key: helpKey, event_type: helpful ? 'helpful_yes' : 'helpful_no', session_id: sessionId() })
    if (error) throw error
    return { success: true }
  } catch (e) {
    return { success: false, error: e?.message }
  }
}
