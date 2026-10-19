/**
 * v1265 — Plan sheet columns: the catalog of every column a user can show, and the user's saved
 * layout (order + hidden) merged onto it. Pure; the sheet renders the cells.
 *
 * Layout shape (saved per user, SQL/v1267_ui_preferences.sql key 'planSheet.columns'):
 *   { order: ['id', 'name', ...], hidden: ['successors', ...], widths: { name: 360, ... } }
 * widths are the user's resized column widths in px (MIN_COLUMN_WIDTH–MAX_COLUMN_WIDTH).
 * Columns added later (new feature, a newly saved baseline) appear at the end: shown when they
 * are default columns, hidden otherwise. 'name' can be moved but never hidden.
 */

export const PLAN_SHEET_LAYOUT_KEY = 'planSheet.columns'
export const MIN_COLUMN_WIDTH = 40
export const MAX_COLUMN_WIDTH = 800

export const clampWidth = (w) => Math.round(Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, Number(w) || MIN_COLUMN_WIDTH)))

/** Default columns (PRD D5 + S2 progress columns), in their default order. */
const DEFAULTS = [
  { key: 'id', label: 'ID', width: 48, align: 'right', phone: true },
  { key: 'indicators', label: 'Info', width: 56, srLabel: 'Indicators' },
  { key: 'mode', label: 'Mode', width: 48 },
  { key: 'name', label: 'Task name', width: 300, phone: true, required: true },
  { key: 'duration', label: 'Duration', width: 88, phone: true },
  { key: 'start', label: 'Start', width: 128 },
  { key: 'finish', label: 'Finish', width: 128 },
  { key: 'predecessors', label: 'Predecessors', width: 110 },
  { key: 'successors', label: 'Successors', width: 110 },
  { key: 'resources', label: 'Resource names', width: 150 },
  { key: 'planned', label: 'Planned %', width: 88, align: 'right' },
  { key: 'actual', label: 'Actual %', width: 84, align: 'right', phone: true },
  { key: 'deviation', label: '% Deviation', width: 96, align: 'right' },
]

/** Optional columns, hidden until the user adds them. */
const OPTIONAL = [
  { key: 'wbs', label: 'WBS code', width: 100 },
  { key: 'code', label: 'Task ID', width: 110 },
  { key: 'baselineStart', label: 'Baseline start', width: 128 },
  { key: 'baselineFinish', label: 'Baseline finish', width: 128 },
  { key: 'actualStart', label: 'Actual start', width: 128 },
  { key: 'actualFinish', label: 'Actual finish', width: 128 },
  { key: 'float', label: 'Float', width: 80, align: 'right' },
  { key: 'critical', label: 'Critical path', width: 100 },
  { key: 'priority', label: 'Priority', width: 88 },
  { key: 'slip', label: 'Slip since original', width: 132, align: 'right' },
]

const baselineTitle = (b) => (b.baseline_number === null || b.baseline_number === undefined ? b.baseline_name : `B${b.baseline_number}`)

/** Every available column: defaults, optional columns, then start / finish / duration per saved baseline. */
export function planSheetColumnCatalog(baselines = []) {
  const perBaseline = baselines.flatMap((b) => [
    { key: `bl:${b.id}:start`, label: `${baselineTitle(b)} start`, width: 128, baselineId: b.id, field: 'start' },
    { key: `bl:${b.id}:finish`, label: `${baselineTitle(b)} finish`, width: 128, baselineId: b.id, field: 'finish' },
    { key: `bl:${b.id}:duration`, label: `${baselineTitle(b)} duration`, width: 104, baselineId: b.id, field: 'duration', align: 'right' },
  ])
  return [
    ...DEFAULTS.map((c) => ({ ...c, default: true })),
    ...[...OPTIONAL, ...perBaseline].map((c) => ({ ...c, default: false })),
  ]
}

/**
 * The columns to show, in order: the saved order first (unknown keys dropped), then any catalog
 * column not in it (defaults shown, optional hidden). Returns { visible, all: [{...col, hidden}] }.
 */
export function applyColumnLayout(catalog, layout) {
  const byKey = new Map(catalog.map((c) => [c.key, c]))
  const savedOrder = (layout?.order || []).filter((k) => byKey.has(k))
  const order = [...savedOrder, ...catalog.map((c) => c.key).filter((k) => !savedOrder.includes(k))]
  const hidden = new Set(layout?.hidden || [])
  const widths = layout?.widths || {}
  const known = new Set(savedOrder)
  const all = order.map((k) => {
    const c = byKey.get(k)
    // Saved columns keep the user's choice; columns new to this user follow their default.
    const isHidden = c.required ? false : known.has(k) ? hidden.has(k) : !c.default
    const width = widths[k] ? clampWidth(widths[k]) : c.width
    return { ...c, defaultWidth: c.width, width, hidden: isHidden }
  })
  return { visible: all.filter((c) => !c.hidden), all }
}

/** Move `key` to sit before `beforeKey` (or to the end when beforeKey is null). Returns a new order. */
export function moveColumn(order, key, beforeKey) {
  if (key === beforeKey) return [...order]
  const rest = order.filter((k) => k !== key)
  const at = beforeKey ? rest.indexOf(beforeKey) : -1
  if (at < 0) return [...rest, key]
  return [...rest.slice(0, at), key, ...rest.slice(at)]
}

/** Move one step left (-1) or right (+1); keyboard alternative to dragging. */
export function nudgeColumn(order, key, step) {
  const i = order.indexOf(key)
  const j = i + step
  if (i < 0 || j < 0 || j >= order.length) return [...order]
  const next = [...order]
  ;[next[i], next[j]] = [next[j], next[i]]
  return next
}

/** Layout after a change, from the merged column list (only widths the user changed are kept). */
export const layoutFrom = (all) => {
  const widths = Object.fromEntries(all.filter((c) => c.defaultWidth && c.width !== c.defaultWidth).map((c) => [c.key, c.width]))
  return { order: all.map((c) => c.key), hidden: all.filter((c) => c.hidden).map((c) => c.key), ...(Object.keys(widths).length ? { widths } : {}) }
}

/** Layout with one column resized. */
export const resizeColumn = (all, key, width) => layoutFrom(all.map((c) => (c.key === key ? { ...c, width: clampWidth(width) } : c)))
