/**
 * PSA Dependencies Service
 * API functions for managing Product Status Account dependencies
 */

import { supabase } from './supabaseClient'

/**
 * Add dependency to Product Status Account
 * @param {string} psaId - Product Status Account ID
 * @param {Object} dependencyData - Dependency data
 * @returns {Promise<Object>} Created dependency
 */
export async function addDependency(psaId, dependencyData) {
  try {
    const { data, error } = await supabase
      .from('psa_dependencies')
      .insert({
        ...dependencyData,
        product_status_account_id: psaId
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error adding dependency:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Update dependency
 * @param {string} dependencyId - Dependency ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated dependency
 */
export async function updateDependency(dependencyId, updates) {
  try {
    const { data, error } = await supabase
      .from('psa_dependencies')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', dependencyId)
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error updating dependency:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Delete dependency
 * @param {string} dependencyId - Dependency ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteDependency(dependencyId) {
  try {
    const { error } = await supabase
      .from('psa_dependencies')
      .delete()
      .eq('id', dependencyId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Error deleting dependency:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get dependencies for Product Status Account
 * @param {string} psaId - Product Status Account ID
 * @returns {Promise<Object>} Dependencies array
 */
export async function getDependencies(psaId) {
  try {
    const { data, error } = await supabase
      .from('psa_dependencies')
      .select(`
        *,
        dependent_product:dependent_product_status_account_id(id, product_name, current_status),
        dependent_deliverable:dependent_product_deliverable_id(id, product_name, status)
      `)
      .eq('product_status_account_id', psaId)
      .order('is_critical', { ascending: false })
      .order('dependency_status', { ascending: true })

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error getting dependencies:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Update dependency status
 * @param {string} dependencyId - Dependency ID
 * @param {string} status - New status ('satisfied', 'pending', 'blocked')
 * @returns {Promise<Object>} Updated dependency
 */
export async function updateDependencyStatus(dependencyId, status) {
  try {
    return await updateDependency(dependencyId, { dependency_status: status })
  } catch (error) {
    console.error('Error updating dependency status:', error)
    return { success: false, error: error.message }
  }
}
