/**
 * Bulk project team invite — parse, validate, send.
 */

import Papa from 'papaparse'
import { isValidEmail } from '../utils/inputValidation'
import { deriveRoleSlug } from './bulkRoleService'
import {
  inviteUserToProject,
  resolveInvitationRoleIdForInsert,
} from './projectMembershipService'
import { dispatchProjectInvitationEmail } from './invitationService'
import { personalizeInvitationMessage } from '../utils/invitationInviteeFormat'
import { resolveInvitationTemplatePlaceholders } from '../features/invitation-templates/utils/resolveInvitationTemplatePlaceholders'

function normalizeHeader(h) {
  return String(h ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
}

function normalizeRoleKey(v) {
  return String(v ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function findRoleByValue(value, availableRoles) {
  if (value == null || String(value).trim() === '') return null
  const raw = String(value).trim()
  const key = normalizeRoleKey(raw)
  return (
    availableRoles.find(
      (r) =>
        normalizeRoleKey(r.role_name) === key ||
        String(r.role_display_name || '')
          .trim()
          .toLowerCase() === raw.toLowerCase(),
    ) || null
  )
}

function splitLegacyName(name) {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return { first_name: null, last_name: null }
  if (parts.length === 1) return { first_name: parts[0], last_name: null }
  return {
    first_name: parts[0],
    last_name: parts.slice(1).join(' '),
  }
}

async function parseCSVFile(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: normalizeHeader,
      complete: (result) => resolve({ rows: result.data || [], errors: result.errors || [] }),
      error: (err) => reject(err),
    })
  })
}

async function parseExcelFile(file) {
  const XLSX = (await import('xlsx')).default
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
  const rows = rawRows.map((row) => {
    const norm = {}
    Object.keys(row).forEach((key) => {
      norm[normalizeHeader(key)] = row[key]
    })
    return norm
  })
  return { rows, errors: [] }
}

async function readFileRows(file) {
  const name = file.name.toLowerCase()
  if (name.endsWith('.csv')) return parseCSVFile(file)
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return parseExcelFile(file)
  throw new Error('Unsupported file format. Use CSV or Excel (.xlsx, .xls).')
}

/**
 * @param {File} file
 * @param {{ availableRoles?: object[], defaultRoleId?: string|null }} options
 */
export async function parseBulkInviteFile(file, { availableRoles = [], defaultRoleId = null } = {}) {
  const parseErrors = []
  const { rows: rawRows, errors: fileErrors } = await readFileRows(file)
  fileErrors.forEach((e) => parseErrors.push(e.message || String(e)))

  const defaultRole = defaultRoleId
    ? availableRoles.find((r) => r.id === defaultRoleId)
    : null

  const existingSlugs = availableRoles.map((r) => r.role_name)
  const seenEmails = new Set()
  const parsedRows = []
  const newRolesMap = new Map()

  rawRows.forEach((raw, index) => {
    const email = String(raw.email ?? raw.e_mail ?? '').trim().toLowerCase()
    if (!email) return

    let first_name = raw.first_name != null ? String(raw.first_name).trim() : ''
    let last_name = raw.last_name != null ? String(raw.last_name).trim() : ''
    if (!first_name && !last_name && raw.name) {
      const split = splitLegacyName(raw.name)
      first_name = split.first_name || ''
      last_name = split.last_name || ''
    }

    const roleRaw = raw.role != null ? String(raw.role).trim() : ''
    let role_id = null
    let role_name = null
    let role_display_name = null
    let isNewRole = false
    let rawRoleValue = null

    if (roleRaw) {
      const matched = findRoleByValue(roleRaw, availableRoles)
      if (matched) {
        role_id = matched.id
        role_name = matched.role_name
        role_display_name = matched.role_display_name
      } else {
        isNewRole = true
        rawRoleValue = roleRaw
        const slug = deriveRoleSlug(roleRaw, existingSlugs)
        if (!newRolesMap.has(roleRaw)) {
          newRolesMap.set(roleRaw, {
            rawValue: roleRaw,
            suggestedSlug: slug,
            suggestedDisplayName: roleRaw,
            excluded: false,
          })
        }
        role_name = slug
        role_display_name = roleRaw
      }
    } else if (defaultRole) {
      role_id = defaultRole.id
      role_name = defaultRole.role_name
      role_display_name = defaultRole.role_display_name
    }

    const duplicateInFile = seenEmails.has(email)
    seenEmails.add(email)

    parsedRows.push({
      rowIndex: index,
      email,
      first_name: first_name || null,
      last_name: last_name || null,
      role_id,
      role_name,
      role_display_name,
      isNewRole,
      rawRoleValue,
      selected: !duplicateInFile,
      validEmail: isValidEmail(email),
      status: 'pending',
      duplicateInFile,
    })
  })

  return {
    rows: parsedRows,
    newRoles: Array.from(newRolesMap.values()),
    errors: parseErrors,
  }
}

export function generateCsvTemplate(availableRoles = []) {
  const slugs = availableRoles.map((r) => r.role_name).join(', ')
  const comment = slugs
    ? `# Valid role slugs (optional per row): ${slugs}`
    : '# role column optional — blank uses default role from Step 1'
  return [
    comment,
    'email,first_name,last_name,role',
    'john.smith@example.com,John,Smith,team_member',
    'jane.doe@example.com,Jane,Doe,team_manager',
    'bob.jones@example.com,Bob,Jones,',
  ].join('\n')
}

/**
 * @param {object[]} rows — parsed member rows (selected)
 * @param {string} projectId
 * @param {{
 *   seatInfo?: object|null,
 *   existingMemberEmails?: string[],
 *   pendingInviteEmails?: string[],
 * }} context
 */
export function validateBulkInviteRows(rows, projectId, context = {}) {
  const existingSet = new Set(
    (context.existingMemberEmails || []).map((e) => String(e).trim().toLowerCase()),
  )
  const pendingSet = new Set(
    (context.pendingInviteEmails || []).map((e) => String(e).trim().toLowerCase()),
  )

  const emailCounts = new Map()
  rows.forEach((r) => {
    const e = String(r.email || '').toLowerCase()
    emailCounts.set(e, (emailCounts.get(e) || 0) + 1)
  })

  const errors = []
  let validCount = 0
  let errorCount = 0
  let warningCount = 0

  const selectedRows = rows.filter((r) => r.selected !== false)

  rows.forEach((row, idx) => {
    const email = String(row.email || '').trim().toLowerCase()
    const rowIndex = row.rowIndex ?? idx

    if (row.selected === false) return

    if (!isValidEmail(email)) {
      errors.push({
        row_index: rowIndex,
        email,
        error_type: 'invalid_email',
        severity: 'error',
        message: 'Invalid email format',
        resolved: false,
      })
      errorCount += 1
      return
    }

    if ((emailCounts.get(email) || 0) > 1) {
      errors.push({
        row_index: rowIndex,
        email,
        error_type: 'duplicate_email',
        severity: 'error',
        message: 'Duplicate email in file',
        resolved: false,
      })
      errorCount += 1
      return
    }

    if (!row.role_id && !row.isNewRole) {
      errors.push({
        row_index: rowIndex,
        email,
        error_type: 'no_role',
        severity: 'error',
        message: 'No role assigned',
        resolved: false,
      })
      errorCount += 1
      return
    }

    if (existingSet.has(email)) {
      errors.push({
        row_index: rowIndex,
        email,
        error_type: 'already_member',
        severity: 'warning',
        message: 'Already a project member',
        resolved: false,
      })
      warningCount += 1
      return
    }

    if (pendingSet.has(email)) {
      errors.push({
        row_index: rowIndex,
        email,
        error_type: 'pending_invite',
        severity: 'warning',
        message: 'Pending invitation already exists',
        resolved: false,
      })
      warningCount += 1
      return
    }

    validCount += 1
  })

  const seat = context.seatInfo
  if (seat && seat.has_available_seats === false) {
    errors.push({
      row_index: -1,
      email: '',
      error_type: 'seat_limit',
      severity: 'warning',
      message: 'No available seats on this project',
      resolved: false,
    })
    warningCount += 1
  } else if (seat && typeof seat.available_seats === 'number') {
    if (validCount > seat.available_seats) {
      errors.push({
        row_index: -1,
        email: '',
        error_type: 'seat_limit',
        severity: 'warning',
        message: `Selected rows (${validCount}) exceed available seats (${seat.available_seats})`,
        resolved: false,
      })
      warningCount += 1
    }
  }

  const blocking = errors.filter((e) => e.severity === 'error' && !e.resolved)
  return {
    errors,
    hasBlockingErrors: blocking.length > 0,
    validCount,
    errorCount,
    warningCount,
  }
}

export function formatErrorReportCsvContent(rows, validationErrors = []) {
  const errByRow = new Map()
  validationErrors.forEach((e) => {
    if (e.row_index >= 0) errByRow.set(e.row_index, e)
  })

  const lines = ['email,first_name,last_name,role,error,severity']
  rows.forEach((row) => {
    const ve = errByRow.get(row.rowIndex ?? -1)
    const errMsg = ve?.message || ''
    const sev = ve?.severity || ''
    const roleCell = row.rawRoleValue || row.role_name || ''
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
    lines.push(
      [
        esc(row.email),
        esc(row.first_name),
        esc(row.last_name),
        esc(roleCell),
        esc(errMsg),
        esc(sev),
      ].join(','),
    )
  })

  return lines.join('\n')
}

export function generateErrorReportCsv(rows, validationErrors = []) {
  return new Blob([formatErrorReportCsvContent(rows, validationErrors)], {
    type: 'text/csv;charset=utf-8',
  })
}

function resolveMessageForRow(row, options) {
  const { message, templates, inviterContext, getTemplateForRole } = options
  if (message) {
    return personalizeInvitationMessage(message, {
      inviteeFirstName: row.first_name,
      inviteeLastName: row.last_name,
    })
  }
  const tmpl = getTemplateForRole?.(row.role_name)
  if (!tmpl?.message_body) return null
  const resolved = resolveInvitationTemplatePlaceholders(tmpl.message_body, {
    ...inviterContext,
    roleDisplayName: row.role_display_name || row.role_name,
    inviteeFirstName: row.first_name,
    inviteeLastName: row.last_name,
  })
  return personalizeInvitationMessage(resolved, {
    inviteeFirstName: row.first_name,
    inviteeLastName: row.last_name,
  })
}

/**
 * Send invitations sequentially.
 */
export async function sendBulkInvitations(projectId, rows, options = {}, onProgress) {
  const toSend = rows.filter((r) => r.selected !== false && r.status !== 'skipped')
  const results = []
  let sent = 0
  let failed = 0
  let skipped = 0
  let seatBlocked = false

  const roleIdCache = new Map()

  for (let index = 0; index < toSend.length; index += 1) {
    const row = toSend[index]

    if (seatBlocked) {
      row.status = 'skipped'
      skipped += 1
      results.push({
        email: row.email,
        role_id: row.role_id,
        role_name: row.role_name,
        success: false,
        error: 'Skipped — seat limit reached',
        status: 'skipped',
      })
      onProgress?.({ index, email: row.email, role_id: row.role_id, status: 'skipped' })
      continue
    }

    onProgress?.({ index, email: row.email, role_id: row.role_id, status: 'sending' })

    let invitationRoleId = roleIdCache.get(row.role_id)
    if (!invitationRoleId && row.role_id) {
      const resolved = await resolveInvitationRoleIdForInsert(row.role_id)
      if (resolved.success && resolved.invitationRoleId) {
        invitationRoleId = resolved.invitationRoleId
        roleIdCache.set(row.role_id, invitationRoleId)
      }
    }

    if (!invitationRoleId) {
      failed += 1
      row.status = 'failed'
      results.push({
        email: row.email,
        role_id: row.role_id,
        role_name: row.role_name,
        success: false,
        error: 'Invalid or missing role',
        status: 'failed',
      })
      onProgress?.({ index, email: row.email, role_id: row.role_id, status: 'failed' })
      continue
    }

    const messageToSend = resolveMessageForRow(row, options)

    const inviteResult = await inviteUserToProject(
      projectId,
      {
        email: row.email,
        roleId: row.role_id,
        message: messageToSend,
        expiryDays: options.expiryDays,
        inviteeFirstName: row.first_name,
        inviteeLastName: row.last_name,
      },
      {
        skipSeatCheck: false,
        invitationRoleId,
        inviterUserId: options.inviterUserId,
        isPmoAdmin: options.isPmoAdmin,
      },
    )

    if (inviteResult.success && inviteResult.data?.invitation_token) {
      void dispatchProjectInvitationEmail(row.email, {
        projectId,
        projectCode: options.projectCode,
        projectName: options.projectName,
        roleName: row.role_display_name || row.role_name,
        inviterName: options.inviterName,
        organisationName: options.organisationName,
        message: messageToSend,
        expiryDays: options.expiryDays,
        inviteeFirstName: row.first_name,
        inviteeLastName: row.last_name,
        invitationToken: inviteResult.data.invitation_token,
        projectContext: options.projectContext,
      }).catch(() => {})

      sent += 1
      row.status = 'sent'
      results.push({
        email: row.email,
        role_id: row.role_id,
        role_name: row.role_name,
        success: true,
        error: null,
        status: 'sent',
      })
      onProgress?.({ index, email: row.email, role_id: row.role_id, status: 'sent' })
    } else {
      if (inviteResult.code === 'SEAT_LIMIT_EXCEEDED') {
        seatBlocked = true
      }
      failed += 1
      row.status = 'failed'
      results.push({
        email: row.email,
        role_id: row.role_id,
        role_name: row.role_name,
        success: false,
        error: inviteResult.error || 'Failed to send',
        status: 'failed',
      })
      onProgress?.({ index, email: row.email, role_id: row.role_id, status: 'failed' })
    }
  }

  return { sent, failed, skipped, results }
}

export default {
  parseBulkInviteFile,
  generateCsvTemplate,
  validateBulkInviteRows,
  generateErrorReportCsv,
  sendBulkInvitations,
}
