/**
 * Attachments on Local Register document records (v1318) — shown as Annexure A, B, … in the
 * complete document export. Same versioning model and limits as process_templates document
 * attachments (v867, processTemplateAttachmentService.js): replace = new version (old kept),
 * restore = new version carrying an old file forward, delete = soft-delete every version.
 * The one addition is a required annexure title (defaults to the file name).
 *
 * Pass platformDb/simDb explicitly plus `mode` ('platform'|'sim') for the storage path prefix.
 * Writes are refused by RLS while the record is locked for sign-off.
 */
import {
  DEFAULT_MAX_FILES,
  formatFileSizeLabel,
  isImageMimeType,
  validateAttachmentFile,
} from './processTemplateAttachmentService'
import { hasReadableContent, readAnnexureContent } from '../utils/annexureContent'
import { withTimeout } from '../utils/asyncUtils'
import { peekSignedImage, resolveSignedImage } from './signedImageCache'

export const LOCAL_REGISTER_ATTACHMENTS_BUCKET = 'local-register-attachments'
const TABLE = 'local_register_record_attachments'

function ok(data) {
  return { success: true, data }
}

function fail(error) {
  return { success: false, message: error?.message || String(error), error }
}

function sanitizeFileName(name) {
  return String(name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_')
}

/** "Process flow.png" → "Process flow" — the default annexure title. */
export function defaultAnnexureTitle(fileName) {
  const base = String(fileName || '').replace(/\.[^.]+$/, '').trim()
  return base || 'Attachment'
}

function buildStoragePath({ mode, recordId, groupId, version, fileName }) {
  const modeFolder = mode === 'sim' ? 'sim' : 'platform'
  return `${modeFolder}/${recordId}/${groupId}-v${version}-${sanitizeFileName(fileName)}`
}

async function upload(db, storagePath, file) {
  const { error } = await db.storage
    .from(LOCAL_REGISTER_ATTACHMENTS_BUCKET)
    .upload(storagePath, file, { cacheControl: '3600', upsert: false, contentType: file.type || 'application/octet-stream' })
  if (!error) return
  if (/bucket not found/i.test(String(error.message || '')) || String(error.statusCode) === '404') {
    throw new Error('Storage bucket "local-register-attachments" is missing. Apply SQL/v1318_register_document_engine_schema.sql.')
  }
  throw error
}

/** Current attachments of a record, oldest first (that order gives the annexure letters). */
export async function listRecordAttachments(db, recordId) {
  try {
    if (!db || !recordId) throw new Error('Database client and record id are required')
    const { data, error } = await db
      .from(TABLE)
      .select('*')
      .eq('record_id', recordId)
      .eq('is_current', true)
      .eq('is_deleted', false)
      .order('uploaded_at', { ascending: true })
    if (error) throw error
    return ok(data || [])
  } catch (error) {
    return fail(error)
  }
}

export async function listRecordAttachmentVersions(db, attachmentGroupId) {
  try {
    if (!db || !attachmentGroupId) throw new Error('Database client and attachment group id are required')
    const { data, error } = await db
      .from(TABLE)
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

export async function uploadRecordAttachment(db, { recordId, file, title = null, uploadedByUserId = null, mode = 'platform' }) {
  try {
    if (!db || !recordId || !file) throw new Error('Database client, record id, and file are required')
    const groupId = crypto.randomUUID()
    const storagePath = buildStoragePath({ mode, recordId, groupId, version: 1, fileName: file.name })
    await upload(db, storagePath, file)
    const { data, error } = await db
      .from(TABLE)
      .insert({
        id: groupId,
        attachment_group_id: groupId,
        record_id: recordId,
        version_number: 1,
        is_current: true,
        annexure_title: title?.trim() || defaultAnnexureTitle(file.name),
        storage_bucket: LOCAL_REGISTER_ATTACHMENTS_BUCKET,
        storage_path: storagePath,
        file_name: file.name,
        mime_type: file.type || 'application/octet-stream',
        file_size: file.size,
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

async function getCurrent(db, attachmentGroupId) {
  const { data, error } = await db.from(TABLE).select('*').eq('attachment_group_id', attachmentGroupId).eq('is_current', true).single()
  if (error) throw error
  return data
}

async function insertNextVersion(db, current, fields, uploadedByUserId) {
  const { error: retireErr } = await db.from(TABLE).update({ is_current: false }).eq('id', current.id)
  if (retireErr) throw retireErr
  const { data, error } = await db
    .from(TABLE)
    .insert({
      attachment_group_id: current.attachment_group_id,
      record_id: current.record_id,
      version_number: (current.version_number || 1) + 1,
      is_current: true,
      annexure_title: current.annexure_title,
      display_id: current.display_id || null,
      uploaded_by: uploadedByUserId,
      ...fields,
    })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function replaceRecordAttachment(db, { attachmentGroupId, file, uploadedByUserId = null, mode = 'platform' }) {
  try {
    if (!db || !attachmentGroupId || !file) throw new Error('Database client, attachment group id, and file are required')
    const current = await getCurrent(db, attachmentGroupId)
    const storagePath = buildStoragePath({
      mode, recordId: current.record_id, groupId: attachmentGroupId, version: (current.version_number || 1) + 1, fileName: file.name,
    })
    await upload(db, storagePath, file)
    return ok(await insertNextVersion(db, current, {
      storage_bucket: LOCAL_REGISTER_ATTACHMENTS_BUCKET,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type || 'application/octet-stream',
      file_size: file.size,
    }, uploadedByUserId))
  } catch (error) {
    return fail(error)
  }
}

export async function restoreRecordAttachmentVersion(db, { attachmentGroupId, versionNumber, uploadedByUserId = null }) {
  try {
    if (!db || !attachmentGroupId || !versionNumber) throw new Error('Database client, attachment group id, and version number are required')
    const [{ data: target, error: targetErr }, current] = await Promise.all([
      db.from(TABLE).select('*').eq('attachment_group_id', attachmentGroupId).eq('version_number', versionNumber).single(),
      getCurrent(db, attachmentGroupId),
    ])
    if (targetErr) throw targetErr
    if (target.id === current.id) return ok(current)
    return ok(await insertNextVersion(db, current, {
      storage_bucket: target.storage_bucket,
      storage_path: target.storage_path,
      file_name: target.file_name,
      mime_type: target.mime_type,
      file_size: target.file_size,
    }, uploadedByUserId))
  } catch (error) {
    return fail(error)
  }
}

export async function deleteRecordAttachment(db, { attachmentGroupId, deletedByUserId = null }) {
  try {
    if (!db || !attachmentGroupId) throw new Error('Database client and attachment group id are required')
    const { error } = await db
      .from(TABLE)
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: deletedByUserId, is_current: false })
      .eq('attachment_group_id', attachmentGroupId)
    if (error) throw error
    return ok({ deleted: true })
  } catch (error) {
    return fail(error)
  }
}

/** Rename the annexure (current version). A blank title falls back to the file name. */
export async function updateRecordAttachmentTitle(db, { attachmentGroupId, title }) {
  try {
    if (!db || !attachmentGroupId) throw new Error('Database client and attachment group id are required')
    const current = await getCurrent(db, attachmentGroupId)
    const { data, error } = await db
      .from(TABLE)
      .update({ annexure_title: title?.trim() || defaultAnnexureTitle(current.file_name) })
      .eq('id', current.id)
      .select('*')
      .single()
    if (error) throw error
    return ok(data)
  } catch (error) {
    return fail(error)
  }
}

const SIGNED_URL_SECONDS = 3600
const STORAGE_TIMEOUT_MS = 30000
const STORAGE_TIMEOUT_MESSAGE = 'The file storage did not respond — please try again.'
/** storage path → pending batch request (primeRecordAttachmentUrls), so thumbnails wait for it. */
const batchInflight = new Map()

/**
 * One storage request for the links of many attachments (v1336) — instead of one request per
 * thumbnail, which queue behind each other and were taking 15 s+. Links are kept in the session
 * cache (signedImageCache), so later visits show the images straight away.
 */
export function primeRecordAttachmentUrls(db, rows) {
  const paths = [...new Set((rows || []).map((r) => r.storage_path).filter(Boolean))]
    .filter((path) => !peekSignedImage(LOCAL_REGISTER_ATTACHMENTS_BUCKET, path) && !batchInflight.has(path))
  if (!db || paths.length === 0) return Promise.resolve()
  const batch = withTimeout(
    db.storage.from(LOCAL_REGISTER_ATTACHMENTS_BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS),
    STORAGE_TIMEOUT_MS,
    STORAGE_TIMEOUT_MESSAGE,
  )
    .then(({ data, error }) => {
      if (error) throw error
      const byPath = new Map((data || []).filter((d) => d?.signedUrl && !d.error).map((d) => [d.path, d.signedUrl]))
      return Promise.all(paths.map((path) => (byPath.has(path)
        ? resolveSignedImage({ bucket: LOCAL_REGISTER_ATTACHMENTS_BUCKET, path, expiresInSeconds: SIGNED_URL_SECONDS, createSignedUrl: async () => byPath.get(path) })
        : null)))
    })
    .catch(() => null)
    .finally(() => paths.forEach((path) => batchInflight.delete(path)))
  paths.forEach((path) => batchInflight.set(path, batch))
  return batch
}

export async function getRecordAttachmentSignedUrl(db, storagePath, expiresInSeconds = SIGNED_URL_SECONDS) {
  try {
    if (!db || !storagePath) throw new Error('Database client and storage path are required')
    const cached = peekSignedImage(LOCAL_REGISTER_ATTACHMENTS_BUCKET, storagePath)
    if (cached) return ok(cached)
    if (batchInflight.has(storagePath)) {
      await batchInflight.get(storagePath)
      const primed = peekSignedImage(LOCAL_REGISTER_ATTACHMENTS_BUCKET, storagePath)
      if (primed) return ok(primed)
    }
    const url = await resolveSignedImage({
      bucket: LOCAL_REGISTER_ATTACHMENTS_BUCKET,
      path: storagePath,
      expiresInSeconds,
      createSignedUrl: async () => {
        // Time-limited so a stuck storage request shows an error instead of an endless spinner.
        const { data, error } = await withTimeout(
          db.storage.from(LOCAL_REGISTER_ATTACHMENTS_BUCKET).createSignedUrl(storagePath, expiresInSeconds),
          STORAGE_TIMEOUT_MS,
          STORAGE_TIMEOUT_MESSAGE,
        )
        if (error) throw new Error(`Could not open the file: ${error.message || error.error || 'storage refused the request'}`)
        return data.signedUrl
      },
    })
    return ok(url)
  } catch (error) {
    return fail(error)
  }
}

/** Annexure letter for a 0-based position: 0 → A, 25 → Z, 26 → AA. */
export function annexureLetter(index) {
  let n = index + 1
  let label = ''
  while (n > 0) {
    const r = (n - 1) % 26
    label = String.fromCharCode(65 + r) + label
    n = Math.floor((n - 1) / 26)
  }
  return label
}

/** Current attachments with signed URLs, for the document export. Word / Excel annexures also
 *  carry their readable content (annexureContent.js) so the document shows it, not just a name. */
export async function resolveRecordAttachmentsForExport(db, recordId) {
  try {
    const listResult = await listRecordAttachments(db, recordId)
    if (!listResult.success) throw new Error(listResult.message)
    await primeRecordAttachmentUrls(db, listResult.data)
    const rows = await Promise.all(listResult.data.map(async (row) => {
      const urlResult = await getRecordAttachmentSignedUrl(db, row.storage_path)
      let content = null
      if (urlResult.success && hasReadableContent(row.mime_type, row.file_name)) {
        try {
          const res = await fetch(urlResult.data)
          if (res.ok) content = await readAnnexureContent(await res.arrayBuffer(), row.mime_type, row.file_name)
        } catch {
          content = null
        }
      }
      return {
        content,
        title: row.annexure_title,
        file_name: row.file_name,
        mime_type: row.mime_type,
        file_size: row.file_size,
        size_label: formatFileSizeLabel(row.file_size),
        is_image: isImageMimeType(row.mime_type),
        url: urlResult.success ? urlResult.data : null,
      }
    }))
    return ok(rows)
  } catch (error) {
    return fail(error)
  }
}

/**
 * Adapter with DocumentAttachmentsPanel's service shape (v867 panel, reused here). The panel's
 * `templateNodeId` is this record's id and its caption is the annexure title.
 */
export const localRegisterAttachmentPanelService = {
  DEFAULT_MAX_FILES,
  formatFileSizeLabel,
  isImageMimeType,
  validateAttachmentFile,
  listDocumentAttachments: (db, recordId) => listRecordAttachments(db, recordId).then((r) => {
    if (!r.success) return r
    primeRecordAttachmentUrls(db, r.data) // one request for every thumbnail link
    return ok(r.data.map((row) => ({ ...row, caption: row.annexure_title })))
  }),
  listAttachmentVersionHistory: listRecordAttachmentVersions,
  uploadDocumentAttachment: (db, { templateNodeId, file, uploadedByUserId, mode }) =>
    uploadRecordAttachment(db, { recordId: templateNodeId, file, uploadedByUserId, mode })
      .then((r) => (r.success ? ok({ ...r.data, caption: r.data.annexure_title }) : r)),
  replaceDocumentAttachment: (db, args) => replaceRecordAttachment(db, args)
    .then((r) => (r.success ? ok({ ...r.data, caption: r.data.annexure_title }) : r)),
  restoreAttachmentVersion: (db, args) => restoreRecordAttachmentVersion(db, args)
    .then((r) => (r.success ? ok({ ...r.data, caption: r.data.annexure_title }) : r)),
  deleteDocumentAttachment: deleteRecordAttachment,
  updateAttachmentCaption: (db, { attachmentGroupId, caption }) => updateRecordAttachmentTitle(db, { attachmentGroupId, title: caption }),
  getAttachmentSignedUrl: getRecordAttachmentSignedUrl,
}
