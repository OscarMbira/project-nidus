import { supabase } from './supabaseClient';

/**
 * Checkpoint Report Approval Service
 * Handles approval workflow for Checkpoint Reports
 */

/**
 * Submit Report for Approval
 * @param {string} reportId - Report ID
 * @param {string} submittedToId - User ID to submit to
 * @returns {Promise<Object>} Updated report
 */
export async function submitForApproval(reportId, submittedToId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!userData) throw new Error('User not found');

    // Update report status
    const { data, error } = await supabase
      .from('checkpoint_reports')
      .update({
        status: 'submitted',
        updated_by: userData.id
      })
      .eq('id', reportId)
      .select()
      .single();

    if (error) throw error;

    // Create approval record
    const { data: approver } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('id', submittedToId)
      .single();

    if (approver) {
      await supabase
        .from('checkpoint_report_approvals')
        .insert({
          checkpoint_report_id: reportId,
          approver_id: submittedToId,
          approver_name: approver.full_name || approver.email,
          approval_status: 'pending',
          version_approved: data.version_no
        });
    }

    return data;
  } catch (error) {
    console.error('Error submitting for approval:', error);
    throw error;
  }
}

/**
 * Approve Report
 * @param {string} reportId - Report ID
 * @param {string} approvalId - Approval ID (optional)
 * @param {string} comments - Optional comments
 * @returns {Promise<Object>} Updated report and approval
 */
export async function approveReport(reportId, approvalId = null, comments = null) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: userData } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('auth_user_id', user.id)
      .single();

    if (!userData) throw new Error('User not found');

    // Get report
    const { data: report } = await supabase
      .from('checkpoint_reports')
      .select('version_no')
      .eq('id', reportId)
      .single();

    // Update or create approval
    let approvalData;
    if (approvalId) {
      const { data, error } = await supabase
        .from('checkpoint_report_approvals')
        .update({
          approval_status: 'approved',
          approval_date: new Date().toISOString().split('T')[0],
          comments: comments,
          approver_name: userData.full_name || userData.email
        })
        .eq('id', approvalId)
        .select()
        .single();

      if (error) throw error;
      approvalData = data;
    } else {
      const { data, error } = await supabase
        .from('checkpoint_report_approvals')
        .insert({
          checkpoint_report_id: reportId,
          approver_id: userData.id,
          approver_name: userData.full_name || userData.email,
          approval_status: 'approved',
          approval_date: new Date().toISOString().split('T')[0],
          comments: comments,
          version_approved: report.version_no
        })
        .select()
        .single();

      if (error) throw error;
      approvalData = data;
    }

    // Update report status
    const { data: updatedReport, error: updateError } = await supabase
      .from('checkpoint_reports')
      .update({
        status: 'approved',
        approved_by: userData.id,
        approved_at: new Date().toISOString(),
        approval_notes: comments,
        updated_by: userData.id
      })
      .eq('id', reportId)
      .select()
      .single();

    if (updateError) throw updateError;

    return {
      report: updatedReport,
      approval: approvalData
    };
  } catch (error) {
    console.error('Error approving report:', error);
    throw error;
  }
}

/**
 * Reject Report
 * @param {string} reportId - Report ID
 * @param {string} approvalId - Approval ID (optional)
 * @param {string} comments - Rejection comments
 * @returns {Promise<Object>} Updated report and approval
 */
export async function rejectReport(reportId, approvalId = null, comments) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: userData } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('auth_user_id', user.id)
      .single();

    if (!userData) throw new Error('User not found');

    // Get report
    const { data: report } = await supabase
      .from('checkpoint_reports')
      .select('version_no')
      .eq('id', reportId)
      .single();

    // Update or create approval
    let approvalData;
    if (approvalId) {
      const { data, error } = await supabase
        .from('checkpoint_report_approvals')
        .update({
          approval_status: 'rejected',
          approval_date: new Date().toISOString().split('T')[0],
          comments: comments,
          approver_name: userData.full_name || userData.email
        })
        .eq('id', approvalId)
        .select()
        .single();

      if (error) throw error;
      approvalData = data;
    } else {
      const { data, error } = await supabase
        .from('checkpoint_report_approvals')
        .insert({
          checkpoint_report_id: reportId,
          approver_id: userData.id,
          approver_name: userData.full_name || userData.email,
          approval_status: 'rejected',
          approval_date: new Date().toISOString().split('T')[0],
          comments: comments,
          version_approved: report.version_no
        })
        .select()
        .single();

      if (error) throw error;
      approvalData = data;
    }

    // Update report status
    const { data: updatedReport, error: updateError } = await supabase
      .from('checkpoint_reports')
      .update({
        status: 'rejected',
        reviewed_by: userData.id,
        reviewed_at: new Date().toISOString(),
        review_notes: comments,
        updated_by: userData.id
      })
      .eq('id', reportId)
      .select()
      .single();

    if (updateError) throw updateError;

    return {
      report: updatedReport,
      approval: approvalData
    };
  } catch (error) {
    console.error('Error rejecting report:', error);
    throw error;
  }
}

/**
 * Get Approval Status
 * @param {string} reportId - Report ID
 * @returns {Promise<Array>} Array of approvals
 */
export async function getApprovalStatus(reportId) {
  try {
    const { data, error } = await supabase
      .from('checkpoint_report_approvals')
      .select(`
        *,
        approver:approver_id(id, full_name, email)
      `)
      .eq('checkpoint_report_id', reportId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching approval status:', error);
    throw error;
  }
}

/**
 * Get Pending Approvals
 * @param {string} userId - User ID (optional, defaults to current user)
 * @returns {Promise<Array>} Array of pending approvals
 */
export async function getPendingApprovals(userId = null) {
  try {
    let approverId = userId;

    if (!approverId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (!userData) throw new Error('User not found');
      approverId = userData.id;
    }

    const { data, error } = await supabase
      .from('checkpoint_report_approvals')
      .select(`
        *,
        checkpoint_report:checkpoint_report_id(
          id,
          document_ref,
          report_title,
          checkpoint_date,
          status,
          work_package:work_package_id(id, work_package_name)
        ),
        approver:approver_id(id, full_name, email)
      `)
      .eq('approver_id', approverId)
      .eq('approval_status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    throw error;
  }
}
