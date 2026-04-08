/**
 * CMS Communication Methods Service
 * API functions for managing communication methods
 */

import { platformDb } from './supabaseClient';

/**
 * Add communication method
 * @param {string} cmsId - CMS ID
 * @param {Object} methodData - Method data
 * @returns {Promise<Object>} Created method
 */
export async function addMethod(cmsId, methodData) {
  try {
    const { data: existing } = await platformDb
      .from('cms_communication_methods')
      .select('display_order')
      .eq('cms_id', cmsId)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0
      ? existing[0].display_order + 1
      : 0;

    const insertData = {
      ...methodData,
      cms_id: cmsId,
      display_order: methodData.display_order ?? nextOrder
    };

    const { data, error } = await platformDb
      .from('cms_communication_methods')
      .insert(insertData)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding method:', error);
    throw error;
  }
}

/**
 * Update communication method
 * @param {string} methodId - Method ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated method
 */
export async function updateMethod(methodId, updates) {
  try {
    const { data, error } = await platformDb
      .from('cms_communication_methods')
      .update(updates)
      .eq('id', methodId)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating method:', error);
    throw error;
  }
}

/**
 * Delete communication method
 * @param {string} methodId - Method ID
 * @returns {Promise<boolean>} Success
 */
export async function deleteMethod(methodId) {
  try {
    const { error } = await platformDb
      .from('cms_communication_methods')
      .delete()
      .eq('id', methodId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting method:', error);
    throw error;
  }
}

/**
 * Get methods for CMS
 * @param {string} cmsId - CMS ID
 * @returns {Promise<Array>} Methods
 */
export async function getMethods(cmsId) {
  try {
    const { data, error } = await platformDb
      .from('cms_communication_methods')
      .select('*')
      .eq('cms_id', cmsId)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching methods:', error);
    throw error;
  }
}

/**
 * Get mandatory methods for CMS
 * @param {string} cmsId - CMS ID
 * @returns {Promise<Array>} Mandatory methods
 */
export async function getMandatoryMethods(cmsId) {
  try {
    const { data, error } = await platformDb
      .from('cms_communication_methods')
      .select('*')
      .eq('cms_id', cmsId)
      .eq('is_mandatory', true)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching mandatory methods:', error);
    throw error;
  }
}
