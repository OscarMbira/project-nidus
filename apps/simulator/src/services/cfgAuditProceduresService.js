/**
 * Configuration Audit Procedures Service
 * API functions for managing audit procedures
 */

import { platformDb } from './supabaseClient';

/**
 * Add audit procedure
 * @param {string} cfgMsId - Configuration MS ID
 * @param {Object} procedureData - Procedure data
 * @returns {Promise<Object>} Created procedure
 */
export async function addAuditProcedure(cfgMsId, procedureData) {
  try {
    // Get next display order
    const { data: existing } = await platformDb
      .from('cfg_audit_procedures')
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
      .from('cfg_audit_procedures')
      .insert(insertData)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding audit procedure:', error);
    throw error;
  }
}

/**
 * Update audit procedure
 * @param {string} procedureId - Procedure ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated procedure
 */
export async function updateAuditProcedure(procedureId, updates) {
  try {
    const { data, error } = await platformDb
      .from('cfg_audit_procedures')
      .update(updates)
      .eq('id', procedureId)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating audit procedure:', error);
    throw error;
  }
}

/**
 * Delete audit procedure
 * @param {string} procedureId - Procedure ID
 * @returns {Promise<boolean>} Success
 */
export async function deleteAuditProcedure(procedureId) {
  try {
    const { error } = await platformDb
      .from('cfg_audit_procedures')
      .delete()
      .eq('id', procedureId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting audit procedure:', error);
    throw error;
  }
}

/**
 * Get audit procedures for Configuration MS
 * @param {string} cfgMsId - Configuration MS ID
 * @returns {Promise<Array>} Audit procedures
 */
export async function getAuditProcedures(cfgMsId) {
  try {
    const { data, error } = await platformDb
      .from('cfg_audit_procedures')
      .select('*')
      .eq('cfg_ms_id', cfgMsId)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching audit procedures:', error);
    throw error;
  }
}

/**
 * Get audit procedures by type
 * @param {string} cfgMsId - Configuration MS ID
 * @param {string} auditType - Audit type
 * @returns {Promise<Array>} Audit procedures
 */
export async function getAuditProceduresByType(cfgMsId, auditType) {
  try {
    const { data, error } = await platformDb
      .from('cfg_audit_procedures')
      .select('*')
      .eq('cfg_ms_id', cfgMsId)
      .eq('audit_type', auditType)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching audit procedures by type:', error);
    throw error;
  }
}
