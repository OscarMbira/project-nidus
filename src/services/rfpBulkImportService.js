/**
 * RFP Bulk Import Service
 *
 * Handles CSV/Excel parsing, validation, and bulk import of RFP line items.
 * PMO Admin only for DB write operations.
 * Parse/validate functions have no role check (client-side only).
 */

import * as XLSX from 'xlsx'
import { batchCreateLineItems, checkPMOAdminRole } from './rfpService'

// ================================================
// CSV PARSING
// ================================================

/**
 * Parse a single CSV line handling quoted fields, embedded commas, and newlines.
 */
function parseCSVLine(line) {
  const values = []
  let currentValue = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentValue += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      values.push(currentValue)
      currentValue = ''
    } else {
      currentValue += char
    }
  }

  values.push(currentValue)
  return values
}

/**
 * Strip UTF-8 BOM from content if present.
 */
function stripBOM(content) {
  if (content.charCodeAt(0) === 0xFEFF) {
    return content.substring(1)
  }
  return content
}

/**
 * Parse RFP CSV content into an array of row objects.
 * No role check - client-side operation only.
 *
 * @param {string} csvContent - Raw CSV file content
 * @returns {{ headers: string[], rows: Object[], totalRows: number }}
 */
export function parseRFPCSV(csvContent) {
  const cleaned = stripBOM(csvContent)
  const lines = cleaned.split('\n').filter(line => line.trim())

  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header row and one data row.')
  }

  const headers = parseCSVLine(lines[0]).map(h => h.trim())

  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const rowData = {}
    headers.forEach((header, index) => {
      rowData[header] = values[index]?.trim() || ''
    })
    rowData._rowNumber = i + 1
    rows.push(rowData)
  }

  return { headers, rows, totalRows: rows.length }
}

// ================================================
// EXCEL PARSING (.xlsx / .xls)
// ================================================

/**
 * Parse an Excel file (ArrayBuffer) into the same shape as parseRFPCSV.
 * Uses first sheet only. First row = headers, rest = data rows.
 *
 * @param {ArrayBuffer} arrayBuffer - File content from file.arrayBuffer()
 * @returns {{ headers: string[], rows: Object[], totalRows: number }}
 */
export function parseRFPExcel(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: 'array', cellText: true, cellDates: false })
  const firstSheetName = wb.SheetNames[0]
  if (!firstSheetName) throw new Error('Excel file has no sheets.')

  const sheet = wb.Sheets[firstSheetName]
  const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false })
  if (!aoa.length) throw new Error('Excel sheet is empty.')

  const rawHeaders = aoa[0]
  const headers = rawHeaders.map((h, j) => (h != null && String(h).trim() !== '' ? String(h).trim() : `Column_${j + 1}`))

  const rows = []
  for (let i = 1; i < aoa.length; i++) {
    const rowArr = aoa[i]
    const obj = {}
    headers.forEach((h, j) => {
      const val = rowArr[j]
      obj[h] = val != null && val !== '' ? String(val).trim() : ''
    })
    obj._rowNumber = i + 1
    rows.push(obj)
  }

  return { headers, rows, totalRows: rows.length }
}

// ================================================
// COLUMN MAPPING
// ================================================

/**
 * Known column name aliases for auto-detection.
 * Maps common header variations to our DB field names.
 */
const COLUMN_ALIASES = {
  item_number: ['s/no', 'sno', 's.no', 'no', 'no.', '#', 'item', 'item no', 'item number', 'seq', 'sequence'],
  reference_number: ['delta id', 'delta id / reference no', 'delta id / reference no.', 'reference no', 'reference no.', 'reference number', 'ref', 'ref no', 'ref.', 'id', 'cr number', 'cr no'],
  scope_entity: ['scope/entity', 'scope / entity', 'scope', 'entity', 'scope_entity'],
  business_area: ['business area', 'business_area', 'area', 'module', 'department', 'category'],
  description: ['description', 'requirement', 'requirement description', 'details', 'scope description'],
  vendor_response: ['vendor response/comments', 'vendor response', 'vendor comments', 'response', 'comments', 'vendor response / comments', 'provider response'],
  priority: ['priority', 'importance', 'criticality'],
  requirement_type: ['requirement type', 'type', 'req type', 'requirement_type'],
  is_mandatory: ['is mandatory', 'mandatory', 'required', 'is_mandatory'],
  acceptance_criteria: ['acceptance criteria', 'acceptance_criteria', 'criteria'],
  estimated_effort: ['estimated effort', 'effort', 'estimated_effort', 'estimate'],
}

/**
 * Auto-detect column mapping from parsed headers.
 * Returns a mapping: { dbField: csvHeader }
 *
 * @param {string[]} csvHeaders - Array of header strings from CSV
 * @returns {{ mapping: Object, unmapped: string[], confidence: Object }}
 */
export function autoDetectColumnMapping(csvHeaders) {
  const mapping = {}
  const confidence = {}
  const mapped = new Set()

  for (const [dbField, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (const csvHeader of csvHeaders) {
      if (mapped.has(csvHeader)) continue

      const normalised = csvHeader.toLowerCase().trim()

      // Exact match
      if (aliases.includes(normalised)) {
        mapping[dbField] = csvHeader
        confidence[dbField] = 'exact'
        mapped.add(csvHeader)
        break
      }

      // Partial match (header contains alias or alias contains header)
      const partialMatch = aliases.find(alias =>
        normalised.includes(alias) || alias.includes(normalised)
      )
      if (partialMatch && !mapping[dbField]) {
        mapping[dbField] = csvHeader
        confidence[dbField] = 'partial'
        mapped.add(csvHeader)
      }
    }
  }

  const unmapped = csvHeaders.filter(h => !mapped.has(h))

  return { mapping, unmapped, confidence }
}

// ================================================
// VALIDATION
// ================================================

/**
 * Validate a single RFP line item row.
 * No role check - client-side operation only.
 *
 * @param {Object} rowData - Mapped row data with DB field names
 * @param {number} rowNumber - Row number for error reporting
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateRFPLineItem(rowData, rowNumber) {
  const errors = []
  const warnings = []

  // Required: item_number
  if (!rowData.item_number && rowData.item_number !== 0) {
    errors.push(`Row ${rowNumber}: S/No (item number) is required`)
  } else {
    const num = parseInt(rowData.item_number, 10)
    if (isNaN(num) || num < 1) {
      errors.push(`Row ${rowNumber}: S/No must be a positive integer, got "${rowData.item_number}"`)
    }
  }

  // Required: description
  if (!rowData.description || rowData.description.trim().length === 0) {
    errors.push(`Row ${rowNumber}: Description is required`)
  } else if (rowData.description.trim().length < 10) {
    warnings.push(`Row ${rowNumber}: Description is very short (${rowData.description.trim().length} chars)`)
  } else if (rowData.description.length > 5000) {
    warnings.push(`Row ${rowNumber}: Description exceeds 5000 chars, will be truncated`)
  }

  // Optional: reference_number length
  if (rowData.reference_number && rowData.reference_number.length > 100) {
    warnings.push(`Row ${rowNumber}: Reference number exceeds 100 chars, will be truncated`)
  }

  // Optional: vendor_response length
  if (rowData.vendor_response && rowData.vendor_response.length > 5000) {
    warnings.push(`Row ${rowNumber}: Vendor response exceeds 5000 chars, will be truncated`)
  }

  // Optional: priority validation
  if (rowData.priority) {
    const validPriorities = ['must_have', 'should_have', 'nice_to_have', 'future_consideration',
      'must-have', 'should-have', 'nice-to-have', 'future',
      'Must-Have', 'Should-Have', 'Nice-to-Have', 'Future']
    if (!validPriorities.includes(rowData.priority)) {
      warnings.push(`Row ${rowNumber}: Priority "${rowData.priority}" not recognized, defaulting to "must_have"`)
    }
  }

  // Optional: requirement_type validation
  if (rowData.requirement_type) {
    const validTypes = ['functional', 'non_functional', 'technical', 'operational', 'compliance', 'integration',
      'Functional', 'Non-Functional', 'Technical', 'Operational', 'Compliance', 'Integration']
    if (!validTypes.includes(rowData.requirement_type)) {
      warnings.push(`Row ${rowNumber}: Requirement type "${rowData.requirement_type}" not recognized, defaulting to "functional"`)
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

/**
 * Validate all parsed rows and return aggregated results.
 *
 * @param {Object[]} rows - Array of mapped row data
 * @returns {{ validRows: Object[], invalidRows: Object[], allErrors: string[], allWarnings: string[], summary: Object }}
 */
export function validateAllRows(rows) {
  const validRows = []
  const invalidRows = []
  const allErrors = []
  const allWarnings = []
  const duplicateCheck = new Map()

  rows.forEach((row, index) => {
    const rowNumber = row._rowNumber || (index + 2)
    const result = validateRFPLineItem(row, rowNumber)

    // Check for duplicate item_number
    if (row.item_number) {
      const num = String(row.item_number).trim()
      if (duplicateCheck.has(num)) {
        result.warnings.push(`Row ${rowNumber}: Duplicate S/No "${num}" (also on row ${duplicateCheck.get(num)})`)
      } else {
        duplicateCheck.set(num, rowNumber)
      }
    }

    allErrors.push(...result.errors)
    allWarnings.push(...result.warnings)

    if (result.valid) {
      validRows.push({ ...row, _rowNumber: rowNumber, _warnings: result.warnings })
    } else {
      invalidRows.push({ ...row, _rowNumber: rowNumber, _errors: result.errors, _warnings: result.warnings })
    }
  })

  return {
    validRows,
    invalidRows,
    allErrors,
    allWarnings,
    summary: {
      total: rows.length,
      valid: validRows.length,
      invalid: invalidRows.length,
      warnings: allWarnings.length,
    },
  }
}

// ================================================
// DATA MAPPING (CSV -> DB format)
// ================================================

/**
 * Normalise priority value from various CSV formats to DB enum.
 */
function normalisePriority(value) {
  if (!value) return 'must_have'
  const normalised = value.toLowerCase().trim().replace(/-/g, '_')
  const map = {
    must_have: 'must_have',
    should_have: 'should_have',
    nice_to_have: 'nice_to_have',
    future_consideration: 'future_consideration',
    future: 'future_consideration',
  }
  return map[normalised] || 'must_have'
}

/**
 * Normalise requirement type from various CSV formats to DB enum.
 */
function normaliseRequirementType(value) {
  if (!value) return 'functional'
  const normalised = value.toLowerCase().trim().replace(/-/g, '_').replace(' ', '_')
  const map = {
    functional: 'functional',
    non_functional: 'non_functional',
    technical: 'technical',
    operational: 'operational',
    compliance: 'compliance',
    integration: 'integration',
  }
  return map[normalised] || 'functional'
}

/**
 * Normalise boolean value from various CSV formats.
 */
function normaliseBoolean(value) {
  if (!value) return true
  const normalised = value.toLowerCase().trim()
  return !['no', 'false', '0', 'n'].includes(normalised)
}

/**
 * Map a parsed CSV row to the DB insert format using the column mapping.
 * Supports additional_columns: array of CSV header names to capture as extra key-value data.
 *
 * @param {Object} csvRow - Raw parsed row from CSV
 * @param {Object} columnMapping - { dbField: csvHeader, additional_columns?: string[] } mapping
 * @returns {Object} DB-ready row data
 */
export function mapRowToDBFormat(csvRow, columnMapping) {
  const getValue = (dbField) => {
    const csvHeader = columnMapping[dbField]
    return csvHeader ? (csvRow[csvHeader] || '').trim() : ''
  }

  const additionalColumnsList = Array.isArray(columnMapping.additional_columns) ? columnMapping.additional_columns : []
  const additional_columns = {}
  for (const header of additionalColumnsList) {
    const val = csvRow[header]
    if (val != null && String(val).trim() !== '') {
      additional_columns[header] = String(val).trim().substring(0, 2000)
    }
  }

  return {
    item_number: parseInt(getValue('item_number'), 10) || 0,
    reference_number: getValue('reference_number').substring(0, 100) || null,
    scope_entity: getValue('scope_entity') || null,
    business_area: getValue('business_area') || null,
    description: getValue('description').substring(0, 5000),
    vendor_response: getValue('vendor_response').substring(0, 5000) || null,
    priority: normalisePriority(getValue('priority')),
    requirement_type: normaliseRequirementType(getValue('requirement_type')),
    is_mandatory: normaliseBoolean(getValue('is_mandatory')),
    acceptance_criteria: getValue('acceptance_criteria') || null,
    estimated_effort: getValue('estimated_effort') || null,
    ...(Object.keys(additional_columns).length > 0 ? { additional_columns } : {}),
  }
}

// ================================================
// BULK IMPORT (DB Write - PMO Admin Only)
// ================================================

/**
 * Import validated line items into the database.
 * PMO Admin only - enforced via batchCreateLineItems in rfpService.
 *
 * @param {string} rfpId - UUID of the parent RFP document
 * @param {Object[]} mappedRows - Array of DB-ready row data from mapRowToDBFormat
 * @param {Object} options - { onProgress?: (current, total) => void }
 * @returns {Promise<{ success: boolean, results: Object }>}
 */
export async function bulkImportLineItems(rfpId, mappedRows, options = {}) {
  const isPMO = await checkPMOAdminRole()
  if (!isPMO) {
    throw new Error('Access denied: Only PMO Administrators can import RFP line items.')
  }

  const results = {
    total: mappedRows.length,
    successful: 0,
    failed: 0,
    errors: [],
    imported: [],
  }

  // Import in batches of 50 for performance
  const BATCH_SIZE = 50
  for (let i = 0; i < mappedRows.length; i += BATCH_SIZE) {
    const batch = mappedRows.slice(i, i + BATCH_SIZE)

    try {
      const imported = await batchCreateLineItems(rfpId, batch)
      results.successful += imported.length
      results.imported.push(...imported)
    } catch (error) {
      // On batch failure, try individual inserts for better error reporting
      for (let j = 0; j < batch.length; j++) {
        try {
          const imported = await batchCreateLineItems(rfpId, [batch[j]])
          results.successful += imported.length
          results.imported.push(...imported)
        } catch (itemError) {
          results.failed++
          results.errors.push({
            row: i + j + 1,
            item_number: batch[j].item_number,
            error: itemError.message,
          })
        }
      }
    }

    if (options.onProgress) {
      options.onProgress(Math.min(i + BATCH_SIZE, mappedRows.length), mappedRows.length)
    }
  }

  return {
    success: results.failed === 0,
    results,
  }
}

// ================================================
// TEMPLATE GENERATION
// ================================================

/**
 * Generate a CSV import template with the correct headers.
 * Includes BOM for Excel compatibility.
 *
 * @returns {string} CSV content with BOM prefix
 */
export function generateRFPImportTemplate() {
  const BOM = '\uFEFF'
  const headers = [
    'S/No',
    'Delta ID / Reference No.',
    'Scope/Entity',
    'Business Area',
    'Description',
    'Vendor Response/Comments',
    'Priority',
    'Requirement Type',
    'Is Mandatory',
    'Acceptance Criteria',
    'Estimated Effort',
  ]

  return BOM + headers.join(',') + '\n'
}

/**
 * Generate a CSV sample file with example rows.
 *
 * @returns {string} CSV content with BOM prefix and sample data
 */
export function generateRFPSampleFile() {
  const BOM = '\uFEFF'
  const headers = [
    'S/No',
    'Delta ID / Reference No.',
    'Scope/Entity',
    'Business Area',
    'Description',
    'Vendor Response/Comments',
    'Priority',
    'Requirement Type',
    'Is Mandatory',
    'Acceptance Criteria',
    'Estimated Effort',
  ]

  const sampleRows = [
    ['1', 'CR22045', '2. DRC Only', '05. Credit', '"Implementation of IFRS9 Accounting module"', '"Successful deployment of FRM module will lay a solid basis for delta analysis."', 'Must-Have', 'Functional', 'Yes', '"Module must comply with IFRS9 standards"', '30 days'],
    ['2', 'TPH_0177', '2. DRC Only', '04. Banking Operations', '"Upload and view supporting documents for SWIFT Transfer"', '"Browser toolbar setup will be used with local transaction reference field."', 'Must-Have', 'Technical', 'Yes', '"Documents viewable within the system"', '15 days'],
    ['3', '', '2. DRC Only', 'Trade Finance', '"Implementation of Full Trade Finance (LC) Core Module"', '"As per existing design specification."', 'Should-Have', 'Functional', 'Yes', '', '45 days'],
    ['4', '', '2. DRC Only', 'Trade Finance', '"Implementation of Full Guarantees (MD) Core Module"', '"As per existing design specification."', 'Should-Have', 'Functional', 'Yes', '', '40 days'],
    ['5', 'T0188-2', '2. DRC Only', '01. Retail & Corporate', '"Capture related parties information within main customer account"', '"Delivered for Classic Browser under Delta addendum."', 'Must-Have', 'Compliance', 'Yes', '"Full legal name, DOB, nationality, occupation captured"', '20 days'],
  ]

  const csvRows = sampleRows.map(row => row.join(','))
  return BOM + headers.join(',') + '\n' + csvRows.join('\n') + '\n'
}

/**
 * Trigger download of CSV template or sample file.
 *
 * @param {string} content - CSV content
 * @param {string} filename - Download filename
 */
export function downloadCSVFile(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Download the blank RFP import template.
 */
export function downloadRFPImportTemplate() {
  const content = generateRFPImportTemplate()
  downloadCSVFile(content, 'RFP_Import_Template.csv')
}

/**
 * Download the RFP sample file with example data.
 */
export function downloadRFPSampleFile() {
  const content = generateRFPSampleFile()
  downloadCSVFile(content, 'RFP_Import_Sample.csv')
}

// ================================================
// EXPORT (No role check - read is allowed for all)
// ================================================

/**
 * Format a line item for CSV export (matching import template columns).
 *
 * @param {Object} item - RFP line item from DB
 * @returns {string[]} Array of cell values
 */
function formatLineItemForCSV(item) {
  const escape = (v) => {
    if (v == null || v === '') return ''
    const s = String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [
    item.item_number ?? '',
    item.reference_number ?? '',
    item.scope_entity ?? '',
    item.business_area ?? '',
    escape(item.description),
    escape(item.vendor_response),
    item.priority ?? 'must_have',
    item.requirement_type ?? 'functional',
    item.is_mandatory !== false ? 'Yes' : 'No',
    escape(item.acceptance_criteria),
    item.estimated_effort ?? '',
  ]
}

/**
 * Generate CSV content from RFP line items (matching import template format).
 *
 * @param {Object[]} lineItems - Array of line items from getLineItems
 * @returns {string} CSV content with BOM
 */
export function exportRFPLineItemsToCSV(lineItems) {
  const BOM = '\uFEFF'
  const headers = [
    'S/No',
    'Delta ID / Reference No.',
    'Scope/Entity',
    'Business Area',
    'Description',
    'Vendor Response/Comments',
    'Priority',
    'Requirement Type',
    'Is Mandatory',
    'Acceptance Criteria',
    'Estimated Effort',
  ]
  const rows = (lineItems || []).map(formatLineItemForCSV).map((cells) => cells.join(','))
  return BOM + headers.join(',') + '\n' + rows.join('\n') + '\n'
}

/**
 * Trigger download of RFP line items as CSV.
 *
 * @param {Object[]} lineItems - Array of line items
 * @param {string} filename - Optional filename (default includes timestamp)
 */
export function downloadRFPLineItemsCSV(lineItems, filename = null) {
  const content = exportRFPLineItemsToCSV(lineItems)
  const name = filename || `RFP_Line_Items_${new Date().toISOString().slice(0, 10)}.csv`
  downloadCSVFile(content, name)
}
