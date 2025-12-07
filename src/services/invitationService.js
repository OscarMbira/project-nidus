/**
 * Invitation Service
 * Handles project invitation email sending and management
 *
 * IMPORTANT: PM Platform specific - uses appDb (public schema)
 * Works with projectMembershipService for invitation workflow
 */

import { appDb } from './supabase/supabaseClient'
import { inviteUserToProject, getProjectInvitations } from './projectMembershipService'

/**
 * Generate invitation token (uses database function)
 * @returns {Promise<{success: boolean, token: string|null, error: string|null}>}
 */
export async function generateInvitationToken() {
  try {
    const { data, error } = await appDb.rpc('generate_invitation_token')

    if (error) throw error

    return {
      success: true,
      token: data,
      error: null,
    }
  } catch (error) {
    console.error('Error generating invitation token:', error)
    // Fallback: generate token client-side
    const fallbackToken = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
    return {
      success: true,
      token: fallbackToken,
      error: null,
    }
  }
}

/**
 * Send project invitation email
 * @param {string} email - Recipient email
 * @param {object} invitationData - Invitation details
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function sendProjectInvitation(email, invitationData) {
  try {
    // Create invitation record (this will trigger email sending if configured)
    const result = await inviteUserToProject(invitationData.projectId, {
      email: email,
      roleId: invitationData.roleId,
      message: invitationData.message || null,
    })

    if (!result.success) {
      return result
    }

    // TODO: Integrate with email service to send actual email
    // For now, we'll just log it
    console.log('Invitation created:', {
      email,
      projectId: invitationData.projectId,
      token: result.data?.invitation_token,
      invitationUrl: `${window.location.origin}/auth/invitation/${result.data?.invitation_token}`,
    })

    // In production, you would call your email service here:
    // await emailService.sendInvitationEmail(email, {
    //   projectName: invitationData.projectName,
    //   inviterName: invitationData.inviterName,
    //   roleName: invitationData.roleName,
    //   invitationUrl: `${window.location.origin}/auth/invitation/${result.data.invitation_token}`,
    //   message: invitationData.message,
    // })

    return {
      success: true,
      error: null,
    }
  } catch (error) {
    console.error('Error sending invitation email:', error)
    return {
      success: false,
      error: error.message || 'Failed to send invitation email',
    }
  }
}

/**
 * Send invitation reminder email
 * @param {string} invitationId - Invitation UUID
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function sendInvitationReminder(invitationId) {
  try {
    // Get invitation details
    const { data: invitation, error: fetchError } = await appDb
      .from('project_invitations')
      .select(`
        *,
        project:projects(project_name),
        role:roles(role_display_name),
        invited_by:users!project_invitations_invited_by_user_id_fkey(full_name)
      `)
      .eq('id', invitationId)
      .single()

    if (fetchError) throw fetchError

    if (invitation.invitation_status !== 'pending') {
      return {
        success: false,
        error: 'Invitation is not pending',
      }
    }

    // Update reminder timestamp
    await appDb
      .from('project_invitations')
      .update({
        reminder_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', invitationId)

    // TODO: Send actual email
    console.log('Reminder sent for invitation:', {
      email: invitation.invited_email,
      projectName: invitation.project?.project_name,
      invitationUrl: `${window.location.origin}/auth/invitation/${invitation.invitation_token}`,
    })

    return {
      success: true,
      error: null,
    }
  } catch (error) {
    console.error('Error sending invitation reminder:', error)
    return {
      success: false,
      error: error.message || 'Failed to send reminder',
    }
  }
}

/**
 * Send invitation accepted notification to project manager
 * @param {string} projectManagerId - Project manager user ID (internal)
 * @param {object} userData - New user data
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function sendInvitationAccepted(projectManagerId, userData) {
  try {
    // Get project manager email
    const { data: manager, error: managerError } = await appDb
      .from('users')
      .select('email, full_name')
      .eq('id', projectManagerId)
      .single()

    if (managerError) throw managerError

    // TODO: Send actual email
    console.log('Invitation accepted notification:', {
      managerEmail: manager.email,
      newUser: userData.full_name || userData.email,
      projectName: userData.projectName,
    })

    return {
      success: true,
      error: null,
    }
  } catch (error) {
    console.error('Error sending acceptance notification:', error)
    return {
      success: false,
      error: error.message || 'Failed to send notification',
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
    console.error('Error validating invitation token:', error)
    return {
      success: false,
      data: null,
      error: error.message || 'Failed to validate invitation',
    }
  }
}

/**
 * Get invitation details by token
 * @param {string} token - Invitation token
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function getInvitationByToken(token) {
  try {
    const { data, error } = await appDb
      .from('project_invitations')
      .select(`
        *,
        project:projects(
          id,
          project_name,
          project_code
        ),
        role:roles(
          id,
          role_name,
          role_display_name
        ),
        invited_by:users!project_invitations_invited_by_user_id_fkey(
          id,
          full_name,
          email
        )
      `)
      .eq('invitation_token', token)
      .eq('is_deleted', false)
      .single()

    if (error) throw error

    return {
      success: true,
      data: data,
      error: null,
    }
  } catch (error) {
    console.error('Error fetching invitation:', error)
    return {
      success: false,
      data: null,
      error: error.message || 'Failed to fetch invitation',
    }
  }
}

export default {
  generateInvitationToken,
  sendProjectInvitation,
  sendInvitationReminder,
  sendInvitationAccepted,
  validateInvitationToken,
  getInvitationByToken,
}

