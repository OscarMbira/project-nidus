/**
 * Project Initiation Document Service
 * API functions for PID management
 */

import { supabase } from './supabaseClient'

/**
 * Create a new Project Initiation Document
 * @param {string} projectId - Project ID
 * @param {Object} pidData - PID data
 * @returns {Promise<Object>} Created PID
 */
export async function createPID(projectId, pidData) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Get user's internal ID
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single()

    if (!userData) throw new Error('User not found')

    const insertData = {
      ...pidData,
      project_id: projectId,
      created_by: userData.id,
      updated_by: userData.id,
      status: pidData.status || 'draft'
    }

    const { data, error } = await supabase
      .from('project_initiation_documents')
      .insert(insertData)
      .select(`
        *,
        project:project_id(id, project_name, project_code),
        business_case:business_case_id(id, business_case_reference),
        project_brief:project_brief_id(id, brief_reference),
        project_mandate:project_mandate_id(id, mandate_reference),
        project_product_description:project_product_description_id(id, ppd_reference),
        executive:executive_user_id(id, full_name, email),
        senior_user:senior_user_user_id(id, full_name, email),
        senior_supplier:senior_supplier_user_id(id, full_name, email),
        project_manager:project_manager_user_id(id, full_name, email),
        author:author_id(id, full_name, email),
        owner:owner_id(id, full_name, email)
      `)
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error creating PID:', error)
    throw error
  }
}

/**
 * Create PID from Business Case
 * @param {string} businessCaseId - Business Case ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Created PID
 */
export async function createPIDFromBusinessCase(businessCaseId, userId) {
  try {
    // Get Business Case
    const { data: businessCase, error: bcError } = await supabase
      .from('business_cases')
      .select('*, project:project_id(id, project_name)')
      .eq('id', businessCaseId)
      .eq('is_deleted', false)
      .single()

    if (bcError) throw bcError
    if (!businessCase) throw new Error('Business Case not found')

    // Create PID with defaults from Business Case
    const pidData = {
      business_case_id: businessCaseId,
      project_id: businessCase.project_id,
      pid_title: `${businessCase.project?.project_name || 'Project'} - Project Initiation Document`,
      pid_description: 'Project Initiation Document created from Business Case',
      project_definition: businessCase.project_definition || '',
      project_justification: businessCase.justification || '',
      project_objectives: businessCase.project_objectives || [],
      status: 'draft'
    }

    return await createPID(businessCase.project_id, pidData)
  } catch (error) {
    console.error('Error creating PID from Business Case:', error)
    throw error
  }
}

/**
 * Get PID by ID
 * @param {string} pidId - PID ID
 * @returns {Promise<Object>} PID object
 */
export async function getPIDById(pidId) {
  try {
    const { data, error } = await supabase
      .from('project_initiation_documents')
      .select(`
        *,
        project:project_id(id, project_name, project_code),
        business_case:business_case_id(id, business_case_reference, business_case_title),
        project_brief:project_brief_id(id, brief_reference, brief_title),
        project_mandate:project_mandate_id(id, mandate_reference, mandate_title),
        project_product_description:project_product_description_id(id, ppd_reference, product_title),
        quality_management_strategy:quality_management_strategy_id(id, qms_reference, qms_title),
        risk_management_strategy:risk_management_strategy_id(id, rms_reference, rms_title),
        configuration_management_strategy:configuration_management_strategy_id(id, cms_reference, cms_title),
        communication_management_strategy:communication_management_strategy_id(id, cms_reference, cms_title),
        executive:executive_user_id(id, full_name, email),
        senior_user:senior_user_user_id(id, full_name, email),
        senior_supplier:senior_supplier_user_id(id, full_name, email),
        project_manager:project_manager_user_id(id, full_name, email),
        project_assurance:project_assurance_user_id(id, full_name, email),
        change_authority:change_authority_user_id(id, full_name, email),
        author:author_id(id, full_name, email),
        owner:owner_id(id, full_name, email),
        approved_by_user:approved_by(id, full_name, email)
      `)
      .eq('id', pidId)
      .eq('is_deleted', false)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching PID:', error)
    throw error
  }
}

/**
 * Get PID by Project ID
 * @param {string} projectId - Project ID
 * @returns {Promise<Object|null>} PID object or null
 */
export async function getPIDByProject(projectId) {
  try {
    const { data, error } = await supabase
      .from('project_initiation_documents')
      .select(`
        *,
        project:project_id(id, project_name, project_code)
      `)
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .maybeSingle()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching PID by project:', error)
    throw error
  }
}

/**
 * Get or create PID for project
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} PID object
 */
export async function getOrCreatePID(projectId) {
  try {
    let pid = await getPIDByProject(projectId)
    
    if (!pid) {
      // Create a new PID
      pid = await createPID(projectId, {
        pid_title: 'Project Initiation Document',
        pid_description: '',
        project_definition: '',
        project_scope: '',
        status: 'draft'
      })
    }
    
    return pid
  } catch (error) {
    console.error('Error getting or creating PID:', error)
    throw error
  }
}

/**
 * Update PID
 * @param {string} pidId - PID ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated PID
 */
export async function updatePID(pidId, updates) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Get user's internal ID
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single()

    if (!userData) throw new Error('User not found')

    const updateData = {
      ...updates,
      updated_by: userData.id,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('project_initiation_documents')
      .update(updateData)
      .eq('id', pidId)
      .select(`
        *,
        project:project_id(id, project_name, project_code)
      `)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating PID:', error)
    throw error
  }
}

/**
 * Delete PID (soft delete, only drafts)
 * @param {string} pidId - PID ID
 * @returns {Promise<boolean>} Success
 */
export async function deletePID(pidId) {
  try {
    // Check if draft
    const pid = await getPIDById(pidId)
    if (pid.status !== 'draft') {
      throw new Error('Can only delete PIDs in draft status')
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single()

    if (!userData) throw new Error('User not found')

    const { error } = await supabase
      .from('project_initiation_documents')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userData.id
      })
      .eq('id', pidId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting PID:', error)
    throw error
  }
}

/**
 * Submit PID for approval
 * @param {string} pidId - PID ID
 * @param {Array<string>} approverIds - Array of approver user IDs
 * @returns {Promise<Object>} Updated PID
 */
export async function submitForApproval(pidId, approverIds = []) {
  try {
    // Update status
    const updated = await updatePID(pidId, {
      status: 'under_review'
    })

    // Create approval records for each approver
    if (approverIds.length > 0) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const approvalRecords = approverIds.map(approverId => ({
        pid_id: pidId,
        approver_id: approverId,
        approver_name: '', // Will be populated from user data
        approval_status: 'pending',
        version_approved: updated.version_number || '1.0'
      }))

      const { error: approvalError } = await supabase
        .from('pid_approvals')
        .insert(approvalRecords)

      if (approvalError) throw approvalError
    }

    return updated
  } catch (error) {
    console.error('Error submitting PID for approval:', error)
    throw error
  }
}

/**
 * Get revision history
 * @param {string} pidId - PID ID
 * @returns {Promise<Array>} Revision history
 */
export async function getRevisionHistory(pidId) {
  try {
    const { data, error } = await supabase
      .from('pid_revision_history')
      .select(`
        *,
        revised_by_user:revised_by(id, full_name, email)
      `)
      .eq('pid_id', pidId)
      .order('revision_date', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching revision history:', error)
    throw error
  }
}
