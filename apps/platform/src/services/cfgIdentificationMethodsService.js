/**
 * Configuration Identification Methods Service
 * API functions for managing identification methods
 */

import { platformDb } from './supabaseClient';

/**
 * Add identification method
 * @param {string} cfgMsId - Configuration MS ID
 * @param {Object} methodData - Method data
 * @returns {Promise<Object>} Created method
 */
export async function addIdentificationMethod(cfgMsId, methodData) {
  try {
    // If setting as default, unset other defaults first
    if (methodData.is_default) {
      await platformDb
        .from('cfg_identification_methods')
        .update({ is_default: false })
        .eq('cfg_ms_id', cfgMsId)
        .eq('is_default', true);
    }

    // Get next display order
    const { data: existing } = await platformDb
      .from('cfg_identification_methods')
      .select('display_order')
      .eq('cfg_ms_id', cfgMsId)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0
      ? existing[0].display_order + 1
      : 0;

    const insertData = {
      ...methodData,
      cfg_ms_id: cfgMsId,
      display_order: methodData.display_order ?? nextOrder
    };

    const { data, error } = await platformDb
      .from('cfg_identification_methods')
      .insert(insertData)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding identification method:', error);
    throw error;
  }
}

/**
 * Update identification method
 * @param {string} methodId - Method ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated method
 */
export async function updateIdentificationMethod(methodId, updates) {
  try {
    // If setting as default, unset other defaults first
    if (updates.is_default) {
      const { data: method } = await platformDb
        .from('cfg_identification_methods')
        .select('cfg_ms_id')
        .eq('id', methodId)
        .single();

      if (method) {
        await platformDb
          .from('cfg_identification_methods')
          .update({ is_default: false })
          .eq('cfg_ms_id', method.cfg_ms_id)
          .eq('is_default', true)
          .neq('id', methodId);
      }
    }

    const { data, error } = await platformDb
      .from('cfg_identification_methods')
      .update(updates)
      .eq('id', methodId)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating identification method:', error);
    throw error;
  }
}

/**
 * Delete identification method
 * @param {string} methodId - Method ID
 * @returns {Promise<boolean>} Success
 */
export async function deleteIdentificationMethod(methodId) {
  try {
    const { error } = await platformDb
      .from('cfg_identification_methods')
      .delete()
      .eq('id', methodId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting identification method:', error);
    throw error;
  }
}

/**
 * Get identification methods for Configuration MS
 * @param {string} cfgMsId - Configuration MS ID
 * @returns {Promise<Array>} Identification methods
 */
export async function getIdentificationMethods(cfgMsId) {
  try {
    const { data, error } = await platformDb
      .from('cfg_identification_methods')
      .select('*')
      .eq('cfg_ms_id', cfgMsId)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching identification methods:', error);
    throw error;
  }
}

/**
 * Get default identification method
 * @param {string} cfgMsId - Configuration MS ID
 * @returns {Promise<Object|null>} Default method
 */
export async function getDefaultIdentificationMethod(cfgMsId) {
  try {
    const { data, error } = await platformDb
      .from('cfg_identification_methods')
      .select('*')
      .eq('cfg_ms_id', cfgMsId)
      .eq('is_default', true)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching default identification method:', error);
    throw error;
  }
}
