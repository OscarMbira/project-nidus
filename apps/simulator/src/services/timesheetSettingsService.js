/**
 * Timesheet Settings Service (v1173)
 * Organisation defaults + optional project overrides for standard daily hours, overtime
 * maximums (soft warning only), and the 5 weekdays that count as the standard work week.
 * Mirrors the org-default + project-override pattern already established by Regional & Format
 * Settings (v1060/v1062) — see resolveRegionalFormatSettings.js for the analogous merge shape.
 */

import { platformDb } from './supabase/supabaseClient';

export const TIMESHEET_SETTINGS_DEFAULTS = {
  standard_daily_hours: 8,
  max_overtime_per_day: 4,
  max_overtime_per_week: 10,
  working_days: ['mon', 'tue', 'wed', 'thu', 'fri'],
  work_plan_period_type: 'weekly', // v1182 — Work Plan cadence, same org-default + project-override shape
};

const SETTINGS_FIELD_KEYS = ['standard_daily_hours', 'max_overtime_per_day', 'max_overtime_per_week', 'working_days', 'work_plan_period_type'];

/** Merge org defaults + optional project override into one resolved settings object. */
export function mergeTimesheetSettings(orgRow, projectRow) {
  const base = { ...TIMESHEET_SETTINGS_DEFAULTS };
  if (orgRow && typeof orgRow === 'object') {
    for (const key of SETTINGS_FIELD_KEYS) {
      if (orgRow[key] != null) base[key] = orgRow[key];
    }
  }
  const overrides = {};
  if (projectRow && typeof projectRow === 'object') {
    for (const key of SETTINGS_FIELD_KEYS) {
      const v = projectRow[key];
      if (v != null) {
        base[key] = v;
        overrides[key] = true;
      } else {
        overrides[key] = false;
      }
    }
  } else {
    for (const key of SETTINGS_FIELD_KEYS) overrides[key] = false;
  }
  return { ...base, overrides };
}

/**
 * Fetch and resolve both rows in one call — the main entry point consumers use.
 * @param {string} accountId
 * @param {string|null} [projectId] - omit to resolve organisation defaults only
 * @returns {Promise<typeof TIMESHEET_SETTINGS_DEFAULTS & { overrides: Record<string, boolean> }>}
 */
export async function resolveTimesheetSettings(accountId, projectId = null) {
  const [{ data: orgRow }, projectResult] = await Promise.all([
    platformDb
      .from('organisation_timesheet_settings')
      .select('*')
      .eq('account_id', accountId)
      .eq('is_deleted', false)
      .maybeSingle(),
    projectId
      ? platformDb
          .from('project_timesheet_settings')
          .select('*')
          .eq('project_id', projectId)
          .eq('is_deleted', false)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  return mergeTimesheetSettings(orgRow, projectResult.data);
}

export async function getOrganisationTimesheetSettings(accountId) {
  const { data, error } = await platformDb
    .from('organisation_timesheet_settings')
    .select('*')
    .eq('account_id', accountId)
    .eq('is_deleted', false)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertOrganisationTimesheetSettings(accountId, settings) {
  const { data, error } = await platformDb
    .from('organisation_timesheet_settings')
    .upsert(
      { account_id: accountId, ...settings },
      { onConflict: 'account_id' }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getProjectTimesheetSettings(projectId) {
  const { data, error } = await platformDb
    .from('project_timesheet_settings')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertProjectTimesheetSettings(projectId, settings) {
  const { data, error } = await platformDb
    .from('project_timesheet_settings')
    .upsert(
      { project_id: projectId, ...settings },
      { onConflict: 'project_id' }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Build a project upsert payload from override checkboxes + resolved form values. */
export function buildProjectTimesheetSettingsPayload(overrideFlags, values) {
  const payload = {};
  for (const key of SETTINGS_FIELD_KEYS) {
    payload[key] = overrideFlags?.[key] ? (values?.[key] ?? null) : null;
  }
  return payload;
}

async function currentUserRowId() {
  const { data: auth } = await platformDb.auth.getUser();
  const authId = auth?.user?.id;
  if (!authId) return null;
  const { data } = await platformDb.from('users').select('id').eq('auth_user_id', authId).maybeSingle();
  return data?.id || null;
}

/** TRUE if the current user is PMO Admin/System Admin, or owns the account. */
export async function userHasPmoOrOwner(accountId) {
  const uid = await currentUserRowId();
  if (!uid || !accountId) return false;
  const { data: roles } = await platformDb
    .from('user_roles')
    .select('roles(role_name)')
    .eq('user_id', uid)
    .eq('is_active', true);
  const names = (roles || []).map((r) => r.roles?.role_name).filter(Boolean);
  if (names.includes('pmo_admin') || names.includes('system_admin')) return true;
  const { data: acct } = await platformDb.from('accounts').select('owner_user_id').eq('id', accountId).maybeSingle();
  return !!(acct?.owner_user_id && acct.owner_user_id === uid);
}

/** TRUE if the current user is this project's Project Manager, or PMO Admin/owner of its account. */
export async function userCanManageProjectTimesheetSettings(projectId, accountId) {
  const uid = await currentUserRowId();
  if (!uid) return false;
  const { data: project } = await platformDb.from('projects').select('project_manager_user_id').eq('id', projectId).maybeSingle();
  if (project?.project_manager_user_id === uid) return true;
  // Legacy projects.project_manager_user_id is only set for the single original "owning" PM.
  // A user assigned Project Manager (or Programme Manager) on this project via the project-scoped
  // role system (user_roles) must also qualify — this is how PM assignment actually works for
  // multi-role users. Do NOT use .single() here: a user can hold more than one active role on
  // the same project ("Multiple roles"), which would make .single() throw.
  const { data: roleAssignments } = await platformDb
    .from('user_roles')
    .select('roles(role_name)')
    .eq('user_id', uid)
    .eq('project_id', projectId)
    .eq('is_active', true)
    .eq('is_deleted', false);
  const roleNames = (roleAssignments || []).map((r) => r.roles?.role_name).filter(Boolean);
  if (roleNames.includes('project_manager') || roleNames.includes('programme_manager')) return true;
  return accountId ? userHasPmoOrOwner(accountId) : false;
}

export default {
  resolveTimesheetSettings,
  mergeTimesheetSettings,
  getOrganisationTimesheetSettings,
  upsertOrganisationTimesheetSettings,
  getProjectTimesheetSettings,
  upsertProjectTimesheetSettings,
  buildProjectTimesheetSettingsPayload,
  userHasPmoOrOwner,
  userCanManageProjectTimesheetSettings,
};
