/** Helpers for form template select-option lines (label, or "label | stored_value"). */

export function slugifyOptionValue(label) {
  return String(label || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

/** @param {string|{ value?: string, label?: string }} option */
export function optionToLine(option) {
  if (option && typeof option === 'object') {
    const label = String(option.label ?? option.value ?? '').trim()
    const value = String(option.value ?? '').trim()
    if (!label) return ''
    return value && value !== slugifyOptionValue(label) ? `${label} | ${value}` : label
  }
  return String(option ?? '').trim()
}

/** @returns {{ value: string, label: string } | null} */
export function parseOptionLine(line) {
  const trimmed = String(line || '').trim()
  if (!trimmed) return null
  const [labelPart, valuePart] = trimmed.split('|').map((s) => s.trim())
  const label = labelPart || trimmed
  const value = valuePart || slugifyOptionValue(label)
  return { value, label }
}

/** @param {string[]} lines */
export function parseOptionLines(lines = []) {
  return lines.map(parseOptionLine).filter(Boolean)
}

/** @param {string[]} lines */
export function linesToOptionRows(lines = []) {
  const rows = parseOptionLines(lines)
  if (rows.length === 0) return [{ label: '', customValue: '', showCustom: false }]
  return rows.map(({ label, value }) => {
    const slug = slugifyOptionValue(label)
    const hasCustom = value !== slug
    return { label, customValue: hasCustom ? value : '', showCustom: hasCustom }
  })
}

/** @param {{ label: string, customValue?: string, showCustom?: boolean }[]} rows */
export function optionRowsToLines(rows = []) {
  return rows
    .map((row) => {
      const label = String(row.label || '').trim()
      if (!label) return ''
      const slug = slugifyOptionValue(label)
      const custom = String(row.customValue || '').trim()
      if (row.showCustom && custom && custom !== slug) return `${label} | ${custom}`
      return label
    })
    .filter(Boolean)
}
