/**
 * Product Description Composition Items Service
 * API functions for managing PD composition items (sub-products)
 */

import { supabase as platformDb } from './supabaseClient';

/**
 * Add Composition Item
 * @param {string} pdId - Product Description ID
 * @param {Object} itemData - Composition item data
 * @returns {Promise<Object>} Created item
 */
export async function addCompositionItem(pdId, itemData) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Get next item number
    const { data: existing } = await platformDb
      .from('pd_composition_items')
      .select('item_number')
      .eq('product_description_id', pdId)
      .order('item_number', { ascending: false })
      .limit(1);

    const nextNumber = existing && existing.length > 0
      ? existing[0].item_number + 1
      : 1;

    const insertData = {
      ...itemData,
      product_description_id: pdId,
      item_number: itemData.item_number ?? nextNumber
    };

    const { data, error } = await supabase
      .from('pd_composition_items')
      .insert(insertData)
      .select(`
        *,
        linked_product_description:linked_product_description_id(id, product_title),
        linked_product_deliverable:linked_product_deliverable_id(id, product_name)
      `)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error adding composition item:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update Composition Item
 * @param {string} itemId - Composition item ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated item
 */
export async function updateCompositionItem(itemId, updates) {
  try {
    const { data, error } = await supabase
      .from('pd_composition_items')
      .update(updates)
      .eq('id', itemId)
      .select(`
        *,
        linked_product_description:linked_product_description_id(id, product_title),
        linked_product_deliverable:linked_product_deliverable_id(id, product_name)
      `)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating composition item:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete Composition Item
 * @param {string} itemId - Composition item ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteCompositionItem(itemId) {
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
      .from('pd_composition_items')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userData.id
      })
      .eq('id', itemId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting composition item:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get Composition Items
 * @param {string} pdId - Product Description ID
 * @returns {Promise<Object>} Composition items array
 */
export async function getCompositionItems(pdId) {
  try {
    const { data, error } = await supabase
      .from('pd_composition_items')
      .select(`
        *,
        linked_product_description:linked_product_description_id(id, product_title),
        linked_product_deliverable:linked_product_deliverable_id(id, product_name)
      `)
      .eq('product_description_id', pdId)
      .eq('is_deleted', false)
      .order('item_number', { ascending: true });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error getting composition items:', error);
    return { success: false, error: error.message };
  }
}
