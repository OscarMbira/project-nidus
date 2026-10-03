/**
 * Timesheet Overview Report Service (v1173)
 * Role-tiered: PMO Admin/Account Owner see every project in the organisation aggregated;
 * Project Manager/Team Manager see the same shape scoped to their own project(s). One query
 * shape serves both — the caller decides which project ids to pass in.
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * @param {string} accountId
 * @param {string} weekStart - ISO date (inclusive)
 * @param {string} weekEnd - ISO date (inclusive)
 * @param {string[]|null} [projectIds] - restrict to these projects; omit for every project in the account
 * @returns {Promise<{ success: boolean, data: { byProject: Array, byPerson: Array, totals: Object }, error: string|null }>}
 */
export async function getTimesheetOverview(accountId, weekStart, weekEnd, projectIds = null) {
  try {
    let projectQuery = platformDb
      .from('projects')
      .select('id, project_name, project_code')
      .eq('account_id', accountId)
      .eq('is_deleted', false);
    if (projectIds) projectQuery = projectQuery.in('id', projectIds);
    const { data: projects, error: projectsError } = await projectQuery;
    if (projectsError) throw projectsError;

    const scopedProjectIds = (projects || []).map((p) => p.id);
    if (scopedProjectIds.length === 0) {
      return { success: true, data: { byProject: [], byPerson: [], totals: emptyTotals() }, error: null };
    }

    const [{ data: entries, error: entriesError }, { data: locations, error: locationsError }] = await Promise.all([
      platformDb
        .from('timesheet_entries')
        .select('project_id, user_id, hours_worked, is_overtime, status, entry_date')
        .in('project_id', scopedProjectIds)
        .eq('is_deleted', false)
        .gte('entry_date', weekStart)
        .lte('entry_date', weekEnd),
      platformDb
        .from('timesheet_day_locations')
        .select('project_id, user_id, work_location')
        .in('project_id', scopedProjectIds)
        .gte('entry_date', weekStart)
        .lte('entry_date', weekEnd),
    ]);
    if (entriesError) throw entriesError;
    if (locationsError) throw locationsError;

    const userIds = [...new Set((entries || []).map((e) => e.user_id).filter(Boolean))];
    let userNames = {};
    if (userIds.length > 0) {
      const { data: users } = await platformDb.from('users').select('auth_user_id, full_name, email').in('auth_user_id', userIds);
      userNames = Object.fromEntries((users || []).map((u) => [u.auth_user_id, u.full_name || u.email || 'Unknown']));
    }

    const projectNameById = Object.fromEntries((projects || []).map((p) => [p.id, p.project_code ? `${p.project_code} — ${p.project_name}` : p.project_name]));

    const byProject = aggregate(entries, locations, scopedProjectIds, 'project_id', projectNameById);
    const byPerson = aggregate(entries, locations, userIds, 'user_id', userNames);
    const totals = (entries || []).reduce((acc, e) => {
      const hours = parseFloat(e.hours_worked) || 0;
      acc.totalHours += hours;
      if (e.is_overtime) acc.overtimeHours += hours;
      return acc;
    }, emptyTotals());
    totals.onsiteDays = (locations || []).filter((l) => l.work_location === 'onsite').length;
    totals.offshoreDays = (locations || []).filter((l) => l.work_location === 'offshore').length;
    totals.projectCount = scopedProjectIds.length;
    totals.personCount = userIds.length;

    return { success: true, data: { byProject, byPerson, totals }, error: null };
  } catch (error) {
    console.error('Error building timesheet overview:', error);
    return { success: false, data: { byProject: [], byPerson: [], totals: emptyTotals() }, error: error.message };
  }
}

function emptyTotals() {
  return { totalHours: 0, overtimeHours: 0, onsiteDays: 0, offshoreDays: 0, projectCount: 0, personCount: 0 };
}

function aggregate(entries, locations, ids, groupKey, labelMap) {
  const rows = ids.map((id) => ({
    id,
    label: labelMap[id] || id,
    totalHours: 0,
    overtimeHours: 0,
    pendingCount: 0,
    onsiteDays: 0,
    offshoreDays: 0,
  }));
  const byId = Object.fromEntries(rows.map((r) => [r.id, r]));

  for (const e of entries || []) {
    const row = byId[e[groupKey]];
    if (!row) continue;
    const hours = parseFloat(e.hours_worked) || 0;
    row.totalHours += hours;
    if (e.is_overtime) row.overtimeHours += hours;
    if (e.status === 'submitted') row.pendingCount += 1;
  }
  for (const l of locations || []) {
    const row = byId[l[groupKey]];
    if (!row) continue;
    if (l.work_location === 'onsite') row.onsiteDays += 1;
    else if (l.work_location === 'offshore') row.offshoreDays += 1;
  }

  return rows
    .filter((r) => r.totalHours > 0 || r.onsiteDays > 0 || r.offshoreDays > 0)
    .sort((a, b) => b.totalHours - a.totalHours);
}

export default { getTimesheetOverview };
