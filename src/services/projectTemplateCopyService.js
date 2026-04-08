/**
 * Project template copies — Platform (public.project_template_copies)
 */

import { platformDb } from './supabase/supabaseClient'
import { exportToExcel, exportListToPPT } from '../utils/exportUtils'

const COPY = 'project_template_copies'
const CVERS = 'template_copy_versions'
const TLIB = 'template_library'
const PROJ = 'projects'

export async function createCopyFromMaster({
  accountId,
  projectId,
  templateId,
  title,
  description,
  notes,
  isOnHold,
  onHoldReason,
}) {
  const {
    data: { user },
  } = await platformDb.auth.getUser()
  if (!user) return { data: null, error: new Error('Not authenticated') }

  const { data: master, error: mErr } = await platformDb
    .from(TLIB)
    .select('id, content, version, title, template_type_code')
    .eq('id', templateId)
    .eq('is_deleted', false)
    .maybeSingle()
  if (mErr || !master) return { data: null, error: mErr || new Error('Template not found') }

  const row = {
    template_id: templateId,
    project_id: projectId,
    account_id: accountId,
    title: title || master.title,
    description: description || null,
    content: master.content || {},
    copied_from_version: master.version || '1.0',
    notes: notes || null,
    is_on_hold: !!isOnHold,
    on_hold_reason: isOnHold ? onHoldReason || 'Draft' : null,
    status: isOnHold ? 'draft' : 'active',
    created_by: user.id,
    updated_by: user.id,
  }

  const { data, error } = await platformDb.from(COPY).insert(row).select().single()
  return { data, error }
}

export async function getCopyById(copyId) {
  const { data, error } = await platformDb
    .from(COPY)
    .select(
      `
      *,
      master:${TLIB}(id, title, template_type_code, version, status),
      project:${PROJ}(id, project_name, project_code)
    `
    )
    .eq('id', copyId)
    .maybeSingle()
  return { data, error }
}

export async function listCopiesForProject(projectId, { search = '', onHoldOnly = false } = {}) {
  let q = platformDb
    .from(COPY)
    .select(
      `
      *,
      master:${TLIB}(id, title, template_type_code, status)
    `
    )
    .eq('project_id', projectId)
    .order('updated_at', { ascending: false })
  if (onHoldOnly) q = q.eq('is_on_hold', true)
  const { data, error } = await q
  if (error) return { data: [], error }
  let rows = data || []
  if (search && String(search).trim()) {
    const s = String(search).trim().toLowerCase()
    rows = rows.filter(
      (r) =>
        (r.title && r.title.toLowerCase().includes(s)) ||
        (r.description && r.description.toLowerCase().includes(s))
    )
  }
  return { data: rows, error: null }
}

export async function listCopiesForAccount(accountId, { search = '' } = {}) {
  const { data, error } = await platformDb
    .from(COPY)
    .select(
      `
      *,
      master:${TLIB}(id, title, template_type_code),
      project:${PROJ}(id, project_name, project_code)
    `
    )
    .eq('account_id', accountId)
    .order('updated_at', { ascending: false })
  if (error) return { data: [], error }
  let rows = data || []
  if (search && String(search).trim()) {
    const s = String(search).trim().toLowerCase()
    rows = rows.filter(
      (r) =>
        (r.title && r.title.toLowerCase().includes(s)) ||
        (r.project?.project_name && r.project.project_name.toLowerCase().includes(s))
    )
  }
  return { data: rows, error: null }
}

export async function updateCopy(copyId, patch, { changeNote } = {}) {
  const {
    data: { user },
  } = await platformDb.auth.getUser()
  if (!user) return { data: null, error: new Error('Not authenticated') }

  let merged = { ...patch, updated_by: user.id, updated_at: new Date().toISOString() }
  if (changeNote && String(changeNote).trim()) {
    const line = `[${new Date().toISOString().split('T')[0]}] ${String(changeNote).trim()}`
    const { data: existing } = await platformDb.from(COPY).select('notes').eq('id', copyId).maybeSingle()
    const base = patch.notes !== undefined ? patch.notes : existing?.notes || ''
    merged.notes = [base, line].filter(Boolean).join('\n')
  }

  const { data, error } = await platformDb.from(COPY).update(merged).eq('id', copyId).select().single()

  return { data, error }
}

export async function getCopyVersionHistory(copyId) {
  const { data, error } = await platformDb
    .from(CVERS)
    .select('id, version_number, changed_at, change_description, changed_by')
    .eq('copy_id', copyId)
    .order('version_number', { ascending: false })
  return { data: data || [], error }
}

export async function getCopyVersionSnapshot(copyId, versionNumber) {
  const { data, error } = await platformDb
    .from(CVERS)
    .select('content_snapshot, version_number, change_description, changed_at')
    .eq('copy_id', copyId)
    .eq('version_number', versionNumber)
    .maybeSingle()
  return { data, error }
}

export async function restoreCopyVersion(copyId, versionNumber, { confirmNote = 'Restored from version' } = {}) {
  const { data: snap, error: sErr } = await getCopyVersionSnapshot(copyId, versionNumber)
  if (sErr || !snap) return { data: null, error: sErr || new Error('Version not found') }
  const note = `${confirmNote} ${versionNumber}`
  return updateCopy(copyId, { content: snap.content_snapshot }, { changeNote: note })
}

export async function putCopyOnHold(copyId, reason) {
  return updateCopy(copyId, { is_on_hold: true, on_hold_reason: reason || 'On hold', status: 'draft' })
}

export async function resumeCopyFromHold(copyId) {
  return updateCopy(copyId, { is_on_hold: false, on_hold_reason: null, status: 'active' })
}

export async function listUnreadTemplateNotifications() {
  const {
    data: { user },
  } = await platformDb.auth.getUser()
  if (!user) return { data: [], error: null }
  const { data: urow } = await platformDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
  if (!urow?.id) return { data: [], error: null }
  const { data, error } = await platformDb
    .from('template_update_notifications')
    .select('id, template_id, copy_id, message, created_at, is_read, notification_type')
    .eq('notified_user_id', urow.id)
    .eq('is_read', false)
    .order('created_at', { ascending: false })
  return { data: data || [], error }
}

export async function markNotificationRead(id) {
  const { error } = await platformDb.from('template_update_notifications').update({ is_read: true }).eq('id', id)
  return { error }
}

export async function exportCopyToExcel(copy) {
  const rows = [
    {
      title: copy.title,
      project: copy.project?.project_name,
      status: copy.status,
      version: copy.current_version,
      updated_at: copy.updated_at,
    },
  ]
  exportToExcel(
    [
      { key: 'title', label: 'Title' },
      { key: 'project', label: 'Project' },
      { key: 'status', label: 'Status' },
      { key: 'version', label: 'Version' },
      { key: 'updated_at', label: 'Updated' },
    ],
    rows,
    `TemplateCopy_${copy.id?.slice(0, 8) || 'export'}`
  )
}

export async function exportCopyToPpt(copy) {
  const cols = [
    { key: 'title', label: 'Title' },
    { key: 'version', label: 'Version' },
  ]
  exportListToPPT(cols, [{ title: copy.title, version: copy.current_version }], `TemplateCopy_${copy.id?.slice(0, 8) || 'export'}`)
}
