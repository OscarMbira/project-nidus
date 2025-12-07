/**
 * Project Membership Service
 * Handles project invitations and user memberships for PM Platform
 *
 * IMPORTANT: PM Platform specific - uses appDb (public schema)
 * Manages invitations and role assignments to projects
 */

import { appDb } from './supabase/supabaseClient'

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
        role_id: invitationData.roleId,
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
      .from('user_roles')
      .select(`
        id,
        user_id,
        role_id,
        assigned_at,
        is_active,
        user:users(
          id,
          full_name,
          email,
          avatar_url,
          last_login_at
        ),
        role:roles(
          id,
          role_name,
          role_display_name,
          role_level
        )
      `)
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .eq('is_active', true)
      .order('assigned_at', { ascending: false })

    if (error) throw error

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
 * Update member role
 * @param {string} userRoleId - user_roles record ID
 * @param {string} newRoleId - New role UUID
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function updateMemberRole(userRoleId, newRoleId) {
  try {
    const { data, error } = await appDb
      .from('user_roles')
      .update({
        role_id: newRoleId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userRoleId)
      .select()
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
 * Remove member from project
 * @param {string} userRoleId - user_roles record ID
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function removeMemberFromProject(userRoleId) {
  try {
    const { data, error } = await appDb
      .from('user_roles')
      .update({
        is_active: false,
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userRoleId)
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
  validateInvitationToken,
  acceptInvitation,
  declineInvitation,
  cancelInvitation,
  resendInvitation,
  getProjectMembers,
  updateMemberRole,
  removeMemberFromProject,
  getUserPendingInvitations,
}
