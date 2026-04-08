/**
 * Configuration Scheduled Activities Service
 * API functions for managing scheduled configuration activities
 */

import { platformDb } from './supabaseClient';

/**
 * Add scheduled activity
 * @param {string} cfgMsId - Configuration MS ID
 * @param {Object} activityData - Activity data
 * @returns {Promise<Object>} Created activity
 */
export async function addActivity(cfgMsId, activityData) {
  try {
    // Get next display order
    const { data: existing } = await platformDb
      .from('cfg_scheduled_activities')
      .select('display_order')
      .eq('cfg_ms_id', cfgMsId)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0
      ? existing[0].display_order + 1
      : 0;

    const insertData = {
      ...activityData,
      cfg_ms_id: cfgMsId,
      display_order: activityData.display_order ?? nextOrder
    };

    const { data, error } = await platformDb
      .from('cfg_scheduled_activities')
      .insert(insertData)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding activity:', error);
    throw error;
  }
}

/**
 * Update scheduled activity
 * @param {string} activityId - Activity ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated activity
 */
export async function updateActivity(activityId, updates) {
  try {
    const { data, error } = await platformDb
      .from('cfg_scheduled_activities')
      .update(updates)
      .eq('id', activityId)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating activity:', error);
    throw error;
  }
}

/**
 * Delete scheduled activity
 * @param {string} activityId - Activity ID
 * @returns {Promise<boolean>} Success
 */
export async function deleteActivity(activityId) {
  try {
    const { error } = await platformDb
      .from('cfg_scheduled_activities')
      .delete()
      .eq('id', activityId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting activity:', error);
    throw error;
  }
}

/**
 * Get scheduled activities for Configuration MS
 * @param {string} cfgMsId - Configuration MS ID
 * @returns {Promise<Array>} Scheduled activities
 */
export async function getActivities(cfgMsId) {
  try {
    const { data, error } = await platformDb
      .from('cfg_scheduled_activities')
      .select('*')
      .eq('cfg_ms_id', cfgMsId)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching activities:', error);
    throw error;
  }
}

/**
 * Get upcoming activities for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Array>} Upcoming activities
 */
export async function getUpcomingActivities(projectId) {
  try {
    const { data, error } = await platformDb.rpc('get_scheduled_configuration_activities', {
      p_project_id: projectId,
      p_date_from: new Date().toISOString().split('T')[0],
      p_date_to: null
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching upcoming activities:', error);
    throw error;
  }
}
