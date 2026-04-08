/**
 * Configuration Tools and Technologies Service
 * API functions for managing configuration management tools
 */

import { platformDb } from './supabaseClient';

/**
 * Add tool
 * @param {string} cfgMsId - Configuration MS ID
 * @param {Object} toolData - Tool data
 * @returns {Promise<Object>} Created tool
 */
export async function addTool(cfgMsId, toolData) {
  try {
    // Get next display order
    const { data: existing } = await platformDb
      .from('cfg_tools_technologies')
      .select('display_order')
      .eq('cfg_ms_id', cfgMsId)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0
      ? existing[0].display_order + 1
      : 0;

    const insertData = {
      ...toolData,
      cfg_ms_id: cfgMsId,
      display_order: toolData.display_order ?? nextOrder
    };

    const { data, error } = await platformDb
      .from('cfg_tools_technologies')
      .insert(insertData)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding tool:', error);
    throw error;
  }
}

/**
 * Update tool
 * @param {string} toolId - Tool ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated tool
 */
export async function updateTool(toolId, updates) {
  try {
    const { data, error } = await platformDb
      .from('cfg_tools_technologies')
      .update(updates)
      .eq('id', toolId)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating tool:', error);
    throw error;
  }
}

/**
 * Delete tool
 * @param {string} toolId - Tool ID
 * @returns {Promise<boolean>} Success
 */
export async function deleteTool(toolId) {
  try {
    const { error } = await platformDb
      .from('cfg_tools_technologies')
      .delete()
      .eq('id', toolId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting tool:', error);
    throw error;
  }
}

/**
 * Get tools for Configuration MS
 * @param {string} cfgMsId - Configuration MS ID
 * @returns {Promise<Array>} Tools
 */
export async function getTools(cfgMsId) {
  try {
    const { data, error } = await platformDb
      .from('cfg_tools_technologies')
      .select('*')
      .eq('cfg_ms_id', cfgMsId)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching tools:', error);
    throw error;
  }
}

/**
 * Get preferred tools for Configuration MS
 * @param {string} cfgMsId - Configuration MS ID
 * @returns {Promise<Array>} Preferred tools
 */
export async function getPreferredTools(cfgMsId) {
  try {
    const { data, error } = await platformDb
      .from('cfg_tools_technologies')
      .select('*')
      .eq('cfg_ms_id', cfgMsId)
      .eq('is_preferred', true)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching preferred tools:', error);
    throw error;
  }
}
