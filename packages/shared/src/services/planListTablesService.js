/**
 * Plan list tables (2026-11-21, owner decision): key risks, quality gates, budget breakdown, stage
 * dependencies and stage resource allocation are stored as rows in their own tables, not as JSON on
 * project_plans / stage_plans. The plan forms keep editing them as arrays on formData; the plan services
 * split them out on save (savePlanLists) and attach them on load (loadPlanLists).
 *
 * Legacy JSON values (arrays of objects, arrays of strings, or { key: value } maps) are read through
 * rowsFromLegacyJson so plans saved before the move still show their data until they are saved again.
 * SQL: SQL/v1542_plan_list_tables.sql (tables, RLS, one-time copy of the JSON values).
 */

const IMPACT = ['High', 'Medium', 'Low']

const KEY_RISKS = {
  columns: [
    { key: 'risk_title', label: 'Risk', aliases: ['risk', 'title', 'name', 'description'] },
    { key: 'impact', label: 'Impact', type: 'select', options: IMPACT, aliases: ['rating', 'severity'] },
    { key: 'owner', label: 'Owner', aliases: ['risk_owner'] },
    { key: 'response', label: 'Response', aliases: ['mitigation', 'action'] },
  ],
}
const QUALITY_GATES = {
  columns: [
    { key: 'gate_name', label: 'Gate', aliases: ['gate', 'name', 'title'] },
    { key: 'gate_date', label: 'Date', type: 'date', aliases: ['date', 'when'] },
    { key: 'criteria', label: 'Criteria', aliases: ['description', 'notes'] },
  ],
}
const BUDGET = {
  columns: [
    { key: 'category', label: 'Category', aliases: ['name', 'item', 'stage', 'work_package'] },
    { key: 'amount', label: 'Amount', numeric: true, aliases: ['value', 'budget', 'cost'] },
    { key: 'notes', label: 'Notes', aliases: ['description'] },
  ],
  mapValueColumn: 'amount',
}

export const PLAN_LISTS = {
  project: {
    parentColumn: 'project_plan_id',
    lists: {
      key_risks: { table: 'project_plan_key_risks', ...KEY_RISKS },
      quality_gates: { table: 'project_plan_quality_gates', ...QUALITY_GATES },
      budget_breakdown: { table: 'project_plan_budget_lines', ...BUDGET },
    },
  },
  stage: {
    parentColumn: 'stage_plan_id',
    lists: {
      key_risks: { table: 'stage_plan_key_risks', ...KEY_RISKS },
      quality_gates: { table: 'stage_plan_quality_gates', ...QUALITY_GATES },
      budget_breakdown: { table: 'stage_plan_budget_lines', ...BUDGET },
      dependencies: {
        table: 'stage_plan_dependencies',
        columns: [
          { key: 'dependency', label: 'Dependency', aliases: ['name', 'title', 'description'] },
          { key: 'dependency_type', label: 'Type', type: 'select', options: ['Internal', 'External'], aliases: ['type'] },
          { key: 'notes', label: 'Notes' },
        ],
      },
      resource_allocation: {
        table: 'stage_plan_resource_allocations',
        columns: [
          { key: 'work_package', label: 'Work package', aliases: ['work_package_name', 'package'] },
          { key: 'resource', label: 'Resource', aliases: ['resource_id', 'resource_name', 'role'] },
          { key: 'allocation', label: 'Allocation', aliases: ['count', 'quantity', 'hours'] },
        ],
        mapKeyColumn: 'work_package',
      },
    },
  },
}

const text = (v) => (v === null || v === undefined ? '' : String(v).trim())

/** One list's config, or null. */
export function planListConfig(kind, listKey) {
  return PLAN_LISTS[kind]?.lists?.[listKey] || null
}

/**
 * Any stored shape → rows of plain objects keyed by the list's columns.
 * Accepts rows already in that shape, legacy arrays of objects (using column aliases), arrays of
 * strings (first column) and { key: value } maps (key → first column, value → map value column).
 */
export function rowsFromLegacyJson(listCfg, value) {
  if (!listCfg || value === null || value === undefined || value === '') return []
  let v = value
  if (typeof v === 'string') {
    try { v = JSON.parse(v) } catch { return [] }
  }
  const cols = listCfg.columns
  const fromObject = (obj) => Object.fromEntries(cols.map((c) => {
    const found = [c.key, ...(c.aliases || [])].find((k) => obj[k] !== undefined && obj[k] !== null && obj[k] !== '')
    return [c.key, found ? text(obj[found]) : '']
  }))
  let rows
  if (Array.isArray(v)) {
    rows = v.map((item) => (item && typeof item === 'object' ? fromObject(item) : { ...blank(cols), [cols[0].key]: text(item) }))
  } else if (v && typeof v === 'object') {
    rows = Object.entries(v).map(([k, val]) => {
      const keyCol = listCfg.mapKeyColumn || cols[0].key
      if (val && typeof val === 'object') return { ...fromObject(val), [keyCol]: text(k) }
      const valueCol = listCfg.mapValueColumn || cols[1].key
      return { ...blank(cols), [keyCol]: text(k), [valueCol]: text(val) }
    })
  } else rows = []
  return rows.filter((r) => cols.some((c) => r[c.key]))
}

function blank(cols) {
  return Object.fromEntries(cols.map((c) => [c.key, '']))
}

/** Plan payload → { plan: payload without the list keys, lists: { listKey: rows } for keys that were present }. */
export function splitPlanLists(kind, payload) {
  const cfg = PLAN_LISTS[kind]
  const plan = { ...(payload || {}) }
  const lists = {}
  if (!cfg) return { plan, lists }
  for (const [listKey, listCfg] of Object.entries(cfg.lists)) {
    if (!(listKey in plan)) continue
    lists[listKey] = rowsFromLegacyJson(listCfg, plan[listKey])
    delete plan[listKey]
  }
  return { plan, lists }
}

const toNumber = (s) => {
  const n = Number(String(s).replace(/[,\s]/g, ''))
  return Number.isFinite(n) ? n : null
}

/** Rows → database rows for one list (parent id + sort order; numeric columns parsed). */
export function toDbRows(kind, listKey, planId, rows) {
  const cfg = PLAN_LISTS[kind]
  const listCfg = cfg?.lists?.[listKey]
  if (!listCfg) return []
  return (rows || []).map((r, i) => {
    const row = { [cfg.parentColumn]: planId, sort_order: i + 1 }
    for (const c of listCfg.columns) {
      const v = text(r?.[c.key])
      row[c.key] = c.numeric ? (v === '' ? null : toNumber(v)) : (v || null)
    }
    return row
  }).filter((row) => listCfg.columns.some((c) => row[c.key] !== null))
}

/** Replace the stored rows of every list present in `lists`. Throws on a database error. */
export async function savePlanLists(db, kind, planId, lists) {
  const cfg = PLAN_LISTS[kind]
  if (!cfg || !planId) return
  for (const [listKey, rows] of Object.entries(lists || {})) {
    const listCfg = cfg.lists[listKey]
    if (!listCfg) continue
    const del = await db.from(listCfg.table).delete().eq(cfg.parentColumn, planId)
    if (del.error) throw del.error
    const dbRows = toDbRows(kind, listKey, planId, rows)
    if (dbRows.length) {
      const ins = await db.from(listCfg.table).insert(dbRows)
      if (ins.error) throw ins.error
    }
  }
}

/** Load every list for a plan → { listKey: rows } (rows keyed by column, in sort order). Throws on a database error. */
export async function loadPlanLists(db, kind, planId) {
  const cfg = PLAN_LISTS[kind]
  if (!cfg || !planId) return {}
  const entries = await Promise.all(Object.entries(cfg.lists).map(async ([listKey, listCfg]) => {
    const { data, error } = await db.from(listCfg.table).select('*').eq(cfg.parentColumn, planId).order('sort_order', { ascending: true })
    if (error) throw error
    return [listKey, (data || []).map((r) => Object.fromEntries(listCfg.columns.map((c) => [c.key, text(r[c.key])])))]
  }))
  return Object.fromEntries(entries)
}
