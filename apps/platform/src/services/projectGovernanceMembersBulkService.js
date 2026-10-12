/**
 * Bulk governance member import (Steering Committee / Project Board) — Excel/CSV/JSON.
 */
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { validateEmail, validatePhone } from '@nidus/shared/utils/formValidation'
import {
  getGovernanceMembers,
  createGovernanceMember,
} from './projectGovernanceMembersService'

export const GOVERNANCE_MEMBER_IMPORT_COLUMNS = [
  'member_name',
  'role',
  'organisation',
  'email',
  'phone',
  'is_chair',
  'appointed_date',
  'end_date',
  'notes',
]

export const GOVERNANCE_MEMBER_IMPORT_LEGEND = [
  {
    field: 'member_name',
    required: 'Yes',
    data_type: 'Text',
    max_length: '200 (recommended)',
    allowed_values: 'Any non-blank text',
    format_notes: 'Full name of the member. Required on every row.',
    aliases: 'name, full_name',
  },
  {
    field: 'role',
    required: 'No',
    data_type: 'Text',
    max_length: '120 (recommended)',
    allowed_values: 'Any text',
    format_notes: 'Role or title on the body (e.g. Sponsor, Independent member).',
    aliases: 'role_title, title',
  },
  {
    field: 'organisation',
    required: 'No',
    data_type: 'Text',
    max_length: '200 (recommended)',
    allowed_values: 'Any text',
    format_notes: 'Company or org the member represents.',
    aliases: 'organization, company, org',
  },
  {
    field: 'email',
    required: 'No',
    data_type: 'Email list (text)',
    max_length: '1000 (recommended for the whole cell)',
    allowed_values: 'Valid email addresses',
    format_notes: 'One or more emails separated by semicolon (;) or a new line.',
    aliases: 'emails, email_address',
  },
  {
    field: 'phone',
    required: 'No',
    data_type: 'Phone list (text)',
    max_length: '500 (recommended for the whole cell)',
    allowed_values: 'Digits, spaces, +, -, ( )',
    format_notes: 'One or more numbers separated by semicolon (;) or a new line. At least 10 digits each.',
    aliases: 'phones, telephone, mobile',
  },
  {
    field: 'is_chair',
    required: 'No',
    data_type: 'Boolean (text)',
    max_length: '10',
    allowed_values: 'yes | true | 1 | chair | y | no | false | 0 (blank = no)',
    format_notes: 'Marks the member as Chair of the body.',
    aliases: 'chair',
  },
  {
    field: 'appointed_date',
    required: 'No',
    data_type: 'Date',
    max_length: '10',
    allowed_values: 'YYYY-MM-DD (or Excel date cell)',
    format_notes: 'Date appointed to the body.',
    aliases: 'appointed, date_appointed',
  },
  {
    field: 'end_date',
    required: 'No',
    data_type: 'Date',
    max_length: '10',
    allowed_values: 'YYYY-MM-DD (or Excel date cell)',
    format_notes: 'Optional term end. Must be on or after appointed_date when both are set.',
    aliases: 'term_end, date_ended, ended',
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
    member_name: 'Alex Sponsor',
    role: 'Executive Sponsor',
    organisation: 'Example Org',
    email: 'alex@example.com',
    phone: '+263771234567',
    is_chair: 'yes',
    appointed_date: '2026-01-15',
    end_date: '2027-01-14',
    notes: 'Sample row — replace with real members',
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

function parseBoolChair(raw) {
  const v = String(raw || '')
    .trim()
    .toLowerCase()
  if (!v) return false
  return ['yes', 'true', '1', 'y', 'chair'].includes(v)
}

/** Normalize Excel serial dates / strings to YYYY-MM-DD or ''. */
export function normalizeAppointedDate(raw) {
  if (raw == null || raw === '') return ''
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    // Excel serial (approximate UTC)
    const epoch = Date.UTC(1899, 11, 30)
    const ms = epoch + raw * 86400000
    const d = new Date(ms)
    if (Number.isNaN(d.getTime())) return ''
    return d.toISOString().slice(0, 10)
  }
  const s = String(raw).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const parsed = Date.parse(s)
  if (!Number.isNaN(parsed)) return new Date(parsed).toISOString().slice(0, 10)
  return s
}

export async function parseGovernanceMemberImportFile(file) {
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
          const rows = (result.data || [])
            .map(normalizeHeaderRow)
            .filter((r) => {
              const nameVal = pickField(r, ['member_name', 'name', 'full_name'])
              const fieldVal = String(r.field || '').trim().toLowerCase()
              if (fieldVal && GOVERNANCE_MEMBER_IMPORT_LEGEND.some((l) => l.field === fieldVal) && !nameVal) {
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
    const sheetName = workbook.SheetNames.find((n) => !/^(instructions|legend)$/i.test(n)) || workbook.SheetNames[0]
    if (!sheetName) return { rows: [], errors: [{ message: 'Excel file has no sheets' }] }
    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false }).map(normalizeHeaderRow)
    return { rows, errors: [] }
  }

  if (name.endsWith('.json') || file.type === 'application/json') {
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      const list = extractJsonMemberRows(parsed)
      if (!list) {
        return {
          rows: [],
          errors: [{
            message:
              'JSON must be an array of members, or an object with a "members" (or "MEMBERS") array.',
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

export function extractJsonMemberRows(parsed) {
  if (Array.isArray(parsed)) return parsed
  if (!parsed || typeof parsed !== 'object') return null
  const keys = Object.keys(parsed)
  for (const want of ['members', 'MEMBERS', 'rows', 'data']) {
    const key = keys.find((k) => k.toLowerCase() === want.toLowerCase())
    if (key && Array.isArray(parsed[key])) return parsed[key]
  }
  return null
}

export function normalizeGovernanceMemberImportRows(rawRows) {
  return (rawRows || []).map((row, index) => {
    const r = normalizeHeaderRow(row)
    const member_name = pickField(r, ['member_name', 'name', 'full_name'])
    const role_title = pickField(r, ['role', 'role_title', 'title'])
    const organisation = pickField(r, ['organisation', 'organization', 'company', 'org'])
    const emails = splitMultiValue(pickField(r, ['email', 'emails', 'email_address']))
    const phones = splitMultiValue(pickField(r, ['phone', 'phones', 'telephone', 'mobile']))
    const is_chair = parseBoolChair(pickField(r, ['is_chair', 'chair']))
    const appointed_date = normalizeAppointedDate(pickField(r, ['appointed_date', 'appointed', 'date_appointed']))
    const end_date = normalizeAppointedDate(pickField(r, ['end_date', 'term_end', 'date_ended', 'ended']))
    const notes = pickField(r, ['notes', 'note', 'comments'])

    return {
      rowNumber: index + 2,
      member_name,
      role_title,
      organisation,
      email: emails.join('\n'),
      phone: phones.join('\n'),
      emails,
      phones,
      is_chair,
      appointed_date,
      end_date,
      notes,
    }
  })
}

export function validateGovernanceMemberImportRows(rows, existingMembers = []) {
  const ready = []
  const skipped = []
  const anomalies = []

  const existingKeys = new Set(
    (existingMembers || []).map((m) => {
      const n = String(m.member_name || '').trim().toLowerCase()
      const o = String(m.organisation || '').trim().toLowerCase()
      return `${n}||${o}`
    }),
  )

  for (const row of rows || []) {
    const issues = []
    if (!row.member_name) issues.push('Name is required')

    for (const em of row.emails || []) {
      const err = validateEmail(em)
      if (err) issues.push(`Email "${em}": ${err === 'Email is required' ? 'invalid' : err}`)
    }
    for (const ph of row.phones || []) {
      const err = validatePhone(ph)
      if (err) issues.push(`Phone "${ph}": ${err}`)
    }

    if (row.appointed_date && !/^\d{4}-\d{2}-\d{2}$/.test(row.appointed_date)) {
      issues.push(`appointed_date "${row.appointed_date}" must be YYYY-MM-DD`)
    }
    if (row.end_date && !/^\d{4}-\d{2}-\d{2}$/.test(row.end_date)) {
      issues.push(`end_date "${row.end_date}" must be YYYY-MM-DD`)
    }
    if (row.appointed_date && row.end_date && row.end_date < row.appointed_date) {
      issues.push('end_date cannot be before appointed_date')
    }

    if (issues.length) {
      skipped.push({
        rowNumber: row.rowNumber,
        member_name: row.member_name || '(blank)',
        reasons: issues,
      })
      continue
    }

    const key = `${row.member_name.toLowerCase()}||${(row.organisation || '').toLowerCase()}`
    if (existingKeys.has(key)) {
      anomalies.push({
        rowNumber: row.rowNumber,
        kind: 'possible_duplicate',
        message: `Row ${row.rowNumber}: "${row.member_name}"${row.organisation ? ` (${row.organisation})` : ''} already exists — will still insert as a new member`,
      })
    }

    ready.push({
      member_name: row.member_name,
      role_title: row.role_title || '',
      organisation: row.organisation || '',
      email: row.email || '',
      phone: row.phone || '',
      is_chair: !!row.is_chair,
      appointed_date: row.appointed_date || '',
      end_date: row.end_date || '',
      notes: row.notes || '',
      rowNumber: row.rowNumber,
    })
  }

  return { ready, skipped, anomalies }
}

export async function previewGovernanceMemberImport(projectId, bodyType, file) {
  const parsed = await parseGovernanceMemberImportFile(file)
  if (parsed.errors?.length && !parsed.rows?.length) {
    return {
      success: false,
      parseErrors: parsed.errors,
      ready: [],
      skipped: [],
      anomalies: [],
    }
  }

  const existing = await getGovernanceMembers(projectId, bodyType)
  const normalized = normalizeGovernanceMemberImportRows(parsed.rows)
  const validated = validateGovernanceMemberImportRows(normalized, existing)

  return {
    success: true,
    parseErrors: parsed.errors || [],
    ...validated,
  }
}

export async function bulkCreateGovernanceMembers(projectId, bodyType, readyRows, userId = null) {
  const imported = []
  const failed = []

  for (const row of readyRows || []) {
    try {
      const data = await createGovernanceMember(
        projectId,
        bodyType,
        {
          member_name: row.member_name,
          role_title: row.role_title,
          organisation: row.organisation,
          email: row.email,
          phone: row.phone,
          is_chair: row.is_chair,
          appointed_date: row.appointed_date || null,
          end_date: row.end_date || null,
          notes: row.notes,
        },
        userId,
      )
      imported.push(data)
    } catch (e) {
      failed.push({
        rowNumber: row.rowNumber,
        member_name: row.member_name,
        reason: e?.message || String(e),
      })
    }
  }

  return {
    importedCount: imported.length,
    failedCount: failed.length,
    failed,
    imported,
  }
}

function legendCsvBlock() {
  const header = LEGEND_SHEET_COLUMNS.join(',')
  const lines = GOVERNANCE_MEMBER_IMPORT_LEGEND.map((row) =>
    LEGEND_SHEET_COLUMNS.map((col) => {
      const v = String(row[col] ?? '').replace(/"/g, '""')
      return `"${v}"`
    }).join(','),
  )
  return [
    '# DATA DICTIONARY — do not import these lines (CSV comments start with #)',
    `# ${header}`,
    ...lines.map((l) => `# ${l}`),
    '#',
    '# MEMBERS — data starts below',
  ].join('\n')
}

export async function downloadGovernanceMemberImportTemplate(fmt = 'csv') {
  const format = String(fmt || 'csv').toLowerCase()

  if (format === 'xlsx') {
    const wb = XLSX.utils.book_new()
    const instructions = XLSX.utils.aoa_to_sheet([
      ['Governance member bulk upload'],
      ['1. Fill the Members sheet (one member per row).'],
      ['2. Email / phone: use ; or Alt+Enter for multiple values.'],
      ['3. is_chair: yes/true/1/chair or leave blank.'],
      ['4. appointed_date / end_date: YYYY-MM-DD (end_date optional; must be on or after appointed_date).'],
      ['5. See Legend sheet for field rules.'],
    ])
    XLSX.utils.book_append_sheet(wb, instructions, 'Instructions')
    const legend = XLSX.utils.json_to_sheet(GOVERNANCE_MEMBER_IMPORT_LEGEND, {
      header: LEGEND_SHEET_COLUMNS,
    })
    XLSX.utils.book_append_sheet(wb, legend, 'Legend')
    const members = XLSX.utils.json_to_sheet(SAMPLE_ROWS, {
      header: GOVERNANCE_MEMBER_IMPORT_COLUMNS,
    })
    XLSX.utils.book_append_sheet(wb, members, 'Members')
    XLSX.writeFile(wb, 'governance_members_import_template.xlsx')
    return
  }

  if (format === 'json') {
    const payload = {
      DATA_DICTIONARY: GOVERNANCE_MEMBER_IMPORT_LEGEND,
      MEMBERS: SAMPLE_ROWS,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    triggerDownload(blob, 'governance_members_import_template.json')
    return
  }

  const csvBody = Papa.unparse(SAMPLE_ROWS, { columns: GOVERNANCE_MEMBER_IMPORT_COLUMNS })
  const csv = `${legendCsvBlock()}\n${csvBody}`
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  triggerDownload(blob, 'governance_members_import_template.csv')
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
