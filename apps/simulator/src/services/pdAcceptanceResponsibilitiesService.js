/**
 * Product Description Acceptance Responsibilities Service
 * API functions for managing PD acceptance responsibilities
 */

import { supabase } from './supabaseClient';

/**
 * Add Responsibility
 * @param {string} pdId - Product Description ID
 * @param {Object} responsibilityData - Responsibility data
 * @returns {Promise<Object>} Created responsibility
 */
export async function addResponsibility(pdId, responsibilityData) {
  try {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Get next display order
    const { data: existing } = await platformDb
      .from('pd_acceptance_responsibilities')
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
      ...responsibilityData,
      product_description_id: pdId,
      display_order: responsibilityData.display_order ?? nextOrder,
      created_by: userData.id
    };

    const { data, error } = await supabase
      .from('pd_acceptance_responsibilities')
      .insert(insertData)
      .select(`
        *,
        assigned_to_user:assigned_to_id(id, full_name, email)
      `)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error adding responsibility:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update Responsibility
 * @param {string} responsibilityId - Responsibility ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated responsibility
 */
export async function updateResponsibility(responsibilityId, updates) {
  try {
    const { data: { user } } = await platformDb.auth.getUser();
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
      .from('pd_acceptance_responsibilities')
      .update(updateData)
      .eq('id', responsibilityId)
      .select(`
        *,
        assigned_to_user:assigned_to_id(id, full_name, email)
      `)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating responsibility:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete Responsibility
 * @param {string} responsibilityId - Responsibility ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteResponsibility(responsibilityId) {
  try {
    const { data: { user } } = await platformDb.auth.getUser();
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
      .from('pd_acceptance_responsibilities')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userData.id
      })
      .eq('id', responsibilityId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting responsibility:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get Responsibilities
 * @param {string} pdId - Product Description ID
 * @returns {Promise<Object>} Responsibilities array
 */
export async function getResponsibilities(pdId) {
  try {
    const { data, error } = await supabase
      .from('pd_acceptance_responsibilities')
      .select(`
        *,
        assigned_to_user:assigned_to_id(id, full_name, email)
      `)
      .eq('product_description_id', pdId)
      .eq('is_deleted', false)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error getting responsibilities:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Assign Responsibility to User
 * @param {string} responsibilityId - Responsibility ID
 * @param {string} userId - User ID to assign
 * @returns {Promise<Object>} Updated responsibility
 */
export async function assignResponsibility(responsibilityId, userId) {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('id', userId)
      .eq('is_deleted', false)
      .single();

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    return await updateResponsibility(responsibilityId, {
      assigned_to_id: userId,
      assigned_to_name: user.full_name
    });
  } catch (error) {
    console.error('Error assigning responsibility:', error);
    return { success: false, error: error.message };
  }
}
