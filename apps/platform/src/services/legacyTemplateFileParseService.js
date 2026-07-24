import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import {
  parseMspdiXml,
  suggestColumnMapping,
  SCHEDULE_CANONICAL,
  LIST_TYPE_FIELDS,
  sheetNameToRaidItemType,
} from '@nidus/shared/utils/legacyTemplateParse'

function extOf(file) {
  const n = String(file?.name || '').toLowerCase()
  const i = n.lastIndexOf('.')
  return i >= 0 ? n.slice(i + 1) : ''
}

export async function parseTabularFile(file) {
  const ext = extOf(file)
  if (ext === 'csv') {
    const text = await file.text()
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true })
    const rows = parsed.data || []
    const headers = parsed.meta?.fields || Object.keys(rows[0] || {})
    return { format: 'csv', sheets: [{ name: 'Sheet1', headers, rows }] }
  }
  if (ext === 'xlsx' || ext === 'xls') {
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'array' })
    const sheets = wb.SheetNames.map((name) => {
      const sheet = wb.Sheets[name]
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
      const headers = rows[0] ? Object.keys(rows[0]) : []
      return { name, headers, rows }
    })
    return { format: 'excel', sheets }
  }
  if (ext === 'xml') {
    const text = await file.text()
    const rows = parseMspdiXml(text)
    const headers = SCHEDULE_CANONICAL.filter((h) => rows.some((r) => r[h]))
    return {
      format: 'mspdi',
      sheets: [{ name: 'MSPDI', headers: headers.length ? headers : SCHEDULE_CANONICAL, rows }],
    }
  }
  if (ext === 'mpp') {
    throw new Error(
      'Raw .mpp is not supported in-app. Convert locally with @byteink/mppjs (or MS Project Save As → XML), then upload the MSPDI .xml file.',
    )
  }
  throw new Error(`Unsupported format: .${ext || 'unknown'}`)
}

export function buildSchedulePreview(sheets, mappingOverride = null) {
  const sheet = sheets[0]
  if (!sheet) return { mapping: {}, mappedRows: [], headers: [] }
  const mapping = mappingOverride || suggestColumnMapping(sheet.headers, SCHEDULE_CANONICAL)
  const mappedRows = (sheet.rows || []).map((row) => {
    const out = {}
    for (const [src, dest] of Object.entries(mapping)) {
      if (!dest) continue
      const val = row[src]
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        out[dest] = typeof val === 'string' ? val.trim() : val
      }
    }
    return out
  }).filter((r) => Object.keys(r).length > 0)
  return { mapping, mappedRows, headers: sheet.headers }
}

export function buildStructuredListPreview(listType, sheets, mappingOverride = null) {
  const fields = LIST_TYPE_FIELDS[listType]
  if (!fields) throw new Error(`Unknown list type: ${listType}`)

  const allRows = []
  let mapping = mappingOverride

  for (const sheet of sheets || []) {
    const sheetMap = mapping || suggestColumnMapping(sheet.headers, fields)
    if (!mapping) mapping = sheetMap
    const raidType = listType === 'raid_log' ? sheetNameToRaidItemType(sheet.name) : null
    for (const row of sheet.rows || []) {
      const out = {}
      for (const [src, dest] of Object.entries(sheetMap)) {
        if (!dest) continue
        const val = row[src]
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          out[dest] = typeof val === 'string' ? val.trim() : val
        }
      }
      if (raidType && !out.item_type) out.item_type = raidType
      if (Object.keys(out).length) allRows.push(out)
    }
  }

  return { mapping: mapping || {}, mappedRows: allRows, headers: sheets?.[0]?.headers || [] }
}
