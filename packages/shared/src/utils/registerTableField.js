/**
 * Local Register "Table" field type (v1326) — a list where every row has named columns, e.g.
 * Version History (Version | Date | Author | Change) or Glossary (Term | Definition).
 *
 * Columns live in the field's dropdown_options as [{ value: key, label, type?: 'text'|'date'|'select',
 * options?: string[] }]. A 'select' column (v1351) offers a fixed list and stores the chosen label as
 * the cell text, so views and exports need no lookup.
 * The value is stored as text: one row per line, cells separated by a tab — so search, list
 * export and the older "A – B – C" one-per-line values keep working. Lines without a tab are
 * split on spaced dashes ("1.0 – 2026-10-24 – First draft"), which reads values captured before
 * the field became a table.
 */

const CELL_SEPARATOR = '\t'
const DASH_SEPARATOR = /\s+[–—-]\s+/

/** Column definitions of a table field. */
export function tableColumns(field) {
  return (Array.isArray(field?.dropdown_options) ? field.dropdown_options : [])
    .filter((c) => c && c.value)
    .map((c) => {
      const options = Array.isArray(c.options)
        ? c.options.map((o) => (o && typeof o === 'object' ? o.label || o.value : o)).filter(Boolean).map(String)
        : []
      if (c.type === 'select' && options.length) return { key: c.value, label: c.label || c.value, type: 'select', options }
      return { key: c.value, label: c.label || c.value, type: c.type === 'date' ? 'date' : 'text' }
    })
}

/** Stored text → rows of cells (each row padded/trimmed to the column count). */
export function parseTableValue(value, columnCount) {
  if (value === null || value === undefined) return []
  const text = Array.isArray(value) ? value.join('\n') : String(value)
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '')
    .map((line) => {
      let cells = line.includes(CELL_SEPARATOR) ? line.split(CELL_SEPARATOR) : line.split(DASH_SEPARATOR)
      cells = cells.map((c) => c.trim())
      if (columnCount && cells.length > columnCount) {
        // Extra parts belong to the last column (e.g. a dash inside a description).
        cells = [...cells.slice(0, columnCount - 1), cells.slice(columnCount - 1).join(' – ')]
      }
      while (columnCount && cells.length < columnCount) cells.push('')
      return cells
    })
}

/** Rows of cells → stored text. Empty rows are dropped; tabs/new lines inside cells become spaces. */
export function joinTableValue(rows) {
  return (rows || [])
    .map((row) => (row || []).map((c) => String(c ?? '').replace(/[\t\r\n]+/g, ' ').trim()))
    .filter((row) => row.some(Boolean))
    .map((row) => row.join(CELL_SEPARATOR))
    .join('\n')
}

/** Readable lines ("cell – cell – cell") for exports and search. */
export function tableValueLines(value, field) {
  const columns = tableColumns(field)
  return parseTableValue(value, columns.length).map((row) => row.filter(Boolean).join(' – '))
}
