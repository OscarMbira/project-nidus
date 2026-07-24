/**
 * PSA Progress Snapshots Service
 * API functions for managing Product Status Account progress snapshots
 */

import { supabase } from './supabaseClient'

/**
 * Create progress snapshot
 * @param {string} psaId - Product Status Account ID
 * @param {string} snapshotDate - Snapshot date
 * @param {Object} progressData - Progress data
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Created snapshot
 */
export async function createProgressSnapshot(psaId, snapshotDate, progressData, userId = null) {
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
      .from('psa_progress_snapshots')
      .insert({
        product_status_account_id: psaId,
        snapshot_date: snapshotDate,
        progress_percentage: progressData.progress_percentage,
        progress_indicator: progressData.progress_indicator,
        planned_completion_date: progressData.planned_completion_date,
        forecast_completion_date: progressData.forecast_completion_date,
        schedule_variance_days: progressData.schedule_variance_days,
        progress_notes: progressData.progress_notes,
        created_by: userId
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error creating progress snapshot:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get progress snapshots for Product Status Account
 * @param {string} psaId - Product Status Account ID
 * @returns {Promise<Object>} Progress snapshots array
 */
export async function getProgressSnapshots(psaId) {
  try {
    const { data, error } = await supabase
      .from('psa_progress_snapshots')
      .select('*')
      .eq('product_status_account_id', psaId)
      .order('snapshot_date', { ascending: true })

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error getting progress snapshots:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get progress trend
 * @param {string} psaId - Product Status Account ID
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {Promise<Object>} Progress trend data
 */
export async function getProgressTrend(psaId, startDate, endDate) {
  try {
    const { data, error } = await supabase.rpc('get_psa_trend', {
      p_product_status_account_id: psaId,
      p_start_date: startDate,
      p_end_date: endDate
    })

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error getting progress trend:', error)
    return { success: false, error: error.message }
  }
}
