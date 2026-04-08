/**
 * QMS Quality Roles Service
 * API functions for managing quality roles and responsibilities
 */

import { supabase } from './supabaseClient'

/**
 * Add quality role
 * @param {string} qmsId - QMS ID
 * @param {Object} roleData - Role data
 * @returns {Promise<Object>} Created role
 */
export async function addRole(qmsId, roleData) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!userData) throw new Error('User not found')

    // Get next display order
    const { data: existing } = await supabase
      .from('qms_roles_responsibilities')
      .select('display_order')
      .eq('qms_id', qmsId)
      .order('display_order', { ascending: false })
      .limit(1)

    const nextOrder = existing && existing.length > 0
      ? existing[0].display_order + 1
      : 0

    const insertData = {
      ...roleData,
      qms_id: qmsId,
      display_order: roleData.display_order ?? nextOrder,
      created_by: userData.id
    }

    const { data, error } = await supabase
      .from('qms_roles_responsibilities')
      .insert(insertData)
      .select(`
        *,
        assigned_to_user:assigned_to_id(id, full_name, email)
      `)
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error adding quality role:', error)
    throw error
  }
}

/**
 * Update quality role
 * @param {string} roleId - Role ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated role
 */
export async function updateRole(roleId, updates) {
  try {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('qms_roles_responsibilities')
      .update(updateData)
      .eq('id', roleId)
      .select(`
        *,
        assigned_to_user:assigned_to_id(id, full_name, email)
      `)
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error updating quality role:', error)
    throw error
  }
}

/**
 * Delete quality role
 * @param {string} roleId - Role ID
 * @returns {Promise<boolean>} Success
 */
export async function deleteRole(roleId) {
  try {
    const { error } = await supabase
      .from('qms_roles_responsibilities')
      .delete()
      .eq('id', roleId)

    if (error) throw error

    return true
  } catch (error) {
    console.error('Error deleting quality role:', error)
    throw error
  }
}

/**
 * Get quality roles for QMS
 * @param {string} qmsId - QMS ID
 * @returns {Promise<Array>} Quality roles
 */
export async function getRoles(qmsId) {
  try {
    const { data, error } = await supabase
      .from('qms_roles_responsibilities')
      .select(`
        *,
        assigned_to_user:assigned_to_id(id, full_name, email)
      `)
      .eq('qms_id', qmsId)
      .order('display_order', { ascending: true })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching quality roles:', error)
    throw error
  }
}

/**
 * Assign user to quality role
 * @param {string} roleId - Role ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Updated role
 */
export async function assignRole(roleId, userId) {
  try {
    // Get user details
    const { data: userData } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('id', userId)
      .single()

    if (!userData) throw new Error('User not found')

    return await updateRole(roleId, {
      assigned_to_id: userId,
      assigned_to_name: userData.full_name
    })
  } catch (error) {
    console.error('Error assigning role:', error)
    throw error
  }
}

/**
 * Get independent quality roles (Project Independent or higher)
 * @param {string} qmsId - QMS ID
 * @returns {Promise<Array>} Independent roles
 */
export async function getIndependentRoles(qmsId) {
  try {
    const { data, error } = await supabase
      .from('qms_roles_responsibilities')
      .select(`
        *,
        assigned_to_user:assigned_to_id(id, full_name, email)
      `)
      .eq('qms_id', qmsId)
      .in('independence_level', ['project_independent', 'corporate', 'external'])
      .order('display_order', { ascending: true })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching independent roles:', error)
    throw error
  }
}

export default {
  addRole,
  updateRole,
  deleteRole,
  getRoles,
  assignRole,
  getIndependentRoles
}
