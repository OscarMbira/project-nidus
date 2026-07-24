/**
 * Form Field Translation Bulk Import Service
 *
 * Excel export/import for PMO Admins to bulk-translate form template field
 * labels and select-option labels into a target language. Mirrors the shape
 * of rfpBulkImportService.js (parse -> validate -> map -> bulk upsert).
 * DB writes (bulkUpsertFieldTranslations) enforce PMO-admin RLS server-side —
 * parse/validate below are client-side only, no role check needed.
 */

import * as XLSX from 'xlsx'
import { bulkUpsertFieldTranslations } from './formEngineService'

const HEADERS = ['Section Key', 'Field Key', 'Row Type', 'Option Value', 'English Text', 'Translated Text']

// ================================================
// TEMPLATE GENERATION (download blank/pre-filled sheet for a template + language)
// ================================================

/**
 * Build the long-format rows (one concept per row: a field label, or one of
 * its select options) for a schema, optionally pre-filled with existing
 * translations for the target language.
 *
 * @param {{sections:Array}} schema - template.current_version.schema
 * @param {Array} existingTranslations - all rows for this template (any language), from getFieldTranslations
 * @param {string} languageCode - target language being translated into
 * @returns {Array<Array<string>>} array-of-arrays including the header row
 */
export function buildTranslationSheetRows(schema, existingTranslations, languageCode) {
  const existingIndex = new Map()
  for (const row of existingTranslations || []) {
    if (row.language_code !== languageCode) continue
    existingIndex.set(`${row.section_key}::${row.field_key}`, row)
  }

  const rows = [HEADERS]

  for (const section of schema?.sections || []) {
    for (const field of section.fields || []) {
      const existing = existingIndex.get(`${section.key}::${field.key}`)
      rows.push([
        section.key,
        field.key,
        'field',
        '',
        field.label || '',
        existing?.label || '',
      ])

      for (const option of field.options || []) {
        const translatedOption = existing?.option_labels?.[option.value] || ''
        rows.push([
          section.key,
          field.key,
          'option',
          option.value,
          option.label || '',
          translatedOption,
        ])
      }
    }
  }

  return rows
}

/**
 * Download an .xlsx translation sheet for a template + target language.
 *
 * @param {{template_code:string}} template
 * @param {{sections:Array}} schema
 * @param {Array} existingTranslations
 * @param {string} languageCode
 */
export function downloadTranslationTemplate(template, schema, existingTranslations, languageCode) {
  const aoa = buildTranslationSheetRows(schema, existingTranslations, languageCode)
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Translations')
  const filename = `${template?.template_code || 'Form'}_Translations_${languageCode}.xlsx`
  XLSX.writeFile(wb, filename)
}

// ================================================
// EXCEL PARSING
// ================================================

/**
 * Parse an uploaded translation Excel file (ArrayBuffer) into raw row objects.
 *
 * @param {ArrayBuffer} arrayBuffer
 * @returns {Array<{section_key:string, field_key:string, row_type:string, option_value:string, english_text:string, translated_text:string, _rowNumber:number}>}
 */
export function parseTranslationExcel(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: 'array', cellText: true, cellDates: false })
  const firstSheetName = wb.SheetNames[0]
  if (!firstSheetName) throw new Error('Excel file has no sheets.')

  const sheet = wb.Sheets[firstSheetName]
  const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false })
  if (!aoa.length) throw new Error('Excel sheet is empty.')

  const headerRow = aoa[0].map((h) => String(h || '').trim().toLowerCase())
  const colIndex = {
    section_key: headerRow.indexOf('section key'),
    field_key: headerRow.indexOf('field key'),
    row_type: headerRow.indexOf('row type'),
    option_value: headerRow.indexOf('option value'),
    english_text: headerRow.indexOf('english text'),
    translated_text: headerRow.indexOf('translated text'),
  }

  if (colIndex.section_key === -1 || colIndex.field_key === -1 || colIndex.row_type === -1) {
    throw new Error('Sheet is missing required columns (Section Key, Field Key, Row Type). Use the downloaded template.')
  }

  const rows = []
  for (let i = 1; i < aoa.length; i++) {
    const rowArr = aoa[i]
    if (!rowArr || rowArr.every((cell) => cell === '' || cell == null)) continue

    rows.push({
      section_key: String(rowArr[colIndex.section_key] || '').trim(),
      field_key: String(rowArr[colIndex.field_key] || '').trim(),
      row_type: String(rowArr[colIndex.row_type] || '').trim().toLowerCase(),
      option_value: colIndex.option_value !== -1 ? String(rowArr[colIndex.option_value] || '').trim() : '',
      english_text: colIndex.english_text !== -1 ? String(rowArr[colIndex.english_text] || '').trim() : '',
      translated_text: colIndex.translated_text !== -1 ? String(rowArr[colIndex.translated_text] || '').trim() : '',
      _rowNumber: i + 1,
    })
  }

  return rows
}

// ================================================
// VALIDATION
// ================================================

/**
 * @param {Array} rows - from parseTranslationExcel
 * @returns {{validRows:Array, invalidRows:Array, allErrors:string[], allWarnings:string[], summary:object}}
 */
export function validateTranslationRows(rows) {
  const validRows = []
  const invalidRows = []
  const allErrors = []
  const allWarnings = []

  for (const row of rows || []) {
    const errors = []
    const warnings = []

    if (!row.section_key) errors.push(`Row ${row._rowNumber}: Section Key is required`)
    if (!row.field_key) errors.push(`Row ${row._rowNumber}: Field Key is required`)
    if (row.row_type !== 'field' && row.row_type !== 'option') {
      errors.push(`Row ${row._rowNumber}: Row Type must be "field" or "option", got "${row.row_type}"`)
    }
    if (row.row_type === 'option' && !row.option_value) {
      errors.push(`Row ${row._rowNumber}: Option Value is required for an "option" row`)
    }
    if (!row.translated_text) {
      warnings.push(`Row ${row._rowNumber}: Translated Text is blank — this line will be skipped`)
    }

    allErrors.push(...errors)
    allWarnings.push(...warnings)

    if (errors.length === 0) {
      validRows.push(row)
    } else {
      invalidRows.push({ ...row, _errors: errors })
    }
  }

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
// MAPPING (long-format rows -> per-field translation payload)
// ================================================

/**
 * Collapse validated long-format rows into one payload row per field, ready
 * for bulkUpsertFieldTranslations. Rows with a blank Translated Text are
 * dropped (nothing to save for that line).
 *
 * @param {Array} validRows - from validateTranslationRows
 * @returns {Array<{section_key:string, field_key:string, label:string|null, option_labels:object}>}
 */
export function buildTranslationPayloadRows(validRows) {
  const byField = new Map()

  for (const row of validRows) {
    if (!row.translated_text) continue

    const key = `${row.section_key}::${row.field_key}`
    if (!byField.has(key)) {
      byField.set(key, { section_key: row.section_key, field_key: row.field_key, label: null, option_labels: {} })
    }
    const entry = byField.get(key)

    if (row.row_type === 'field') {
      entry.label = row.translated_text
    } else {
      entry.option_labels[row.option_value] = row.translated_text
    }
  }

  return [...byField.values()]
}

// ================================================
// BULK IMPORT (DB write — PMO admin enforced server-side via RLS)
// ================================================

/**
 * @param {string} templateId
 * @param {string} languageCode
 * @param {Array} payloadRows - from buildTranslationPayloadRows
 * @param {'platform'|'sim'} [mode]
 * @returns {Promise<{success:boolean, message?:string, data?:object}>}
 */
export async function bulkImportFieldTranslations(templateId, languageCode, payloadRows, mode = 'platform') {
  if (!payloadRows.length) {
    return { success: true, data: { upserted: 0 } }
  }
  return bulkUpsertFieldTranslations(templateId, languageCode, payloadRows, mode)
}
