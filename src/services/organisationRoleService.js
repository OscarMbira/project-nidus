/**
 * Organisation Role Service
 * 
 * Handles role assignment and invitation for organisation-level roles
 * PMO Admin can assign/invite:
 * - Project/Programme Manager
 * - Project Board Members
 * - Project Assurance
 * - Quality Assurance
 */

import { platformDb } from './supabase/supabaseClient';
import { assignSystemRole, getUserSystemRoles } from './roleService';
import { matchesPmoSuiteAdminRole } from './pmoSuiteRoleAccess';
import { sendEmail } from './emailIntegrationService';
import {
  escapeHtml,
  formatInvitationPersonalMessageHtml,
  wrapInvitationMessageCard,
} from '../utils/invitationMessageEmailFormat';

/**
 * Get available roles that PMO Admin can assign
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function getAssignableRoles() {
  try {
    const { data, error } = await platformDb
      .from('roles')
      .select('id, role_name, role_display_name, role_description, role_level')
      .eq('is_active', true)
      .eq('is_deleted', false)
      .in('role_name', [
        'programme_manager',
        'project_manager',
        'project_board_member',
        'project_assurance',
        'quality_assurance'
      ])
      .order('role_level', { ascending: false });

    if (error) throw error;

    return {
      success: true,
      data: data || [],
      error: null
    };
  } catch (error) {
    console.error('Error fetching assignable roles:', error);
    return {
      success: false,
      data: [],
      error: error.message || 'Failed to fetch assignable roles'
    };
  }
}

/**
 * Check if user is PMO Admin
 * @param {string} authUserId - Auth user ID
 * @returns {Promise<boolean>}
 */
export async function isPmoAdmin(authUserId) {
  try {
    const rolesResult = await getUserSystemRoles(authUserId);
    
    if (!rolesResult.success || !rolesResult.data) {
      return false;
    }

    const isAdmin = rolesResult.data.some((assignment) =>
      matchesPmoSuiteAdminRole(assignment.roles?.role_name),
    )

    return isAdmin
  } catch (error) {
    console.error('Error checking PMO Admin role:', error);
    return false;
  }
}

/**
 * Check if user is Project Sponsor/Executive
 * @param {string} authUserId - Auth user ID
 * @returns {Promise<boolean>}
 */
export async function isProjectSponsorOrAdmin(authUserId) {
  try {
    const rolesResult = await getUserSystemRoles(authUserId);
    
    if (!rolesResult.success || !rolesResult.data) {
      return false;
    }

    const hasPrivilegedRole = rolesResult.data.some(
      assignment => assignment.roles?.role_name === 'project_sponsor' || 
                    assignment.roles?.role_name === 'executive'
    );

    return hasPrivilegedRole;
  } catch (error) {
    console.error('Error checking Project Sponsor/Admin role:', error);
    return false;
  }
}

/**
 * @deprecated Use isProjectSponsorOrAdmin instead
 * Legacy alias for backward compatibility
 */
export const isProjectSponsor = isProjectSponsorOrAdmin;

/**
 * Assign role to existing user in organisation
 * @param {string} targetAuthUserId - Target user's auth ID
 * @param {string} roleName - Role name to assign
 * @param {string} inviterAuthUserId - Inviter's auth ID (must be PMO Admin)
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function assignRoleToUser(targetAuthUserId, roleName, inviterAuthUserId) {
  try {
    // Verify inviter is PMO Admin
    const isAdmin = await isPmoAdmin(inviterAuthUserId);
    if (!isAdmin) {
      return {
        success: false,
        error: 'Only PMO Admin can assign roles'
      };
    }

    // Verify role is assignable
    const assignableRoles = await getAssignableRoles();
    if (!assignableRoles.success) {
      return {
        success: false,
        error: 'Failed to verify assignable roles'
      };
    }

    const roleExists = assignableRoles.data.some(r => r.role_name === roleName);
    if (!roleExists) {
      return {
        success: false,
        error: `Role '${roleName}' cannot be assigned by PMO Admin`
      };
    }

    // Assign the role
    const result = await assignSystemRole(targetAuthUserId, roleName);
    
    if (!result.success) {
      return result;
    }

    // Get user details for notification
    const { data: user } = await platformDb
      .from('users')
      .select('email, full_name')
      .eq('auth_user_id', targetAuthUserId)
      .single();

    // Send notification email (if email service configured)
    if (user) {
      try {
        const { data: role } = await platformDb
          .from('roles')
          .select('role_display_name')
          .eq('role_name', roleName)
          .single();

        await sendEmail(
          user.email,
          'Role Assignment Notification',
          generateRoleAssignmentEmail(user.full_name || user.email, role?.role_display_name || roleName),
          'role-assignment'
        );
      } catch (emailError) {
        console.warn('Failed to send role assignment email:', emailError);
        // Don't fail the assignment if email fails
      }
    }

    return {
      success: true,
      error: null
    };
  } catch (error) {
    console.error('Error assigning role to user:', error);
    return {
      success: false,
      error: error.message || 'Failed to assign role'
    };
  }
}

/**
 * Invite user to organisation with specific role
 * @param {string} email - Email address to invite
 * @param {string} roleName - Role name to assign
 * @param {string} inviterAuthUserId - Inviter's auth ID (must be PMO Admin)
 * @param {string} message - Optional invitation message
 * @returns {Promise<{success: boolean, invitationId: string|null, error: string|null}>}
 */
export async function inviteUserWithRole(email, roleName, inviterAuthUserId, message = null) {
  try {
    // Verify inviter is PMO Admin
    const isAdmin = await isPmoAdmin(inviterAuthUserId);
    if (!isAdmin) {
      return {
        success: false,
        invitationId: null,
        error: 'Only PMO Admin can invite users'
      };
    }

    // Verify role is assignable
    const assignableRoles = await getAssignableRoles();
    if (!assignableRoles.success) {
      return {
        success: false,
        invitationId: null,
        error: 'Failed to verify assignable roles'
      };
    }

    const role = assignableRoles.data.find(r => r.role_name === roleName);
    if (!role) {
      return {
        success: false,
        invitationId: null,
        error: `Role '${roleName}' cannot be assigned by PMO Admin`
      };
    }

    // Get inviter details
    const { data: inviter } = await platformDb
      .from('users')
      .select('id, full_name, email')
      .eq('auth_user_id', inviterAuthUserId)
      .single();

    if (!inviter) {
      return {
        success: false,
        invitationId: null,
        error: 'Inviter not found'
      };
    }

    // Get organisation ID
    const { data: org } = await platformDb
      .from('accounts')
      .select('id, account_name')
      .eq('owner_user_id', inviter.id)
      .single();

    if (!org) {
      return {
        success: false,
        invitationId: null,
        error: 'Organisation not found'
      };
    }

    // Check if user already exists
    const { data: existingUser } = await platformDb
      .from('users')
      .select('id, auth_user_id, email')
      .eq('email', email)
      .maybeSingle();

    // Generate invitation token
    const invitationToken = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create organisation invitation record
    // Note: You may need to create an organisation_invitations table
    // For now, we'll use a simple approach with user_roles and a flag
    
    // If user exists, assign role directly
    if (existingUser && existingUser.auth_user_id) {
      const assignResult = await assignSystemRole(existingUser.auth_user_id, roleName);
      
      if (assignResult.success) {
        // Send notification email
        try {
          await sendEmail(
            email,
            'Role Assignment Notification',
            generateRoleAssignmentEmail(existingUser.email, role.role_display_name),
            'role-assignment'
          );
        } catch (emailError) {
          console.warn('Failed to send role assignment email:', emailError);
        }

        return {
          success: true,
          invitationId: null,
          error: null,
          message: 'Role assigned to existing user'
        };
      }
    }

    // User doesn't exist - create invitation
    // Create invitation record in organisation_invitations table
    let invitation = null;
    try {
      const { data, error: inviteError } = await platformDb
        .from('organisation_invitations')
        .insert({
          organisation_id: org.id,
          invited_email: email,
          role_id: role.id,
          role_name: roleName,
          invited_by_user_id: inviter.id,
          invitation_token: invitationToken,
          invitation_message: message,
          invitation_expires_at: expiresAt.toISOString(),
          invitation_status: 'pending'
        })
        .select()
        .single();

      if (inviteError) {
        // If table doesn't exist yet, log warning but continue
        console.warn('organisation_invitations table may not exist. Run SQL/v120_organisation_invitations.sql migration.');
        // Use token as ID for now
        invitation = { id: invitationToken };
      } else {
        invitation = data;
      }
    } catch (err) {
      console.warn('Error creating invitation record:', err);
      // Continue with token-based invitation
      invitation = { id: invitationToken };
    }
    
    // Send invitation email with signup link
    try {
      // Link to Platform signup with invitation token
      // User will signup → email confirmation → login → role assignment
      const signupLink = `${window.location.origin}/platform/register?invitation=${invitationToken}`;
      await sendEmail(
        email,
        `Invitation to join ${org.account_name}`,
        generateRoleInvitationEmail(
          email,
          role.role_display_name,
          org.account_name,
          inviter.full_name || inviter.email,
          signupLink,
          message
        ),
        'role-invitation'
      );
    } catch (emailError) {
      console.warn('Failed to send invitation email:', emailError);
      // Continue anyway - invitation can be resent
    }

    return {
      success: true,
      invitationId: invitation?.id || invitationToken,
      error: null,
      message: 'Invitation sent successfully'
    };
  } catch (error) {
    console.error('Error inviting user with role:', error);
    return {
      success: false,
      invitationId: null,
      error: error.message || 'Failed to invite user'
    };
  }
}

/**
 * Get all users in organisation with their roles
 * @param {string} authUserId - Auth user ID (must be PMO Admin)
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function getOrganisationUsers(authUserId, alreadyVerifiedAdmin = false) {
  try {
    if (!alreadyVerifiedAdmin) {
      const isAdmin = await isPmoAdmin(authUserId);
      if (!isAdmin) {
        return {
          success: false,
          data: [],
          error: 'Only PMO Admin can view organisation users'
        };
      }
    }

    // Always resolve user and org (needed for org.id in named_contacts query)
    const { data: user } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', authUserId)
      .single();

    if (!user) {
      return { success: false, data: [], error: 'User not found' };
    }

    const { data: org } = await platformDb
      .from('accounts')
      .select('id')
      .eq('owner_user_id', user.id)
      .single();

    if (!org) {
      return { success: false, data: [], error: 'Organisation not found' };
    }

    // Get all users in organisation (users who have roles assigned)
    const { data: users, error } = await platformDb
      .from('user_roles')
      .select(`
        id,
        user_id,
        users:users!user_roles_user_id_fkey (
          id,
          email,
          full_name,
          is_active
        ),
        roles:role_id (
          id,
          role_name,
          role_display_name,
          role_level
        ),
        assigned_at,
        is_active
      `)
      .eq('is_deleted', false)
      .order('assigned_at', { ascending: false });

    if (error) throw error;

    // Group by user to show all roles per user
    const usersMap = new Map();
    
    users.forEach(assignment => {
      if (!assignment.users) return;
      
      const userId = assignment.users.id;
      if (!usersMap.has(userId)) {
        usersMap.set(userId, {
          id: userId,
          email: assignment.users.email,
          full_name: assignment.users.full_name,
          is_active: assignment.users.is_active,
          roles: []
        });
      }
      
      if (assignment.roles && assignment.is_active) {
        usersMap.get(userId).roles.push({
          id: assignment.roles.id,
          role_name: assignment.roles.role_name,
          role_display_name: assignment.roles.role_display_name,
          role_level: assignment.roles.role_level
        });
      }
    });

    const systemUsers = Array.from(usersMap.values())

    // Also include named (non-registered) contacts for this org
    const { data: namedContacts } = await platformDb
      .from('project_named_contacts')
      .select('id, full_name, email')
      .eq('organisation_id', org.id)
      .eq('is_active', true)
      .order('full_name', { ascending: true })

    const namedContactUsers = (namedContacts || []).map(c => ({
      id: `nc_${c.id}`,
      full_name: c.full_name,
      email: c.email || '',
      is_active: true,
      roles: [],
      is_named_contact: true,
      _raw_id: c.id
    }))

    return {
      success: true,
      data: [...systemUsers, ...namedContactUsers],
      error: null
    };
  } catch (error) {
    console.error('Error fetching organisation users:', error);
    return {
      success: false,
      data: [],
      error: error.message || 'Failed to fetch organisation users'
    };
  }
}

/**
 * Accept organisation invitation and assign role
 * Called after user signs up and confirms email
 * @param {string} invitationToken - Invitation token
 * @param {string} authUserId - Auth user ID of the user accepting
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function acceptOrganisationInvitation(invitationToken, authUserId) {
  try {
    // Get invitation details
    const { data: invitation, error: inviteError } = await platformDb
      .from('organisation_invitations')
      .select('*, roles:role_id(id, role_name, role_display_name)')
      .eq('invitation_token', invitationToken)
      .eq('invitation_status', 'pending')
      .eq('is_deleted', false)
      .single();

    if (inviteError || !invitation) {
      return {
        success: false,
        error: 'Invitation not found or already accepted'
      };
    }

    // Check if invitation is expired
    if (invitation.invitation_expires_at && 
        new Date(invitation.invitation_expires_at) < new Date()) {
      // Update status to expired
      await platformDb
        .from('organisation_invitations')
        .update({ invitation_status: 'expired' })
        .eq('id', invitation.id);

      return {
        success: false,
        error: 'Invitation has expired'
      };
    }

    // Get user record
    const { data: user } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', authUserId)
      .single();

    if (!user) {
      return {
        success: false,
        error: 'User record not found'
      };
    }

    // Assign the role
    const roleResult = await assignSystemRole(authUserId, invitation.role_name);
    
    if (!roleResult.success) {
      return {
        success: false,
        error: roleResult.error || 'Failed to assign role'
      };
    }

    // Update invitation status
    await platformDb
      .from('organisation_invitations')
      .update({
        invitation_status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by_user_id: user.id,
        invited_user_id: user.id
      })
      .eq('id', invitation.id);

    return {
      success: true,
      error: null
    };
  } catch (error) {
    console.error('Error accepting organisation invitation:', error);
    return {
      success: false,
      error: error.message || 'Failed to accept invitation'
    };
  }
}

/**
 * Remove role from user
 * @param {string} targetAuthUserId - Target user's auth ID
 * @param {string} roleName - Role name to remove
 * @param {string} inviterAuthUserId - Remover's auth ID (must be PMO Admin)
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function removeRoleFromUser(targetAuthUserId, roleName, inviterAuthUserId) {
  try {
    // Verify remover is PMO Admin
    const isAdmin = await isPmoAdmin(inviterAuthUserId);
    if (!isAdmin) {
      return {
        success: false,
        error: 'Only PMO Admin can remove roles'
      };
    }

    // Get internal user IDs
    const { data: targetUser } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', targetAuthUserId)
      .single();

    if (!targetUser) {
      return {
        success: false,
        error: 'Target user not found'
      };
    }

    // Get role ID
    const { data: role } = await platformDb
      .from('roles')
      .select('id')
      .eq('role_name', roleName)
      .single();

    if (!role) {
      return {
        success: false,
        error: 'Role not found'
      };
    }

    // Deactivate role assignment (soft delete)
    const { error } = await platformDb
      .from('user_roles')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', targetUser.id)
      .eq('role_id', role.id)
      .eq('is_active', true);

    if (error) throw error;

    return {
      success: true,
      error: null
    };
  } catch (error) {
    console.error('Error removing role from user:', error);
    return {
      success: false,
      error: error.message || 'Failed to remove role'
    };
  }
}

// ============================================================================
// EMAIL TEMPLATE GENERATORS
// ============================================================================

function generateRoleAssignmentEmail(userName, roleName) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">Role Assignment</h1>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p>Hello ${userName},</p>
        
        <p>You have been assigned the role of <strong>${roleName}</strong> in your organisation.</p>
        
        <p>You can now access features and permissions associated with this role.</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${window.location.origin}/platform/dashboard" target="_blank" rel="noopener noreferrer" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            Go to Dashboard
          </a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #666;">
          Best regards,<br>
          The Platform Team
        </p>
      </div>
    </body>
    </html>
  `;
}

function generateRoleInvitationEmail(email, roleName, organisationName, inviterName, signupLink, message) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">You're Invited!</h1>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p>Hello,</p>
        
        <p><strong>${escapeHtml(inviterName)}</strong> has invited you to join <strong>${escapeHtml(organisationName)}</strong> as a <strong>${escapeHtml(roleName)}</strong>.</p>
        
        ${
          message
            ? wrapInvitationMessageCard(
                formatInvitationPersonalMessageHtml(message, { skipRedundantIntro: false })
              )
            : ''
        }
        
        <p>To accept this invitation, please:</p>
        <ol style="margin: 20px 0; padding-left: 20px;">
          <li>Click the button below to sign up for the Platform</li>
          <li>Complete your registration</li>
          <li>Verify your email address</li>
          <li>Log in to access your assigned role</li>
        </ol>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${signupLink}" target="_blank" rel="noopener noreferrer" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            Sign Up & Accept Invitation
          </a>
        </div>
        
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #667eea;">${signupLink}</p>
        
        <p><strong>This invitation will expire in 7 days.</strong></p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #666;">
          Best regards,<br>
          The Platform Team
        </p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Add a named (non-registered) contact to the org's named contacts list.
 * Returns the new contact shaped like a user entry (id prefixed `nc_`).
 * @param {string} authUserId - Auth user ID of the person adding the contact
 * @param {string} fullName   - Display name (required)
 * @param {string|null} email - Email address (optional)
 */
export async function addNamedContact(authUserId, fullName, email = null) {
  // Get internal user record
  const { data: user } = await platformDb
    .from('users')
    .select('id')
    .eq('auth_user_id', authUserId)
    .single()

  if (!user) throw new Error('User not found')

  // Get org for this user
  const { data: org } = await platformDb
    .from('accounts')
    .select('id')
    .eq('owner_user_id', user.id)
    .single()

  if (!org) throw new Error('Organisation not found')

  const { data: contact, error } = await platformDb
    .from('project_named_contacts')
    .insert({
      organisation_id: org.id,
      full_name: fullName,
      email: email || null,
      created_by: user.id
    })
    .select('id, full_name, email')
    .single()

  if (error) throw error

  return {
    id: `nc_${contact.id}`,
    full_name: contact.full_name,
    email: contact.email || '',
    is_active: true,
    roles: [],
    is_named_contact: true,
    _raw_id: contact.id
  }
}

export default {
  getAssignableRoles,
  isPmoAdmin,
  isProjectSponsorOrAdmin,
  isProjectSponsor, // Legacy alias
  assignRoleToUser,
  inviteUserWithRole,
  getOrganisationUsers,
  addNamedContact,
  removeRoleFromUser,
  acceptOrganisationInvitation
};

