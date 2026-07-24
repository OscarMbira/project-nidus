/**
 * PPD Composition Service
 * API functions for managing composition items
 */

import { supabase } from './supabaseClient'

/**
 * Add composition item
 * @param {string} ppdId - PPD ID
 * @param {Object} itemData - Item data
 * @returns {Promise<Object>} Created item
 */
export async function addCompositionItem(ppdId, itemData) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Get user's internal ID
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!userData) throw new Error('User not found')

    // Get next item number
    const { data: existingItems } = await supabase
      .from('ppd_composition_items')
      .select('item_number')
      .eq('ppd_id', ppdId)
      .eq('is_deleted', false)
      .order('item_number', { ascending: false })
      .limit(1)

    const nextNumber = existingItems && existingItems.length > 0 
      ? existingItems[0].item_number + 1 
      : 1

    const insertData = {
      ...itemData,
      ppd_id: ppdId,
      item_number: itemData.item_number || nextNumber,
      created_by: userData.id,
      updated_by: userData.id
    }

    const { data, error } = await supabase
      .from('ppd_composition_items')
      .insert(insertData)
      .select('*')
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error adding composition item:', error)
    throw error
  }
}

/**
 * Update composition item
 * @param {string} itemId - Item ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated item
 */
export async function updateCompositionItem(itemId, updates) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!userData) throw new Error('User not found')

    const updateData = {
      ...updates,
      updated_by: userData.id,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('ppd_composition_items')
      .update(updateData)
      .eq('id', itemId)
      .select('*')
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error updating composition item:', error)
    throw error
  }
}

/**
 * Delete composition item
 * @param {string} itemId - Item ID
 * @returns {Promise<boolean>} Success
 */
export async function deleteCompositionItem(itemId) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!userData) throw new Error('User not found')

    const { error } = await supabase
      .from('ppd_composition_items')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userData.id
      })
      .eq('id', itemId)

    if (error) throw error

    return true
  } catch (error) {
    console.error('Error deleting composition item:', error)
    throw error
  }
}

/**
 * Get composition items for PPD
 * @param {string} ppdId - PPD ID
 * @returns {Promise<Array>} Composition items
 */
export async function getCompositionItems(ppdId) {
  try {
    const { data, error } = await supabase
      .from('ppd_composition_items')
      .select(`
        *,
        linked_product:linked_product_id(id, product_name, product_code)
      `)
      .eq('ppd_id', ppdId)
      .eq('is_deleted', false)
      .order('item_number', { ascending: true })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching composition items:', error)
    throw error
  }
}

/**
 * Link composition item to product
 * @param {string} itemId - Item ID
 * @param {string} productId - Product ID
 * @returns {Promise<Object>} Updated item
 */
export async function linkToProduct(itemId, productId) {
  try {
    return await updateCompositionItem(itemId, {
      linked_product_id: productId
    })
  } catch (error) {
    console.error('Error linking to product:', error)
    throw error
  }
}

/**
 * Reorder composition items
 * @param {string} ppdId - PPD ID
 * @param {Array<string>} orderedIds - Ordered array of item IDs
 * @returns {Promise<boolean>} Success
 */
export async function reorderItems(ppdId, orderedIds) {
  try {
    // Update item numbers based on order
    for (let i = 0; i < orderedIds.length; i++) {
      await updateCompositionItem(orderedIds[i], {
        item_number: i + 1
      })
    }

    return true
  } catch (error) {
    console.error('Error reordering items:', error)
    throw error
  }
}

export default {
  addCompositionItem,
  updateCompositionItem,
  deleteCompositionItem,
  getCompositionItems,
  linkToProduct,
  reorderItems
}
