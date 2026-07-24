/**
 * Brief Roles Service
 * Manages role descriptions for project briefs
 */

import { supabase } from './supabaseClient'

/**
 * Add role to brief
 * @param {string} briefId - Brief ID
 * @param {Object} roleData - Role data
 * @returns {Promise<Object>} Created role
 */
export async function addRole(briefId, roleData) {
  try {
    const payload = {
      brief_id: briefId,
      role_name: roleData.role_name,
      role_category: roleData.role_category,
      role_description: roleData.role_description || null,
      key_responsibilities: roleData.key_responsibilities || null,
      authority_level: roleData.authority_level || null,
      reporting_to: roleData.reporting_to || null,
      required_skills: roleData.required_skills || null,
      required_experience: roleData.required_experience || null,
      time_commitment: roleData.time_commitment || null,
      assigned_to_user_id: roleData.assigned_to_user_id || null,
      assigned_to_name: roleData.assigned_to_name || null,
      is_mandatory: roleData.is_mandatory || false,
      display_order: roleData.display_order || 0
    }

    const { data, error } = await supabase
      .from('brief_role_descriptions')
      .insert(payload)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error adding role:', error)
    throw error
  }
}

/**
 * Update role
 * @param {string} roleId - Role ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated role
 */
export async function updateRole(roleId, updates) {
  try {
    const { data, error } = await supabase
      .from('brief_role_descriptions')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', roleId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating role:', error)
    throw error
  }
}

/**
 * Assign role to user
 * @param {string} roleId - Role ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Updated role
 */
export async function assignRoleToUser(roleId, userId) {
  try {
    // Get user name
    const { data: userData } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', userId)
      .single()

    return await updateRole(roleId, {
      assigned_to_user_id: userId,
      assigned_to_name: userData?.full_name || null
    })
  } catch (error) {
    console.error('Error assigning role:', error)
    throw error
  }
}

/**
 * Delete role
 * @param {string} roleId - Role ID
 * @returns {Promise<void>}
 */
export async function deleteRole(roleId) {
  try {
    const { error } = await supabase
      .from('brief_role_descriptions')
      .delete()
      .eq('id', roleId)

    if (error) throw error
  } catch (error) {
    console.error('Error deleting role:', error)
    throw error
  }
}

/**
 * Get roles for a brief
 * @param {string} briefId - Brief ID
 * @returns {Promise<Array>} Array of roles
 */
export async function getRoles(briefId) {
  try {
    const { data, error } = await supabase
      .from('brief_role_descriptions')
      .select(`
        *,
        assigned_user:users!brief_role_descriptions_assigned_to_user_id_fkey(id, full_name, email)
      `)
      .eq('brief_id', briefId)
      .order('display_order', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching roles:', error)
    throw error
  }
}

/**
 * Get mandatory roles for a brief
 * @param {string} briefId - Brief ID
 * @returns {Promise<Array>} Array of mandatory roles
 */
export async function getMandatoryRoles(briefId) {
  try {
    const { data, error } = await supabase
      .from('brief_role_descriptions')
      .select('*')
      .eq('brief_id', briefId)
      .eq('is_mandatory', true)
      .order('display_order', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching mandatory roles:', error)
    throw error
  }
}

/**
 * Check if all mandatory roles are filled
 * @param {string} briefId - Brief ID
 * @returns {Promise<Object>} Check result
 */
export async function checkMandatoryRolesFilled(briefId) {
  try {
    const mandatoryRoles = await getMandatoryRoles(briefId)
    const unfilledRoles = mandatoryRoles.filter(
      role => !role.assigned_to_user_id && !role.assigned_to_name
    )

    return {
      all_filled: unfilledRoles.length === 0,
      total_mandatory: mandatoryRoles.length,
      filled_count: mandatoryRoles.length - unfilledRoles.length,
      unfilled_roles: unfilledRoles.map(r => r.role_name)
    }
  } catch (error) {
    console.error('Error checking mandatory roles:', error)
    throw error
  }
}

export default {
  addRole,
  updateRole,
  assignRoleToUser,
  deleteRole,
  getRoles,
  getMandatoryRoles,
  checkMandatoryRolesFilled
}
