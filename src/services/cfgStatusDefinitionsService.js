/**
 * Configuration Status Definitions Service
 * API functions for managing status definitions
 */

import { platformDb } from './supabaseClient';

/**
 * Add status definition
 * @param {string} cfgMsId - Configuration MS ID
 * @param {Object} statusData - Status data
 * @returns {Promise<Object>} Created status definition
 */
export async function addStatusDefinition(cfgMsId, statusData) {
  try {
    // Get next display order
    const { data: existing } = await platformDb
      .from('cfg_status_definitions')
      .select('display_order')
      .eq('cfg_ms_id', cfgMsId)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0
      ? existing[0].display_order + 1
      : 0;

    const insertData = {
      ...statusData,
      cfg_ms_id: cfgMsId,
      display_order: statusData.display_order ?? nextOrder
    };

    const { data, error } = await platformDb
      .from('cfg_status_definitions')
      .insert(insertData)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding status definition:', error);
    throw error;
  }
}

/**
 * Update status definition
 * @param {string} statusId - Status definition ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated status definition
 */
export async function updateStatusDefinition(statusId, updates) {
  try {
    const { data, error } = await platformDb
      .from('cfg_status_definitions')
      .update(updates)
      .eq('id', statusId)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating status definition:', error);
    throw error;
  }
}

/**
 * Delete status definition
 * @param {string} statusId - Status definition ID
 * @returns {Promise<boolean>} Success
 */
export async function deleteStatusDefinition(statusId) {
  try {
    const { error } = await platformDb
      .from('cfg_status_definitions')
      .delete()
      .eq('id', statusId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting status definition:', error);
    throw error;
  }
}

/**
 * Get status definitions for Configuration MS
 * @param {string} cfgMsId - Configuration MS ID
 * @returns {Promise<Array>} Status definitions
 */
export async function getStatusDefinitions(cfgMsId) {
  try {
    const { data, error } = await platformDb
      .from('cfg_status_definitions')
      .select('*')
      .eq('cfg_ms_id', cfgMsId)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching status definitions:', error);
    throw error;
  }
}

/**
 * Get status definitions by category
 * @param {string} cfgMsId - Configuration MS ID
 * @param {string} category - Status category
 * @returns {Promise<Array>} Status definitions
 */
export async function getStatusDefinitionsByCategory(cfgMsId, category) {
  try {
    const { data, error } = await platformDb
      .from('cfg_status_definitions')
      .select('*')
      .eq('cfg_ms_id', cfgMsId)
      .eq('status_category', category)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching status definitions by category:', error);
    throw error;
  }
}
