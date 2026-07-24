/**
 * Template-local custom column CRUD for industry plan shaped state (Platform/Simulator + Admin parity).
 * Plan shape: { ui: { custom_column_defs }, phases, activities, deliverables, risks, milestones, roles }
 */
import {
  normalizeCustomColumnDefs,
  emptyCustomFieldValue,
  newCustomColumnId,
  MAX_CUSTOM_COLUMNS,
  CUSTOM_COLUMN_TYPES,
} from './industryPlanGridColumns.js'

const ENTITY_LIST_KEYS = ['phases', 'activities', 'deliverables', 'risks', 'milestones', 'roles']

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function str(value) {
  return value == null ? '' : String(value)
}

function mapEntityRows(plan, mapper) {
  const next = { ...plan }
  for (const key of ENTITY_LIST_KEYS) {
    next[key] = asArray(plan[key]).map(mapper)
  }
  return next
}

export function addIndustryPlanCustomColumn(plan, { label, type } = {}) {
  const defs = normalizeCustomColumnDefs(plan?.ui?.custom_column_defs)
  if (defs.length >= MAX_CUSTOM_COLUMNS) {
    return { ok: false, error: `Maximum of ${MAX_CUSTOM_COLUMNS} custom columns allowed.` }
  }
  const trimmed = str(label).trim()
  if (!trimmed) return { ok: false, error: 'Label is required.' }
  const colType = CUSTOM_COLUMN_TYPES.includes(type) ? type : 'text'
  const id = newCustomColumnId()
  const def = { id, label: trimmed, type: colType }
  const nextDefs = [...defs, def]
  const emptyVal = emptyCustomFieldValue(colType)
  const next = mapEntityRows(plan || {}, (row) => ({
    ...row,
    custom_fields: { ...(row.custom_fields || {}), [id]: emptyVal },
  }))
  next.ui = { ...(plan?.ui || {}), custom_column_defs: nextDefs }
  return { ok: true, plan: next, id }
}

export function updateIndustryPlanCustomColumn(plan, id, { label, type } = {}) {
  const defs = normalizeCustomColumnDefs(plan?.ui?.custom_column_defs)
  const idx = defs.findIndex((d) => d.id === id)
  if (idx < 0) return { ok: false, error: 'Custom column not found.' }
  const trimmed = str(label).trim()
  if (!trimmed) return { ok: false, error: 'Label is required.' }
  const colType = CUSTOM_COLUMN_TYPES.includes(type) ? type : defs[idx].type
  const nextDefs = defs.map((d, i) => (i === idx ? { ...d, label: trimmed, type: colType } : d))
  const prevType = defs[idx].type
  let next = { ...plan, ui: { ...(plan?.ui || {}), custom_column_defs: nextDefs } }
  if (prevType !== colType) {
    const emptyVal = emptyCustomFieldValue(colType)
    next = mapEntityRows(next, (row) => {
      const cf = { ...(row.custom_fields || {}) }
      const raw = cf[id]
      if (colType === 'yes_no') cf[id] = Boolean(raw)
      else if (colType === 'number') {
        cf[id] = raw === '' || raw == null || Number.isNaN(Number(raw)) ? emptyVal : Number(raw)
      } else {
        cf[id] = raw == null || typeof raw === 'boolean' ? '' : String(raw)
      }
      return { ...row, custom_fields: cf }
    })
  }
  return { ok: true, plan: next }
}

export function deleteIndustryPlanCustomColumn(plan, id) {
  const defs = normalizeCustomColumnDefs(plan?.ui?.custom_column_defs)
  if (!defs.some((d) => d.id === id)) return { ok: false, error: 'Custom column not found.' }
  const nextDefs = defs.filter((d) => d.id !== id)
  const next = mapEntityRows(plan || {}, (row) => {
    const cf = { ...(row.custom_fields || {}) }
    delete cf[id]
    return { ...row, custom_fields: cf }
  })
  next.ui = { ...(plan?.ui || {}), custom_column_defs: nextDefs }
  return { ok: true, plan: next }
}

/** Stable id for WBS nesting (parent_id references this). */
export function newIndustryRowId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `r${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`
}

export function ensureIndustryRowIds(plan) {
  if (!plan || typeof plan !== 'object') return { plan, changed: false }
  let changed = false
  const fix = (row) => {
    if (!row || typeof row !== 'object') return row
    const next = { ...row }
    if (!String(next.row_id || '').trim()) {
      next.row_id = newIndustryRowId()
      changed = true
    }
    if (next.parent_id == null) {
      next.parent_id = ''
      changed = true
    } else {
      next.parent_id = String(next.parent_id).trim()
    }
    return next
  }
  const next = {
    ...plan,
    phases: asArray(plan.phases).map(fix),
    activities: asArray(plan.activities).map(fix),
    deliverables: asArray(plan.deliverables).map(fix),
    milestones: asArray(plan.milestones).map(fix),
  }
  return { plan: next, changed }
}
