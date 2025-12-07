/**
 * Checkout Service
 *
 * Handles Stripe checkout session creation for PM and Simulator subscriptions
 */

import { supabase } from './supabaseClient';

const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

/**
 * Create Stripe checkout session for PM subscription
 */
export async function createPMCheckoutSession(userId, planType, billingCycle = 'monthly') {
  try {
    // Get price ID based on plan and billing cycle
    const priceId = getPMPriceId(planType, billingCycle);

    if (!priceId) {
      throw new Error('Invalid plan type or billing cycle');
    }

    // Call your backend API to create Stripe checkout session
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        priceId,
        platform: 'pm',
        planType,
        billingCycle,
        successUrl: `${window.location.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/checkout/cancel`,
      }),
    });

    const { sessionId, url } = await response.json();

    return url;
  } catch (error) {
    console.error('Error creating PM checkout session:', error);
    throw error;
  }
}

/**
 * Create Stripe checkout session for Simulator subscription
 */
export async function createSimulatorCheckoutSession(userId, planType, billingCycle = 'monthly') {
  try {
    const priceId = getSimulatorPriceId(planType, billingCycle);

    if (!priceId) {
      throw new Error('Invalid plan type or billing cycle');
    }

    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        priceId,
        platform: 'simulator',
        planType,
        billingCycle,
        successUrl: `${window.location.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/checkout/cancel`,
      }),
    });

    const { sessionId, url } = await response.json();

    return url;
  } catch (error) {
    console.error('Error creating Simulator checkout session:', error);
    throw error;
  }
}

/**
 * Create Stripe checkout session for Bundle subscription
 */
export async function createBundleCheckoutSession(userId, bundleType, billingCycle = 'monthly') {
  try {
    const priceId = getBundlePriceId(bundleType, billingCycle);

    if (!priceId) {
      throw new Error('Invalid bundle type or billing cycle');
    }

    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        priceId,
        platform: 'bundle',
        bundleType,
        billingCycle,
        successUrl: `${window.location.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/checkout/cancel`,
      }),
    });

    const { sessionId, url } = await response.json();

    return url;
  } catch (error) {
    console.error('Error creating Bundle checkout session:', error);
    throw error;
  }
}

/**
 * Get PM Platform Price ID from environment variables
 */
function getPMPriceId(planType, billingCycle) {
  const planMap = {
    starter: {
      monthly: import.meta.env.VITE_STRIPE_PM_PRICE_STARTER_MONTHLY,
      yearly: import.meta.env.VITE_STRIPE_PM_PRICE_STARTER_YEARLY,
    },
    professional: {
      monthly: import.meta.env.VITE_STRIPE_PM_PRICE_PROFESSIONAL_MONTHLY,
      yearly: import.meta.env.VITE_STRIPE_PM_PRICE_PROFESSIONAL_YEARLY,
    },
    lifetime_starter: {
      one_time: import.meta.env.VITE_STRIPE_PM_PRICE_LIFETIME_STARTER,
    },
    lifetime_professional: {
      one_time: import.meta.env.VITE_STRIPE_PM_PRICE_LIFETIME_PROFESSIONAL,
    },
  };

  return planMap[planType]?.[billingCycle];
}

/**
 * Get Simulator Price ID from environment variables
 */
function getSimulatorPriceId(planType, billingCycle) {
  const planMap = {
    basic: {
      monthly: import.meta.env.VITE_STRIPE_PRICE_BASIC,
      yearly: import.meta.env.VITE_STRIPE_PRICE_BASIC_YEARLY,
    },
    professional: {
      monthly: import.meta.env.VITE_STRIPE_PRICE_PROFESSIONAL,
      yearly: import.meta.env.VITE_STRIPE_PRICE_PROFESSIONAL_YEARLY,
    },
    lifetime: {
      one_time: import.meta.env.VITE_STRIPE_PRICE_LIFETIME,
    },
  };

  return planMap[planType]?.[billingCycle];
}

/**
 * Get Bundle Price ID from environment variables
 */
function getBundlePriceId(bundleType, billingCycle) {
  const bundleMap = {
    starter_bundle: {
      monthly: import.meta.env.VITE_STRIPE_BUNDLE_STARTER_MONTHLY,
      yearly: import.meta.env.VITE_STRIPE_BUNDLE_STARTER_YEARLY,
    },
    professional_bundle: {
      monthly: import.meta.env.VITE_STRIPE_BUNDLE_PRO_MONTHLY,
      yearly: import.meta.env.VITE_STRIPE_BUNDLE_PRO_YEARLY,
    },
    lifetime_bundle: {
      one_time: import.meta.env.VITE_STRIPE_BUNDLE_LIFETIME,
    },
  };

  return bundleMap[bundleType]?.[billingCycle];
}

/**
 * Retrieve checkout session details
 */
export async function getCheckoutSession(sessionId) {
  try {
    const response = await fetch(`/api/checkout-session/${sessionId}`);
    const session = await response.json();
    return session;
  } catch (error) {
    console.error('Error retrieving checkout session:', error);
    throw error;
  }
}

/**
 * Create customer portal session for managing subscriptions
 */
export async function createPortalSession(userId) {
  try {
    const response = await fetch('/api/create-portal-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        returnUrl: `${window.location.origin}/subscriptions`,
      }),
    });

    const { url } = await response.json();
    return url;
  } catch (error) {
    console.error('Error creating portal session:', error);
    throw error;
  }
}

export default {
  createPMCheckoutSession,
  createSimulatorCheckoutSession,
  createBundleCheckoutSession,
  getCheckoutSession,
  createPortalSession,
};
