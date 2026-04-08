/**
 * End Project Report Team Performance Service
 * Manages team recognition and performance records
 */

import { supabase } from './supabaseClient'

/**
 * Add Team Recognition
 * @param {string} reportId - Report ID
 * @param {Object} recognitionData - Recognition data
 * @returns {Promise<Object>} Created recognition record
 */
export async function addTeamRecognition(reportId, recognitionData) {
  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      throw new Error('User not authenticated')
    }

    const insertData = {
      end_project_report_id: reportId,
      team_member_id: recognitionData.team_member_id || null,
      team_name: recognitionData.team_name || null,
      role: recognitionData.role || null,
      performance_type: recognitionData.performance_type,
      performance_description: recognitionData.performance_description,
      achievements: recognitionData.achievements || [],
      recognition_category: recognitionData.recognition_category || null,
      is_highlighted: recognitionData.is_highlighted || false,
      notes: recognitionData.notes || null,
      display_order: recognitionData.display_order || 0
    }

    const { data, error } = await supabase
      .from('end_project_report_team_performance')
      .insert(insertData)
      .select(`
        *,
        team_member:team_member_id(id, full_name, email)
      `)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error adding team recognition:', error)
    throw error
  }
}

/**
 * Update Team Recognition
 * @param {string} recognitionId - Recognition ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated recognition
 */
export async function updateTeamRecognition(recognitionId, updates) {
  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('end_project_report_team_performance')
      .update(updates)
      .eq('id', recognitionId)
      .select(`
        *,
        team_member:team_member_id(id, full_name, email)
      `)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating team recognition:', error)
    throw error
  }
}

/**
 * Delete Team Recognition
 * @param {string} recognitionId - Recognition ID
 * @returns {Promise<void>}
 */
export async function deleteTeamRecognition(recognitionId) {
  try {
    const { error } = await supabase
      .from('end_project_report_team_performance')
      .delete()
      .eq('id', recognitionId)

    if (error) throw error
  } catch (error) {
    console.error('Error deleting team recognition:', error)
    throw error
  }
}

/**
 * Get Team Performance
 * @param {string} reportId - Report ID
 * @returns {Promise<Array>} Team performance records
 */
export async function getTeamPerformance(reportId) {
  try {
    const { data, error } = await supabase
      .from('end_project_report_team_performance')
      .select(`
        *,
        team_member:team_member_id(id, full_name, email)
      `)
      .eq('end_project_report_id', reportId)
      .order('display_order', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching team performance:', error)
    throw error
  }
}
