/**
 * PPD Acceptance Criteria Service
 * API functions for managing acceptance criteria
 */

import { supabase } from './supabaseClient'

/**
 * Add acceptance criterion
 * @param {string} ppdId - PPD ID
 * @param {Object} criteriaData - Criteria data
 * @returns {Promise<Object>} Created criterion
 */
export async function addCriteria(ppdId, criteriaData) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!userData) throw new Error('User not found')

    // Get next criteria number
    const { data: existingCriteria } = await supabase
      .from('ppd_acceptance_criteria')
      .select('criteria_number')
      .eq('ppd_id', ppdId)
      .eq('is_deleted', false)
      .order('criteria_number', { ascending: false })
      .limit(1)

    const nextNumber = existingCriteria && existingCriteria.length > 0
      ? existingCriteria[0].criteria_number + 1
      : 1

    // Generate reference
    const { data: reference } = await supabase.rpc('generate_criteria_reference', {
      p_ppd_id: ppdId
    })

    const insertData = {
      ...criteriaData,
      ppd_id: ppdId,
      criteria_number: criteriaData.criteria_number || nextNumber,
      criteria_reference: reference || `AC-${String(nextNumber).padStart(3, '0')}`,
      created_by: userData.id,
      updated_by: userData.id
    }

    const { data, error } = await supabase
      .from('ppd_acceptance_criteria')
      .insert(insertData)
      .select('*')
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error adding acceptance criterion:', error)
    throw error
  }
}

/**
 * Update acceptance criterion
 * @param {string} criteriaId - Criteria ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated criterion
 */
export async function updateCriteria(criteriaId, updates) {
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
      .from('ppd_acceptance_criteria')
      .update(updateData)
      .eq('id', criteriaId)
      .select('*')
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error updating acceptance criterion:', error)
    throw error
  }
}

/**
 * Delete acceptance criterion
 * @param {string} criteriaId - Criteria ID
 * @returns {Promise<boolean>} Success
 */
export async function deleteCriteria(criteriaId) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!userData) throw new Error('User not found')

    const { error } = await supabase
      .from('ppd_acceptance_criteria')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userData.id
      })
      .eq('id', criteriaId)

    if (error) throw error

    return true
  } catch (error) {
    console.error('Error deleting acceptance criterion:', error)
    throw error
  }
}

/**
 * Get acceptance criteria for PPD
 * @param {string} ppdId - PPD ID
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} Acceptance criteria
 */
export async function getCriteria(ppdId, filters = {}) {
  try {
    let query = supabase
      .from('ppd_acceptance_criteria')
      .select(`
        *,
        accepted_by_user:accepted_by(id, full_name, email)
      `)
      .eq('ppd_id', ppdId)
      .eq('is_deleted', false)

    if (filters.category) {
      query = query.eq('criteria_category', filters.category)
    }

    if (filters.stakeholder_group) {
      query = query.eq('stakeholder_group', filters.stakeholder_group)
    }

    if (filters.priority) {
      query = query.eq('priority', filters.priority)
    }

    if (filters.acceptance_status) {
      query = query.eq('acceptance_status', filters.acceptance_status)
    }

    query = query.order('display_order', { ascending: true })
      .order('criteria_number', { ascending: true })

    const { data, error } = await query

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching acceptance criteria:', error)
    throw error
  }
}

/**
 * Get single criterion by ID
 * @param {string} criteriaId - Criteria ID
 * @returns {Promise<Object>} Criterion
 */
export async function getCriteriaById(criteriaId) {
  try {
    const { data, error } = await supabase
      .from('ppd_acceptance_criteria')
      .select(`
        *,
        accepted_by_user:accepted_by(id, full_name, email)
      `)
      .eq('id', criteriaId)
      .eq('is_deleted', false)
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error fetching criterion:', error)
    throw error
  }
}

/**
 * Validate single criterion
 * @param {string} criteriaId - Criteria ID
 * @returns {Promise<Object>} Validation results
 */
export async function validateCriteria(criteriaId) {
  try {
    // Get criterion
    const criterion = await getCriteriaById(criteriaId)

    // Call database validation function
    const { data, error } = await supabase.rpc('validate_acceptance_criteria', {
      p_ppd_id: criterion.ppd_id
    })

    if (error) throw error

    // Find validation for this criterion
    const validation = data.find(v => v.criteria_id === criteriaId)

    if (!validation) {
      return {
        is_valid: false,
        issues: ['Criterion not found in validation results'],
        recommendations: 'Check criterion data'
      }
    }

    return validation
  } catch (error) {
    console.error('Error validating criterion:', error)
    throw error
  }
}

/**
 * Validate all criteria for PPD
 * @param {string} ppdId - PPD ID
 * @returns {Promise<Array>} Validation results for all criteria
 */
export async function validateAllCriteria(ppdId) {
  try {
    const { data, error } = await supabase.rpc('validate_acceptance_criteria', {
      p_ppd_id: ppdId
    })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error validating all criteria:', error)
    throw error
  }
}

/**
 * Check criteria consistency
 * @param {string} ppdId - PPD ID
 * @returns {Promise<Array>} Conflicts found
 */
export async function checkConsistency(ppdId) {
  try {
    const { data, error } = await supabase.rpc('check_criteria_consistency', {
      p_ppd_id: ppdId
    })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error checking consistency:', error)
    throw error
  }
}

/**
 * Record acceptance result for criterion
 * @param {string} criteriaId - Criteria ID
 * @param {string} status - Acceptance status (passed, failed, waived, deferred)
 * @param {string} notes - Acceptance notes
 * @returns {Promise<Object>} Updated criterion
 */
export async function recordAcceptance(criteriaId, status, notes = null) {
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
    const { data, error } = await supabase.rpc('record_criteria_acceptance', {
      p_criteria_id: criteriaId,
      p_status: status,
      p_user_id: userData.id,
      p_notes: notes
    })

    if (error) throw error

    // Return updated criterion
    return await getCriteriaById(criteriaId)
  } catch (error) {
    console.error('Error recording acceptance:', error)
    throw error
  }
}

/**
 * Get acceptance status for PPD
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Acceptance status
 */
export async function getAcceptanceStatus(projectId) {
  try {
    const { data, error } = await supabase.rpc('get_acceptance_status', {
      p_project_id: projectId
    })

    if (error) throw error

    if (!data || data.length === 0) {
      return {
        total_criteria: 0,
        passed_criteria: 0,
        failed_criteria: 0,
        pending_criteria: 0,
        acceptance_percentage: 0,
        can_close_project: false
      }
    }

    return data[0]
  } catch (error) {
    console.error('Error getting acceptance status:', error)
    throw error
  }
}

/**
 * Get criteria by category
 * @param {string} ppdId - PPD ID
 * @param {string} category - Category
 * @returns {Promise<Array>} Criteria
 */
export async function getCriteriaByCategory(ppdId, category) {
  return getCriteria(ppdId, { category })
}

/**
 * Get criteria by stakeholder group
 * @param {string} ppdId - PPD ID
 * @param {string} stakeholderGroup - Stakeholder group
 * @returns {Promise<Array>} Criteria
 */
export async function getCriteriaByStakeholder(ppdId, stakeholderGroup) {
  return getCriteria(ppdId, { stakeholder_group: stakeholderGroup })
}

/**
 * Get criteria by priority
 * @param {string} ppdId - PPD ID
 * @param {string} priority - Priority (must_have, should_have, etc.)
 * @returns {Promise<Array>} Criteria
 */
export async function getCriteriaByPriority(ppdId, priority) {
  return getCriteria(ppdId, { priority })
}

/**
 * Get pending criteria
 * @param {string} ppdId - PPD ID
 * @returns {Promise<Array>} Pending criteria
 */
export async function getPendingCriteria(ppdId) {
  return getCriteria(ppdId, { acceptance_status: 'pending' })
}

/**
 * Get failed criteria
 * @param {string} ppdId - PPD ID
 * @returns {Promise<Array>} Failed criteria
 */
export async function getFailedCriteria(ppdId) {
  return getCriteria(ppdId, { acceptance_status: 'failed' })
}

export default {
  addCriteria,
  updateCriteria,
  deleteCriteria,
  getCriteria,
  getCriteriaById,
  validateCriteria,
  validateAllCriteria,
  checkConsistency,
  recordAcceptance,
  getAcceptanceStatus,
  getCriteriaByCategory,
  getCriteriaByStakeholder,
  getCriteriaByPriority,
  getPendingCriteria,
  getFailedCriteria
}
