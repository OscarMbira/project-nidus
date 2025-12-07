/**
 * Stripe Payment Service
 * 
 * Handles all Stripe payment operations for the PM Simulator
 */

// Note: In production, Stripe should be called from a backend API
// This is a client-side service that would call your backend API endpoints
// For now, we'll create the structure that can be connected to a backend

const STRIPE_API_URL = import.meta.env.VITE_STRIPE_API_URL || '/api/stripe';

/**
 * Create a Stripe checkout session for subscription
 */
export async function createCheckoutSession(priceId, userId, successUrl, cancelUrl) {
  try {
    // In production, this would call your backend API
    // Backend would create the Stripe checkout session securely
    const response = await fetch(`${STRIPE_API_URL}/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        priceId,
        userId,
        successUrl,
        cancelUrl,
        mode: 'subscription',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create checkout session');
    }

    const { sessionId, url } = await response.json();
    return { sessionId, url };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

/**
 * Create a payment intent for one-time purchase
 */
export async function createPaymentIntent(amount, currency, userId, metadata = {}) {
  try {
    const response = await fetch(`${STRIPE_API_URL}/create-payment-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount, // in cents
        currency,
        userId,
        metadata,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create payment intent');
    }

    const { clientSecret, paymentIntentId } = await response.json();
    return { clientSecret, paymentIntentId };
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
}

/**
 * Get customer portal URL for subscription management
 */
export async function getCustomerPortalUrl(userId, returnUrl) {
  try {
    const response = await fetch(`${STRIPE_API_URL}/customer-portal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        returnUrl,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get customer portal URL');
    }

    const { url } = await response.json();
    return url;
  } catch (error) {
    console.error('Error getting customer portal URL:', error);
    throw error;
  }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(subscriptionId, userId) {
  try {
    const response = await fetch(`${STRIPE_API_URL}/cancel-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscriptionId,
        userId,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to cancel subscription');
    }

    return await response.json();
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
}

/**
 * Update subscription (upgrade/downgrade)
 */
export async function updateSubscription(subscriptionId, newPriceId, userId) {
  try {
    const response = await fetch(`${STRIPE_API_URL}/update-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscriptionId,
        newPriceId,
        userId,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to update subscription');
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }
}

/**
 * Get subscription details
 */
export async function getSubscription(subscriptionId) {
  try {
    const response = await fetch(`${STRIPE_API_URL}/subscription/${subscriptionId}`);

    if (!response.ok) {
      throw new Error('Failed to get subscription');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting subscription:', error);
    throw error;
  }
}

/**
 * Get billing history
 */
export async function getBillingHistory(userId) {
  try {
    const response = await fetch(`${STRIPE_API_URL}/billing-history/${userId}`);

    if (!response.ok) {
      throw new Error('Failed to get billing history');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting billing history:', error);
    throw error;
  }
}

/**
 * Get invoice PDF URL
 */
export async function getInvoicePdfUrl(invoiceId) {
  try {
    const response = await fetch(`${STRIPE_API_URL}/invoice/${invoiceId}/pdf`);

    if (!response.ok) {
      throw new Error('Failed to get invoice PDF');
    }

    const { url } = await response.json();
    return url;
  } catch (error) {
    console.error('Error getting invoice PDF:', error);
    throw error;
  }
}

export default {
  createCheckoutSession,
  createPaymentIntent,
  getCustomerPortalUrl,
  cancelSubscription,
  updateSubscription,
  getSubscription,
  getBillingHistory,
  getInvoicePdfUrl,
};

