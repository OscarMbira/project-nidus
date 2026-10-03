/**
 * Client Portal service (GAP-07, v963 Phase 10) — Portal configs / Sections / Guests CRUD.
 * Reuses the generic pmis-gaps gapDataService helpers for plain single-table CRUD.
 * Mirrors the shape of intakeFormService.js (dual-mode via `{ sim }`, same as okrService.js).
 *
 * Security: a guest's portal access token is a single hash stored directly on
 * client_portal_guests.access_token_hash (unlike Guest Access's separate multi-token table) —
 * "generate once, show once": the plaintext is only ever returned from inviteGuest()/
 * reissueGuestToken(), SHA-256 hashed (Web Crypto) before it touches the database, never
 * persisted or re-derivable. listGuests() always strips the hash and returns a masked
 * reference instead, same convention as guestAccessService.js's maskToken().
 */
import { platformDb, simDb } from '@nidus/supabase'
import {
  listGapRecords,
  getGapRecord,
  createGapRecord,
  updateGapRecord,
} from '../modules/pmis-gaps/services/gapDataService'

function client(sim) {
  return sim ? simDb : platformDb
}

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

/** Masked reference for display — never the plaintext token. */
export function maskToken(tokenHash) {
  if (!tokenHash) return '—'
  return `••••••••${tokenHash.slice(-6)}`
}

function randomSlugSuffix() {
  return Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => b.toString(16).padStart(2, '0')).join('')
}

function slugify(name) {
  return String(name || 'portal')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60) || 'portal'
}

// ── Portals ────────────────────────────────────────────────────────────────

export async function listPortals({ sim = false } = {}) {
  const rows = await listGapRecords('client_portal_configs', { sim, orderBy: 'portal_name', ascending: true })
  return (rows || []).filter((r) => !r.is_deleted)
}

export async function getPortal(id, { sim = false } = {}) {
  return getGapRecord('client_portal_configs', id, { sim })
}

export async function createPortal(payload, opts = {}) {
  const { sim = false } = opts
  const portal_slug = payload.portal_slug?.trim() || `${slugify(payload.portal_name)}-${randomSlugSuffix()}`
  return createGapRecord('client_portal_configs', { ...payload, portal_slug }, { sim, setCreatedBy: true })
}

export async function updatePortal(id, payload, opts = {}) {
  const { sim = false } = opts
  return updateGapRecord('client_portal_configs', id, payload, { sim })
}

export async function deletePortal(id, { sim = false } = {}) {
  return updateGapRecord('client_portal_configs', id, { is_deleted: true }, { sim })
}

/** Projects the current user can create a portal for (client_portal_configs.project_id is NOT NULL). */
export async function listProjectOptions({ sim = false } = {}) {
  const db = client(sim)
  const table = sim ? 'practice_projects' : 'projects'
  const select = sim ? 'id, project_name' : 'id, project_name, project_code'
  const query = db.from(table).select(select).order('project_name', { ascending: true })
  const { data, error } = sim ? await query : await query.eq('is_deleted', false)
  if (error) throw error
  return data || []
}

// ── Sections ───────────────────────────────────────────────────────────────

export async function listSections(portalId, { sim = false } = {}) {
  if (!portalId) return []
  const db = client(sim)
  const { data, error } = await db
    .from('client_portal_sections')
    .select('*')
    .eq('portal_id', portalId)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data || []
}

export async function createSection(portalId, payload, opts = {}) {
  const { sim = false } = opts
  return createGapRecord('client_portal_sections', { ...payload, portal_id: portalId }, { sim })
}

export async function updateSection(id, payload, opts = {}) {
  const { sim = false } = opts
  return updateGapRecord('client_portal_sections', id, payload, { sim })
}

/** Sections carry no is_deleted column (schema: v644/v963h) — hard delete is correct here. */
export async function deleteSection(id, { sim = false } = {}) {
  const db = client(sim)
  const { error } = await db.from('client_portal_sections').delete().eq('id', id)
  if (error) throw error
}

// ── Guests ─────────────────────────────────────────────────────────────────

export async function listGuests(portalId, { sim = false } = {}) {
  if (!portalId) return []
  const db = client(sim)
  const { data, error } = await db
    .from('client_portal_guests')
    .select('*')
    .eq('portal_id', portalId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map((g) => ({ ...g, masked_token: maskToken(g.access_token_hash), access_token_hash: undefined }))
}

/**
 * Creates the guest row with a freshly generated, hashed access token.
 * @returns {{success:boolean, data?:{guest:object, plainToken:string}, error?:string}}
 */
export async function inviteGuest(portalId, { guest_email, guest_name, expires_at = null }, opts = {}) {
  const { sim = false } = opts
  try {
    const db = client(sim)
    const { data: { user } } = await db.auth.getUser()
    const plainToken = generatePlainToken()
    const access_token_hash = await sha256Hex(plainToken)
    const guest = await createGapRecord('client_portal_guests', {
      portal_id: portalId,
      guest_email,
      guest_name,
      access_token_hash,
      expires_at,
      invited_by: user?.id || null,
    }, { sim })
    return { success: true, data: { guest, plainToken } }
  } catch (error) {
    return { success: false, data: null, error: error.message || 'Failed to invite guest' }
  }
}

/** Reissues a fresh token for an existing guest (replaces the stored hash in place). */
export async function reissueGuestToken(guestId, opts = {}) {
  const { sim = false } = opts
  try {
    const plainToken = generatePlainToken()
    const access_token_hash = await sha256Hex(plainToken)
    const guest = await updateGapRecord('client_portal_guests', guestId, { access_token_hash }, { sim })
    return { success: true, data: { guest, plainToken } }
  } catch (error) {
    return { success: false, data: null, error: error.message || 'Failed to reissue token' }
  }
}

/** Revokes guest access (soft-delete — matches the table's is_deleted list filter). */
export async function revokeGuest(id, opts = {}) {
  const { sim = false } = opts
  try {
    await updateGapRecord('client_portal_guests', id, { is_deleted: true }, { sim })
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message || 'Failed to revoke guest' }
  }
}
