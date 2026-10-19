/**
 * Bulk contact import (v1093) — parse Excel/CSV/JSON, validate, insert.
 */
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { validateEmail, validatePhone } from '@nidus/shared/utils/formValidation'
import { createProjectContact, getProjectContacts } from './projectContactsService'
import { ensureProjectFunctionalRole, listProjectFunctionalRoles } from './teamService'

export const CONTACT_IMPORT_TEMPLATE_COLUMNS = [
  'contact_name',
  'role_title',
  'organisation',
  'contact_type',
  'email',
  'primary_email',
  'phone',
  'primary_phone',
  'address',
  'primary_address',
  'notes',
]

export const CONTACT_TYPE_VALUES = ['internal', 'client', 'vendor', 'other']

/** Data dictionary for template Legend sheets / JSON (practical limits; DB columns are TEXT). */
export const CONTACT_IMPORT_LEGEND = [
  {
    field: 'contact_name',
    required: 'Yes',
    data_type: 'Text',
    max_length: '200 (recommended)',
    allowed_values: 'Any non-blank text',
    format_notes: 'Full name of the contact. Required on every row.',
    aliases: 'name, full_name',
  },
  {
    field: 'role_title',
    required: 'No',
    data_type: 'Text',
    max_length: '120 (recommended)',
    allowed_values: 'Any text',
    format_notes: 'If new to the project, it is added to Project Roles & Skills on import.',
    aliases: 'role',
  },
  {
    field: 'organisation',
    required: 'No',
    data_type: 'Text',
    max_length: '200 (recommended)',
    allowed_values: 'Any text',
    format_notes: 'Company or org. Same name+organisation as an existing contact is flagged as a possible duplicate (still inserted).',
    aliases: 'organization, company, org',
  },
  {
    field: 'contact_type',
    required: 'No',
    data_type: 'Enum (text)',
    max_length: '20',
    allowed_values: 'internal | client | vendor | other',
    format_notes: 'Leave blank if unknown. Other values cause the row to be skipped.',
    aliases: 'type',
  },
  {
    field: 'email',
    required: 'No',
    data_type: 'Email list (text)',
    max_length: '1000 (recommended for the whole cell)',
    allowed_values: 'Valid email addresses',
    format_notes: 'One or more emails separated by semicolon (;) or a new line. Each address must look like name@domain.tld.',
    aliases: 'emails, email_address',
  },
  {
    field: 'primary_email',
    required: 'No',
    data_type: 'Email (text)',
    max_length: '254',
    allowed_values: 'One of the emails in the email column',
    format_notes: 'If blank, the first email is used. If set but not in the list, it is corrected to the first email and flagged.',
    aliases: 'email_primary',
  },
  {
    field: 'phone',
    required: 'No',
    data_type: 'Phone list (text)',
    max_length: '500 (recommended for the whole cell)',
    allowed_values: 'Digits, spaces, +, -, ( )',
    format_notes: 'One or more numbers separated by semicolon (;) or a new line. Each number needs at least 10 digits (include country code, e.g. +263…).',
    aliases: 'phones, telephone, mobile',
  },
  {
    field: 'primary_phone',
    required: 'No',
    data_type: 'Phone (text)',
    max_length: '40',
    allowed_values: 'One of the numbers in the phone column',
    format_notes: 'If blank, the first phone is used. If set but not in the list, it is corrected to the first phone and flagged.',
    aliases: 'phone_primary',
  },
  {
    field: 'address',
    required: 'No',
    data_type: 'Address list (text)',
    max_length: '2000 (recommended for the whole cell)',
    allowed_values: 'Any text',
    format_notes: 'One or more addresses separated by semicolon (;) or a new line. Each line is one address.',
    aliases: 'addresses, street_address, postal_address',
  },
  {
    field: 'primary_address',
    required: 'No',
    data_type: 'Text',
    max_length: '500 (recommended)',
    allowed_values: 'One of the addresses in the address column',
    format_notes: 'If blank, the first address is used. If set but not in the list, it is corrected to the first address and flagged.',
    aliases: 'address_primary',
  },
  {
    field: 'notes',
    required: 'No',
    data_type: 'Text',
    max_length: '2000 (recommended)',
    allowed_values: 'Any text',
    format_notes: 'Free-form comments.',
    aliases: 'note, comments',
  },
]

const LEGEND_SHEET_COLUMNS = [
  'field',
  'required',
  'data_type',
  'max_length',
  'allowed_values',
  'format_notes',
  'aliases',
]

const SAMPLE_ROWS = [
  {
    contact_name: 'Ada Lovelace',
    role_title: 'Analyst',
    organisation: 'Example Org',
    contact_type: 'internal',
    email: 'ada@example.com; ada.alt@example.com',
    primary_email: 'ada@example.com',
    phone: '+263771234567',
    primary_phone: '+263771234567',
    address: '1 Example Street; 2 Sample Road',
    primary_address: '1 Example Street',
    notes: 'Sample row — replace with real contacts',
  },
]

function normKey(key) {
  return String(key || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
}

function pickField(row, aliases) {
  for (const a of aliases) {
    if (row[a] != null && String(row[a]).trim() !== '') return String(row[a]).trim()
  }
  return ''
}

/** Split multi-value cell on ; or newlines */
export function splitMultiValue(raw) {
  if (raw == null || raw === '') return []
  return String(raw)
    .split(/[;\n\r]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function normalizeHeaderRow(row) {
  const out = {}
  Object.keys(row || {}).forEach((key) => {
    out[normKey(key)] = row[key]
  })
  return out
}

/**
 * @param {File} file
 * @returns {Promise<{ rows: object[], errors: { message: string }[] }>}
 */
export async function parseContactImportFile(file) {
  if (!file) return { rows: [], errors: [{ message: 'No file selected' }] }
  const name = (file.name || '').toLowerCase()

  if (name.endsWith('.csv') || file.type === 'text/csv') {
    return new Promise((resolve) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        comments: '#',
        transformHeader: (h) => normKey(h),
        complete: (result) => {
          // Drop accidental legend rows if someone removed the # prefix
          const rows = (result.data || [])
            .map(normalizeHeaderRow)
            .filter((r) => {
              const nameVal = pickField(r, ['contact_name', 'name', 'full_name'])
              const fieldVal = String(r.field || '').trim().toLowerCase()
              if (fieldVal && CONTACT_IMPORT_LEGEND.some((l) => l.field === fieldVal) && !nameVal) {
                return false
              }
              return true
            })
          resolve({
            rows,
            errors: (result.errors || []).map((e) => ({ message: e.message || String(e) })),
          })
        },
        error: (err) => resolve({ rows: [], errors: [{ message: err.message || 'CSV parse failed' }] }),
      })
    })
  }

  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) return { rows: [], errors: [{ message: 'Excel file has no sheets' }] }
    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' }).map(normalizeHeaderRow)
    return { rows, errors: [] }
  }

  if (name.endsWith('.json') || file.type === 'application/json') {
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      const list = extractJsonContactRows(parsed)
      if (!list) {
        return {
          rows: [],
          errors: [{
            message:
              'JSON must be an array of contacts, or an object with a "contacts" (or "CONTACTS") array. Use the downloaded template shape.',
          }],
        }
      }
      return { rows: list.map(normalizeHeaderRow), errors: [] }
    } catch (e) {
      return { rows: [], errors: [{ message: `Invalid JSON: ${e.message}` }] }
    }
  }

  return {
    rows: [],
    errors: [{ message: 'Unsupported file type. Use .csv, .xlsx, or .json' }],
  }
}

/** Pull contacts array from template JSON ({ contacts / CONTACTS / rows }) or a bare array. */
export function extractJsonContactRows(parsed) {
  if (Array.isArray(parsed)) return parsed
  if (!parsed || typeof parsed !== 'object') return null
  const keys = Object.keys(parsed)
  for (const want of ['contacts', 'CONTACTS', 'rows', 'data']) {
    const key = keys.find((k) => k.toLowerCase() === want.toLowerCase())
    if (key && Array.isArray(parsed[key])) return parsed[key]
  }
  return null
}

/**
 * Map raw rows to contact field objects (no DB validation yet).
 * @param {object[]} rawRows
 */
export function normalizeContactImportRows(rawRows) {
  return (rawRows || []).map((row, index) => {
    const r = normalizeHeaderRow(row)
    const contact_name = pickField(r, ['contact_name', 'name', 'full_name'])
    const role_title = pickField(r, ['role_title', 'role'])
    const organisation = pickField(r, ['organisation', 'organization', 'company', 'org'])
    let contact_type = pickField(r, ['contact_type', 'type']).toLowerCase()
    const emails = splitMultiValue(pickField(r, ['email', 'emails', 'email_address']))
    const phones = splitMultiValue(pickField(r, ['phone', 'phones', 'telephone', 'mobile']))
    const addresses = splitMultiValue(pickField(r, ['address', 'addresses', 'street_address', 'postal_address']))
    let primary_email = pickField(r, ['primary_email', 'email_primary'])
    let primary_phone = pickField(r, ['primary_phone', 'phone_primary'])
    let primary_address = pickField(r, ['primary_address', 'address_primary'])
    const notes = pickField(r, ['notes', 'note', 'comments'])

    const primaryEmailCorrected = Boolean(primary_email && emails.length && !emails.includes(primary_email))
    const primaryPhoneCorrected = Boolean(primary_phone && phones.length && !phones.includes(primary_phone))
    const primaryAddressCorrected = Boolean(primary_address && addresses.length && !addresses.includes(primary_address))
    if (!primary_email && emails.length) primary_email = emails[0]
    if (primaryEmailCorrected) primary_email = emails[0]
    if (!primary_phone && phones.length) primary_phone = phones[0]
    if (primaryPhoneCorrected) primary_phone = phones[0]
    if (!primary_address && addresses.length) primary_address = addresses[0]
    if (primaryAddressCorrected) primary_address = addresses[0]

    return {
      rowNumber: index + 2, // 1-based data row assuming header on row 1
      contact_name,
      role_title,
      organisation,
      contact_type,
      email: emails.join('\n'),
      phone: phones.join('\n'),
      address: addresses.join('\n'),
      emails,
      phones,
      addresses,
      primary_email: primary_email || '',
      primary_phone: primary_phone || '',
      primary_address: primary_address || '',
      notes,
      _flags: {
        primaryEmailCorrected,
        primaryPhoneCorrected,
        primaryAddressCorrected,
        blankOptional: !role_title && !organisation && !emails.length && !phones.length && !addresses.length && !notes,
      },
    }
  })
}

/**
 * @param {ReturnType<typeof normalizeContactImportRows>} rows
 * @param {object[]} existingContacts
 * @param {{ roleLabels?: string[] }} [opts]
 */
export function validateContactImportRows(rows, existingContacts = [], opts = {}) {
  const ready = []
  const skipped = []
  const anomalies = []
  const catalogRoles = new Set(
    (opts.roleLabels || []).map((l) => String(l).trim().toLowerCase()).filter(Boolean),
  )

  const existingKeys = new Set(
    (existingContacts || []).map((c) => {
      const n = String(c.contact_name || '').trim().toLowerCase()
      const o = String(c.organisation || '').trim().toLowerCase()
      return `${n}||${o}`
    }),
  )

  for (const row of rows || []) {
    const issues = []
    if (!row.contact_name) {
      issues.push('Name is required')
    }

    for (const em of row.emails || []) {
      const err = validateEmail(em)
      if (err) issues.push(`Email "${em}": ${err === 'Email is required' ? 'invalid' : err}`)
    }
    for (const ph of row.phones || []) {
      const err = validatePhone(ph)
      if (err) issues.push(`Phone "${ph}": ${err}`)
    }

    if (row.contact_type && !CONTACT_TYPE_VALUES.includes(row.contact_type)) {
      issues.push(`Unknown contact_type "${row.contact_type}" (use internal|client|vendor|other)`)
    }

    if (issues.length) {
      skipped.push({
        rowNumber: row.rowNumber,
        contact_name: row.contact_name || '(blank)',
        reasons: issues,
      })
      continue
    }

    const key = `${row.contact_name.toLowerCase()}||${(row.organisation || '').toLowerCase()}`
    if (existingKeys.has(key)) {
      anomalies.push({
        rowNumber: row.rowNumber,
        kind: 'possible_duplicate',
        message: `Row ${row.rowNumber}: "${row.contact_name}"${row.organisation ? ` (${row.organisation})` : ''} already exists on this project — will still insert as a new contact`,
      })
    }

    if (row.role_title) {
      const rl = row.role_title.toLowerCase()
      if (!catalogRoles.has(rl)) {
        anomalies.push({
          rowNumber: row.rowNumber,
          kind: 'role_will_create',
          message: `Row ${row.rowNumber}: role "${row.role_title}" is not in Project Roles & Skills — will be added`,
        })
      }
    }

    if (row._flags?.primaryEmailCorrected) {
      anomalies.push({
        rowNumber: row.rowNumber,
        kind: 'primary_email_corrected',
        message: `Row ${row.rowNumber}: primary_email was not in the email list — set to first email`,
      })
    }
    if (row._flags?.primaryPhoneCorrected) {
      anomalies.push({
        rowNumber: row.rowNumber,
        kind: 'primary_phone_corrected',
        message: `Row ${row.rowNumber}: primary_phone was not in the phone list — set to first phone`,
      })
    }
    if (row._flags?.primaryAddressCorrected) {
      anomalies.push({
        rowNumber: row.rowNumber,
        kind: 'primary_address_corrected',
        message: `Row ${row.rowNumber}: primary_address was not in the address list — set to first address`,
      })
    }
    if (row._flags?.blankOptional) {
      anomalies.push({
        rowNumber: row.rowNumber,
        kind: 'sparse_row',
        message: `Row ${row.rowNumber}: "${row.contact_name}" has no role, organisation, email, phone, address, or notes`,
      })
    }

    ready.push({
      contact_name: row.contact_name,
      role_title: row.role_title || '',
      organisation: row.organisation || '',
      contact_type: row.contact_type || '',
      email: row.email || '',
      phone: row.phone || '',
      address: row.address || '',
      primary_email: row.primary_email || '',
      primary_phone: row.primary_phone || '',
      primary_address: row.primary_address || '',
      notes: row.notes || '',
      rowNumber: row.rowNumber,
    })
  }

  return { ready, skipped, anomalies }
}

/**
 * Build preview from file + existing project data.
 */
export async function previewContactImport(projectId, file) {
  return previewContactImportRows(projectId, await parseContactImportFile(file))
}

/**
 * Preview already-parsed rows (v1272: also used after the Import Mapper re-keys a file's columns).
 * @param {string} projectId
 * @param {{ rows: object[], errors?: { message: string }[] }} parsed
 */
export async function previewContactImportRows(projectId, parsed) {
  if (parsed.errors?.length && !parsed.rows?.length) {
    return {
      success: false,
      parseErrors: parsed.errors,
      ready: [],
      skipped: [],
      anomalies: [],
    }
  }

  const [existing, rolesResult] = await Promise.all([
    getProjectContacts(projectId),
    listProjectFunctionalRoles(projectId),
  ])
  const roleLabels = (rolesResult.data || []).map((r) => r.role_label)
  const normalized = normalizeContactImportRows(parsed.rows)
  const validated = validateContactImportRows(normalized, existing, { roleLabels })

  return {
    success: true,
    parseErrors: parsed.errors || [],
    ...validated,
  }
}

/**
 * Insert ready rows; ensure roles. Returns import summary.
 */
export async function bulkCreateProjectContacts(projectId, readyRows, userId = null) {
  const imported = []
  const failed = []
  const rolesCreated = []
  const roleCache = new Set()

  for (const row of readyRows || []) {
    try {
      if (row.role_title && !roleCache.has(row.role_title.toLowerCase())) {
        const ens = await ensureProjectFunctionalRole(projectId, row.role_title, userId)
        roleCache.add(row.role_title.toLowerCase())
        if (ens.success && (ens.created || ens.reactivated)) {
          rolesCreated.push(row.role_title)
        }
      }
      const data = await createProjectContact(projectId, row, userId)
      imported.push({ rowNumber: row.rowNumber, contact_name: row.contact_name, id: data?.id })
    } catch (e) {
      failed.push({
        rowNumber: row.rowNumber,
        contact_name: row.contact_name,
        reason: e?.message || 'Insert failed',
      })
    }
  }

  return {
    importedCount: imported.length,
    failedCount: failed.length,
    imported,
    failed,
    rolesCreated: [...new Set(rolesCreated)],
  }
}

export function getContactImportTemplateRows() {
  return SAMPLE_ROWS.map((r) => ({ ...r }))
}

export function getContactImportLegendRows() {
  return CONTACT_IMPORT_LEGEND.map((r) => ({ ...r }))
}

/** Escape a value for a # comment CSV legend line */
function csvCommentCell(value) {
  const s = String(value ?? '')
  if (/[",\n\r#]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

/**
 * Single CSV file: visible # DATA DICTIONARY block (Excel/Notepad), then contacts table.
 * Lines starting with # are ignored on import (Papa comments).
 */
export function buildCsvTemplateWithEmbeddedLegend(rows, legend) {
  const lines = []
  lines.push('# =============================================================================')
  lines.push('# DATA DICTIONARY — field types, sizes, and rules')
  lines.push('# (These # lines are for your reference only and are ignored when you upload this file.)')
  lines.push('# =============================================================================')
  lines.push(`# ${LEGEND_SHEET_COLUMNS.join(',')}`)
  for (const row of legend || []) {
    const cells = LEGEND_SHEET_COLUMNS.map((c) => csvCommentCell(row[c]))
    lines.push(`# ${cells.join(',')}`)
  }
  lines.push('#')
  lines.push('# =============================================================================')
  lines.push('# CONTACTS — one person per row. Replace the sample row with your data.')
  lines.push('# Multiple emails/phones: separate with ; or a new line inside the cell.')
  lines.push('# =============================================================================')
  lines.push(Papa.unparse(rows, { columns: CONTACT_IMPORT_TEMPLATE_COLUMNS }))
  return `${lines.join('\n')}\n`
}

export async function downloadContactImportTemplate(format) {
  const rows = getContactImportTemplateRows()
  const legend = getContactImportLegendRows()

  if (format === 'json') {
    const payload = {
      INSTRUCTIONS: [
        '1. Read DATA_DICTIONARY for each field’s type, size, allowed values, and notes.',
        '2. Add your contacts under CONTACTS (one object per person). Keep the sample only as a guide.',
        '3. Multiple emails or phones: use a semicolon (;) or newline inside the string.',
        '4. Upload this file on Bulk contact upload — only CONTACTS is imported; DATA_DICTIONARY is ignored.',
      ],
      DATA_DICTIONARY: legend,
      CONTACTS: rows,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    triggerDownload(blob, 'contact-directory-template.json')
    return
  }

  if (format === 'csv') {
    const csv = buildCsvTemplateWithEmbeddedLegend(rows, legend)
    triggerDownload(
      new Blob([csv], { type: 'text/csv;charset=utf-8' }),
      'contact-directory-template.csv',
    )
    return
  }

  if (format === 'xlsx') {
    const wb = XLSX.utils.book_new()
    const contactsWs = XLSX.utils.json_to_sheet(rows, { header: CONTACT_IMPORT_TEMPLATE_COLUMNS })
    contactsWs['!cols'] = CONTACT_IMPORT_TEMPLATE_COLUMNS.map((col) => ({
      wch: Math.max(14, Math.min(36, col.length + 8)),
    }))
    XLSX.utils.book_append_sheet(wb, contactsWs, 'Contacts')

    const legendWs = XLSX.utils.json_to_sheet(legend, { header: LEGEND_SHEET_COLUMNS })
    legendWs['!cols'] = [
      { wch: 16 },
      { wch: 10 },
      { wch: 18 },
      { wch: 22 },
      { wch: 36 },
      { wch: 70 },
      { wch: 28 },
    ]
    XLSX.utils.book_append_sheet(wb, legendWs, 'Legend')

    const instructions = [
      { step: 1, instruction: 'Read the Legend sheet for field types, sizes, and allowed values.' },
      { step: 2, instruction: 'On the Contacts sheet, replace the sample row with your contacts (one person per row).' },
      { step: 3, instruction: 'Multiple emails or phones: separate with a semicolon (;) or put each on a new line inside the cell.' },
      { step: 4, instruction: 'Save the file, then upload it on Bulk contact upload. Invalid rows are skipped; possible duplicates are flagged but still inserted as new.' },
      { step: 5, instruction: 'Do not rename the Contacts sheet header row. Extra columns are ignored.' },
    ]
    const instrWs = XLSX.utils.json_to_sheet(instructions, { header: ['step', 'instruction'] })
    instrWs['!cols'] = [{ wch: 8 }, { wch: 100 }]
    XLSX.utils.book_append_sheet(wb, instrWs, 'Instructions')

    XLSX.writeFile(wb, 'contact-directory-template.xlsx')
    return
  }

  throw new Error(`Unknown template format: ${format}`)
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
