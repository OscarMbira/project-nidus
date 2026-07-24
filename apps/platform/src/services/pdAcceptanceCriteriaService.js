/**
 * Product Description Acceptance Criteria Service
 * API functions for managing PD acceptance criteria
 */

import { supabase } from './supabaseClient';

/**
 * Add Acceptance Criterion
 * @param {string} pdId - Product Description ID
 * @param {Object} criterionData - Criterion data
 * @returns {Promise<Object>} Created criterion
 */
export async function addAcceptanceCriterion(pdId, criterionData) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Get next display order
    const { data: existing } = await platformDb
      .from('pd_acceptance_criteria')
      .select('display_order')
      .eq('product_description_id', pdId)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0
      ? existing[0].display_order + 1
      : 0;

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    const insertData = {
      ...criterionData,
      product_description_id: pdId,
      display_order: criterionData.display_order ?? nextOrder,
      created_by: userData.id
    };

    const { data, error } = await supabase
      .from('pd_acceptance_criteria')
      .insert(insertData)
      .select('*')
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error adding acceptance criterion:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update Acceptance Criterion
 * @param {string} criterionId - Criterion ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated criterion
 */
export async function updateAcceptanceCriterion(criterionId, updates) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    const updateData = {
      ...updates,
      updated_by: userData.id
    };

    const { data, error } = await supabase
      .from('pd_acceptance_criteria')
      .update(updateData)
      .eq('id', criterionId)
      .select('*')
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating acceptance criterion:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete Acceptance Criterion
 * @param {string} criterionId - Criterion ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteAcceptanceCriterion(criterionId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    const { error } = await platformDb
      .from('pd_acceptance_criteria')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userData.id
      })
      .eq('id', criterionId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting acceptance criterion:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get Acceptance Criteria
 * @param {string} pdId - Product Description ID
 * @returns {Promise<Object>} Acceptance criteria array
 */
export async function getAcceptanceCriteria(pdId) {
  try {
    const { data, error } = await supabase
      .from('pd_acceptance_criteria')
      .select(`
        *,
        accepted_by_user:accepted_by(id, full_name, email)
      `)
      .eq('product_description_id', pdId)
      .eq('is_deleted', false)
      .order('display_order', { ascending: true })
      .order('criteria_number', { ascending: true });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error getting acceptance criteria:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Validate Acceptance Criterion
 * @param {string} criterionId - Criterion ID
 * @param {Object} validationData - Validation flags
 * @returns {Promise<Object>} Updated criterion
 */
export async function validateAcceptanceCriterion(criterionId, validationData) {
  try {
    return await updateAcceptanceCriterion(criterionId, {
      is_measurable: validationData.is_measurable ?? false,
      is_realistic: validationData.is_realistic ?? false,
      is_provable_in_project: validationData.is_provable_in_project ?? true,
      proxy_measure: validationData.proxy_measure,
      validation_notes: validationData.validation_notes
    });
  } catch (error) {
    console.error('Error validating acceptance criterion:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Mark Acceptance Criterion
 * @param {string} criterionId - Criterion ID
 * @param {string} status - Acceptance status (pending, passed, failed, waived, deferred)
 * @param {string} acceptedBy - User ID who accepted
 * @param {string} notes - Acceptance notes
 * @returns {Promise<Object>} Updated criterion
 */
export async function markAcceptanceCriterion(criterionId, status, acceptedBy, notes) {
  try {
    return await updateAcceptanceCriterion(criterionId, {
      acceptance_status: status,
      acceptance_date: status === 'passed' || status === 'failed' ? new Date().toISOString().split('T')[0] : null,
      accepted_by: acceptedBy,
      acceptance_notes: notes
    });
  } catch (error) {
    console.error('Error marking acceptance criterion:', error);
    return { success: false, error: error.message };
  }
}
