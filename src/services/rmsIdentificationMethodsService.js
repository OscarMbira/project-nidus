/**
 * RMS Identification Methods Service
 * API functions for managing risk identification methods
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * Add identification method
 * @param {string} rmsId - RMS ID
 * @param {Object} methodData - Method data
 * @returns {Promise<Object>} Created method
 */
export async function addMethod(rmsId, methodData) {
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
      .from('rms_identification_methods')
      .select('display_order')
      .eq('rms_id', rmsId)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0
      ? existing[0].display_order + 1
      : 0;

    const insertData = {
      ...methodData,
      rms_id: rmsId,
      display_order: methodData.display_order ?? nextOrder,
      created_by: userData.id
    };

    const { data, error } = await platformDb
      .from('rms_identification_methods')
      .insert(insertData)
      .select('*')
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error adding identification method:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update identification method
 * @param {string} methodId - Method ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated method
 */
export async function updateMethod(methodId, updates) {
  try {
    const { data, error } = await platformDb
      .from('rms_identification_methods')
      .update(updates)
      .eq('id', methodId)
      .select('*')
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating identification method:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete identification method
 * @param {string} methodId - Method ID
 * @returns {Promise<Object>} Success result
 */
export async function deleteMethod(methodId) {
  try {
    const { error } = await platformDb
      .from('rms_identification_methods')
      .delete()
      .eq('id', methodId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting identification method:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get methods for RMS
 * @param {string} rmsId - RMS ID
 * @returns {Promise<Object>} Methods list
 */
export async function getMethods(rmsId) {
  try {
    const { data, error } = await platformDb
      .from('rms_identification_methods')
      .select('*')
      .eq('rms_id', rmsId)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching identification methods:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get mandatory methods for RMS
 * @param {string} rmsId - RMS ID
 * @returns {Promise<Object>} Mandatory methods list
 */
export async function getMandatoryMethods(rmsId) {
  try {
    const { data, error } = await platformDb
      .from('rms_identification_methods')
      .select('*')
      .eq('rms_id', rmsId)
      .eq('is_mandatory', true)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching mandatory methods:', error);
    return { success: false, error: error.message };
  }
}
