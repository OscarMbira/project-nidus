/**
 * PSA Status History Service
 * API functions for managing Product Status Account status history
 */

import { supabase } from './supabaseClient'

/**
 * Get status history for Product Status Account
 * @param {string} psaId - Product Status Account ID
 * @returns {Promise<Object>} Status history array
 */
export async function getStatusHistory(psaId) {
  try {
    const { data, error } = await supabase
      .from('psa_status_history')
      .select(`
        *,
        status_changed_by_user:status_changed_by(id, full_name, email)
      `)
      .eq('product_status_account_id', psaId)
      .order('status_change_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error getting status history:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get status history by date range
 * @param {string} psaId - Product Status Account ID
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {Promise<Object>} Status history array
 */
export async function getStatusHistoryByDateRange(psaId, startDate, endDate) {
  try {
    const { data, error } = await supabase
      .from('psa_status_history')
      .select(`
        *,
        status_changed_by_user:status_changed_by(id, full_name, email)
      `)
      .eq('product_status_account_id', psaId)
      .gte('status_change_date', startDate)
      .lte('status_change_date', endDate)
      .order('status_change_date', { ascending: false })

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error getting status history by date range:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Add status change to history
 * @param {string} psaId - Product Status Account ID
 * @param {string} previousStatus - Previous status
 * @param {string} newStatus - New status
 * @param {string} reason - Reason for change
 * @param {string} userId - User ID
 * @param {string} changeRequestId - Change request ID (optional)
 * @returns {Promise<Object>} Created status history entry
 */
export async function addStatusChange(psaId, previousStatus, newStatus, reason = null, userId = null, changeRequestId = null) {
  try {
    if (!userId) {
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
      userId = userData.id
    }

    const { data, error } = await supabase
      .from('psa_status_history')
      .insert({
        product_status_account_id: psaId,
        previous_status: previousStatus,
        new_status: newStatus,
        status_change_date: new Date().toISOString().split('T')[0],
        status_changed_by: userId,
        status_change_reason: reason,
        change_request_id: changeRequestId
      })
      .select(`
        *,
        status_changed_by_user:status_changed_by(id, full_name, email)
      `)
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error adding status change:', error)
    return { success: false, error: error.message }
  }
}
