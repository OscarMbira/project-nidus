/**
 * v1272 — Ask Nidus client (Platform, Simulator and Planner share this file).
 *
 * Talks to the agent-run edge function (server-sent events) and to the AI tables through the
 * app's own Supabase client (useAppConfig().db: platformDb for Platform/Planner, simDb for the
 * Simulator). Organisation-level AI status and settings always live in public, so those calls
 * take platformDb.
 */

const FUNCTIONS_URL = `${String(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')}/functions/v1`
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

/** Raised when the AI gate refuses a request (not enabled, kill switch, credits, read-only). */
export class AiBlockedError extends Error {
  constructor(message, reason) {
    super(message)
    this.name = 'AiBlockedError'
    this.reason = reason
  }
}

/**
 * Split a server-sent-events buffer into complete JSON events and the unfinished remainder.
 * @param {string} buffer
 * @returns {{ events: object[], rest: string }}
 */
export function parseSseBuffer(buffer) {
  const events = []
  const parts = buffer.split('\n\n')
  const rest = parts.pop() ?? ''
  for (const part of parts) {
    const data = part
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n')
    if (!data) continue
    try {
      events.push(JSON.parse(data))
    } catch {
      /* ignore a malformed event */
    }
  }
  return { events, rest }
}

async function accessToken(db) {
  const { data } = await db.auth.getSession()
  const token = data?.session?.access_token
  if (!token) throw new Error('Please sign in again to use Ask Nidus.')
  return token
}

/**
 * Ask a question. Calls onEvent for each streamed event; resolves with the final 'done' event.
 * @param {object} args
 * @param {object} args.db           app Supabase client (auth session source)
 * @param {'platform'|'simulator'|'planner'} args.app
 * @param {string} args.question
 * @param {string|null} [args.conversationId]
 * @param {string|null} [args.projectId]
 * @param {string|null} [args.projectName]
 * @param {boolean} [args.scopeAll]  v1294: "All my projects" (multi-project roles; the server decides)
 * @param {(event: object) => void} [args.onEvent]
 * @param {AbortSignal} [args.signal]
 */
export async function askNidus({ db, app, question, conversationId = null, projectId = null, projectName = null, scopeAll = false, onEvent = () => {}, signal }) {
  const token = await accessToken(db)
  const res = await fetch(`${FUNCTIONS_URL}/agent-run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, apikey: ANON_KEY },
    body: JSON.stringify({ app, question, conversation_id: conversationId, project_id: projectId, project_name: projectName, scope_all: scopeAll === true }),
    signal,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    if (res.status === 403 && body.code === 'ai_blocked') throw new AiBlockedError(body.error, body.reason)
    throw new Error(body.error || `Ask Nidus is unavailable (${res.status}).`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let done = null
  for (;;) {
    const { value, done: finished } = await reader.read()
    if (finished) break
    buffer += decoder.decode(value, { stream: true })
    const parsed = parseSseBuffer(buffer)
    buffer = parsed.rest
    for (const event of parsed.events) {
      onEvent(event)
      if (event.type === 'done') done = event
      if (event.type === 'error') throw new Error(event.error)
    }
  }
  return done
}

/** POST to another AI edge function with the user's session (JSON in/out). */
export async function callAiFunction(db, name, body) {
  const token = await accessToken(db)
  const res = await fetch(`${FUNCTIONS_URL}/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, apikey: ANON_KEY },
    body: JSON.stringify(body || {}),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 403 && json.code === 'ai_blocked') throw new AiBlockedError(json.error, json.reason)
    throw new Error(json.error || `Request failed (${res.status}).`)
  }
  return json
}

// ── Conversations (RLS: own rows only) ───────────────────────────────────────

export async function listConversations(db, userId, limit = 30) {
  const { data, error } = await db
    .from('ai_conversations')
    .select('id, title, updated_at, created_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}

export async function loadMessages(db, conversationId) {
  const { data, error } = await db
    .from('ai_messages')
    .select('id, role, content, processed_by, structured_data, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function deleteConversation(db, conversationId) {
  const { error } = await db.from('ai_conversations').delete().eq('id', conversationId)
  if (error) throw error
}

export async function rateMessage(db, messageId, userId, rating) {
  const { error } = await db
    .from('ai_feedback')
    .upsert({ message_id: messageId, user_id: userId, rating }, { onConflict: 'message_id,user_id' })
  if (error) throw error
}

// ── Organisation AI status and settings (public) ─────────────────────────────

export async function getAiStatus(platformDb, accountId = null) {
  const { data, error } = await platformDb.rpc('ai_org_status', accountId ? { p_account_id: accountId } : {})
  if (error) throw error
  return data
}

export async function acceptAiConsent(platformDb, accountId = null) {
  const { data, error } = await platformDb.rpc('ai_accept_consent', { p_account_id: accountId })
  if (error) throw error
  return data
}

export async function updateOrgAiSettings(platformDb, { accountId = null, aiEnabled, conversationMonths, auditMonths, reportLanguageCode = null }) {
  const { data, error } = await platformDb.rpc('ai_update_org_settings', {
    p_account_id: accountId,
    p_ai_enabled: aiEnabled,
    p_conversation_retention_months: conversationMonths,
    p_audit_retention_months: auditMonths,
    p_report_language_code: reportLanguageCode,
  })
  if (error) throw error
  return data
}

export async function previewPurge(platformDb, accountId, months) {
  const { data, error } = await platformDb.rpc('ai_purge_preview', { p_account_id: accountId, p_conversation_retention_months: months })
  if (error) throw error
  return data || 0
}

export async function getOrgAiSettingsRow(platformDb, accountId) {
  const { data, error } = await platformDb
    .from('ai_settings')
    .select('organisation_id, ai_enabled, data_privacy_accepted_at, consent_accepted_by, conversation_retention_months, audit_retention_months, report_language_code, created_at, updated_at, updated_by')
    .eq('organisation_id', accountId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function listAiLanguages(platformDb) {
  const { data, error } = await platformDb
    .from('languages')
    .select('code, name, native_name')
    .eq('is_active', true)
    .eq('ai_supported', true)
    .order('name')
  if (error) throw error
  return data || []
}

/** Translated fixed AI messages for a language, falling back to English (D18). */
export async function getAiUiTexts(platformDb, languageCode) {
  const lang = String(languageCode || 'en').toLowerCase().split(/[-_]/)[0] || 'en'
  const { data, error } = await platformDb
    .from('ai_ui_messages')
    .select('message_key, language_code, message_text')
    .in('language_code', lang === 'en' ? ['en'] : [lang, 'en'])
  if (error) return {}
  const out = {}
  for (const row of data || []) if (row.language_code === 'en') out[row.message_key] = row.message_text
  for (const row of data || []) if (row.language_code === lang) out[row.message_key] = row.message_text
  return out
}

/** The signed-in user's auth id, internal id, name and saved language. */
export async function getAiUser(platformDb) {
  const { data: auth } = await platformDb.auth.getUser()
  const authUser = auth?.user
  if (!authUser) return null
  const { data } = await platformDb
    .from('users')
    .select('id, full_name, display_name, language_code')
    .eq('auth_user_id', authUser.id)
    .maybeSingle()
  return {
    authUserId: authUser.id,
    userId: data?.id || null,
    name: data?.full_name || data?.display_name || authUser.email,
    languageCode: data?.language_code || 'en-GB',
  }
}

// ── Results ──────────────────────────────────────────────────────────────────

/** Link for a result row from the catalogue route template, e.g. /risks/{id}. */
export function recordLink(basePath, routeTemplate, row) {
  if (!routeTemplate || !row?.__id) return null
  const path = routeTemplate
    .replace('{id}', encodeURIComponent(row.__id))
    .replace('{project_id}', encodeURIComponent(row.__project_id || ''))
  if (path.includes('{') || path.includes('//')) return null
  // Simulator templates already start with /simulator; don't double the base path.
  return basePath && !path.startsWith(basePath) ? `${basePath}${path}` : path
}

/**
 * v1295: the query for the records behind one grouped result row — the original description
 * (filters and project limits included) plus the row's group values. The database ignores the
 * aggregates and returns the matching records.
 */
export function drillSpec(result, row, limit = 200) {
  const spec = result?.spec
  if (result?.mode !== 'grouped' || !spec?.entity || !row) return null
  const groupKeys = (result.columns || []).filter((c) => !c.aggregate).map((c) => c.key)
  return { ...spec, drill: Object.fromEntries(groupKeys.map((k) => [k, row[k] ?? null])), limit }
}

/** v1295: run the drill-down query (same RLS and project limits; no AI, so no credits). */
export async function drillIntoGroup(db, result, row) {
  const spec = drillSpec(result, row)
  if (!spec) throw new Error('These records cannot be opened from here.')
  const { data, error } = await db.rpc('ai_run_query', { p_spec: spec })
  if (error) throw new Error(String(error.message || error).replace(/^AIQ(_EDITION)?:\s*/, ''))
  return data
}

/**
 * v1295: link to the register's list page (catalogue list_route). {project_id} needs all the
 * records shown to be in one project; otherwise the page opens with that project selected when
 * there is exactly one. Returns null when the register has no list page.
 */
export function registerLink(basePath, listRoute, rows = []) {
  if (!listRoute) return null
  const projects = [...new Set((rows || []).map((r) => r.__project_id).filter(Boolean))]
  let path = listRoute
  if (path.includes('{project_id}')) {
    if (projects.length !== 1) return null
    path = path.replace('{project_id}', encodeURIComponent(projects[0]))
  } else if (projects.length === 1 && !path.startsWith('/simulator')) {
    path += `${path.includes('?') ? '&' : '?'}projectId=${encodeURIComponent(projects[0])}`
  }
  return basePath && !path.startsWith(basePath) ? `${basePath}${path}` : path
}

/** Save an Ask Nidus answer as a Report Builder template (D11, story 16). */
export async function saveResultAsReport(db, { name, description, result, ownerUserId }) {
  const spec = { ...(result?.spec || {}) }
  delete spec.limit
  const { data, error } = await db
    .from('report_templates')
    .insert({
      template_name: name,
      template_description: description || result?.explanation || null,
      template_type: 'custom',
      primary_data_source: spec.entity || result?.entity,
      query_spec: spec,
      is_public: false,
      is_active: true,
      owner_user_id: ownerUserId || null,
    })
    .select('id, template_name')
    .single()
  if (error) throw error
  return data
}
