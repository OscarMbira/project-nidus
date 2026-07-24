/**
 * End Stage Report Actions Service
 * Manages follow-on actions tracking
 */

import { supabase } from './supabaseClient'

/**
 * Add Follow-On Action
 * @param {string} reportId - Report ID
 * @param {Object} actionData - Action data
 * @returns {Promise<Object>} Created action
 */
export async function addFollowOnAction(reportId, actionData) {
  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      throw new Error('User not authenticated')
    }

    const insertData = {
      end_stage_report_id: reportId,
      action_description: actionData.action_description || '',
      action_type: actionData.action_type || 'other',
      priority: actionData.priority || 'medium',
      assigned_to: actionData.assigned_to || null,
      target_completion_date: actionData.target_completion_date || null,
      status: actionData.status || 'pending',
      completion_date: actionData.completion_date || null,
      related_risk_id: actionData.related_risk_id || null,
      related_issue_id: actionData.related_issue_id || null,
      display_order: actionData.display_order || 0
    }

    const { data, error } = await supabase
      .from('end_stage_report_follow_on_actions')
      .insert(insertData)
      .select(`
        *,
        assigned_user:assigned_to(id, full_name, email),
        related_risk:related_risk_id(id, risk_title),
        related_issue:related_issue_id(id, issue_title)
      `)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error adding follow-on action:', error)
    throw error
  }
}

/**
 * Update Follow-On Action
 * @param {string} actionId - Action ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated action
 */
export async function updateFollowOnAction(actionId, updates) {
  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('end_stage_report_follow_on_actions')
      .update(updates)
      .eq('id', actionId)
      .select(`
        *,
        assigned_user:assigned_to(id, full_name, email),
        related_risk:related_risk_id(id, risk_title),
        related_issue:related_issue_id(id, issue_title)
      `)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating follow-on action:', error)
    throw error
  }
}

/**
 * Delete Follow-On Action
 * @param {string} actionId - Action ID
 * @returns {Promise<void>}
 */
export async function deleteFollowOnAction(actionId) {
  try {
    const { error } = await supabase
      .from('end_stage_report_follow_on_actions')
      .delete()
      .eq('id', actionId)

    if (error) throw error
  } catch (error) {
    console.error('Error deleting follow-on action:', error)
    throw error
  }
}

/**
 * Get Follow-On Actions
 * @param {string} reportId - Report ID
 * @returns {Promise<Array>} Follow-on actions
 */
export async function getFollowOnActions(reportId) {
  try {
    const { data, error } = await supabase
      .from('end_stage_report_follow_on_actions')
      .select(`
        *,
        assigned_user:assigned_to(id, full_name, email),
        related_risk:related_risk_id(id, risk_title),
        related_issue:related_issue_id(id, issue_title)
      `)
      .eq('end_stage_report_id', reportId)
      .order('display_order', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching follow-on actions:', error)
    throw error
  }
}

/**
 * Complete Follow-On Action
 * @param {string} actionId - Action ID
 * @returns {Promise<Object>} Updated action
 */
export async function completeFollowOnAction(actionId) {
  try {
    return await updateFollowOnAction(actionId, {
      status: 'completed',
      completion_date: new Date().toISOString().split('T')[0]
    })
  } catch (error) {
    console.error('Error completing follow-on action:', error)
    throw error
  }
}

/**
 * Get Actions by Assignee
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Actions assigned to user
 */
export async function getActionsByAssignee(userId) {
  try {
    const { data, error } = await supabase
      .from('end_stage_report_follow_on_actions')
      .select(`
        *,
        report:end_stage_report_id(id, report_title, report_reference, project_id),
        related_risk:related_risk_id(id, risk_title),
        related_issue:related_issue_id(id, issue_title)
      `)
      .eq('assigned_to', userId)
      .in('status', ['pending', 'in-progress'])
      .order('target_completion_date', { ascending: true, nullsLast: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching actions by assignee:', error)
    throw error
  }
}
