/**
 * RMS Risk Standards Service
 * API functions for managing risk standards
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * Add risk standard
 * @param {string} rmsId - RMS ID
 * @param {Object} standardData - Standard data
 * @returns {Promise<Object>} Created standard
 */
export async function addStandard(rmsId, standardData) {
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
      .from('rms_risk_standards')
      .select('display_order')
      .eq('rms_id', rmsId)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0
      ? existing[0].display_order + 1
      : 0;

    const insertData = {
      ...standardData,
      rms_id: rmsId,
      display_order: standardData.display_order ?? nextOrder,
      created_by: userData.id
    };

    const { data, error } = await platformDb
      .from('rms_risk_standards')
      .insert(insertData)
      .select('*')
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error adding risk standard:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update risk standard
 * @param {string} standardId - Standard ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated standard
 */
export async function updateStandard(standardId, updates) {
  try {
    const { data, error } = await platformDb
      .from('rms_risk_standards')
      .update(updates)
      .eq('id', standardId)
      .select('*')
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating risk standard:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete risk standard
 * @param {string} standardId - Standard ID
 * @returns {Promise<Object>} Success result
 */
export async function deleteStandard(standardId) {
  try {
    const { error } = await platformDb
      .from('rms_risk_standards')
      .delete()
      .eq('id', standardId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting risk standard:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get standards for RMS
 * @param {string} rmsId - RMS ID
 * @returns {Promise<Object>} Standards list
 */
export async function getStandards(rmsId) {
  try {
    const { data, error } = await platformDb
      .from('rms_risk_standards')
      .select('*')
      .eq('rms_id', rmsId)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching risk standards:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get applicable standards for organization
 * @param {string} organisationId - Organisation ID
 * @returns {Promise<Object>} Standards list
 */
export async function getApplicableStandards(organisationId) {
  try {
    // This would typically come from organization-level templates
    // For now, return common standards
    const commonStandards = [
      { code: 'ISO 31000', name: 'ISO 31000 Risk Management', type: 'international' },
      { code: 'PMI-RMP', name: 'PMI Risk Management Professional', type: 'industry' },
      { code: 'PRINCE2', name: 'PRINCE2 Risk Management', type: 'methodology' }
    ];

    return { success: true, data: commonStandards };
  } catch (error) {
    console.error('Error fetching applicable standards:', error);
    return { success: false, error: error.message };
  }
}
