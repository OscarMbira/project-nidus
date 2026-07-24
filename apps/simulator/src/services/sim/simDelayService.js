/**
 * Simulator delays (sim schema, v353)
 */

import { simDb } from '../supabase/supabaseClient'

const SELECT = '*'

function stripAutoImmutable(patch, row) {
  if (!row?.is_auto_linked) return patch
  const forbidden = [
    'source_type',
    'is_auto_linked',
    'linked_issue_id',
    'linked_risk_id',
    'linked_defect_id',
    'template_id',
  ]
  const out = { ...patch }
  forbidden.forEach((k) => {
    delete out[k]
  })
  return out
}

/** Cross-project list — RLS limits rows (e.g. PMO admin). */
export async function getAllDelays() {
  const { data, error } = await simDb
    .from('project_delays')
    .select('*')
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getDelaysByPracticeProject(practiceProjectId, filters = {}) {
  let q = simDb
    .from('project_delays')
    .select(SELECT)
    .eq('practice_project_id', practiceProjectId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
  if (filters.status) q = q.eq('status', filters.status)
  if (filters.draftsOnly) q = q.eq('is_draft', true)
  if (filters.source_type) q = q.eq('source_type', filters.source_type)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function getDelayById(id) {
  const { data, error } = await simDb.from('project_delays').select(SELECT).eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function createDelay(payload) {
  const row = {
    practice_project_id: payload.practice_project_id,
    organisation_id: payload.organisation_id ?? null,
    title: payload.title,
    description: payload.description ?? null,
    delay_category: payload.delay_category ?? 'other',
    delay_cause: payload.delay_cause ?? null,
    responsible_party: payload.responsible_party ?? null,
    impact_schedule_days: payload.impact_schedule_days ?? null,
    impact_cost: payload.impact_cost ?? null,
    impact_scope: payload.impact_scope ?? null,
    severity: payload.severity ?? 'medium',
    status: payload.status ?? 'identified',
    identified_date: payload.identified_date ?? null,
    original_baseline_date: payload.original_baseline_date ?? null,
    revised_forecast_date: payload.revised_forecast_date ?? null,
    resolution_plan: payload.resolution_plan ?? null,
    resolution_owner_id: payload.resolution_owner_id ?? null,
    resolution_target_date: payload.resolution_target_date ?? null,
    resolved_date: payload.resolved_date ?? null,
    linked_issue_id: payload.linked_issue_id ?? null,
    linked_risk_id: payload.linked_risk_id ?? null,
    linked_defect_id: payload.linked_defect_id ?? null,
    linked_work_package_id: payload.linked_work_package_id ?? null,
    linked_change_request_id: payload.linked_change_request_id ?? null,
    template_id: payload.template_id ?? null,
    tailoring_notes: payload.tailoring_notes ?? null,
    source_type: payload.source_type ?? 'manual',
    is_auto_linked: false,
    is_draft: !!payload.is_draft,
    draft_expires_at: payload.draft_expires_at ?? null,
    created_by: payload.created_by ?? null,
  }
  const { data, error } = await simDb.from('project_delays').insert(row).select(SELECT).single()
  if (error) throw error
  return data
}

export async function updateDelay(id, patch, existingRow) {
  const clean = stripAutoImmutable({ ...patch, updated_at: new Date().toISOString() }, existingRow)
  const { data, error } = await simDb.from('project_delays').update(clean).eq('id', id).select(SELECT).single()
  if (error) throw error
  return data
}

export async function deleteDelay(id) {
  const { data, error } = await simDb
    .from('project_delays')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function resolveDelay(id, resolvedDate) {
  const { data, error } = await simDb
    .from('project_delays')
    .update({
      status: 'resolved',
      resolved_date: resolvedDate || new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function syncOverdueDelays(practiceProjectId) {
  const { data, error } = await simDb.rpc('sync_overdue_delays', {
    p_practice_project_id: practiceProjectId || null,
  })
  if (error) throw error
  return typeof data === 'number' ? data : 0
}

export async function getOwnerHistory(delayId) {
  const { data, error } = await simDb
    .from('project_delay_owner_history')
    .select('*')
    .eq('delay_id', delayId)
    .order('changed_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function getDelayTemplates(orgId, filters = {}) {
  let q = simDb
    .from('delay_templates')
    .select('*')
    .eq('organisation_id', orgId)
    .order('updated_at', { ascending: false })
  if (filters.status) q = q.eq('status', filters.status)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function getDelayTemplate(id) {
  const { data, error } = await simDb.from('delay_templates').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function createDelayTemplate(payload) {
  const row = {
    organisation_id: payload.organisation_id,
    name: payload.name,
    delay_category: payload.delay_category ?? 'other',
    delay_cause: payload.delay_cause ?? null,
    responsible_party: payload.responsible_party ?? null,
    default_severity: payload.default_severity ?? 'medium',
    resolution_plan_template: payload.resolution_plan_template ?? null,
    tags: payload.tags ?? [],
    status: payload.status ?? 'draft',
    is_draft: !!payload.is_draft,
    draft_expires_at: payload.draft_expires_at ?? null,
    created_by: payload.created_by ?? null,
  }
  const { data, error } = await simDb.from('delay_templates').insert(row).select().single()
  if (error) throw error
  return data
}

export async function updateDelayTemplate(id, patch) {
  const { data, error } = await simDb
    .from('delay_templates')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteDelayTemplate(id) {
  return updateDelayTemplate(id, { status: 'archived' })
}

export async function countDelaysForTemplate(templateId) {
  const { count, error } = await simDb
    .from('project_delays')
    .select('id', { count: 'exact', head: true })
    .eq('template_id', templateId)
    .eq('is_deleted', false)
  if (error) throw error
  return count || 0
}

export function copyTemplateToDelayObject(template, practiceProjectId, organisationId) {
  if (!template) return null
  return {
    practice_project_id: practiceProjectId,
    organisation_id: organisationId,
    title: template.name,
    delay_category: template.delay_category,
    delay_cause: template.delay_cause,
    responsible_party: template.responsible_party,
    severity: template.default_severity || 'medium',
    resolution_plan: template.resolution_plan_template,
    template_id: template.id,
    source_type: 'from_template',
    tailoring_notes: '',
    status: 'identified',
    is_draft: true,
  }
}

export function getDelaySummary(delays) {
  const list = Array.isArray(delays) ? delays : []
  const open = list.filter((d) => d.status !== 'resolved' && d.status !== 'closed')
  const resolved = list.filter((d) => d.status === 'resolved' || d.status === 'closed')
  const totalDays = list.reduce((s, d) => s + (Number(d.impact_schedule_days) || 0), 0)
  const auto = list.filter((d) => d.is_auto_linked)
  const byCategory = {}
  list.forEach((d) => {
    const c = d.delay_category || 'other'
    byCategory[c] = (byCategory[c] || 0) + 1
  })
  return {
    total: list.length,
    openCount: open.length,
    resolvedCount: resolved.length,
    totalDaysLost: totalDays,
    autoLinkedCount: auto.length,
    byCategory,
  }
}
