/**
 * "Linked records" fields that read a core table instead of another local register (v1338 D3).
 *
 * A field whose source (`dropdown_options[0].value`) starts with `core:` — first source:
 * `core:requirements` (requirements_register, public / sim). Optional settings on the same option:
 *   category  — requirements_register.category to show (business / functional / non_functional / …);
 *               several as a comma list ("technical,regulatory,other") give one table per category
 *   group_by  — 'nfr_area_key' to show one table per non-functional area
 * The loader returns blocks in the shape the linked-record exports and the complete document
 * already draw (registerDocumentModel.linkedRecordBlocks): one block per category or area, each
 * with a requirements table — so the specification reads as tables, not one sub-section per row.
 */
import { REQUIREMENT_CATEGORIES } from './requirementCategories'

export const CORE_SOURCE_PREFIX = 'core:'
export const CORE_REQUIREMENTS_SOURCE = 'core:requirements'

const PRIORITY_LABELS = { must: 'Must', should: 'Should', could: 'Could', wont: "Won't" }
const STATUS_LABELS = { draft: 'Draft', approved: 'Approved', deferred: 'Deferred', rejected: 'Rejected', implemented: 'Implemented' }
const VERIFICATION_LABELS = { test: 'Test', inspection: 'Inspection', demonstration: 'Demonstration', analysis: 'Analysis' }

export function isCoreLinkedSource(key) {
  return String(key || '').startsWith(CORE_SOURCE_PREFIX)
}

/** { source, category, groupBy, label } for a core linked-records field, or null. */
export function coreLinkedSourceConfig(field) {
  const first = Array.isArray(field?.dropdown_options) ? field.dropdown_options[0] : null
  if (!first || !isCoreLinkedSource(first.value)) return null
  const categories = String(first.category || '').split(',').map((c) => c.trim()).filter(Boolean)
  return {
    source: first.value,
    categories,
    // A single category (also the `?category=` of the "open register" link); null for none or several.
    category: categories.length === 1 ? categories[0] : null,
    groupBy: first.group_by || null,
    label: first.label || 'Requirements register',
  }
}

const COLUMNS = [
  { key: 'code', label: 'Code', always: true },
  { key: 'name', label: 'Requirement', always: true },
  { key: 'priority', label: 'Priority' },
  { key: 'status', label: 'Status' },
  { key: 'owner', label: 'Owner' },
  { key: 'verification', label: 'Verification' },
  { key: 'acceptance', label: 'Acceptance Criteria' },
]

function rowValues(r) {
  return {
    code: r.requirement_code || '',
    name: r.name || '',
    priority: PRIORITY_LABELS[r.priority] || r.priority || '',
    status: STATUS_LABELS[r.status] || r.status || '',
    owner: r.owner_name || '',
    verification: VERIFICATION_LABELS[r.verification_method] || r.verification_method || '',
    acceptance: String(r.acceptance_criteria || '').split('\n').map((l) => l.trim()).filter(Boolean).join('\n'),
  }
}

/** A requirements table — columns empty in every row are left out (Code and Requirement always show). */
export function requirementsTable(rows) {
  const values = rows.map(rowValues)
  const columns = COLUMNS.filter((c) => c.always || values.some((v) => v[c.key]))
  return {
    headers: columns.map((c) => c.label),
    rows: values.map((v) => columns.map((c) => v[c.key])),
  }
}

function block(id, title, rows, intro = '') {
  const table = requirementsTable(rows)
  return {
    id,
    title,
    intro,
    facts: [],
    groups: [{ label: 'Requirements', kind: 'table', headers: table.headers, rows: table.rows }],
    lines: rows.map((r) => [r.requirement_code, r.name, PRIORITY_LABELS[r.priority] || r.priority, STATUS_LABELS[r.status] || r.status]
      .filter(Boolean).join(' – ')),
  }
}

function byCode(a, b) {
  return String(a.requirement_code || '').localeCompare(String(b.requirement_code || ''), undefined, { numeric: true })
    || String(a.name || '').localeCompare(String(b.name || ''))
}

/**
 * Requirements → blocks. Without grouping: one block for a single category, or one per category
 * when several or none are set. With group_by 'nfr_area_key': one block per area in the areas'
 * order, then any requirements without an area. Empty categories / areas give no block.
 * @param {object[]} rows requirements_register rows (already filtered to the project)
 * @param {{ categories?: string[], category?: string|null, groupBy?: string|null }} config
 * @param {{ areas?: {value: string, label: string}[] }} [options]
 */
export function buildCoreRequirementBlocks(rows, config, { areas = [] } = {}) {
  const wanted = config?.categories?.length ? config.categories : config?.category ? [config.category] : []
  const list = [...(rows || [])]
    .filter((r) => !wanted.length || wanted.includes(r.category))
    .sort(byCode)
  if (list.length === 0) return []

  if (config?.groupBy === 'nfr_area_key') {
    const blocks = areas
      .map((a) => [a, list.filter((r) => r.nfr_area_key === a.value)])
      .filter(([, items]) => items.length)
      .map(([a, items]) => block(`area-${a.value}`, a.label, items))
    const known = new Set(areas.map((a) => a.value))
    const rest = list.filter((r) => !r.nfr_area_key || !known.has(r.nfr_area_key))
    if (rest.length) blocks.push(block('area-none', 'Other non-functional requirements', rest))
    return blocks
  }

  if (wanted.length === 1) {
    const label = REQUIREMENT_CATEGORIES.find((c) => c.value === wanted[0])?.label || 'Other'
    return [block(`category-${wanted[0]}`, `${label} requirements`, list)]
  }

  return REQUIREMENT_CATEGORIES
    .filter((c) => !wanted.length || wanted.includes(c.value))
    .map((c) => [c, list.filter((r) => r.category === c.value)])
    .filter(([, items]) => items.length)
    .map(([c, items]) => block(`category-${c.value}`, `${c.label} requirements`, items))
}
