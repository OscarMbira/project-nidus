/**
 * Training Tracker (GAP-20) — Simulator mirror of Platform's trainingService.js.
 * Full CRUD on sim.training_certifications (catalog) and
 * sim.member_training_records (per-user training/certification history, with
 * expiry tracking). v963 Phase 14 (Simulator).
 * See SQL/v963m_sim_guest_access_training_tables.sql.
 */
import { simDb } from '@nidus/supabase'
import { createGapRecord, updateGapRecord } from './gapDataService'

const CERT_TABLE = 'training_certifications'
const RECORD_TABLE = 'member_training_records'
const OPTS = { sim: true }

const EXPIRY_WARNING_DAYS = 30

/**
 * @param {string|null} expiryDate — ISO date string
 * @returns {'expired'|'expiring_soon'|'valid'|null}
 */
export function getExpiryStatus(expiryDate) {
  if (!expiryDate) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDate)
  const daysUntil = Math.floor((expiry - today) / (1000 * 60 * 60 * 24))
  if (daysUntil < 0) return 'expired'
  if (daysUntil <= EXPIRY_WARNING_DAYS) return 'expiring_soon'
  return 'valid'
}

// ── Certification catalog ────────────────────────────────────────────────────

export async function listCertifications() {
  const { data, error } = await simDb
    .from(CERT_TABLE)
    .select('*')
    .eq('is_deleted', false)
    .order('certification_name', { ascending: true })
  if (error) return { success: false, data: [], error: error.message }
  return { success: true, data: data || [] }
}

export async function getCertification(id) {
  const { data, error } = await simDb.from(CERT_TABLE).select('*').eq('id', id).maybeSingle()
  if (error) return { success: false, data: null, error: error.message }
  if (!data) return { success: false, data: null, error: 'not_found' }
  return { success: true, data }
}

export async function createCertification(payload) {
  try {
    const data = await createGapRecord(CERT_TABLE, payload, OPTS)
    return { success: true, data }
  } catch (error) {
    return { success: false, data: null, error: error.message || 'Failed to create certification' }
  }
}

export async function updateCertification(id, payload) {
  try {
    const data = await updateGapRecord(CERT_TABLE, id, payload, OPTS)
    return { success: true, data }
  } catch (error) {
    return { success: false, data: null, error: error.message || 'Failed to update certification' }
  }
}

export async function deleteCertification(id) {
  try {
    await updateGapRecord(CERT_TABLE, id, { is_deleted: true }, OPTS)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message || 'Failed to delete certification' }
  }
}

// ── Member training records ──────────────────────────────────────────────────

export async function listMemberTrainingRecords() {
  const {
    data: { user },
  } = await simDb.auth.getUser()
  if (!user) return { success: false, data: [], error: 'Not authenticated' }
  const { data, error } = await simDb
    .from(RECORD_TABLE)
    .select('*, certification:training_certifications(certification_name)')
    .eq('user_id', user.id)
    .eq('is_deleted', false)
    .order('expiry_date', { ascending: true, nullsFirst: false })
  if (error) return { success: false, data: [], error: error.message }
  return { success: true, data: data || [] }
}

export async function getMemberTrainingRecord(id) {
  const { data, error } = await simDb
    .from(RECORD_TABLE)
    .select('*, certification:training_certifications(certification_name)')
    .eq('id', id)
    .maybeSingle()
  if (error) return { success: false, data: null, error: error.message }
  if (!data) return { success: false, data: null, error: 'not_found' }
  return { success: true, data }
}

export async function createMemberTrainingRecord(payload) {
  try {
    const data = await createGapRecord(RECORD_TABLE, payload, OPTS)
    return { success: true, data }
  } catch (error) {
    return { success: false, data: null, error: error.message || 'Failed to create training record' }
  }
}

export async function updateMemberTrainingRecord(id, payload) {
  try {
    const data = await updateGapRecord(RECORD_TABLE, id, payload, OPTS)
    return { success: true, data }
  } catch (error) {
    return { success: false, data: null, error: error.message || 'Failed to update training record' }
  }
}

export async function deleteMemberTrainingRecord(id) {
  try {
    await updateGapRecord(RECORD_TABLE, id, { is_deleted: true }, OPTS)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message || 'Failed to delete training record' }
  }
}
