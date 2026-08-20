// Field-level image/file attachments for the Dynamic Form Engine (v863 PRD/plan).
// Versioning model: "replace" inserts a new version row (same attachment_group_id,
// next version_number, is_current=true) rather than overwriting; "restore" does the
// same but copies an older version's file forward. "Delete" soft-deletes every
// version sharing a group id. See SQL/v861_form_field_attachments_table.sql.

import { platformDb, simDb } from '@nidus/supabase'
import { uploadFile, formatFileSize } from './fileUploadService'

export const FORM_FIELD_ATTACHMENTS_BUCKET = 'form-field-attachments'
export const MAX_ATTACHMENT_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB (PRD decision #5)
export const DEFAULT_MAX_FILES_PER_FIELD = 10
export const HARD_MAX_FILES_CEILING = 10

export const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml', 'image/webp']
export const DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]
export const ALL_ATTACHMENT_MIME_TYPES = [...IMAGE_MIME_TYPES, ...DOCUMENT_MIME_TYPES]

function getDb(mode = 'platform') {
  return mode === 'sim' ? simDb : platformDb
}

function getModeFolder(mode = 'platform') {
  return mode === 'sim' ? 'sim' : 'platform'
}

function ok(data) {
  return { success: true, data }
}

function fail(error) {
  return { success: false, message: error?.message || String(error), error }
}

export function isImageMimeType(mimeType) {
  return IMAGE_MIME_TYPES.includes(mimeType)
}

/** Client-side validation before an upload is attempted — mirrors the field's `accept`/`maxFiles` builder config. */
export function validateAttachmentFile(file, { accept = 'any', maxFiles = DEFAULT_MAX_FILES_PER_FIELD, currentCount = 0 } = {}) {
  if (!file) return 'No file selected.'
  if (accept === 'image' && !IMAGE_MIME_TYPES.includes(file.type)) {
    return 'This field only accepts image files (PNG, JPEG, GIF, SVG, WEBP).'
  }
  if (!ALL_ATTACHMENT_MIME_TYPES.includes(file.type)) {
    return `File type "${file.type || 'unknown'}" is not allowed.`
  }
  if (file.size > MAX_ATTACHMENT_FILE_SIZE_BYTES) {
    return `File is too large (${formatFileSize(file.size)}) — max ${formatFileSize(MAX_ATTACHMENT_FILE_SIZE_BYTES)}.`
  }
  if (currentCount >= maxFiles) {
    return `This field allows a maximum of ${maxFiles} file(s).`
  }
  return null
}

function sanitizeFileName(name) {
  return String(name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_')
}

function buildStoragePath({ mode, formInstanceId, fieldKey, groupId, version, fileName }) {
  return `${getModeFolder(mode)}/${formInstanceId}/${fieldKey}/${groupId}-v${version}-${sanitizeFileName(fileName)}`
}

/** Re-fetches a row when its display_id was blank at insert time — the AFTER INSERT trigger's
 *  UPDATE (v864) runs within the same statement but after the INSERT's own RETURNING is captured. */
async function resolveDisplayId(db, row) {
  if (row?.display_id) return row
  const { data } = await db
    .from('form_field_attachments')
    .select('*')
    .eq('id', row.id)
    .maybeSingle()
  return data || row
}

/** Current (non-deleted, is_current) attachments for one field, oldest first. */
export async function listFieldAttachments(formInstanceId, fieldKey, mode = 'platform') {
  try {
    if (!formInstanceId || !fieldKey) throw new Error('Form instance id and field key are required')
    const { data, error } = await getDb(mode)
      .from('form_field_attachments')
      .select('*')
      .eq('form_instance_id', formInstanceId)
      .eq('field_key', fieldKey)
      .eq('is_current', true)
      .eq('is_deleted', false)
      .order('uploaded_at', { ascending: true })
    if (error) throw error
    return ok(data || [])
  } catch (error) {
    return fail(error)
  }
}

/** Full version history for one logical attachment, newest first. */
export async function listAttachmentVersionHistory(attachmentGroupId, mode = 'platform') {
  try {
    if (!attachmentGroupId) throw new Error('Attachment group id is required')
    const { data, error } = await getDb(mode)
      .from('form_field_attachments')
      .select('*')
      .eq('attachment_group_id', attachmentGroupId)
      .eq('is_deleted', false)
      .order('version_number', { ascending: false })
    if (error) throw error
    return ok(data || [])
  } catch (error) {
    return fail(error)
  }
}

/** Upload a brand-new logical attachment (version 1). */
export async function uploadFieldAttachment(
  { formInstanceId, fieldKey, file, caption = null, uploadedByUserId = null },
  mode = 'platform',
) {
  try {
    if (!formInstanceId || !fieldKey || !file) {
      throw new Error('Form instance id, field key, and file are required')
    }
    const db = getDb(mode)
    const groupId = crypto.randomUUID()
    const storagePath = buildStoragePath({
      mode, formInstanceId, fieldKey, groupId, version: 1, fileName: file.name,
    })
    await uploadFile(file, FORM_FIELD_ATTACHMENTS_BUCKET, storagePath)

    const { data, error } = await db
      .from('form_field_attachments')
      .insert({
        id: groupId,
        attachment_group_id: groupId,
        form_instance_id: formInstanceId,
        field_key: fieldKey,
        version_number: 1,
        is_current: true,
        storage_bucket: FORM_FIELD_ATTACHMENTS_BUCKET,
        storage_path: storagePath,
        file_name: file.name,
        mime_type: file.type,
        file_size: file.size,
        caption: caption?.trim() || null,
        uploaded_by: uploadedByUserId,
      })
      .select('*')
      .single()
    if (error) throw error

    return ok(await resolveDisplayId(db, data))
  } catch (error) {
    return fail(error)
  }
}

/** Replace an existing logical attachment with a new file — inserts a new version, keeps history. */
export async function replaceFieldAttachment(
  { attachmentGroupId, file, caption = undefined, uploadedByUserId = null },
  mode = 'platform',
) {
  try {
    if (!attachmentGroupId || !file) throw new Error('Attachment group id and file are required')
    const db = getDb(mode)

    const { data: current, error: currentErr } = await db
      .from('form_field_attachments')
      .select('*')
      .eq('attachment_group_id', attachmentGroupId)
      .eq('is_current', true)
      .single()
    if (currentErr) throw currentErr

    const nextVersion = (current.version_number || 1) + 1
    const storagePath = buildStoragePath({
      mode,
      formInstanceId: current.form_instance_id,
      fieldKey: current.field_key,
      groupId: attachmentGroupId,
      version: nextVersion,
      fileName: file.name,
    })
    await uploadFile(file, FORM_FIELD_ATTACHMENTS_BUCKET, storagePath)

    const { error: retireErr } = await db
      .from('form_field_attachments')
      .update({ is_current: false })
      .eq('id', current.id)
    if (retireErr) throw retireErr

    const { data, error } = await db
      .from('form_field_attachments')
      .insert({
        attachment_group_id: attachmentGroupId,
        form_instance_id: current.form_instance_id,
        field_key: current.field_key,
        version_number: nextVersion,
        is_current: true,
        storage_bucket: FORM_FIELD_ATTACHMENTS_BUCKET,
        storage_path: storagePath,
        file_name: file.name,
        mime_type: file.type,
        file_size: file.size,
        caption: caption === undefined ? current.caption : (caption?.trim() || null),
        display_id: current.display_id || null,
        uploaded_by: uploadedByUserId,
      })
      .select('*')
      .single()
    if (error) throw error

    return ok(data)
  } catch (error) {
    return fail(error)
  }
}

/** Restore a prior version — appends a new current version carrying that version's file forward (append-only history, PRD decision #15). */
export async function restoreAttachmentVersion(
  { attachmentGroupId, versionNumber, uploadedByUserId = null },
  mode = 'platform',
) {
  try {
    if (!attachmentGroupId || !versionNumber) {
      throw new Error('Attachment group id and version number are required')
    }
    const db = getDb(mode)

    const [{ data: target, error: targetErr }, { data: current, error: currentErr }] = await Promise.all([
      db.from('form_field_attachments').select('*')
        .eq('attachment_group_id', attachmentGroupId)
        .eq('version_number', versionNumber)
        .single(),
      db.from('form_field_attachments').select('*')
        .eq('attachment_group_id', attachmentGroupId)
        .eq('is_current', true)
        .single(),
    ])
    if (targetErr) throw targetErr
    if (currentErr) throw currentErr

    if (target.id === current.id) return ok(current) // already current — nothing to do

    const nextVersion = (current.version_number || 1) + 1

    const { error: retireErr } = await db
      .from('form_field_attachments')
      .update({ is_current: false })
      .eq('id', current.id)
    if (retireErr) throw retireErr

    const { data, error } = await db
      .from('form_field_attachments')
      .insert({
        attachment_group_id: attachmentGroupId,
        form_instance_id: current.form_instance_id,
        field_key: current.field_key,
        version_number: nextVersion,
        is_current: true,
        storage_bucket: target.storage_bucket,
        storage_path: target.storage_path,
        file_name: target.file_name,
        mime_type: target.mime_type,
        file_size: target.file_size,
        caption: target.caption,
        display_id: current.display_id || null,
        uploaded_by: uploadedByUserId,
      })
      .select('*')
      .single()
    if (error) throw error

    return ok(data)
  } catch (error) {
    return fail(error)
  }
}

/** Soft-delete every version of a logical attachment (no per-version delete — rule 62 simplicity). */
export async function deleteFieldAttachment({ attachmentGroupId, deletedByUserId = null }, mode = 'platform') {
  try {
    if (!attachmentGroupId) throw new Error('Attachment group id is required')
    const { error } = await getDb(mode)
      .from('form_field_attachments')
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: deletedByUserId, is_current: false })
      .eq('attachment_group_id', attachmentGroupId)
    if (error) throw error
    return ok({ deleted: true })
  } catch (error) {
    return fail(error)
  }
}

/** Caption applies to the current version only — history keeps whatever caption it was uploaded with. */
export async function updateFieldAttachmentCaption({ attachmentGroupId, caption }, mode = 'platform') {
  try {
    if (!attachmentGroupId) throw new Error('Attachment group id is required')
    const { data, error } = await getDb(mode)
      .from('form_field_attachments')
      .update({ caption: caption?.trim() || null })
      .eq('attachment_group_id', attachmentGroupId)
      .eq('is_current', true)
      .select('*')
      .single()
    if (error) throw error
    return ok(data)
  } catch (error) {
    return fail(error)
  }
}

/** Signed, time-limited URL for preview/download (bucket is private). */
export async function getAttachmentSignedUrl(storagePath, mode = 'platform', expiresInSeconds = 3600) {
  try {
    if (!storagePath) throw new Error('Storage path is required')
    const { data, error } = await getDb(mode)
      .storage
      .from(FORM_FIELD_ATTACHMENTS_BUCKET)
      .createSignedUrl(storagePath, expiresInSeconds)
    if (error) throw error
    return ok(data.signedUrl)
  } catch (error) {
    return fail(error)
  }
}

/**
 * Resolve every attachment field's current attachments for export (PRD v863 §d decision #7).
 * Returns:
 *  - textValues: { [fieldKey]: string[] } — one line per file ("name — caption (size)"), which
 *    flows through the existing generic multi-value field handling in exportUtils.js (Excel/CSV/
 *    XML/JSON/Print-fallback/PDF-fallback all already render string arrays as one-item-per-line).
 *  - assets: { [fieldKey]: Array<{ file_name, caption, mime_type, file_size, display_id, url }> } —
 *    passed separately to exportRecordToWord/PPT/Print/PDF so image attachments can be embedded
 *    inline rather than only linked.
 * Callers should merge textValues into the record object passed to ExportRecordMenu and pass
 * assets as the `attachmentAssets` prop.
 */
export async function resolveAttachmentFieldsForExport(schema, values = {}, mode = 'platform') {
  try {
    const attachmentFieldKeys = (schema?.sections || [])
      .flatMap((s) => s.fields || [])
      .filter((f) => f.type === 'attachment')
      .map((f) => f.key)

    const textValues = {}
    const assets = {}

    await Promise.all(attachmentFieldKeys.map(async (key) => {
      const groupIds = Array.isArray(values[key]) ? values[key] : []
      if (!groupIds.length) {
        textValues[key] = []
        assets[key] = []
        return
      }
      const db = getDb(mode)
      const { data: rows, error: rowsError } = await db
        .from('form_field_attachments')
        .select('*')
        .in('attachment_group_id', groupIds)
        .eq('is_current', true)
        .eq('is_deleted', false)
      if (rowsError) {
        console.error(`resolveAttachmentFieldsForExport: failed to load attachments for field "${key}"`, rowsError)
      }
      const withUrls = await Promise.all((rows || []).map(async (row) => {
        const urlResult = await getAttachmentSignedUrl(row.storage_path, mode)
        return {
          file_name: row.file_name,
          caption: row.caption || '',
          mime_type: row.mime_type,
          file_size: row.file_size,
          display_id: row.display_id || '',
          url: urlResult.success ? urlResult.data : null,
        }
      }))
      assets[key] = withUrls
      textValues[key] = withUrls.map((a) => {
        const label = `${a.file_name}${a.caption ? ' — ' + a.caption : ''} (${formatFileSize(a.file_size)})`
        return a.url ? `${label} - ${a.url}` : label
      })
    }))

    return ok({ textValues, assets })
  } catch (error) {
    return fail(error)
  }
}
