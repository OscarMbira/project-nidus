/**
 * Guest Access (GAP-19) — Simulator mirror of Platform's guestAccessService.js.
 * Full CRUD on sim.guest_collaborators, with token generation/hashing/revocation
 * on sim.guest_access_tokens. v963 Phase 13 (Simulator).
 * See SQL/v963m_sim_guest_access_training_tables.sql.
 *
 * Security: same "generate once, show once" convention as the Platform version —
 * the plaintext token is only ever returned from invite/reissue, hashed (SHA-256,
 * Web Crypto) before it touches the database, never persisted or re-derivable.
 */
import { simDb } from '@nidus/supabase'
import { createGapRecord, updateGapRecord } from './gapDataService'

const GUEST_TABLE = 'guest_collaborators'
const OPTS = { sim: true }
const DEFAULT_TOKEN_VALIDITY_DAYS = 30

function generatePlainToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function sha256Hex(text) {
  const encoded = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function maskToken(tokenHash) {
  if (!tokenHash) return '—'
  return `••••••••${tokenHash.slice(-6)}`
}

export async function listGuestCollaborators(practiceProjectId) {
  if (!practiceProjectId) return { success: true, data: [] }
  const { data, error } = await simDb
    .from(GUEST_TABLE)
    .select('*')
    .eq('practice_project_id', practiceProjectId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
  if (error) return { success: false, data: [], error: error.message }
  return { success: true, data: data || [] }
}

export async function getGuestCollaborator(id) {
  const { data: guest, error } = await simDb.from(GUEST_TABLE).select('*').eq('id', id).maybeSingle()
  if (error) return { success: false, data: null, error: error.message }
  if (!guest) return { success: false, data: null, error: 'not_found' }
  const { data: tokens, error: tokensError } = await simDb
    .from('guest_access_tokens')
    .select('id, issued_at, expires_at, revoked_at, last_used_at, token_hash')
    .eq('guest_id', id)
    .order('issued_at', { ascending: false })
  if (tokensError) return { success: false, data: null, error: tokensError.message }
  const maskedTokens = (tokens || []).map((t) => ({ ...t, masked_token: maskToken(t.token_hash), token_hash: undefined }))
  return { success: true, data: { ...guest, tokens: maskedTokens } }
}

export async function inviteGuest(practiceProjectId, { guest_email, guest_name, permission_level = 'view', expires_at = null }) {
  try {
    const guest = await createGapRecord(GUEST_TABLE, { practice_project_id: practiceProjectId, guest_email, guest_name, permission_level, expires_at }, OPTS)
    const plainToken = generatePlainToken()
    const tokenHash = await sha256Hex(plainToken)
    const tokenExpiresAt = expires_at || new Date(Date.now() + DEFAULT_TOKEN_VALIDITY_DAYS * 24 * 60 * 60 * 1000).toISOString()
    const { error: tokenError } = await simDb
      .from('guest_access_tokens')
      .insert({ guest_id: guest.id, token_hash: tokenHash, expires_at: tokenExpiresAt })
    if (tokenError) throw tokenError
    return { success: true, data: { guest, plainToken } }
  } catch (error) {
    return { success: false, data: null, error: error.message || 'Failed to invite guest' }
  }
}

export async function updateGuestPermissions(id, { guest_name, permission_level, expires_at, is_active }) {
  try {
    const data = await updateGapRecord(GUEST_TABLE, id, { guest_name, permission_level, expires_at, is_active }, OPTS)
    return { success: true, data }
  } catch (error) {
    return { success: false, data: null, error: error.message || 'Failed to update guest' }
  }
}

export async function reissueGuestToken(guestId) {
  try {
    const { error: revokeError } = await simDb
      .from('guest_access_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('guest_id', guestId)
      .is('revoked_at', null)
    if (revokeError) throw revokeError

    const plainToken = generatePlainToken()
    const tokenHash = await sha256Hex(plainToken)
    const expiresAt = new Date(Date.now() + DEFAULT_TOKEN_VALIDITY_DAYS * 24 * 60 * 60 * 1000).toISOString()
    const { error: insertError } = await simDb
      .from('guest_access_tokens')
      .insert({ guest_id: guestId, token_hash: tokenHash, expires_at: expiresAt })
    if (insertError) throw insertError
    return { success: true, data: { plainToken } }
  } catch (error) {
    return { success: false, data: null, error: error.message || 'Failed to reissue token' }
  }
}

export async function revokeGuestToken(tokenId) {
  try {
    const { error } = await simDb
      .from('guest_access_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', tokenId)
    if (error) throw error
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message || 'Failed to revoke token' }
  }
}

export async function deleteGuestCollaborator(id) {
  try {
    await updateGapRecord(GUEST_TABLE, id, { is_deleted: true, is_active: false }, OPTS)
    await simDb.from('guest_access_tokens').update({ revoked_at: new Date().toISOString() }).eq('guest_id', id).is('revoked_at', null)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message || 'Failed to remove guest' }
  }
}
