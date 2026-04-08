/**
 * Brief Approval Service
 * Manages approval workflow for project briefs
 */

import { supabase } from './supabaseClient'
import { notifyBriefSubmitted, notifyBriefApproved, notifyBriefRejected, notifyBriefChangesRequested } from './briefNotificationService'
import { updateStatus } from './projectBriefService'

/**
 * Submit brief for approval
 * @param {string} briefId - Brief ID
 * @param {Array<string>} approverIds - Array of approver user IDs
 * @returns {Promise<Array>} Created approval records
 */
export async function submitForApproval(briefId, approverIds) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Get brief version
    const { data: brief } = await supabase
      .from('project_briefs')
      .select('version_number')
      .eq('id', briefId)
      .single()

    // Update brief status
    await updateStatus(briefId, 'under_review')

    // Create approval records
    const approvals = []
    for (const approverId of approverIds) {
      // Get approver details
      const { data: approver } = await supabase
        .from('users')
        .select('full_name, email')
        .eq('id', approverId)
        .single()

      const { data, error } = await supabase
        .from('brief_approvals')
        .insert({
          brief_id: briefId,
          approver_id: approverId,
          approver_name: approver?.full_name || 'Unknown',
          approver_title: approver?.title || null,
          approval_status: 'pending',
          version_approved: brief?.version_number || '1.0'
        })
        .select()
        .single()

      if (error) throw error
      approvals.push(data)
    }

    // Send notification
    try {
      await notifyBriefSubmitted(briefId, approverIds)
    } catch (notifError) {
      console.warn('Failed to send notification:', notifError)
      // Don't fail the submission if notification fails
    }

    return approvals
  } catch (error) {
    console.error('Error submitting for approval:', error)
    throw error
  }
}

/**
 * Approve brief
 * @param {string} approvalId - Approval ID
 * @param {string} approverId - Approver user ID
 * @param {string} comments - Approval comments
 * @returns {Promise<Object>} Updated approval
 */
export async function approveBrief(approvalId, approverId, comments = null) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Get user internal ID
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single()

    if (!userData || userData.id !== approverId) {
      throw new Error('Approver ID does not match current user')
    }

    // Update approval
    const { data: approval, error: approvalError } = await supabase
      .from('brief_approvals')
      .update({
        approval_status: 'approved',
        approval_date: new Date().toISOString().split('T')[0],
        comments: comments
      })
      .eq('id', approvalId)
      .eq('approver_id', approverId)
      .select()
      .single()

    if (approvalError) throw approvalError

    // Check if all approvals are complete
    const { data: allApprovals } = await supabase
      .from('brief_approvals')
      .select('approval_status')
      .eq('brief_id', approval.brief_id)

    const allApproved = allApprovals?.every(a => a.approval_status === 'approved')

    if (allApproved) {
      // Update brief status to approved
      const { data: brief } = await supabase
        .from('project_briefs')
        .select('id')
        .eq('id', approval.brief_id)
        .single()

      await supabase
        .from('project_briefs')
        .update({
          document_status: 'approved',
          approved_date: new Date().toISOString().split('T')[0],
          approved_by: approverId,
          approved_at: new Date().toISOString()
        })
        .eq('id', brief.id)

      // Send approval notification
      try {
        await notifyBriefApproved(brief.id, approverId)
      } catch (notifError) {
        console.warn('Failed to send approval notification:', notifError)
      }
    }

    return approval
  } catch (error) {
    console.error('Error approving brief:', error)
    throw error
  }
}

/**
 * Reject brief
 * @param {string} approvalId - Approval ID
 * @param {string} approverId - Approver user ID
 * @param {string} reason - Rejection reason
 * @returns {Promise<Object>} Updated approval
 */
export async function rejectBrief(approvalId, approverId, reason) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Get user internal ID
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single()

    if (!userData || userData.id !== approverId) {
      throw new Error('Approver ID does not match current user')
    }

    // Update approval
    const { data: approval, error: approvalError } = await supabase
      .from('brief_approvals')
      .update({
        approval_status: 'rejected',
        approval_date: new Date().toISOString().split('T')[0],
        comments: reason
      })
      .eq('id', approvalId)
      .eq('approver_id', approverId)
      .select()
      .single()

    if (approvalError) throw approvalError

    // Update brief status to rejected
    await supabase
      .from('project_briefs')
      .update({
        document_status: 'rejected'
      })
      .eq('id', approval.brief_id)

    // Send rejection notification
    try {
      await notifyBriefRejected(approval.brief_id, approverId, reason)
    } catch (notifError) {
      console.warn('Failed to send rejection notification:', notifError)
    }

    return approval
  } catch (error) {
    console.error('Error rejecting brief:', error)
    throw error
  }
}

/**
 * Request changes
 * @param {string} approvalId - Approval ID
 * @param {string} approverId - Approver user ID
 * @param {string} changes - Requested changes
 * @returns {Promise<Object>} Updated approval
 */
export async function requestChanges(approvalId, approverId, changes) {
  try {
    // Similar to reject but doesn't change brief status
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single()

    if (!userData || userData.id !== approverId) {
      throw new Error('Approver ID does not match current user')
    }

    const { data, error } = await supabase
      .from('brief_approvals')
      .update({
        comments: changes,
        updated_at: new Date().toISOString()
      })
      .eq('id', approvalId)
      .eq('approver_id', approverId)
      .select()
      .single()

    if (error) throw error

    // Get brief ID for notification
    const { data: approvalData } = await supabase
      .from('brief_approvals')
      .select('brief_id')
      .eq('id', approvalId)
      .single()

    // Send changes requested notification
    if (approvalData) {
      try {
        await notifyBriefChangesRequested(approvalData.brief_id, approverId, changes)
      } catch (notifError) {
        console.warn('Failed to send changes requested notification:', notifError)
      }
    }

    return data
  } catch (error) {
    console.error('Error requesting changes:', error)
    throw error
  }
}

/**
 * Get approval status for a brief
 * @param {string} briefId - Brief ID
 * @returns {Promise<Object>} Approval status
 */
export async function getApprovalStatus(briefId) {
  try {
    const { data: approvals, error } = await supabase
      .from('brief_approvals')
      .select(`
        *,
        approver:users!brief_approvals_approver_id_fkey(id, full_name, email)
      `)
      .eq('brief_id', briefId)
      .order('created_at', { ascending: true })

    if (error) throw error

    const pending = approvals?.filter(a => a.approval_status === 'pending').length || 0
    const approved = approvals?.filter(a => a.approval_status === 'approved').length || 0
    const rejected = approvals?.filter(a => a.approval_status === 'rejected').length || 0

    return {
      brief_id: briefId,
      total_approvers: approvals?.length || 0,
      pending_count: pending,
      approved_count: approved,
      rejected_count: rejected,
      all_approved: pending === 0 && approved > 0 && rejected === 0,
      has_rejection: rejected > 0,
      approvals: approvals || []
    }
  } catch (error) {
    console.error('Error getting approval status:', error)
    throw error
  }
}

/**
 * Get pending approvals for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of pending approvals
 */
export async function getPendingApprovals(userId) {
  try {
    const { data, error } = await supabase
      .from('brief_approvals')
      .select(`
        *,
        brief:project_briefs!brief_approvals_brief_id_fkey(
          id,
          brief_reference,
          document_status,
          project:projects(id, project_name)
        )
      `)
      .eq('approver_id', userId)
      .eq('approval_status', 'pending')
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching pending approvals:', error)
    throw error
  }
}

export default {
  submitForApproval,
  approveBrief,
  rejectBrief,
  requestChanges,
  getApprovalStatus,
  getPendingApprovals
}
