/**
 * RMS Response Strategies Service
 * API functions for managing risk response strategies
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * Add response strategy
 * @param {string} rmsId - RMS ID
 * @param {Object} strategyData - Strategy data
 * @returns {Promise<Object>} Created strategy
 */
export async function addStrategy(rmsId, strategyData) {
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
      .from('rms_response_strategies')
      .select('display_order')
      .eq('rms_id', rmsId)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0
      ? existing[0].display_order + 1
      : 0;

    const insertData = {
      ...strategyData,
      rms_id: rmsId,
      display_order: strategyData.display_order ?? nextOrder,
      created_by: userData.id
    };

    const { data, error } = await platformDb
      .from('rms_response_strategies')
      .insert(insertData)
      .select('*')
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error adding response strategy:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update response strategy
 * @param {string} strategyId - Strategy ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated strategy
 */
export async function updateStrategy(strategyId, updates) {
  try {
    const { data, error } = await platformDb
      .from('rms_response_strategies')
      .update(updates)
      .eq('id', strategyId)
      .select('*')
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating response strategy:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete response strategy
 * @param {string} strategyId - Strategy ID
 * @returns {Promise<Object>} Success result
 */
export async function deleteStrategy(strategyId) {
  try {
    const { error } = await platformDb
      .from('rms_response_strategies')
      .delete()
      .eq('id', strategyId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting response strategy:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get strategies for RMS
 * @param {string} rmsId - RMS ID
 * @returns {Promise<Object>} Strategies list
 */
export async function getStrategies(rmsId) {
  try {
    const { data, error } = await platformDb
      .from('rms_response_strategies')
      .select('*')
      .eq('rms_id', rmsId)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching response strategies:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get strategies by risk type
 * @param {string} rmsId - RMS ID
 * @param {string} riskType - Risk type ('threat', 'opportunity', 'both')
 * @returns {Promise<Object>} Strategies list
 */
export async function getStrategiesByType(rmsId, riskType) {
  try {
    const { data, error } = await platformDb
      .from('rms_response_strategies')
      .select('*')
      .eq('rms_id', rmsId)
      .or(`applicable_to.eq.${riskType},applicable_to.eq.both`)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching strategies by type:', error);
    return { success: false, error: error.message };
  }
}
