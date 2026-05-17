/**
 * Export helpers for industry plan templates and project copies.
 */
import {
  exportToExcel,
  exportListToPPT,
  exportRecordToWord,
  exportRecordToExcel,
} from './exportUtils'

export function downloadText(filename, content, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function templatesToCsv(rows) {
  const header = ['industry_code', 'industry_name', 'status', 'typical_duration', 'updated_at']
  const lines = [header.join(',')]
  for (const r of rows) {
    lines.push(
      [
        r.industry_code,
        `"${String(r.industry_name || '').replace(/"/g, '""')}"`,
        r.status,
        `"${String(r.typical_duration || '').replace(/"/g, '""')}"`,
        r.updated_at,
      ].join(','),
    )
  }
  return lines.join('\n')
}

function phaseLabel(phases, phaseId, phaseNumber) {
  if (phaseId) {
    const p = (phases || []).find((x) => x.id === phaseId)
    if (p?.phase_name) return p.phase_name
  }
  if (phaseNumber != null) {
    const p = (phases || []).find((x) => x.phase_number === phaseNumber)
    if (p?.phase_name) return p.phase_name
  }
  return ''
}

export function activitiesToCsv(activities, phases = []) {
  const header = [
    'Phase',
    'Activity',
    'Type',
    'Duration',
    'Effort',
    'Resource',
    'Predecessors',
    'Constraints',
  ]
  const lines = [header.join(',')]
  for (const a of (activities || []).filter((x) => x.included !== false)) {
    const ph =
      phaseLabel(phases, a.phase_id, a.phase_number) ||
      a.phase_name ||
      ''
    lines.push(
      [
        `"${ph.replace(/"/g, '""')}"`,
        `"${String(a.activity_name || '').replace(/"/g, '""')}"`,
        a.activity_type || '',
        a.typical_duration || '',
        a.typical_effort || '',
        `"${String(a.resource_type || '').replace(/"/g, '""')}"`,
        `"${String(a.predecessor_notes || '').replace(/"/g, '""')}"`,
        `"${String(a.constraints || '').replace(/"/g, '""')}"`,
      ].join(','),
    )
  }
  return lines.join('\n')
}

function bulletLines(items, formatter) {
  return (items || [])
    .filter((x) => x.included !== false)
    .map((item, i) => formatter(item, i))
    .filter(Boolean)
    .join('\n')
}

/**
 * Build export sections for exportRecordToWord / Excel record export.
 * @param {object} data - template (master) or plan snapshot with included_* arrays
 */
export function buildIndustryPlanExportSections(data) {
  const title = data.industry_name || data.plan_title || 'Industry Plan'
  const phases = data.phases || data.included_phases || []
  const activities = data.activities || data.included_activities || []
  const deliverables = data.deliverables || data.included_deliverables || []
  const risks = data.risks || data.included_risks || []
  const milestones = data.milestones || data.included_milestones || []
  const roles = data.roles || data.included_roles || []

  const record = {
    overview: [
      data.description || data.customisation_notes || '',
      data.typical_duration ? `Typical duration: ${data.typical_duration}` : '',
      data.status ? `Status: ${data.status}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    phases: bulletLines(phases, (p) => `• ${p.phase_number}. ${p.phase_name} (${p.estimated_duration || '—'})`),
    activities: bulletLines(activities, (a) => {
      const ph = phaseLabel(phases, a.phase_id, a.phase_number)
      return `• [${ph}] ${a.activity_name} (${a.activity_type || 'task'}, ${a.typical_duration || '—'}, ${a.resource_type || '—'})`
    }),
    deliverables: bulletLines(deliverables, (d) => {
      const ph = phaseLabel(phases, d.phase_id, d.phase_number)
      const mand = d.is_mandatory ? ' [mandatory]' : ''
      return `• ${d.deliverable_name}${ph ? ` (${ph})` : ''}${mand}`
    }),
    risks: bulletLines(risks, (r) => `• ${r.risk_title} [${r.likelihood || '—'}/${r.impact || '—'}]`),
    milestones: bulletLines(milestones, (m) => {
      const ph = phaseLabel(phases, m.phase_id, m.phase_number)
      return `• ${m.milestone_name}${ph ? ` (${ph})` : ''}`
    }),
    roles: bulletLines(roles, (r) => `• ${r.role_title}${r.is_key_role ? ' ★' : ''}`),
  }

  const sections = [
    { title: 'Overview', fields: [{ key: 'overview', label: 'Summary' }] },
    { title: 'Phases', fields: [{ key: 'phases', label: 'Phases' }] },
    { title: 'Activities', fields: [{ key: 'activities', label: 'Activities' }] },
    { title: 'Deliverables', fields: [{ key: 'deliverables', label: 'Deliverables' }] },
    { title: 'Risks', fields: [{ key: 'risks', label: 'Risks' }] },
    { title: 'Milestones', fields: [{ key: 'milestones', label: 'Milestones' }] },
    { title: 'Roles', fields: [{ key: 'roles', label: 'Roles' }] },
  ]

  return { sections, record, baseFilename: (data.industry_code || title).replace(/\s+/g, '_') }
}

export async function exportIndustryPlanToWord(data) {
  const { sections, record, baseFilename } = buildIndustryPlanExportSections(data)
  await exportRecordToWord(sections, record, baseFilename)
}

export function exportIndustryPlanToExcel(data) {
  const { sections, record, baseFilename } = buildIndustryPlanExportSections(data)
  exportRecordToExcel(sections, record, `${baseFilename}_plan`)
}

export async function exportIndustryPlanActivitiesExcel(data) {
  const phases = data.phases || data.included_phases || []
  const activities = (data.activities || data.included_activities || []).filter((x) => x.included !== false)
  const columns = [
    { key: 'phase', label: 'Phase' },
    { key: 'activity_name', label: 'Activity' },
    { key: 'activity_type', label: 'Type' },
    { key: 'typical_duration', label: 'Duration' },
    { key: 'typical_effort', label: 'Effort' },
    { key: 'resource_type', label: 'Resource' },
    { key: 'predecessor_notes', label: 'Predecessors' },
    { key: 'constraints', label: 'Constraints' },
  ]
  const rows = activities.map((a) => ({
    phase: phaseLabel(phases, a.phase_id, a.phase_number),
    activity_name: a.activity_name,
    activity_type: a.activity_type,
    typical_duration: a.typical_duration,
    typical_effort: a.typical_effort,
    resource_type: a.resource_type,
    predecessor_notes: a.predecessor_notes,
    constraints: a.constraints,
  }))
  const base = (data.industry_code || data.plan_title || 'industry_plan').replace(/\s+/g, '_')
  exportToExcel(columns, rows, `${base}_activities`)
}

export function exportIndustryPlanActivitiesCsv(data) {
  const phases = data.phases || data.included_phases || []
  const activities = data.activities || data.included_activities || []
  const base = (data.industry_code || data.plan_title || 'industry_plan').replace(/\s+/g, '_')
  downloadText(`${base}_activities.csv`, activitiesToCsv(activities, phases), 'text/csv')
}

export async function exportIndustryPlanToPpt(data) {
  const phases = data.phases || data.included_phases || []
  const activities = (data.activities || data.included_activities || []).filter((x) => x.included !== false)
  const columns = [
    { key: 'phase', label: 'Phase' },
    { key: 'activity_name', label: 'Activity' },
    { key: 'activity_type', label: 'Type' },
    { key: 'typical_duration', label: 'Duration' },
    { key: 'resource_type', label: 'Resource' },
  ]
  const rows = activities.slice(0, 50).map((a) => ({
    phase: phaseLabel(phases, a.phase_id, a.phase_number),
    activity_name: a.activity_name,
    activity_type: a.activity_type,
    typical_duration: a.typical_duration,
    resource_type: a.resource_type,
  }))
  const base = (data.industry_code || data.plan_title || 'industry_plan').replace(/\s+/g, '_')
  exportListToPPT(columns, rows, `${base}_activities`)
}

/** Word export with one section per phase listing activities (plan §4 detail export). */
export async function exportIndustryPlanWordByPhase(data) {
  const phases = (data.phases || data.included_phases || []).filter((x) => x.included !== false)
  const activities = data.activities || data.included_activities || []
  const record = {
    overview: [data.description || data.customisation_notes, data.typical_duration && `Duration: ${data.typical_duration}`]
      .filter(Boolean)
      .join('\n\n'),
  }
  const sections = [{ title: 'Overview', fields: [{ key: 'overview', label: 'Summary' }] }]
  phases.forEach((p) => {
    const key = `phase_${p.phase_number}`
    const phaseActs = activities.filter(
      (a) =>
        a.included !== false &&
        ((p.id && a.phase_id === p.id) || a.phase_number === p.phase_number),
    )
    record[key] = bulletLines(
      phaseActs,
      (a) =>
        `• ${a.activity_name} [${a.activity_type || 'task'}] ${a.typical_duration || ''} / ${a.typical_effort || ''} — ${a.resource_type || ''}`,
    )
    sections.push({
      title: `Phase ${p.phase_number}: ${p.phase_name}`,
      fields: [{ key, label: 'Activities' }],
    })
  })
  const base = (data.industry_code || data.plan_title || 'industry_plan').replace(/\s+/g, '_')
  await exportRecordToWord(sections, record, `${base}_by_phase`)
}
