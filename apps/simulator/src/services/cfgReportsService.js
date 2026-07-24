/**
 * Configuration Reports Service
 * API functions for managing configuration reports
 */

import { platformDb } from './supabaseClient';

/**
 * Add report
 * @param {string} cfgMsId - Configuration MS ID
 * @param {Object} reportData - Report data
 * @returns {Promise<Object>} Created report
 */
export async function addReport(cfgMsId, reportData) {
  try {
    // Get next display order
    const { data: existing } = await platformDb
      .from('cfg_reports')
      .select('display_order')
      .eq('cfg_ms_id', cfgMsId)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0
      ? existing[0].display_order + 1
      : 0;

    const insertData = {
      ...reportData,
      cfg_ms_id: cfgMsId,
      display_order: reportData.display_order ?? nextOrder
    };

    const { data, error } = await platformDb
      .from('cfg_reports')
      .insert(insertData)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding report:', error);
    throw error;
  }
}

/**
 * Update report
 * @param {string} reportId - Report ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated report
 */
export async function updateReport(reportId, updates) {
  try {
    const { data, error } = await platformDb
      .from('cfg_reports')
      .update(updates)
      .eq('id', reportId)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating report:', error);
    throw error;
  }
}

/**
 * Delete report
 * @param {string} reportId - Report ID
 * @returns {Promise<boolean>} Success
 */
export async function deleteReport(reportId) {
  try {
    const { error } = await platformDb
      .from('cfg_reports')
      .delete()
      .eq('id', reportId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting report:', error);
    throw error;
  }
}

/**
 * Get reports for Configuration MS
 * @param {string} cfgMsId - Configuration MS ID
 * @returns {Promise<Array>} Reports
 */
export async function getReports(cfgMsId) {
  try {
    const { data, error } = await platformDb
      .from('cfg_reports')
      .select('*')
      .eq('cfg_ms_id', cfgMsId)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching reports:', error);
    throw error;
  }
}

/**
 * Get reports by frequency
 * @param {string} cfgMsId - Configuration MS ID
 * @param {string} frequency - Report frequency
 * @returns {Promise<Array>} Reports
 */
export async function getReportsByFrequency(cfgMsId, frequency) {
  try {
    const { data, error } = await platformDb
      .from('cfg_reports')
      .select('*')
      .eq('cfg_ms_id', cfgMsId)
      .eq('frequency', frequency)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching reports by frequency:', error);
    throw error;
  }
}
