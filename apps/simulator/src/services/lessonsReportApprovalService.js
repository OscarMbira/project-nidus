/**
 * Lessons Report Approval Service
 * Manages approval workflow for Lessons Reports
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * Add approver to report
 * @param {string} reportId - Report ID
 * @param {Object} approverData - Approver data
 * @returns {Promise<Object>} Created approval record
 */
export async function addApprover(reportId, approverData) {
  try {
    const approval = {
      lessons_report_id: reportId,
      approver_id: approverData.approver_id || null,
      approver_name: approverData.approver_name || '',
      approver_title: approverData.approver_title || null,
      approver_role: approverData.approver_role || null,
      approval_status: 'pending',
      version_approved: approverData.version_approved || null
    };

    const { data, error } = await platformDb
      .from('lessons_report_approvals')
      .insert(approval)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error adding approver:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Remove approver
 * @param {string} approvalId - Approval ID
 * @returns {Promise<Object>} Result
 */
export async function removeApprover(approvalId) {
  try {
    const { error } = await platformDb
      .from('lessons_report_approvals')
      .delete()
      .eq('id', approvalId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error removing approver:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Approve report
 * @param {string} approvalId - Approval ID
 * @param {string} approverId - Approver user ID
 * @param {string} comments - Approval comments
 * @param {string} conditions - Conditions attached to approval
 * @returns {Promise<Object>} Updated approval
 */
export async function approveReport(approvalId, approverId, comments = null, conditions = null) {
  try {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Get user ID
    const { data: userRecord, error: userError } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (userError || !userRecord) {
      return { success: false, error: 'User record not found' };
    }

    // Get approval to get report ID
    const { data: approval, error: approvalError } = await platformDb
      .from('lessons_report_approvals')
      .select('lessons_report_id, version_approved')
      .eq('id', approvalId)
      .single();

    if (approvalError || !approval) {
      return { success: false, error: 'Approval not found' };
    }

    // Update approval
    const { data: updatedApproval, error: updateError } = await platformDb
      .from('lessons_report_approvals')
      .update({
        approval_status: 'approved',
        approval_date: new Date().toISOString().split('T')[0],
        approval_comments: comments,
        conditions: conditions,
        updated_at: new Date().toISOString()
      })
      .eq('id', approvalId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Check if all approvals are complete
    const { data: allApprovals } = await platformDb
      .from('lessons_report_approvals')
      .select('approval_status')
      .eq('lessons_report_id', approval.lessons_report_id);

    const allApproved = allApprovals?.every(a => a.approval_status === 'approved') || false;

    // If all approved, update report status
    if (allApproved) {
      await platformDb
        .from('lessons_reports')
        .update({
          report_status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by_id: userRecord.id
        })
        .eq('id', approval.lessons_report_id);
    }

    return { success: true, data: updatedApproval };
  } catch (error) {
    console.error('Error approving report:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Reject report
 * @param {string} approvalId - Approval ID
 * @param {string} approverId - Approver user ID
 * @param {string} comments - Rejection comments
 * @returns {Promise<Object>} Updated approval
 */
export async function rejectReport(approvalId, approverId, comments) {
  try {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Get user ID
    const { data: userRecord } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    // Get approval to get report ID
    const { data: approval } = await platformDb
      .from('lessons_report_approvals')
      .select('lessons_report_id')
      .eq('id', approvalId)
      .single();

    // Update approval
    const { data: updatedApproval, error: updateError } = await platformDb
      .from('lessons_report_approvals')
      .update({
        approval_status: 'rejected',
        approval_date: new Date().toISOString().split('T')[0],
        approval_comments: comments,
        updated_at: new Date().toISOString()
      })
      .eq('id', approvalId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Update report status to under_review (can be resubmitted)
    if (approval) {
      await platformDb
        .from('lessons_reports')
        .update({
          report_status: 'under_review'
        })
        .eq('id', approval.lessons_report_id);
    }

    return { success: true, data: updatedApproval };
  } catch (error) {
    console.error('Error rejecting report:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Defer report
 * @param {string} approvalId - Approval ID
 * @param {string} approverId - Approver user ID
 * @param {string} comments - Deferral comments
 * @returns {Promise<Object>} Updated approval
 */
export async function deferReport(approvalId, approverId, comments) {
  try {
    const { data: updatedApproval, error } = await platformDb
      .from('lessons_report_approvals')
      .update({
        approval_status: 'deferred',
        approval_date: new Date().toISOString().split('T')[0],
        approval_comments: comments,
        updated_at: new Date().toISOString()
      })
      .eq('id', approvalId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data: updatedApproval };
  } catch (error) {
    console.error('Error deferring report:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get approvals for report
 * @param {string} reportId - Report ID
 * @returns {Promise<Object>} Approvals list
 */
export async function getApprovals(reportId) {
  try {
    const { data, error } = await platformDb
      .from('lessons_report_approvals')
      .select(`
        *,
        approver:approver_id(id, full_name, email)
      `)
      .eq('lessons_report_id', reportId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching approvals:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get pending approvals for user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Pending approvals list
 */
export async function getPendingApprovals(userId) {
  try {
    const { data, error } = await platformDb
      .from('lessons_report_approvals')
      .select(`
        *,
        report:lessons_report_id(
          id,
          report_reference,
          report_title:report_reference,
          project:project_id(id, project_name)
        )
      `)
      .eq('approver_id', userId)
      .eq('approval_status', 'pending')
      .order('created_at', { ascending: true });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    return { success: false, error: error.message };
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
