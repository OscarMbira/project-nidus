/**
 * Product Status Account Service
 * API functions for managing Product Status Accounts
 */

import { supabase } from './supabaseClient'

/**
 * Create a new Product Status Account
 * @param {string} projectId - Project ID
 * @param {Object} psaData - Product Status Account data
 * @returns {Promise<Object>} Created Product Status Account
 */
export async function createProductStatusAccount(projectId, psaData) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single()

    if (userError || !userData) {
      return { success: false, error: 'User not found' }
    }

    const insertData = {
      ...psaData,
      project_id: projectId,
      report_date: psaData.report_date || new Date().toISOString().split('T')[0],
      status_set_by: psaData.status_set_by || userData.id,
      created_by: userData.id,
      updated_by: userData.id
    }

    const { data, error } = await supabase
      .from('product_status_accounts')
      .insert(insertData)
      .select(`
        *,
        status_set_by_user:status_set_by(id, full_name, email),
        assigned_to:assigned_to_id(id, full_name, email),
        quality_reviewer:quality_reviewer_id(id, full_name, email),
        accepted_by:accepted_by_id(id, full_name, email),
        handed_over_to:handed_over_to_id(id, full_name, email),
        project:project_id(id, project_name, project_code),
        product_description:product_description_id(id, pd_reference, product_title),
        product_deliverable:product_deliverable_id(id, product_name, product_code),
        work_package:work_package_id(id, work_package_name, work_package_code)
      `)
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error creating product status account:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Create Product Status Account from Product Deliverable
 * @param {string} productDeliverableId - Product Deliverable ID
 * @param {string} reportDate - Report date (optional, defaults to today)
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Created Product Status Account
 */
export async function createPSAForProductDeliverable(productDeliverableId, reportDate = null, userId = null) {
  try {
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .eq('is_deleted', false)
        .single()

      if (!userData) {
        return { success: false, error: 'User not found' }
      }
      userId = userData.id
    }

    const reportDateValue = reportDate || new Date().toISOString().split('T')[0]

    const { data: psaId, error } = await supabase.rpc('create_psa_for_product_deliverable', {
      p_product_deliverable_id: productDeliverableId,
      p_report_date: reportDateValue,
      p_user_id: userId
    })

    if (error) throw error

    return await getProductStatusAccountById(psaId)
  } catch (error) {
    console.error('Error creating PSA from product deliverable:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Create Product Status Account from Product Description
 * @param {string} productDescriptionId - Product Description ID
 * @param {string} reportDate - Report date (optional, defaults to today)
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Created Product Status Account
 */
export async function createPSAForProductDescription(productDescriptionId, reportDate = null, userId = null) {
  try {
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .eq('is_deleted', false)
        .single()

      if (!userData) {
        return { success: false, error: 'User not found' }
      }
      userId = userData.id
    }

    const reportDateValue = reportDate || new Date().toISOString().split('T')[0]

    const { data: psaId, error } = await supabase.rpc('create_psa_for_product_description', {
      p_product_description_id: productDescriptionId,
      p_report_date: reportDateValue,
      p_user_id: userId
    })

    if (error) throw error

    return await getProductStatusAccountById(psaId)
  } catch (error) {
    console.error('Error creating PSA from product description:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get Product Status Account by ID
 * @param {string} psaId - Product Status Account ID
 * @returns {Promise<Object>} Product Status Account
 */
export async function getProductStatusAccountById(psaId) {
  try {
    const { data, error } = await supabase
      .from('product_status_accounts')
      .select(`
        *,
        status_set_by_user:status_set_by(id, full_name, email),
        assigned_to:assigned_to_id(id, full_name, email),
        quality_reviewer:quality_reviewer_id(id, full_name, email),
        accepted_by:accepted_by_id(id, full_name, email),
        handed_over_to:handed_over_to_id(id, full_name, email),
        project:project_id(id, project_name, project_code),
        product_description:product_description_id(id, pd_reference, product_title),
        product_deliverable:product_deliverable_id(id, product_name, product_code),
        work_package:work_package_id(id, work_package_name, work_package_code)
      `)
      .eq('id', psaId)
      .eq('is_deleted', false)
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error getting product status account:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get Product Status Accounts by Project
 * @param {string} projectId - Project ID
 * @param {string} reportDate - Report date (optional, defaults to today)
 * @returns {Promise<Object>} Product Status Accounts array
 */
export async function getProductStatusAccountByProject(projectId, reportDate = null) {
  try {
    const reportDateValue = reportDate || new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('product_status_accounts')
      .select(`
        *,
        status_set_by_user:status_set_by(id, full_name, email),
        assigned_to:assigned_to_id(id, full_name, email),
        product_description:product_description_id(id, pd_reference, product_title),
        product_deliverable:product_deliverable_id(id, product_name, product_code),
        work_package:work_package_id(id, work_package_name)
      `)
      .eq('project_id', projectId)
      .eq('report_date', reportDateValue)
      .eq('is_deleted', false)
      .order('product_name', { ascending: true })

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error getting product status accounts by project:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get Product Status Account by Product Deliverable
 * @param {string} productDeliverableId - Product Deliverable ID
 * @param {string} reportDate - Report date (optional, defaults to today)
 * @returns {Promise<Object>} Product Status Account
 */
export async function getProductStatusAccountByDeliverable(productDeliverableId, reportDate = null) {
  try {
    const reportDateValue = reportDate || new Date().toISOString().split('T')[0]

    const { data: psaId, error } = await supabase.rpc('get_psa_by_product_deliverable', {
      p_product_deliverable_id: productDeliverableId,
      p_report_date: reportDateValue
    })

    if (error) throw error

    if (!psaId) {
      return { success: true, data: null }
    }

    return await getProductStatusAccountById(psaId)
  } catch (error) {
    console.error('Error getting PSA by deliverable:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Update Product Status Account
 * @param {string} psaId - Product Status Account ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated Product Status Account
 */
export async function updateProductStatusAccount(psaId, updates) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single()

    if (userError || !userData) {
      return { success: false, error: 'User not found' }
    }

    const updateData = {
      ...updates,
      updated_by: userData.id
    }

    // Calculate schedule variance if dates are updated
    if (updates.forecast_completion_date || updates.planned_completion_date) {
      const current = await getProductStatusAccountById(psaId)
      if (current.success && current.data) {
        const planned = updates.planned_completion_date || current.data.planned_completion_date
        const forecast = updates.forecast_completion_date || current.data.forecast_completion_date
        
        if (planned && forecast) {
          const plannedDate = new Date(planned)
          const forecastDate = new Date(forecast)
          const varianceDays = Math.floor((forecastDate - plannedDate) / (1000 * 60 * 60 * 24))
          updateData.schedule_variance_days = varianceDays
          
          // Update progress indicator based on variance
          if (varianceDays > 0 && varianceDays < 10) {
            updateData.progress_indicator = 'at_risk'
          } else if (varianceDays >= 10) {
            updateData.progress_indicator = 'delayed'
          } else if (varianceDays < 0) {
            updateData.progress_indicator = 'ahead_of_schedule'
          } else {
            updateData.progress_indicator = 'on_track'
          }
        }
      }
    }

    const { data, error } = await supabase
      .from('product_status_accounts')
      .update(updateData)
      .eq('id', psaId)
      .select(`
        *,
        status_set_by_user:status_set_by(id, full_name, email),
        assigned_to:assigned_to_id(id, full_name, email),
        quality_reviewer:quality_reviewer_id(id, full_name, email),
        accepted_by:accepted_by_id(id, full_name, email),
        handed_over_to:handed_over_to_id(id, full_name, email),
        project:project_id(id, project_name, project_code),
        product_description:product_description_id(id, pd_reference, product_title),
        product_deliverable:product_deliverable_id(id, product_name, product_code),
        work_package:work_package_id(id, work_package_name)
      `)
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error updating product status account:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Delete Product Status Account (soft delete)
 * @param {string} psaId - Product Status Account ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteProductStatusAccount(psaId) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    const { error } = await supabase
      .from('product_status_accounts')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString()
      })
      .eq('id', psaId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Error deleting product status account:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Update Product Status Account status
 * @param {string} psaId - Product Status Account ID
 * @param {string} newStatus - New status
 * @param {string} reason - Reason for change
 * @param {string} userId - User ID (optional)
 * @returns {Promise<Object>} Updated Product Status Account
 */
export async function updateStatus(psaId, newStatus, reason = null, userId = null) {
  try {
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .eq('is_deleted', false)
        .single()

      if (!userData) {
        return { success: false, error: 'User not found' }
      }
      userId = userData.id
    }

    return await updateProductStatusAccount(psaId, {
      current_status: newStatus,
      status_date: new Date().toISOString().split('T')[0],
      status_set_by: userId,
      status_notes: reason
    })
  } catch (error) {
    console.error('Error updating status:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Update Product Status Account progress
 * @param {string} psaId - Product Status Account ID
 * @param {number} progressPercentage - Progress percentage (0-100)
 * @param {string} progressNotes - Progress notes
 * @param {string} userId - User ID (optional)
 * @returns {Promise<Object>} Updated Product Status Account
 */
export async function updateProgress(psaId, progressPercentage, progressNotes = null, userId = null) {
  try {
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .eq('is_deleted', false)
        .single()

      if (!userData) {
        return { success: false, error: 'User not found' }
      }
      userId = userData.id
    }

    return await updateProductStatusAccount(psaId, {
      progress_percentage: progressPercentage,
      last_progress_update: new Date().toISOString().split('T')[0],
      progress_notes: progressNotes
    })
  } catch (error) {
    console.error('Error updating progress:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Sync Product Status Account from Product Deliverable
 * @param {string} productDeliverableId - Product Deliverable ID
 * @param {string} reportDate - Report date (optional)
 * @returns {Promise<Object>} Updated Product Status Account
 */
export async function syncFromProductDeliverable(productDeliverableId, reportDate = null) {
  try {
    const reportDateValue = reportDate || new Date().toISOString().split('T')[0]

    const { data: psaId, error } = await supabase.rpc('update_psa_from_product_deliverable', {
      p_product_deliverable_id: productDeliverableId,
      p_report_date: reportDateValue
    })

    if (error) throw error

    return await getProductStatusAccountById(psaId)
  } catch (error) {
    console.error('Error syncing from product deliverable:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get Status Summary for Project
 * @param {string} projectId - Project ID
 * @param {string} reportDate - Report date (optional)
 * @returns {Promise<Object>} Status summary
 */
export async function getStatusSummary(projectId, reportDate = null) {
  try {
    const reportDateValue = reportDate || new Date().toISOString().split('T')[0]

    const { data, error } = await supabase.rpc('get_psa_status_summary', {
      p_project_id: projectId,
      p_report_date: reportDateValue
    })

    if (error) throw error

    return { success: true, data: data && data.length > 0 ? data[0] : null }
  } catch (error) {
    console.error('Error getting status summary:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Link Issue to Product Status Account
 * @param {string} psaId - Product Status Account ID
 * @param {string} issueId - Issue ID
 * @param {string} issueType - Issue type ('issue', 'blocker', 'risk', 'change_request')
 * @returns {Promise<Object>} Linked issue
 */
export async function linkIssue(psaId, issueId, issueType = 'issue') {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    // Get issue summary
    const { data: issue } = await supabase
      .from('issues')
      .select('id, issue_title, issue_description')
      .eq('id', issueId)
      .eq('is_deleted', false)
      .single()

    if (!issue) {
      return { success: false, error: 'Issue not found' }
    }

    const { data, error } = await supabase
      .from('psa_linked_issues')
      .insert({
        product_status_account_id: psaId,
        issue_id: issueId,
        issue_type: issueType,
        issue_summary: issue.issue_title || issue.issue_description?.substring(0, 500),
        linked_date: new Date().toISOString().split('T')[0]
      })
      .select()
      .single()

    if (error) throw error

    // Update issue count in PSA
    await updateIssueCounts(psaId)

    return { success: true, data }
  } catch (error) {
    console.error('Error linking issue:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Update issue and blocker counts in PSA
 * @param {string} psaId - Product Status Account ID
 */
async function updateIssueCounts(psaId) {
  try {
    const { data: linkedIssues } = await supabase
      .from('psa_linked_issues')
      .select('issue_type, is_resolved')
      .eq('product_status_account_id', psaId)
      .eq('is_resolved', false)

    if (linkedIssues) {
      const issueCount = linkedIssues.filter(i => i.issue_type === 'issue' || i.issue_type === 'risk').length
      const blockerCount = linkedIssues.filter(i => i.issue_type === 'blocker').length

      await supabase
        .from('product_status_accounts')
        .update({
          has_issues: issueCount > 0,
          issue_count: issueCount,
          has_blockers: blockerCount > 0,
          blocker_count: blockerCount
        })
        .eq('id', psaId)
    }
  } catch (error) {
    console.error('Error updating issue counts:', error)
  }
}
