/**
 * Simulator practice PID form helpers (v1344 follow-up).
 * sim.practice_project_initiation_documents keeps objectives / interfaces as TEXT[],
 * plan summaries as JSONB ({ summary }) and tolerances as JSONB ({ time, cost, scope, quality }).
 * The edit page works on plain strings; these helpers convert both ways.
 */

export const PRACTICE_PID_TEXT_FIELDS = [
  'pid_title', 'pid_description', 'project_definition', 'project_scope', 'exclusions',
  'project_approach', 'quality_approach', 'risk_approach', 'change_control_approach', 'communication_approach',
  'reporting_arrangements', 'monitoring_and_control',
]

export const PRACTICE_PID_LIST_FIELDS = ['project_objectives', 'interfaces']
export const PRACTICE_PID_PLAN_FIELDS = ['project_plan_summary', 'stage_plan_summary']
export const PRACTICE_PID_TOLERANCE_KEYS = ['time', 'cost', 'scope', 'quality']

/** Plan summary JSONB → text: a plain string, { summary }, or the {} default (→ ''). */
export function planSummaryText(value) {
  if (typeof value === 'string') return value
  return value && typeof value.summary === 'string' ? value.summary : ''
}

function listToText(value) {
  if (Array.isArray(value)) return value.filter((v) => v != null && String(v).trim()).join('\n')
  return typeof value === 'string' ? value : ''
}

function textToList(text) {
  return String(text || '').split('\n').map((s) => s.trim()).filter(Boolean)
}

/** Database row → form state (all strings). */
export function practicePidToForm(pid = {}) {
  const form = {}
  for (const f of PRACTICE_PID_TEXT_FIELDS) form[f] = pid[f] ?? ''
  for (const f of PRACTICE_PID_LIST_FIELDS) form[f] = listToText(pid[f])
  for (const f of PRACTICE_PID_PLAN_FIELDS) form[f] = planSummaryText(pid[f])
  const tol = pid.tolerance_levels && typeof pid.tolerance_levels === 'object' ? pid.tolerance_levels : {}
  for (const k of PRACTICE_PID_TOLERANCE_KEYS) form[`tolerance_${k}`] = tol[k] == null ? '' : String(tol[k])
  return form
}

/**
 * Form state → update payload. Tolerance keys not shown on the form (e.g. risk, benefits)
 * are kept from the existing row so saving never drops them.
 */
export function practicePidFormToUpdate(form = {}, existing = {}) {
  const out = {}
  for (const f of PRACTICE_PID_TEXT_FIELDS) out[f] = f === 'pid_title' ? String(form[f] || '').trim() : (form[f] || null)
  for (const f of PRACTICE_PID_LIST_FIELDS) out[f] = textToList(form[f])
  for (const f of PRACTICE_PID_PLAN_FIELDS) {
    const prev = existing[f] && typeof existing[f] === 'object' ? existing[f] : {}
    const text = String(form[f] || '').trim()
    const next = { ...prev }
    if (text) next.summary = text
    else delete next.summary
    out[f] = next
  }
  const prevTol = existing.tolerance_levels && typeof existing.tolerance_levels === 'object' ? existing.tolerance_levels : {}
  const tol = { ...prevTol }
  for (const k of PRACTICE_PID_TOLERANCE_KEYS) {
    const v = String(form[`tolerance_${k}`] || '').trim()
    if (v) tol[k] = v
    else delete tol[k]
  }
  out.tolerance_levels = tol
  return out
}

/** Tolerances JSONB → "Time: 2 weeks" lines for read-only display. */
export function toleranceLines(value) {
  if (!value || typeof value !== 'object') return typeof value === 'string' ? value : ''
  return Object.entries(value)
    .filter(([, v]) => v != null && String(v).trim())
    .map(([k, v]) => `${k.charAt(0).toUpperCase()}${k.slice(1)}: ${v}`)
    .join('\n')
}
