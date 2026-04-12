/**
 * Team micro-plans (M11) — public schema
 */

import { platformDb } from './supabase/supabaseClient'
import { exportRecordToExcel, exportRecordToCSV, exportRecordToJSON, exportRecordToPrint } from '../utils/exportUtils'

const PLAN_SELECT = '*'

export async function getMicroPlans(projectId, filters = {}) {
  let q = platformDb
    .from('project_micro_plans')
    .select(PLAN_SELECT)
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .order('updated_at', { ascending: false })

  if (filters.plan_type) q = q.eq('plan_type', filters.plan_type)
  if (filters.status) q = q.eq('status', filters.status)
  if (filters.owner_id) q = q.eq('owner_id', filters.owner_id)

  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function getMicroPlan(id) {
  const { data: plan, error } = await platformDb.from('project_micro_plans').select(PLAN_SELECT).eq('id', id).single()
  if (error) throw error

  const [{ data: activities }, { data: comments }, { data: versions }] = await Promise.all([
    platformDb
      .from('micro_plan_activities')
      .select('*')
      .eq('micro_plan_id', id)
      .eq('is_deleted', false)
      .order('sort_order', { ascending: true }),
    platformDb.from('micro_plan_comments').select('*').eq('micro_plan_id', id).order('created_at', { ascending: true }),
    platformDb.from('micro_plan_versions').select('*').eq('micro_plan_id', id).order('created_at', { ascending: false }),
  ])

  return {
    ...plan,
    activities: activities || [],
    comments: comments || [],
    versions: versions || [],
  }
}

export async function createMicroPlan(payload) {
  const row = {
    project_id: payload.project_id,
    organisation_id: payload.organisation_id,
    plan_name: payload.plan_name,
    plan_type: payload.plan_type || 'team_delivery',
    description: payload.description ?? null,
    objectives: payload.objectives ?? null,
    scope_in: payload.scope_in ?? null,
    scope_out: payload.scope_out ?? null,
    assumptions: payload.assumptions ?? null,
    constraints: payload.constraints ?? null,
    responsible_team: payload.responsible_team ?? null,
    owner_id: payload.owner_id,
    approver_id: payload.approver_id ?? null,
    status: payload.status || 'draft',
    version_number: payload.version_number || '1.0',
    review_frequency: payload.review_frequency || 'weekly',
    next_review_date: payload.next_review_date ?? null,
    linked_master_plan_id: payload.linked_master_plan_id ?? null,
    linked_stage_plan_id: payload.linked_stage_plan_id ?? null,
    linked_work_package_id: payload.linked_work_package_id ?? null,
    overall_rag: payload.overall_rag ?? 'green',
    tags: payload.tags ?? null,
    is_draft: !!payload.is_draft,
    draft_expires_at: payload.draft_expires_at ?? null,
    created_by: payload.created_by ?? null,
  }
  const { data, error } = await platformDb.from('project_micro_plans').insert(row).select(PLAN_SELECT).single()
  if (error) throw error
  return data
}

/** Draft team_delivery micro-plan linked to a work package (Phase 6.12). */
export async function startDraftMicroPlanFromWorkPackage(projectId, workPackageId) {
  const {
    data: { user },
  } = await platformDb.auth.getUser()
  if (!user?.id) throw new Error('Not authenticated')
  const { data: proj, error: pe } = await platformDb
    .from('projects')
    .select('organisation_id')
    .eq('id', projectId)
    .single()
  if (pe) throw pe
  if (!proj?.organisation_id) throw new Error('Project organisation not found')
  const wpRef = typeof workPackageId === 'string' ? workPackageId.replace(/-/g, '').slice(0, 8) : 'wp'
  return createMicroPlan({
    project_id: projectId,
    organisation_id: proj.organisation_id,
    owner_id: user.id,
    plan_name: `Team delivery — ${wpRef}`,
    plan_type: 'team_delivery',
    linked_work_package_id: workPackageId,
    status: 'draft',
    is_draft: true,
    created_by: user.id,
  })
}

export async function updateMicroPlan(id, patch) {
  const { data, error } = await platformDb
    .from('project_micro_plans')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(PLAN_SELECT)
    .single()
  if (error) throw error
  return data
}

export async function deleteMicroPlan(id) {
  return updateMicroPlan(id, { is_deleted: true })
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

export async function approveMicroPlan(id, approverId, notes) {
  const plan = await getMicroPlan(id)
  const nextVersion = bumpVersion(plan.version_number || '1.0')
  const snapshot = await buildSnapshotJson(id)

  const { error: vErr } = await platformDb.from('micro_plan_versions').insert({
    micro_plan_id: id,
    version_number: plan.version_number || '1.0',
    snapshot_data: snapshot,
    change_summary: notes || 'Approved',
    created_by: approverId,
  })
  if (vErr) throw vErr

  const { data, error } = await platformDb
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
    .select(PLAN_SELECT)
    .single()
  if (error) throw error
  return data
}

function bumpVersion(v) {
  const m = /^(\d+)\.(\d+)$/.exec(v || '1.0')
  if (!m) return '1.1'
  const major = parseInt(m[1], 10)
  const minor = parseInt(m[2], 10) + 1
  return `${major}.${minor}`
}

export async function submitForReview(id) {
  return updateMicroPlan(id, { status: 'under_review' })
}

export async function saveDraft(id, draftExpiresAt) {
  return updateMicroPlan(id, { is_draft: true, draft_expires_at: draftExpiresAt || null })
}

export async function getDraftPlans(userProfileId) {
  const { data, error } = await platformDb
    .from('project_micro_plans')
    .select(PLAN_SELECT)
    .eq('owner_id', userProfileId)
    .eq('is_draft', true)
    .eq('is_deleted', false)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getVersionHistory(microPlanId) {
  const { data, error } = await platformDb
    .from('micro_plan_versions')
    .select('*')
    .eq('micro_plan_id', microPlanId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function restoreVersion(microPlanId, versionId) {
  const { data: ver, error } = await platformDb.from('micro_plan_versions').select('*').eq('id', versionId).single()
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

export async function getActivities(microPlanId) {
  const { data, error } = await platformDb
    .from('micro_plan_activities')
    .select('*')
    .eq('micro_plan_id', microPlanId)
    .eq('is_deleted', false)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data || []
}

export async function createActivity(payload) {
  const row = {
    micro_plan_id: payload.micro_plan_id,
    project_id: payload.project_id,
    activity_name: payload.activity_name,
    description: payload.description ?? null,
    category: payload.category || 'other',
    priority: payload.priority || 'medium',
    owner_id: payload.owner_id ?? null,
    supporting_member_ids: payload.supporting_member_ids ?? null,
    planned_start_date: payload.planned_start_date ?? null,
    planned_end_date: payload.planned_end_date ?? null,
    planned_duration_days: payload.planned_duration_days ?? null,
    planned_effort_days: payload.planned_effort_days ?? null,
    actual_start_date: payload.actual_start_date ?? null,
    actual_end_date: payload.actual_end_date ?? null,
    actual_duration_days: payload.actual_duration_days ?? null,
    actual_effort_days: payload.actual_effort_days ?? null,
    progress_pct: payload.progress_pct ?? 0,
    status: payload.status || 'not_started',
    rag_status: payload.rag_status || 'green',
    is_milestone: !!payload.is_milestone,
    is_critical: !!payload.is_critical,
    deliverable_output: payload.deliverable_output ?? null,
    quality_check_required: !!payload.quality_check_required,
    quality_check_status: payload.quality_check_status || 'not_required',
    quality_check_notes: payload.quality_check_notes ?? null,
    entry_criteria: payload.entry_criteria ?? null,
    exit_criteria: payload.exit_criteria ?? null,
    risk_flag: !!payload.risk_flag,
    linked_risk_id: payload.linked_risk_id ?? null,
    issue_flag: !!payload.issue_flag,
    linked_issue_id: payload.linked_issue_id ?? null,
    linked_master_task_id: payload.linked_master_task_id ?? null,
    predecessor_activity_id: payload.predecessor_activity_id ?? null,
    dependency_type: payload.dependency_type || 'FS',
    lag_days: payload.lag_days ?? 0,
    notes: payload.notes ?? null,
    tags: payload.tags ?? null,
    attachments: payload.attachments ?? null,
    sort_order: payload.sort_order ?? 0,
    created_by: payload.created_by ?? null,
  }
  const { data, error } = await platformDb.from('micro_plan_activities').insert(row).select().single()
  if (error) throw error
  return data
}

export async function updateActivity(id, patch) {
  const { data, error } = await platformDb
    .from('micro_plan_activities')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteActivity(id) {
  return updateActivity(id, { is_deleted: true })
}

export async function bulkCreateActivities(microPlanId, projectId, rows) {
  const created = []
  for (const r of rows || []) {
    const row = await createActivity({
      micro_plan_id: microPlanId,
      project_id: projectId,
      activity_name: r.activity_name || r.name || 'Activity',
      ...r,
    })
    created.push(row)
  }
  return created
}

export async function reorderActivities(microPlanId, orderedIds) {
  for (let i = 0; i < orderedIds.length; i++) {
    await platformDb.from('micro_plan_activities').update({ sort_order: i }).eq('id', orderedIds[i]).eq('micro_plan_id', microPlanId)
  }
}

export async function updateActivityProgress(id, progressPct, ragStatus) {
  return updateActivity(id, { progress_pct: progressPct, rag_status: ragStatus })
}

export async function getComments(microPlanId, activityId) {
  let q = platformDb.from('micro_plan_comments').select('*').eq('micro_plan_id', microPlanId)
  if (activityId) q = q.eq('activity_id', activityId)
  const { data, error } = await q.order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function addComment(payload) {
  const row = {
    micro_plan_id: payload.micro_plan_id,
    activity_id: payload.activity_id ?? null,
    author_id: payload.author_id,
    comment_text: payload.comment_text,
    is_status_update: !!payload.is_status_update,
  }
  const { data, error } = await platformDb.from('micro_plan_comments').insert(row).select().single()
  if (error) throw error
  return data
}

export async function deleteComment(id) {
  const { error } = await platformDb.from('micro_plan_comments').delete().eq('id', id)
  if (error) throw error
}

export async function exportMicroPlan(id, format, branding) {
  const full = await getMicroPlan(id)
  const sections = [
    {
      title: 'Plan',
      fields: [
        { key: 'plan_reference', label: 'Reference' },
        { key: 'plan_name', label: 'Name' },
        { key: 'plan_type', label: 'Type' },
        { key: 'status', label: 'Status' },
        { key: 'version_number', label: 'Version' },
      ],
    },
    {
      title: 'Activities',
      fields: [{ key: 'activities', label: 'Activities (JSON)' }],
    },
  ]
  const record = {
    ...full,
    activities: JSON.stringify((full.activities || []).map((a) => a.activity_name)),
  }
  const base = `micro-plan-${full.plan_reference || id}`
  if (format === 'excel') exportRecordToExcel(sections, record, base, branding)
  else if (format === 'csv') exportRecordToCSV(sections, record, base)
  else if (format === 'json') exportRecordToJSON(sections, record, base)
  else exportRecordToPrint(sections, record, base, branding)
}

export async function getMicroPlanSummary(projectId) {
  const plans = await getMicroPlans(projectId)
  const byType = {}
  const byRag = { green: 0, amber: 0, red: 0 }
  let approved = 0
  let inReview = 0
  let drafts = 0
  for (const p of plans) {
    byType[p.plan_type] = (byType[p.plan_type] || 0) + 1
    const rag = p.overall_rag === 'amber' ? 'amber' : p.overall_rag === 'red' ? 'red' : 'green'
    byRag[rag] = (byRag[rag] || 0) + 1
    if (p.status === 'approved') approved++
    if (p.status === 'under_review') inReview++
    if (p.is_draft) drafts++
  }
  return { total: plans.length, byType, byRag, approved, inReview, drafts }
}

/** Count non-deleted micro-plans linked to a work package (Platform). */
export async function countMicroPlansByWorkPackage(projectId, workPackageId) {
  if (!projectId || !workPackageId) return 0
  const { count, error } = await platformDb
    .from('project_micro_plans')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('linked_work_package_id', workPackageId)
    .eq('is_deleted', false)
  if (error) throw error
  return count ?? 0
}
