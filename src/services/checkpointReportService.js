import { supabase } from './supabaseClient';

/**
 * Checkpoint Report Service - API functions for Checkpoint Report management
 * Handles CRUD operations for Checkpoint Reports based on Structured PM methodology
 */

/**
 * Create a new Checkpoint Report
 * @param {string} projectId - Project ID
 * @param {string} workPackageId - Work Package ID
 * @param {Object} reportData - Report data
 * @returns {Promise<Object>} Created report
 */
export async function createCheckpointReport(projectId, workPackageId, reportData) {
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

    // Get work package details
    const { data: workPackage } = await supabase
      .from('work_packages')
      .select('id, project_id, stage_boundary_id, assigned_to_user_id')
      .eq('id', workPackageId)
      .eq('is_deleted', false)
      .single();

    if (!workPackage) throw new Error('Work package not found');

    // Get previous report for carry-forward
    const previousReportId = await getPreviousCheckpointReport(projectId, workPackageId, null);

    const insertData = {
      ...reportData,
      project_id: projectId,
      work_package_id: workPackageId,
      stage_boundary_id: workPackage.stage_boundary_id || reportData.stage_boundary_id || null,
      reported_by_user_id: userData.id,
      author_id: reportData.author_id || userData.id,
      owner_id: reportData.owner_id || userData.id,
      client_id: reportData.client_id || null,
      version_no: reportData.version_no || '1.0',
      status: reportData.status || 'draft',
      checkpoint_date: reportData.checkpoint_date || new Date().toISOString().split('T')[0],
      report_date: reportData.report_date || new Date().toISOString().split('T')[0],
      date_of_this_revision: reportData.date_of_this_revision || new Date().toISOString().split('T')[0],
      created_by: userData.id,
      updated_by: userData.id
    };

    const { data, error } = await supabase
      .from('checkpoint_reports')
      .insert(insertData)
      .select(`
        *,
        reported_by:reported_by_user_id(id, full_name, email),
        author:author_id(id, full_name, email),
        owner:owner_id(id, full_name, email),
        client:client_id(id, full_name, email),
        work_package:work_package_id(id, work_package_name, work_package_code),
        project:project_id(id, project_name, project_code)
      `)
      .single();

    if (error) throw error;

    // Auto-carry forward open items from previous report
    if (previousReportId) {
      await carryForwardFromPrevious(data.id, previousReportId);
    }

    return data;
  } catch (error) {
    console.error('Error creating checkpoint report:', error);
    throw error;
  }
}

/**
 * Get Checkpoint Report by ID
 * @param {string} reportId - Report ID
 * @returns {Promise<Object>} Checkpoint Report
 */
export async function getCheckpointReportById(reportId) {
  try {
    const { data, error } = await supabase
      .from('checkpoint_reports')
      .select(`
        *,
        reported_by:reported_by_user_id(id, full_name, email),
        author:author_id(id, full_name, email),
        owner:owner_id(id, full_name, email),
        client:client_id(id, full_name, email),
        reviewed_by_user:reviewed_by(id, full_name, email),
        approved_by_user:approved_by(id, full_name, email),
        work_package:work_package_id(id, work_package_name, work_package_code, products_deliverables),
        project:project_id(id, project_name, project_code)
      `)
      .eq('id', reportId)
      .eq('is_deleted', false)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching checkpoint report:', error);
    throw error;
  }
}

/**
 * Get Checkpoint Reports by Project
 * @param {string} projectId - Project ID
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} Array of reports
 */
export async function getCheckpointReportsByProject(projectId, filters = {}) {
  try {
    let query = supabase
      .from('checkpoint_reports')
      .select(`
        *,
        reported_by:reported_by_user_id(id, full_name, email),
        author:author_id(id, full_name, email),
        owner:owner_id(id, full_name, email),
        work_package:work_package_id(id, work_package_name, work_package_code)
      `)
      .eq('project_id', projectId)
      .eq('is_deleted', false);

    if (filters.workPackageId) {
      query = query.eq('work_package_id', filters.workPackageId);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.stageBoundaryId) {
      query = query.eq('stage_boundary_id', filters.stageBoundaryId);
    }

    const { data, error } = await query
      .order('checkpoint_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching checkpoint reports by project:', error);
    throw error;
  }
}

/**
 * Get Checkpoint Reports by Work Package
 * @param {string} workPackageId - Work Package ID
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} Array of reports
 */
export async function getCheckpointReportsByWorkPackage(workPackageId, filters = {}) {
  try {
    let query = supabase
      .from('checkpoint_reports')
      .select(`
        *,
        reported_by:reported_by_user_id(id, full_name, email),
        author:author_id(id, full_name, email),
        owner:owner_id(id, full_name, email)
      `)
      .eq('work_package_id', workPackageId)
      .eq('is_deleted', false);

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query
      .order('checkpoint_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching checkpoint reports by work package:', error);
    throw error;
  }
}

/**
 * Update Checkpoint Report
 * @param {string} reportId - Report ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated report
 */
export async function updateCheckpointReport(reportId, updates) {
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
      .from('checkpoint_reports')
      .update(updateData)
      .eq('id', reportId)
      .select(`
        *,
        reported_by:reported_by_user_id(id, full_name, email),
        author:author_id(id, full_name, email),
        owner:owner_id(id, full_name, email),
        client:client_id(id, full_name, email),
        work_package:work_package_id(id, work_package_name, work_package_code)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating checkpoint report:', error);
    throw error;
  }
}

/**
 * Delete Checkpoint Report (soft delete)
 * @param {string} reportId - Report ID
 * @returns {Promise<void>}
 */
export async function deleteCheckpointReport(reportId) {
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
      .from('checkpoint_reports')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userData.id,
        updated_by: userData.id
      })
      .eq('id', reportId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting checkpoint report:', error);
    throw error;
  }
}

/**
 * Get Latest Checkpoint Report for Work Package
 * @param {string} workPackageId - Work Package ID
 * @returns {Promise<Object|null>} Latest report or null
 */
export async function getLatestCheckpointReport(workPackageId) {
  try {
    const { data, error } = await supabase
      .from('checkpoint_reports')
      .select(`
        *,
        reported_by:reported_by_user_id(id, full_name, email),
        author:author_id(id, full_name, email)
      `)
      .eq('work_package_id', workPackageId)
      .eq('is_deleted', false)
      .order('checkpoint_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error fetching latest checkpoint report:', error);
    throw error;
  }
}

/**
 * Get Previous Checkpoint Report
 * @param {string} projectId - Project ID
 * @param {string} workPackageId - Work Package ID
 * @param {string} currentReportId - Current Report ID (optional)
 * @returns {Promise<string|null>} Previous report ID or null
 */
export async function getPreviousCheckpointReport(projectId, workPackageId, currentReportId = null) {
  try {
    const { data, error } = await supabase.rpc('get_previous_checkpoint_report', {
      p_project_id: projectId,
      p_work_package_id: workPackageId,
      p_current_report_id: currentReportId
    });

    if (error) throw error;
    return data || null;
  } catch (error) {
    console.error('Error getting previous checkpoint report:', error);
    // Fallback to manual query if RPC fails
    try {
      let query = supabase
        .from('checkpoint_reports')
        .select('id')
        .eq('project_id', projectId)
        .eq('work_package_id', workPackageId)
        .eq('is_deleted', false)
        .order('checkpoint_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1);

      if (currentReportId) {
        query = query.neq('id', currentReportId);
      }

      const { data } = await query.single();
      return data?.id || null;
    } catch (fallbackError) {
      return null;
    }
  }
}

/**
 * Carry Forward Open Items from Previous Report
 * @param {string} targetReportId - Target Report ID
 * @param {string} sourceReportId - Source Report ID
 * @returns {Promise<number>} Number of items carried forward
 */
export async function carryForwardFromPrevious(targetReportId, sourceReportId) {
  try {
    const { data, error } = await supabase.rpc('carry_forward_open_items', {
      p_source_report_id: sourceReportId,
      p_target_report_id: targetReportId
    });

    if (error) throw error;
    return data || 0;
  } catch (error) {
    console.error('Error carrying forward items:', error);
    throw error;
  }
}

/**
 * Calculate Next Report Date
 * @param {string} workPackageId - Work Package ID
 * @returns {Promise<Date|null>} Next report date or null
 */
export async function calculateNextReportDate(workPackageId) {
  try {
    const latestReport = await getLatestCheckpointReport(workPackageId);
    if (!latestReport) return null;

    // Get work package checkpoint frequency
    const { data: workPackage } = await supabase
      .from('work_packages')
      .select('checkpoint_frequency')
      .eq('id', workPackageId)
      .single();

    if (!workPackage?.checkpoint_frequency) return null;

    // Parse frequency (e.g., "weekly", "bi-weekly", "monthly")
    const frequency = workPackage.checkpoint_frequency.toLowerCase();
    const lastDate = new Date(latestReport.checkpoint_date);
    const nextDate = new Date(lastDate);

    switch (frequency) {
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'bi-weekly':
      case 'biweekly':
        nextDate.setDate(nextDate.getDate() + 14);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      default:
        return null;
    }

    return nextDate;
  } catch (error) {
    console.error('Error calculating next report date:', error);
    return null;
  }
}

/**
 * Get Reporting Frequency
 * @param {string} workPackageId - Work Package ID
 * @returns {Promise<string|null>} Reporting frequency or null
 */
export async function getReportingFrequency(workPackageId) {
  try {
    const { data, error } = await supabase
      .from('work_packages')
      .select('checkpoint_frequency, reporting_arrangements')
      .eq('id', workPackageId)
      .single();

    if (error) throw error;
    return data?.checkpoint_frequency || null;
  } catch (error) {
    console.error('Error getting reporting frequency:', error);
    return null;
  }
}

/**
 * Get Tolerance Status for Work Package
 * @param {string} workPackageId - Work Package ID
 * @returns {Promise<Array>} Array of tolerance statuses
 */
export async function getToleranceStatus(workPackageId) {
  try {
    const { data, error } = await supabase.rpc('get_work_package_tolerance_status', {
      p_work_package_id: workPackageId
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting tolerance status:', error);
    return [];
  }
}

/**
 * Calculate Variance for Report
 * @param {string} reportId - Report ID
 * @returns {Promise<Object>} Variance data
 */
export async function calculateVariance(reportId) {
  try {
    const report = await getCheckpointReportById(reportId);
    if (!report) throw new Error('Report not found');

    const toleranceStatus = await getToleranceStatus(report.work_package_id);

    return {
      time: {
        actual: report.time_actual || 0,
        forecast: report.time_forecast || 0,
        status: report.tolerance_time_status || 'within'
      },
      cost: {
        actual: report.cost_actual || 0,
        forecast: report.cost_forecast || 0,
        status: report.tolerance_cost_status || 'within'
      },
      scope: {
        actual: report.scope_actual_percentage || 0,
        forecast: report.scope_forecast_percentage || 0,
        status: report.tolerance_scope_status || 'within'
      },
      toleranceStatus
    };
  } catch (error) {
    console.error('Error calculating variance:', error);
    throw error;
  }
}

/**
 * Run Quality Checks
 * @param {string} reportId - Report ID
 * @returns {Promise<Array>} Quality check results
 */
export async function runQualityChecks(reportId) {
  try {
    const { data, error } = await supabase.rpc('run_checkpoint_quality_checks', {
      p_checkpoint_report_id: reportId
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error running quality checks:', error);
    throw error;
  }
}

/**
 * Get Quality Check Status
 * @param {string} reportId - Report ID
 * @returns {Promise<Object>} Quality check summary
 */
export async function getQualityCheckStatus(reportId) {
  try {
    const { data, error } = await supabase.rpc('get_checkpoint_quality_summary', {
      p_checkpoint_report_id: reportId
    });

    if (error) throw error;
    return data?.[0] || null;
  } catch (error) {
    console.error('Error getting quality check status:', error);
    return null;
  }
}

/**
 * Check if Report Can Be Submitted for Approval
 * @param {string} reportId - Report ID
 * @returns {Promise<boolean>} True if can submit
 */
export async function canSubmitForApproval(reportId) {
  try {
    const qualityStatus = await getQualityCheckStatus(reportId);
    return qualityStatus?.can_submit || false;
  } catch (error) {
    console.error('Error checking if can submit:', error);
    return false;
  }
}
