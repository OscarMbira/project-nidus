/**
 * QMS Scheduled Activities Service
 * API functions for managing scheduled quality activities
 */

import { supabase } from './supabaseClient'

/**
 * Add scheduled activity
 * @param {string} qmsId - QMS ID
 * @param {Object} activityData - Activity data
 * @returns {Promise<Object>} Created activity
 */
export async function addActivity(qmsId, activityData) {
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
      .from('qms_scheduled_activities')
      .select('display_order')
      .eq('qms_id', qmsId)
      .order('display_order', { ascending: false })
      .limit(1)

    const nextOrder = existing && existing.length > 0
      ? existing[0].display_order + 1
      : 0

    const insertData = {
      ...activityData,
      qms_id: qmsId,
      display_order: activityData.display_order ?? nextOrder,
      created_by: userData.id
    }

    const { data, error } = await supabase
      .from('qms_scheduled_activities')
      .insert(insertData)
      .select('*')
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error adding scheduled activity:', error)
    throw error
  }
}

/**
 * Update scheduled activity
 * @param {string} activityId - Activity ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated activity
 */
export async function updateActivity(activityId, updates) {
  try {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('qms_scheduled_activities')
      .update(updateData)
      .eq('id', activityId)
      .select('*')
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error updating scheduled activity:', error)
    throw error
  }
}

/**
 * Delete scheduled activity
 * @param {string} activityId - Activity ID
 * @returns {Promise<boolean>} Success
 */
export async function deleteActivity(activityId) {
  try {
    const { error } = await supabase
      .from('qms_scheduled_activities')
      .delete()
      .eq('id', activityId)

    if (error) throw error

    return true
  } catch (error) {
    console.error('Error deleting scheduled activity:', error)
    throw error
  }
}

/**
 * Get scheduled activities for QMS
 * @param {string} qmsId - QMS ID
 * @returns {Promise<Array>} Scheduled activities
 */
export async function getActivities(qmsId) {
  try {
    const { data, error } = await supabase
      .from('qms_scheduled_activities')
      .select('*')
      .eq('qms_id', qmsId)
      .order('display_order', { ascending: true })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching scheduled activities:', error)
    throw error
  }
}

/**
 * Get upcoming activities for project
 * @param {string} projectId - Project ID
 * @returns {Promise<Array>} Upcoming activities
 */
export async function getUpcomingActivities(projectId) {
  try {
    const dateFrom = new Date()
    const dateTo = new Date()
    dateTo.setMonth(dateTo.getMonth() + 3) // Next 3 months

    const { data, error } = await supabase.rpc('get_scheduled_quality_activities', {
      p_project_id: projectId,
      p_date_from: dateFrom.toISOString().split('T')[0],
      p_date_to: dateTo.toISOString().split('T')[0]
    })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching upcoming activities:', error)
    throw error
  }
}

export default {
  addActivity,
  updateActivity,
  deleteActivity,
  getActivities,
  getUpcomingActivities
}
