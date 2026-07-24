/**
 * Exception Report Approval Service
 * Manages approval workflow for exception reports
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

    const insertData = {
      exception_report_id: reportId,
      approver_id: approverId,
      approver_name: approver?.full_name || approver?.email,
      approval_status: 'pending',
      version_approved: versionNo
    }

    const { data, error } = await supabase
      .from('exception_report_approvals')
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

    // Check if can submit (quality checks)
    const { canSubmitForApproval } = await import('./exceptionReportService')
    const canSubmit = await canSubmitForApproval(reportId)

    if (!canSubmit) {
      throw new Error('Report does not meet quality criteria for submission')
    }

    // Get report version
    const { data: report } = await supabase
      .from('exception_reports')
      .select('version_no')
      .eq('id', reportId)
      .single()

    // Update report status
    await supabase
      .from('exception_reports')
      .update({
        report_status: 'submitted',
        submitted_at: new Date().toISOString(),
        submitted_by: userData.user.id
      })
      .eq('id', reportId)

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
 * @returns {Promise<Object>} Updated approval
 */
export async function approveReport(approvalId, comments = null) {
  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      throw new Error('User not authenticated')
    }

    // Get approval to check approver
    const { data: approval } = await supabase
      .from('exception_report_approvals')
      .select('approver_id, exception_report_id')
      .eq('id', approvalId)
      .single()

    if (approval.approver_id !== userData.user.id) {
      throw new Error('Only the assigned approver can approve')
    }

    // Update approval
    const { data: updatedApproval, error: updateError } = await supabase
      .from('exception_report_approvals')
      .update({
        approval_status: 'approved',
        approval_date: new Date().toISOString().split('T')[0],
        comments: comments
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
      .from('exception_report_approvals')
      .select('approval_status')
      .eq('exception_report_id', approval.exception_report_id)

    const allApproved = allApprovals?.every(a => a.approval_status === 'approved')
    const anyRejected = allApprovals?.some(a => a.approval_status === 'rejected')

    // Update report status
    let newStatus = 'under_review'
    if (allApproved) {
      newStatus = 'approved'
    } else if (anyRejected) {
      newStatus = 'rejected'
    }

    await supabase
      .from('exception_reports')
      .update({
        report_status: newStatus
      })
      .eq('id', approval.exception_report_id)

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
      .from('exception_report_approvals')
      .select('approver_id, exception_report_id')
      .eq('id', approvalId)
      .single()

    if (approval.approver_id !== userData.user.id) {
      throw new Error('Only the assigned approver can reject')
    }

    // Update approval
    const { data: updatedApproval, error: updateError } = await supabase
      .from('exception_report_approvals')
      .update({
        approval_status: 'rejected',
        approval_date: new Date().toISOString().split('T')[0],
        comments: comments
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
      .from('exception_reports')
      .update({
        report_status: 'rejected'
      })
      .eq('id', approval.exception_report_id)

    return updatedApproval
  } catch (error) {
    console.error('Error rejecting report:', error)
    throw error
  }
}

/**
 * Get Approval Status
 * @param {string} reportId - Report ID
 * @returns {Promise<Array>} List of approvals
 */
export async function getApprovalStatus(reportId) {
  try {
    const { data, error } = await supabase
      .from('exception_report_approvals')
      .select(`
        *,
        approver:approver_id(id, full_name, email)
      `)
      .eq('exception_report_id', reportId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error getting approval status:', error)
    throw error
  }
}

/**
 * Record Board Decision
 * @param {string} reportId - Report ID
 * @param {string} decision - Board decision text
 * @param {Date} decisionDate - Decision date
 * @param {string} decisionReference - Decision reference
 * @returns {Promise<Object>} Updated report
 */
export async function recordBoardDecision(reportId, decision, decisionDate, decisionReference = null) {
  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('exception_reports')
      .update({
        board_decision: decision,
        board_decision_date: decisionDate instanceof Date ? decisionDate.toISOString().split('T')[0] : decisionDate,
        decision_reference: decisionReference,
        report_status: 'decision_pending',
        updated_by: userData.user.id
      })
      .eq('id', reportId)
      .select(`
        *,
        project:project_id(id, project_name, project_code),
        exception:exception_id(id, exception_title, exception_level, exception_status)
      `)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error recording board decision:', error)
    throw error
  }
}
