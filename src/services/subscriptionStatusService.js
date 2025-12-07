/**
 * Subscription Status Service
 * 
 * Handles subscription status checks, grace period management, and expiration handling
 */

import { simDb } from './supabase/supabaseClient';

/**
 * Check and update subscription statuses (should be called periodically)
 */
export async function checkSubscriptionStatuses() {
  try {
    // Call database function to check and update subscription statuses
    const { data, error } = await simDb.rpc('check_subscription_status');

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error checking subscription statuses:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Restore subscription from grace period after successful payment
 */
export async function restoreSubscriptionFromGrace(subscriptionId, newPeriodEnd) {
  try {
    const { data, error } = await simDb.rpc('restore_subscription_from_grace', {
      subscription_id: subscriptionId,
      new_period_end: newPeriodEnd,
    });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error restoring subscription from grace:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Renew subscription
 */
export async function renewSubscription(subscriptionId, newPeriodEnd, newBillingDate) {
  try {
    const { data, error } = await simDb.rpc('renew_subscription', {
      subscription_id: subscriptionId,
      new_period_end: newPeriodEnd,
      new_billing_date: newBillingDate,
    });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error renewing subscription:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send expiration notifications (should be called daily)
 */
export async function sendExpirationNotifications() {
  try {
    const { data, error } = await simDb.rpc('send_expiration_notifications');

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error sending expiration notifications:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if user has active access (including grace period)
 */
export async function userHasActiveAccess(userId) {
  try {
    const { data, error } = await simDb.rpc('user_has_active_access', {
      user_id_param: userId,
    });

    if (error) throw error;
    return data === true;
  } catch (error) {
    console.error('Error checking user access:', error);
    return false;
  }
}

/**
 * Get subscription status summary
 */
export async function getSubscriptionStatusSummary(userId) {
  try {
    const { data, error } = await simDb
      .from('simulator_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!data) {
      return {
        hasSubscription: false,
        isActive: false,
        inGracePeriod: false,
        status: 'none',
      };
    }

    const now = new Date();
    const periodEnd = data.current_period_end ? new Date(data.current_period_end) : null;
    const graceEnd = data.grace_period_end ? new Date(data.grace_period_end) : null;
    
    const isExpired = periodEnd && now > periodEnd;
    const inGrace = data.is_in_grace_period && graceEnd && now <= graceEnd;
    const isActive = (data.status === 'active' || data.status === 'past_due') && 
                     (data.is_lifetime || !isExpired || inGrace);

    return {
      hasSubscription: true,
      isActive,
      inGracePeriod: inGrace,
      status: data.status,
      isLifetime: data.is_lifetime,
      periodEnd,
      graceEnd,
      daysUntilExpiry: periodEnd ? Math.ceil((periodEnd - now) / (1000 * 60 * 60 * 24)) : null,
      graceDaysRemaining: graceEnd ? Math.ceil((graceEnd - now) / (1000 * 60 * 60 * 24)) : null,
    };
  } catch (error) {
    console.error('Error getting subscription status summary:', error);
    return {
      hasSubscription: false,
      isActive: false,
      inGracePeriod: false,
      status: 'error',
    };
  }
}

export default {
  checkSubscriptionStatuses,
  restoreSubscriptionFromGrace,
  renewSubscription,
  sendExpirationNotifications,
  userHasActiveAccess,
  getSubscriptionStatusSummary,
};

