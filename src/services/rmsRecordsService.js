/**
 * RMS Records Service
 * API functions for managing risk records definition
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * Add record definition
 * @param {string} rmsId - RMS ID
 * @param {Object} recordData - Record data
 * @returns {Promise<Object>} Created record
 */
export async function addRecord(rmsId, recordData) {
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
      .from('rms_records')
      .select('display_order')
      .eq('rms_id', rmsId)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0
      ? existing[0].display_order + 1
      : 0;

    const insertData = {
      ...recordData,
      rms_id: rmsId,
      display_order: recordData.display_order ?? nextOrder,
      created_by: userData.id
    };

    const { data, error } = await platformDb
      .from('rms_records')
      .insert(insertData)
      .select('*')
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error adding record:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update record definition
 * @param {string} recordId - Record ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated record
 */
export async function updateRecord(recordId, updates) {
  try {
    const { data, error } = await platformDb
      .from('rms_records')
      .update(updates)
      .eq('id', recordId)
      .select('*')
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating record:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete record definition
 * @param {string} recordId - Record ID
 * @returns {Promise<Object>} Success result
 */
export async function deleteRecord(recordId) {
  try {
    const { error } = await platformDb
      .from('rms_records')
      .delete()
      .eq('id', recordId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting record:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get records for RMS
 * @param {string} rmsId - RMS ID
 * @returns {Promise<Object>} Records list
 */
export async function getRecords(rmsId) {
  try {
    const { data, error } = await platformDb
      .from('rms_records')
      .select('*')
      .eq('rms_id', rmsId)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching records:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get mandatory records for RMS
 * @param {string} rmsId - RMS ID
 * @returns {Promise<Object>} Mandatory records list
 */
export async function getMandatoryRecords(rmsId) {
  try {
    const { data, error } = await platformDb
      .from('rms_records')
      .select('*')
      .eq('rms_id', rmsId)
      .eq('is_mandatory', true)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching mandatory records:', error);
    return { success: false, error: error.message };
  }
}
