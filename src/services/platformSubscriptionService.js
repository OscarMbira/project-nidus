/**
 * Platform Subscription Service
 *
 * Manages Platform subscriptions and access control
 * Mirrors the structure of subscriptionService.js for Simulator
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * Platform subscription tiers configuration
 */
export const PLATFORM_SUBSCRIPTION_TIERS = {
  FREE: {
    id: 'free',
    name: 'Free',
    price: 0,
    features: [
      '1 project',
      '5 team members',
      'Basic task management',
      'Simple Gantt charts',
      'Community support',
    ],
    limits: {
      max_projects: 1,
      max_team_members: 5,
      max_tasks_per_project: 50,
      storage_gb: 1,
      gantt_charts: true,
      advanced_analytics: false,
      custom_workflows: false,
      api_access: false,
      priority_support: false,
    },
  },
  STARTER: {
    id: 'starter',
    name: 'Starter',
    price: 19.99,
    priceId: import.meta.env.VITE_STRIPE_PM_PRICE_STARTER_MONTHLY,
    yearlyPriceId: import.meta.env.VITE_STRIPE_PM_PRICE_STARTER_YEARLY,
    billingCycle: 'monthly',
    features: [
      '10 projects',
      '20 team members',
      'Advanced task management',
      'Resource management',
      'Gantt & Kanban boards',
      'Basic analytics',
      'Email support',
    ],
    limits: {
      max_projects: 10,
      max_team_members: 20,
      max_tasks_per_project: 500,
      storage_gb: 10,
      gantt_charts: true,
      advanced_analytics: true,
      custom_workflows: false,
      api_access: false,
      priority_support: false,
    },
  },
  PROFESSIONAL: {
    id: 'professional',
    name: 'Professional',
    price: 49.99,
    priceId: import.meta.env.VITE_STRIPE_PM_PRICE_PROFESSIONAL_MONTHLY,
    yearlyPriceId: import.meta.env.VITE_STRIPE_PM_PRICE_PROFESSIONAL_YEARLY,
    billingCycle: 'monthly',
    features: [
      'Unlimited projects',
      '100 team members',
      'Full project lifecycle management',
      'Advanced analytics & reporting',
      'Custom workflows',
      'API access',
      'Priority email support',
      'All project methodologies',
    ],
    limits: {
      max_projects: -1, // unlimited
      max_team_members: 100,
      max_tasks_per_project: -1, // unlimited
      storage_gb: 100,
      gantt_charts: true,
      advanced_analytics: true,
      custom_workflows: true,
      api_access: true,
      priority_support: true,
    },
  },
  ENTERPRISE: {
    id: 'enterprise',
    name: 'Enterprise',
    price: null, // Custom pricing
    features: [
      'Unlimited everything',
      'Unlimited team members',
      'White-label option',
      'SSO integration',
      'Dedicated support',
      'SLA guarantee',
      'Custom integrations',
      'On-premise option',
    ],
    limits: {
      max_projects: -1,
      max_team_members: -1,
      max_tasks_per_project: -1,
      storage_gb: -1,
      gantt_charts: true,
      advanced_analytics: true,
      custom_workflows: true,
      api_access: true,
      priority_support: true,
      sso: true,
      white_label: true,
    },
  },
  LIFETIME_STARTER: {
    id: 'lifetime_starter',
    name: 'Lifetime Starter',
    price: 399.99,
    priceId: import.meta.env.VITE_STRIPE_PM_PRICE_LIFETIME_STARTER,
    billingCycle: 'one_time',
    features: [
      'All Starter features',
      'Lifetime access',
      'No recurring fees',
      'All future updates',
    ],
    limits: {
      max_projects: 10,
      max_team_members: 20,
      max_tasks_per_project: 500,
      storage_gb: 10,
      gantt_charts: true,
      advanced_analytics: true,
      custom_workflows: false,
      api_access: false,
      priority_support: false,
    },
  },
  LIFETIME_PROFESSIONAL: {
    id: 'lifetime_professional',
    name: 'Lifetime Professional',
    price: 999.99,
    priceId: import.meta.env.VITE_STRIPE_PM_PRICE_LIFETIME_PROFESSIONAL,
    billingCycle: 'one_time',
    features: [
      'All Professional features',
      'Lifetime access',
      'No recurring fees',
      'All future updates',
      'Priority support',
    ],
    limits: {
      max_projects: -1,
      max_team_members: 100,
      max_tasks_per_project: -1,
      storage_gb: 100,
      gantt_charts: true,
      advanced_analytics: true,
      custom_workflows: true,
      api_access: true,
      priority_support: true,
    },
  },
};

/**
 * Get user's current PM subscription
 */
export async function getPlatformSubscription(userId) {
  try {
    const { data, error } = await platformDb
      .from('platform_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data || null;
  } catch (error) {
    console.error('Error getting Platform subscription:', error);
    throw error;
  }
}

/**
 * Get user's active PM subscription
 */
export async function getActivePlatformSubscription(userId) {
  try {
    const { data, error } = await platformDb
      .from('platform_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data || null;
  } catch (error) {
    console.error('Error getting active Platform subscription:', error);
    return null;
  }
}

/**
 * Check if user has access to a PM feature
 */
export async function hasPlatformFeatureAccess(userId, feature) {
  try {
    const subscription = await getActivePlatformSubscription(userId);

    if (!subscription) {
      // Free tier access
      return checkFreeTierAccess(feature);
    }

    const tier = PLATFORM_SUBSCRIPTION_TIERS[subscription.plan_type?.toUpperCase()] || PLATFORM_SUBSCRIPTION_TIERS.FREE;

    return tier.limits[feature] !== false && tier.limits[feature] !== undefined;
  } catch (error) {
    console.error('Error checking Platform feature access:', error);
    return false;
  }
}

/**
 * Check free tier access
 */
function checkFreeTierAccess(feature) {
  const freeTier = PLATFORM_SUBSCRIPTION_TIERS.FREE;
  return freeTier.limits[feature] !== false && freeTier.limits[feature] !== undefined;
}

/**
 * Check if user can create a project (within limits)
 */
export async function canCreateProject(userId) {
  try {
    const subscription = await getActivePlatformSubscription(userId);
    const tier = subscription
      ? PLATFORM_SUBSCRIPTION_TIERS[subscription.plan_type?.toUpperCase()] || PLATFORM_SUBSCRIPTION_TIERS.FREE
      : PLATFORM_SUBSCRIPTION_TIERS.FREE;

    // If unlimited projects
    if (tier.limits.max_projects === -1) {
      return true;
    }

    // Count user's current projects
    const { count, error } = await platformDb
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', userId)
      .eq('is_deleted', false);

    if (error) throw error;

    return count < tier.limits.max_projects;
  } catch (error) {
    console.error('Error checking project creation access:', error);
    return false;
  }
}

/**
 * Check if user can add team members (within limits)
 */
export async function canAddTeamMember(userId, projectId) {
  try {
    const subscription = await getActivePlatformSubscription(userId);
    const tier = subscription
      ? PLATFORM_SUBSCRIPTION_TIERS[subscription.plan_type?.toUpperCase()] || PLATFORM_SUBSCRIPTION_TIERS.FREE
      : PLATFORM_SUBSCRIPTION_TIERS.FREE;

    // If unlimited team members
    if (tier.limits.max_team_members === -1) {
      return true;
    }

    // Count current team members for this project
    const { count, error } = await platformDb
      .from('user_projects')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('is_deleted', false);

    if (error) throw error;

    return count < tier.limits.max_team_members;
  } catch (error) {
    console.error('Error checking team member access:', error);
    return false;
  }
}

/**
 * Create or update PM subscription record
 */
export async function createPlatformSubscriptionRecord(userId, subscriptionData) {
  try {
    const { data, error } = await platformDb
      .from('platform_subscriptions')
      .insert({
        user_id: userId,
        plan_type: subscriptionData.planType,
        status: subscriptionData.status || 'active',
        stripe_subscription_id: subscriptionData.stripeSubscriptionId,
        stripe_customer_id: subscriptionData.stripeCustomerId,
        stripe_product_id: subscriptionData.stripeProductId,
        stripe_price_id: subscriptionData.stripePriceId,
        billing_cycle: subscriptionData.billingCycle || 'monthly',
        amount_paid: subscriptionData.amountPaid,
        currency: subscriptionData.currency || 'USD',
        current_period_start: subscriptionData.currentPeriodStart,
        current_period_end: subscriptionData.currentPeriodEnd,
        next_billing_date: subscriptionData.nextBillingDate,
        cancel_at_period_end: subscriptionData.cancelAtPeriodEnd || false,
        is_lifetime: subscriptionData.isLifetime || false,
        max_projects: subscriptionData.maxProjects,
        max_team_members: subscriptionData.maxTeamMembers,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating Platform subscription record:', error);
    throw error;
  }
}

/**
 * Update PM subscription status
 */
export async function updatePlatformSubscriptionStatus(subscriptionId, status, updates = {}) {
  try {
    const updateData = {
      status,
      updated_at: new Date().toISOString(),
      ...updates,
    };

    const { data, error } = await platformDb
      .from('platform_subscriptions')
      .update(updateData)
      .eq('id', subscriptionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating Platform subscription status:', error);
    throw error;
  }
}

/**
 * Cancel PM subscription
 */
export async function cancelPlatformSubscription(subscriptionId, reason = null) {
  try {
    const { data, error } = await platformDb
      .from('platform_subscriptions')
      .update({
        cancel_at_period_end: true,
        cancellation_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error cancelling Platform subscription:', error);
    throw error;
  }
}

/**
 * Get PM subscription tier details
 */
export function getPlatformTierDetails(tierId) {
  return PLATFORM_SUBSCRIPTION_TIERS[tierId.toUpperCase()] || PLATFORM_SUBSCRIPTION_TIERS.FREE;
}

/**
 * Check if PM subscription is active (including grace period)
 */
export function isPlatformSubscriptionActive(subscription) {
  if (!subscription) return false;

  // Lifetime subscriptions are always active
  if (subscription.is_lifetime) return true;

  // Check if in grace period
  if (subscription.is_in_grace_period && subscription.grace_period_end) {
    const now = new Date();
    const graceEnd = new Date(subscription.grace_period_end);
    if (now <= graceEnd) return true;
  }

  // Check active status
  if (!['active', 'trialing', 'past_due'].includes(subscription.status)) {
    return false;
  }

  // Check if expired
  if (subscription.current_period_end) {
    const now = new Date();
    const periodEnd = new Date(subscription.current_period_end);
    if (now > periodEnd && !subscription.is_in_grace_period) return false;
  }

  return true;
}

/**
 * Check if PM subscription is in grace period
 */
export function isPlatformInGracePeriod(subscription) {
  if (!subscription) return false;

  if (!subscription.is_in_grace_period) return false;

  if (subscription.grace_period_end) {
    const now = new Date();
    const graceEnd = new Date(subscription.grace_period_end);
    return now <= graceEnd;
  }

  return false;
}

/**
 * Get grace period days remaining
 */
export function getPlatformGracePeriodDaysRemaining(subscription) {
  if (!isPlatformInGracePeriod(subscription)) return null;

  const now = new Date();
  const graceEnd = new Date(subscription.grace_period_end);
  const diffTime = graceEnd - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays > 0 ? diffDays : 0;
}

/**
 * Get days until PM subscription expires
 */
export function getPlatformDaysUntilExpiry(subscription) {
  if (!subscription || !subscription.current_period_end) {
    return null;
  }

  const now = new Date();
  const periodEnd = new Date(subscription.current_period_end);
  const diffTime = periodEnd - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays > 0 ? diffDays : 0;
}

/**
 * Get subscription limits for current user
 */
export async function getPlatformSubscriptionLimits(userId) {
  try {
    const subscription = await getActivePlatformSubscription(userId);
    const tier = subscription
      ? PLATFORM_SUBSCRIPTION_TIERS[subscription.plan_type?.toUpperCase()] || PLATFORM_SUBSCRIPTION_TIERS.FREE
      : PLATFORM_SUBSCRIPTION_TIERS.FREE;

    return tier.limits;
  } catch (error) {
    console.error('Error getting Platform subscription limits:', error);
    return PLATFORM_SUBSCRIPTION_TIERS.FREE.limits;
  }
}

/**
 * Get current usage statistics
 */
export async function getPlatformUsageStats(userId) {
  try {
    // Get project count
    const { count: projectCount, error: projectError } = await platformDb
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', userId)
      .eq('is_deleted', false);

    if (projectError) throw projectError;

    // Get team member count (across all projects)
    const { count: teamMemberCount, error: teamError } = await platformDb
      .from('user_projects')
      .select('id', { count: 'exact', head: true })
      .eq('is_deleted', false);

    if (teamError) throw teamError;

    return {
      projects: projectCount || 0,
      teamMembers: teamMemberCount || 0,
    };
  } catch (error) {
    console.error('Error getting Platform usage stats:', error);
    return {
      projects: 0,
      teamMembers: 0,
    };
  }
}

export default {
  PLATFORM_SUBSCRIPTION_TIERS,
  getPlatformSubscription,
  getActivePlatformSubscription,
  hasPlatformFeatureAccess,
  canCreateProject,
  canAddTeamMember,
  createPlatformSubscriptionRecord,
  updatePlatformSubscriptionStatus,
  cancelPlatformSubscription,
  getPlatformTierDetails,
  isPlatformSubscriptionActive,
  isPlatformInGracePeriod,
  getPlatformGracePeriodDaysRemaining,
  getPlatformDaysUntilExpiry,
  getPlatformSubscriptionLimits,
  getPlatformUsageStats,
};
