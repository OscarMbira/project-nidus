/** Sim micro-plans — mirrors platform behaviour with practice_project_id + auth.users */
import { simDb } from '../supabase/supabaseClient'

export async function getMicroPlans(practiceProjectId) {
  const { data, error } = await simDb
    .from('project_micro_plans')
    .select('*')
    .eq('practice_project_id', practiceProjectId)
    .eq('is_deleted', false)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getMicroPlan(id) {
  const { data: plan, error } = await simDb.from('project_micro_plans').select('*').eq('id', id).single()
  if (error) throw error
  const [{ data: activities }, { data: comments }, { data: versions }] = await Promise.all([
    simDb.from('micro_plan_activities').select('*').eq('micro_plan_id', id).eq('is_deleted', false),
    simDb.from('micro_plan_comments').select('*').eq('micro_plan_id', id),
    simDb.from('micro_plan_versions').select('*').eq('micro_plan_id', id).order('created_at', { ascending: false }),
  ])
  return { ...plan, activities: activities || [], comments: comments || [], versions: versions || [] }
}

export async function createMicroPlan(payload) {
  const { data, error } = await simDb.from('project_micro_plans').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function updateMicroPlan(id, patch) {
  const { data, error } = await simDb
    .from('project_micro_plans')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function createActivity(payload) {
  const { data, error } = await simDb.from('micro_plan_activities').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function getDraftPlans(ownerAuthUserId) {
  const { data, error } = await simDb
    .from('project_micro_plans')
    .select('*')
    .eq('owner_id', ownerAuthUserId)
    .eq('is_draft', true)
    .eq('is_deleted', false)
  if (error) throw error
  return data || []
}

async function buildSnapshotJson(microPlanId) {
  const full = await getMicroPlan(microPlanId)
  return {
    plan: {
      id: full.id,
      plan_name: full.plan_name,
      plan_type: full.plan_type,
      description: full.description,
      objectives: full.objectives,
      scope_in: full.scope_in,
      scope_out: full.scope_out,
      version_number: full.version_number,
    },
    activities: full.activities,
  }
}

function bumpVersion(v) {
  const m = /^(\d+)\.(\d+)$/.exec(v || '1.0')
  if (!m) return '1.1'
  const major = parseInt(m[1], 10)
  const minor = parseInt(m[2], 10) + 1
  return `${major}.${minor}`
}

export async function approveMicroPlan(id, approverId, notes) {
  const plan = await getMicroPlan(id)
  const nextVersion = bumpVersion(plan.version_number || '1.0')
  const snapshot = await buildSnapshotJson(id)

  const { error: vErr } = await simDb.from('micro_plan_versions').insert({
    micro_plan_id: id,
    version_number: plan.version_number || '1.0',
    snapshot_data: snapshot,
    change_summary: notes || 'Approved',
    created_by: approverId,
  })
  if (vErr) throw vErr

  const { data, error } = await simDb
    .from('project_micro_plans')
    .update({
      status: 'approved',
      approver_id: approverId,
      approved_at: new Date().toISOString(),
      approval_notes: notes ?? null,
      version_number: nextVersion,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getVersionHistory(microPlanId) {
  const { data, error } = await simDb
    .from('micro_plan_versions')
    .select('*')
    .eq('micro_plan_id', microPlanId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function restoreVersion(microPlanId, versionId) {
  const { data: ver, error } = await simDb.from('micro_plan_versions').select('*').eq('id', versionId).single()
  if (error) throw error
  const snap = ver.snapshot_data
  if (!snap?.plan) throw new Error('Invalid snapshot')

  await updateMicroPlan(microPlanId, {
    plan_name: snap.plan.plan_name,
    description: snap.plan.description,
    objectives: snap.plan.objectives,
    scope_in: snap.plan.scope_in,
    scope_out: snap.plan.scope_out,
    version_number: bumpVersion(snap.plan.version_number || '1.0'),
    status: 'draft',
  })

  return getMicroPlan(microPlanId)
}
