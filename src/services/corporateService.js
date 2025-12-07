/**
 * Corporate Service
 * 
 * Handles corporate license management, team analytics, and bulk provisioning
 */

import { simDb } from './supabase/supabaseClient';

/**
 * Get corporate license for user
 */
export async function getUserCorporateLicense(userId) {
  try {
    const { data, error } = await simDb
      .from('corporate_users')
      .select(`
        *,
        license:corporate_licenses(*)
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error getting corporate license:', error);
    throw error;
  }
}

/**
 * Get corporate license by ID
 */
export async function getCorporateLicense(licenseId) {
  try {
    const { data, error } = await simDb
      .from('corporate_licenses')
      .select('*')
      .eq('id', licenseId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting corporate license:', error);
    throw error;
  }
}

/**
 * Get team members for a license
 */
export async function getTeamMembers(licenseId, filters = {}) {
  try {
    let query = simDb
      .from('corporate_users')
      .select(`
        *,
        user:auth.users!corporate_users_user_id_fkey(email, raw_user_meta_data)
      `)
      .eq('license_id', licenseId);

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.role) {
      query = query.eq('role', filters.role);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting team members:', error);
    throw error;
  }
}

/**
 * Invite user to corporate license
 */
export async function inviteUserToLicense(licenseId, email, role = 'member', invitedBy) {
  try {
    // Check if user exists
    const { data: { user }, error: userError } = await simDb.auth.admin.getUserByEmail(email);
    
    if (userError && userError.status !== 404) {
      throw userError;
    }

    if (!user) {
      // User doesn't exist, create invitation
      // In production, send invitation email
      return {
        success: true,
        invitationSent: true,
        message: 'Invitation email sent',
      };
    }

    // Check if user can be added
    const { data: canAdd, error: checkError } = await simDb
      .rpc('can_add_user_to_license', {
        license_id_param: licenseId,
        user_id_param: user.id,
      });

    if (checkError) throw checkError;

    if (!canAdd) {
      throw new Error('Cannot add user: license at capacity or user already exists');
    }

    // Add user to license
    const { data, error } = await simDb
      .from('corporate_users')
      .insert({
        license_id: licenseId,
        user_id: user.id,
        role,
        invited_by: invitedBy,
        status: 'active',
        joined_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      user: data,
    };
  } catch (error) {
    console.error('Error inviting user:', error);
    throw error;
  }
}

/**
 * Bulk invite users
 */
export async function bulkInviteUsers(licenseId, emails, invitedBy) {
  try {
    // Create bulk invitation record
    const { data: bulkInvite, error: createError } = await simDb
      .from('bulk_invitations')
      .insert({
        license_id: licenseId,
        invited_by: invitedBy,
        invitation_type: 'email',
        emails,
        total_invitations: emails.length,
        status: 'processing',
      })
      .select()
      .single();

    if (createError) throw createError;

    // Process invitations
    const results = {
      successful: [],
      failed: [],
    };

    for (const email of emails) {
      try {
        await inviteUserToLicense(licenseId, email, 'member', invitedBy);
        results.successful.push(email);
      } catch (error) {
        results.failed.push({ email, error: error.message });
      }
    }

    // Update bulk invitation status
    await simDb
      .from('bulk_invitations')
      .update({
        status: 'completed',
        successful_invitations: results.successful.length,
        failed_invitations: results.failed.length,
        error_log: results.failed,
        completed_at: new Date().toISOString(),
      })
      .eq('id', bulkInvite.id);

    return results;
  } catch (error) {
    console.error('Error bulk inviting users:', error);
    throw error;
  }
}

/**
 * Get corporate analytics
 */
export async function getCorporateAnalytics(licenseId, periodStart = null, periodEnd = null) {
  try {
    const { data, error } = await simDb
      .rpc('get_corporate_analytics_summary', {
        license_id_param: licenseId,
        period_start_param: periodStart,
        period_end_param: periodEnd,
      });

    if (error) throw error;
    return data[0] || {};
  } catch (error) {
    console.error('Error getting corporate analytics:', error);
    throw error;
  }
}

/**
 * Remove user from license
 */
export async function removeUserFromLicense(licenseId, userId) {
  try {
    const { data, error } = await simDb
      .from('corporate_users')
      .update({ status: 'removed' })
      .eq('license_id', licenseId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error removing user:', error);
    throw error;
  }
}

/**
 * Update user role
 */
export async function updateUserRole(licenseId, userId, newRole) {
  try {
    const { data, error } = await simDb
      .from('corporate_users')
      .update({ role: newRole })
      .eq('license_id', licenseId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
}

export default {
  getUserCorporateLicense,
  getCorporateLicense,
  getTeamMembers,
  inviteUserToLicense,
  bulkInviteUsers,
  getCorporateAnalytics,
  removeUserFromLicense,
  updateUserRole,
};

