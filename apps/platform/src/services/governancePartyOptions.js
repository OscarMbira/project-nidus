/**
 * Build searchable party options for Escalate to / From / To:
 * Governance bodies (from structure list + standard names) ·
 * Steering Committee & Project Board members ·
 * Project functional roles.
 * Persist the display label; allowCustom covers anything missing.
 */
import { parseMultiLineValue } from '@nidus/ui/MultiLineListInput'
import { getGovernanceMembers } from './projectGovernanceMembersService'
import { listProjectFunctionalRoles } from './teamService'

const STANDARD_BODIES = ['Steering Committee', 'Project Board']

/**
 * @param {string} projectId
 * @param {string} [governanceBodiesText] newline-joined bodies from structure form
 * @returns {Promise<{ value: string, label: string }[]>}
 */
export async function loadGovernancePartyOptions(projectId, governanceBodiesText = '') {
  if (!projectId) return []

  const [sc, pb, rolesResult] = await Promise.all([
    getGovernanceMembers(projectId, 'steering_committee'),
    getGovernanceMembers(projectId, 'project_board'),
    listProjectFunctionalRoles(projectId),
  ])

  const seen = new Set()
  const options = []

  const push = (label, prefix) => {
    const t = String(label || '').trim()
    if (!t) return
    const key = t.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    options.push({
      value: t,
      label: prefix ? `${prefix}: ${t}` : t,
    })
  }

  for (const b of parseMultiLineValue(governanceBodiesText)) {
    push(b, 'Body')
  }
  for (const b of STANDARD_BODIES) {
    push(b, 'Body')
  }

  for (const m of [...(sc || []), ...(pb || [])]) {
    const body =
      m.body_type === 'steering_committee'
        ? 'Steering Committee'
        : m.body_type === 'project_board'
          ? 'Project Board'
          : 'Governance'
    const name = String(m.member_name || '').trim()
    if (!name) continue
    const withRole = m.role_title ? `${name} (${m.role_title})` : name
    push(`${withRole} — ${body}`, 'Member')
  }

  for (const r of rolesResult?.data || []) {
    push(r.role_label, 'Role')
  }

  return options.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }))
}

export function emptyEscalationStep(level = 1) {
  return { level, whom: '', timeframe: '', notes: '' }
}

export function emptyReportingEntry() {
  return { from_party: '', to_party: '', cadence: '', notes: '' }
}

export function emptyDecisionEntry() {
  return { decision: '', decided_by: '', method: '', notes: '' }
}

/** Coerce DB JSON / legacy text into escalation step rows */
export function normalizeEscalationSteps(record) {
  const raw = record?.escalation_steps
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((r, i) => ({
      level: Number(r.level) || i + 1,
      whom: String(r.whom || '').trim(),
      timeframe: String(r.timeframe || '').trim(),
      notes: String(r.notes || '').trim(),
    }))
  }
  const lines = parseMultiLineValue(record?.escalation_path || '')
  if (!lines.length) return []
  return lines.map((line, i) => ({
    level: i + 1,
    whom: line,
    timeframe: '',
    notes: '',
  }))
}

/** Coerce DB JSON / legacy text into reporting entry rows */
export function normalizeReportingEntries(record) {
  const raw = record?.reporting_entries
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((r) => ({
      from_party: String(r.from_party || '').trim(),
      to_party: String(r.to_party || '').trim(),
      cadence: String(r.cadence || '').trim(),
      notes: String(r.notes || '').trim(),
    }))
  }
  const lines = parseMultiLineValue(record?.reporting_lines || '')
  if (!lines.length) return []
  return lines.map((line) => ({
    from_party: '',
    to_party: '',
    cadence: '',
    notes: line,
  }))
}

/** Coerce DB JSON / legacy text into decision entry rows */
export function normalizeDecisionEntries(record) {
  const raw = record?.decision_entries
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((r) => ({
      decision: String(r.decision || '').trim(),
      decided_by: String(r.decided_by || '').trim(),
      method: String(r.method || '').trim(),
      notes: String(r.notes || '').trim(),
    }))
  }
  const lines = parseMultiLineValue(record?.decision_flow || '')
  if (!lines.length) return []
  return lines.map((line) => ({
    decision: line,
    decided_by: '',
    method: '',
    notes: '',
  }))
}
