/**
 * Product Description Derivations Service
 * API functions for managing PD derivations (source products/specifications)
 */

import { supabase } from './supabaseClient';

/**
 * Add Derivation
 * @param {string} pdId - Product Description ID
 * @param {Object} derivationData - Derivation data
 * @returns {Promise<Object>} Created derivation
 */
export async function addDerivation(pdId, derivationData) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Get next display order
    const { data: existing } = await platformDb
      .from('pd_derivations')
      .select('display_order')
      .eq('product_description_id', pdId)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0
      ? existing[0].display_order + 1
      : 0;

    const insertData = {
      ...derivationData,
      product_description_id: pdId,
      display_order: derivationData.display_order ?? nextOrder,
      created_by: (await platformDb
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .eq('is_deleted', false)
        .single()).data?.id
    };

    const { data, error } = await platformDb
      .from('pd_derivations')
      .insert(insertData)
      .select(`
        *,
        linked_ppd:linked_ppd_id(id, ppd_reference, product_title),
        linked_ppd_composition_item:linked_ppd_composition_item_id(id, product_name),
        mandate:mandate_id(id, mandate_reference)
      `)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error adding derivation:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update Derivation
 * @param {string} derivationId - Derivation ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated derivation
 */
export async function updateDerivation(derivationId, updates) {
  try {
    const { data, error } = await platformDb
      .from('pd_derivations')
      .update(updates)
      .eq('id', derivationId)
      .select(`
        *,
        linked_ppd:linked_ppd_id(id, ppd_reference, product_title),
        linked_ppd_composition_item:linked_ppd_composition_item_id(id, product_name),
        mandate:mandate_id(id, mandate_reference)
      `)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating derivation:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete Derivation
 * @param {string} derivationId - Derivation ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteDerivation(derivationId) {
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
      .from('pd_derivations')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userData.id
      })
      .eq('id', derivationId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting derivation:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get Derivations
 * @param {string} pdId - Product Description ID
 * @returns {Promise<Object>} Derivations array
 */
export async function getDerivations(pdId) {
  try {
    const { data, error } = await platformDb
      .from('pd_derivations')
      .select(`
        *,
        linked_ppd:linked_ppd_id(id, ppd_reference, product_title),
        linked_ppd_composition_item:linked_ppd_composition_item_id(id, product_name),
        mandate:mandate_id(id, mandate_reference)
      `)
      .eq('product_description_id', pdId)
      .eq('is_deleted', false)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error getting derivations:', error);
    return { success: false, error: error.message };
  }
}
