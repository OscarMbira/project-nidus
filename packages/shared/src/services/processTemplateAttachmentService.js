/**
 * Document-level image/file attachments for the process_templates system (v867 PRD/plan).
 * Companion to formFieldAttachmentService.js (v863) but document-level, not field-level —
 * process_templates has no field-type concept, so attachments here belong to the whole
 * document, keyed by pm_template_nodes.id. Pass platformDb/simDb explicitly (matches
 * pmTemplateNodeService.js's convention) plus `mode` ('platform'|'sim') for the storage
 * path prefix, since the caller already knows which schema it's working in.
 *
 * Versioning model identical to v863: attachment_group_id identifies the logical
 * attachment across versions; replace = new version row (old kept); restore = new
 * version carrying an old version's file forward; delete = soft-delete every version
 * sharing a group id. display_id assigned once on version_number=1, copied forward on
 * replace/restore.
 */

export const PROCESS_TEMPLATE_ATTACHMENTS_BUCKET = 'process-template-attachments'
export const MAX_ATTACHMENT_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB
export const DEFAULT_MAX_FILES = 10

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

function ok(data) {
  return { success: true, data }
}

function fail(error) {
  return { success: false, message: error?.message || String(error), error }
}

export function isImageMimeType(mimeType) {
  return IMAGE_MIME_TYPES.includes(mimeType)
}

export function formatFileSizeLabel(bytes) {
  if (!bytes && bytes !== 0) return ''
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

/** Client-side validation before an upload is attempted. */
export function validateAttachmentFile(file, { maxFiles = DEFAULT_MAX_FILES, currentCount = 0 } = {}) {
  if (!file) return 'No file selected.'
  if (!ALL_ATTACHMENT_MIME_TYPES.includes(file.type)) {
    return `File type "${file.type || 'unknown'}" is not allowed.`
  }
  if (file.size > MAX_ATTACHMENT_FILE_SIZE_BYTES) {
    return `File is too large (${formatFileSizeLabel(file.size)}) — max ${formatFileSizeLabel(MAX_ATTACHMENT_FILE_SIZE_BYTES)}.`
  }
  if (currentCount >= maxFiles) {
    return `This document allows a maximum of ${maxFiles} attachment(s).`
  }
  return null
}

function sanitizeFileName(name) {
  return String(name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_')
}

function buildStoragePath({ mode, templateNodeId, groupId, version, fileName }) {
  const modeFolder = mode === 'sim' ? 'sim' : 'platform'
  return `${modeFolder}/${templateNodeId}/${groupId}-v${version}-${sanitizeFileName(fileName)}`
}

async function uploadToProcessTemplateBucket(db, storagePath, file) {
  const { error: uploadError } = await db.storage
    .from(PROCESS_TEMPLATE_ATTACHMENTS_BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'application/octet-stream',
    })
  if (!uploadError) return
  const msg = String(uploadError.message || uploadError.error || '')
  if (/bucket not found/i.test(msg) || String(uploadError.statusCode) === '404') {
    throw new Error(
      'Storage bucket "process-template-attachments" is missing. Apply SQL/v866e_process_template_attachments_bucket_and_rls.sql (creates the bucket + RLS).',
    )
  }
  throw uploadError
}

async function resolveDisplayId(db, row) {
  if (row?.display_id) return row
  const { data } = await db
    .from('process_template_attachments')
    .select('*')
    .eq('id', row.id)
    .maybeSingle()
  return data || row
}

/** Current (non-deleted, is_current) attachments for one document, oldest first. */
export async function listDocumentAttachments(db, templateNodeId) {
  try {
    if (!db || !templateNodeId) throw new Error('Database client and template node id are required')
    const { data, error } = await db
      .from('process_template_attachments')
      .select('*')
      .eq('template_node_id', templateNodeId)
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
export async function listAttachmentVersionHistory(db, attachmentGroupId) {
  try {
    if (!db || !attachmentGroupId) throw new Error('Database client and attachment group id are required')
    const { data, error } = await db
      .from('process_template_attachments')
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
export async function uploadDocumentAttachment(
  db,
  { templateNodeId, file, caption = null, uploadedByUserId = null, mode = 'platform' },
) {
  try {
    if (!db || !templateNodeId || !file) {
      throw new Error('Database client, template node id, and file are required')
    }
    const groupId = crypto.randomUUID()
    const storagePath = buildStoragePath({ mode, templateNodeId, groupId, version: 1, fileName: file.name })

    await uploadToProcessTemplateBucket(db, storagePath, file)

    const { data, error } = await db
      .from('process_template_attachments')
      .insert({
        id: groupId,
        attachment_group_id: groupId,
        template_node_id: templateNodeId,
        version_number: 1,
        is_current: true,
        storage_bucket: PROCESS_TEMPLATE_ATTACHMENTS_BUCKET,
        storage_path: storagePath,
        file_name: file.name,
        mime_type: file.type || 'application/octet-stream',
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
export async function replaceDocumentAttachment(
  db,
  { attachmentGroupId, file, caption = undefined, uploadedByUserId = null, mode = 'platform' },
) {
  try {
    if (!db || !attachmentGroupId || !file) throw new Error('Database client, attachment group id, and file are required')

    const { data: current, error: currentErr } = await db
      .from('process_template_attachments')
      .select('*')
      .eq('attachment_group_id', attachmentGroupId)
      .eq('is_current', true)
      .single()
    if (currentErr) throw currentErr

    const nextVersion = (current.version_number || 1) + 1
    const storagePath = buildStoragePath({
      mode, templateNodeId: current.template_node_id, groupId: attachmentGroupId, version: nextVersion, fileName: file.name,
    })

    await uploadToProcessTemplateBucket(db, storagePath, file)

    const { error: retireErr } = await db
      .from('process_template_attachments')
      .update({ is_current: false })
      .eq('id', current.id)
    if (retireErr) throw retireErr

    const { data, error } = await db
      .from('process_template_attachments')
      .insert({
        attachment_group_id: attachmentGroupId,
        template_node_id: current.template_node_id,
        version_number: nextVersion,
        is_current: true,
        storage_bucket: PROCESS_TEMPLATE_ATTACHMENTS_BUCKET,
        storage_path: storagePath,
        file_name: file.name,
        mime_type: file.type || 'application/octet-stream',
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

/** Restore a prior version — appends a new current version carrying that version's file forward (append-only history). */
export async function restoreAttachmentVersion(db, { attachmentGroupId, versionNumber, uploadedByUserId = null }) {
  try {
    if (!db || !attachmentGroupId || !versionNumber) {
      throw new Error('Database client, attachment group id, and version number are required')
    }

    const [{ data: target, error: targetErr }, { data: current, error: currentErr }] = await Promise.all([
      db.from('process_template_attachments').select('*')
        .eq('attachment_group_id', attachmentGroupId)
        .eq('version_number', versionNumber)
        .single(),
      db.from('process_template_attachments').select('*')
        .eq('attachment_group_id', attachmentGroupId)
        .eq('is_current', true)
        .single(),
    ])
    if (targetErr) throw targetErr
    if (currentErr) throw currentErr

    if (target.id === current.id) return ok(current)

    const nextVersion = (current.version_number || 1) + 1

    const { error: retireErr } = await db
      .from('process_template_attachments')
      .update({ is_current: false })
      .eq('id', current.id)
    if (retireErr) throw retireErr

    const { data, error } = await db
      .from('process_template_attachments')
      .insert({
        attachment_group_id: attachmentGroupId,
        template_node_id: current.template_node_id,
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
export async function deleteDocumentAttachment(db, { attachmentGroupId, deletedByUserId = null }) {
  try {
    if (!db || !attachmentGroupId) throw new Error('Database client and attachment group id are required')
    const { error } = await db
      .from('process_template_attachments')
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: deletedByUserId, is_current: false })
      .eq('attachment_group_id', attachmentGroupId)
    if (error) throw error
    return ok({ deleted: true })
  } catch (error) {
    return fail(error)
  }
}

/** Caption applies to the current version only. */
export async function updateAttachmentCaption(db, { attachmentGroupId, caption }) {
  try {
    if (!db || !attachmentGroupId) throw new Error('Database client and attachment group id are required')
    const { data, error } = await db
      .from('process_template_attachments')
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
export async function getAttachmentSignedUrl(db, storagePath, expiresInSeconds = 3600) {
  try {
    if (!db || !storagePath) throw new Error('Database client and storage path are required')
    const { data, error } = await db.storage
      .from(PROCESS_TEMPLATE_ATTACHMENTS_BUCKET)
      .createSignedUrl(storagePath, expiresInSeconds)
    if (error) throw error
    return ok(data.signedUrl)
  } catch (error) {
    return fail(error)
  }
}

/**
 * Resolve a document's current attachments for export — mirrors
 * formFieldAttachmentService.resolveAttachmentFieldsForExport (v863), simplified for the
 * document-level (not per-field) shape here. Returns { textValues: string[], assets: [...] }
 * for use as ExportRecordMenu's `record.attachments` value and `attachmentAssets.attachments`.
 */
export async function resolveDocumentAttachmentsForExport(db, templateNodeId) {
  try {
    if (!db || !templateNodeId) throw new Error('Database client and template node id are required')
    const listResult = await listDocumentAttachments(db, templateNodeId)
    if (!listResult.success) throw new Error(listResult.message)

    const withUrls = await Promise.all(listResult.data.map(async (row) => {
      const urlResult = await getAttachmentSignedUrl(db, row.storage_path)
      return {
        file_name: row.file_name,
        caption: row.caption || '',
        mime_type: row.mime_type,
        file_size: row.file_size,
        display_id: row.display_id || '',
        url: urlResult.success ? urlResult.data : null,
      }
    }))

    const textValues = withUrls.map((a) => {
      const label = `${a.file_name}${a.caption ? ' — ' + a.caption : ''} (${formatFileSizeLabel(a.file_size)})`
      return a.url ? `${label} - ${a.url}` : label
    })

    return ok({ textValues, assets: withUrls })
  } catch (error) {
    return fail(error)
  }
}
