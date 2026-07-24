/**
 * PPD Derivations Service
 * API functions for managing derivations (source products/documents)
 */

import { supabase } from './supabaseClient'

/**
 * Add derivation
 * @param {string} ppdId - PPD ID
 * @param {Object} derivationData - Derivation data
 * @returns {Promise<Object>} Created derivation
 */
export async function addDerivation(ppdId, derivationData) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single()

    if (!userData) {
      return { success: false, error: 'User not found' }
    }

    // Get next display order
    const { data: existingDerivations } = await supabase
      .from('ppd_derivations')
      .select('display_order')
      .eq('ppd_id', ppdId)
      .eq('is_deleted', false)
      .order('display_order', { ascending: false })
      .limit(1)

    const nextOrder = existingDerivations && existingDerivations.length > 0
      ? existingDerivations[0].display_order + 1
      : 0

    const insertData = {
      ...derivationData,
      ppd_id: ppdId,
      display_order: derivationData.display_order !== undefined ? derivationData.display_order : nextOrder,
      created_by: userData.id
    }

    const { data, error } = await supabase
      .from('ppd_derivations')
      .insert(insertData)
      .select(`
        *,
        mandate:mandate_id(id, mandate_title)
      `)
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error adding derivation:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Update derivation
 * @param {string} derivationId - Derivation ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated derivation
 */
export async function updateDerivation(derivationId, updates) {
  try {
    const { data, error } = await supabase
      .from('ppd_derivations')
      .update(updates)
      .eq('id', derivationId)
      .select(`
        *,
        mandate:mandate_id(id, mandate_title)
      `)
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error updating derivation:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Delete derivation
 * @param {string} derivationId - Derivation ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteDerivation(derivationId) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single()

    if (!userData) {
      return { success: false, error: 'User not found' }
    }

    const { error } = await supabase
      .from('ppd_derivations')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userData.id
      })
      .eq('id', derivationId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Error deleting derivation:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get derivations for PPD
 * @param {string} ppdId - PPD ID
 * @returns {Promise<Object>} Derivations array
 */
export async function getDerivations(ppdId) {
  try {
    const { data, error } = await supabase
      .from('ppd_derivations')
      .select(`
        *,
        mandate:mandate_id(id, mandate_title, mandate_reference)
      `)
      .eq('ppd_id', ppdId)
      .eq('is_deleted', false)
      .order('display_order', { ascending: true })

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error getting derivations:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Reorder derivations
 * @param {string} ppdId - PPD ID
 * @param {Array<string>} orderedIds - Array of derivation IDs in new order
 * @returns {Promise<Object>} Result
 */
export async function reorderDerivations(ppdId, orderedIds) {
  try {
    // Update display_order for each derivation
    const updates = orderedIds.map((id, index) => 
      supabase
        .from('ppd_derivations')
        .update({ display_order: index })
        .eq('id', id)
        .eq('ppd_id', ppdId)
    )

    await Promise.all(updates)

    return { success: true }
  } catch (error) {
    console.error('Error reordering derivations:', error)
    return { success: false, error: error.message }
  }
}
