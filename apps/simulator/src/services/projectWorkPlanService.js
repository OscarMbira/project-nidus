/**
 * Project Work Plan Service (v1180)
 * Self-service weekly/monthly Work Plans — mirrors timesheetService.js's approval-lifecycle
 * shape (draft/submitted/approved/rejected, append-only review log, mandatory justification)
 * and timesheetSettingsService.js's org-default + project-override pattern for cadence.
 */
import { platformDb } from './supabase/supabaseClient';

const WORK_PLAN_APPROVAL_ROLE_NAMES = new Set([
  'project_manager', 'programme_manager', 'pm_project_manager',
  'team_lead', 'pm_team_lead', 'team_manager', 'pm_team_manager',
]);

async function currentUserRowId() {
  const { data: auth } = await platformDb.auth.getUser();
  const authId = auth?.user?.id;
  if (!authId) return null;
  const { data } = await platformDb.from('users').select('id').eq('auth_user_id', authId).maybeSingle();
  return data?.id || null;
}

/** TRUE if the current user may approve Work Plans on this project — PMO Admin/owner, named
 * Project Manager, or an active project-scoped role of project_manager/programme_manager/
 * team_lead/team_manager. Broader than userCanManageProjectTimesheetSettings (v1178) by design
 * (team_lead/team_manager are not Timesheet-settings approvers, but are Work Plan approvers
 * per the v1180 PRD interview). Does NOT use .single() — a user can hold multiple active roles
 * on the same project (see the v1178 "Multiple roles" fix). */
export async function userCanManageWorkPlanApprovals(projectId, accountId) {
  const uid = await currentUserRowId();
  if (!uid) return false;
  const { data: project } = await platformDb.from('projects').select('project_manager_user_id').eq('id', projectId).maybeSingle();
  if (project?.project_manager_user_id === uid) return true;
  const { data: roleAssignments } = await platformDb
    .from('user_roles')
    .select('roles(role_name)')
    .eq('user_id', uid)
    .eq('project_id', projectId)
    .eq('is_active', true)
    .eq('is_deleted', false);
  const roleNames = (roleAssignments || []).map((r) => r.roles?.role_name).filter(Boolean);
  if (roleNames.some((n) => WORK_PLAN_APPROVAL_ROLE_NAMES.has(n))) return true;
  if (!accountId) return false;
  const { data: orgRoles } = await platformDb
    .from('user_roles')
    .select('roles(role_name)')
    .eq('user_id', uid)
    .eq('is_active', true);
  const orgRoleNames = (orgRoles || []).map((r) => r.roles?.role_name).filter(Boolean);
  if (orgRoleNames.includes('pmo_admin') || orgRoleNames.includes('system_admin')) return true;
  const { data: acct } = await platformDb.from('accounts').select('owner_user_id').eq('id', accountId).maybeSingle();
  return !!(acct?.owner_user_id && acct.owner_user_id === uid);
}

export async function getProjectBillingType(projectId) {
  const { data, error } = await platformDb.from('projects').select('billing_type').eq('id', projectId).maybeSingle();
  if (error) throw error;
  return data?.billing_type || null;
}

export async function updateProjectBillingType(projectId, billingType) {
  const { data, error } = await platformDb.from('projects').update({ billing_type: billingType }).eq('id', projectId).select('id, billing_type').single();
  if (error) throw error;
  return data;
}

/** Project role catalog for the Role field's searchable dropdown — this project's own custom
 * roles plus the org-wide templates (project_id IS NULL), matching how project_roles is used
 * as the single role catalog elsewhere (role assignment, Team Charter authority, etc.). */
export async function getProjectRoleOptions(projectId) {
  const { data, error } = await platformDb
    .from('project_roles')
    .select('role_name, role_display_name')
    .or(`project_id.eq.${projectId},project_id.is.null`)
    .eq('is_active', true)
    .order('role_display_name');
  if (error) throw error;
  const seen = new Set();
  return (data || []).filter((r) => {
    if (seen.has(r.role_name)) return false;
    seen.add(r.role_name);
    return true;
  });
}

export async function getWorkPlanItemStatuses() {
  const { data, error } = await platformDb
    .from('work_plan_item_statuses')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw error;
  return { data: data || [] };
}

/** The one Work Plan header for this person/project/period — or null if none exists yet. */
export async function getWorkPlan(projectId, userId, periodStartDate) {
  const { data, error } = await platformDb
    .from('project_work_plans')
    .select('*')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .eq('period_start_date', periodStartDate)
    .eq('is_deleted', false)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Idempotent — returns the existing header for this period, or creates a fresh draft one. */
export async function getOrCreateWorkPlan(projectId, userId, periodType, periodStartDate, periodEndDate) {
  const existing = await getWorkPlan(projectId, userId, periodStartDate);
  if (existing) return existing;
  const { data, error } = await platformDb
    .from('project_work_plans')
    .insert({
      project_id: projectId,
      user_id: userId,
      period_type: periodType,
      period_start_date: periodStartDate,
      period_end_date: periodEndDate,
      status: 'draft',
    })
    .select('*')
    .single();
  if (error) {
    // Check-then-insert race: two near-simultaneous calls (React StrictMode's intentional
    // double-invoke of effects in dev, or just rapid period navigation) can both see "no
    // existing plan" and both try to create one — the second hits
    // uq_project_work_plans_person_period (Postgres 23505). That's not a real failure, just a
    // lost race: the other call's row already exists, so fetch and return it instead of
    // surfacing a 409 to the user.
    if (error.code === '23505') {
      const row = await getWorkPlan(projectId, userId, periodStartDate);
      if (row) return row;
    }
    throw error;
  }
  return data;
}

/** Every team member's Work Plan header (+ its items) for a project/period — the PM/PMO/Team
 * Lead/Team Manager "Team Work Plan" view. RLS (auth_user_can_manage_work_plans) already
 * restricts this to approvers; a plain team member calling it only ever gets their own row back. */
export async function listProjectWorkPlansForPeriod(projectId, periodStartDate) {
  const { data: plans, error } = await platformDb
    .from('project_work_plans')
    .select('*')
    .eq('project_id', projectId)
    .eq('period_start_date', periodStartDate)
    .eq('is_deleted', false);
  if (error) throw error;
  const rows = plans || [];
  if (rows.length === 0) return [];
  const { data: items, error: itemsError } = await platformDb
    .from('project_work_plan_items')
    .select('*')
    .in('work_plan_id', rows.map((p) => p.id))
    .eq('is_deleted', false)
    .order('sort_order');
  if (itemsError) throw itemsError;
  const itemsByPlan = {};
  for (const i of items || []) {
    (itemsByPlan[i.work_plan_id] = itemsByPlan[i.work_plan_id] || []).push(i);
  }
  return rows.map((p) => ({ ...p, items: itemsByPlan[p.id] || [] }));
}

export async function listWorkPlanItems(workPlanId) {
  if (!workPlanId) return []
  const { data, error } = await platformDb
    .from('project_work_plan_items')
    .select('*')
    .eq('work_plan_id', workPlanId)
    .eq('is_deleted', false)
    .order('sort_order');
  if (error) throw error;
  return data || [];
}

export async function createWorkPlanItem(payload) {
  const { data, error } = await platformDb.from('project_work_plan_items').insert(payload).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateWorkPlanItem(id, payload) {
  const { data, error } = await platformDb.from('project_work_plan_items').update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function deleteWorkPlanItem(id) {
  const { error } = await platformDb.from('project_work_plan_items').update({ is_deleted: true }).eq('id', id);
  if (error) throw error;
}

/** Blocks submitting an empty plan — mirrors how Timesheets block submitting an empty week. */
export async function submitWorkPlan(workPlanId) {
  const items = await listWorkPlanItems(workPlanId);
  if (items.length === 0) {
    throw new Error('Add at least one item before submitting this plan');
  }
  const { data, error } = await platformDb
    .from('project_work_plans')
    .update({ status: 'submitted', submitted_at: new Date().toISOString() })
    .eq('id', workPlanId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

async function decideWorkPlan(workPlanId, reviewerId, decision, notes) {
  if (!notes || !notes.trim()) {
    throw new Error('A justification note is required');
  }
  const { error: reviewError } = await platformDb.from('project_work_plan_reviews').insert({
    work_plan_id: workPlanId,
    decision,
    reviewer_id: reviewerId,
    notes: notes.trim(),
  });
  if (reviewError) throw reviewError;

  const { data, error } = await platformDb
    .from('project_work_plans')
    .update({ status: decision, reviewed_by: reviewerId, reviewed_at: new Date().toISOString(), review_notes: notes.trim() })
    .eq('id', workPlanId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function approveWorkPlan(workPlanId, reviewerId, notes) {
  return decideWorkPlan(workPlanId, reviewerId, 'approved', notes);
}

export async function rejectWorkPlan(workPlanId, reviewerId, notes) {
  return decideWorkPlan(workPlanId, reviewerId, 'rejected', notes);
}

export async function listWorkPlanReviewHistory(workPlanId) {
  const { data, error } = await platformDb
    .from('project_work_plan_reviews')
    .select('*')
    .eq('work_plan_id', workPlanId)
    .order('decided_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

/** Incomplete items (not Completed) from a prior plan — candidates for the opt-in
 * carry-forward UI. Does not write anything; the caller re-creates chosen items with
 * status_code='carried_forward' in the new period. */
export async function getCarryForwardCandidates(projectId, userId, previousPeriodStartDate) {
  const previous = await getWorkPlan(projectId, userId, previousPeriodStartDate);
  if (!previous) return [];
  const items = await listWorkPlanItems(previous.id);
  return items.filter((i) => i.status_code !== 'completed');
}

/**
 * Two-tier match: prefer an exact task_id match, else fall back to work_category, else
 * unmatched. Pure function — no DB access — so it's directly unit-testable.
 * @param {{task_id?: string|null, work_category?: string|null}} item
 * @param {Array<{task_id?: string|null, work_category?: string|null, hours_worked?: number|string, is_overtime?: boolean}>} timesheetEntries
 */
export function matchWorkPlanItemToTimesheetEntries(item, timesheetEntries) {
  const entries = (timesheetEntries || []).filter((e) => !e.is_overtime);
  if (item?.task_id) {
    const byTask = entries.filter((e) => e.task_id === item.task_id);
    if (byTask.length > 0) return { matchType: 'task', entries: byTask };
  }
  if (item?.work_category) {
    const byCategory = entries.filter((e) => e.work_category === item.work_category);
    if (byCategory.length > 0) return { matchType: 'category', entries: byCategory };
  }
  return { matchType: 'unmatched', entries: [] };
}

/**
 * Planned (sum of estimated_hours) vs Actual (sum of matched entries' hours_worked) for a
 * period, plus per-item coverage flags. Pure function.
 * @param {Array} items - project_work_plan_items rows
 * @param {Array} timesheetEntries - this period's timesheet_entries rows (any user's, already
 *   filtered to the relevant person/period by the caller)
 */
export function computeWorkPlanVariance(items, timesheetEntries) {
  let plannedHours = 0;
  let actualHours = 0;
  const itemBreakdown = (items || []).map((item) => {
    const estimated = parseFloat(item.estimated_hours) || 0;
    plannedHours += estimated;
    const { matchType, entries } = matchWorkPlanItemToTimesheetEntries(item, timesheetEntries);
    const actual = entries.reduce((s, e) => s + (parseFloat(e.hours_worked) || 0), 0);
    actualHours += actual;
    return {
      itemId: item.id,
      matchType,
      estimatedHours: estimated,
      actualHours: actual,
      noHoursLogged: estimated > 0 && actual === 0,
    };
  });
  const matchedTimesheetIds = new Set(
    itemBreakdown.flatMap((b) => {
      const { entries } = matchWorkPlanItemToTimesheetEntries(items.find((i) => i.id === b.itemId), timesheetEntries);
      return entries.map((e) => e.id);
    })
  );
  const unplannedEntries = (timesheetEntries || []).filter((e) => !e.is_overtime && !matchedTimesheetIds.has(e.id));
  const unplannedHours = unplannedEntries.reduce((s, e) => s + (parseFloat(e.hours_worked) || 0), 0);
  const varianceHours = actualHours - plannedHours;
  const variancePct = plannedHours > 0 ? (varianceHours / plannedHours) * 100 : null;
  return {
    plannedHours,
    actualHours,
    varianceHours,
    variancePct,
    unplannedHours,
    unplannedEntryCount: unplannedEntries.length,
    items: itemBreakdown,
  };
}

export default {
  userCanManageWorkPlanApprovals,
  getProjectBillingType,
  updateProjectBillingType,
  getProjectRoleOptions,
  getWorkPlanItemStatuses,
  getWorkPlan,
  getOrCreateWorkPlan,
  listProjectWorkPlansForPeriod,
  listWorkPlanItems,
  createWorkPlanItem,
  updateWorkPlanItem,
  deleteWorkPlanItem,
  submitWorkPlan,
  approveWorkPlan,
  rejectWorkPlan,
  listWorkPlanReviewHistory,
  getCarryForwardCandidates,
  matchWorkPlanItemToTimesheetEntries,
  computeWorkPlanVariance,
};
