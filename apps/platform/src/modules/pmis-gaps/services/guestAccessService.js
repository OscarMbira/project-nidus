/**
 * Guest Access (GAP-19) — full CRUD on guest_collaborators, with token
 * generation/hashing/revocation on guest_access_tokens. v963 Phase 13 (Platform).
 * See SQL/v645_pmis_gap_tables_tier3.sql for schema.
 *
 * Security: a guest access token is shown in plaintext exactly once, in the
 * success-confirmation modal right after invite/reissue — the same "generate once,
 * show once" convention used by apps/platform/src/services/apiManagementService.js's
 * createApiKey()/regenerateApiSecret(). The token is SHA-256 hashed (Web Crypto) before
 * it is ever written to guest_access_tokens.token_hash; the plaintext value is never
 * persisted or re-derivable, and every other read path only ever sees the hash.
 */
import { platformDb } from '@nidus/supabase'
import { createGapRecord, updateGapRecord } from './gapDataService'

const GUEST_TABLE = 'guest_collaborators'
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

/** Masked reference for display after creation — never the plaintext token. */
export function maskToken(tokenHash) {
  if (!tokenHash) return '—'
  return `••••••••${tokenHash.slice(-6)}`
}

export async function listGuestCollaborators(projectId) {
  if (!projectId) return { success: true, data: [] }
  const { data, error } = await platformDb
    .from(GUEST_TABLE)
    .select('*')
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
  if (error) return { success: false, data: [], error: error.message }
  return { success: true, data: data || [] }
}

export async function getGuestCollaborator(id) {
  const { data: guest, error } = await platformDb.from(GUEST_TABLE).select('*').eq('id', id).maybeSingle()
  if (error) return { success: false, data: null, error: error.message }
  if (!guest) return { success: false, data: null, error: 'not_found' }
  const { data: tokens, error: tokensError } = await platformDb
    .from('guest_access_tokens')
    .select('id, issued_at, expires_at, revoked_at, last_used_at, token_hash')
    .eq('guest_id', id)
    .order('issued_at', { ascending: false })
  if (tokensError) return { success: false, data: null, error: tokensError.message }
  const maskedTokens = (tokens || []).map((t) => ({ ...t, masked_token: maskToken(t.token_hash), token_hash: undefined }))
  return { success: true, data: { ...guest, tokens: maskedTokens } }
}

/**
 * Creates the guest_collaborators row and its first access token.
 * @returns {{success:boolean, data?:{guest:object, plainToken:string}, error?:string}}
 */
export async function inviteGuest(projectId, { guest_email, guest_name, permission_level = 'view', expires_at = null }) {
  try {
    const guest = await createGapRecord(GUEST_TABLE, { project_id: projectId, guest_email, guest_name, permission_level, expires_at })
    const plainToken = generatePlainToken()
    const tokenHash = await sha256Hex(plainToken)
    const tokenExpiresAt = expires_at || new Date(Date.now() + DEFAULT_TOKEN_VALIDITY_DAYS * 24 * 60 * 60 * 1000).toISOString()
    const { error: tokenError } = await platformDb
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
    const data = await updateGapRecord(GUEST_TABLE, id, { guest_name, permission_level, expires_at, is_active })
    return { success: true, data }
  } catch (error) {
    return { success: false, data: null, error: error.message || 'Failed to update guest' }
  }
}

/** Reissues a fresh token for a guest, revoking any still-active prior tokens. */
export async function reissueGuestToken(guestId) {
  try {
    const { error: revokeError } = await platformDb
      .from('guest_access_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('guest_id', guestId)
      .is('revoked_at', null)
    if (revokeError) throw revokeError

    const plainToken = generatePlainToken()
    const tokenHash = await sha256Hex(plainToken)
    const expiresAt = new Date(Date.now() + DEFAULT_TOKEN_VALIDITY_DAYS * 24 * 60 * 60 * 1000).toISOString()
    const { error: insertError } = await platformDb
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
    const { error } = await platformDb
      .from('guest_access_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', tokenId)
    if (error) throw error
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message || 'Failed to revoke token' }
  }
}

/** Soft-deletes the guest (and, defensively, revokes any still-active tokens). */
export async function deleteGuestCollaborator(id) {
  try {
    await updateGapRecord(GUEST_TABLE, id, { is_deleted: true, is_active: false })
    await platformDb.from('guest_access_tokens').update({ revoked_at: new Date().toISOString() }).eq('guest_id', id).is('revoked_at', null)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message || 'Failed to remove guest' }
  }
}
