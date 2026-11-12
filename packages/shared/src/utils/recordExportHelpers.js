/**
 * Small helpers for record-export section builders (rule 38.1): cell text, Yes/No, lists stored as
 * text or JSON arrays, tables that drop empty columns, and merging per-record tables into a
 * static section list.
 */

/** Trimmed text for a table cell or flat value. */
export function cellText(value) {
  if (value == null) return ''
  return String(value).trim()
}

/** true / 'true' → Yes, false / 'false' → No, anything else → ''. */
export function yesNo(value) {
  if (value === true || value === 'true') return 'Yes'
  if (value === false || value === 'false') return 'No'
  return ''
}

/** 'time_and_material' → 'Time and material'. */
export function humanizeToken(value) {
  const text = cellText(value).replace(/_/g, ' ')
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : ''
}

/** A list saved as text, an array or a JSON array string → one item per line. */
export function listText(value) {
  if (value == null || value === '') return ''
  if (Array.isArray(value)) return value.map(cellText).filter(Boolean).join('\n')
  const text = String(value)
  const trimmed = text.trim()
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => (item && typeof item === 'object' ? item.text || item.title || item.name || '' : item))
          .map(cellText)
          .filter(Boolean)
          .join('\n')
      }
    } catch {
      /* plain text */
    }
  }
  return text
}

/**
 * A { headers, rows } table, or null when there are no rows. Columns after the first that are
 * empty in every row are dropped so optional details don't leave blank columns.
 */
export function compactTable(headers, rows) {
  if (!Array.isArray(rows) || !rows.length) return null
  const keep = headers.map((_, i) => i === 0 || rows.some((row) => cellText(row[i])))
  return {
    headers: headers.filter((_, i) => keep[i]),
    rows: rows.map((row) => row.map(cellText).filter((_, i) => keep[i])),
  }
}

/** Table block (with optional caption) for a field's `blocks`, or null when there are no rows. */
export function tableBlock(headers, rows, caption) {
  const table = compactTable(headers, rows)
  if (!table) return null
  return caption ? { type: 'table', caption, ...table } : { type: 'table', ...table }
}

/**
 * "Label: value" lines → [label, value] rows, only when every line splits that way
 * (e.g. "Time: plus or minus 2 weeks"). Otherwise [].
 */
export function labelValueRows(value) {
  const lines = listText(value).split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const rows = lines.map((line) => {
    const m = line.match(/^([^:]{1,40}):\s+(.+)$/)
    return m ? [m[1].trim(), m[2].trim()] : null
  })
  return rows.length && rows.every(Boolean) ? rows : []
}

/** Lines of a table as "cell – cell" text, for flat exports (Excel / CSV / XML / JSON). */
export function tableLines(table) {
  if (!table) return ''
  return table.rows.map((row) => row.filter(Boolean).join(' – ')).join('\n')
}

/**
 * Copy `sections`, adding `table` / `blocks` from `extras` ({ [fieldKey]: { table?, blocks? } }).
 * Null tables / empty block lists are skipped so the field falls back to its flat value.
 */
export function withFieldExtras(sections, extras) {
  return sections.map((section) => ({
    ...section,
    fields: section.fields.map((field) => {
      const extra = extras[field.key]
      if (!extra) return field
      const out = { ...field }
      const blocks = (extra.blocks || []).filter(Boolean)
      if (blocks.length) out.blocks = blocks
      if (extra.table) out.table = extra.table
      return out
    }),
  }))
}
