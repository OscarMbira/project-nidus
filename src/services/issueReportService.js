import { supabase } from './supabaseClient';

/**
 * Issue Report Service - API functions for Issue Report management
 * Handles CRUD operations for formal Issue Reports
 */

/**
 * Create a new Issue Report
 * @param {string} issueId - Issue ID
 * @param {Object} reportData - Report data
 * @returns {Promise<Object>} Created report
 */
export async function createIssueReport(issueId, reportData) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get user details
    const { data: userData } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('auth_user_id', user.id)
      .single();

    if (!userData) throw new Error('User not found');

    // Get issue details to populate project_id and issue_register_id
    const { data: issue } = await supabase
      .from('issues')
      .select('id, project_id, issue_register_id, issue_identifier, issue_type, title, description, raised_by_id, author_id, owner_id, date_raised')
      .eq('id', issueId)
      .eq('is_deleted', false)
      .single();

    if (!issue) throw new Error('Issue not found');

    // Check if report already exists for this issue
    const { data: existingReport } = await supabase
      .from('issue_reports')
      .select('id')
      .eq('issue_id', issueId)
      .eq('is_deleted', false)
      .single();

    if (existingReport) {
      throw new Error('An Issue Report already exists for this issue');
    }

    const insertData = {
      ...reportData,
      issue_id: issueId,
      project_id: issue.project_id,
      issue_register_id: issue.issue_register_id,
      author_id: reportData.author_id || userData.id,
      prepared_by_id: reportData.prepared_by_id || userData.id,
      report_date: reportData.report_date || new Date().toISOString().split('T')[0],
      report_status: reportData.report_status || 'draft',
      version_no: reportData.version_no || '1.0',
      created_by: userData.id,
      updated_by: userData.id
    };

    const { data, error } = await supabase
      .from('issue_reports')
      .insert(insertData)
      .select(`
        *,
        author:author_id(id, full_name, email),
        prepared_by:prepared_by_id(id, full_name, email),
        decision_made_by:decision_made_by_id(id, full_name, email),
        closure_verified_by:closure_verified_by_id(id, full_name, email),
        submitted_to:submitted_to_id(id, full_name, email),
        reviewed_by:reviewed_by_id(id, full_name, email),
        approved_by:approved_by_id(id, full_name, email)
      `)
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error creating issue report:', error);
    throw error;
  }
}

/**
 * Get Issue Report by ID
 * @param {string} reportId - Report ID
 * @returns {Promise<Object>} Issue Report
 */
export async function getIssueReportById(reportId) {
  try {
    const { data, error } = await supabase
      .from('issue_reports')
      .select(`
        *,
        author:author_id(id, full_name, email),
        prepared_by:prepared_by_id(id, full_name, email),
        decision_made_by:decision_made_by_id(id, full_name, email),
        closure_verified_by:closure_verified_by_id(id, full_name, email),
        submitted_to:submitted_to_id(id, full_name, email),
        reviewed_by:reviewed_by_id(id, full_name, email),
        approved_by:approved_by_id(id, full_name, email),
        issue:issues(id, issue_identifier, title, status, priority, severity)
      `)
      .eq('id', reportId)
      .eq('is_deleted', false)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching issue report:', error);
    throw error;
  }
}

/**
 * Get Issue Report by Issue ID
 * @param {string} issueId - Issue ID
 * @returns {Promise<Object|null>} Issue Report or null
 */
export async function getIssueReportByIssueId(issueId) {
  try {
    const { data, error } = await supabase
      .from('issue_reports')
      .select(`
        *,
        author:author_id(id, full_name, email),
        prepared_by:prepared_by_id(id, full_name, email),
        decision_made_by:decision_made_by_id(id, full_name, email),
        closure_verified_by:closure_verified_by_id(id, full_name, email),
        submitted_to:submitted_to_id(id, full_name, email),
        reviewed_by:reviewed_by_id(id, full_name, email),
        approved_by:approved_by_id(id, full_name, email)
      `)
      .eq('issue_id', issueId)
      .eq('is_deleted', false)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error fetching issue report by issue ID:', error);
    throw error;
  }
}

/**
 * Update Issue Report
 * @param {string} reportId - Report ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated report
 */
export async function updateIssueReport(reportId, updates) {
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
      ...updates,
      updated_by: userData.id
    };

    const { data, error } = await supabase
      .from('issue_reports')
      .update(updateData)
      .eq('id', reportId)
      .select(`
        *,
        author:author_id(id, full_name, email),
        prepared_by:prepared_by_id(id, full_name, email),
        decision_made_by:decision_made_by_id(id, full_name, email),
        closure_verified_by:closure_verified_by_id(id, full_name, email),
        submitted_to:submitted_to_id(id, full_name, email),
        reviewed_by:reviewed_by_id(id, full_name, email),
        approved_by:approved_by_id(id, full_name, email)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating issue report:', error);
    throw error;
  }
}

/**
 * Delete Issue Report (soft delete)
 * @param {string} reportId - Report ID
 * @returns {Promise<void>}
 */
export async function deleteIssueReport(reportId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!userData) throw new Error('User not found');

    const { error } = await supabase
      .from('issue_reports')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userData.id,
        updated_by: userData.id
      })
      .eq('id', reportId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting issue report:', error);
    throw error;
  }
}

/**
 * Get all Issue Reports for a project
 * @param {string} projectId - Project ID
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} Array of reports
 */
export async function getIssueReportsByProject(projectId, filters = {}) {
  try {
    let query = supabase
      .from('issue_reports')
      .select(`
        *,
        author:author_id(id, full_name, email),
        prepared_by:prepared_by_id(id, full_name, email),
        issue:issues(id, issue_identifier, title, status, priority, severity)
      `)
      .eq('project_id', projectId)
      .eq('is_deleted', false);

    // Apply filters
    if (filters.status) {
      query = query.eq('report_status', filters.status);
    }
    if (filters.decision_required !== undefined) {
      query = query.eq('decision_required', filters.decision_required);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching issue reports:', error);
    throw error;
  }
}

/**
 * Get Issue Reports requiring decision
 * @param {string} projectId - Project ID (optional)
 * @returns {Promise<Array>} Array of reports
 */
export async function getIssueReportsRequiringDecision(projectId = null) {
  try {
    const { data, error } = await supabase.rpc('get_issue_reports_requiring_decision', {
      p_project_id: projectId
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching reports requiring decision:', error);
    throw error;
  }
}

/**
 * Generate report reference
 * @param {string} issueId - Issue ID
 * @returns {Promise<string>} Report reference
 */
export async function generateReportReference(issueId) {
  try {
    const { data, error } = await supabase.rpc('generate_issue_report_reference', {
      p_issue_id: issueId
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error generating report reference:', error);
    throw error;
  }
}

/**
 * Validate report completeness
 * @param {string} reportId - Report ID
 * @returns {Promise<Array>} Validation results
 */
export async function validateReportCompleteness(reportId) {
  try {
    const { data, error } = await supabase.rpc('validate_issue_report_completeness', {
      p_report_id: reportId
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error validating report completeness:', error);
    throw error;
  }
}

/**
 * Auto-populate report from issue
 * @param {string} reportId - Report ID
 * @param {string} issueId - Issue ID
 * @returns {Promise<void>}
 */
export async function autoPopulateFromIssue(reportId, issueId) {
  try {
    const { error } = await supabase.rpc('auto_populate_issue_report_from_issue', {
      p_report_id: reportId,
      p_issue_id: issueId
    });

    if (error) throw error;
  } catch (error) {
    console.error('Error auto-populating report:', error);
    throw error;
  }
}

/**
 * Check if report can be created for issue
 * @param {string} issueId - Issue ID
 * @returns {Promise<boolean>} True if can create
 */
export async function canCreateReport(issueId) {
  try {
    const { data, error } = await supabase.rpc('can_create_issue_report', {
      p_issue_id: issueId
    });

    if (error) throw error;
    return data === true;
  } catch (error) {
    console.error('Error checking if can create report:', error);
    throw error;
  }
}

/**
 * Submit report for review
 * @param {string} reportId - Report ID
 * @param {string} submittedToId - User ID to submit to
 * @returns {Promise<Object>} Updated report
 */
export async function submitReport(reportId, submittedToId = null) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!userData) throw new Error('User not found');

    // Validate completeness before submission
    const validation = await validateReportCompleteness(reportId);
    const incompleteSections = validation.filter(v => !v.is_complete);
    if (incompleteSections.length > 0) {
      throw new Error(`Report is incomplete. Please complete: ${incompleteSections.map(s => s.section_name).join(', ')}`);
    }

    const updates = {
      report_status: 'submitted',
      submitted_at: new Date().toISOString(),
      submitted_to_id: submittedToId,
      updated_by: userData.id
    };

    const report = await updateIssueReport(reportId, updates);

    // Send notifications
    try {
      const { notifyReportSubmitted, notifyDecisionRequired } = await import('./issueReportNotificationService');
      await notifyReportSubmitted(reportId, submittedToId);
      if (report.decision_required) {
        await notifyDecisionRequired(reportId);
      }
    } catch (notifError) {
      console.error('Error sending notifications:', notifError);
      // Don't fail submission if notification fails
    }

    return report;
  } catch (error) {
    console.error('Error submitting report:', error);
    throw error;
  }
}

/**
 * Close report
 * @param {string} reportId - Report ID
 * @param {Object} closureData - Closure data
 * @returns {Promise<Object>} Updated report
 */
export async function closeReport(reportId, closureData) {
  try {
    const updates = {
      report_status: 'closed',
      closure_date: closureData.closure_date || new Date().toISOString().split('T')[0],
      closure_outcome: closureData.closure_outcome,
      closure_verified_by_id: closureData.closure_verified_by_id,
      follow_up_required: closureData.follow_up_required || false,
      follow_up_details: closureData.follow_up_details,
      lessons_captured: closureData.lessons_captured || false,
      lessons_summary: closureData.lessons_summary
    };

    return await updateIssueReport(reportId, updates);
  } catch (error) {
    console.error('Error closing report:', error);
    throw error;
  }
}

/**
 * Link report to decision
 * @param {string} reportId - Report ID
 * @param {string} decisionId - Decision ID
 * @returns {Promise<void>}
 */
export async function linkToDecision(reportId, decisionId) {
  try {
    const { error } = await supabase.rpc('link_issue_report_to_decision', {
      p_report_id: reportId,
      p_decision_id: decisionId
    });

    if (error) throw error;
  } catch (error) {
    console.error('Error linking report to decision:', error);
    throw error;
  }
}

export default {
  createIssueReport,
  getIssueReportById,
  getIssueReportByIssueId,
  updateIssueReport,
  deleteIssueReport,
  getIssueReportsByProject,
  getIssueReportsRequiringDecision,
  generateReportReference,
  validateReportCompleteness,
  autoPopulateFromIssue,
  canCreateReport,
  submitReport,
  closeReport,
  linkToDecision
};
