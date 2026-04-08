/**
 * Configuration Baseline Procedures Service
 * API functions for managing baseline procedures
 */

import { platformDb } from './supabaseClient';

/**
 * Add baseline procedure
 * @param {string} cfgMsId - Configuration MS ID
 * @param {Object} procedureData - Procedure data
 * @returns {Promise<Object>} Created procedure
 */
export async function addBaselineProcedure(cfgMsId, procedureData) {
  try {
    // Get next display order
    const { data: existing } = await platformDb
      .from('cfg_baseline_procedures')
      .select('display_order')
      .eq('cfg_ms_id', cfgMsId)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0
      ? existing[0].display_order + 1
      : 0;

    const insertData = {
      ...procedureData,
      cfg_ms_id: cfgMsId,
      display_order: procedureData.display_order ?? nextOrder
    };

    const { data, error } = await platformDb
      .from('cfg_baseline_procedures')
      .insert(insertData)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding baseline procedure:', error);
    throw error;
  }
}

/**
 * Update baseline procedure
 * @param {string} procedureId - Procedure ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated procedure
 */
export async function updateBaselineProcedure(procedureId, updates) {
  try {
    const { data, error } = await platformDb
      .from('cfg_baseline_procedures')
      .update(updates)
      .eq('id', procedureId)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating baseline procedure:', error);
    throw error;
  }
}

/**
 * Delete baseline procedure
 * @param {string} procedureId - Procedure ID
 * @returns {Promise<boolean>} Success
 */
export async function deleteBaselineProcedure(procedureId) {
  try {
    const { error } = await platformDb
      .from('cfg_baseline_procedures')
      .delete()
      .eq('id', procedureId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting baseline procedure:', error);
    throw error;
  }
}

/**
 * Get baseline procedures for Configuration MS
 * @param {string} cfgMsId - Configuration MS ID
 * @returns {Promise<Array>} Baseline procedures
 */
export async function getBaselineProcedures(cfgMsId) {
  try {
    const { data, error } = await platformDb
      .from('cfg_baseline_procedures')
      .select('*')
      .eq('cfg_ms_id', cfgMsId)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching baseline procedures:', error);
    throw error;
  }
}

/**
 * Get baseline procedures by type
 * @param {string} cfgMsId - Configuration MS ID
 * @param {string} baselineType - Baseline type code
 * @returns {Promise<Array>} Baseline procedures
 */
export async function getBaselineProceduresByType(cfgMsId, baselineType) {
  try {
    const { data, error } = await platformDb
      .from('cfg_baseline_procedures')
      .select('*')
      .eq('cfg_ms_id', cfgMsId)
      .eq('baseline_type_code', baselineType)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching baseline procedures by type:', error);
    throw error;
  }
}
