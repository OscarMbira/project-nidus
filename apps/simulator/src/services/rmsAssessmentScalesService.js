/**
 * RMS Assessment Scales Service
 * API functions for managing risk assessment scales
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * Add assessment scale
 * @param {string} rmsId - RMS ID
 * @param {Object} scaleData - Scale data
 * @returns {Promise<Object>} Created scale
 */
export async function addScale(rmsId, scaleData) {
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
      .from('rms_assessment_scales')
      .select('display_order')
      .eq('rms_id', rmsId)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0
      ? existing[0].display_order + 1
      : 0;

    const insertData = {
      ...scaleData,
      rms_id: rmsId,
      display_order: scaleData.display_order ?? nextOrder,
      created_by: userData.id
    };

    const { data, error } = await platformDb
      .from('rms_assessment_scales')
      .insert(insertData)
      .select('*')
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error adding assessment scale:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update assessment scale
 * @param {string} scaleId - Scale ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated scale
 */
export async function updateScale(scaleId, updates) {
  try {
    const { data, error } = await platformDb
      .from('rms_assessment_scales')
      .update(updates)
      .eq('id', scaleId)
      .select('*')
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating assessment scale:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete assessment scale
 * @param {string} scaleId - Scale ID
 * @returns {Promise<Object>} Success result
 */
export async function deleteScale(scaleId) {
  try {
    const { error } = await platformDb
      .from('rms_assessment_scales')
      .delete()
      .eq('id', scaleId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting assessment scale:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get scales for RMS
 * @param {string} rmsId - RMS ID
 * @returns {Promise<Object>} Scales list
 */
export async function getScales(rmsId) {
  try {
    const { data, error } = await platformDb
      .from('rms_assessment_scales')
      .select('*')
      .eq('rms_id', rmsId)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching assessment scales:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get default scales for RMS
 * @param {string} rmsId - RMS ID
 * @returns {Promise<Object>} Default scales list
 */
export async function getDefaultScales(rmsId) {
  try {
    const { data, error } = await platformDb
      .from('rms_assessment_scales')
      .select('*')
      .eq('rms_id', rmsId)
      .eq('is_default', true)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching default scales:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Apply scales to Risk Register
 * @param {string} rmsId - RMS ID
 * @param {string} riskRegisterId - Risk Register ID
 * @returns {Promise<Object>} Success result
 */
export async function applyScalesToRegister(rmsId, riskRegisterId) {
  try {
    // This uses the database function
    const { error } = await platformDb.rpc('apply_rms_to_risk_register', {
      p_rms_id: rmsId,
      p_risk_register_id: riskRegisterId
    });

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error applying scales to register:', error);
    return { success: false, error: error.message };
  }
}
