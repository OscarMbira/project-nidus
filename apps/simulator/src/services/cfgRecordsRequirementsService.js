/**
 * Configuration Records Requirements Service
 * API functions for managing records requirements
 */

import { platformDb } from './supabaseClient';

/**
 * Add record requirement
 * @param {string} cfgMsId - Configuration MS ID
 * @param {Object} recordData - Record data
 * @returns {Promise<Object>} Created record requirement
 */
export async function addRecordRequirement(cfgMsId, recordData) {
  try {
    // Get next display order
    const { data: existing } = await platformDb
      .from('cfg_records_requirements')
      .select('display_order')
      .eq('cfg_ms_id', cfgMsId)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0
      ? existing[0].display_order + 1
      : 0;

    const insertData = {
      ...recordData,
      cfg_ms_id: cfgMsId,
      display_order: recordData.display_order ?? nextOrder
    };

    const { data, error } = await platformDb
      .from('cfg_records_requirements')
      .insert(insertData)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding record requirement:', error);
    throw error;
  }
}

/**
 * Update record requirement
 * @param {string} recordId - Record requirement ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated record requirement
 */
export async function updateRecordRequirement(recordId, updates) {
  try {
    const { data, error } = await platformDb
      .from('cfg_records_requirements')
      .update(updates)
      .eq('id', recordId)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating record requirement:', error);
    throw error;
  }
}

/**
 * Delete record requirement
 * @param {string} recordId - Record requirement ID
 * @returns {Promise<boolean>} Success
 */
export async function deleteRecordRequirement(recordId) {
  try {
    const { error } = await platformDb
      .from('cfg_records_requirements')
      .delete()
      .eq('id', recordId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting record requirement:', error);
    throw error;
  }
}

/**
 * Get record requirements for Configuration MS
 * @param {string} cfgMsId - Configuration MS ID
 * @returns {Promise<Array>} Record requirements
 */
export async function getRecordRequirements(cfgMsId) {
  try {
    const { data, error } = await platformDb
      .from('cfg_records_requirements')
      .select('*')
      .eq('cfg_ms_id', cfgMsId)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching record requirements:', error);
    throw error;
  }
}

/**
 * Get mandatory records for Configuration MS
 * @param {string} cfgMsId - Configuration MS ID
 * @returns {Promise<Array>} Mandatory records
 */
export async function getMandatoryRecords(cfgMsId) {
  try {
    const { data, error } = await platformDb
      .from('cfg_records_requirements')
      .select('*')
      .eq('cfg_ms_id', cfgMsId)
      .eq('is_mandatory', true)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching mandatory records:', error);
    throw error;
  }
}
