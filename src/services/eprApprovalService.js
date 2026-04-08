/**
 * End Project Report Approval Service
 * Manages approval workflow
 */

import { supabase } from './supabaseClient'

/**
 * Submit for Approval
 * @param {string} reportId - Report ID
 * @param {string} approverId - Approver user ID
 * @returns {Promise<Object>} Approval record
 */
export async function submitForApproval(reportId, approverId) {
  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      throw new Error('User not authenticated')
    }

    // Get approver details
    const { data: approver } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('id', approverId)
      .single()

    // Get report version
    const { data: report } = await supabase
      .from('end_project_reports')
      .select('version_no')
      .eq('id', reportId)
      .single()

    // Create approval record
    const { data, error } = await supabase
      .from('end_project_report_approvals')
      .insert({
        end_project_report_id: reportId,
        approver_id: approverId,
        approver_name: approver?.full_name || approver?.email,
        approval_status: 'pending',
        version_approved: report?.version_no || '1.0'
      })
      .select(`
        *,
        approver:approver_id(id, full_name, email)
      `)
      .single()

    if (error) throw error

    // Update report status
    await supabase
      .from('end_project_reports')
      .update({
        approval_status: 'submitted'
      })
      .eq('id', reportId)

    return data
  } catch (error) {
    console.error('Error submitting for approval:', error)
    throw error
  }
}

/**
 * Approve Report
 * @param {string} reportId - Report ID
 * @param {string} approvalId - Approval record ID
 * @param {string} comments - Approval comments
 * @returns {Promise<Object>} Updated approval
 */
export async function approveReport(reportId, approvalId, comments = null) {
  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('end_project_report_approvals')
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

    if (error) throw error

    // Update report status if all approvals are approved
    const { data: approvals } = await supabase
      .from('end_project_report_approvals')
      .select('approval_status')
      .eq('end_project_report_id', reportId)

    const allApproved = approvals?.every(a => a.approval_status === 'approved')

    if (allApproved) {
      await supabase
        .from('end_project_reports')
        .update({
          approval_status: 'approved'
        })
        .eq('id', reportId)
    }

    return data
  } catch (error) {
    console.error('Error approving report:', error)
    throw error
  }
}

/**
 * Reject Report
 * @param {string} reportId - Report ID
 * @param {string} approvalId - Approval record ID
 * @param {string} comments - Rejection comments
 * @returns {Promise<Object>} Updated approval
 */
export async function rejectReport(reportId, approvalId, comments) {
  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('end_project_report_approvals')
      .update({
        approval_status: 'rejected',
        comments: comments
      })
      .eq('id', approvalId)
      .select(`
        *,
        approver:approver_id(id, full_name, email)
      `)
      .single()

    if (error) throw error

    // Update report status to rejected
    await supabase
      .from('end_project_reports')
      .update({
        approval_status: 'rejected'
      })
      .eq('id', reportId)

    return data
  } catch (error) {
    console.error('Error rejecting report:', error)
    throw error
  }
}

/**
 * Get Approval Status
 * @param {string} reportId - Report ID
 * @returns {Promise<Array>} Approval records
 */
export async function getApprovalStatus(reportId) {
  try {
    const { data, error } = await supabase
      .from('end_project_report_approvals')
      .select(`
        *,
        approver:approver_id(id, full_name, email)
      `)
      .eq('end_project_report_id', reportId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching approval status:', error)
    throw error
  }
}

/**
 * Get Pending Approvals for User
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Pending approvals
 */
export async function getPendingApprovals(userId) {
  try {
    const { data, error } = await supabase
      .from('end_project_report_approvals')
      .select(`
        *,
        report:end_project_reports(
          id,
          report_title,
          document_ref,
          project:projects(id, project_name)
        ),
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
