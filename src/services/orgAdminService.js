/**
 * Organization Admin Service
 * 
 * Handles Organization Admin specific functions:
 * 1. Assign roles to projects
 * 2. Send email invites to roles (excluding Team Manager and Team Member)
 */

import { supabase } from './supabaseClient'
import { assignProjectRole } from './roleService'
import { inviteUserToProject } from './projectMembershipService'
import { sendProjectInvitation } from './invitationService'
import { resolveInviterDisplayNameFromUser } from '../utils/invitationInviteeFormat'

/**
 * Check if user is Organization Admin
 * @param {string} authUserId - Auth user ID
 * @returns {Promise<boolean>}
 */
export async function isOrgAdmin(authUserId) {
  try {
    // Get current authenticated user
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser || currentUser.id !== authUserId) {
      return false
    }

    // Get user record from users table
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', authUserId)
      .single()

    if (userError || !userRecord) {
      console.error('Error fetching user record:', userError)
      return false
    }

    // Check for org_admin role
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select(`
        roles:role_id (
          role_name
        )
      `)
      .eq('user_id', userRecord.id)
      .eq('is_active', true)
      .eq('is_deleted', false)

    if (rolesError) {
      console.error('Error fetching user roles:', rolesError)
      return false
    }

    if (!userRoles || userRoles.length === 0) {
      return false
    }

    const hasOrgAdminRole = userRoles.some(
      assignment => assignment.roles?.role_name === 'org_admin'
    )

    return hasOrgAdminRole
  } catch (error) {
    console.error('Error checking Organization Admin role:', error)
    return false
  }
}

/**
 * Get all projects for organization admin
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function getAllProjects() {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        id,
        project_name,
        project_code,
        project_description,
        account_id,
        status_id,
        project_statuses:status_id (
          status_name,
          status_color
        )
      `)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (error) throw error

    return {
      success: true,
      data: data || [],
      error: null
    }
  } catch (error) {
    console.error('Error fetching projects:', error)
    return {
      success: false,
      data: [],
      error: error.message || 'Failed to fetch projects'
    }
  }
}

/**
 * Get available roles for assignment (excluding Team Manager and Team Member)
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function getAssignableRolesForOrgAdmin() {
  try {
    const { data, error } = await supabase
      .from('roles')
      .select('id, role_name, role_display_name, role_description, role_level')
      .eq('is_active', true)
      .eq('is_deleted', false)
      .neq('role_name', 'team_manager')
      .neq('role_name', 'team_member')
      .neq('role_name', 'pm_team_manager')
      .neq('role_name', 'pm_team_member')
      .neq('role_name', 'system_admin')
      .order('role_level', { ascending: false })

    if (error) throw error

    return {
      success: true,
      data: data || [],
      error: null
    }
  } catch (error) {
    console.error('Error fetching assignable roles:', error)
    return {
      success: false,
      data: [],
      error: error.message || 'Failed to fetch roles'
    }
  }
}

/**
 * Get project roles for a specific project
 * @param {string} projectId - Project UUID
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function getProjectRoles(projectId) {
  try {
    // Try project_roles table first
    const { data: projectRoles, error: projectRolesError } = await supabase
      .from('project_roles')
      .select('id, role_name, role_display_name, role_description, role_level')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .eq('is_template', false)
      .neq('role_name', 'team_manager')
      .neq('role_name', 'team_member')
      .neq('role_name', 'pm_team_manager')
      .neq('role_name', 'pm_team_member')

    if (!projectRolesError && projectRoles) {
      // Also get template roles
      const { data: templates } = await supabase
        .from('project_roles')
        .select('id, role_name, role_display_name, role_description, role_level')
        .eq('is_template', true)
        .eq('is_active', true)
        .neq('role_name', 'team_manager')
        .neq('role_name', 'team_member')
        .neq('role_name', 'pm_team_manager')
        .neq('role_name', 'pm_team_member')

      return {
        success: true,
        data: [...(projectRoles || []), ...(templates || [])],
        error: null
      }
    }

    // Fallback to roles table
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('id, role_name, role_display_name, role_description, role_level')
      .eq('is_active', true)
      .eq('is_deleted', false)
      .neq('role_name', 'team_manager')
      .neq('role_name', 'team_member')
      .neq('role_name', 'pm_team_manager')
      .neq('role_name', 'pm_team_member')
      .neq('role_name', 'system_admin')
      .neq('role_name', 'org_admin')

    if (rolesError) throw rolesError

    return {
      success: true,
      data: roles || [],
      error: null
    }
  } catch (error) {
    console.error('Error fetching project roles:', error)
    return {
      success: false,
      data: [],
      error: error.message || 'Failed to fetch project roles'
    }
  }
}

/**
 * Assign role to user in a project
 * @param {string} projectId - Project UUID
 * @param {string} userId - User ID (internal)
 * @param {string} roleId - Role UUID
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function assignRoleToProject(projectId, userId, roleId) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Verify user is org_admin
    const isAdmin = await isOrgAdmin(user.id)
    if (!isAdmin) {
      return {
        success: false,
        error: 'Only Organization Admin can assign roles to projects'
      }
    }

    // Get internal user ID for assigned_by
    const { data: currentUserRecord } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!currentUserRecord) {
      throw new Error('Current user record not found')
    }

    const assignedByUserId = currentUserRecord.id

    // Verify the role exists (check both roles and project_roles tables)
    let roleExists = false
    const { data: role } = await supabase
      .from('roles')
      .select('id, role_name')
      .eq('id', roleId)
      .single()

    if (role) {
      roleExists = true
    } else {
      // Try project_roles table
      const { data: projectRole } = await supabase
        .from('project_roles')
        .select('id, role_name')
        .eq('id', roleId)
        .single()

      if (projectRole) {
        roleExists = true
      }
    }

    if (!roleExists) {
      throw new Error('Role not found')
    }

    // Check if role assignment already exists for this user in this project
    const { data: existing } = await supabase
      .from('user_roles')
      .select('id, role_id')
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .maybeSingle()

    if (existing) {
      // If same role, return success (already assigned)
      if (existing.role_id === roleId) {
        return { success: true, error: null, message: 'Role already assigned' }
      }

      // Update existing assignment with new role
      const { error: updateError } = await supabase
        .from('user_roles')
        .update({
          role_id: roleId,
          assigned_by: assignedByUserId,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)

      if (updateError) throw updateError

      return { success: true, error: null, message: 'Role updated successfully' }
    } else {
      // Create new assignment
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role_id: roleId,
          project_id: projectId,
          assigned_by: assignedByUserId,
          is_active: true
        })

      if (insertError) {
        // If unique constraint violation, try to update instead
        if (insertError.code === '23505') {
          const { error: updateError } = await supabase
            .from('user_roles')
            .update({
              role_id: roleId,
              assigned_by: assignedByUserId,
              is_active: true,
              is_deleted: false,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .eq('project_id', projectId)

          if (updateError) throw updateError
          return { success: true, error: null }
        }
        throw insertError
      }
    }

    return { success: true, error: null, message: 'Role assigned successfully' }
  } catch (error) {
    console.error('Error assigning role to project:', error)
    return {
      success: false,
      error: error.message || 'Failed to assign role'
    }
  }
}

/**
 * Send email invitation with role (excluding Team Manager and Team Member)
 * @param {string} projectId - Project UUID
 * @param {string} email - Recipient email
 * @param {string} roleId - Role UUID
 * @param {string} message - Optional invitation message
 * @param {number|null|undefined} expiryDays - Optional override (1–365); omit for account default
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function sendRoleInvitation(projectId, email, roleId, message = null, expiryDays = undefined) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Verify user is org_admin
    const isAdmin = await isOrgAdmin(user.id)
    if (!isAdmin) {
      return {
        success: false,
        error: 'Only Organization Admin can send invitations'
      }
    }

    // Verify role is not Team Manager or Team Member
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('role_name')
      .eq('id', roleId)
      .single()

    if (!roleError && role) {
      const restrictedRoles = ['team_manager', 'team_member', 'pm_team_manager', 'pm_team_member']
      if (restrictedRoles.includes(role.role_name)) {
        return {
          success: false,
          error: 'Team Manager and Team Member invitations are reserved for Project Managers'
        }
      }
    }

    // Check project_roles table
    const { data: projectRole } = await supabase
      .from('project_roles')
      .select('role_name')
      .eq('id', roleId)
      .single()

    if (projectRole) {
      const restrictedRoles = ['team_manager', 'team_member', 'pm_team_manager', 'pm_team_member']
      if (restrictedRoles.includes(projectRole.role_name)) {
        return {
          success: false,
          error: 'Team Manager and Team Member invitations are reserved for Project Managers'
        }
      }
    }

    // Get project and role details for email
    const { data: project } = await supabase
      .from('projects')
      .select('project_name, project_code, project_type_id, accounts(account_display_name, account_name, company_name)')
      .eq('id', projectId)
      .single()

    // Get role display name
    let roleDisplayName = 'Role'
    const roleData = role || projectRole
    if (roleData) {
      const { data: roleDetails } = await supabase
        .from('roles')
        .select('role_display_name, role_name')
        .eq('id', roleId)
        .single()

      if (roleDetails) {
        roleDisplayName = roleDetails.role_display_name || roleDetails.role_name
      } else {
        // Try project_roles table
        const { data: projectRoleDetails } = await supabase
          .from('project_roles')
          .select('role_display_name, role_name')
          .eq('id', roleId)
          .single()

        if (projectRoleDetails) {
          roleDisplayName = projectRoleDetails.role_display_name || projectRoleDetails.role_name
        }
      }
    }

    // Get current user's name for invitation
    const { data: inviterUser } = await supabase
      .from('users')
      .select('full_name, first_name, last_name, email')
      .eq('auth_user_id', user.id)
      .single()

    // Send email invitation (this will create the invitation record and send email)
    const result = await sendProjectInvitation(email, {
      projectId,
      projectName: project?.project_name || 'Project',
      projectCode: project?.project_code || null,
      projectTypeId: project?.project_type_id || null,
      organisationName:
        project?.accounts?.account_display_name ||
        project?.accounts?.account_name ||
        project?.accounts?.company_name ||
        '',
      roleId,
      roleName: roleDisplayName,
      inviterName:
        resolveInviterDisplayNameFromUser(inviterUser || {}, user?.email) ||
        'Organization Admin',
      message,
      expiryDays,
    })

    return result
  } catch (error) {
    console.error('Error sending role invitation:', error)
    return {
      success: false,
      error: error.message || 'Failed to send invitation'
    }
  }
}

/**
 * Get users in organization
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function getOrganizationUsers() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Get org_admin user record
    const { data: adminUserRecord } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!adminUserRecord) {
      return { success: false, data: [], error: 'User record not found' }
    }

    // Get accounts owned by this org_admin
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id')
      .eq('owner_user_id', adminUserRecord.id)
      .eq('is_deleted', false)

    if (!accounts || accounts.length === 0) {
      // If no accounts, return empty (org_admin might not have created an account yet)
      return { success: true, data: [], error: null }
    }

    const accountIds = accounts.map(a => a.id)

    // Get projects in these accounts
    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .in('account_id', accountIds)
      .eq('is_deleted', false)

    if (!projects || projects.length === 0) {
      return { success: true, data: [], error: null }
    }

    const projectIds = projects.map(p => p.id)

    // Get all users who have roles in these projects
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        users:user_id (
          id,
          full_name,
          email,
          is_active
        )
      `)
      .in('project_id', projectIds)
      .eq('is_active', true)
      .eq('is_deleted', false)

    if (!userRoles || userRoles.length === 0) {
      return { success: true, data: [], error: null }
    }

    // Extract unique users
    const userMap = new Map()
    userRoles.forEach(ur => {
      if (ur.users && !userMap.has(ur.users.id)) {
        userMap.set(ur.users.id, ur.users)
      }
    })

    const users = Array.from(userMap.values())
      .filter(u => u.is_active !== false)
      .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''))

    return {
      success: true,
      data: users,
      error: null
    }
  } catch (error) {
    console.error('Error fetching organization users:', error)
    return {
      success: false,
      data: [],
      error: error.message || 'Failed to fetch users'
    }
  }
}

