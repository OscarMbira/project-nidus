/**
 * PMO Admin Service
 * 
 * Handles PMO Admin specific functions:
 * 1. Assign roles to projects
 * 2. Send email invites to roles (excluding Team Manager and Team Member)
 */

import { supabase } from './supabaseClient'
import { assignProjectRole } from './roleService'
import { inviteUserToProject } from './projectMembershipService'
import { sendProjectInvitation } from './invitationService'

/**
 * Check if user is PMO Admin
 * @param {string} authUserId - Auth user ID
 * @returns {Promise<boolean>}
 */
export async function isPMOAdmin(authUserId) {
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

    // Check for pmo_admin role
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

    const hasPMOAdminRole = userRoles.some(
      assignment => assignment.roles?.role_name === 'pmo_admin'
    )

    return hasPMOAdminRole
  } catch (error) {
    console.error('Error checking PMO Admin role:', error)
    return false
  }
}

/**
 * Get all projects for PMO admin
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
export async function getAssignableRolesForPMOAdmin() {
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
      .neq('role_name', 'pmo_admin')

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

    // Verify user is pmo_admin
    const isAdmin = await isPMOAdmin(user.id)
    if (!isAdmin) {
      return {
        success: false,
        error: 'Only PMO Admin can assign roles to projects'
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
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function sendRoleInvitation(projectId, email, roleId, message = null) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Verify user is pmo_admin
    const isAdmin = await isPMOAdmin(user.id)
    if (!isAdmin) {
      return {
        success: false,
        error: 'Only PMO Admin can send invitations'
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
      .select('project_name, project_code')
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
      .select('full_name, email')
      .eq('auth_user_id', user.id)
      .single()

    // Send email invitation (this will create the invitation record and send email)
    const result = await sendProjectInvitation(email, {
      projectId,
      projectName: project?.project_name || 'Project',
      projectCode: project?.project_code || null,
      roleId,
      roleName: roleDisplayName,
      inviterName: inviterUser?.full_name || inviterUser?.email || 'PMO Admin',
      message
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
 * Get users who can be assigned to projects (same project scope as {@link getAllProjects}).
 * Uses project_memberships and user_roles for those projects so PMO Admins who are not
 * account owners still see members, and invited members appear before a legacy user_roles row exists.
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function getOrganizationUsers() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const projectsResult = await getAllProjects()
    if (!projectsResult.success) {
      return {
        success: false,
        data: [],
        error: projectsResult.error || 'Failed to resolve projects'
      }
    }

    const projectIds = (projectsResult.data || []).map((p) => p.id)
    if (projectIds.length === 0) {
      return { success: true, data: [], error: null }
    }

    const userMap = new Map()

    const { data: userRolesRows, error: urErr } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        users:users!user_roles_user_id_fkey (
          id,
          full_name,
          email,
          is_active
        )
      `)
      .in('project_id', projectIds)
      .eq('is_active', true)
      .eq('is_deleted', false)

    if (urErr) throw urErr
    ;(userRolesRows || []).forEach((row) => {
      const u = row.users
      if (u?.id && u.is_active !== false) userMap.set(u.id, u)
    })

    const { data: memberships, error: pmErr } = await supabase
      .from('project_memberships')
      .select(`
        user_id,
        users:users!project_memberships_user_id_fkey (
          id,
          full_name,
          email,
          is_active
        )
      `)
      .in('project_id', projectIds)
      .eq('is_active', true)
      .or('invitation_status.eq.accepted,invitation_status.is.null')

    if (pmErr) throw pmErr
    ;(memberships || []).forEach((row) => {
      const u = row.users
      if (u?.id && u.is_active !== false) userMap.set(u.id, u)
    })

    const users = Array.from(userMap.values()).sort((a, b) =>
      (a.full_name || '').localeCompare(b.full_name || '')
    )

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

/**
 * Get PMO Control Strip data (intervention signals)
 * @param {string} accountId - Account ID
 * @returns {Promise<{success: boolean, data: object, error: string|null}>}
 */
export async function getPMOControlStripData(accountId) {
  try {
    // Get projects for this account
    const { data: accountProjects, error: projectsError } = await supabase
      .from('projects')
      .select('id')
      .eq('account_id', accountId)
      .eq('is_deleted', false)

    if (projectsError) throw projectsError

    if (!accountProjects || accountProjects.length === 0) {
      return {
        success: true,
        data: {
          projects_requiring_attention: 0,
          projects_in_exception: 0,
          overdue_stage_gates: 0,
          pm_capacity_breaches: 0,
          orphan_projects: 0
        },
        error: null
      }
    }

    // Query the pmo_control_strip_view
    const { data, error } = await supabase
      .from('pmo_control_strip_view')
      .select('*')
      .limit(1)
      .single()

    if (error) {
      // If view doesn't exist or error, calculate manually
      console.warn('Error querying pmo_control_strip_view, calculating manually:', error)
      return await calculatePMOControlStripData(accountId)
    }

    return {
      success: true,
      data: data || {
        projects_requiring_attention: 0,
        projects_in_exception: 0,
        overdue_stage_gates: 0,
        pm_capacity_breaches: 0,
        orphan_projects: 0
      },
      error: null
    }
  } catch (error) {
    console.error('Error fetching PMO Control Strip data:', error)
    return {
      success: false,
      data: null,
      error: error.message || 'Failed to fetch PMO Control Strip data'
    }
  }
}

/**
 * Calculate PMO Control Strip data manually (fallback)
 */
async function calculatePMOControlStripData(accountId) {
  try {
    const projectIds = await supabase
      .from('projects')
      .select('id')
      .eq('account_id', accountId)
      .eq('is_deleted', false)
      .then(({ data }) => data?.map(p => p.id) || [])

    if (projectIds.length === 0) {
      return {
        success: true,
        data: {
          projects_requiring_attention: 0,
          projects_in_exception: 0,
          overdue_stage_gates: 0,
          pm_capacity_breaches: 0,
          orphan_projects: 0
        },
        error: null
      }
    }

    // Projects requiring attention (RAG != Green)
    const { count: attentionCount } = await supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .in('id', projectIds)
      .in('health_status', ['red', 'Red', 'amber', 'yellow', 'Amber', 'Yellow'])
      .eq('is_deleted', false)

    // Projects in exception
    const { count: exceptionCount } = await supabase
      .from('exceptions')
      .select('project_id', { count: 'exact', head: true })
      .in('project_id', projectIds)
      .in('exception_status', ['OPEN', 'ESCALATED', 'UNDER_REVIEW'])
      .eq('is_deleted', false)

    // Overdue stage gates
    const { count: overdueGatesCount } = await supabase
      .from('stage_boundaries')
      .select('id', { count: 'exact', head: true })
      .in('project_id', projectIds)
      .eq('is_deleted', false)
      .not('status', 'in', '(approved,rejected)')
      .lt('planned_date', new Date().toISOString().split('T')[0])

    // PM capacity breaches (from pm_capacity_view)
    const { data: pmCapacityData } = await supabase
      .from('pm_capacity_view')
      .select('capacity_status')
      .eq('capacity_status', 'BREACH')

    // Orphan projects
    const { count: orphanCount } = await supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .in('id', projectIds)
      .eq('is_orphan', true)
      .eq('is_deleted', false)

    return {
      success: true,
      data: {
        projects_requiring_attention: attentionCount || 0,
        projects_in_exception: exceptionCount || 0,
        overdue_stage_gates: overdueGatesCount || 0,
        pm_capacity_breaches: pmCapacityData?.length || 0,
        orphan_projects: orphanCount || 0
      },
      error: null
    }
  } catch (error) {
    console.error('Error calculating PMO Control Strip data:', error)
    return {
      success: false,
      data: null,
      error: error.message
    }
  }
}

/**
 * Assign Executive to a project
 * @param {string} projectId - Project ID
 * @param {string} executiveUserId - Executive user ID
 * @param {string} actorUserId - User performing the assignment
 * @returns {Promise<{success: boolean, data: object, error: string|null}>}
 */
export async function assignExecutive(projectId, executiveUserId, actorUserId) {
  try {
    const { data, error } = await supabase
      .from('project_assignments')
      .insert([{
        project_id: projectId,
        user_id: executiveUserId,
        assignment_type: 'EXECUTIVE',
        is_active: true,
        assigned_by: actorUserId,
        created_by: actorUserId
      }])
      .select()
      .single()

    if (error) throw error

    // Log audit action
    const { logAction } = await import('./pmoAuditService')
    await logAction(
      actorUserId,
      'ASSIGN_EXECUTIVE',
      'PROJECT',
      projectId,
      `Assigned executive to project`,
      { executive_user_id: executiveUserId, project_id: projectId }
    )

    return { success: true, data }
  } catch (error) {
    console.error('Error assigning executive:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Assign Project Manager to a project (with capacity check)
 * @param {string} projectId - Project ID
 * @param {string} pmUserId - PM user ID
 * @param {string} actorUserId - User performing the assignment
 * @returns {Promise<{success: boolean, data: object, error: string|null}>}
 */
export async function assignProjectManager(projectId, pmUserId, actorUserId) {
  try {
    // Check capacity before assigning
    const { checkCapacityBeforeAssignment } = await import('./pmCapacityService')
    const capacityCheck = await checkCapacityBeforeAssignment(pmUserId, projectId)

    if (!capacityCheck.success || !capacityCheck.hasCapacity) {
      return {
        success: false,
        error: capacityCheck.message || 'PM does not have capacity for this assignment'
      }
    }

    const { data, error } = await supabase
      .from('project_assignments')
      .insert([{
        project_id: projectId,
        user_id: pmUserId,
        assignment_type: 'PROJECT_MANAGER',
        is_active: true,
        assigned_by: actorUserId,
        created_by: actorUserId
      }])
      .select()
      .single()

    if (error) throw error

    // Log audit action
    const { logAction } = await import('./pmoAuditService')
    await logAction(
      actorUserId,
      'ASSIGN_PM',
      'PROJECT',
      projectId,
      `Assigned project manager to project`,
      { pm_user_id: pmUserId, project_id: projectId }
    )

    return { success: true, data }
  } catch (error) {
    console.error('Error assigning project manager:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Assign Board Member to a project
 * @param {string} projectId - Project ID
 * @param {string} boardMemberUserId - Board member user ID
 * @param {string} actorUserId - User performing the assignment
 * @returns {Promise<{success: boolean, data: object, error: string|null}>}
 */
export async function assignBoardMember(projectId, boardMemberUserId, actorUserId) {
  try {
    const { data, error } = await supabase
      .from('project_assignments')
      .insert([{
        project_id: projectId,
        user_id: boardMemberUserId,
        assignment_type: 'BOARD_MEMBER',
        is_active: true,
        assigned_by: actorUserId,
        created_by: actorUserId
      }])
      .select()
      .single()

    if (error) throw error

    // Log audit action
    const { logAction } = await import('./pmoAuditService')
    await logAction(
      actorUserId,
      'ASSIGN_BOARD_MEMBER',
      'PROJECT',
      projectId,
      `Assigned board member to project`,
      { board_member_user_id: boardMemberUserId, project_id: projectId }
    )

    return { success: true, data }
  } catch (error) {
    console.error('Error assigning board member:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Suspend a project
 * @param {string} projectId - Project ID
 * @param {string} reason - Reason for suspension
 * @param {string} actorUserId - User performing the suspension
 * @returns {Promise<{success: boolean, data: object, error: string|null}>}
 */
export async function suspendProject(projectId, reason, actorUserId) {
  try {
    // Get current project status
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, project_name, status_id')
      .eq('id', projectId)
      .single()

    if (projectError) throw projectError

    // Get 'Suspended' status ID
    const { data: suspendedStatus, error: statusError } = await supabase
      .from('project_statuses')
      .select('id')
      .eq('status_name', 'Suspended')
      .single()

    if (statusError) {
      // If suspended status doesn't exist, use 'On Hold'
      const { data: onHoldStatus } = await supabase
        .from('project_statuses')
        .select('id')
        .eq('status_name', 'On Hold')
        .single()

      if (!onHoldStatus) {
        throw new Error('Could not find appropriate status for suspension')
      }

      // Update project status
      const { data: updatedProject, error: updateError } = await supabase
        .from('projects')
        .update({ status_id: onHoldStatus.id })
        .eq('id', projectId)
        .select()
        .single()

      if (updateError) throw updateError

      // Log audit action
      const { logAction } = await import('./pmoAuditService')
      await logAction(
        actorUserId,
        'SUSPEND_PROJECT',
        'PROJECT',
        projectId,
        `Suspended project: ${reason || 'No reason provided'}`,
        { project_id: projectId, reason, status_id: onHoldStatus.id }
      )

      return { success: true, data: updatedProject }
    }

    // Update project status to Suspended
    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update({ status_id: suspendedStatus.id })
      .eq('id', projectId)
      .select()
      .single()

    if (updateError) throw updateError

    // Log audit action
    const { logAction } = await import('./pmoAuditService')
    await logAction(
      actorUserId,
      'SUSPEND_PROJECT',
      'PROJECT',
      projectId,
      `Suspended project: ${reason || 'No reason provided'}`,
      { project_id: projectId, reason, status_id: suspendedStatus.id }
    )

    return { success: true, data: updatedProject }
  } catch (error) {
    console.error('Error suspending project:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get all PMO Dashboard data in one call
 * @param {string} accountId - Account ID
 * @returns {Promise<{success: boolean, data: object, error: string|null}>}
 */
export async function getPMODashboardData(accountId) {
  try {
    // Get all PMO dashboard metrics in parallel
    const [
      controlStripResult,
      capacityResult,
      exceptionsResult,
      gatesResult
    ] = await Promise.allSettled([
      getPMOControlStripData(accountId),
      (async () => {
        const { getPMCapacityStatus } = await import('./pmCapacityService')
        return getPMCapacityStatus(accountId)
      })(),
      (async () => {
        const { getAllExceptions } = await import('./exceptionService')
        return getAllExceptions(accountId, { status: ['OPEN', 'ESCALATED', 'UNDER_REVIEW'] })
      })(),
      (async () => {
        const { getOverdueGates } = await import('./stageGateService')
        return getOverdueGates(accountId)
      })()
    ])

    return {
      success: true,
      data: {
        control_strip: controlStripResult.status === 'fulfilled' ? controlStripResult.value.data : null,
        pm_capacity: capacityResult.status === 'fulfilled' ? capacityResult.value.data : null,
        exceptions: exceptionsResult.status === 'fulfilled' ? exceptionsResult.value.data : null,
        overdue_gates: gatesResult.status === 'fulfilled' ? gatesResult.value.data : null
      }
    }
  } catch (error) {
    console.error('Error getting PMO dashboard data:', error)
    return { success: false, error: error.message }
  }
}
