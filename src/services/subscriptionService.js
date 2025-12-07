/**
 * Subscription Service
 * 
 * Manages simulator subscriptions and access control
 */

import { simDb } from './supabase/supabaseClient';

/**
 * Subscription tiers configuration
 */
export const SUBSCRIPTION_TIERS = {
  FREE: {
    id: 'free',
    name: 'Free',
    price: 0,
    features: [
      '5 beginner scenarios',
      'Basic scoring and feedback',
      'Progress tracking',
      'Community access',
    ],
    limits: {
      scenarios: 5,
      simulations_per_month: 10,
      certificates: false,
      custom_scenarios: false,
      advanced_feedback: false,
    },
  },
  BASIC: {
    id: 'basic',
    name: 'Basic',
    price: 9.99,
    priceId: import.meta.env.VITE_STRIPE_PRICE_BASIC, // Stripe Price ID
    billingCycle: 'monthly',
    features: [
      'All beginner & intermediate scenarios',
      'Advanced scoring and feedback',
      'Progress tracking & analytics',
      'Community access',
      'Basic certificates',
    ],
    limits: {
      scenarios: 'all_beginner_intermediate',
      simulations_per_month: 50,
      certificates: true,
      custom_scenarios: false,
      advanced_feedback: true,
    },
  },
  PROFESSIONAL: {
    id: 'professional',
    name: 'Professional',
    price: 29.99,
    priceId: import.meta.env.VITE_STRIPE_PRICE_PROFESSIONAL,
    billingCycle: 'monthly',
    features: [
      'All scenarios (including expert)',
      'Advanced AI feedback',
      'Full progress tracking & analytics',
      'Community access',
      'All certificates (discounted)',
      'Custom scenarios',
      'Priority support',
    ],
    limits: {
      scenarios: 'all',
      simulations_per_month: -1, // unlimited
      certificates: true,
      custom_scenarios: true,
      advanced_feedback: true,
    },
  },
  LIFETIME: {
    id: 'lifetime',
    name: 'Lifetime Access',
    price: 299.99,
    priceId: import.meta.env.VITE_STRIPE_PRICE_LIFETIME,
    billingCycle: 'one_time',
    features: [
      'All scenarios (forever)',
      'All Professional features',
      'All future updates',
      'No recurring fees',
      'Priority support',
    ],
    limits: {
      scenarios: 'all',
      simulations_per_month: -1,
      certificates: true,
      custom_scenarios: true,
      advanced_feedback: true,
    },
  },
};

/**
 * Get user's current subscription
 */
export async function getUserSubscription(userId) {
  try {
    const { data, error } = await simDb
      .from('simulator_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data || null;
  } catch (error) {
    console.error('Error getting user subscription:', error);
    throw error;
  }
}

/**
 * Check if user has access to a feature
 */
export async function hasFeatureAccess(userId, feature) {
  try {
    const subscription = await getUserSubscription(userId);
    
    if (!subscription) {
      // Free tier access
      return checkFreeTierAccess(feature);
    }

    const tier = SUBSCRIPTION_TIERS[subscription.plan_type?.toUpperCase()] || SUBSCRIPTION_TIERS.FREE;
    
    return tier.limits[feature] !== false && tier.limits[feature] !== undefined;
  } catch (error) {
    console.error('Error checking feature access:', error);
    return false;
  }
}

/**
 * Check free tier access
 */
function checkFreeTierAccess(feature) {
  const freeTier = SUBSCRIPTION_TIERS.FREE;
  return freeTier.limits[feature] !== false && freeTier.limits[feature] !== undefined;
}

/**
 * Check if user can access a scenario
 */
export async function canAccessScenario(userId, scenario) {
  try {
    const subscription = await getUserSubscription(userId);
    
    if (!subscription) {
      // Free tier: only beginner scenarios
      return scenario.difficulty_level === 'beginner' && 
             scenario.is_premium === false;
    }

    const tier = SUBSCRIPTION_TIERS[subscription.plan_type?.toUpperCase()] || SUBSCRIPTION_TIERS.FREE;
    
    if (tier.limits.scenarios === 'all') {
      return true;
    }
    
    if (tier.limits.scenarios === 'all_beginner_intermediate') {
      return scenario.difficulty_level !== 'expert';
    }
    
    // Basic tier limits
    return scenario.difficulty_level !== 'expert' || scenario.is_premium === false;
  } catch (error) {
    console.error('Error checking scenario access:', error);
    return false;
  }
}

/**
 * Create or update subscription record
 */
export async function createSubscriptionRecord(userId, subscriptionData) {
  try {
    const { data, error } = await simDb
      .from('simulator_subscriptions')
      .insert({
        user_id: userId,
        plan_type: subscriptionData.planType,
        status: subscriptionData.status || 'active',
        stripe_subscription_id: subscriptionData.stripeSubscriptionId,
        stripe_customer_id: subscriptionData.stripeCustomerId,
        billing_cycle: subscriptionData.billingCycle || 'monthly',
        current_period_start: subscriptionData.currentPeriodStart,
        current_period_end: subscriptionData.currentPeriodEnd,
        next_billing_date: subscriptionData.nextBillingDate,
        cancel_at_period_end: subscriptionData.cancelAtPeriodEnd || false,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating subscription record:', error);
    throw error;
  }
}

/**
 * Update subscription status
 */
export async function updateSubscriptionStatus(subscriptionId, status, updates = {}) {
  try {
    const updateData = {
      status,
      updated_at: new Date().toISOString(),
      ...updates,
    };

    const { data, error } = await simDb
      .from('simulator_subscriptions')
      .update(updateData)
      .eq('id', subscriptionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating subscription status:', error);
    throw error;
  }
}

/**
 * Get subscription tier details
 */
export function getTierDetails(tierId) {
  return SUBSCRIPTION_TIERS[tierId.toUpperCase()] || SUBSCRIPTION_TIERS.FREE;
}

/**
 * Check if subscription is active (including grace period)
 */
export function isSubscriptionActive(subscription) {
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
  if (subscription.status !== 'active' && subscription.status !== 'past_due') {
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
 * Check if subscription is in grace period
 */
export function isInGracePeriod(subscription) {
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
export function getGracePeriodDaysRemaining(subscription) {
  if (!isInGracePeriod(subscription)) return null;
  
  const now = new Date();
  const graceEnd = new Date(subscription.grace_period_end);
  const diffTime = graceEnd - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays > 0 ? diffDays : 0;
}

/**
 * Get days until subscription expires
 */
export function getDaysUntilExpiry(subscription) {
  if (!subscription || !subscription.current_period_end) {
    return null;
  }
  
  const now = new Date();
  const periodEnd = new Date(subscription.current_period_end);
  const diffTime = periodEnd - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays > 0 ? diffDays : 0;
}

export default {
  SUBSCRIPTION_TIERS,
  getUserSubscription,
  hasFeatureAccess,
  canAccessScenario,
  createSubscriptionRecord,
  updateSubscriptionStatus,
  getTierDetails,
  isSubscriptionActive,
  isInGracePeriod,
  getGracePeriodDaysRemaining,
  getDaysUntilExpiry,
};

