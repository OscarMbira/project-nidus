/**
 * RMS Tools & Techniques Service
 * API functions for managing risk management tools and techniques
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * Add tool or technique
 * @param {string} rmsId - RMS ID
 * @param {Object} toolData - Tool data
 * @returns {Promise<Object>} Created tool
 */
export async function addTool(rmsId, toolData) {
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
      .from('rms_tools_techniques')
      .select('display_order')
      .eq('rms_id', rmsId)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0
      ? existing[0].display_order + 1
      : 0;

    const insertData = {
      ...toolData,
      rms_id: rmsId,
      display_order: toolData.display_order ?? nextOrder,
      created_by: userData.id
    };

    const { data, error } = await platformDb
      .from('rms_tools_techniques')
      .insert(insertData)
      .select('*')
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error adding tool:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update tool or technique
 * @param {string} toolId - Tool ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated tool
 */
export async function updateTool(toolId, updates) {
  try {
    const { data, error } = await platformDb
      .from('rms_tools_techniques')
      .update(updates)
      .eq('id', toolId)
      .select('*')
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating tool:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete tool or technique
 * @param {string} toolId - Tool ID
 * @returns {Promise<Object>} Success result
 */
export async function deleteTool(toolId) {
  try {
    const { error } = await platformDb
      .from('rms_tools_techniques')
      .delete()
      .eq('id', toolId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting tool:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get tools for RMS
 * @param {string} rmsId - RMS ID
 * @returns {Promise<Object>} Tools list
 */
export async function getTools(rmsId) {
  try {
    const { data, error } = await platformDb
      .from('rms_tools_techniques')
      .select('*')
      .eq('rms_id', rmsId)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching tools:', error);
    return { success: false, error: error.message };
  }
}
