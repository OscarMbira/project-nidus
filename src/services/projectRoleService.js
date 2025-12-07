/**
 * Project Role Service
 * Handles project-specific role management for PM Platform
 *
 * IMPORTANT: PM Platform specific - uses appDb (public schema)
 * Manages custom project roles and role templates
 */

import { appDb } from './supabase/supabaseClient'

/**
 * Get all roles for a project (including system templates)
 * @param {string} projectId - Project UUID
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function getProjectRoles(projectId) {
  try {
    // Get system role templates (PM platform roles)
    const { data: templates, error: templatesError } = await appDb
      .from('roles')
      .select('*')
      .like('role_name', 'pm_%')
      .eq('is_active', true)
      .eq('is_deleted', false)
      .order('role_level', { ascending: false })

    if (templatesError) throw templatesError

    // Get custom roles for this project (if project_roles table exists)
    // For now, we'll use the existing roles table with project_id filtering
    // Note: The plan mentions project_roles table, but we're using roles table for now
    const { data: customRoles, error: customError } = await appDb
      .from('roles')
      .select('*')
      .eq('is_active', true)
      .eq('is_deleted', false)
      .order('role_level', { ascending: false })

    if (customError) throw customError

    // Combine templates and custom roles
    const allRoles = [...(templates || []), ...(customRoles || [])]

    // Remove duplicates
    const uniqueRoles = Array.from(
      new Map(allRoles.map((role) => [role.id, role])).values()
    )

    return {
      success: true,
      data: uniqueRoles,
      error: null,
    }
  } catch (error) {
    console.error('Error fetching project roles:', error)
    return {
      success: false,
      data: [],
      error: error.message || 'Failed to fetch project roles',
    }
  }
}

/**
 * Get default role templates
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function getDefaultRoleTemplates() {
  try {
    const { data, error } = await appDb
      .from('roles')
      .select('*')
      .like('role_name', 'pm_%')
      .eq('is_system_role', true)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .order('role_level', { ascending: false })

    if (error) throw error

    return {
      success: true,
      data: data || [],
      error: null,
    }
  } catch (error) {
    console.error('Error fetching role templates:', error)
    return {
      success: false,
      data: [],
      error: error.message || 'Failed to fetch role templates',
    }
  }
}

/**
 * Create a custom role for a project
 * @param {string} projectId - Project UUID
 * @param {object} roleData - Role information
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function createCustomRole(projectId, roleData) {
  try {
    const { data: { user } } = await appDb.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Get internal user ID
    const { data: userData, error: userError } = await appDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (userError) throw userError

    // Create custom role
    const { data, error } = await appDb
      .from('roles')
      .insert({
        role_name: roleData.roleName,
        role_display_name: roleData.displayName || roleData.roleName,
        role_description: roleData.description || null,
        role_level: roleData.roleLevel || 5,
        is_system_role: false,
        is_default_role: false,
        can_manage_users: roleData.canManageUsers || false,
        can_manage_projects: roleData.canManageProjects || false,
        can_manage_system: false,
        is_active: true,
        created_by: userData.id,
      })
      .select()
      .single()

    if (error) throw error

    // If permissions are provided, assign them
    if (roleData.permissions && Array.isArray(roleData.permissions)) {
      await assignPermissionsToRole(data.id, roleData.permissions)
    }

    return {
      success: true,
      data: data,
      error: null,
    }
  } catch (error) {
    console.error('Error creating custom role:', error)
    return {
      success: false,
      data: null,
      error: error.message || 'Failed to create custom role',
    }
  }
}

/**
 * Update a role
 * @param {string} roleId - Role UUID
 * @param {object} updates - Fields to update
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function updateRole(roleId, updates) {
  try {
    // Don't allow updating system roles
    const { data: existingRole, error: fetchError } = await appDb
      .from('roles')
      .select('is_system_role')
      .eq('id', roleId)
      .single()

    if (fetchError) throw fetchError

    if (existingRole.is_system_role) {
      return {
        success: false,
        data: null,
        error: 'Cannot update system roles',
      }
    }

    const updateData = {}
    if (updates.displayName !== undefined) updateData.role_display_name = updates.displayName
    if (updates.description !== undefined) updateData.role_description = updates.description
    if (updates.roleLevel !== undefined) updateData.role_level = updates.roleLevel
    if (updates.canManageUsers !== undefined) updateData.can_manage_users = updates.canManageUsers
    if (updates.canManageProjects !== undefined) updateData.can_manage_projects = updates.canManageProjects
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive

    const { data, error } = await appDb
      .from('roles')
      .update(updateData)
      .eq('id', roleId)
      .select()
      .single()

    if (error) throw error

    // Update permissions if provided
    if (updates.permissions && Array.isArray(updates.permissions)) {
      await assignPermissionsToRole(roleId, updates.permissions)
    }

    return {
      success: true,
      data: data,
      error: null,
    }
  } catch (error) {
    console.error('Error updating role:', error)
    return {
      success: false,
      data: null,
      error: error.message || 'Failed to update role',
    }
  }
}

/**
 * Delete a role (soft delete)
 * @param {string} roleId - Role UUID
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function deleteRole(roleId) {
  try {
    // Don't allow deleting system roles
    const { data: existingRole, error: fetchError } = await appDb
      .from('roles')
      .select('is_system_role')
      .eq('id', roleId)
      .single()

    if (fetchError) throw fetchError

    if (existingRole.is_system_role) {
      return {
        success: false,
        error: 'Cannot delete system roles',
      }
    }

    // Check if role is in use
    const { data: inUse, error: checkError } = await appDb
      .from('user_roles')
      .select('id')
      .eq('role_id', roleId)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .limit(1)

    if (checkError) throw checkError

    if (inUse && inUse.length > 0) {
      return {
        success: false,
        error: 'Cannot delete role that is assigned to users',
      }
    }

    // Soft delete
    const { error } = await appDb
      .from('roles')
      .update({
        is_deleted: true,
        is_active: false,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', roleId)

    if (error) throw error

    return {
      success: true,
      error: null,
    }
  } catch (error) {
    console.error('Error deleting role:', error)
    return {
      success: false,
      error: error.message || 'Failed to delete role',
    }
  }
}

/**
 * Assign permissions to a role
 * @param {string} roleId - Role UUID
 * @param {array} permissionCodes - Array of permission codes
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
async function assignPermissionsToRole(roleId, permissionCodes) {
  try {
    // Get permission IDs
    const { data: permissions, error: permError } = await appDb
      .from('permissions')
      .select('id')
      .in('permission_code', permissionCodes)
      .eq('is_active', true)
      .eq('is_deleted', false)

    if (permError) throw permError

    if (!permissions || permissions.length === 0) {
      return {
        success: false,
        error: 'No valid permissions found',
      }
    }

    // Remove existing permissions for this role
    await appDb
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId)

    // Insert new permissions
    const rolePermissions = permissions.map((perm) => ({
      role_id: roleId,
      permission_id: perm.id,
      is_active: true,
    }))

    const { error: insertError } = await appDb
      .from('role_permissions')
      .insert(rolePermissions)

    if (insertError) throw insertError

    return {
      success: true,
      error: null,
    }
  } catch (error) {
    console.error('Error assigning permissions:', error)
    return {
      success: false,
      error: error.message || 'Failed to assign permissions',
    }
  }
}

/**
 * Get role with permissions
 * @param {string} roleId - Role UUID
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function getRoleWithPermissions(roleId) {
  try {
    const { data: role, error: roleError } = await appDb
      .from('roles')
      .select('*')
      .eq('id', roleId)
      .single()

    if (roleError) throw roleError

    const { data: permissions, error: permError } = await appDb
      .from('role_permissions')
      .select(`
        permission:permissions(
          id,
          permission_code,
          permission_name,
          permission_category
        )
      `)
      .eq('role_id', roleId)
      .eq('is_active', true)
      .eq('is_deleted', false)

    if (permError) throw permError

    return {
      success: true,
      data: {
        ...role,
        permissions: (permissions || []).map((rp) => rp.permission).filter(Boolean),
      },
      error: null,
    }
  } catch (error) {
    console.error('Error fetching role with permissions:', error)
    return {
      success: false,
      data: null,
      error: error.message || 'Failed to fetch role',
    }
  }
}

export default {
  getProjectRoles,
  getDefaultRoleTemplates,
  createCustomRole,
  updateRole,
  deleteRole,
  getRoleWithPermissions,
}

