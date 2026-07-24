/**
 * Project-scoped industry plan copies (Platform).
 */
import { platformDb } from './supabase/supabaseClient'
import { getTemplateById, buildSnapshotFromTemplate } from './industryTemplateService'

const TABLE = 'project_industry_plan'

function throwIf(error, label) {
  if (error) throw new Error(error.message || label)
}

export async function getProjectPlan(projectId) {
  const { data, error } = await platformDb
    .from(TABLE)
    .select('*, template:pmo_industry_templates(id, industry_name, industry_code, icon)')
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  throwIf(error, 'Failed to load project industry plan')
  return data
}

export async function getProjectPlanById(id) {
  const { data, error } = await platformDb
    .from(TABLE)
    .select('*, template:pmo_industry_templates(id, industry_name, industry_code, icon)')
    .eq('id', id)
    .eq('is_deleted', false)
    .maybeSingle()
  throwIf(error, 'Failed to load industry plan')
  return data
}

export async function createProjectPlan(projectId, templateId, payload = {}) {
  const {
    data: { user },
  } = await platformDb.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  let snapshots = {}
  if (!payload.included_phases?.length && templateId) {
    const tpl = await getTemplateById(templateId)
    if (tpl) snapshots = buildSnapshotFromTemplate(tpl)
  }

  const row = {
    project_id: projectId,
    template_id: templateId,
    created_by: user.id,
    updated_by: user.id,
    plan_title: payload.plan_title || 'Industry Plan',
    customisation_notes: payload.customisation_notes ?? null,
    included_phases: payload.included_phases ?? snapshots.included_phases ?? [],
    included_activities: payload.included_activities ?? snapshots.included_activities ?? [],
    included_deliverables: payload.included_deliverables ?? snapshots.included_deliverables ?? [],
    included_risks: payload.included_risks ?? snapshots.included_risks ?? [],
    included_milestones: payload.included_milestones ?? snapshots.included_milestones ?? [],
    included_roles: payload.included_roles ?? snapshots.included_roles ?? [],
    status: payload.status ?? 'draft',
    is_on_hold: payload.is_on_hold ?? false,
    on_hold_reason: payload.on_hold_reason ?? null,
    is_deleted: false,
  }

  const { data, error } = await platformDb.from(TABLE).insert(row).select().single()
  throwIf(error, 'Failed to create project industry plan')
  return data
}

export async function updateProjectPlan(id, payload) {
  const {
    data: { user },
  } = await platformDb.auth.getUser()
  const { data, error } = await platformDb
    .from(TABLE)
    .update({
      ...payload,
      updated_by: user?.id ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  throwIf(error, 'Failed to update project industry plan')
  return data
}

export async function putOnHold(id, reason) {
  return updateProjectPlan(id, { is_on_hold: true, on_hold_reason: reason, status: 'draft' })
}

export async function archivePlan(id) {
  return updateProjectPlan(id, { status: 'archived' })
}

export async function deletePlan(id) {
  return updateProjectPlan(id, { is_deleted: true, status: 'archived' })
}
