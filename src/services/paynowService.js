/**
 * Paynow Service
 * Handles Paynow payment integration for Platform
 *
 * IMPORTANT: This is a basic implementation
 * In production, you would integrate with Paynow API properly
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * Create checkout session for subscription
 * @param {object} subscriptionData - Subscription details
 * @returns {Promise<{success: boolean, checkoutUrl: string|null, error: string|null}>}
 */
export async function createCheckoutSession(subscriptionData) {
  try {
    // TODO: Integrate with Paynow API
    // This is a placeholder implementation
    
    const checkoutData = {
      amount: subscriptionData.amount,
      currency: subscriptionData.currency || 'USD',
      reference: subscriptionData.reference || `SUB-${Date.now()}`,
      returnUrl: subscriptionData.returnUrl || `${window.location.origin}/checkout/success`,
      resultUrl: subscriptionData.resultUrl || `${window.location.origin}/api/webhooks/paynow`,
      description: subscriptionData.description || 'Platform Subscription',
    }

    // In production, make API call to Paynow
    // const response = await fetch('/api/paynow/initiate', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(checkoutData),
    // })
    // const data = await response.json()

    // For now, return a mock checkout URL
    return {
      success: true,
      checkoutUrl: `/checkout/paynow?reference=${checkoutData.reference}`,
      error: null,
    }
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return {
      success: false,
      checkoutUrl: null,
      error: error.message || 'Failed to create checkout session',
    }
  }
}

/**
 * Create checkout for extra seat purchase
 * @param {string} projectId - Project UUID
 * @param {number} seats - Number of seats
 * @param {object} purchaseData - Purchase details
 * @returns {Promise<{success: boolean, checkoutUrl: string|null, error: string|null}>}
 */
export async function createExtraSeatCheckout(projectId, seats, purchaseData) {
  try {
    const checkoutData = {
      amount: purchaseData.totalAmount,
      currency: purchaseData.currency || 'USD',
      reference: purchaseData.reference || `SEAT-${Date.now()}`,
      returnUrl: purchaseData.returnUrl || `${window.location.origin}/checkout/success`,
      resultUrl: purchaseData.resultUrl || `${window.location.origin}/api/webhooks/paynow`,
      description: `Extra Seats Purchase - ${seats} seats`,
      metadata: {
        type: 'extra_seats',
        projectId,
        seats,
        purchaseId: purchaseData.purchaseId,
      },
    }

    // In production, make API call to Paynow
    return {
      success: true,
      checkoutUrl: `/checkout/paynow?reference=${checkoutData.reference}`,
      error: null,
    }
  } catch (error) {
    console.error('Error creating seat checkout:', error)
    return {
      success: false,
      checkoutUrl: null,
      error: error.message || 'Failed to create checkout',
    }
  }
}

/**
 * Verify payment status
 * @param {string} reference - Payment reference
 * @returns {Promise<{success: boolean, status: string|null, error: string|null}>}
 */
export async function verifyPayment(reference) {
  try {
    // TODO: Verify payment with Paynow API
    // const response = await fetch(`/api/paynow/verify/${reference}`)
    // const data = await response.json()

    return {
      success: true,
      status: 'completed', // or 'pending', 'failed'
      error: null,
    }
  } catch (error) {
    console.error('Error verifying payment:', error)
    return {
      success: false,
      status: null,
      error: error.message || 'Failed to verify payment',
    }
  }
}

/**
 * Create subscription checkout session
 * @param {object} subscriptionData - Subscription details
 * @returns {Promise<{success: boolean, checkoutUrl: string|null, pollUrl: string|null, error: string|null}>}
 */
export async function createSubscriptionCheckout(subscriptionData) {
  try {
    const checkoutData = {
      amount: subscriptionData.amount,
      currency: subscriptionData.currency || 'USD',
      reference: subscriptionData.reference || `SUB-${Date.now()}`,
      returnUrl: subscriptionData.returnUrl || `${window.location.origin}/checkout/success`,
      resultUrl: subscriptionData.resultUrl || `${window.location.origin}/api/webhooks/paynow`,
      description: subscriptionData.description || 'Platform Subscription',
      metadata: subscriptionData.metadata || {},
    };

    // Call Supabase Edge Function to initiate Paynow payment
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const authToken = await getAuthToken();
    
    const response = await fetch(`${supabaseUrl}/functions/v1/paynow-initiate`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'apikey': supabaseAnonKey
      },
      body: JSON.stringify(checkoutData),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        checkoutUrl: null,
        pollUrl: null,
        error: data.error || 'Failed to create checkout session',
      };
    }

    return {
      success: true,
      checkoutUrl: data.checkoutUrl,
      pollUrl: data.pollUrl,
      reference: data.reference,
      error: null,
    };
  } catch (error) {
    console.error('Error creating subscription checkout:', error);
    return {
      success: false,
      checkoutUrl: null,
      pollUrl: null,
      error: error.message || 'Failed to create checkout session',
    };
  }
}

/**
 * Poll Paynow for payment status
 * @param {string} pollUrl - Paynow poll URL
 * @returns {Promise<{success: boolean, status: string|null, error: string|null}>}
 */
export async function pollPaymentStatus(pollUrl) {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const authToken = await getAuthToken();
    
    const response = await fetch(`${supabaseUrl}/functions/v1/paynow-poll?pollUrl=${encodeURIComponent(pollUrl)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'apikey': supabaseAnonKey
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        status: null,
        error: data.error || 'Failed to poll payment status',
      };
    }

    return {
      success: true,
      status: data.status, // 'paid', 'cancelled', 'pending', 'failed'
      reference: data.reference,
      error: null,
    };
  } catch (error) {
    console.error('Error polling payment status:', error);
    return {
      success: false,
      status: null,
      error: error.message || 'Failed to poll payment status',
    };
  }
}

/**
 * Verify payment and create subscription
 * @param {string} reference - Payment reference
 * @returns {Promise<{success: boolean, subscriptionId: string|null, projectId: string|null, error: string|null}>}
 */
export async function verifyAndCreateSubscription(reference) {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const authToken = await getAuthToken();
    
    const response = await fetch(`${supabaseUrl}/functions/v1/paynow-verify-subscription/${reference}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'apikey': supabaseAnonKey
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        subscriptionId: null,
        projectId: null,
        error: data.error || 'Failed to verify payment',
      };
    }

    return {
      success: true,
      subscriptionId: data.subscription_id,
      projectId: data.project_id,
      error: null,
    };
  } catch (error) {
    console.error('Error verifying subscription:', error);
    return {
      success: false,
      subscriptionId: null,
      projectId: null,
      error: error.message || 'Failed to verify subscription',
    };
  }
}

/**
 * Helper function to get auth token
 * @returns {Promise<string|null>}
 */
async function getAuthToken() {
  try {
    const { data: { session } } = await platformDb.auth.getSession();
    return session?.access_token || null;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

export default {
  createCheckoutSession,
  createExtraSeatCheckout,
  verifyPayment,
  createSubscriptionCheckout,
  pollPaymentStatus,
  verifyAndCreateSubscription,
}

