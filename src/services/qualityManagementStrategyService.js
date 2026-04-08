/**
 * Quality Management Strategy Service
 * API functions for QMS management
 */

import { supabase } from './supabaseClient'

/**
 * Create a new Quality Management Strategy
 * @param {string} projectId - Project ID
 * @param {Object} qmsData - QMS data
 * @returns {Promise<Object>} Created QMS
 */
export async function createQMS(projectId, qmsData) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!userData) throw new Error('User not found')

    const insertData = {
      ...qmsData,
      project_id: projectId,
      created_by: userData.id,
      updated_by: userData.id,
      status: qmsData.status || 'draft'
    }

    const { data, error } = await supabase
      .from('quality_management_strategies')
      .insert(insertData)
      .select(`
        *,
        author:author_id(id, full_name, email),
        owner:owner_id(id, full_name, email),
        client:client_id(id, full_name, email),
        project:project_id(id, project_name, project_code),
        approved_by_user:approved_by(id, full_name, email)
      `)
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error creating QMS:', error)
    throw error
  }
}

/**
 * Create QMS for Project (with defaults)
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Created QMS
 */
export async function createQMSForProject(projectId) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!userData) throw new Error('User not found')

    // Call database function
    const { data, error } = await supabase.rpc('create_qms_for_project', {
      p_project_id: projectId,
      p_user_id: userData.id
    })

    if (error) throw error

    // Fetch the created QMS
    return await getQMSById(data)
  } catch (error) {
    console.error('Error creating QMS for project:', error)
    throw error
  }
}

/**
 * Get QMS by ID
 * @param {string} qmsId - QMS ID
 * @returns {Promise<Object>} QMS object
 */
export async function getQMSById(qmsId) {
  try {
    const { data, error } = await supabase
      .from('quality_management_strategies')
      .select(`
        *,
        author:author_id(id, full_name, email),
        owner:owner_id(id, full_name, email),
        client:client_id(id, full_name, email),
        project:project_id(id, project_name, project_code),
        approved_by_user:approved_by(id, full_name, email)
      `)
      .eq('id', qmsId)
      .eq('is_deleted', false)
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error fetching QMS:', error)
    throw error
  }
}

/**
 * Get QMS by Project ID
 * @param {string} projectId - Project ID
 * @returns {Promise<{ success: boolean, data?: object|null, error?: string }>} Same shape as getRMSByProject
 */
export async function getQMSByProject(projectId) {
  try {
    const { data, error } = await supabase
      .from('quality_management_strategies')
      .select(`
        *,
        author:author_id(id, full_name, email),
        owner:owner_id(id, full_name, email),
        client:client_id(id, full_name, email),
        project:project_id(id, project_name, project_code),
        approved_by_user:approved_by(id, full_name, email)
      `)
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .maybeSingle()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error fetching QMS by project:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Update QMS
 * @param {string} qmsId - QMS ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated QMS
 */
export async function updateQMS(qmsId, updates) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!userData) throw new Error('User not found')

    const updateData = {
      ...updates,
      updated_by: userData.id,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('quality_management_strategies')
      .update(updateData)
      .eq('id', qmsId)
      .select(`
        *,
        author:author_id(id, full_name, email),
        owner:owner_id(id, full_name, email),
        client:client_id(id, full_name, email),
        project:project_id(id, project_name, project_code),
        approved_by_user:approved_by(id, full_name, email)
      `)
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error updating QMS:', error)
    throw error
  }
}

/**
 * Delete QMS (soft delete, only if draft)
 * @param {string} qmsId - QMS ID
 * @returns {Promise<boolean>} Success
 */
export async function deleteQMS(qmsId) {
  try {
    // Check if draft
    const qms = await getQMSById(qmsId)
    if (qms.status !== 'draft') {
      throw new Error('Can only delete QMS in draft status')
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!userData) throw new Error('User not found')

    const { error } = await supabase
      .from('quality_management_strategies')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userData.id
      })
      .eq('id', qmsId)

    if (error) throw error

    return true
  } catch (error) {
    console.error('Error deleting QMS:', error)
    throw error
  }
}

/**
 * Submit QMS for approval
 * @param {string} qmsId - QMS ID
 * @param {Array<string>} approverIds - Array of approver user IDs
 * @returns {Promise<Object>} Updated QMS
 */
export async function submitForApproval(qmsId, approverIds = []) {
  try {
    // Update status
    const updated = await updateQMS(qmsId, {
      status: 'under_review'
    })

    // Create approval records for each approver
    if (approverIds.length > 0) {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { data: userData } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('auth_user_id', user.id)
        .single()

      const approvals = approverIds.map((approverId) => ({
        qms_id: qmsId,
        approver_id: approverId,
        approver_name: '', // Will be populated from user lookup
        approval_status: 'pending',
        version_approved: updated.version_number,
        created_at: new Date().toISOString()
      }))

      const { error } = await supabase
        .from('qms_approvals')
        .insert(approvals)

      if (error) throw error
    }

    return updated
  } catch (error) {
    console.error('Error submitting QMS for approval:', error)
    throw error
  }
}

/**
 * Approve QMS
 * @param {string} approvalId - Approval record ID
 * @param {string} approverId - Approver user ID
 * @param {string} comments - Approval comments
 * @returns {Promise<Object>} Updated QMS
 */
export async function approveQMS(approvalId, approverId, comments = null) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data: userData } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('auth_user_id', user.id)
      .single()

    if (!userData) throw new Error('User not found')

    // Update approval record
    const { data: approval, error: approvalError } = await supabase
      .from('qms_approvals')
      .update({
        approval_status: 'approved',
        approval_date: new Date().toISOString().split('T')[0],
        comments: comments,
        updated_at: new Date().toISOString()
      })
      .eq('id', approvalId)
      .select('qms_id, version_approved')
      .single()

    if (approvalError) throw approvalError

    // Check if all approvals are complete
    const { data: allApprovals } = await supabase
      .from('qms_approvals')
      .select('approval_status')
      .eq('qms_id', approval.qms_id)
      .eq('is_deleted', false)

    const allApproved = allApprovals.every(a => a.approval_status === 'approved')

    // If all approved, update QMS status
    if (allApproved) {
      return await updateQMS(approval.qms_id, {
        status: 'approved',
        approved_date: new Date().toISOString().split('T')[0],
        approved_by: userData.id
      })
    }

    return await getQMSById(approval.qms_id)
  } catch (error) {
    console.error('Error approving QMS:', error)
    throw error
  }
}

/**
 * Get revision history for QMS
 * @param {string} qmsId - QMS ID
 * @returns {Promise<Array>} Revision history
 */
export async function getRevisionHistory(qmsId) {
  try {
    const { data, error } = await supabase
      .from('qms_revision_history')
      .select(`
        *,
        revised_by_user:revised_by(id, full_name, email)
      `)
      .eq('qms_id', qmsId)
      .order('revision_date', { ascending: false })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching revision history:', error)
    throw error
  }
}

/**
 * Validate QMS completeness
 * @param {string} qmsId - QMS ID
 * @returns {Promise<Object>} Validation results
 */
export async function validateCompleteness(qmsId) {
  try {
    const { data, error } = await supabase.rpc('validate_qms_completeness', {
      p_qms_id: qmsId
    })

    if (error) throw error

    const sections = data || []
    const incomplete = sections.filter(s => !s.is_complete)
    const issues = []
    
    sections.forEach(section => {
      if (!section.is_complete && section.missing_items) {
        issues.push(...section.missing_items)
      }
    })

    return {
      sections,
      is_complete: incomplete.length === 0,
      incomplete_sections: incomplete.length,
      issues,
      completeness_score: calculateCompletenessScore(sections)
    }
  } catch (error) {
    console.error('Error validating QMS completeness:', error)
    throw error
  }
}

/**
 * Check QMS conformance
 * @param {string} qmsId - QMS ID
 * @returns {Promise<Array>} Conformance results
 */
export async function checkConformance(qmsId) {
  try {
    const { data, error } = await supabase.rpc('check_qms_conformance', {
      p_qms_id: qmsId
    })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error checking QMS conformance:', error)
    throw error
  }
}

/**
 * Get scheduled quality activities
 * @param {string} projectId - Project ID
 * @param {Date} dateFrom - Start date (optional)
 * @param {Date} dateTo - End date (optional)
 * @returns {Promise<Array>} Scheduled activities
 */
export async function getScheduledActivities(projectId, dateFrom = null, dateTo = null) {
  try {
    const { data, error } = await supabase.rpc('get_scheduled_quality_activities', {
      p_project_id: projectId,
      p_date_from: dateFrom ? dateFrom.toISOString().split('T')[0] : null,
      p_date_to: dateTo ? dateTo.toISOString().split('T')[0] : null
    })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching scheduled activities:', error)
    throw error
  }
}

/**
 * Create QMS from template
 * @param {string} projectId - Project ID
 * @param {string} templateId - Template ID
 * @returns {Promise<Object>} Created QMS
 */
export async function createQMSFromTemplate(projectId, templateId) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!userData) throw new Error('User not found')

    // Call database function
    const { data, error } = await supabase.rpc('create_qms_from_template', {
      p_project_id: projectId,
      p_template_id: templateId,
      p_user_id: userData.id
    })

    if (error) throw error

    // Fetch the created QMS
    return await getQMSById(data)
  } catch (error) {
    console.error('Error creating QMS from template:', error)
    throw error
  }
}

/**
 * Get or create QMS for project
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} QMS object
 */
export async function getOrCreateQMS(projectId) {
  try {
    const result = await getQMSByProject(projectId)
    if (!result.success) {
      throw new Error(result.error || 'Failed to load QMS')
    }
    let qms = result.data

    if (!qms) {
      qms = await createQMSForProject(projectId)
    }

    return qms
  } catch (error) {
    console.error('Error getting or creating QMS:', error)
    throw error
  }
}

/**
 * Calculate completeness score
 */
function calculateCompletenessScore(sections) {
  if (!sections || sections.length === 0) return 0

  const totalSections = sections.length
  const completeSections = sections.filter(s => s.is_complete).length

  return Math.round((completeSections / totalSections) * 100)
}

export default {
  createQMS,
  createQMSForProject,
  getQMSById,
  getQMSByProject,
  updateQMS,
  deleteQMS,
  submitForApproval,
  approveQMS,
  getRevisionHistory,
  validateCompleteness,
  checkConformance,
  getScheduledActivities,
  getOrCreateQMS
}
