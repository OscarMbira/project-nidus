/**
 * QMS Quality Methods Service
 * API functions for managing quality methods
 */

import { supabase } from './supabaseClient'

/**
 * Add quality method
 * @param {string} qmsId - QMS ID
 * @param {Object} methodData - Method data
 * @returns {Promise<Object>} Created method
 */
export async function addMethod(qmsId, methodData) {
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
      .from('qms_quality_methods')
      .select('display_order')
      .eq('qms_id', qmsId)
      .order('display_order', { ascending: false })
      .limit(1)

    const nextOrder = existing && existing.length > 0
      ? existing[0].display_order + 1
      : 0

    const insertData = {
      ...methodData,
      qms_id: qmsId,
      display_order: methodData.display_order ?? nextOrder,
      created_by: userData.id
    }

    const { data, error } = await supabase
      .from('qms_quality_methods')
      .insert(insertData)
      .select('*')
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error adding quality method:', error)
    throw error
  }
}

/**
 * Update quality method
 * @param {string} methodId - Method ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated method
 */
export async function updateMethod(methodId, updates) {
  try {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('qms_quality_methods')
      .update(updateData)
      .eq('id', methodId)
      .select('*')
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error updating quality method:', error)
    throw error
  }
}

/**
 * Delete quality method
 * @param {string} methodId - Method ID
 * @returns {Promise<boolean>} Success
 */
export async function deleteMethod(methodId) {
  try {
    const { error } = await supabase
      .from('qms_quality_methods')
      .delete()
      .eq('id', methodId)

    if (error) throw error

    return true
  } catch (error) {
    console.error('Error deleting quality method:', error)
    throw error
  }
}

/**
 * Get quality methods for QMS
 * @param {string} qmsId - QMS ID
 * @returns {Promise<Array>} Quality methods
 */
export async function getMethods(qmsId) {
  try {
    const { data, error } = await supabase
      .from('qms_quality_methods')
      .select('*')
      .eq('qms_id', qmsId)
      .order('display_order', { ascending: true })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching quality methods:', error)
    throw error
  }
}

/**
 * Get mandatory quality methods for QMS
 * @param {string} qmsId - QMS ID
 * @returns {Promise<Array>} Mandatory methods
 */
export async function getMandatoryMethods(qmsId) {
  try {
    const { data, error } = await supabase
      .from('qms_quality_methods')
      .select('*')
      .eq('qms_id', qmsId)
      .eq('is_mandatory', true)
      .order('display_order', { ascending: true })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching mandatory methods:', error)
    throw error
  }
}

export default {
  addMethod,
  updateMethod,
  deleteMethod,
  getMethods,
  getMandatoryMethods
}
