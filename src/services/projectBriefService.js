/**
 * Project Brief Service
 * CRUD operations and business logic for Project Briefs
 */

import { supabase } from './supabaseClient'

/**
 * Create a new project brief
 * @param {string} projectId - Project ID
 * @param {Object} briefData - Brief data
 * @returns {Promise<Object>} Created brief
 */
export async function createBrief(projectId, briefData) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const briefPayload = {
      project_id: projectId,
      mandate_id: briefData.mandate_id || null,
      brief_reference: briefData.brief_reference || null, // Will be auto-generated if null
      document_ref: briefData.document_ref || null,
      version_number: briefData.version_number || '1.0',
      release: briefData.release || null,
      author_id: briefData.author_id || user.id,
      author_name: briefData.author_name || null,
      owner_id: briefData.owner_id || user.id,
      owner_name: briefData.owner_name || null,
      client_id: briefData.client_id || null,
      client_name: briefData.client_name || null,
      document_status: briefData.document_status || 'draft',
      created_date: briefData.created_date || new Date().toISOString().split('T')[0],
      background: briefData.background || null,
      project_objectives: briefData.project_objectives || null,
      desired_outcomes: briefData.desired_outcomes || null,
      project_scope: briefData.project_scope || null,
      scope_exclusions: briefData.scope_exclusions || null,
      constraints: briefData.constraints || null,
      assumptions: briefData.assumptions || null,
      project_tolerances: briefData.project_tolerances || null,
      users_and_interested_parties: briefData.users_and_interested_parties || null,
      interfaces: briefData.interfaces || null,
      outline_business_case_summary: briefData.outline_business_case_summary || null,
      business_option_selected: briefData.business_option_selected || null,
      product_description: briefData.product_description || null,
      customer_quality_expectations: briefData.customer_quality_expectations || null,
      user_acceptance_criteria: briefData.user_acceptance_criteria || null,
      operations_maintenance_criteria: briefData.operations_maintenance_criteria || null,
      project_approach_description: briefData.project_approach_description || null,
      solution_type: briefData.solution_type || null,
      delivery_approach: briefData.delivery_approach || null,
      development_approach: briefData.development_approach || null,
      operational_environment: briefData.operational_environment || null,
      approach_justification: briefData.approach_justification || null,
      approach_selection_id: briefData.approach_selection_id || null,
      team_structure_description: briefData.team_structure_description || null,
      team_structure_diagram_url: briefData.team_structure_diagram_url || null,
      lessons_learned_reviewed: briefData.lessons_learned_reviewed || false,
      lessons_review_summary: briefData.lessons_review_summary || null,
      is_consistent_with_csr: briefData.is_consistent_with_csr || null,
      csr_notes: briefData.csr_notes || null,
      created_by: user.id,
      updated_by: user.id
    }

    const { data, error } = await supabase
      .from('project_briefs')
      .insert(briefPayload)
      .select(`
        *,
        project:projects(id, project_name, project_code),
        mandate:project_mandates(id, mandate_reference, mandate_title),
        author:users!project_briefs_author_id_fkey(id, full_name, email),
        owner:users!project_briefs_owner_id_fkey(id, full_name, email),
        client:users!project_briefs_client_id_fkey(id, full_name, email)
      `)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating brief:', error)
    throw error
  }
}

/**
 * Create brief from mandate (auto-populate)
 * @param {string} mandateId - Mandate ID
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Created brief
 */
export async function createBriefFromMandate(mandateId, projectId) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Get user internal ID
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single()

    if (!userData) throw new Error('User not found')

    // Call database function
    const { data, error } = await supabase.rpc('create_brief_from_mandate', {
      p_mandate_id: mandateId,
      p_project_id: projectId,
      p_user_id: userData.id
    })

    if (error) throw error

    // Fetch the created brief
    return await getBriefById(data)
  } catch (error) {
    console.error('Error creating brief from mandate:', error)
    throw error
  }
}

/**
 * Get brief by ID
 * @param {string} briefId - Brief ID
 * @returns {Promise<Object>} Brief data
 */
export async function getBriefById(briefId) {
  try {
    const { data, error } = await supabase
      .from('project_briefs')
      .select(`
        *,
        project:projects(id, project_name, project_code),
        mandate:project_mandates(id, mandate_reference, mandate_title),
        author:users!project_briefs_author_id_fkey(id, full_name, email),
        owner:users!project_briefs_owner_id_fkey(id, full_name, email),
        client:users!project_briefs_client_id_fkey(id, full_name, email),
        approved_by_user:users!project_briefs_approved_by_fkey(id, full_name, email)
      `)
      .eq('id', briefId)
      .eq('is_deleted', false)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching brief:', error)
    throw error
  }
}

/**
 * Get brief by project ID
 * @param {string} projectId - Project ID
 * @returns {Promise<Object|null>} Brief data or null
 */
export async function getBriefByProject(projectId) {
  try {
    const { data, error } = await supabase
      .from('project_briefs')
      .select(`
        *,
        project:projects(id, project_name, project_code),
        mandate:project_mandates(id, mandate_reference, mandate_title),
        author:users!project_briefs_author_id_fkey(id, full_name, email),
        owner:users!project_briefs_owner_id_fkey(id, full_name, email),
        client:users!project_briefs_client_id_fkey(id, full_name, email),
        approved_by_user:users!project_briefs_approved_by_fkey(id, full_name, email)
      `)
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .maybeSingle()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching brief by project:', error)
    throw error
  }
}

/**
 * Update brief
 * @param {string} briefId - Brief ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated brief
 */
export async function updateBrief(briefId, updates) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Get user internal ID
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single()

    if (!userData) throw new Error('User not found')

    const updatePayload = {
      ...updates,
      updated_by: userData.id,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('project_briefs')
      .update(updatePayload)
      .eq('id', briefId)
      .select(`
        *,
        project:projects(id, project_name, project_code),
        mandate:project_mandates(id, mandate_reference, mandate_title),
        author:users!project_briefs_author_id_fkey(id, full_name, email),
        owner:users!project_briefs_owner_id_fkey(id, full_name, email),
        client:users!project_briefs_client_id_fkey(id, full_name, email)
      `)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating brief:', error)
    throw error
  }
}

/**
 * Delete brief (soft delete)
 * @param {string} briefId - Brief ID
 * @returns {Promise<void>}
 */
export async function deleteBrief(briefId) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Get user internal ID
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single()

    if (!userData) throw new Error('User not found')

    const { error } = await supabase
      .from('project_briefs')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userData.id
      })
      .eq('id', briefId)

    if (error) throw error
  } catch (error) {
    console.error('Error deleting brief:', error)
    throw error
  }
}

/**
 * Update brief status
 * @param {string} briefId - Brief ID
 * @param {string} newStatus - New status
 * @returns {Promise<Object>} Updated brief
 */
export async function updateStatus(briefId, newStatus) {
  return updateBrief(briefId, { document_status: newStatus })
}

/**
 * Check if brief can be edited
 * @param {string} briefId - Brief ID
 * @returns {Promise<boolean>} True if editable
 */
export async function canEdit(briefId) {
  try {
    const brief = await getBriefById(briefId)
    return brief && brief.document_status && ['draft', 'rejected'].includes(brief.document_status)
  } catch (error) {
    console.error('Error checking edit permission:', error)
    return false
  }
}

/**
 * Get all briefs (for PMO Admin)
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} Array of briefs
 */
export async function getAllBriefs(filters = {}) {
  try {
    let query = supabase
      .from('project_briefs')
      .select(`
        *,
        project:projects(id, project_name, project_code),
        mandate:project_mandates(id, mandate_reference, mandate_title),
        author:users!project_briefs_author_id_fkey(id, full_name, email)
      `)
      .eq('is_deleted', false)

    if (filters.status) {
      query = query.eq('document_status', filters.status)
    }

    if (filters.project_id) {
      query = query.eq('project_id', filters.project_id)
    }

    query = query.order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching briefs:', error)
    throw error
  }
}

export default {
  createBrief,
  createBriefFromMandate,
  getBriefById,
  getBriefByProject,
  updateBrief,
  deleteBrief,
  updateStatus,
  canEdit,
  getAllBriefs
}
