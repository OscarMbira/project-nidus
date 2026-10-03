import { platformDb } from './supabase/supabaseClient'
import { resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'

const DEFECT_BUCKET = 'defect-attachments'

export async function getDefects(projectId, filters = {}) {
  let query = platformDb
    .from('defects')
    .select('*, test_cases(id, test_case_ref, title)')
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  if (filters.status) query = query.eq('status', filters.status)
  if (filters.severity) query = query.eq('severity', filters.severity)
  if (filters.search) {
    query = query.or(`title.ilike.%${filters.search}%,defect_ref.ilike.%${filters.search}%`)
  }

  const { data, error } = await query
  if (error) throw error
  const rows = data || []
  const labels = await resolveAuditUserLabels(
    platformDb,
    rows.flatMap((row) => [row.reported_by, row.assigned_to]),
  )
  return rows.map((row) => ({
    ...row,
    reported_by_name: row.reported_by ? labels[row.reported_by] || null : null,
    assigned_to_name: row.assigned_to ? labels[row.assigned_to] || null : null,
  }))
}

export async function getDefectById(defectId) {
  const { data, error } = await platformDb
    .from('defects')
    .select('*, test_cases(id, test_case_ref, title, project_id), test_case_executions!execution_id(id, status, actual_result)')
    .eq('id', defectId)
    .eq('is_deleted', false)
    .single()
  if (error) throw error
  return data
}

export async function createDefect(row) {
  const { data, error } = await platformDb.from('defects').insert(row).select().single()
  if (error) throw error
  return data
}

export async function updateDefect(defectId, updates) {
  const { data, error } = await platformDb
    .from('defects')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', defectId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteDefect(defectId, deletedBy) {
  const { data, error } = await platformDb
    .from('defects')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: deletedBy,
    })
    .eq('id', defectId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getDefectComments(defectId) {
  const { data, error } = await platformDb
    .from('defect_comments')
    .select('*')
    .eq('defect_id', defectId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function addDefectComment(defectId, { comment, is_internal = false, created_by }) {
  const { data, error } = await platformDb
    .from('defect_comments')
    .insert({ defect_id: defectId, comment, is_internal, created_by })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getDefectHistory(defectId) {
  const { data, error } = await platformDb
    .from('defect_history')
    .select('*')
    .eq('defect_id', defectId)
    .order('changed_at', { ascending: false })
  if (error) throw error
  return data || []
}

function httpUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value) ? value : null
}

/** One storage round-trip for every preview on the defect. */
async function withPreviewUrls(rows) {
  const list = rows || []
  const paths = [...new Set(list.map((row) => row.file_path).filter(Boolean))]
  const signedByPath = {}
  if (paths.length) {
    const { data } = await platformDb.storage.from(DEFECT_BUCKET).createSignedUrls(paths, 3600)
    for (const item of data || []) {
      if (item?.path && item.signedUrl && !item.error) signedByPath[item.path] = item.signedUrl
    }
  }
  return list.map((row) => ({
    ...row,
    preview_url: signedByPath[row.file_path] || httpUrl(row.file_url),
  }))
}

export async function getDefectAttachments(defectId) {
  const { data, error } = await platformDb
    .from('defect_attachments')
    .select('*')
    .eq('defect_id', defectId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return withPreviewUrls(data || [])
}

/**
 * Upload file to storage and insert defect_attachments row.
 * @returns {{ attachment: object, publicUrl: string|null }}
 */
export async function uploadDefectAttachment({
  projectId,
  defectId,
  file,
  is_screenshot = false,
  uploaded_by,
}) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${projectId}/${defectId}/${Date.now()}_${safeName}`

  const { error: upErr } = await platformDb.storage.from(DEFECT_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  })
  if (upErr) throw upErr

  const { data, error } = await platformDb
    .from('defect_attachments')
    .insert({
      defect_id: defectId,
      file_name: file.name,
      file_url: path,
      file_path: path,
      file_type: file.type || null,
      file_size: file.size ?? null,
      is_screenshot,
      uploaded_by,
    })
    .select()
    .single()
  if (error) throw error

  const [withPreview] = await withPreviewUrls([data])
  return { attachment: withPreview, signedUrl: withPreview.preview_url }
}

export async function deleteDefectAttachment(attachmentId) {
  const { data: row, error: fErr } = await platformDb
    .from('defect_attachments')
    .select('file_path')
    .eq('id', attachmentId)
    .single()
  if (fErr) throw fErr
  if (row?.file_path) {
    await platformDb.storage.from(DEFECT_BUCKET).remove([row.file_path])
  }
  const { error } = await platformDb.from('defect_attachments').delete().eq('id', attachmentId)
  if (error) throw error
}

/** Defects raised from the Testing & Diagnostics Centre (test runs / diagnostics). */
export async function getTestingCentreDefects(filters = {}) {
  let query = platformDb
    .from('defects')
    .select('*')
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
  if (filters.projectId) query = query.eq('project_id', filters.projectId)
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.search) {
    const s = filters.search.trim()
    query = query.or(`title.ilike.%${s}%,defect_ref.ilike.%${s}%`)
  }
  const { data, error } = await query
  if (error) throw error
  const rows = (data || []).filter(
    (d) => d.source === 'test_run' || d.source === 'diagnostic' || d.linked_tc_test_run_id != null
  )
  return rows
}

export async function createDefectFromTestResult(_testRunResultId, _defectData) {
  throw new Error('createDefectFromTestResult: use createDefect with source + linked columns after v496 SQL')
}

export async function createDefectFromDiagnostic(_sessionId, _defectData) {
  throw new Error('createDefectFromDiagnostic: use createDefect with source + linked columns after v496 SQL')
}

export async function generateAndSaveCursorPrompt(defectId, promptText) {
  return updateDefect(defectId, { cursor_prompt_generated: true, cursor_prompt_text: promptText })
}

/** All attachments across every (non-deleted) defect for a project — the Evidence tab. */
export async function getProjectDefectAttachments(projectId, { screenshotsOnly = false } = {}) {
  let query = platformDb
    .from('defect_attachments')
    .select('*, defects!inner(id, defect_ref, title, project_id, is_deleted)')
    .eq('defects.project_id', projectId)
    .eq('defects.is_deleted', false)
    .order('created_at', { ascending: false })
  if (screenshotsOnly) query = query.eq('is_screenshot', true)
  const { data, error } = await query
  if (error) throw error
  return withPreviewUrls(data || [])
}

/** Defect field-change history across a whole project — the Evidence > History tab. */
export async function getProjectDefectHistory(projectId) {
  const { data, error } = await platformDb
    .from('defect_history')
    .select('*, defects!inner(id, defect_ref, title, project_id, is_deleted)')
    .eq('defects.project_id', projectId)
    .eq('defects.is_deleted', false)
    .order('changed_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getDefectStats(projectId) {
  const { data, error } = await platformDb
    .from('defects')
    .select('status, severity, created_at')
    .eq('project_id', projectId)
    .eq('is_deleted', false)
  if (error) throw error

  const byStatus = {}
  const bySeverity = {}
  const trend = {}
  for (const row of data || []) {
    byStatus[row.status] = (byStatus[row.status] || 0) + 1
    bySeverity[row.severity] = (bySeverity[row.severity] || 0) + 1
    const d = row.created_at ? String(row.created_at).slice(0, 10) : ''
    if (d) trend[d] = (trend[d] || 0) + 1
  }
  return { total: data?.length || 0, byStatus, bySeverity, trend }
}

export default {
  getDefects,
  getDefectById,
  createDefect,
  updateDefect,
  deleteDefect,
  getDefectComments,
  addDefectComment,
  getDefectHistory,
  getDefectAttachments,
  uploadDefectAttachment,
  deleteDefectAttachment,
  getDefectStats,
  getProjectDefectAttachments,
  getProjectDefectHistory,
  getTestingCentreDefects,
  createDefectFromTestResult,
  createDefectFromDiagnostic,
  generateAndSaveCursorPrompt,
}
