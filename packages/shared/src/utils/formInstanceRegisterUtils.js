/**
 * Project Forms register helpers (v850 / v860) — status gates and list filtering.
 * Engine statuses: draft | in_review | approved | rejected | archived
 * ("submitted" in product copy maps to in_review.)
 */

export const FORM_INSTANCE_STATUSES = ['draft', 'in_review', 'approved', 'rejected', 'archived']

export const DEFAULT_FORM_BULK_APPROVE_MAX = 1000
export const FORM_BULK_APPROVE_HARD_MAX = 10000

export const FORM_STATUS_LABELS = {
  draft: 'Draft',
  in_review: 'In review',
  submitted: 'In review',
  approved: 'Approved',
  rejected: 'Rejected',
  archived: 'Archived',
}

function normStatus(status) {
  return String(status || '').toLowerCase()
}

/** Edit allowed while the instance is still mutable (FormEdit has no hard gate today). */
export function canEditFormInstance(status) {
  const s = normStatus(status)
  return s === 'draft' || s === 'in_review' || s === 'rejected' || s === 'submitted'
}

/**
 * Archive/Delete enabled for draft / in_review / rejected / approved.
 * Disabled only when already archived (allows cleanup of wrong imports).
 */
export function canArchiveFormInstance(status) {
  const s = normStatus(status)
  return s === 'draft' || s === 'in_review' || s === 'submitted' || s === 'rejected' || s === 'approved'
}

/** Submit → in_review (v860). */
export function canSubmitFormInstance(status) {
  const s = normStatus(status)
  return s === 'draft' || s === 'rejected'
}

/** Approve → approved from draft or in_review (v860). */
export function canApproveFormInstance(status) {
  const s = normStatus(status)
  return s === 'draft' || s === 'in_review' || s === 'submitted'
}

/** Reject → rejected from in_review only (v860). */
export function canRejectFormInstance(status) {
  const s = normStatus(status)
  return s === 'in_review' || s === 'submitted'
}

/** Bulk approve selects drafts only (v860). */
export function canBulkApproveFormInstance(status) {
  return normStatus(status) === 'draft'
}

export function isNonEmptyJustification(text) {
  return String(text || '').trim().length > 0
}

export function normalizeFormBulkApproveMax(value, fallback = DEFAULT_FORM_BULK_APPROVE_MAX) {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 1) return fallback
  return Math.min(Math.floor(n), FORM_BULK_APPROVE_HARD_MAX)
}

export function draftIdsFromFilteredRows(rows = []) {
  return (rows || [])
    .filter((r) => canBulkApproveFormInstance(r?.status))
    .map((r) => r.id)
    .filter(Boolean)
}

/** Ids eligible for bulk archive/delete from the register list. */
export function archivableIdsFromFilteredRows(rows = []) {
  return (rows || [])
    .filter((r) => canArchiveFormInstance(r?.status))
    .map((r) => r.id)
    .filter(Boolean)
}

export function assertBulkApproveWithinCap(selectedCount, maxCap) {
  const cap = normalizeFormBulkApproveMax(maxCap)
  const count = Number(selectedCount) || 0
  if (count > cap) {
    return {
      ok: false,
      cap,
      message: `Cannot approve more than ${cap} drafts at once. Reduce the selection or raise the organisation bulk-approve limit.`,
    }
  }
  return { ok: true, cap }
}

export function formInstanceStatusLabel(status) {
  const s = normStatus(status)
  return FORM_STATUS_LABELS[s] || status || '—'
}

const TITLE_KEY_RE = /^(task[_\s-]?description|description|title|name|summary|subject)$/i
const TASK_ID_KEY_RE = /^(task[_\s-]?id|taskid)$/i

function valueMapFromRows(valueRows = []) {
  const map = {}
  for (const row of valueRows || []) {
    if (!row?.field_key) continue
    map[row.field_key] = row.field_value
  }
  return map
}

function findValueByKeyPattern(valuesMap, pattern) {
  const entries = Object.entries(valuesMap || {})
  for (const [key, val] of entries) {
    if (!pattern.test(String(key))) continue
    const text = String(val ?? '').trim()
    if (text) return text
  }
  return ''
}

/**
 * Human-friendly list title for a form instance (avoids repeating template name).
 * Prefer "Task Id — Task Description", then description/title, then FI- reference.
 */
export function pickFormInstanceDisplayTitle({
  values = null,
  valueRows = null,
  instanceReference = '',
  templateName = '',
  fallbackId = '',
} = {}) {
  const map = values && typeof values === 'object' && !Array.isArray(values)
    ? values
    : valueMapFromRows(valueRows)
  const taskId = findValueByKeyPattern(map, TASK_ID_KEY_RE)
  const description = findValueByKeyPattern(map, TITLE_KEY_RE)
  if (taskId && description) return `${taskId} — ${description}`
  if (description) return description
  if (taskId) return `Task ${taskId}`

  // First short non-empty text-ish value (skip dates / percents / empty)
  for (const [key, val] of Object.entries(map)) {
    if (TITLE_KEY_RE.test(key) || TASK_ID_KEY_RE.test(key)) continue
    const text = String(val ?? '').trim()
    if (!text || text.length > 80) continue
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) continue
    if (/^\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}$/.test(text)) continue
    if (/^\d+%$/.test(text)) continue
    return text
  }

  return String(instanceReference || templateName || fallbackId || 'Form record').trim()
}

/**
 * Default register view hides archived unless statusFilter === 'archived'
 * (or an explicit non-empty filter that is not "all").
 */
export function filterFormInstancesForRegister(
  instances = [],
  { statusFilter = '', search = '', templateCode = '' } = {},
) {
  const q = String(search || '').trim().toLowerCase()
  const status = String(statusFilter || '').trim().toLowerCase()
  const codeFilter = String(templateCode || '').trim().toLowerCase()

  return (instances || []).filter((row) => {
    const rowStatus = String(row.status || '').toLowerCase()
    if (status === 'archived') {
      if (rowStatus !== 'archived') return false
    } else if (status) {
      const matchStatus = status === 'submitted' ? 'in_review' : status
      if (rowStatus !== matchStatus) return false
    } else if (rowStatus === 'archived') {
      return false
    }

    if (codeFilter) {
      const rowCode = String(row.template_code || '').trim().toLowerCase()
      if (rowCode !== codeFilter) return false
    }

    if (!q) return true
    const hay = [
      row.display_title,
      row.template_name,
      row.template_code,
      row.instance_reference,
      row.title,
      row.id,
      formInstanceStatusLabel(row.status),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return hay.includes(q)
  })
}

export function normalizeFormInstanceRow(row) {
  if (!row) return row
  const tmpl = row.form_templates || row.template || null
  const { form_templates: _ft, ...rest } = row
  return {
    ...rest,
    template_name: rest.template_name || tmpl?.name || '',
    template_code: rest.template_code || tmpl?.template_code || '',
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** True when the route segment looks like a UUID (legacy bookmark). */
export function looksLikeFormInstanceUuid(value) {
  return UUID_RE.test(String(value || '').trim())
}

/**
 * Human-friendly path segment for a form instance (rule 16.1).
 * Prefers instance_reference (e.g. FI-…); falls back to UUID.
 */
export function formInstancePathSegmentFromRow(row) {
  const ref = String(row?.instance_reference || '').trim()
  const id = String(row?.id || '').trim()
  const key = ref || id
  return key ? encodeURIComponent(key) : ''
}

/** Decoded route key for comparisons / lookups. */
export function formInstanceRouteKeyFromRow(row) {
  const ref = String(row?.instance_reference || '').trim()
  if (ref) return ref
  return String(row?.id || '').trim()
}

/**
 * Path back to Project Forms records list from edit/view/new.
 * Preserves /platform/projects| /pm/projects| /simulator/... prefix from the current URL.
 * `projectKey` should be project_code when available (rule 16.1).
 */
export function resolveFormInstanceRecordsListPath({
  pathname,
  projectId,
  projectKey,
  templateCode,
  fallbackBasePath = '/platform/projects',
} = {}) {
  const key = String(projectKey || projectId || '').trim()
  if (!key) return fallbackBasePath
  const path = String(pathname || '')
  const match = path.match(/^(.*?\/projects)\/[^/]+\/forms(?:\/|$)/i)
  const listPath = match
    ? `${match[1]}/${encodeURIComponent(key)}/forms`
    : `${fallbackBasePath}/${encodeURIComponent(key)}/forms`
  const code = String(templateCode || '').trim()
  if (!code) return listPath
  return `${listPath}?templateCode=${encodeURIComponent(code)}`
}

/**
 * Build edit/view path for a form instance under a project forms base.
 * @param {string} listOrBasePath — e.g. /platform/projects/CODE/forms or with query
 * @param {object} instanceRow — needs instance_reference and/or id
 * @param {'edit'|'view'} action
 */
export function resolveFormInstanceDetailPath(listOrBasePath, instanceRow, action = 'edit') {
  const listBase = String(listOrBasePath || '').split('?')[0].replace(/\/$/, '')
  const seg = formInstancePathSegmentFromRow(instanceRow)
  if (!listBase || !seg) return listBase || ''
  return `${listBase}/${seg}/${action}`
}
