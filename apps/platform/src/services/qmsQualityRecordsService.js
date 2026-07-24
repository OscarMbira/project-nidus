/**
 * QMS Quality Records Service
 * API functions for managing quality records
 */

import { supabase } from './supabaseClient'

/**
 * Add quality record
 * @param {string} qmsId - QMS ID
 * @param {Object} recordData - Record data
 * @returns {Promise<Object>} Created record
 */
export async function addRecord(qmsId, recordData) {
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
      .from('qms_records')
      .select('display_order')
      .eq('qms_id', qmsId)
      .order('display_order', { ascending: false })
      .limit(1)

    const nextOrder = existing && existing.length > 0
      ? existing[0].display_order + 1
      : 0

    const insertData = {
      ...recordData,
      qms_id: qmsId,
      display_order: recordData.display_order ?? nextOrder,
      is_mandatory: recordData.is_mandatory ?? false,
      created_by: userData.id
    }

    const { data, error } = await supabase
      .from('qms_records')
      .insert(insertData)
      .select('*')
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error adding quality record:', error)
    throw error
  }
}

/**
 * Update quality record
 * @param {string} recordId - Record ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated record
 */
export async function updateRecord(recordId, updates) {
  try {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('qms_records')
      .update(updateData)
      .eq('id', recordId)
      .select('*')
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error updating quality record:', error)
    throw error
  }
}

/**
 * Delete quality record
 * @param {string} recordId - Record ID
 * @returns {Promise<boolean>} Success
 */
export async function deleteRecord(recordId) {
  try {
    const { error } = await supabase
      .from('qms_records')
      .delete()
      .eq('id', recordId)

    if (error) throw error

    return true
  } catch (error) {
    console.error('Error deleting quality record:', error)
    throw error
  }
}

/**
 * Get quality records for QMS
 * @param {string} qmsId - QMS ID
 * @returns {Promise<Array>} Quality records
 */
export async function getRecords(qmsId) {
  try {
    const { data, error } = await supabase
      .from('qms_records')
      .select('*')
      .eq('qms_id', qmsId)
      .order('display_order', { ascending: true })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching quality records:', error)
    throw error
  }
}

/**
 * Get mandatory quality records for QMS
 * @param {string} qmsId - QMS ID
 * @returns {Promise<Array>} Mandatory records
 */
export async function getMandatoryRecords(qmsId) {
  try {
    const { data, error } = await supabase
      .from('qms_records')
      .select('*')
      .eq('qms_id', qmsId)
      .eq('is_mandatory', true)
      .order('display_order', { ascending: true })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching mandatory records:', error)
    throw error
  }
}

export default {
  addRecord,
  updateRecord,
  deleteRecord,
  getRecords,
  getMandatoryRecords
}
