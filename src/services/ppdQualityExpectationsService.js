/**
 * PPD Quality Expectations Service
 * API functions for managing quality expectations
 */

import { supabase } from './supabaseClient'

/**
 * Add quality expectation
 * @param {string} ppdId - PPD ID
 * @param {Object} expectationData - Expectation data
 * @returns {Promise<Object>} Created expectation
 */
export async function addExpectation(ppdId, expectationData) {
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
      .from('ppd_quality_expectations')
      .select('display_order')
      .eq('ppd_id', ppdId)
      .eq('is_deleted', false)
      .order('display_order', { ascending: false })
      .limit(1)

    const nextOrder = existing && existing.length > 0
      ? existing[0].display_order + 1
      : 0

    const insertData = {
      ...expectationData,
      ppd_id: ppdId,
      display_order: expectationData.display_order ?? nextOrder,
      created_by: userData.id
    }

    const { data, error } = await supabase
      .from('ppd_quality_expectations')
      .insert(insertData)
      .select('*')
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error adding quality expectation:', error)
    throw error
  }
}

/**
 * Update quality expectation
 * @param {string} expectationId - Expectation ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated expectation
 */
export async function updateExpectation(expectationId, updates) {
  try {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('ppd_quality_expectations')
      .update(updateData)
      .eq('id', expectationId)
      .select('*')
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error updating quality expectation:', error)
    throw error
  }
}

/**
 * Delete quality expectation
 * @param {string} expectationId - Expectation ID
 * @returns {Promise<boolean>} Success
 */
export async function deleteExpectation(expectationId) {
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
      .from('ppd_quality_expectations')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userData.id
      })
      .eq('id', expectationId)

    if (error) throw error

    return true
  } catch (error) {
    console.error('Error deleting quality expectation:', error)
    throw error
  }
}

/**
 * Get quality expectations for PPD
 * @param {string} ppdId - PPD ID
 * @returns {Promise<Array>} Quality expectations
 */
export async function getExpectations(ppdId) {
  try {
    const { data, error } = await supabase
      .from('ppd_quality_expectations')
      .select('*')
      .eq('ppd_id', ppdId)
      .eq('is_deleted', false)
      .order('display_order', { ascending: true })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching quality expectations:', error)
    throw error
  }
}

/**
 * Prioritize expectations (update priorities)
 * @param {string} ppdId - PPD ID
 * @param {Array<Object>} priorities - Array of {id, priority} objects
 * @returns {Promise<boolean>} Success
 */
export async function prioritizeExpectations(ppdId, priorities) {
  try {
    // Update priorities
    for (const item of priorities) {
      await updateExpectation(item.id, {
        priority: item.priority,
        display_order: item.display_order
      })
    }

    return true
  } catch (error) {
    console.error('Error prioritizing expectations:', error)
    throw error
  }
}

export default {
  addExpectation,
  updateExpectation,
  deleteExpectation,
  getExpectations,
  prioritizeExpectations
}
