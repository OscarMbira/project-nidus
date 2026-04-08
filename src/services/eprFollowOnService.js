/**
 * End Project Report Follow-On Actions Service
 * Manages follow-on action linking and recommendations
 */

import { supabase } from './supabaseClient'

/**
 * Link Follow-On Action
 * @param {string} reportId - Report ID
 * @param {Object} actionData - Follow-on action data
 * @returns {Promise<Object>} Linked follow-on action
 */
export async function linkFollowOnAction(reportId, actionData) {
  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      throw new Error('User not authenticated')
    }

    const insertData = {
      end_project_report_id: reportId,
      follow_on_action_id: actionData.follow_on_action_id,
      source_type: actionData.source_type || null,
      source_reference: actionData.source_reference || null,
      documentation_attached: actionData.documentation_attached || false,
      documentation_urls: actionData.documentation_urls || [],
      project_board_advice_requested: actionData.project_board_advice_requested || false,
      recommended_recipient: actionData.recommended_recipient || null,
      notes: actionData.notes || null,
      display_order: actionData.display_order || 0
    }

    const { data, error } = await supabase
      .from('end_project_report_follow_on_actions')
      .insert(insertData)
      .select(`
        *,
        follow_on_action:follow_on_action_id(
          id,
          action_title,
          action_description,
          action_status,
          assigned_to_user:assigned_to(id, full_name, email)
        )
      `)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error linking follow-on action:', error)
    throw error
  }
}

/**
 * Unlink Follow-On Action
 * @param {string} linkId - Link ID
 * @returns {Promise<void>}
 */
export async function unlinkFollowOnAction(linkId) {
  try {
    const { error } = await supabase
      .from('end_project_report_follow_on_actions')
      .delete()
      .eq('id', linkId)

    if (error) throw error
  } catch (error) {
    console.error('Error unlinking follow-on action:', error)
    throw error
  }
}

/**
 * Update Follow-On Action Link
 * @param {string} linkId - Link ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated link
 */
export async function updateFollowOnActionLink(linkId, updates) {
  try {
    const { data, error } = await supabase
      .from('end_project_report_follow_on_actions')
      .update(updates)
      .eq('id', linkId)
      .select(`
        *,
        follow_on_action:follow_on_action_id(
          id,
          action_title,
          action_description,
          action_status,
          assigned_to_user:assigned_to(id, full_name, email)
        )
      `)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating follow-on action link:', error)
    throw error
  }
}

/**
 * Get Open Items for Follow-On
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Open issues and risks
 */
export async function getOpenItemsForFollowOn(projectId) {
  try {
    const { getOpenIssuesForFollowOn, getOpenRisksForFollowOn } = await import('./endProjectReportService')
    
    const [openIssues, openRisks] = await Promise.all([
      getOpenIssuesForFollowOn(projectId),
      getOpenRisksForFollowOn(projectId)
    ])

    return {
      open_issues: openIssues || [],
      open_risks: openRisks || [],
      total_open: (openIssues?.length || 0) + (openRisks?.length || 0)
    }
  } catch (error) {
    console.error('Error fetching open items:', error)
    throw error
  }
}

/**
 * Request Board Advice
 * @param {string} linkId - Follow-on action link ID
 * @returns {Promise<Object>} Updated link
 */
export async function requestBoardAdvice(linkId) {
  try {
    return await updateFollowOnActionLink(linkId, {
      project_board_advice_requested: true
    })
  } catch (error) {
    console.error('Error requesting board advice:', error)
    throw error
  }
}

/**
 * Get Follow-On Actions
 * @param {string} reportId - Report ID
 * @returns {Promise<Array>} Follow-on action links
 */
export async function getFollowOnActions(reportId) {
  try {
    const { data, error } = await supabase
      .from('end_project_report_follow_on_actions')
      .select(`
        *,
        follow_on_action:follow_on_action_id(
          id,
          action_title,
          action_description,
          action_status,
          priority_order,
          assigned_to_user:assigned_to(id, full_name, email)
        )
      `)
      .eq('end_project_report_id', reportId)
      .order('display_order', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching follow-on actions:', error)
    throw error
  }
}
