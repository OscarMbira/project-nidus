/**
 * Excel/CSV → form schema + bulk draft instance helpers (v857).
 * Operates on a raw matrix (array of rows, each an array of cell values).
 * File parsing (SheetJS/Papa) stays in the app layer.
 */

export const FORM_EXCEL_MAX_DATA_ROWS = 500
export const CATEGORY_FIELD_KEY = 'Category'
export const CATEGORY_FIELD_LABEL = 'Category'

const FIELD_TYPE_SET = new Set(['text', 'textarea', 'date', 'number', 'money', 'select', 'attachment'])

export function cellText(value) {
  if (value == null) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10)
  return String(value).trim()
}

/**
 * Coerce Excel/CSV date cells to HTML date input format `yyyy-MM-dd`.
 * Handles Date objects, Excel serials, ISO, and M/D/YY (US) / D/M/Y when month>12.
 */
export function normalizeFormExcelDateValue(raw) {
  if (raw == null || raw === '') return ''
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return raw.toISOString().slice(0, 10)
  }
  // Excel serial day count (approx. 1955–2118)
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 20000 && raw < 80000) {
    const utc = new Date(Date.UTC(1899, 11, 30) + Math.round(raw) * 86400000)
    if (!Number.isNaN(utc.getTime())) return utc.toISOString().slice(0, 10)
  }
  const s = cellText(raw)
  if (!s) return ''
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)

  const mdy = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/)
  if (mdy) {
    let month = Number(mdy[1])
    let day = Number(mdy[2])
    let year = Number(mdy[3])
    if (year < 100) year += year >= 70 ? 1900 : 2000
    // European D/M/Y when first part cannot be a month
    if (month > 12 && day <= 12) {
      const swap = month
      month = day
      day = swap
    }
    if (month < 1 || month > 12 || day < 1 || day > 31) return s
    return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const parsed = Date.parse(s)
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString().slice(0, 10)
  }
  return s
}

export function normalizeLabel(label) {
  return cellText(label).toLowerCase().replace(/\s+/g, ' ')
}

/** Slugify a header into a form field key; ensure uniqueness against `usedKeys`. */
export function slugifyFieldKey(label, usedKeys = new Set()) {
  let base = cellText(label)
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  if (!base) base = 'field'
  if (/^\d/.test(base)) base = `f_${base}`
  let key = base
  let n = 2
  const used = usedKeys instanceof Set ? usedKeys : new Set(usedKeys)
  while (used.has(key)) {
    key = `${base}_${n}`
    n += 1
  }
  used.add(key)
  return key
}

function nonEmptyCells(row = []) {
  return (row || []).map(cellText).filter((c) => c !== '')
}

/** Banner: exactly one non-empty cell (merged category label), or one cell spanning-like. */
export function isBannerRow(row = []) {
  const filled = nonEmptyCells(row)
  if (filled.length !== 1) return false
  const text = filled[0]
  // Avoid treating a one-column header row as a banner when the sheet is truly 1-col
  return text.length > 0
}

export function detectHeaderRowIndex(matrix = []) {
  const limit = Math.min(matrix.length, 15)
  // Prefer the first row that looks like column titles (2+ cells, mostly non-numeric).
  for (let i = 0; i < limit; i += 1) {
    const row = matrix[i] || []
    const filled = nonEmptyCells(row)
    if (filled.length < 2) continue
    if (isBannerRow(row)) continue
    const nonNumeric = filled.filter((c) => !/^-?\d+(\.\d+)?$/.test(c.replace(/,/g, '')))
    if (nonNumeric.length >= Math.ceil(filled.length * 0.6)) {
      return i
    }
  }
  // Fallback: first row with 2+ non-empty cells
  for (let i = 0; i < limit; i += 1) {
    if (nonEmptyCells(matrix[i] || []).length >= 2) return i
  }
  return 0
}

export function inferFieldType(samples = []) {
  const values = (samples || []).map(cellText).filter(Boolean)
  if (!values.length) return 'text'

  const moneyLike = values.filter((v) => /^[$£€¥]?\s*-?\d{1,3}([,. ]\d{3})*([.,]\d+)?\s*$/.test(v) && /[$£€¥]/.test(v))
  if (moneyLike.length >= Math.ceil(values.length * 0.6)) return 'money'

  const numberLike = values.filter((v) => /^-?\d+(\.\d+)?$/.test(v.replace(/,/g, '')))
  if (numberLike.length >= Math.ceil(values.length * 0.7)) return 'number'

  const dateLike = values.filter((v) => {
    if (/^\d{4}-\d{2}-\d{2}/.test(v) || /^\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}$/.test(v)) return true
    const t = Date.parse(v)
    return !Number.isNaN(t) && /[a-zA-Z]|[-/]/.test(v)
  })
  if (dateLike.length >= Math.ceil(values.length * 0.7)) return 'date'

  const longText = values.filter((v) => v.length > 80)
  if (longText.length >= Math.ceil(values.length * 0.5)) return 'textarea'

  return 'text'
}

/**
 * Analyze a raw sheet matrix into schema proposal + data rows with Category.
 * @param {Array<Array<any>>} matrix
 * @param {{ maxDataRows?: number }} [opts]
 */
export function analyzeFormExcelMatrix(matrix = [], opts = {}) {
  const maxDataRows = opts.maxDataRows ?? FORM_EXCEL_MAX_DATA_ROWS
  const rows = (matrix || []).map((r) => (Array.isArray(r) ? r : []))
  if (!rows.length) {
    return {
      headerRowIndex: 0,
      headers: [],
      columns: [],
      categoryOptions: [],
      dataRows: [],
      truncated: false,
      totalDataRows: 0,
      error: 'Sheet is empty',
    }
  }

  const headerRowIndex = detectHeaderRowIndex(rows)
  const headerRow = rows[headerRowIndex] || []
  const colCount = Math.max(...rows.map((r) => r.length), headerRow.length)

  const headers = []
  for (let c = 0; c < colCount; c += 1) {
    const label = cellText(headerRow[c])
    if (label) headers.push({ colIndex: c, label })
  }
  if (headers.length < 1) {
    return {
      headerRowIndex,
      headers: [],
      columns: [],
      categoryOptions: [],
      dataRows: [],
      truncated: false,
      totalDataRows: 0,
      error: 'Could not detect a header row with column titles',
    }
  }

  const usedKeys = new Set([CATEGORY_FIELD_KEY])
  const columns = headers.map((h) => {
    const samples = []
    for (let r = headerRowIndex + 1; r < rows.length && samples.length < 25; r += 1) {
      const row = rows[r] || []
      if (isBannerRow(row)) continue
      if (nonEmptyCells(row).length === 0) continue
      const v = cellText(row[h.colIndex])
      if (v) samples.push(v)
    }
    const type = inferFieldType(samples)
    return {
      colIndex: h.colIndex,
      label: h.label,
      key: slugifyFieldKey(h.label, usedKeys),
      type: FIELD_TYPE_SET.has(type) ? type : 'text',
      skip: false,
      samples: samples.slice(0, 5),
    }
  })

  const categoryOptions = []
  const categorySeen = new Set()
  let currentCategory = ''
  const dataRows = []

  for (let r = headerRowIndex + 1; r < rows.length; r += 1) {
    const row = rows[r] || []
    if (nonEmptyCells(row).length === 0) continue
    if (isBannerRow(row)) {
      // For wide sheets, a single-cell row is a banner. For true 1-column data, treat as data.
      if (headers.length >= 2) {
        currentCategory = nonEmptyCells(row)[0]
        const norm = normalizeLabel(currentCategory)
        if (currentCategory && !categorySeen.has(norm)) {
          categorySeen.add(norm)
          categoryOptions.push(currentCategory)
        }
        continue
      }
    }

    const valuesByCol = {}
    let any = false
    for (const col of columns) {
      const v = cellText(row[col.colIndex])
      valuesByCol[col.colIndex] = v
      if (v) any = true
    }
    if (!any) continue
    dataRows.push({
      rowIndex: r,
      category: currentCategory || '',
      valuesByCol,
    })
  }

  const truncated = dataRows.length > maxDataRows
  const limited = truncated ? dataRows.slice(0, maxDataRows) : dataRows

  return {
    headerRowIndex,
    headers,
    columns,
    categoryOptions,
    dataRows: limited,
    truncated,
    totalDataRows: dataRows.length,
    error: null,
  }
}

/**
 * Merge proposed columns (+ Category select) into builder sections.
 * Never deletes existing fields. Returns { sections, added, matched, skipped }.
 */
export function mergeExcelColumnsIntoSections(existingSections = [], columns = [], categoryOptions = []) {
  const sections = (existingSections || []).map((s) => ({
    ...s,
    fields: (s.fields || []).map((f) => ({ ...f })),
  }))
  if (!sections.length) {
    sections.push({ key: 'section_1', title: 'Section 1', fields: [], isNew: true })
  }

  const allFields = () => sections.flatMap((s) => s.fields)
  let added = 0
  let matched = 0
  let skipped = 0

  const ensureCategory = () => {
    const existing = allFields().find(
      (f) => f.key === CATEGORY_FIELD_KEY || normalizeLabel(f.label) === normalizeLabel(CATEGORY_FIELD_LABEL),
    )
    const options = (categoryOptions || []).map((o) => String(o))
    if (existing) {
      matched += 1
      if (options.length) {
        const merged = [...new Set([...(existing.options || []).map(String), ...options])]
        existing.type = 'select'
        existing.options = merged
      }
      return
    }
    sections[0].fields.unshift({
      key: CATEGORY_FIELD_KEY,
      label: CATEGORY_FIELD_LABEL,
      type: 'select',
      options,
      minLength: '',
      maxLength: '',
      isNew: true,
    })
    added += 1
  }

  if ((categoryOptions || []).length > 0) {
    ensureCategory()
  }

  for (const col of columns || []) {
    if (col.skip) {
      skipped += 1
      continue
    }
    const label = cellText(col.label)
    const key = cellText(col.key) || slugifyFieldKey(label)
    const type = FIELD_TYPE_SET.has(col.type) ? col.type : 'text'
    const existing = allFields().find(
      (f) => f.key === key || normalizeLabel(f.label) === normalizeLabel(label),
    )
    if (existing) {
      matched += 1
      // Only upgrade type when user/inferred type is more specific than text and existing is text
      if (existing.type === 'text' && type !== 'text') existing.type = type
      if (!existing.label && label) existing.label = label
      continue
    }
    // Drop placeholder empty field_1 if it's the only virgin placeholder
    const target = sections[0]
    if (
      target.fields.length === 1
      && target.fields[0].isNew
      && /^field_\d+$/i.test(target.fields[0].key)
      && (!target.fields[0].label || /^Field \d+$/i.test(target.fields[0].label))
    ) {
      target.fields = []
    }
    target.fields.push({
      key,
      label: label || key,
      type,
      options: Array.isArray(col.options) ? col.options : [],
      minLength: '',
      maxLength: '',
      isNew: true,
    })
    added += 1
  }

  if (!sections[0].fields.length) {
    sections[0].fields.push({
      key: 'field_1',
      label: 'Field 1',
      type: 'text',
      options: [],
      minLength: '',
      maxLength: '',
      isNew: true,
    })
  }

  return { sections, added, matched, skipped }
}

/**
 * Build field_key → value map for one data row using column defs + Category.
 * @param {object} dataRow - from analyzeFormExcelMatrix
 * @param {Array<{ colIndex, key, skip, type? }>} columns
 * @param {Record<string, { type?: string }>|Array<{ key: string, type?: string }>} [fieldMeta]
 */
export function buildInstanceValuesFromExcelRow(dataRow, columns = [], fieldMeta = {}) {
  const metaByKey = Array.isArray(fieldMeta)
    ? Object.fromEntries((fieldMeta || []).map((f) => [f.key, f]))
    : fieldMeta || {}
  const values = {}
  if (dataRow?.category) {
    values[CATEGORY_FIELD_KEY] = dataRow.category
  }
  for (const col of columns) {
    if (col.skip || !col.key) continue
    const raw = dataRow?.valuesByCol?.[col.colIndex]
    const fieldType = String(metaByKey[col.key]?.type || col.type || '').toLowerCase()
    const looksDate =
      fieldType === 'date' ||
      (typeof raw === 'number' && raw > 20000 && raw < 80000) ||
      (typeof raw === 'string' && /^\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}$/.test(raw.trim()))
    const v = looksDate || raw instanceof Date ? normalizeFormExcelDateValue(raw) : cellText(raw)
    if (v !== '') values[col.key] = v
  }
  return values
}

/** Auto-map Excel column labels to template field keys by label/key equality. */
export function suggestExcelToFieldMapping(columns = [], templateFields = []) {
  const mapping = {}
  for (const col of columns) {
    if (col.skip) {
      mapping[col.colIndex] = null
      continue
    }
    const byKey = templateFields.find((f) => f.key === col.key)
    const byLabel = templateFields.find((f) => normalizeLabel(f.label) === normalizeLabel(col.label))
    mapping[col.colIndex] = byKey?.key || byLabel?.key || null
  }
  return mapping
}
