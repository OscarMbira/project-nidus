import { platformDb } from '@nidus/supabase'

function stepsToLegacyText(steps) {
  return (Array.isArray(steps) ? steps : [])
    .map((s) => {
      const level = s.level != null ? `L${s.level}: ` : ''
      const whom = String(s.whom || '').trim()
      const tf = String(s.timeframe || '').trim()
      const notes = String(s.notes || '').trim()
      if (!whom && !tf && !notes) return ''
      const mid = [whom, tf].filter(Boolean).join(' — ')
      return `${level}${mid}${notes ? ` (${notes})` : ''}`.trim()
    })
    .filter(Boolean)
    .join('\n')
}

function reportingToLegacyText(entries) {
  return (Array.isArray(entries) ? entries : [])
    .map((r) => {
      const from = String(r.from_party || '').trim()
      const to = String(r.to_party || '').trim()
      const cadence = String(r.cadence || '').trim()
      const notes = String(r.notes || '').trim()
      const arrow = from || to ? `${from || '?'} → ${to || '?'}` : ''
      const mid = [arrow, cadence].filter(Boolean).join(' — ')
      if (!mid && !notes) return ''
      return notes && mid ? `${mid} (${notes})` : mid || notes
    })
    .filter(Boolean)
    .join('\n')
}

function decisionToLegacyText(entries) {
  return (Array.isArray(entries) ? entries : [])
    .map((r) => {
      const decision = String(r.decision || '').trim()
      const by = String(r.decided_by || '').trim()
      const method = String(r.method || '').trim()
      const notes = String(r.notes || '').trim()
      const mid = [decision, by ? `by ${by}` : '', method].filter(Boolean).join(' — ')
      if (!mid && !notes) return ''
      return notes && mid ? `${mid} (${notes})` : mid || notes
    })
    .filter(Boolean)
    .join('\n')
}

export async function getGovernanceStructure(projectId) {
  const { data, error } = await platformDb
    .from('project_governance_structure')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function saveGovernanceStructure(projectId, fields, userId) {
  const existing = await getGovernanceStructure(projectId)
  const escalation_steps = Array.isArray(fields.escalation_steps) ? fields.escalation_steps : []
  const reporting_entries = Array.isArray(fields.reporting_entries) ? fields.reporting_entries : []
  const decision_entries = Array.isArray(fields.decision_entries) ? fields.decision_entries : []

  const payload = {
    project_id: projectId,
    structure_notes: fields.structure_notes ?? null,
    governance_bodies: fields.governance_bodies ?? null,
    reporting_lines: reportingToLegacyText(reporting_entries) || fields.reporting_lines || null,
    decision_flow: decisionToLegacyText(decision_entries) || fields.decision_flow || null,
    escalation_path: stepsToLegacyText(escalation_steps) || fields.escalation_path || null,
    escalation_steps,
    reporting_entries,
    decision_entries,
    pmo_oversight_notes: fields.pmo_oversight_notes ?? null,
    updated_by: userId || null,
    updated_at: new Date().toISOString(),
  }
  if (existing) {
    const { data, error } = await platformDb
      .from('project_governance_structure')
      .update(payload)
      .eq('id', existing.id)
      .select('*')
      .single()
    if (error) throw error
    return data
  }
  const { data, error } = await platformDb
    .from('project_governance_structure')
    .insert({ ...payload, created_by: userId || null })
    .select('*')
    .single()
  if (error) throw error
  return data
}
