/**
 * End Project Report Service
 * Main service for End Project Report CRUD operations
 */

import { supabase } from './supabaseClient'

/**
 * Create End Project Report
 * @param {string} projectId - Project ID
 * @param {Object} reportData - Report data
 * @returns {Promise<Object>} Created report
 */
export async function createEndProjectReport(projectId, reportData) {
  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      throw new Error('User not authenticated')
    }

    const insertData = {
      project_id: projectId,
      report_title: reportData.report_title || 'End Project Report',
      report_date: reportData.report_date || new Date().toISOString().split('T')[0],
      version_no: reportData.version_no || '1.0',
      author_id: reportData.author_id || userData.user.id,
      owner_id: reportData.owner_id || null,
      client_id: reportData.client_id || null,
      date_of_this_revision: reportData.date_of_this_revision || new Date().toISOString().split('T')[0],
      project_managers_report: reportData.project_managers_report || null,
      abnormal_situations: reportData.abnormal_situations || null,
      abnormal_situations_impact: reportData.abnormal_situations_impact || null,
      premature_closure_reason: reportData.premature_closure_reason || null,
      project_assurance_agreement: reportData.project_assurance_agreement || false,
      closure_type: reportData.closure_type || 'normal',
      executive_summary: reportData.executive_summary || null,
      approval_status: 'draft',
      created_by: userData.user.id,
      updated_by: userData.user.id
    }

    const { data, error } = await supabase
      .from('end_project_reports')
      .insert(insertData)
      .select(`
        *,
        author:author_id(id, full_name, email),
        owner:owner_id(id, full_name, email),
        client:client_id(id, full_name, email),
        project:projects(id, project_name, project_code)
      `)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating end project report:', error)
    throw error
  }
}

/**
 * Get End Project Report by ID
 * @param {string} reportId - Report ID
 * @returns {Promise<Object>} Report data
 */
export async function getEndProjectReportById(reportId) {
  try {
    const { data, error } = await supabase
      .from('end_project_reports')
      .select(`
        *,
        author:author_id(id, full_name, email),
        owner:owner_id(id, full_name, email),
        client:client_id(id, full_name, email),
        project:projects(id, project_name, project_code),
        project_closure:project_closures(id, closure_status, closure_type)
      `)
      .eq('id', reportId)
      .eq('is_deleted', false)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching end project report:', error)
    throw error
  }
}

/**
 * Get End Project Report by Project
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Report data
 */
export async function getEndProjectReportByProject(projectId) {
  try {
    const { data, error } = await supabase
      .from('end_project_reports')
      .select(`
        *,
        author:author_id(id, full_name, email),
        owner:owner_id(id, full_name, email),
        client:client_id(id, full_name, email),
        project:projects(id, project_name, project_code)
      `)
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .maybeSingle()

    if (error && error.code !== 'PGRST116') throw error
    return data
  } catch (error) {
    console.error('Error fetching end project report:', error)
    throw error
  }
}

/**
 * Update End Project Report
 * @param {string} reportId - Report ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated report
 */
export async function updateEndProjectReport(reportId, updates) {
  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      throw new Error('User not authenticated')
    }

    const updateData = {
      ...updates,
      updated_by: userData.user.id,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('end_project_reports')
      .update(updateData)
      .eq('id', reportId)
      .select(`
        *,
        author:author_id(id, full_name, email),
        owner:owner_id(id, full_name, email),
        client:client_id(id, full_name, email),
        project:projects(id, project_name, project_code)
      `)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating end project report:', error)
    throw error
  }
}

/**
 * Delete End Project Report (soft delete)
 * @param {string} reportId - Report ID
 * @returns {Promise<void>}
 */
export async function deleteEndProjectReport(reportId) {
  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      throw new Error('User not authenticated')
    }

    const { error } = await supabase
      .from('end_project_reports')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userData.user.id,
        updated_by: userData.user.id
      })
      .eq('id', reportId)

    if (error) throw error
  } catch (error) {
    console.error('Error deleting end project report:', error)
    throw error
  }
}

/**
 * Generate Document Reference
 * @param {string} projectId - Project ID
 * @returns {Promise<string>} Document reference
 */
export async function generateDocumentRef(projectId) {
  try {
    const { data, error } = await supabase.rpc('generate_end_project_report_ref', {
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
 * Calculate Benefits Variance
 * @param {string} reportId - Report ID
 * @returns {Promise<Object>} Variance data
 */
export async function calculateBenefitsVariance(reportId) {
  try {
    const { data, error } = await supabase.rpc('calculate_benefits_variance', {
      p_end_project_report_id: reportId
    })

    if (error) throw error
    return data?.[0] || null
  } catch (error) {
    console.error('Error calculating benefits variance:', error)
    throw error
  }
}

/**
 * Get Business Case for Review
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Business case data
 */
export async function getBusinessCaseForReview(projectId) {
  try {
    const { data, error } = await supabase.rpc('get_business_case_for_review', {
      p_project_id: projectId
    })

    if (error) throw error
    return data?.[0] || null
  } catch (error) {
    console.error('Error fetching business case:', error)
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
    const { data, error } = await supabase.rpc('run_epr_quality_checks', {
      p_end_project_report_id: reportId
    })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error running quality checks:', error)
    throw error
  }
}

/**
 * Get Quality Check Status
 * @param {string} reportId - Report ID
 * @returns {Promise<Object>} Quality status
 */
export async function getQualityCheckStatus(reportId) {
  try {
    const { data, error } = await supabase.rpc('get_epr_quality_summary', {
      p_end_project_report_id: reportId
    })

    if (error) throw error
    return data?.[0] || null
  } catch (error) {
    console.error('Error fetching quality check status:', error)
    throw error
  }
}

/**
 * Can Close Project
 * @param {string} reportId - Report ID
 * @returns {Promise<boolean>} Whether project can be closed
 */
export async function canCloseProject(reportId) {
  try {
    const status = await getQualityCheckStatus(reportId)
    return status?.can_close_project || false
  } catch (error) {
    console.error('Error checking if can close project:', error)
    return false
  }
}

/**
 * Get Open Issues for Follow-On
 * @param {string} projectId - Project ID
 * @returns {Promise<Array>} Open issues
 */
export async function getOpenIssuesForFollowOn(projectId) {
  try {
    const { data, error } = await supabase.rpc('get_open_issues_for_follow_on', {
      p_project_id: projectId
    })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching open issues:', error)
    throw error
  }
}

/**
 * Get Open Risks for Follow-On
 * @param {string} projectId - Project ID
 * @returns {Promise<Array>} Open risks
 */
export async function getOpenRisksForFollowOn(projectId) {
  try {
    const { data, error } = await supabase.rpc('get_open_risks_for_follow_on', {
      p_project_id: projectId
    })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching open risks:', error)
    throw error
  }
}
