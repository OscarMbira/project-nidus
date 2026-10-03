/**
 * Client Portal service (GAP-07, v963 Phase 10) — Simulator mirror of
 * apps/platform/src/services/clientPortalService.js. Always targets the `sim` schema (simDb).
 * sim.client_portal_configs links to sim.practice_projects via `practice_project_id`
 * (SQL/v963h_client_portal_sim_schema_mirror.sql), NOT NULL — every portal must be created
 * against a practice project.
 *
 * Security: same "generate once, show once" convention as the Platform version — the
 * plaintext guest access token is only ever returned from inviteGuest()/reissueGuestToken(),
 * SHA-256 hashed (Web Crypto) before it touches the database. listGuests() always strips the
 * hash and returns a masked reference instead.
 */
import { simDb } from '@nidus/supabase'
import {
  listGapRecords,
  getGapRecord,
  createGapRecord,
  updateGapRecord,
} from '../modules/pmis-gaps/services/gapDataService'

const SIM = { sim: true }

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

export async function listPortals() {
  const rows = await listGapRecords('client_portal_configs', { ...SIM, orderBy: 'portal_name', ascending: true })
  return (rows || []).filter((r) => !r.is_deleted)
}

export async function getPortal(id) {
  return getGapRecord('client_portal_configs', id, SIM)
}

export async function createPortal(payload) {
  const portal_slug = payload.portal_slug?.trim() || `${slugify(payload.portal_name)}-${randomSlugSuffix()}`
  return createGapRecord('client_portal_configs', { ...payload, portal_slug }, { ...SIM, setCreatedBy: true })
}

export async function updatePortal(id, payload) {
  return updateGapRecord('client_portal_configs', id, payload, SIM)
}

export async function deletePortal(id) {
  return updateGapRecord('client_portal_configs', id, { is_deleted: true }, SIM)
}

/** Practice projects the current user can create a portal for (practice_project_id is NOT NULL). */
export async function listProjectOptions() {
  const { data, error } = await simDb
    .from('practice_projects')
    .select('id, project_name')
    .order('project_name', { ascending: true })
  if (error) throw error
  return data || []
}

// ── Sections ───────────────────────────────────────────────────────────────

export async function listSections(portalId) {
  if (!portalId) return []
  const { data, error } = await simDb
    .from('client_portal_sections')
    .select('*')
    .eq('portal_id', portalId)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data || []
}

export async function createSection(portalId, payload) {
  return createGapRecord('client_portal_sections', { ...payload, portal_id: portalId }, SIM)
}

export async function updateSection(id, payload) {
  return updateGapRecord('client_portal_sections', id, payload, SIM)
}

/** Sections carry no is_deleted column — hard delete is correct here. */
export async function deleteSection(id) {
  const { error } = await simDb.from('client_portal_sections').delete().eq('id', id)
  if (error) throw error
}

// ── Guests ─────────────────────────────────────────────────────────────────

export async function listGuests(portalId) {
  if (!portalId) return []
  const { data, error } = await simDb
    .from('client_portal_guests')
    .select('*')
    .eq('portal_id', portalId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map((g) => ({ ...g, masked_token: maskToken(g.access_token_hash), access_token_hash: undefined }))
}

export async function inviteGuest(portalId, { guest_email, guest_name, expires_at = null }) {
  try {
    const { data: { user } } = await simDb.auth.getUser()
    const plainToken = generatePlainToken()
    const access_token_hash = await sha256Hex(plainToken)
    const guest = await createGapRecord('client_portal_guests', {
      portal_id: portalId,
      guest_email,
      guest_name,
      access_token_hash,
      expires_at,
      invited_by: user?.id || null,
    }, SIM)
    return { success: true, data: { guest, plainToken } }
  } catch (error) {
    return { success: false, data: null, error: error.message || 'Failed to invite guest' }
  }
}

export async function reissueGuestToken(guestId) {
  try {
    const plainToken = generatePlainToken()
    const access_token_hash = await sha256Hex(plainToken)
    const guest = await updateGapRecord('client_portal_guests', guestId, { access_token_hash }, SIM)
    return { success: true, data: { guest, plainToken } }
  } catch (error) {
    return { success: false, data: null, error: error.message || 'Failed to reissue token' }
  }
}

export async function revokeGuest(id) {
  try {
    await updateGapRecord('client_portal_guests', id, { is_deleted: true }, SIM)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message || 'Failed to revoke guest' }
  }
}
