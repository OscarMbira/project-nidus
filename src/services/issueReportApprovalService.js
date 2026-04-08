import { supabase } from './supabaseClient';

/**
 * Issue Report Approval Service - API functions for Issue Report Approvals
 * Handles approval workflow for Issue Reports
 */

/**
 * Add an approver to an Issue Report
 * @param {string} reportId - Report ID
 * @param {Object} approverData - Approver data
 * @returns {Promise<Object>} Created approval record
 */
export async function addApprover(reportId, approverData) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!userData) throw new Error('User not found');

    const insertData = {
      ...approverData,
      issue_report_id: reportId,
      approval_status: 'pending',
      created_by: userData.id,
      updated_by: userData.id
    };

    const { data, error } = await supabase
      .from('issue_report_approvals')
      .insert(insertData)
      .select(`
        *,
        approver:approver_id(id, full_name, email)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding approver:', error);
    throw error;
  }
}

/**
 * Remove an approver
 * @param {string} approvalId - Approval ID
 * @returns {Promise<void>}
 */
export async function removeApprover(approvalId) {
  try {
    const { error } = await supabase
      .from('issue_report_approvals')
      .delete()
      .eq('id', approvalId)
      .eq('approval_status', 'pending'); // Only allow removal of pending approvals

    if (error) throw error;
  } catch (error) {
    console.error('Error removing approver:', error);
    throw error;
  }
}

/**
 * Approve a report
 * @param {string} approvalId - Approval ID
 * @param {string} approverId - Approver user ID
 * @param {string} comments - Approval comments
 * @param {string} conditions - Conditions attached to approval
 * @returns {Promise<Object>} Updated approval
 */
export async function approveReport(approvalId, approverId, comments = null, conditions = null) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!userData) throw new Error('User not found');

    // Get the report to update version_approved
    const { data: approval } = await supabase
      .from('issue_report_approvals')
      .select('issue_report_id, issue_reports!inner(version_no)')
      .eq('id', approvalId)
      .single();

    if (!approval) throw new Error('Approval not found');

    const updateData = {
      approval_status: 'approved',
      approval_date: new Date().toISOString().split('T')[0],
      approval_comments: comments,
      conditions: conditions,
      version_approved: approval.issue_reports?.version_no || '1.0',
      updated_by: userData.id
    };

    const { data, error } = await supabase
      .from('issue_report_approvals')
      .update(updateData)
      .eq('id', approvalId)
      .select(`
        *,
        approver:approver_id(id, full_name, email)
      `)
      .single();

    if (error) throw error;

    // Update report status if all required approvals are in
    await checkAllApprovalsComplete(approval.issue_report_id);

    // Send notification
    try {
      const { notifyApprovalDecision } = await import('./issueReportNotificationService');
      await notifyApprovalDecision(approval.issue_report_id, approvalId, 'approved', comments);
    } catch (notifError) {
      console.error('Error sending notification:', notifError);
      // Don't fail approval if notification fails
    }

    return data;
  } catch (error) {
    console.error('Error approving report:', error);
    throw error;
  }
}

/**
 * Reject a report
 * @param {string} approvalId - Approval ID
 * @param {string} approverId - Approver user ID
 * @param {string} comments - Rejection comments
 * @returns {Promise<Object>} Updated approval
 */
export async function rejectReport(approvalId, approverId, comments = null) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!userData) throw new Error('User not found');

    const updateData = {
      approval_status: 'rejected',
      approval_date: new Date().toISOString().split('T')[0],
      approval_comments: comments,
      updated_by: userData.id
    };

    const { data, error } = await supabase
      .from('issue_report_approvals')
      .update(updateData)
      .eq('id', approvalId)
      .select(`
        *,
        approver:approver_id(id, full_name, email)
      `)
      .single();

    if (error) throw error;

    // Update report status back to draft/submitted
    const { data: approval } = await supabase
      .from('issue_report_approvals')
      .select('issue_report_id')
      .eq('id', approvalId)
      .single();

    if (approval) {
      await supabase
        .from('issue_reports')
        .update({ report_status: 'submitted' })
        .eq('id', approval.issue_report_id);
    }

    // Send notification
    try {
      const { notifyApprovalDecision } = await import('./issueReportNotificationService');
      await notifyApprovalDecision(approval.issue_report_id, approvalId, 'rejected', comments);
    } catch (notifError) {
      console.error('Error sending notification:', notifError);
      // Don't fail rejection if notification fails
    }

    return data;
  } catch (error) {
    console.error('Error rejecting report:', error);
    throw error;
  }
}

/**
 * Defer a report approval
 * @param {string} approvalId - Approval ID
 * @param {string} approverId - Approver user ID
 * @param {string} comments - Deferral comments
 * @returns {Promise<Object>} Updated approval
 */
export async function deferReport(approvalId, approverId, comments = null) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!userData) throw new Error('User not found');

    const updateData = {
      approval_status: 'deferred',
      approval_date: new Date().toISOString().split('T')[0],
      approval_comments: comments,
      updated_by: userData.id
    };

    const { data, error } = await supabase
      .from('issue_report_approvals')
      .update(updateData)
      .eq('id', approvalId)
      .select(`
        *,
        approver:approver_id(id, full_name, email)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error deferring report:', error);
    throw error;
  }
}

/**
 * Get all approvals for a report
 * @param {string} reportId - Report ID
 * @returns {Promise<Array>} Array of approvals
 */
export async function getApprovals(reportId) {
  try {
    const { data, error } = await supabase
      .from('issue_report_approvals')
      .select(`
        *,
        approver:approver_id(id, full_name, email)
      `)
      .eq('issue_report_id', reportId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching approvals:', error);
    throw error;
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
      .from('issue_report_approvals')
      .select(`
        *,
        issue_report:issue_reports(
          id,
          report_reference,
          issue_identifier,
          issue_title,
          report_status,
          version_no,
          issue:issues(id, title, status)
        )
      `)
      .eq('approver_id', userId)
      .eq('approval_status', 'pending')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    throw error;
  }
}

/**
 * Check if all required approvals are complete and update report status
 * @param {string} reportId - Report ID
 * @returns {Promise<void>}
 */
async function checkAllApprovalsComplete(reportId) {
  try {
    const { data: approvals } = await supabase
      .from('issue_report_approvals')
      .select('approval_status')
      .eq('issue_report_id', reportId);

    if (!approvals || approvals.length === 0) return;

    const hasRejected = approvals.some(a => a.approval_status === 'rejected');
    const allApproved = approvals.every(a => a.approval_status === 'approved');
    const hasDeferred = approvals.some(a => a.approval_status === 'deferred');
    const hasPending = approvals.some(a => a.approval_status === 'pending');

    let newStatus = null;
    if (hasRejected) {
      newStatus = 'submitted'; // Back to submitted if rejected
    } else if (allApproved && !hasPending) {
      newStatus = 'approved'; // All approved
    } else if (!hasPending && !hasDeferred) {
      newStatus = 'under_review'; // Some approved, none pending or deferred
    }

    if (newStatus) {
      await supabase
        .from('issue_reports')
        .update({ report_status: newStatus })
        .eq('id', reportId);
    }
  } catch (error) {
    console.error('Error checking approvals:', error);
    // Don't throw - this is a helper function
  }
}

export default {
  addApprover,
  removeApprover,
  approveReport,
  rejectReport,
  deferReport,
  getApprovals,
  getPendingApprovals
};
