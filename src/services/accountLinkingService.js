/**
 * Account Linking Service
 *
 * Manages linking of secondary emails to primary accounts
 * Allows users to use different emails for different platforms
 */

import { appDb, supabase } from './supabase/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a verification token
 */
function generateVerificationToken() {
  return uuidv4() + '-' + Date.now();
}

/**
 * Link a secondary email to primary account for specific platform
 */
export async function linkSecondaryEmail(primaryUserId, secondaryEmail, platform, linkReason = null) {
  try {
    // Check if secondary email already exists in auth.users
    const { data: existingUser } = await supabase.auth.admin.getUserByEmail(secondaryEmail);

    const verificationToken = generateVerificationToken();
    const verificationExpiresAt = new Date();
    verificationExpiresAt.setHours(verificationExpiresAt.getHours() + 24); // 24 hour expiry

    const linkData = {
      primary_user_id: primaryUserId,
      secondary_email: secondaryEmail,
      platform: platform,
      verification_token: verificationToken,
      verification_sent_at: new Date().toISOString(),
      verification_expires_at: verificationExpiresAt.toISOString(),
      link_reason: linkReason,
      is_verified: false,
      is_active: true,
    };

    // If secondary email has an existing account, link to it
    if (existingUser) {
      linkData.linked_user_id = existingUser.id;
    }

    const { data, error } = await appDb.from('account_links').insert(linkData).select().single();

    if (error) throw error;

    // Send verification email
    await sendLinkVerificationEmail(secondaryEmail, verificationToken, platform);

    return {
      success: true,
      link: data,
      requiresVerification: true,
    };
  } catch (error) {
    console.error('Error linking secondary email:', error);
    throw error;
  }
}

/**
 * Send verification email for email link
 */
async function sendLinkVerificationEmail(email, token, platform) {
  try {
    // TODO: Integrate with email service (SendGrid, etc.)
    // For now, we'll log the verification link
    const verificationUrl = `${window.location.origin}/account/verify-link?token=${token}`;

    console.log('Verification email for account linking:');
    console.log('To:', email);
    console.log('Platform:', platform);
    console.log('Link:', verificationUrl);

    // In production, send actual email:
    // await emailService.send({
    //   to: email,
    //   template: 'account-link-verification',
    //   data: {
    //     platform,
    //     verificationUrl,
    //   },
    // });

    return true;
  } catch (error) {
    console.error('Error sending link verification email:', error);
    return false;
  }
}

/**
 * Verify email link using token
 */
export async function verifyEmailLink(token) {
  try {
    // Get the link record
    const { data: link, error: fetchError } = await appDb
      .from('account_links')
      .select('*')
      .eq('verification_token', token)
      .single();

    if (fetchError) throw fetchError;

    if (!link) {
      return {
        success: false,
        error: 'Invalid verification token',
      };
    }

    // Check if token expired
    const now = new Date();
    const expiresAt = new Date(link.verification_expires_at);

    if (now > expiresAt) {
      return {
        success: false,
        error: 'Verification token has expired',
      };
    }

    // Check if already verified
    if (link.is_verified) {
      return {
        success: true,
        message: 'Email already verified',
        link: link,
      };
    }

    // Mark as verified
    const { data: updatedLink, error: updateError } = await appDb
      .from('account_links')
      .update({
        is_verified: true,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', link.id)
      .select()
      .single();

    if (updateError) throw updateError;

    return {
      success: true,
      message: 'Email successfully verified and linked',
      link: updatedLink,
    };
  } catch (error) {
    console.error('Error verifying email link:', error);
    throw error;
  }
}

/**
 * Resend verification email
 */
export async function resendVerificationEmail(linkId) {
  try {
    const { data: link, error } = await appDb.from('account_links').select('*').eq('id', linkId).single();

    if (error) throw error;

    if (link.is_verified) {
      return {
        success: false,
        error: 'Email is already verified',
      };
    }

    // Generate new token
    const newToken = generateVerificationToken();
    const newExpiresAt = new Date();
    newExpiresAt.setHours(newExpiresAt.getHours() + 24);

    // Update link with new token
    await appDb
      .from('account_links')
      .update({
        verification_token: newToken,
        verification_sent_at: new Date().toISOString(),
        verification_expires_at: newExpiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', linkId);

    // Send verification email
    await sendLinkVerificationEmail(link.secondary_email, newToken, link.platform);

    return {
      success: true,
      message: 'Verification email resent',
    };
  } catch (error) {
    console.error('Error resending verification email:', error);
    throw error;
  }
}

/**
 * Get all account links for a user
 */
export async function getLinkedAccounts(userId) {
  try {
    const { data, error } = await appDb
      .from('account_links')
      .select('*')
      .eq('primary_user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting linked accounts:', error);
    return [];
  }
}

/**
 * Get verified links for a platform
 */
export async function getVerifiedLinksForPlatform(userId, platform) {
  try {
    const { data, error } = await appDb
      .from('account_links')
      .select('*')
      .eq('primary_user_id', userId)
      .eq('platform', platform)
      .eq('is_verified', true)
      .eq('is_active', true);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting verified platform links:', error);
    return [];
  }
}

/**
 * Unlink a secondary email
 */
export async function unlinkAccount(linkId, userId) {
  try {
    // Verify ownership
    const { data: link, error: fetchError } = await appDb
      .from('account_links')
      .select('primary_user_id')
      .eq('id', linkId)
      .single();

    if (fetchError) throw fetchError;

    if (link.primary_user_id !== userId) {
      throw new Error('Unauthorized: You can only unlink your own accounts');
    }

    // Soft delete by setting is_active to false
    const { data, error } = await appDb
      .from('account_links')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', linkId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      message: 'Account unlinked successfully',
      link: data,
    };
  } catch (error) {
    console.error('Error unlinking account:', error);
    throw error;
  }
}

/**
 * Merge two accounts (advanced feature)
 * Transfers subscriptions from secondary to primary account
 */
export async function mergeAccounts(primaryUserId, secondaryUserId) {
  try {
    // This is a complex operation that should be done carefully
    // It involves transferring subscriptions, data, and access rights

    // 1. Verify both accounts exist
    const { data: primaryUser } = await supabase.auth.admin.getUserById(primaryUserId);
    const { data: secondaryUser } = await supabase.auth.admin.getUserById(secondaryUserId);

    if (!primaryUser || !secondaryUser) {
      throw new Error('One or both accounts not found');
    }

    // 2. Transfer PM subscriptions
    await appDb
      .from('pm_subscriptions')
      .update({
        user_id: primaryUserId,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', secondaryUserId);

    // 3. Transfer Simulator subscriptions
    await appDb
      .from('sim.simulator_subscriptions')
      .update({
        user_id: primaryUserId,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', secondaryUserId);

    // 4. Transfer platform access records
    await appDb
      .from('user_platform_access')
      .update({
        user_id: primaryUserId,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', secondaryUserId);

    // 5. Create a link record for reference
    await appDb.from('account_links').insert({
      primary_user_id: primaryUserId,
      secondary_email: secondaryUser.email,
      platform: 'merged',
      linked_user_id: secondaryUserId,
      is_verified: true,
      verified_at: new Date().toISOString(),
      linked_at: new Date().toISOString(),
      link_reason: 'Account merge completed',
      is_active: true,
    });

    // 6. Mark secondary account for deletion (don't actually delete, just mark)
    // The user should manually delete the secondary account if desired

    return {
      success: true,
      message: 'Accounts merged successfully',
      primaryUserId,
      secondaryUserId,
    };
  } catch (error) {
    console.error('Error merging accounts:', error);
    throw error;
  }
}

/**
 * Check if email is already linked
 */
export async function isEmailLinked(primaryUserId, email, platform) {
  try {
    const { data, error } = await appDb
      .from('account_links')
      .select('id')
      .eq('primary_user_id', primaryUserId)
      .eq('secondary_email', email)
      .eq('platform', platform)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return !!data;
  } catch (error) {
    console.error('Error checking if email is linked:', error);
    return false;
  }
}

/**
 * Get link statistics for admin dashboard
 */
export async function getLinkStats() {
  try {
    const { count: totalLinks, error: totalError } = await appDb
      .from('account_links')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true);

    if (totalError) throw totalError;

    const { count: verifiedLinks, error: verifiedError } = await appDb
      .from('account_links')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('is_verified', true);

    if (verifiedError) throw verifiedError;

    const { count: pendingLinks, error: pendingError } = await appDb
      .from('account_links')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('is_verified', false);

    if (pendingError) throw pendingError;

    return {
      total: totalLinks || 0,
      verified: verifiedLinks || 0,
      pending: pendingLinks || 0,
    };
  } catch (error) {
    console.error('Error getting link stats:', error);
    return {
      total: 0,
      verified: 0,
      pending: 0,
    };
  }
}

export default {
  linkSecondaryEmail,
  verifyEmailLink,
  resendVerificationEmail,
  getLinkedAccounts,
  getVerifiedLinksForPlatform,
  unlinkAccount,
  mergeAccounts,
  isEmailLinked,
  getLinkStats,
};
