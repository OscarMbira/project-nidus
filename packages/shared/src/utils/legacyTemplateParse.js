/**
 * Legacy template upload — Track A (schedule) + Track C (structured list) parsers.
 * Pure functions for Vitest; no I/O.
 */

export const SCHEDULE_CANONICAL = [
  'phase_name',
  'phase_number',
  'activity_name',
  'activity_type',
  'typical_duration',
  'typical_effort',
  'resource_type',
  'deliverable_name',
  'milestone_name',
  'predecessor_notes',
]

export const LIST_TYPE_FIELDS = {
  risk_register: [
    'item_type', 'title', 'description', 'category', 'likelihood',
    'impact', 'owner', 'mitigation', 'status',
  ],
  raid_log: [
    'item_type', 'title', 'description', 'category', 'likelihood',
    'impact', 'owner', 'mitigation', 'status',
  ],
  stakeholder_register: [
    'stakeholder_name', 'role_title', 'organisation', 'influence',
    'interest', 'engagement_strategy', 'communication_preference',
  ],
  budget: [
    'line_item', 'category', 'budgeted_amount', 'actual_amount', 'variance', 'notes',
  ],
}

const HEADER_ALIASES = {
  phase: 'phase_name',
  phasename: 'phase_name',
  phase_name: 'phase_name',
  phasenumber: 'phase_number',
  phase_number: 'phase_number',
  activity: 'activity_name',
  activityname: 'activity_name',
  activity_name: 'activity_name',
  type: 'activity_type',
  activitytype: 'activity_type',
  activity_type: 'activity_type',
  duration: 'typical_duration',
  typical_duration: 'typical_duration',
  effort: 'typical_effort',
  typical_effort: 'typical_effort',
  resource: 'resource_type',
  resource_type: 'resource_type',
  role: 'resource_type',
  deliverable: 'deliverable_name',
  deliverable_name: 'deliverable_name',
  milestone: 'milestone_name',
  milestone_name: 'milestone_name',
  predecessor: 'predecessor_notes',
  predecessors: 'predecessor_notes',
  predecessor_notes: 'predecessor_notes',
  title: 'title',
  risk: 'title',
  risk_title: 'title',
  description: 'description',
  category: 'category',
  likelihood: 'likelihood',
  impact: 'impact',
  owner: 'owner',
  mitigation: 'mitigation',
  status: 'status',
  item_type: 'item_type',
  itemtype: 'item_type',
  raid_type: 'item_type',
  stakeholder: 'stakeholder_name',
  stakeholder_name: 'stakeholder_name',
  name: 'stakeholder_name',
  role_title: 'role_title',
  organisation: 'organisation',
  organization: 'organisation',
  influence: 'influence',
  interest: 'interest',
  engagement_strategy: 'engagement_strategy',
  communication_preference: 'communication_preference',
  line_item: 'line_item',
  lineitem: 'line_item',
  budgeted_amount: 'budgeted_amount',
  budget: 'budgeted_amount',
  actual_amount: 'actual_amount',
  actual: 'actual_amount',
  variance: 'variance',
  notes: 'notes',
}

export function normalizeHeader(h) {
  return String(h ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

export function suggestColumnMapping(headers, canonicalFields) {
  const mapping = {}
  const used = new Set()
  for (const h of headers) {
    const key = normalizeHeader(h)
    const target = HEADER_ALIASES[key] || (canonicalFields.includes(key) ? key : null)
    if (target && canonicalFields.includes(target) && !used.has(target)) {
      mapping[h] = target
      used.add(target)
    } else {
      mapping[h] = null
    }
  }
  return mapping
}

export function applyColumnMapping(rows, mapping) {
  return (rows || []).map((row) => {
    const out = {}
    for (const [src, dest] of Object.entries(mapping || {})) {
      if (!dest) continue
      const val = row[src]
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        out[dest] = typeof val === 'string' ? val.trim() : val
      }
    }
    return out
  })
}

/** Build Industry Plan child bundle from mapped schedule rows. */
export function scheduleRowsToBundle(mappedRows) {
  const phases = []
  const phaseIndex = new Map()
  const activities = []
  const deliverables = []
  const milestones = []
  const roles = new Map()

  let autoPhase = 0
  for (const row of mappedRows || []) {
    let phaseName = row.phase_name || row.phase || 'General'
    let phaseNumber = Number(row.phase_number)
    if (!Number.isFinite(phaseNumber) || phaseNumber < 1) {
      if (!phaseIndex.has(phaseName.toLowerCase())) {
        autoPhase += 1
        phaseNumber = autoPhase
      } else {
        phaseNumber = phaseIndex.get(phaseName.toLowerCase())
      }
    }
    const pKey = phaseName.toLowerCase()
    if (!phaseIndex.has(pKey)) {
      phaseIndex.set(pKey, phaseNumber)
      phases.push({
        phase_number: phaseNumber,
        phase_name: phaseName,
        estimated_duration: row.typical_duration || '2–4w',
        sort_order: phaseNumber,
      })
    } else {
      phaseNumber = phaseIndex.get(pKey)
    }

    if (row.activity_name) {
      activities.push({
        phase_number: phaseNumber,
        activity_name: row.activity_name,
        activity_type: row.activity_type || 'task',
        typical_duration: row.typical_duration || '',
        typical_effort: row.typical_effort || '',
        resource_type: row.resource_type || '',
        predecessor_notes: row.predecessor_notes || '',
        constraints: '',
        sort_order: activities.length,
      })
      if (row.resource_type && !roles.has(row.resource_type)) {
        roles.set(row.resource_type, {
          role_title: row.resource_type,
          is_key_role: false,
          sort_order: roles.size,
        })
      }
    }
    if (row.deliverable_name) {
      deliverables.push({
        phase_number: phaseNumber,
        deliverable_name: row.deliverable_name,
        deliverable_type: 'document',
        is_mandatory: deliverables.length < 3,
        sort_order: deliverables.length,
      })
    }
    if (row.milestone_name) {
      milestones.push({
        phase_number: phaseNumber,
        milestone_name: row.milestone_name,
        sort_order: milestones.length,
      })
    }
  }

  if (phases.length === 0) {
    phases.push({
      phase_number: 1,
      phase_name: 'Imported Schedule',
      estimated_duration: '2–4w',
      sort_order: 1,
    })
  }

  return {
    phases: phases.sort((a, b) => a.phase_number - b.phase_number),
    activities,
    deliverables,
    risks: [],
    milestones,
    roles: [...roles.values()],
  }
}

export function validateScheduleBundle(bundle) {
  const errors = []
  if (!bundle?.phases?.length) errors.push('At least one phase is required')
  if (!bundle?.activities?.length && !bundle?.milestones?.length) {
    errors.push('At least one activity or milestone is required')
  }
  return { valid: errors.length === 0, errors }
}

/** Parse MSPDI / MS Project XML string into schedule rows. */
export function parseMspdiXml(xmlText) {
  if (typeof DOMParser === 'undefined') {
    throw new Error('DOMParser is not available in this environment')
  }
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml')
  if (doc.querySelector('parsererror')) {
    throw new Error('Invalid MSPDI XML')
  }

  const tasks = [...doc.getElementsByTagName('Task')]
  const resources = new Map()
  for (const r of doc.getElementsByTagName('Resource')) {
    const id = r.getElementsByTagName('ID')[0]?.textContent
    const name = r.getElementsByTagName('Name')[0]?.textContent
    if (id && name) resources.set(id, name)
  }

  const assignments = new Map()
  for (const a of doc.getElementsByTagName('Assignment')) {
    const taskUid = a.getElementsByTagName('TaskUID')[0]?.textContent
      || a.getElementsByTagName('TaskID')[0]?.textContent
    const resUid = a.getElementsByTagName('ResourceUID')[0]?.textContent
      || a.getElementsByTagName('ResourceID')[0]?.textContent
    if (taskUid && resUid && resources.has(resUid)) {
      const list = assignments.get(taskUid) || []
      list.push(resources.get(resUid))
      assignments.set(taskUid, list)
    }
  }

  const rows = []
  let currentPhase = 'General'
  let phaseNumber = 1

  for (const task of tasks) {
    const name = task.getElementsByTagName('Name')[0]?.textContent?.trim()
    if (!name || name === 'Project') continue
    const outline = Number(task.getElementsByTagName('OutlineLevel')[0]?.textContent || '1')
    const isMilestone = task.getElementsByTagName('Milestone')[0]?.textContent === '1'
    const duration = task.getElementsByTagName('Duration')[0]?.textContent || ''
    const uid = task.getElementsByTagName('UID')[0]?.textContent
      || task.getElementsByTagName('ID')[0]?.textContent
    const pred = [...task.getElementsByTagName('PredecessorLink')]
      .map((p) => p.getElementsByTagName('PredecessorUID')[0]?.textContent)
      .filter(Boolean)
      .join(', ')

    const durationText = isoDurationToText(duration)
    const resourceType = (assignments.get(uid) || []).join(', ')

    if (outline <= 1) {
      currentPhase = name
      phaseNumber = rows.filter((r) => r._isPhase).length + 1
      rows.push({
        _isPhase: true,
        phase_name: currentPhase,
        phase_number: phaseNumber,
        milestone_name: isMilestone ? name : '',
        typical_duration: durationText,
      })
      if (isMilestone) continue
    }

    rows.push({
      phase_name: currentPhase,
      phase_number: phaseNumber,
      activity_name: isMilestone ? '' : name,
      milestone_name: isMilestone ? name : '',
      activity_type: isMilestone ? 'milestone' : 'task',
      typical_duration: durationText,
      typical_effort: durationText,
      resource_type: resourceType,
      predecessor_notes: pred,
    })
  }

  return rows.map(({ _isPhase, ...rest }) => rest)
}

function isoDurationToText(iso) {
  if (!iso) return ''
  const m = String(iso).match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i)
  if (!m) return iso
  const h = Number(m[1] || 0)
  const min = Number(m[2] || 0)
  if (h && !min) return `${h}h`
  if (h) return `${h}h ${min}m`
  if (min) return `${min}m`
  return iso
}

export function validateStructuredListRows(listType, rows) {
  const fields = LIST_TYPE_FIELDS[listType]
  if (!fields) return { valid: false, errors: [`Unknown list_type: ${listType}`], validRows: [], invalidRows: [] }

  const validRows = []
  const invalidRows = []
  const errors = []

  ;(rows || []).forEach((row, i) => {
    const issues = []
    if (listType === 'risk_register' || listType === 'raid_log') {
      if (!row.title) issues.push('title required')
      if (listType === 'raid_log' && row.item_type) {
        const t = String(row.item_type).toLowerCase()
        if (!['risk', 'assumption', 'issue', 'dependency'].includes(t)) {
          issues.push('item_type must be risk|assumption|issue|dependency')
        }
      }
    }
    if (listType === 'stakeholder_register' && !row.stakeholder_name) {
      issues.push('stakeholder_name required')
    }
    if (listType === 'budget' && !row.line_item) {
      issues.push('line_item required')
    }
    if (issues.length) {
      invalidRows.push({ index: i, row, issues })
      errors.push(`Row ${i + 1}: ${issues.join('; ')}`)
    } else {
      validRows.push(row)
    }
  })

  return {
    valid: invalidRows.length === 0 && validRows.length > 0,
    errors: validRows.length === 0 && !errors.length
      ? ['No valid rows']
      : errors,
    validRows,
    invalidRows,
  }
}

/** Guess RAID item_type from sheet name. */
export function sheetNameToRaidItemType(sheetName) {
  const s = String(sheetName || '').toLowerCase()
  if (s.includes('assum')) return 'assumption'
  if (s.includes('issue')) return 'issue'
  if (s.includes('depend')) return 'dependency'
  if (s.includes('risk')) return 'risk'
  return null
}

export function slugIndustryCode(title) {
  const base = String(title || 'legacy_schedule')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40)
  return `${base || 'legacy_schedule'}_${Date.now().toString(36)}`
}
