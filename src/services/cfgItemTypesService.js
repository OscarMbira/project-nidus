/**
 * Configuration Item Types Service
 * API functions for managing configuration item types/classifications
 */

import { platformDb } from './supabaseClient';

/**
 * Add configuration item type
 * @param {string} cfgMsId - Configuration MS ID
 * @param {Object} typeData - Item type data
 * @returns {Promise<Object>} Created item type
 */
export async function addItemType(cfgMsId, typeData) {
  try {
    // Get next display order
    const { data: existing } = await platformDb
      .from('cfg_item_types')
      .select('display_order')
      .eq('cfg_ms_id', cfgMsId)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0
      ? existing[0].display_order + 1
      : 0;

    const insertData = {
      ...typeData,
      cfg_ms_id: cfgMsId,
      display_order: typeData.display_order ?? nextOrder
    };

    const { data, error } = await platformDb
      .from('cfg_item_types')
      .insert(insertData)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding item type:', error);
    throw error;
  }
}

/**
 * Update configuration item type
 * @param {string} typeId - Item type ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated item type
 */
export async function updateItemType(typeId, updates) {
  try {
    const { data, error } = await platformDb
      .from('cfg_item_types')
      .update(updates)
      .eq('id', typeId)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating item type:', error);
    throw error;
  }
}

/**
 * Delete configuration item type
 * @param {string} typeId - Item type ID
 * @returns {Promise<boolean>} Success
 */
export async function deleteItemType(typeId) {
  try {
    const { error } = await platformDb
      .from('cfg_item_types')
      .delete()
      .eq('id', typeId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting item type:', error);
    throw error;
  }
}

/**
 * Get item types for Configuration MS
 * @param {string} cfgMsId - Configuration MS ID
 * @returns {Promise<Array>} Item types
 */
export async function getItemTypes(cfgMsId) {
  try {
    const { data, error } = await platformDb
      .from('cfg_item_types')
      .select('*')
      .eq('cfg_ms_id', cfgMsId)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching item types:', error);
    throw error;
  }
}

/**
 * Get item types by classification level
 * @param {string} cfgMsId - Configuration MS ID
 * @param {string} classification - Classification level
 * @returns {Promise<Array>} Item types
 */
export async function getItemTypesByClassification(cfgMsId, classification) {
  try {
    const { data, error } = await platformDb
      .from('cfg_item_types')
      .select('*')
      .eq('cfg_ms_id', cfgMsId)
      .eq('classification_level', classification)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching item types by classification:', error);
    throw error;
  }
}
