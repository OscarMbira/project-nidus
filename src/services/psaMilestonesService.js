/**
 * PSA Milestones Service
 * API functions for managing Product Status Account milestones
 */

import { supabase } from './supabaseClient'

/**
 * Add milestone to Product Status Account
 * @param {string} psaId - Product Status Account ID
 * @param {Object} milestoneData - Milestone data
 * @returns {Promise<Object>} Created milestone
 */
export async function addMilestone(psaId, milestoneData) {
  try {
    const { data, error } = await supabase
      .from('psa_milestones')
      .insert({
        ...milestoneData,
        product_status_account_id: psaId
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error adding milestone:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Update milestone
 * @param {string} milestoneId - Milestone ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated milestone
 */
export async function updateMilestone(milestoneId, updates) {
  try {
    const { data, error } = await supabase
      .from('psa_milestones')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', milestoneId)
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error updating milestone:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Delete milestone
 * @param {string} milestoneId - Milestone ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteMilestone(milestoneId) {
  try {
    const { error } = await supabase
      .from('psa_milestones')
      .delete()
      .eq('id', milestoneId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Error deleting milestone:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get milestones for Product Status Account
 * @param {string} psaId - Product Status Account ID
 * @returns {Promise<Object>} Milestones array
 */
export async function getMilestones(psaId) {
  try {
    const { data, error } = await supabase
      .from('psa_milestones')
      .select('*')
      .eq('product_status_account_id', psaId)
      .order('display_order', { ascending: true })
      .order('planned_date', { ascending: true })

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error getting milestones:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Update milestone status
 * @param {string} milestoneId - Milestone ID
 * @param {string} status - New status
 * @param {string} actualDate - Actual date (optional)
 * @param {string} achievementNotes - Achievement notes (optional)
 * @returns {Promise<Object>} Updated milestone
 */
export async function updateMilestoneStatus(milestoneId, status, actualDate = null, achievementNotes = null) {
  try {
    const updates = {
      milestone_status: status,
      updated_at: new Date().toISOString()
    }

    if (actualDate) {
      updates.actual_date = actualDate
    }

    if (achievementNotes) {
      updates.achievement_notes = achievementNotes
    }

    return await updateMilestone(milestoneId, updates)
  } catch (error) {
    console.error('Error updating milestone status:', error)
    return { success: false, error: error.message }
  }
}
