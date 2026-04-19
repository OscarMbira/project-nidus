/**
 * Change Log Service — full CRUD
 * Manages CR lifecycle events in change_log, scoped by user role and project access.
 *
 * Role scoping (read):
 *   System Admin / PMO Admin → all records
 *   Everyone else            → only projects they belong to
 *
 * Write permissions:
 *   Create  — any project member
 *   Update  — own entries OR pmo_admin / System Admin
 *   Delete  — pmo_admin / System Admin only (soft delete)
 */

import { platformDb } from './supabaseClient'

// ─── helpers ────────────────────────────────────────────────────────────────

export async function resolveUserId() {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) return null
  const { data } = await platformDb
    .from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
  return data?.id || null
}

async function isAdminUser(userId) {
  if (!userId) return false
  const { data } = await platformDb
    .from('user_roles')
    .select('roles:role_id(role_name, is_system_role)')
    .eq('user_id', userId).eq('is_active', true)
  if (!data) return false
  return data.some(r => {
    const name = (r.roles?.role_name || '').toLowerCase().replace(/\s+/g, '_')
    return name === 'system_admin' || name === 'pmo_admin' || r.roles?.is_system_role
  })
}

async function getUserProjectIds(userId) {
  if (!userId) return []
  const { data } = await platformDb
    .from('project_memberships')
    .select('project_id').eq('user_id', userId).eq('is_active', true)
  return (data || []).map(r => r.project_id).filter(Boolean)
}

// ─── read ────────────────────────────────────────────────────────────────────

/**
 * Projects that have at least one CR, scoped to user access.
 */
export async function fetchAccessibleProjects() {
  try {
    const userId = await resolveUserId()
    const admin  = await isAdminUser(userId)

    let query = platformDb
      .from('change_requests')
      .select('project_id, project:project_id(id, project_name)')
      .eq('is_deleted', false)
      .not('project_id', 'is', null)

    if (!admin) {
      const ids = await getUserProjectIds(userId)
      if (ids.length === 0) return []
      query = query.in('project_id', ids)
    }

    const { data, error } = await query
    if (error) throw error

    const seen = new Set()
    return (data || [])
      .filter(r => r.project && !seen.has(r.project_id) && seen.add(r.project_id))
      .map(r => ({ id: r.project_id, name: r.project?.project_name || r.project_id }))
      .sort((a, b) => a.name.localeCompare(b.name))
  } catch (err) {
    console.error('changeLogService.fetchAccessibleProjects:', err)
    return []
  }
}

/**
 * Change Requests for a given project (for the CR dropdown in Create/Edit form).
 */
export async function fetchCRsForProject(projectId) {
  if (!projectId) return []
  try {
    const { data, error } = await platformDb
      .from('change_requests')
      .select('id, change_reference, change_title, status')
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .order('submission_date', { ascending: false })
    if (error) throw error
    return data || []
  } catch (err) {
    console.error('changeLogService.fetchCRsForProject:', err)
    return []
  }
}

/**
 * Fetch all CR log entries (filtered + role-scoped).
 */
export async function fetchChangeLog(filters = {}) {
  try {
    const userId    = await resolveUserId()
    const admin     = await isAdminUser(userId)
    let projectIds  = null

    if (!admin) {
      projectIds = await getUserProjectIds(userId)
      if (projectIds.length === 0) return []
    }

    let query = platformDb
      .from('change_log')
      .select(`
        *,
        change_request:change_request_id(
          id, change_reference, change_title,
          change_category, priority, status,
          project_id,
          project:project_id(id, project_name)
        ),
        performed_by_user:performed_by(id, full_name, email),
        created_by_user:created_by(id, full_name, email)
      `)
      .eq('is_deleted', false)
      .order('log_date', { ascending: false })

    if (!admin && projectIds) query = query.in('project_id', projectIds)
    if (filters.project_id)   query = query.eq('project_id', filters.project_id)
    if (filters.action_type)  query = query.eq('action', filters.action_type)
    if (filters.date_from)    query = query.gte('log_date', filters.date_from)
    if (filters.date_to)      query = query.lte('log_date', filters.date_to + 'T23:59:59')

    const { data, error } = await query
    if (error) throw error

    let entries = data || []

    if (filters.search) {
      const q = filters.search.toLowerCase()
      entries = entries.filter(e =>
        (e.description || '').toLowerCase().includes(q) ||
        (e.comments || '').toLowerCase().includes(q) ||
        (e.change_request?.change_reference || '').toLowerCase().includes(q) ||
        (e.change_request?.change_title || '').toLowerCase().includes(q)
      )
    }

    return entries
  } catch (err) {
    console.error('changeLogService.fetchChangeLog:', err)
    throw err
  }
}

/**
 * Fetch a single log entry by id.
 */
export async function fetchChangeLogEntry(id) {
  try {
    const { data, error } = await platformDb
      .from('change_log')
      .select(`
        *,
        change_request:change_request_id(
          id, change_reference, change_title, status,
          project_id,
          project:project_id(id, project_name)
        ),
        performed_by_user:performed_by(id, full_name, email),
        created_by_user:created_by(id, full_name, email)
      `)
      .eq('id', id)
      .eq('is_deleted', false)
      .maybeSingle()
    if (error) throw error
    return data
  } catch (err) {
    console.error('changeLogService.fetchChangeLogEntry:', err)
    throw err
  }
}

// ─── write ───────────────────────────────────────────────────────────────────

/**
 * Create a new log entry.
 * @param {Object} payload
 */
export async function createChangeLogEntry(payload) {
  try {
    const userId = await resolveUserId()
    const { data, error } = await platformDb
      .from('change_log')
      .insert({
        change_request_id: payload.change_request_id,
        project_id:        payload.project_id,
        log_date:          payload.log_date || new Date().toISOString(),
        log_type:          payload.log_type || 'other',
        action:            payload.action,
        performed_by:      payload.performed_by || userId,
        performed_by_role: payload.performed_by_role || '',
        old_value:         payload.old_value || null,
        new_value:         payload.new_value || null,
        description:       payload.description || null,
        comments:          payload.comments || null,
        created_by:        userId,
        is_deleted:        false,
      })
      .select(`
        *,
        change_request:change_request_id(id, change_reference, change_title, project_id, project:project_id(id, project_name)),
        performed_by_user:performed_by(id, full_name, email)
      `)
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (err) {
    console.error('changeLogService.createChangeLogEntry:', err)
    return { success: false, message: err.message }
  }
}

/**
 * Update an existing log entry.
 * @param {string} id
 * @param {Object} payload
 */
export async function updateChangeLogEntry(id, payload) {
  try {
    const userId = await resolveUserId()
    const { data, error } = await platformDb
      .from('change_log')
      .update({
        log_date:          payload.log_date,
        log_type:          payload.log_type,
        action:            payload.action,
        performed_by:      payload.performed_by,
        performed_by_role: payload.performed_by_role || '',
        old_value:         payload.old_value || null,
        new_value:         payload.new_value || null,
        description:       payload.description || null,
        comments:          payload.comments || null,
        updated_at:        new Date().toISOString(),
        updated_by:        userId,
      })
      .eq('id', id)
      .eq('is_deleted', false)
      .select(`
        *,
        change_request:change_request_id(id, change_reference, change_title, project_id, project:project_id(id, project_name)),
        performed_by_user:performed_by(id, full_name, email)
      `)
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (err) {
    console.error('changeLogService.updateChangeLogEntry:', err)
    return { success: false, message: err.message }
  }
}

/**
 * Soft-delete a log entry (admin/PMO only — enforced by RLS).
 * @param {string} id
 */
export async function deleteChangeLogEntry(id) {
  try {
    const userId = await resolveUserId()
    const { error } = await platformDb
      .from('change_log')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userId,
      })
      .eq('id', id)

    if (error) throw error
    return { success: true }
  } catch (err) {
    console.error('changeLogService.deleteChangeLogEntry:', err)
    return { success: false, message: err.message }
  }
}

// ─── attachments ─────────────────────────────────────────────────────────────

const ATTACHMENT_BUCKET = 'change-log-attachments'
const MAX_FILE_SIZE     = 10 * 1024 * 1024 // 10 MB

const MIME_MAP = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
  csv: 'text/csv',
  zip: 'application/zip',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  svg: 'image/svg+xml',
}

function getMimeType(ext) {
  return MIME_MAP[ext?.toLowerCase()] || 'application/octet-stream'
}

function getExtension(filename) {
  return filename.split('.').pop()?.toLowerCase() || ''
}

function inferAttachmentType(mimeType) {
  return (mimeType || '').startsWith('image/') ? 'screenshot' : 'document'
}

/**
 * Fetch all attachments for a log entry.
 */
export async function fetchAttachments(logEntryId) {
  try {
    const { data, error } = await platformDb
      .from('change_log_attachments')
      .select('*, uploaded_by_user:uploaded_by(id, full_name, email)')
      .eq('log_entry_id', logEntryId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  } catch (err) {
    console.error('changeLogService.fetchAttachments:', err)
    return []
  }
}

/**
 * Upload a file and create the attachment record.
 * @param {string} logEntryId
 * @param {File}   file
 * @param {string} [description]
 * @returns {{ success, data, message }}
 */
export async function uploadAttachment(logEntryId, file, description = '') {
  if (file.size > MAX_FILE_SIZE) {
    return { success: false, message: `File exceeds 10 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB).` }
  }

  try {
    const userId = await resolveUserId()
    if (!userId) return { success: false, message: 'Not authenticated.' }

    const ext       = getExtension(file.name)
    const mimeType  = getMimeType(ext)
    const attachType = inferAttachmentType(mimeType)
    const safeName  = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath  = `entries/${logEntryId}/${Date.now()}_${safeName}`

    // Upload to storage
    const { data: uploadData, error: uploadError } = await platformDb.storage
      .from(ATTACHMENT_BUCKET)
      .upload(filePath, file, { cacheControl: '3600', upsert: false })

    if (uploadError) {
      if (uploadError.message?.includes('Bucket not found')) {
        return { success: false, message: 'Storage bucket "change-log-attachments" not found. Create it in Supabase Storage first.' }
      }
      throw uploadError
    }

    const { data: urlData } = platformDb.storage
      .from(ATTACHMENT_BUCKET)
      .getPublicUrl(uploadData.path)

    // Insert record
    const { data, error } = await platformDb
      .from('change_log_attachments')
      .insert({
        log_entry_id:    logEntryId,
        file_name:       file.name,
        file_path:       uploadData.path,
        file_url:        urlData.publicUrl,
        file_size:       file.size,
        file_type:       mimeType,
        file_extension:  ext,
        attachment_type: attachType,
        description:     description || null,
        uploaded_by:     userId,
        is_deleted:      false,
      })
      .select('*, uploaded_by_user:uploaded_by(id, full_name, email)')
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (err) {
    console.error('changeLogService.uploadAttachment:', err)
    return { success: false, message: err.message }
  }
}

/**
 * Get a signed download URL (60-minute expiry).
 */
export async function getDownloadUrl(filePath) {
  try {
    const { data, error } = await platformDb.storage
      .from(ATTACHMENT_BUCKET)
      .createSignedUrl(filePath, 3600)
    if (error) throw error
    return data.signedUrl
  } catch (err) {
    console.error('changeLogService.getDownloadUrl:', err)
    return null
  }
}

/**
 * Soft-delete an attachment and remove the file from storage.
 */
export async function deleteAttachment(attachmentId, filePath) {
  try {
    const userId = await resolveUserId()

    // Remove from storage first
    await platformDb.storage.from(ATTACHMENT_BUCKET).remove([filePath])

    // Soft-delete the record
    const { error } = await platformDb
      .from('change_log_attachments')
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: userId })
      .eq('id', attachmentId)

    if (error) throw error
    return { success: true }
  } catch (err) {
    console.error('changeLogService.deleteAttachment:', err)
    return { success: false, message: err.message }
  }
}
