/**
 * Exception Report Service
 * Main service for Exception Report CRUD operations and core functionality
 */

import { supabase } from './supabaseClient'

/**
 * Generate Document Reference
 * @param {string} projectId - Project ID
 * @returns {Promise<string>} Document reference
 */
export async function generateDocumentRef(projectId) {
  try {
    const { data, error } = await supabase.rpc('generate_exception_report_ref', {
      p_project_id: projectId
    })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error generating document reference:', error)
    throw error
  }
}

/**
 * Get Current Plan Status
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Current plan status snapshot
 */
export async function getCurrentPlanStatus(projectId) {
  try {
    const { data, error } = await supabase.rpc('get_current_plan_status', {
      p_project_id: projectId
    })

    if (error) throw error
    return data?.[0] || null
  } catch (error) {
    console.error('Error getting current plan status:', error)
    throw error
  }
}

/**
 * Get Tolerance Breach Details
 * @param {string} exceptionId - Exception ID
 * @returns {Promise<Object>} Tolerance breach details
 */
export async function getToleranceBreachDetails(exceptionId) {
  try {
    const { data, error } = await supabase.rpc('get_tolerance_breach_details', {
      p_exception_id: exceptionId
    })

    if (error) throw error
    return data?.[0] || null
  } catch (error) {
    console.error('Error getting tolerance breach details:', error)
    throw error
  }
}

/**
 * Create Exception Report
 * @param {string} projectId - Project ID
 * @param {string} exceptionId - Exception ID
 * @param {Object} reportData - Report data
 * @returns {Promise<Object>} Created report
 */
export async function createExceptionReport(projectId, exceptionId, reportData) {
  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      throw new Error('User not authenticated')
    }

    const insertData = {
      project_id: projectId,
      exception_id: exceptionId,
      exception_plan_id: reportData.exception_plan_id || null,
      stage_boundary_id: reportData.stage_boundary_id || null,
      board_id: reportData.board_id || null,
      report_title: reportData.report_title || 'Exception Report',
      report_date: reportData.report_date || new Date().toISOString().split('T')[0],
      author_id: reportData.author_id || userData.user.id,
      owner_id: reportData.owner_id || null,
      client_id: reportData.client_id || null,
      exception_title: reportData.exception_title || '',
      exception_summary: reportData.exception_summary || null,
      tolerance_type: reportData.tolerance_type || null,
      urgency: reportData.urgency || 'medium',
      report_status: 'draft',
      created_by: userData.user.id
    }

    const { data, error } = await supabase
      .from('exception_reports')
      .insert(insertData)
      .select(`
        *,
        project:project_id(id, project_name, project_code),
        exception:exception_id(id, exception_title, exception_level, exception_status),
        author:author_id(id, full_name, email),
        owner:owner_id(id, full_name, email),
        client:client_id(id, full_name, email)
      `)
      .single()

    if (error) throw error

    // Quality checks are auto-initialized by trigger
    return data
  } catch (error) {
    console.error('Error creating exception report:', error)
    throw error
  }
}

/**
 * Get Exception Report by ID
 * @param {string} reportId - Report ID
 * @returns {Promise<Object>} Exception report
 */
export async function getExceptionReportById(reportId) {
  try {
    const { data, error } = await supabase
      .from('exception_reports')
      .select(`
        *,
        project:project_id(id, project_name, project_code),
        exception:exception_id(id, exception_title, exception_level, exception_status, raised_at),
        exception_plan:exception_plan_id(id, plan_title, plan_reference),
        stage_boundary:stage_boundary_id(id, stage_name, stage_number),
        board:board_id(id, board_name),
        author:author_id(id, full_name, email),
        owner:owner_id(id, full_name, email),
        client:client_id(id, full_name, email),
        submitted_by_user:submitted_by(id, full_name, email)
      `)
      .eq('id', reportId)
      .eq('is_deleted', false)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching exception report:', error)
    throw error
  }
}

/**
 * Get Exception Reports by Project
 * @param {string} projectId - Project ID
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} Exception reports
 */
export async function getExceptionReportsByProject(projectId, filters = {}) {
  try {
    let query = supabase
      .from('exception_reports')
      .select(`
        *,
        project:project_id(id, project_name, project_code),
        exception:exception_id(id, exception_title, exception_level, exception_status),
        author:author_id(id, full_name, email)
      `)
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .order('report_date', { ascending: false })

    if (filters.status) {
      query = query.eq('report_status', filters.status)
    }

    if (filters.urgency) {
      query = query.eq('urgency', filters.urgency)
    }

    if (filters.exception_id) {
      query = query.eq('exception_id', filters.exception_id)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching exception reports:', error)
    throw error
  }
}

/**
 * Get Exception Report by Exception
 * @param {string} exceptionId - Exception ID
 * @returns {Promise<Object>} Exception report
 */
export async function getExceptionReportByException(exceptionId) {
  try {
    const { data, error } = await supabase
      .from('exception_reports')
      .select(`
        *,
        project:project_id(id, project_name, project_code),
        exception:exception_id(id, exception_title, exception_level, exception_status),
        author:author_id(id, full_name, email)
      `)
      .eq('exception_id', exceptionId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data || null
  } catch (error) {
    console.error('Error fetching exception report by exception:', error)
    throw error
  }
}

/**
 * Update Exception Report
 * @param {string} reportId - Report ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated report
 */
export async function updateExceptionReport(reportId, updates) {
  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('exception_reports')
      .update({
        ...updates,
        updated_by: userData.user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', reportId)
      .select(`
        *,
        project:project_id(id, project_name, project_code),
        exception:exception_id(id, exception_title, exception_level, exception_status),
        author:author_id(id, full_name, email)
      `)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating exception report:', error)
    throw error
  }
}

/**
 * Delete Exception Report (soft delete)
 * @param {string} reportId - Report ID
 * @returns {Promise<void>}
 */
export async function deleteExceptionReport(reportId) {
  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      throw new Error('User not authenticated')
    }

    const { error } = await supabase
      .from('exception_reports')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userData.user.id
      })
      .eq('id', reportId)

    if (error) throw error
  } catch (error) {
    console.error('Error deleting exception report:', error)
    throw error
  }
}

/**
 * Run Quality Checks
 * @param {string} reportId - Report ID
 * @returns {Promise<Array>} Quality check results
 */
export async function runQualityChecks(reportId) {
  try {
    const { data, error } = await supabase.rpc('run_exception_report_quality_checks', {
      p_exception_report_id: reportId
    })

    if (error) throw error

    // Update quality checks table with results
    if (data && data.length > 0) {
      for (const check of data) {
        await supabase
          .from('exception_report_quality_checks')
          .update({
            validation_status: check.validation_status,
            automated_check_result: check.check_details,
            checked_at: new Date().toISOString()
          })
          .eq('exception_report_id', reportId)
          .eq('criterion_number', check.criterion_number)
      }
    }

    return data || []
  } catch (error) {
    console.error('Error running quality checks:', error)
    throw error
  }
}

/**
 * Get Quality Check Status
 * @param {string} reportId - Report ID
 * @returns {Promise<Object>} Quality check summary
 */
export async function getQualityCheckStatus(reportId) {
  try {
    const { data, error } = await supabase.rpc('get_exception_report_quality_summary', {
      p_exception_report_id: reportId
    })

    if (error) throw error
    return data?.[0] || null
  } catch (error) {
    console.error('Error getting quality check status:', error)
    throw error
  }
}

/**
 * Can Submit for Approval
 * @param {string} reportId - Report ID
 * @returns {Promise<boolean>} Whether report can be submitted
 */
export async function canSubmitForApproval(reportId) {
  try {
    const qualitySummary = await getQualityCheckStatus(reportId)
    return qualitySummary?.can_submit || false
  } catch (error) {
    console.error('Error checking if can submit:', error)
    return false
  }
}

/**
 * Link Exception to Exception Plan
 * @param {string} reportId - Report ID
 * @param {string} exceptionPlanId - Exception plan ID
 * @returns {Promise<boolean>} Success status
 */
export async function linkExceptionToExceptionPlan(reportId, exceptionPlanId) {
  try {
    const { data, error } = await supabase.rpc('link_exception_to_exception_plan', {
      p_exception_report_id: reportId,
      p_exception_plan_id: exceptionPlanId
    })

    if (error) throw error
    return data || false
  } catch (error) {
    console.error('Error linking exception to plan:', error)
    throw error
  }
}
