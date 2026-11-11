/**
 * In-app sign-off for Local Register document records (v1318 PRD/plan). Mirrors the v868
 * process_templates sign-off (processTemplateSignatoryService.js) but every change goes through
 * the SECURITY DEFINER functions in SQL/v1319 — they enforce turn order, lock the record and
 * move its status (In Review → Approved, Draft on restart).
 *
 * Signatory role slots come from the existing Document Signatory configuration, keyed by the
 * document type `local_register:<register_key>`, with the same organisation → portfolio →
 * programme → project → team inheritance (resolveEffectiveSignatoryRequirements).
 *
 * Pass platformDb/simDb explicitly; `mode` ('platform'|'sim') prefixes signature storage paths.
 */
import { platformDb } from '@nidus/supabase'
import {
  getSavedSignature,
  getSignatureSignedUrl,
  resolveEffectiveSignatoryRequirements,
  validateSignatureFile,
  USER_SIGNATURES_BUCKET,
} from './processTemplateSignatoryService'

export const LOCAL_REGISTER_SIGNATURES_BUCKET = 'local-register-signatures'
export const REGISTER_DOCUMENT_TYPE_PREFIX = 'local_register:'
const TABLE = 'local_register_record_signatories'

function ok(data) {
  return { success: true, data }
}

function fail(error) {
  return { success: false, message: error?.message || String(error), error }
}

/** Document type key used by the Document Signatory configuration for a register. */
export function registerDocumentType(registerKey) {
  return `${REGISTER_DOCUMENT_TYPE_PREFIX}${registerKey}`
}

export function isRegisterDocumentType(documentTable) {
  return String(documentTable || '').startsWith(REGISTER_DOCUMENT_TYPE_PREFIX)
}

/**
 * Document registers the viewer can see, as Document Signatory document types:
 * [{ documentTable: 'local_register:<key>', label }], sorted by label. Platform: every visible
 * public register with is_document. Simulator (pass simDb): the system (public) document
 * registers plus the Simulator's own member-created document registers.
 */
export async function listRegisterDocumentTypes(db = platformDb) {
  try {
    const isSim = db !== platformDb
    let publicQuery = platformDb.from('local_registers').select('register_key, label').eq('is_document', true).eq('is_deleted', false)
    if (isSim) publicQuery = publicQuery.eq('is_system_defined', true)
    const queries = [publicQuery]
    if (isSim) queries.push(db.from('local_registers').select('register_key, label').eq('is_document', true).eq('is_deleted', false))
    const results = await Promise.all(queries)
    const failed = results.find((r) => r.error)
    if (failed) throw failed.error
    const byKey = new Map()
    results.flatMap((r) => r.data || []).forEach((r) => {
      if (r.register_key && !byKey.has(r.register_key)) byKey.set(r.register_key, r.label || r.register_key)
    })
    const list = [...byKey.entries()].map(([key, label]) => ({ documentTable: registerDocumentType(key), label }))
    list.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }))
    return ok(list)
  } catch (error) {
    return fail(error)
  }
}

/** Statuses that only sign-off sets on document registers (v1318; enforced by SQL/v1318 too). */
export const SIGNOFF_STATUS_KEYS = ['in_review', 'approved']

/** Status choices for the record form: document registers leave out the sign-off statuses
 *  (keeping the record's current one so it still displays). */
export function selectableRecordStatuses(register, currentStatus) {
  const workflow = register?.status_workflow || []
  if (!register?.is_document) return workflow
  return workflow.filter((s) => !SIGNOFF_STATUS_KEYS.includes(s.key) || s.key === currentStatus)
}

/** TRUE while the record is locked for sign-off (in progress or complete). */
export function isRecordLockedForSignoff(record) {
  return Boolean(record?.signoff_state) && record.signoff_state !== 'none'
}

/** Current round's slots, ordered (empty when sign-off has never started). */
export async function getRecordSignatories(db, recordId) {
  try {
    if (!db || !recordId) throw new Error('Database client and record id are required')
    const { data, error } = await db
      .from(TABLE)
      .select('*')
      .eq('record_id', recordId)
      .order('signing_round', { ascending: false })
      .order('slot_order', { ascending: true })
    if (error) throw error
    const rows = data || []
    const round = rows[0]?.signing_round || 0
    return ok(rows.filter((r) => r.signing_round === round))
  } catch (error) {
    return fail(error)
  }
}

/** Every round, newest first — the signing history. */
export async function getRecordSigningHistory(db, recordId) {
  try {
    if (!db || !recordId) throw new Error('Database client and record id are required')
    const { data, error } = await db
      .from(TABLE)
      .select('*')
      .eq('record_id', recordId)
      .order('signing_round', { ascending: false })
      .order('slot_order', { ascending: true })
    if (error) throw error
    return ok(data || [])
  } catch (error) {
    return fail(error)
  }
}

/**
 * Slots from a register's suggested signatory roles (local_registers.suggested_signatory_roles, v1338):
 * [{ role_label, is_mandatory }] or plain role names.
 */
export function suggestedSignatorySlots(suggestedRoles) {
  return (Array.isArray(suggestedRoles) ? suggestedRoles : [])
    .map((r) => (typeof r === 'string' ? { role_label: r } : r))
    .filter((r) => String(r?.role_label || '').trim())
    .map((r, i) => ({ role_label: String(r.role_label).trim(), is_mandatory: r.is_mandatory !== false, slot_order: i + 1 }))
}

/**
 * Effective role slots for a register document (Document Signatory configuration). When the
 * organisation has set none for this document type, the register's suggested roles are used
 * (source.mode 'register_default') — the author can still remove them before starting.
 */
export async function resolveRegisterSignatorySlots(db, { accountId, registerKey, projectId = null, suggestedRoles = null }) {
  const suggested = suggestedSignatorySlots(suggestedRoles)
  const fallback = (result) => (suggested.length && (!result?.success || !(result.data?.slots || []).length)
    ? ok({ slots: suggested, source: { scopeType: 'register', scopeId: null, mode: 'register_default' } })
    : result)
  if (!accountId || !registerKey) return fallback(ok({ slots: [], source: null }))
  const result = await resolveEffectiveSignatoryRequirements(db, {
    accountId,
    documentTable: registerDocumentType(registerKey),
    projectId: projectId || null,
  })
  return fallback(result)
}

async function rpc(db, fn, args) {
  const { data, error } = await db.rpc(fn, args)
  if (error) throw error
  return data
}

/**
 * Start sign-off. `slots` = [{ role_label, is_mandatory, assigned_user_id }] in signing order.
 * The record becomes read-only and its status In Review.
 */
export async function startRecordSignoff(db, { recordId, slots }) {
  try {
    if (!db || !recordId) throw new Error('Database client and record id are required')
    const payload = (slots || []).map((s) => ({
      role_label: s.role_label,
      is_mandatory: s.is_mandatory !== false,
      assigned_user_id: s.assigned_user_id || null,
    }))
    const missing = payload.find((s) => s.is_mandatory && !s.assigned_user_id)
    if (missing) throw new Error(`Choose a person for "${missing.role_label}" before starting sign-off.`)
    return ok(await rpc(db, 'local_register_signoff_start', { p_record_id: recordId, p_slots: payload }))
  } catch (error) {
    return fail(error)
  }
}

export async function assignRecordSignatory(db, { recordId, slotOrder, userId }) {
  try {
    return ok(await rpc(db, 'local_register_signoff_assign', { p_record_id: recordId, p_slot_order: slotOrder, p_user_id: userId || null }))
  } catch (error) {
    return fail(error)
  }
}

function fileExt(file) {
  const fromName = String(file?.name || '').split('.').pop()
  if (fromName && fromName.length <= 5) return fromName.toLowerCase()
  return String(file?.type || '').split('/').pop() || 'png'
}

/**
 * Sign the caller's slot: uses the given image, or the caller's saved signature, uploads it to
 * the record's signature folder, then records the signature (status Approved once the last
 * mandatory signatory signs).
 */
export async function signRecordSlot(db, { recordId, slotOrder, signingRound, file = null, mode = 'platform' }) {
  try {
    if (!db || !recordId || !slotOrder || !signingRound) throw new Error('Record, slot and round are required')
    let sourceFile = file
    if (!sourceFile) {
      // Saved signatures live in public.user_signature_images for both apps (v868).
      const saved = await getSavedSignature(platformDb)
      if (!saved.success || !saved.data) throw new Error('No saved signature found — please upload one.')
      const download = await platformDb.storage.from(saved.data.storage_bucket || USER_SIGNATURES_BUCKET).download(saved.data.storage_path)
      if (download.error) throw download.error
      sourceFile = new File([download.data], saved.data.file_name, { type: saved.data.mime_type })
    } else {
      const validationError = validateSignatureFile(sourceFile)
      if (validationError) throw new Error(validationError)
    }

    const storagePath = `${mode === 'sim' ? 'sim' : 'platform'}/${recordId}/${signingRound}/${slotOrder}/signature.${fileExt(sourceFile)}`
    const { error: uploadError } = await db.storage
      .from(LOCAL_REGISTER_SIGNATURES_BUCKET)
      .upload(storagePath, sourceFile, { cacheControl: '3600', upsert: true, contentType: sourceFile.type })
    if (uploadError) throw uploadError

    return ok(await rpc(db, 'local_register_signoff_sign', {
      p_record_id: recordId,
      p_slot_order: slotOrder,
      p_storage_path: storagePath,
      p_file_name: sourceFile.name,
      p_mime_type: sourceFile.type,
      p_file_size: sourceFile.size,
    }))
  } catch (error) {
    return fail(error)
  }
}

export async function declineRecordSlot(db, { recordId, slotOrder, reason }) {
  try {
    if (!reason || !reason.trim()) throw new Error('A reason is required to decline.')
    return ok(await rpc(db, 'local_register_signoff_decline', { p_record_id: recordId, p_slot_order: slotOrder, p_reason: reason.trim() }))
  } catch (error) {
    return fail(error)
  }
}

export async function lockRecordOptionalSlots(db, { recordId, reason }) {
  try {
    if (!reason || !reason.trim()) throw new Error('A reason is required.')
    return ok(await rpc(db, 'local_register_signoff_lock_optional', { p_record_id: recordId, p_reason: reason.trim() }) || [])
  } catch (error) {
    return fail(error)
  }
}

/** Close the current round (kept in history), unlock the record and return it to Draft. */
export async function restartRecordSignoff(db, { recordId, reason }) {
  try {
    if (!reason || !reason.trim()) throw new Error('A reason is required to restart sign-off.')
    await rpc(db, 'local_register_signoff_restart', { p_record_id: recordId, p_reason: reason.trim() })
    return ok(true)
  } catch (error) {
    return fail(error)
  }
}

export function getRecordSignatureUrl(db, storagePath) {
  return getSignatureSignedUrl(db, storagePath, 3600, LOCAL_REGISTER_SIGNATURES_BUCKET)
}

/** public.users id → display name, for signer names (assigned_user_id is public.users.id in both apps). */
export async function getUserNames(userIds) {
  const ids = [...new Set((userIds || []).filter(Boolean))]
  if (!ids.length) return new Map()
  const { data } = await platformDb.from('users').select('id, full_name, email').in('id', ids)
  return new Map((data || []).map((u) => [u.id, u.full_name || u.email || '']))
}

/**
 * Current round for the document export: one row per slot with name, project role, status,
 * signed date and a signed URL for the signature image.
 */
export async function resolveRecordSignatoriesForExport(db, recordId) {
  try {
    const result = await getRecordSignatories(db, recordId)
    if (!result.success) throw new Error(result.message)
    const names = await getUserNames(result.data.map((r) => r.assigned_user_id))
    const rows = await Promise.all(result.data.map(async (row) => {
      const url = row.status === 'signed' && row.storage_path ? await getRecordSignatureUrl(db, row.storage_path) : null
      return {
        slot_order: row.slot_order,
        role_label: row.role_label,
        name: names.get(row.assigned_user_id) || '',
        is_mandatory: row.is_mandatory !== false,
        status: row.status,
        signed_at: row.signed_at,
        decline_reason: row.decline_reason || '',
        signature_url: url?.success ? url.data : null,
      }
    }))
    return ok(rows)
  } catch (error) {
    return fail(error)
  }
}
