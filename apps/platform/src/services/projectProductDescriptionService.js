/**
 * Project Product Description Service
 * API functions for PPD management
 */

import { supabase } from './supabaseClient'

/**
 * Create a new Project Product Description
 * @param {string} projectId - Project ID
 * @param {Object} ppdData - PPD data
 * @returns {Promise<Object>} Created PPD
 */
export async function createPPD(projectId, ppdData) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const insertData = {
      ...ppdData,
      project_id: projectId,
      created_by: user.id,
      updated_by: user.id,
      status: ppdData.status || 'draft'
    }

    const { data, error } = await supabase
      .from('project_product_descriptions')
      .insert(insertData)
      .select(`
        *,
        author:author_id(id, full_name, email),
        owner:owner_id(id, full_name, email),
        client:client_id(id, full_name, email),
        project:project_id(id, project_name, project_code)
      `)
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error creating PPD:', error)
    throw error
  }
}

/**
 * Create PPD from Project Mandate
 * @param {string} mandateId - Mandate ID
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Created PPD
 */
export async function createPPDFromMandate(mandateId, projectId) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Get user's internal ID
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!userData) throw new Error('User not found')

    // Call database function
    const { data, error } = await supabase.rpc('create_ppd_from_mandate', {
      p_mandate_id: mandateId,
      p_project_id: projectId,
      p_user_id: userData.id
    })

    if (error) throw error

    // Fetch the created PPD
    return await getPPDById(data)
  } catch (error) {
    console.error('Error creating PPD from mandate:', error)
    throw error
  }
}

/**
 * Get PPD by ID
 * @param {string} ppdId - PPD ID
 * @returns {Promise<Object>} PPD object
 */
export async function getPPDById(ppdId) {
  try {
    const { data, error } = await supabase
      .from('project_product_descriptions')
      .select(`
        *,
        author:author_id(id, full_name, email),
        owner:owner_id(id, full_name, email),
        client:client_id(id, full_name, email),
        project:project_id(id, project_name, project_code),
        approved_by_user:approved_by(id, full_name, email)
      `)
      .eq('id', ppdId)
      .eq('is_deleted', false)
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error fetching PPD:', error)
    throw error
  }
}

/**
 * Get PPD by Project ID
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} PPD object or null
 */
export async function getPPDByProject(projectId) {
  try {
    const { data, error } = await supabase
      .from('project_product_descriptions')
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

    return data
  } catch (error) {
    console.error('Error fetching PPD by project:', error)
    throw error
  }
}

/**
 * Update PPD
 * @param {string} ppdId - PPD ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated PPD
 */
export async function updatePPD(ppdId, updates) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Get user's internal ID
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
      .from('project_product_descriptions')
      .update(updateData)
      .eq('id', ppdId)
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
    console.error('Error updating PPD:', error)
    throw error
  }
}

/**
 * Delete PPD (soft delete, only if draft)
 * @param {string} ppdId - PPD ID
 * @returns {Promise<boolean>} Success
 */
export async function deletePPD(ppdId) {
  try {
    // Check if draft
    const ppd = await getPPDById(ppdId)
    if (ppd.status !== 'draft') {
      throw new Error('Can only delete PPDs in draft status')
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
      .from('project_product_descriptions')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userData.id
      })
      .eq('id', ppdId)

    if (error) throw error

    return true
  } catch (error) {
    console.error('Error deleting PPD:', error)
    throw error
  }
}

/**
 * Submit PPD for approval
 * @param {string} ppdId - PPD ID
 * @param {Array<string>} approverIds - Array of approver user IDs
 * @returns {Promise<Object>} Updated PPD
 */
export async function submitForApproval(ppdId, approverIds = []) {
  try {
    // Update status
    const updated = await updatePPD(ppdId, {
      status: 'under_review'
    })

    // Create approval records for each approver
    if (approverIds.length > 0) {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      const approvals = approverIds.map((approverId, index) => ({
        ppd_id: ppdId,
        approver_id: approverId,
        approver_name: '', // Will be populated from user lookup
        approval_status: 'pending',
        version_approved: updated.version_number,
        created_at: new Date().toISOString()
      }))

      const { error } = await supabase
        .from('ppd_approvals')
        .insert(approvals)

      if (error) throw error
    }

    return updated
  } catch (error) {
    console.error('Error submitting PPD for approval:', error)
    throw error
  }
}

/**
 * Approve PPD
 * @param {string} approvalId - Approval record ID
 * @param {string} approverId - Approver user ID
 * @param {string} comments - Approval comments
 * @returns {Promise<Object>} Updated PPD
 */
export async function approvePPD(approvalId, approverId, comments = null) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Get user's internal ID
    const { data: userData } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('auth_user_id', user.id)
      .single()

    if (!userData) throw new Error('User not found')

    // Update approval record
    const { data: approval, error: approvalError } = await supabase
      .from('ppd_approvals')
      .update({
        approval_status: 'approved',
        approval_date: new Date().toISOString().split('T')[0],
        comments: comments,
        updated_at: new Date().toISOString()
      })
      .eq('id', approvalId)
      .select('ppd_id')
      .single()

    if (approvalError) throw approvalError

    // Check if all approvals are complete
    const { data: allApprovals } = await supabase
      .from('ppd_approvals')
      .select('approval_status')
      .eq('ppd_id', approval.ppd_id)
      .eq('is_deleted', false)

    const allApproved = allApprovals.every(a => a.approval_status === 'approved')

    // If all approved, update PPD status
    if (allApproved) {
      return await updatePPD(approval.ppd_id, {
        status: 'approved',
        approved_date: new Date().toISOString().split('T')[0],
        approved_by: userData.id
      })
    }

    return await getPPDById(approval.ppd_id)
  } catch (error) {
    console.error('Error approving PPD:', error)
    throw error
  }
}

/**
 * Get revision history for PPD
 * @param {string} ppdId - PPD ID
 * @returns {Promise<Array>} Revision history
 */
export async function getRevisionHistory(ppdId) {
  try {
    const { data, error } = await supabase
      .from('ppd_revision_history')
      .select(`
        *,
        revised_by_user:revised_by(id, full_name, email)
      `)
      .eq('ppd_id', ppdId)
      .order('revision_date', { ascending: false })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching revision history:', error)
    throw error
  }
}

/**
 * Validate PPD completeness
 * @param {string} ppdId - PPD ID
 * @returns {Promise<Object>} Validation results
 */
export async function validatePPD(ppdId) {
  try {
    const ppd = await getPPDById(ppdId)
    const issues = []
    const warnings = []

    // Check required fields
    if (!ppd.product_title || ppd.product_title.trim().length < 10) {
      issues.push('Product title must be at least 10 characters')
    }

    if (!ppd.purpose || ppd.purpose.trim().length < 50) {
      issues.push('Purpose must be at least 50 characters')
    }

    // Check composition items
    const { data: compositionItems } = await supabase
      .from('ppd_composition_items')
      .select('id')
      .eq('ppd_id', ppdId)
      .eq('is_deleted', false)

    if (!compositionItems || compositionItems.length === 0) {
      issues.push('At least one composition item is required')
    }

    // Check acceptance criteria
    const { data: criteria } = await supabase
      .from('ppd_acceptance_criteria')
      .select('id')
      .eq('ppd_id', ppdId)
      .eq('is_deleted', false)

    if (!criteria || criteria.length < 3) {
      issues.push('At least 3 acceptance criteria are required')
    }

    // Check acceptance responsibilities
    const { data: responsibilities } = await supabase
      .from('ppd_acceptance_responsibilities')
      .select('id')
      .eq('ppd_id', ppdId)
      .eq('is_deleted', false)

    if (!responsibilities || responsibilities.length === 0) {
      warnings.push('No acceptance responsibilities defined')
    }

    // Check quality expectations
    if (!ppd.customer_quality_expectations || ppd.customer_quality_expectations.trim().length < 50) {
      warnings.push('Customer quality expectations should be at least 50 characters')
    }

    // Check acceptance method
    if (!ppd.acceptance_method || ppd.acceptance_method.trim().length < 30) {
      issues.push('Acceptance method must be at least 30 characters')
    }

    return {
      is_valid: issues.length === 0,
      issues,
      warnings,
      completeness_score: calculateCompletenessScore(ppd, compositionItems?.length || 0, criteria?.length || 0, responsibilities?.length || 0)
    }
  } catch (error) {
    console.error('Error validating PPD:', error)
    throw error
  }
}

/**
 * Calculate completeness score
 */
function calculateCompletenessScore(ppd, compositionCount, criteriaCount, responsibilityCount) {
  let score = 0

  // Basic fields (30 points)
  if (ppd.product_title && ppd.product_title.trim().length >= 10) score += 5
  if (ppd.purpose && ppd.purpose.trim().length >= 50) score += 10
  if (ppd.composition && ppd.composition.trim().length > 0) score += 5
  if (ppd.derivation && ppd.derivation.trim().length > 0) score += 5
  if (ppd.customer_quality_expectations && ppd.customer_quality_expectations.trim().length >= 50) score += 5

  // Composition items (20 points)
  if (compositionCount > 0) score += Math.min(20, compositionCount * 5)

  // Acceptance criteria (30 points)
  if (criteriaCount >= 3) score += Math.min(30, criteriaCount * 5)

  // Acceptance method (10 points)
  if (ppd.acceptance_method && ppd.acceptance_method.trim().length >= 30) score += 10

  // Responsibilities (10 points)
  if (responsibilityCount > 0) score += Math.min(10, responsibilityCount * 5)

  return Math.min(100, score)
}

/**
 * Get or create PPD for project
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} PPD object
 */
export async function getOrCreatePPD(projectId) {
  try {
    let ppd = await getPPDByProject(projectId)
    
    if (!ppd) {
      // Create draft PPD
      const { data: { user } } = await supabase.auth.getUser()
      
      const { data: userData } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('auth_user_id', user.id)
        .single()

      ppd = await createPPD(projectId, {
        product_title: 'Project Product',
        purpose: 'To be defined',
        author_id: userData.id,
        owner_id: userData.id,
        status: 'draft'
      })
    }

    return ppd
  } catch (error) {
    console.error('Error getting or creating PPD:', error)
    throw error
  }
}

export default {
  createPPD,
  createPPDFromMandate,
  getPPDById,
  getPPDByProject,
  updatePPD,
  deletePPD,
  submitForApproval,
  approvePPD,
  getRevisionHistory,
  validatePPD,
  getOrCreatePPD
}
