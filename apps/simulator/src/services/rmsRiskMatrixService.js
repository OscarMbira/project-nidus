/**
 * RMS Risk Matrix Service
 * API functions for managing risk matrix configuration
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * Add risk matrix
 * @param {string} rmsId - RMS ID
 * @param {Object} matrixData - Matrix data
 * @returns {Promise<Object>} Created matrix
 */
export async function addMatrix(rmsId, matrixData) {
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
      .from('rms_risk_matrix')
      .select('display_order')
      .eq('rms_id', rmsId)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0
      ? existing[0].display_order + 1
      : 0;

    const insertData = {
      ...matrixData,
      rms_id: rmsId,
      display_order: matrixData.display_order ?? nextOrder,
      created_by: userData.id
    };

    const { data, error } = await platformDb
      .from('rms_risk_matrix')
      .insert(insertData)
      .select('*')
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error adding risk matrix:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update risk matrix
 * @param {string} matrixId - Matrix ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated matrix
 */
export async function updateMatrix(matrixId, updates) {
  try {
    const { data, error } = await platformDb
      .from('rms_risk_matrix')
      .update(updates)
      .eq('id', matrixId)
      .select('*')
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating risk matrix:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete risk matrix
 * @param {string} matrixId - Matrix ID
 * @returns {Promise<Object>} Success result
 */
export async function deleteMatrix(matrixId) {
  try {
    const { error } = await platformDb
      .from('rms_risk_matrix')
      .delete()
      .eq('id', matrixId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting risk matrix:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get matrices for RMS
 * @param {string} rmsId - RMS ID
 * @returns {Promise<Object>} Matrices list
 */
export async function getMatrices(rmsId) {
  try {
    const { data, error } = await platformDb
      .from('rms_risk_matrix')
      .select('*')
      .eq('rms_id', rmsId)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching risk matrices:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get default matrix for RMS
 * @param {string} rmsId - RMS ID
 * @returns {Promise<Object>} Default matrix
 */
export async function getDefaultMatrix(rmsId) {
  try {
    const { data, error } = await platformDb
      .from('rms_risk_matrix')
      .select('*')
      .eq('rms_id', rmsId)
      .eq('is_default', true)
      .order('display_order', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching default matrix:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Apply matrix to Risk Register
 * @param {string} rmsId - RMS ID
 * @param {string} riskRegisterId - Risk Register ID
 * @returns {Promise<Object>} Success result
 */
export async function applyMatrixToRegister(rmsId, riskRegisterId) {
  try {
    // This uses the database function
    const { error } = await platformDb.rpc('apply_rms_to_risk_register', {
      p_rms_id: rmsId,
      p_risk_register_id: riskRegisterId
    });

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error applying matrix to register:', error);
    return { success: false, error: error.message };
  }
}
