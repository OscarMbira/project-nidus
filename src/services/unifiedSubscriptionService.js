/**
 * Unified Subscription Service
 *
 * Manages subscriptions across both Platform and Simulator
 * Provides a unified interface for subscription management
 */

import { platformDb, simDb, supabase } from './supabase/supabaseClient';
import { getPlatformSubscription, getActivePlatformSubscription, isPlatformSubscriptionActive } from './platformSubscriptionService';
import { getUserSubscription, isSubscriptionActive } from './subscriptionService';

/**
 * Platform identifiers
 */
export const PLATFORMS = {
  PLATFORM: 'platform',
  SIMULATOR: 'simulator',
  ADMIN: 'admin',
};

/**
 * Get all subscriptions for a user across all platforms
 */
export async function getAllUserSubscriptions(userId) {
  try {
    // Use the database function
    const { data, error } = await platformDb.rpc('get_all_user_subscriptions', {
      p_user_id: userId,
    });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting all user subscriptions:', error);
    // Fallback to manual queries if function not available
    return await getAllSubscriptionsManual(userId);
  }
}

/**
 * Manual fallback for getting all subscriptions
 */
async function getAllSubscriptionsManual(userId) {
  try {
    const subscriptions = [];

    // Get PM subscription
    const pmSub = await getPlatformSubscription(userId);
    if (pmSub) {
      subscriptions.push({
        platform: PLATFORMS.PLATFORM,
        subscription_id: pmSub.id,
        plan_type: pmSub.plan_type,
        status: pmSub.status,
        is_active: isPlatformSubscriptionActive(pmSub),
        is_lifetime: pmSub.is_lifetime,
        started_at: pmSub.started_at,
        expires_at: pmSub.expires_at,
        amount_paid: pmSub.amount_paid,
        currency: pmSub.currency,
        billing_cycle: pmSub.billing_cycle,
      });
    }

    // Get Simulator subscription
    const simSub = await getUserSubscription(userId);
    if (simSub) {
      subscriptions.push({
        platform: PLATFORMS.SIMULATOR,
        subscription_id: simSub.id,
        plan_type: simSub.plan_type,
        status: simSub.status,
        is_active: isSubscriptionActive(simSub),
        is_lifetime: simSub.is_lifetime,
        started_at: simSub.started_at,
        expires_at: simSub.expires_at,
        amount_paid: simSub.amount_paid,
        currency: simSub.currency,
        billing_cycle: simSub.billing_cycle,
      });
    }

    return subscriptions;
  } catch (error) {
    console.error('Error in manual subscription fetch:', error);
    return [];
  }
}

/**
 * Get active subscriptions only
 */
export async function getActiveSubscriptions(userId) {
  try {
    const allSubs = await getAllUserSubscriptions(userId);
    return allSubs.filter((sub) => sub.is_active);
  } catch (error) {
    console.error('Error getting active subscriptions:', error);
    return [];
  }
}

/**
 * Get platform access status
 */
export async function getPlatformAccess(userId) {
  try {
    const { data, error } = await platformDb
      .from('user_platform_access')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting platform access:', error);
    return [];
  }
}

/**
 * Check if user has registered for a specific platform
 */
export async function hasRegisteredForPlatform(userId, platform) {
  try {
    const { data, error } = await platformDb
      .from('user_platform_access')
      .select('has_registered')
      .eq('user_id', userId)
      .eq('platform', platform)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data?.has_registered || false;
  } catch (error) {
    console.error('Error checking platform registration:', error);
    return false;
  }
}

/**
 * Register user for a platform
 */
export async function registerForPlatform(userId, platform) {
  try {
    const { data, error } = await platformDb
      .from('user_platform_access')
      .upsert(
        {
          user_id: userId,
          platform: platform,
          has_registered: true,
          registration_date: new Date().toISOString(),
          first_access_at: new Date().toISOString(),
          last_access_at: new Date().toISOString(),
          access_count: 1,
        },
        {
          onConflict: 'user_id,platform',
        }
      )
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error registering for platform:', error);
    throw error;
  }
}

/**
 * Update platform access (track last access)
 */
export async function updatePlatformAccess(userId, platform) {
  try {
    // Use the database function if available
    const { error } = await platformDb.rpc('update_platform_access', {
      p_user_id: userId,
      p_platform: platform,
    });

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error updating platform access:', error);
    // Fallback to direct update
    return await updatePlatformAccessManual(userId, platform);
  }
}

/**
 * Manual fallback for updating platform access
 */
async function updatePlatformAccessManual(userId, platform) {
  try {
    const { data: existing } = await platformDb
      .from('user_platform_access')
      .select('access_count')
      .eq('user_id', userId)
      .eq('platform', platform)
      .single();

    const { error } = await platformDb
      .from('user_platform_access')
      .upsert(
        {
          user_id: userId,
          platform: platform,
          last_access_at: new Date().toISOString(),
          access_count: (existing?.access_count || 0) + 1,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,platform',
        }
      );

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error in manual platform access update:', error);
    return false;
  }
}

/**
 * Check if user can access a platform (has active subscription)
 */
export async function canAccessPlatform(userId, platform) {
  try {
    // Get platform subscription status using database function
    const { data, error } = await platformDb.rpc('get_platform_subscription_status', {
      p_user_id: userId,
      p_platform: platform,
    });

    if (error) throw error;

    return data?.[0]?.is_active || false;
  } catch (error) {
    console.error('Error checking platform access:', error);
    // Fallback to manual check
    return await canAccessPlatformManual(userId, platform);
  }
}

/**
 * Manual fallback for checking platform access
 */
async function canAccessPlatformManual(userId, platform) {
  try {
    if (platform === PLATFORMS.PLATFORM) {
      const sub = await getActivePlatformSubscription(userId);
      return sub ? isPlatformSubscriptionActive(sub) : false;
    } else if (platform === PLATFORMS.SIMULATOR) {
      const sub = await getUserSubscription(userId);
      return sub ? isSubscriptionActive(sub) : false;
    }
    return false;
  } catch (error) {
    console.error('Error in manual platform access check:', error);
    return false;
  }
}

/**
 * Get subscription status for all platforms
 */
export async function getAllPlatformStatuses(userId) {
  try {
    const pmStatus = await canAccessPlatform(userId, PLATFORMS.PLATFORM);
    const simStatus = await canAccessPlatform(userId, PLATFORMS.SIMULATOR);

    return {
      [PLATFORMS.PLATFORM]: pmStatus,
      [PLATFORMS.SIMULATOR]: simStatus,
    };
  } catch (error) {
    console.error('Error getting all platform statuses:', error);
    return {
      [PLATFORMS.PLATFORM]: false,
      [PLATFORMS.SIMULATOR]: false,
    };
  }
}

/**
 * Get user's primary platform (most used)
 */
export async function getPrimaryPlatform(userId) {
  try {
    const { data, error } = await platformDb
      .from('user_platform_access')
      .select('*')
      .eq('user_id', userId)
      .order('access_count', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data?.platform || null;
  } catch (error) {
    console.error('Error getting primary platform:', error);
    return null;
  }
}

/**
 * Set primary platform preference
 */
export async function setPrimaryPlatform(userId, platform) {
  try {
    // First, unset all other platforms as primary
    await platformDb
      .from('user_platform_access')
      .update({ is_primary_platform: false })
      .eq('user_id', userId);

    // Then set the specified platform as primary
    const { data, error } = await platformDb
      .from('user_platform_access')
      .update({ is_primary_platform: true, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('platform', platform)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error setting primary platform:', error);
    throw error;
  }
}

/**
 * Get onboarding status for platform
 */
export async function getPlatformOnboardingStatus(userId, platform) {
  try {
    const { data, error } = await platformDb
      .from('user_platform_access')
      .select('onboarding_completed, onboarding_step')
      .eq('user_id', userId)
      .eq('platform', platform)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return {
      completed: data?.onboarding_completed || false,
      step: data?.onboarding_step || 0,
    };
  } catch (error) {
    console.error('Error getting onboarding status:', error);
    return {
      completed: false,
      step: 0,
    };
  }
}

/**
 * Update onboarding progress
 */
export async function updateOnboardingProgress(userId, platform, step, completed = false) {
  try {
    const updateData = {
      onboarding_step: step,
      updated_at: new Date().toISOString(),
    };

    if (completed) {
      updateData.onboarding_completed = true;
      updateData.onboarding_completed_at = new Date().toISOString();
    }

    const { data, error } = await platformDb
      .from('user_platform_access')
      .update(updateData)
      .eq('user_id', userId)
      .eq('platform', platform)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error updating onboarding progress:', error);
    throw error;
  }
}

/**
 * Get total subscription value (MRR/ARR)
 */
export async function getTotalSubscriptionValue(userId) {
  try {
    const subs = await getActiveSubscriptions(userId);

    let monthlyValue = 0;

    subs.forEach((sub) => {
      if (sub.billing_cycle === 'monthly') {
        monthlyValue += parseFloat(sub.amount_paid || 0);
      } else if (sub.billing_cycle === 'yearly') {
        monthlyValue += parseFloat(sub.amount_paid || 0) / 12;
      }
      // Lifetime subscriptions don't contribute to recurring value
    });

    return {
      mrr: monthlyValue,
      arr: monthlyValue * 12,
    };
  } catch (error) {
    console.error('Error calculating subscription value:', error);
    return {
      mrr: 0,
      arr: 0,
    };
  }
}

/**
 * Get subscription summary for user dashboard
 */
export async function getSubscriptionSummary(userId) {
  try {
    const [allSubs, platformAccess, value] = await Promise.all([
      getAllUserSubscriptions(userId),
      getPlatformAccess(userId),
      getTotalSubscriptionValue(userId),
    ]);

    const activeSubs = allSubs.filter((sub) => sub.is_active);

    return {
      subscriptions: allSubs,
      activeSubscriptions: activeSubs,
      platformAccess: platformAccess,
      totalValue: value,
      hasAnyActiveSubscription: activeSubs.length > 0,
      registeredPlatforms: platformAccess.filter((p) => p.has_registered).map((p) => p.platform),
    };
  } catch (error) {
    console.error('Error getting subscription summary:', error);
    return {
      subscriptions: [],
      activeSubscriptions: [],
      platformAccess: [],
      totalValue: { mrr: 0, arr: 0 },
      hasAnyActiveSubscription: false,
      registeredPlatforms: [],
    };
  }
}

/**
 * Check if user should see upgrade prompt
 */
export async function shouldShowUpgradePrompt(userId, platform) {
  try {
    const canAccess = await canAccessPlatform(userId, platform);

    if (!canAccess) {
      return {
        show: true,
        reason: 'no_subscription',
        message: `You don't have an active ${platform.toUpperCase()} subscription.`,
      };
    }

    // Check if user is on free tier
    let subscription;
    if (platform === PLATFORMS.PLATFORM) {
      subscription = await getActivePlatformSubscription(userId);
    } else if (platform === PLATFORMS.SIMULATOR) {
      subscription = await getUserSubscription(userId);
    }

    if (subscription && subscription.plan_type === 'free') {
      return {
        show: true,
        reason: 'free_tier',
        message: 'Upgrade to unlock premium features!',
      };
    }

    return {
      show: false,
      reason: null,
      message: null,
    };
  } catch (error) {
    console.error('Error checking upgrade prompt:', error);
    return {
      show: false,
      reason: null,
      message: null,
    };
  }
}

export default {
  PLATFORMS,
  getAllUserSubscriptions,
  getActiveSubscriptions,
  getPlatformAccess,
  hasRegisteredForPlatform,
  registerForPlatform,
  updatePlatformAccess,
  canAccessPlatform,
  getAllPlatformStatuses,
  getPrimaryPlatform,
  setPrimaryPlatform,
  getPlatformOnboardingStatus,
  updateOnboardingProgress,
  getTotalSubscriptionValue,
  getSubscriptionSummary,
  shouldShowUpgradePrompt,
};
