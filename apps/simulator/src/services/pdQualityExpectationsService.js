/**
 * Product Description Quality Expectations Service
 * API functions for managing PD quality expectations
 */

import { supabase } from './supabaseClient';

/**
 * Add Quality Expectation
 * @param {string} pdId - Product Description ID
 * @param {Object} expectationData - Expectation data
 * @returns {Promise<Object>} Created expectation
 */
export async function addQualityExpectation(pdId, expectationData) {
  try {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Get next display order
    const { data: existing } = await platformDb
      .from('pd_quality_expectations')
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
      ...expectationData,
      product_description_id: pdId,
      display_order: expectationData.display_order ?? nextOrder,
      created_by: userData.id
    };

    const { data, error } = await supabase
      .from('pd_quality_expectations')
      .insert(insertData)
      .select('*')
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error adding quality expectation:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update Quality Expectation
 * @param {string} expectationId - Expectation ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated expectation
 */
export async function updateQualityExpectation(expectationId, updates) {
  try {
    const { data, error } = await supabase
      .from('pd_quality_expectations')
      .update(updates)
      .eq('id', expectationId)
      .select('*')
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating quality expectation:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete Quality Expectation
 * @param {string} expectationId - Expectation ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteQualityExpectation(expectationId) {
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
      .from('pd_quality_expectations')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userData.id
      })
      .eq('id', expectationId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting quality expectation:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get Quality Expectations
 * @param {string} pdId - Product Description ID
 * @returns {Promise<Object>} Quality expectations array
 */
export async function getQualityExpectations(pdId) {
  try {
    const { data, error } = await supabase
      .from('pd_quality_expectations')
      .select('*')
      .eq('product_description_id', pdId)
      .eq('is_deleted', false)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error getting quality expectations:', error);
    return { success: false, error: error.message };
  }
}
