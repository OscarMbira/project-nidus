import { parseMultiLineValue } from '@nidus/ui/MultiLineListInput'
import { parseShorthandAmount } from '@nidus/shared/utils/amountShorthand'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const WHOLE_DAY_RE = /^-?\d+$/

export const LINK_FIELDS = [
  { single: 'linked_issue_id', many: 'linked_issue_ids', label: 'Linked issues', viewModeId: 'delay-linked-issues', itemColumnLabel: 'Issue id' },
  { single: 'linked_risk_id', many: 'linked_risk_ids', label: 'Linked risks', viewModeId: 'delay-linked-risks', itemColumnLabel: 'Risk id' },
  { single: 'linked_defect_id', many: 'linked_defect_ids', label: 'Linked defects', viewModeId: 'delay-linked-defects', itemColumnLabel: 'Defect id' },
  { single: 'linked_work_package_id', many: 'linked_work_package_ids', label: 'Linked work packages', viewModeId: 'delay-linked-work-packages', itemColumnLabel: 'Work package id' },
  { single: 'linked_change_request_id', many: 'linked_change_request_ids', label: 'Linked change requests', viewModeId: 'delay-linked-change-requests', itemColumnLabel: 'Change request id' },
]

export function isWholeDayCount(value) {
  return WHOLE_DAY_RE.test(String(value || '').trim())
}

export function isDelayRecordId(value) {
  return UUID_RE.test(String(value || '').trim())
}

export function isCostAmount(value) {
  return parseShorthandAmount(value).value != null
}

function idsToText(many, single) {
  const arr = Array.isArray(many) ? many.filter(Boolean).map(String) : []
  if (arr.length) return arr.join('\n')
  return single ? String(single) : ''
}

export function hydrateDelayForm(row) {
  const next = { ...(row || {}) }
  if (!String(next.impact_schedule_entries || '').trim() && next.impact_schedule_days != null && next.impact_schedule_days !== '') {
    next.impact_schedule_entries = String(next.impact_schedule_days)
  }
  if (!String(next.impact_cost_entries || '').trim() && next.impact_cost != null && next.impact_cost !== '') {
    next.impact_cost_entries = String(next.impact_cost)
  }
  for (const link of LINK_FIELDS) {
    next[`${link.many}_text`] = idsToText(next[link.many], next[link.single])
  }
  return next
}

export function normalizeDelayPayload(form) {
  const scheduleLines = parseMultiLineValue(form.impact_schedule_entries || '')
  for (const line of scheduleLines) {
    if (!WHOLE_DAY_RE.test(line)) {
      return { error: `Schedule impact "${line}" must be a whole number of days.` }
    }
  }

  const costLines = parseMultiLineValue(form.impact_cost_entries || '')
  let costTotal = 0
  for (const line of costLines) {
    const parsed = parseShorthandAmount(line)
    if (parsed.value == null) {
      return { error: `Cost impact "${line}" is not an amount. Use a number, or 10k / 3m.` }
    }
    costTotal += parsed.value
  }

  const payload = { ...form }
  delete payload.projects
  payload.impact_schedule_entries = scheduleLines.length ? scheduleLines.join('\n') : null
  payload.impact_schedule_days = scheduleLines.length
    ? scheduleLines.reduce((sum, line) => sum + Number(line), 0)
    : null
  payload.impact_cost_entries = costLines.length ? costLines.join('\n') : null
  payload.impact_cost = costLines.length ? Math.round(costTotal * 100) / 100 : null
  payload.impact_scope = parseMultiLineValue(form.impact_scope || '').join('\n') || null

  for (const link of LINK_FIELDS) {
    const textKey = `${link.many}_text`
    const lines = parseMultiLineValue(form[textKey] || '')
    for (const line of lines) {
      if (!UUID_RE.test(line)) {
        return { error: `${link.label}: "${line}" is not a record id.` }
      }
    }
    delete payload[textKey]
    payload[link.many] = lines.length ? lines : null
    payload[link.single] = lines[0] || null
  }

  return { payload }
}
