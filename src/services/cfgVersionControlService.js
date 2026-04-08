/**
 * Configuration Version Control Procedures Service
 * API functions for managing version control procedures
 */

import { platformDb } from './supabaseClient';

/**
 * Add version control procedure
 * @param {string} cfgMsId - Configuration MS ID
 * @param {Object} procedureData - Procedure data
 * @returns {Promise<Object>} Created procedure
 */
export async function addVersionProcedure(cfgMsId, procedureData) {
  try {
    // Get next display order
    const { data: existing } = await platformDb
      .from('cfg_version_control_procedures')
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
      .from('cfg_version_control_procedures')
      .insert(insertData)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding version procedure:', error);
    throw error;
  }
}

/**
 * Update version control procedure
 * @param {string} procedureId - Procedure ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated procedure
 */
export async function updateVersionProcedure(procedureId, updates) {
  try {
    const { data, error } = await platformDb
      .from('cfg_version_control_procedures')
      .update(updates)
      .eq('id', procedureId)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating version procedure:', error);
    throw error;
  }
}

/**
 * Delete version control procedure
 * @param {string} procedureId - Procedure ID
 * @returns {Promise<boolean>} Success
 */
export async function deleteVersionProcedure(procedureId) {
  try {
    const { error } = await platformDb
      .from('cfg_version_control_procedures')
      .delete()
      .eq('id', procedureId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting version procedure:', error);
    throw error;
  }
}

/**
 * Get version control procedures for Configuration MS
 * @param {string} cfgMsId - Configuration MS ID
 * @returns {Promise<Array>} Version control procedures
 */
export async function getVersionProcedures(cfgMsId) {
  try {
    const { data, error } = await platformDb
      .from('cfg_version_control_procedures')
      .select('*')
      .eq('cfg_ms_id', cfgMsId)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching version procedures:', error);
    throw error;
  }
}
