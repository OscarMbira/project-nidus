import Papa from 'papaparse'
import * as XLSX from 'xlsx'

function extOf(file) {
  const n = String(file?.name || '').toLowerCase()
  const i = n.lastIndexOf('.')
  return i >= 0 ? n.slice(i + 1) : ''
}

/**
 * Parse Excel/CSV into raw matrices (array-of-arrays) for form Excel import (v857).
 * Unlike parseTabularFile, this does NOT treat the first row as object keys — banners stay intact.
 */
export async function parseFormExcelFile(file) {
  const ext = extOf(file)
  if (ext === 'csv') {
    const text = await file.text()
    const parsed = Papa.parse(text, { header: false, skipEmptyLines: false })
    const matrix = (parsed.data || []).map((row) => (Array.isArray(row) ? row : [row]))
    return { format: 'csv', sheets: [{ name: 'Sheet1', matrix }] }
  }
  if (ext === 'xlsx' || ext === 'xls') {
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'array', cellDates: true })
    const sheets = wb.SheetNames.map((name) => {
      const sheet = wb.Sheets[name]
      const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false })
      return { name, matrix: matrix || [] }
    })
    return { format: 'excel', sheets }
  }
  throw new Error(`Unsupported format: .${ext || 'unknown'} — use .xlsx or .csv`)
}
