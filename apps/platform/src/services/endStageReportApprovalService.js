/**
 * End Stage Report Approval Service
 * Manages approval workflow
 */

import { supabase } from './supabaseClient'

/**
 * Add Approval
 * @param {string} reportId - Report ID
 * @param {string} approverId - Approver user ID
 * @param {string} versionNo - Version number
 * @returns {Promise<Object>} Created approval
 */
export async function addApproval(reportId, approverId, versionNo = '1.0') {
  try {
    // Get approver details
    const { data: approver } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('id', approverId)
      .single()

    // Get approver role
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role_id, roles(role_name)')
      .eq('user_id', approverId)
      .limit(1)
      .single()

    const approverRole = userRole?.roles?.role_name || 'other'

    const insertData = {
      end_stage_report_id: reportId,
      approver_id: approverId,
      approver_name: approver?.full_name || approver?.email,
      approver_role: approverRole,
      approval_status: 'pending',
      version_approved: versionNo
    }

    const { data, error } = await supabase
      .from('end_stage_report_approvals')
      .insert(insertData)
      .select(`
        *,
        approver:approver_id(id, full_name, email)
      `)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error adding approval:', error)
    throw error
  }
}

/**
 * Submit for Approval
 * @param {string} reportId - Report ID
 * @param {Array<string>} approverIds - Array of approver user IDs
 * @returns {Promise<Array>} Created approvals
 */
export async function submitForApproval(reportId, approverIds) {
  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      throw new Error('User not authenticated')
    }

    // Get report version
    const { data: report } = await supabase
      .from('end_stage_reports')
      .select('version_no')
      .eq('id', reportId)
      .single()

    // Create approval records
    const approvals = []
    for (const approverId of approverIds) {
      try {
        const approval = await addApproval(reportId, approverId, report?.version_no || '1.0')
        approvals.push(approval)
      } catch (err) {
        console.error(`Error creating approval for approver ${approverId}:`, err)
      }
    }

    // Update report status
    await supabase
      .from('end_stage_reports')
      .update({
        approval_workflow_status: 'submitted',
        approval_status: 'submitted'
      })
      .eq('id', reportId)

    return approvals
  } catch (error) {
    console.error('Error submitting for approval:', error)
    throw error
  }
}

/**
 * Approve Report
 * @param {string} approvalId - Approval ID
 * @param {string} comments - Approval comments
 * @param {string} conditions - Conditions (if conditional approval)
 * @returns {Promise<Object>} Updated approval
 */
export async function approveReport(approvalId, comments = null, conditions = null) {
  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      throw new Error('User not authenticated')
    }

    // Get approval to check approver
    const { data: approval } = await supabase
      .from('end_stage_report_approvals')
      .select('approver_id, end_stage_report_id')
      .eq('id', approvalId)
      .single()

    if (approval.approver_id !== userData.user.id) {
      throw new Error('Only the assigned approver can approve')
    }

    // Update approval
    const { data: updatedApproval, error: updateError } = await supabase
      .from('end_stage_report_approvals')
      .update({
        approval_status: 'approved',
        approval_date: new Date().toISOString().split('T')[0],
        approval_comments: comments,
        conditions: conditions
      })
      .eq('id', approvalId)
      .select(`
        *,
        approver:approver_id(id, full_name, email)
      `)
      .single()

    if (updateError) throw updateError

    // Check if all approvals are complete
    const { data: allApprovals } = await supabase
      .from('end_stage_report_approvals')
      .select('approval_status')
      .eq('end_stage_report_id', approval.end_stage_report_id)

    const allApproved = allApprovals?.every(a => a.approval_status === 'approved')
    const anyRejected = allApprovals?.some(a => a.approval_status === 'rejected')

    // Update report status
    let newStatus = 'under-review'
    if (allApproved) {
      newStatus = 'approved'
    } else if (anyRejected) {
      newStatus = 'rejected'
    }

    await supabase
      .from('end_stage_reports')
      .update({
        approval_workflow_status: newStatus,
        approval_status: newStatus,
        approval_decision_date: allApproved ? new Date().toISOString().split('T')[0] : null
      })
      .eq('id', approval.end_stage_report_id)

    return updatedApproval
  } catch (error) {
    console.error('Error approving report:', error)
    throw error
  }
}

/**
 * Reject Report
 * @param {string} approvalId - Approval ID
 * @param {string} comments - Rejection comments
 * @returns {Promise<Object>} Updated approval
 */
export async function rejectReport(approvalId, comments) {
  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      throw new Error('User not authenticated')
    }

    // Get approval to check approver
    const { data: approval } = await supabase
      .from('end_stage_report_approvals')
      .select('approver_id, end_stage_report_id')
      .eq('id', approvalId)
      .single()

    if (approval.approver_id !== userData.user.id) {
      throw new Error('Only the assigned approver can reject')
    }

    // Update approval
    const { data: updatedApproval, error: updateError } = await supabase
      .from('end_stage_report_approvals')
      .update({
        approval_status: 'rejected',
        approval_date: new Date().toISOString().split('T')[0],
        approval_comments: comments
      })
      .eq('id', approvalId)
      .select(`
        *,
        approver:approver_id(id, full_name, email)
      `)
      .single()

    if (updateError) throw updateError

    // Update report status
    await supabase
      .from('end_stage_reports')
      .update({
        approval_workflow_status: 'rejected',
        approval_status: 'rejected',
        approval_decision_date: new Date().toISOString().split('T')[0]
      })
      .eq('id', approval.end_stage_report_id)

    return updatedApproval
  } catch (error) {
    console.error('Error rejecting report:', error)
    throw error
  }
}

/**
 * Defer Report
 * @param {string} approvalId - Approval ID
 * @param {string} comments - Deferral comments
 * @returns {Promise<Object>} Updated approval
 */
export async function deferReport(approvalId, comments) {
  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      throw new Error('User not authenticated')
    }

    // Get approval to check approver
    const { data: approval } = await supabase
      .from('end_stage_report_approvals')
      .select('approver_id, end_stage_report_id')
      .eq('id', approvalId)
      .single()

    if (approval.approver_id !== userData.user.id) {
      throw new Error('Only the assigned approver can defer')
    }

    // Update approval
    const { data: updatedApproval, error: updateError } = await supabase
      .from('end_stage_report_approvals')
      .update({
        approval_status: 'deferred',
        approval_date: new Date().toISOString().split('T')[0],
        approval_comments: comments
      })
      .eq('id', approvalId)
      .select(`
        *,
        approver:approver_id(id, full_name, email)
      `)
      .single()

    if (updateError) throw updateError

    // Update report status
    await supabase
      .from('end_stage_reports')
      .update({
        approval_workflow_status: 'deferred',
        approval_status: 'deferred'
      })
      .eq('id', approval.end_stage_report_id)

    return updatedApproval
  } catch (error) {
    console.error('Error deferring report:', error)
    throw error
  }
}

/**
 * Get Approval Status
 * @param {string} reportId - Report ID
 * @returns {Promise<Object>} Approval status summary
 */
export async function getApprovalStatus(reportId) {
  try {
    const { data: approvals, error } = await supabase
      .from('end_stage_report_approvals')
      .select('approval_status')
      .eq('end_stage_report_id', reportId)

    if (error) throw error

    const statusCounts = {
      total: approvals?.length || 0,
      approved: approvals?.filter(a => a.approval_status === 'approved').length || 0,
      pending: approvals?.filter(a => a.approval_status === 'pending').length || 0,
      rejected: approvals?.filter(a => a.approval_status === 'rejected').length || 0,
      deferred: approvals?.filter(a => a.approval_status === 'deferred').length || 0
    }

    return {
      ...statusCounts,
      allApproved: statusCounts.total > 0 && statusCounts.approved === statusCounts.total,
      hasRejection: statusCounts.rejected > 0,
      hasDeferral: statusCounts.deferred > 0
    }
  } catch (error) {
    console.error('Error getting approval status:', error)
    throw error
  }
}

/**
 * Get Pending Approvals
 * @param {string} userId - User ID (optional, uses current user if not provided)
 * @returns {Promise<Array>} Pending approvals for user
 */
export async function getPendingApprovals(userId = null) {
  try {
    if (!userId) {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user) {
        throw new Error('User not authenticated')
      }
      userId = userData.user.id
    }

    const { data, error } = await supabase
      .from('end_stage_report_approvals')
      .select(`
        *,
        report:end_stage_report_id(id, report_title, report_reference, project_id, version_no),
        approver:approver_id(id, full_name, email)
      `)
      .eq('approver_id', userId)
      .eq('approval_status', 'pending')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching pending approvals:', error)
    throw error
  }
}

/**
 * Cancel Approval Request
 * @param {string} reportId - Report ID
 * @returns {Promise<void>}
 */
export async function cancelApprovalRequest(reportId) {
  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      throw new Error('User not authenticated')
    }

    // Check if user is author
    const { data: report } = await supabase
      .from('end_stage_reports')
      .select('created_by, prepared_by, approval_workflow_status')
      .eq('id', reportId)
      .single()

    if (report.created_by !== userData.user.id && report.prepared_by !== userData.user.id) {
      throw new Error('Only the report author can cancel approval request')
    }

    if (report.approval_workflow_status !== 'submitted' && report.approval_workflow_status !== 'under-review') {
      throw new Error('Can only cancel approval requests that are submitted or under review')
    }

    // Delete pending approvals
    await supabase
      .from('end_stage_report_approvals')
      .delete()
      .eq('end_stage_report_id', reportId)
      .eq('approval_status', 'pending')

    // Update report status
    await supabase
      .from('end_stage_reports')
      .update({
        approval_workflow_status: 'draft',
        approval_status: 'draft'
      })
      .eq('id', reportId)
  } catch (error) {
    console.error('Error canceling approval request:', error)
    throw error
  }
}
