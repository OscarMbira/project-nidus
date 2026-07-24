/**
 * Role Service
 * Handles role fetching and assignment for users
 * 
 * IMPORTANT: 
 * - System roles (Account Owner) are assigned via user_roles table
 * - Project roles (Project Manager, Team Member, etc.) are assigned via project_memberships table
 * - NEVER hardcode role IDs - always lookup by role_name
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
      .neq('role_name', 'pmo_admin') // Exclude PMO admin
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
 * Assign a single role to a user (convenience function for registration)
 */
export async function assignUserRole(userId, roleId) {
  return await assignUserRoles(userId, [roleId])
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

/**
 * Assign system role to user (Account Owner only)
 * IMPORTANT: Always looks up role by name, never hardcodes ID
 * @param {string} authUserId - Auth user ID (from Supabase Auth)
 * @param {string} roleName - Role name (e.g., 'account_owner')
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function assignSystemRole(authUserId, roleName) {
  try {
    // Get internal user ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', authUserId)
      .single()

    if (userError) throw userError
    if (!user) throw new Error('User record not found')

    // Get role ID by name (NEVER hardcode IDs)
    // Note: pmo_admin is not a system role but is used for PMO admins
    // Allow both system roles and pmo_admin
    let roleQuery = supabase
      .from('roles')
      .select('id')
      .eq('role_name', roleName)
      .eq('is_active', true)
    
    // For pmo_admin, don't require is_system_role = true
    if (roleName !== 'pmo_admin') {
      roleQuery = roleQuery.eq('is_system_role', true)
    }
    
    const { data: role, error: roleError } = await roleQuery.single()

    if (roleError || !role) {
      throw new Error(`Role '${roleName}' not found`)
    }

    // Check if role already assigned
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', user.id)
      .eq('role_id', role.id)
      .eq('is_active', true)
      .maybeSingle()

    if (existingRole) {
      // Role already assigned, return success
      return { success: true, error: null }
    }

    // Assign role
    const { error: assignError } = await supabase
      .from('user_roles')
      .insert({
        user_id: user.id,
        role_id: role.id,
        assigned_by: user.id, // Self-assigned during registration
        is_active: true
      })

    if (assignError) throw assignError

    return { success: true, error: null }
  } catch (error) {
    console.error('Error assigning system role:', error)
    return {
      success: false,
      error: error.message || 'Failed to assign system role'
    }
  }
}

/**
 * Assign project role to user (Project Manager, Team Member, etc.)
 * IMPORTANT: Always looks up role by name, never hardcodes ID
 * Supports both template roles and custom project-specific roles
 * @param {string} projectId - Project UUID
 * @param {string} authUserId - Auth user ID (from Supabase Auth)
 * @param {string} roleName - Role name (e.g., 'project_manager', 'team_member')
 * @param {boolean} useCustomRole - Whether to use custom role (default: false for templates)
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function assignProjectRole(projectId, authUserId, roleName, useCustomRole = false) {
  try {
    // Get internal user ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', authUserId)
      .single()

    if (userError) throw userError
    if (!user) throw new Error('User record not found')

    // Get project role ID by name (NEVER hardcode IDs)
    let query = supabase
      .from('project_roles')
      .select('id')
      .eq('role_name', roleName)
      .eq('is_active', true)

    if (useCustomRole) {
      // Look for custom role specific to this project
      query = query.eq('project_id', projectId).eq('is_template', false)
    } else {
      // Look for template role
      query = query.eq('is_template', true)
    }

    const { data: role, error: roleError } = await query.single()

    if (roleError || !role) {
      throw new Error(`Project role '${roleName}' not found${useCustomRole ? ' for this project' : ' in templates'}`)
    }

    // Check if membership already exists
    const { data: existingMembership, error: checkError } = await supabase
      .from('project_memberships')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()
    if (existingMembership) {
      // Update existing membership with new role
      const { error: updateError } = await supabase
        .from('project_memberships')
        .update({
          project_role_id: role.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingMembership.id)

      if (updateError) throw updateError
      return { success: true, error: null }
    }

    // Create project membership
    const { error: insertError } = await supabase
      .from('project_memberships')
      .insert({
        project_id: projectId,
        user_id: user.id,
        project_role_id: role.id,
        invitation_status: 'accepted', // Auto-accepted for project creator
        accepted_at: new Date().toISOString(),
        is_active: true
      })

    if (insertError) throw insertError

    return { success: true, error: null }
  } catch (error) {
    console.error('Error assigning project role:', error)
    return {
      success: false,
      error: error.message || 'Failed to assign project role'
    }
  }
}

/**
 * Get user's project roles (all projects they're member of)
 * @param {string} authUserId - Auth user ID
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function getUserProjectRoles(authUserId) {
  try {
    // Get internal user ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', authUserId)
      .single()

    if (userError || !user) {
      return { success: false, data: [], error: 'User not found' }
    }

    const { data, error } = await supabase
      .from('project_memberships')
      .select(`
        id,
        project_id,
        projects:project_id (
          project_name,
          project_code
        ),
        project_roles:project_role_id (
          role_name,
          role_display_name,
          permissions
        ),
        is_active
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (error) throw error

    return { success: true, data: data || [], error: null }
  } catch (error) {
    console.error('Error getting user project roles:', error)
    return {
      success: false,
      data: [],
      error: error.message || 'Failed to get user project roles'
    }
  }
}

/**
 * Get user's system roles (Account Owner, etc.)
 * @param {string} authUserId - Auth user ID
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function getUserSystemRoles(authUserId) {
  try {
    // Get internal user ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', authUserId)
      .single()

    if (userError || !user) {
      return { success: false, data: [], error: 'User not found' }
    }

    const { data, error } = await supabase
      .from('user_roles')
      .select(`
        id,
        roles:role_id (
          role_name,
          role_display_name,
          role_level
        ),
        is_active
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (error) throw error

    return { success: true, data: data || [], error: null }
  } catch (error) {
    console.error('Error getting user system roles:', error)
    return {
      success: false,
      data: [],
      error: error.message || 'Failed to get user system roles'
    }
  }
}

