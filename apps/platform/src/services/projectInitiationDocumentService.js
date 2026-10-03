/**
 * Project Initiation Document Service
 * API functions for PID management
 */

import { supabase } from './supabaseClient'

/**
 * Safe PostgREST select for PID rows.
 * Only embed project_id — other link columns (business_case_id, etc.) are often
 * present without FKs in live DBs, which makes PostgREST return 400
 * ("Could not find a relationship … in the schema cache"). Related docs are
 * loaded separately in the UI when needed.
 */
const PID_SELECT = '*'


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
      .select(PID_SELECT)
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
      .select('*')
      .eq('id', businessCaseId)
      .eq('is_deleted', false)
      .single()

    if (bcError) throw bcError
    if (!businessCase) throw new Error('Business Case not found')

    // Create PID with defaults from Business Case
    const pidData = {
      business_case_id: businessCaseId,
      project_id: businessCase.project_id,
      pid_title: 'Project Initiation Document',
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
      .select(PID_SELECT)
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
      .select(PID_SELECT)
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
      // Soft-deleted row still holds UNIQUE(project_id) on older DBs — revive it
      const { data: deletedPid } = await supabase
        .from('project_initiation_documents')
        .select('id')
        .eq('project_id', projectId)
        .eq('is_deleted', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (deletedPid?.id) {
        pid = await updatePID(deletedPid.id, {
          is_deleted: false,
          deleted_at: null,
          deleted_by: null,
          status: 'draft',
          pid_title: 'Project Initiation Document',
        })
      } else {
        pid = await createPID(projectId, {
          pid_title: 'Project Initiation Document',
          pid_description: '',
          project_definition: '',
          project_scope: '',
          status: 'draft',
        })
      }
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
      .select(PID_SELECT)
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
      .select('*')
      .eq('pid_id', pidId)
      .order('revision_date', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching revision history:', error)
    throw error
  }
}
