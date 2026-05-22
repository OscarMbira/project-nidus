/**
 * Fetch-based PostgREST calls for project invitations.
 * Uses AbortController (reliable) instead of relying on Supabase client abortSignal alone.
 */

import { platformDb } from './supabase/supabaseClient'

export const INVITE_HARD_LIMIT_MS = 20_000
export const INVITE_RPC_FETCH_MS = 12_000
export const INVITE_TABLE_FETCH_MS = 8_000
export const INVITE_PREP_MS = 6_000

export const TIMEOUT_USER_MESSAGE =
  'Invitation timed out. Run SQL/v597_invite_rpc_pm_permissions_and_names.sql in Supabase (after v579 and v580), then NOTIFY pgrst, \'reload schema\'; hard-refresh and retry.'

const V597_HINT =
  'Run SQL/v597_invite_rpc_pm_permissions_and_names.sql in Supabase (after v579 and v580), then NOTIFY pgrst, \'reload schema\'; hard-refresh and retry.'

/**
 * User-facing invite error (RPC timeout, forbidden, missing function).
 * @param {string|null|undefined} rawError
 * @param {{ requiresDbSetup?: boolean }} [meta]
 */
export function formatInvitationInviteError(rawError, meta = {}) {
  const msg = String(rawError ?? '').trim()
  if (!msg) {
    return meta.requiresDbSetup
      ? `Invitation could not be saved. ${V597_HINT}`
      : 'Failed to send invitation'
  }

  if (msg === TIMEOUT_USER_MESSAGE || /invitation timed out|request timed out/i.test(msg)) {
    return TIMEOUT_USER_MESSAGE
  }

  if (/invitation rpc timed out|invitation save timed out|invitation setup timed out/i.test(msg)) {
    return `Invitation request timed out. ${V597_HINT}`
  }

  if (
    meta.requiresDbSetup ||
    /forbidden|42501|project invite access|membership required|not a pmo admin/i.test(msg)
  ) {
    if (/v597/i.test(msg)) return msg
    return `${msg} ${V597_HINT}`
  }

  if (/could not find the function|pgrst202|schema cache|42883/i.test(msg)) {
    return `${msg} Run SQL/v597 and v580 in Supabase, then reload the PostgREST schema.`
  }

  return msg
}

export function runWithHardTimeout(fn, ms = INVITE_HARD_LIMIT_MS) {
  return Promise.race([
    fn(),
    new Promise((resolve) =>
      setTimeout(
        () => resolve({ success: false, data: null, error: TIMEOUT_USER_MESSAGE }),
        ms,
      ),
    ),
  ])
}

/**
 * @returns {Promise<any|{ timedOut: true, error: string }>}
 */
export function raceWithTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((resolve) =>
      setTimeout(
        () =>
          resolve({
            timedOut: true,
            error: `${label} timed out after ${ms / 1000}s`,
          }),
        ms,
      ),
    ),
  ])
}

async function getAccessToken() {
  const { data: { session } } = await platformDb.auth.getSession()
  return session?.access_token ?? null
}

function supabaseRestBase() {
  return String(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
}

function supabaseAnonKey() {
  return import.meta.env.VITE_SUPABASE_ANON_KEY
}

async function parseJsonResponse(res) {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function errorMessageFromBody(body, fallback) {
  if (body && typeof body === 'object') {
    return body.message || body.error || body.hint || fallback
  }
  return typeof body === 'string' ? body : fallback
}

/**
 * @param {object} payload - RPC args from buildInvitationRpcPayload
 * @param {number} [timeoutMs]
 */
export async function postInviteRpc(payload, timeoutMs = INVITE_RPC_FETCH_MS) {
  const base = supabaseRestBase()
  const key = supabaseAnonKey()
  const token = await getAccessToken()
  if (!base || !key) {
    return { ok: false, status: 0, data: null, error: 'Supabase is not configured' }
  }
  if (!token) {
    return { ok: false, status: 401, data: null, error: 'Not authenticated' }
  }

  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), timeoutMs)
  try {
    const res = await fetch(`${base}/rest/v1/rpc/insert_project_invitation_as_pmo_admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
      signal: ac.signal,
    })
    const body = await parseJsonResponse(res)
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        data: body,
        error: errorMessageFromBody(body, res.statusText || 'RPC failed'),
      }
    }
    return { ok: true, status: res.status, data: body, error: null }
  } catch (e) {
    if (e?.name === 'AbortError') {
      return { ok: false, status: 408, data: null, error: 'Invitation RPC timed out' }
    }
    return { ok: false, status: 0, data: null, error: e?.message || 'RPC request failed' }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Direct POST to project_invitations (fallback when RPC missing or PM legacy path).
 */
export async function postInviteTableRow(row, selectCols, timeoutMs = INVITE_TABLE_FETCH_MS) {
  const base = supabaseRestBase()
  const key = supabaseAnonKey()
  const token = await getAccessToken()
  if (!base || !key) {
    return { ok: false, status: 0, data: null, error: 'Supabase is not configured' }
  }
  if (!token) {
    return { ok: false, status: 401, data: null, error: 'Not authenticated' }
  }

  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), timeoutMs)
  const select = encodeURIComponent(selectCols.replace(/\s/g, ''))
  try {
    const res = await fetch(`${base}/rest/v1/project_invitations?select=${select}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: `Bearer ${token}`,
        Prefer: 'return=representation',
      },
      body: JSON.stringify(row),
      signal: ac.signal,
    })
    const body = await parseJsonResponse(res)
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        data: body,
        error: errorMessageFromBody(body, res.statusText || 'Insert failed'),
      }
    }
    const rowData = Array.isArray(body) ? body[0] : body
    return { ok: true, status: res.status, data: rowData, error: null }
  } catch (e) {
    if (e?.name === 'AbortError') {
      return { ok: false, status: 408, data: null, error: 'Invitation save timed out' }
    }
    return { ok: false, status: 0, data: null, error: e?.message || 'Insert request failed' }
  } finally {
    clearTimeout(timer)
  }
}
