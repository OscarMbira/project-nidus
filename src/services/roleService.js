/**
 * Role Service
 * Handles role fetching and assignment for users
 */

import { supabase } from './supabaseClient'

/**
 * Get all available roles for selection (excluding system/admin roles)
 */
export async function getAvailableRoles() {
  try {
    const { data, error } = await supabase
      .from('roles')
      .select('id, role_name, role_display_name, role_description, role_level, is_default_role')
      .eq('is_active', true)
      .eq('is_deleted', false)
      .neq('role_name', 'system_admin') // Exclude system admin
      .neq('role_name', 'org_admin') // Exclude org admin
      .order('role_level', { ascending: false })

    if (error) throw error

    return {
      success: true,
      data: data || [],
      message: 'Roles fetched successfully'
    }
  } catch (error) {
    console.error('Error fetching roles:', error)
    return {
      success: false,
      data: [],
      message: error.message || 'Failed to fetch roles'
    }
  }
}

/**
 * Get user's current roles
 */
export async function getUserRoles(userId) {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select(`
        id,
        role_id,
        is_active,
        roles:role_id (
          id,
          role_name,
          role_display_name,
          role_description,
          role_level
        )
      `)
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .eq('is_active', true)

    if (error) throw error

    return {
      success: true,
      data: data || [],
      message: 'User roles fetched successfully'
    }
  } catch (error) {
    console.error('Error fetching user roles:', error)
    return {
      success: false,
      data: [],
      message: error.message || 'Failed to fetch user roles'
    }
  }
}

/**
 * Assign role(s) to a user
 */
export async function assignUserRoles(userId, roleIds) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Get user record ID from users table
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', userId)
      .single()

    if (userError) throw userError
    if (!userRecord) throw new Error('User record not found')

    const userRecordId = userRecord.id

    // Prepare role assignments
    const assignments = roleIds.map(roleId => ({
      user_id: userRecordId,
      role_id: roleId,
      assigned_by: userRecordId, // Self-assigned during onboarding
      is_active: true
    }))

    // Insert role assignments
    const { data, error } = await supabase
      .from('user_roles')
      .insert(assignments)
      .select()

    if (error) throw error

    return {
      success: true,
      data: data || [],
      message: 'Roles assigned successfully'
    }
  } catch (error) {
    console.error('Error assigning roles:', error)
    return {
      success: false,
      data: [],
      message: error.message || 'Failed to assign roles'
    }
  }
}

/**
 * Check if user has completed onboarding (has at least one role)
 */
export async function hasCompletedOnboarding(userId) {
  try {
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', userId)
      .single()

    if (userError || !userRecord) {
      return { success: false, completed: false }
    }

    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userRecord.id)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .limit(1)

    if (rolesError) {
      return { success: false, completed: false }
    }

    return {
      success: true,
      completed: roles && roles.length > 0
    }
  } catch (error) {
    console.error('Error checking onboarding status:', error)
    return { success: false, completed: false }
  }
}

