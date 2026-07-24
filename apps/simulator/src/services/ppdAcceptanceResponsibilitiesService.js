/**
 * PPD Acceptance Responsibilities Service
 * API functions for managing acceptance responsibilities
 */

import { supabase } from './supabaseClient'

/**
 * Add acceptance responsibility
 * @param {string} ppdId - PPD ID
 * @param {Object} responsibilityData - Responsibility data
 * @returns {Promise<Object>} Created responsibility
 */
export async function addResponsibility(ppdId, responsibilityData) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!userData) throw new Error('User not found')

    // Get next display order
    const { data: existing } = await supabase
      .from('ppd_acceptance_responsibilities')
      .select('display_order')
      .eq('ppd_id', ppdId)
      .eq('is_deleted', false)
      .order('display_order', { ascending: false })
      .limit(1)

    const nextOrder = existing && existing.length > 0
      ? existing[0].display_order + 1
      : 0

    const insertData = {
      ...responsibilityData,
      ppd_id: ppdId,
      display_order: responsibilityData.display_order ?? nextOrder,
      created_by: userData.id
    }

    const { data, error } = await supabase
      .from('ppd_acceptance_responsibilities')
      .insert(insertData)
      .select(`
        *,
        user:user_id(id, full_name, email)
      `)
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error adding acceptance responsibility:', error)
    throw error
  }
}

/**
 * Update acceptance responsibility
 * @param {string} responsibilityId - Responsibility ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated responsibility
 */
export async function updateResponsibility(responsibilityId, updates) {
  try {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('ppd_acceptance_responsibilities')
      .update(updateData)
      .eq('id', responsibilityId)
      .select(`
        *,
        user:user_id(id, full_name, email)
      `)
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error updating acceptance responsibility:', error)
    throw error
  }
}

/**
 * Delete acceptance responsibility
 * @param {string} responsibilityId - Responsibility ID
 * @returns {Promise<boolean>} Success
 */
export async function deleteResponsibility(responsibilityId) {
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
      .from('ppd_acceptance_responsibilities')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userData.id
      })
      .eq('id', responsibilityId)

    if (error) throw error

    return true
  } catch (error) {
    console.error('Error deleting acceptance responsibility:', error)
    throw error
  }
}

/**
 * Get acceptance responsibilities for PPD
 * @param {string} ppdId - PPD ID
 * @returns {Promise<Array>} Responsibilities
 */
export async function getResponsibilities(ppdId) {
  try {
    const { data, error } = await supabase
      .from('ppd_acceptance_responsibilities')
      .select(`
        *,
        user:user_id(id, full_name, email)
      `)
      .eq('ppd_id', ppdId)
      .eq('is_deleted', false)
      .order('display_order', { ascending: true })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching acceptance responsibilities:', error)
    throw error
  }
}

/**
 * Assign criteria to responsibility
 * @param {string} responsibilityId - Responsibility ID
 * @param {Array<string>} criteriaIds - Array of criteria IDs
 * @returns {Promise<Object>} Updated responsibility
 */
export async function assignCriteriaToRole(responsibilityId, criteriaIds) {
  try {
    return await updateResponsibility(responsibilityId, {
      criteria_ids: criteriaIds
    })
  } catch (error) {
    console.error('Error assigning criteria to role:', error)
    throw error
  }
}

export default {
  addResponsibility,
  updateResponsibility,
  deleteResponsibility,
  getResponsibilities,
  assignCriteriaToRole
}
