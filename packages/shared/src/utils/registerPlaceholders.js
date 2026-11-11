/**
 * Bracketed placeholders left in a record created from a template (v1336), e.g. [Bank Name],
 * [Legacy Core System], [Go-Live Date]. Used for the "N placeholders still to fill" banner.
 *
 * A placeholder is text in square brackets that starts with a capital letter and is 2–40
 * characters long — so ordinary brackets like "[1]" or "[see note]" are not counted.
 */
import { groupRegisterFields } from './registerFieldGroups'

export const PLACEHOLDER_PATTERN = /\[[A-Z][A-Za-z0-9 &/().,'’-]{1,39}\]/g

/** Distinct placeholders in a value (string, array or nested values). */
export function findPlaceholders(value) {
  const found = new Set()
  const visit = (v) => {
    if (v === null || v === undefined) return
    if (Array.isArray(v)) return v.forEach(visit)
    if (typeof v === 'object') return Object.values(v).forEach(visit)
    for (const match of String(v).match(PLACEHOLDER_PATTERN) || []) found.add(match)
  }
  visit(value)
  return [...found]
}

/**
 * Placeholders still in a record, grouped by tab:
 * { total, placeholders: string[], tabs: [{ tab, count }] } — tab is the form tab label
 * ('Details' for the title, description and ungrouped fields).
 */
export function recordPlaceholderSummary(register, record) {
  const values = record?.field_values || {}
  const { detailsFields, groups } = groupRegisterFields(register?.fields, values)
  const all = new Set()
  const tabs = []
  const count = (tab, fields, extra = []) => {
    const set = new Set(extra.flatMap((v) => findPlaceholders(v)))
    fields.forEach((f) => findPlaceholders(values[f.field_key]).forEach((p) => set.add(p)))
    if (set.size) {
      tabs.push({ tab, count: set.size })
      set.forEach((p) => all.add(p))
    }
  }
  count('Details', detailsFields, [record?.title, record?.description])
  groups.forEach((g) => count(g.label, g.fields))
  return { total: all.size, placeholders: [...all].sort(), tabs }
}
