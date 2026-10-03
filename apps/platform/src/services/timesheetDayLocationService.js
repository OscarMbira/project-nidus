/**
 * Timesheet Day Location Service (v1170)
 * One onsite/offshore flag per (project, user, day) — feeds the weekly grid's Onsite/Offshore
 * Days totals (a COUNT() over this table, not a stored number). timesheet_day_locations is a
 * per-user business record (unlike the reference-data lookup tables elsewhere in this feature),
 * so it has both a public and sim copy — Simulator's copy of this service points at simDb.
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * @param {string} projectId
 * @param {string} userId - auth user id
 * @param {string} weekStart - ISO date (inclusive)
 * @param {string} weekEnd - ISO date (inclusive)
 * @returns {Promise<Object>} { success, data } — data: [{ entry_date, work_location }]
 */
export async function getDayLocations(projectId, userId, weekStart, weekEnd) {
  try {
    const { data, error } = await platformDb
      .from('timesheet_day_locations')
      .select('entry_date, work_location')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .gte('entry_date', weekStart)
      .lte('entry_date', weekEnd);

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching day locations:', error);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * Upsert the onsite/offshore flag for one day.
 * @param {string} projectId
 * @param {string} userId - auth user id
 * @param {string} entryDate - ISO date
 * @param {'onsite'|'offshore'} workLocation
 */
export async function setDayLocation(projectId, userId, entryDate, workLocation) {
  try {
    const { data, error } = await platformDb
      .from('timesheet_day_locations')
      .upsert(
        { project_id: projectId, user_id: userId, entry_date: entryDate, work_location: workLocation },
        { onConflict: 'project_id,user_id,entry_date' }
      )
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error setting day location:', error);
    return { success: false, error: error.message, data: null };
  }
}

/**
 * All team members' day-location flags for a project/week in one query (Team Timesheets'
 * consolidated Weekly Grid tab — avoids one query per member).
 * @returns {Promise<Object>} { success, data } — data: [{ user_id, entry_date, work_location }]
 */
export async function getDayLocationsForProject(projectId, weekStart, weekEnd) {
  try {
    const { data, error } = await platformDb
      .from('timesheet_day_locations')
      .select('user_id, entry_date, work_location')
      .eq('project_id', projectId)
      .gte('entry_date', weekStart)
      .lte('entry_date', weekEnd);

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching project day locations:', error);
    return { success: false, error: error.message, data: [] };
  }
}

export default { getDayLocations, setDayLocation, getDayLocationsForProject };
