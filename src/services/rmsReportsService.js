/**
 * RMS Reports Service
 * API functions for managing risk reports definition
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * Add report definition
 * @param {string} rmsId - RMS ID
 * @param {Object} reportData - Report data
 * @returns {Promise<Object>} Created report
 */
export async function addReport(rmsId, reportData) {
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
      .from('rms_reports')
      .select('display_order')
      .eq('rms_id', rmsId)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0
      ? existing[0].display_order + 1
      : 0;

    const insertData = {
      ...reportData,
      rms_id: rmsId,
      display_order: reportData.display_order ?? nextOrder,
      created_by: userData.id
    };

    const { data, error } = await platformDb
      .from('rms_reports')
      .insert(insertData)
      .select('*')
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error adding report:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update report definition
 * @param {string} reportId - Report ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated report
 */
export async function updateReport(reportId, updates) {
  try {
    const { data, error } = await platformDb
      .from('rms_reports')
      .update(updates)
      .eq('id', reportId)
      .select('*')
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating report:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete report definition
 * @param {string} reportId - Report ID
 * @returns {Promise<Object>} Success result
 */
export async function deleteReport(reportId) {
  try {
    const { error } = await platformDb
      .from('rms_reports')
      .delete()
      .eq('id', reportId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting report:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get reports for RMS
 * @param {string} rmsId - RMS ID
 * @returns {Promise<Object>} Reports list
 */
export async function getReports(rmsId) {
  try {
    const { data, error } = await platformDb
      .from('rms_reports')
      .select('*')
      .eq('rms_id', rmsId)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching reports:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get reports by frequency
 * @param {string} rmsId - RMS ID
 * @param {string} frequency - Report frequency
 * @returns {Promise<Object>} Reports list
 */
export async function getReportsByFrequency(rmsId, frequency) {
  try {
    const { data, error } = await platformDb
      .from('rms_reports')
      .select('*')
      .eq('rms_id', rmsId)
      .eq('frequency', frequency)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching reports by frequency:', error);
    return { success: false, error: error.message };
  }
}
