/**
 * RMS Scheduled Activities Service
 * API functions for managing scheduled risk activities
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * Add scheduled activity
 * @param {string} rmsId - RMS ID
 * @param {Object} activityData - Activity data
 * @returns {Promise<Object>} Created activity
 */
export async function addActivity(rmsId, activityData) {
  try {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: userData, error: userError } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (userError || !userData) {
      return { success: false, error: 'User not found' };
    }

    // Get next display order
    const { data: existing } = await platformDb
      .from('rms_scheduled_activities')
      .select('display_order')
      .eq('rms_id', rmsId)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0
      ? existing[0].display_order + 1
      : 0;

    const insertData = {
      ...activityData,
      rms_id: rmsId,
      display_order: activityData.display_order ?? nextOrder,
      created_by: userData.id
    };

    const { data, error } = await platformDb
      .from('rms_scheduled_activities')
      .insert(insertData)
      .select('*')
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error adding activity:', error);
    return { success: false, error: error.message };
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
      .from('rms_scheduled_activities')
      .update(updates)
      .eq('id', activityId)
      .select('*')
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating activity:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete scheduled activity
 * @param {string} activityId - Activity ID
 * @returns {Promise<Object>} Success result
 */
export async function deleteActivity(activityId) {
  try {
    const { error } = await platformDb
      .from('rms_scheduled_activities')
      .delete()
      .eq('id', activityId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting activity:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get activities for RMS
 * @param {string} rmsId - RMS ID
 * @returns {Promise<Object>} Activities list
 */
export async function getActivities(rmsId) {
  try {
    const { data, error } = await platformDb
      .from('rms_scheduled_activities')
      .select('*')
      .eq('rms_id', rmsId)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching activities:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get scheduled activities for a project
 * @param {string} projectId - Project ID
 * @param {Date} dateFrom - Start date (optional)
 * @param {Date} dateTo - End date (optional)
 * @returns {Promise<Object>} Scheduled activities
 */
export async function getScheduledActivities(projectId, dateFrom = null, dateTo = null) {
  try {
    const { data, error } = await platformDb.rpc('get_scheduled_risk_activities', {
      p_project_id: projectId,
      p_date_from: dateFrom ? dateFrom.toISOString().split('T')[0] : null,
      p_date_to: dateTo ? dateTo.toISOString().split('T')[0] : null
    });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching scheduled activities:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get upcoming activities for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Upcoming activities
 */
export async function getUpcomingActivities(projectId) {
  try {
    const today = new Date();
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(today.getMonth() + 6);

    return await getScheduledActivities(projectId, today, sixMonthsFromNow);
  } catch (error) {
    console.error('Error fetching upcoming activities:', error);
    return { success: false, error: error.message };
  }
}
