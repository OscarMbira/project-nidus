/**
 * Project Membership Service
 * Handles project invitations and user memberships for Platform
 *
 * IMPORTANT: Platform specific - uses appDb (public schema)
 * Manages invitations and role assignments to projects
 */

import { appDb } from './supabase/supabaseClient'
import { isPmoAdmin } from './organisationRoleService'
import { getMyProjects } from './projectService'

/** Maps project_roles.role_name (templates) → roles.role_name used by project_invitations.role_id FK */
const PROJECT_ROLE_TO_LEGACY_INVITATION_ROLE = {
  team_manager: 'pm_team_manager',
  team_member: 'pm_team_member',
  project_assurance: 'pm_project_assurance',
  quality_assurance: 'pm_quality_assurance',
  change_authority: 'pm_change_authority',
}

/**
 * Resolve a selected project role (project_roles.id or legacy roles.id) to roles.id for invitations.
 * @param {string} selectedRoleId
 * @returns {Promise<{success: boolean, invitationRoleId?: string, error?: string|null}>}
 */
export async function resolveInvitationRoleIdForInsert(selectedRoleId) {
  try {
    const { data: pr, error: prErr } = await appDb
      .from('project_roles')
      .select('id, role_name')
      .eq('id', selectedRoleId)
      .maybeSingle()

    if (prErr) throw prErr

    if (pr?.role_name) {
      const legacyName = PROJECT_ROLE_TO_LEGACY_INVITATION_ROLE[pr.role_name]
      if (!legacyName) {
        return { success: false, error: 'This project role cannot be used for email invitations' }
      }
      const { data: lr, error: lrErr } = await appDb
        .from('roles')
        .select('id')
        .eq('role_name', legacyName)
        .eq('is_active', true)
        .eq('is_deleted', false)
        .maybeSingle()

      if (lrErr) throw lrErr
      if (!lr?.id) {
        return {
          success: false,
          error: `System role "${legacyName}" is missing. Run database migrations (v388).`,
        }
      }
      return { success: true, invitationRoleId: lr.id, error: null }
    }

    const { data: legacy, error: legErr } = await appDb
      .from('roles')
      .select('id')
      .eq('id', selectedRoleId)
      .maybeSingle()

    if (legErr) throw legErr
    if (legacy?.id) {
      return { success: true, invitationRoleId: legacy.id, error: null }
    }

    return { success: false, error: 'Invalid role selection' }
  } catch (error) {
    console.error('resolveInvitationRoleIdForInsert:', error)
    return { success: false, error: error.message || 'Failed to resolve invitation role' }
  }
}

/**
 * Projects the current user may manage members for: all active (PMO admin) or my projects (PM).
 * @param {string} internalUserId - public.users.id
 * @param {string} authUserId - auth.users.id
 */
export async function listProjectsForMemberManagement(internalUserId, authUserId) {
  try {
    const admin = await isPmoAdmin(authUserId)
    if (admin) {
      // Keep this lightweight and RLS-friendly; avoid complex embeds from assignment pages.
      const { data: rows, error } = await appDb
        .from('projects')
        .select('id, project_name, project_code')
        .eq('is_deleted', false)
        .order('project_name', { ascending: true })

      if (error) throw error
      return {
        success: true,
        data: (rows || []).map((p) => ({
          id: p.id,
          project_name: p.project_name,
          project_code: p.project_code,
        })),
        error: null,
      }
    }

    const res = await getMyProjects(internalUserId, {})
    if (!res.success) {
      return { success: false, data: [], error: res.error || 'Failed to load projects' }
    }

    const projects = res.data || []
    return {
      success: true,
      data: projects.map((p) => ({
        id: p.id,
        project_name: p.project_name,
        project_code: p.project_code,
      })),
      error: null,
    }
  } catch (error) {
    console.error('listProjectsForMemberManagement:', error)
    return { success: false, data: [], error: error.message || 'Failed to list projects' }
  }
}

/**
 * Invite user to project
 * @param {string} projectId - Project UUID
 * @param {object} invitationData - Invitation details
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function inviteUserToProject(projectId, invitationData) {
  try {
    const { data: { user } } = await appDb.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const resolved = await resolveInvitationRoleIdForInsert(invitationData.roleId)
    if (!resolved.success) {
      return { success: false, data: null, error: resolved.error || 'Invalid role' }
    }
    const invitationRoleId = resolved.invitationRoleId

    // Get internal user ID
    const { data: userData, error: userError } = await appDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (userError) throw userError

    // Check if user already exists with this email
    const { data: existingUser } = await appDb
      .from('users')
      .select('id')
      .eq('email', invitationData.email)
      .single()

    // Check seat availability first
    const { data: seatCheck, error: seatError } = await appDb.rpc('check_seat_availability', {
      p_project_id: projectId,
    })

    if (seatError) throw seatError

    if (seatCheck && seatCheck.length > 0 && !seatCheck[0].has_available_seats) {
      return {
        success: false,
        data: null,
        error: 'No available seats. Please purchase additional seats.',
        code: 'SEAT_LIMIT_EXCEEDED',
        seatInfo: seatCheck[0],
      }
    }

    // Create invitation
    const { data, error } = await appDb
      .from('project_invitations')
      .insert({
        project_id: projectId,
        invited_email: invitationData.email,
        invited_user_id: existingUser?.id || null,
        role_id: invitationRoleId,
        invited_by_user_id: userData.id,
        invitation_message: invitationData.message || null,
        invitation_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      })
      .select(`
        *,
        project:projects(project_name),
        role:roles(role_display_name)
      `)
      .single()

    if (error) throw error

    return {
      success: true,
      data: data,
      error: null,
    }
  } catch (error) {
    console.error('Error inviting user:', error)
    return {
      success: false,
      data: null,
      error: error.message || 'Failed to send invitation',
    }
  }
}

/**
 * Get project invitations (sent)
 * @param {string} projectId - Project UUID
 * @param {string} status - Filter by status (optional)
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function getProjectInvitations(projectId, status = null) {
  try {
    let query = appDb
      .from('project_invitations')
      .select(`
        *,
        invited_by:users!project_invitations_invited_by_user_id_fkey(full_name, email),
        role:roles(role_display_name, role_name)
      `)
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('invitation_status', status)
    }

    const { data, error } = await query

    if (error) throw error

    return {
      success: true,
      data: data || [],
      error: null,
    }
  } catch (error) {
    console.error('Error fetching invitations:', error)
    return {
      success: false,
      data: [],
      error: error.message || 'Failed to fetch invitations',
    }
  }
}

/**
 * Invitations + seat row via RPC (bypasses table RLS; see SQL v399).
 * @param {string} projectId
 * @param {string|null} invitationStatus e.g. 'pending', or null for all non-deleted
 * @returns {Promise<{success: boolean, data: {invitations: array, seat_allocation: object|null}|null, error: string|null, useTableFallback?: boolean}>}
 */
export async function getProjectInviteContext(projectId, invitationStatus = null) {
  try {
    const { data, error } = await appDb.rpc('get_project_invite_context', {
      p_project_id: projectId,
      p_invitation_status: invitationStatus,
    })

    if (error) {
      const msg = error.message || ''
      const missingFn =
        error.code === '42883' ||
        error.code === 'PGRST202' ||
        /does not exist|function .* not found/i.test(msg)
      return {
        success: false,
        data: null,
        error: msg || 'RPC failed',
        useTableFallback: !!missingFn,
      }
    }

    const inv = data?.invitations
    const invitations = Array.isArray(inv) ? inv : []

    return {
      success: true,
      data: {
        invitations,
        seat_allocation: data?.seat_allocation ?? null,
      },
      error: null,
      useTableFallback: false,
    }
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error.message || 'RPC failed',
      useTableFallback: true,
    }
  }
}

/**
 * Validate invitation token
 * @param {string} token - Invitation token
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function validateInvitationToken(token) {
  try {
    const { data, error } = await appDb.rpc('validate_invitation_token', {
      p_token: token,
    })

    if (error) throw error

    if (!data || data.length === 0) {
      return {
        success: false,
        data: null,
        error: 'Invalid invitation token',
      }
    }

    const invitation = data[0]

    if (!invitation.is_valid) {
      return {
        success: false,
        data: invitation,
        error: 'Invitation has expired or is no longer valid',
      }
    }

    return {
      success: true,
      data: invitation,
      error: null,
    }
  } catch (error) {
    console.error('Error validating invitation:', error)
    return {
      success: false,
      data: null,
      error: error.message || 'Failed to validate invitation',
    }
  }
}

/**
 * Accept invitation
 * @param {string} token - Invitation token
 * @param {string} userId - Internal user ID (not auth_user_id)
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function acceptInvitation(token, userId) {
  try {
    const { data, error } = await appDb.rpc('accept_project_invitation', {
      p_token: token,
      p_accepting_user_id: userId,
    })

    if (error) {
      // Check if it's a seat limit error
      if (error.message && error.message.includes('No available seats')) {
        return {
          success: false,
          data: null,
          error: 'No available seats in this project',
          code: 'SEAT_LIMIT_EXCEEDED',
        }
      }
      throw error
    }

    if (!data) {
      return {
        success: false,
        data: null,
        error: 'Failed to accept invitation',
      }
    }

    return {
      success: true,
      data: { accepted: true },
      error: null,
    }
  } catch (error) {
    console.error('Error accepting invitation:', error)
    return {
      success: false,
      data: null,
      error: error.message || 'Failed to accept invitation',
    }
  }
}

/**
 * Decline invitation
 * @param {string} invitationId - Invitation UUID
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function declineInvitation(invitationId) {
  try {
    const { data, error } = await appDb
      .from('project_invitations')
      .update({
        invitation_status: 'declined',
        declined_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', invitationId)
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      data: data,
      error: null,
    }
  } catch (error) {
    console.error('Error declining invitation:', error)
    return {
      success: false,
      data: null,
      error: error.message || 'Failed to decline invitation',
    }
  }
}

/**
 * Cancel invitation (by sender)
 * @param {string} invitationId - Invitation UUID
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function cancelInvitation(invitationId) {
  try {
    const { data, error } = await appDb
      .from('project_invitations')
      .update({
        invitation_status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', invitationId)
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      data: data,
      error: null,
    }
  } catch (error) {
    console.error('Error cancelling invitation:', error)
    return {
      success: false,
      data: null,
      error: error.message || 'Failed to cancel invitation',
    }
  }
}

/**
 * Resend invitation email
 * @param {string} invitationId - Invitation UUID
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function resendInvitation(invitationId) {
  try {
    const { data, error } = await appDb
      .from('project_invitations')
      .update({
        reminder_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', invitationId)
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      data: data,
      error: null,
    }
  } catch (error) {
    console.error('Error resending invitation:', error)
    return {
      success: false,
      data: null,
      error: error.message || 'Failed to resend invitation',
    }
  }
}

/**
 * Get project members
 * @param {string} projectId - Project UUID
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function getProjectMembers(projectId) {
  try {
    const { data, error } = await appDb
      .from('project_memberships')
      .select(`
        id,
        project_id,
        user_id,
        project_role_id,
        accepted_at,
        created_at,
        invitation_status,
        is_active,
        user:users!project_memberships_user_id_fkey(
          id,
          full_name,
          email,
          avatar_url,
          last_login_at
        ),
        role:project_roles(
          id,
          role_name,
          role_display_name,
          role_level
        )
      `)
      .eq('project_id', projectId)
      .eq('is_active', true)
      .or('invitation_status.eq.accepted,invitation_status.is.null')
      .order('created_at', { ascending: false })

    if (error) {
      // Fallback path for PMO-admin contexts where project_memberships RLS is still restrictive.
      // We can still resolve members from user_roles for the selected project.
      if (error.code === '42501') {
        const { data: fallbackRows, error: fallbackError } = await appDb
          .from('user_roles')
          .select(`
            id,
            project_id,
            user_id,
            role_id,
            assigned_at,
            is_active,
            users:users!user_roles_user_id_fkey(
              id,
              full_name,
              email,
              avatar_url,
              last_login_at
            ),
            roles:roles!user_roles_role_id_fkey(
              id,
              role_name,
              role_display_name,
              role_level
            )
          `)
          .eq('project_id', projectId)
          .eq('is_active', true)
          .eq('is_deleted', false)
          .order('assigned_at', { ascending: false })

        if (!fallbackError) {
          const mapped = (fallbackRows || []).map((r) => ({
            id: `ur-${r.id}`,
            project_id: r.project_id,
            user_id: r.user_id,
            project_role_id: null,
            accepted_at: r.assigned_at,
            created_at: r.assigned_at,
            invitation_status: 'accepted',
            is_active: r.is_active,
            user: r.users || null,
            role: r.roles || null,
          }))

          return {
            success: true,
            data: mapped,
            error: null,
          }
        }
      }
      throw error
    }

    return {
      success: true,
      data: data || [],
      error: null,
    }
  } catch (error) {
    console.error('Error fetching project members:', error)
    return {
      success: false,
      data: [],
      error: error.message || 'Failed to fetch project members',
    }
  }
}

/**
 * Update member role (project_memberships.project_role_id)
 * @param {string} membershipId - project_memberships.id
 * @param {string} newProjectRoleId - project_roles.id
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function updateMemberRole(membershipId, newProjectRoleId) {
  try {
    const { data, error } = await appDb
      .from('project_memberships')
      .update({
        project_role_id: newProjectRoleId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', membershipId)
      .select(`
        *,
        role:project_roles(role_name, role_display_name)
      `)
      .single()

    if (error) throw error

    return {
      success: true,
      data: data,
      error: null,
    }
  } catch (error) {
    console.error('Error updating member role:', error)
    return {
      success: false,
      data: null,
      error: error.message || 'Failed to update member role',
    }
  }
}

/**
 * Remove member from project (deactivate project_memberships row)
 * @param {string} membershipId - project_memberships.id
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function removeMemberFromProject(membershipId) {
  try {
    const { data, error } = await appDb
      .from('project_memberships')
      .update({
        is_active: false,
        invitation_status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', membershipId)
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      data: data,
      error: null,
    }
  } catch (error) {
    console.error('Error removing member:', error)
    return {
      success: false,
      data: null,
      error: error.message || 'Failed to remove member',
    }
  }
}

/**
 * Get user's pending invitations
 * @param {string} email - User email
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function getUserPendingInvitations(email) {
  try {
    const { data, error } = await appDb
      .from('project_invitations')
      .select(`
        *,
        project:projects(project_name, project_code),
        role:roles(role_display_name),
        invited_by:users!project_invitations_invited_by_user_id_fkey(full_name)
      `)
      .eq('invited_email', email)
      .eq('invitation_status', 'pending')
      .gt('invitation_expires_at', new Date().toISOString())
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (error) throw error

    return {
      success: true,
      data: data || [],
      error: null,
    }
  } catch (error) {
    console.error('Error fetching pending invitations:', error)
    return {
      success: false,
      data: [],
      error: error.message || 'Failed to fetch pending invitations',
    }
  }
}

export default {
  inviteUserToProject,
  getProjectInvitations,
  getProjectInviteContext,
  validateInvitationToken,
  acceptInvitation,
  declineInvitation,
  cancelInvitation,
  resendInvitation,
  getProjectMembers,
  updateMemberRole,
  removeMemberFromProject,
  getUserPendingInvitations,
  resolveInvitationRoleIdForInsert,
  listProjectsForMemberManagement,
}
