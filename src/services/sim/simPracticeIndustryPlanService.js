/**
 * Simulator practice industry plan copies (sim schema).
 * Master templates read via industryTemplateService (public / platformDb).
 */
import { simDb } from '../supabase/supabaseClient'
import { getTemplateById, buildSnapshotFromTemplate } from '../industryTemplateService'

const TABLE = 'practice_industry_plan'

function throwIf(error, label) {
  if (error) throw new Error(error.message || label)
}

/** Simulator practice rows store auth.users.id (same as other sim.practice_* tables). */
async function getSimAuthUserId() {
  const {
    data: { user },
  } = await simDb.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

export async function getPracticePlan(practiceProjectId) {
  const { data, error } = await simDb
    .from(TABLE)
    .select('*')
    .eq('practice_project_id', practiceProjectId)
    .eq('is_deleted', false)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  throwIf(error, 'Failed to load practice industry plan')
  return data
}

export async function getPracticePlanById(id) {
  const { data, error } = await simDb.from(TABLE).select('*').eq('id', id).eq('is_deleted', false).maybeSingle()
  throwIf(error, 'Failed to load practice industry plan')
  return data
}

export async function createPracticePlan(practiceProjectId, templateId, payload = {}) {
  const userId = await getSimAuthUserId()

  let snapshots = {}
  if (!payload.included_phases?.length && templateId) {
    const tpl = await getTemplateById(templateId)
    if (tpl) snapshots = buildSnapshotFromTemplate(tpl)
  }

  const row = {
    practice_project_id: practiceProjectId,
    template_id: templateId,
    user_id: userId,
    plan_title: payload.plan_title || 'Practice Industry Plan',
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

  const { data, error } = await simDb.from(TABLE).insert(row).select().single()
  throwIf(error, 'Failed to create practice industry plan')
  return data
}

export async function updatePracticePlan(id, payload) {
  const { data, error } = await simDb
    .from(TABLE)
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  throwIf(error, 'Failed to update practice industry plan')
  return data
}

export async function putPracticeOnHold(id, reason) {
  return updatePracticePlan(id, { is_on_hold: true, on_hold_reason: reason, status: 'draft' })
}

export async function archivePracticePlan(id) {
  return updatePracticePlan(id, { status: 'archived' })
}

export async function deletePracticePlan(id) {
  return updatePracticePlan(id, { is_deleted: true, status: 'archived' })
}
