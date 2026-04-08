# Stripe Webhook Implementation Guide

**Version:** 1.0
**Date:** 2025-11-26
**Purpose:** Backend webhook handler for Stripe subscription events

---

## Overview

This document provides the implementation guide for Stripe webhooks that handle subscription lifecycle events for both Platform and Simulator subscriptions.

---

## Webhook Events to Handle

### Required Events

1. `checkout.session.completed` - When user completes checkout
2. `customer.subscription.created` - New subscription created
3. `customer.subscription.updated` - Subscription modified
4. `customer.subscription.deleted` - Subscription cancelled
5. `invoice.payment_succeeded` - Payment successful
6. `invoice.payment_failed` - Payment failed

---

## Backend Implementation (Node.js/Express Example)

### 1. Install Stripe SDK

```bash
npm install stripe
```

### 2. Create Webhook Handler

Create `api/webhooks/stripe.js`:

```javascript
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Initialize Supabase clients
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

// Handler functions
async function handleCheckoutCompleted(session) {
  console.log('Checkout completed:', session.id);

  const { customer, subscription, client_reference_id, metadata } = session;

  // Get user ID from metadata or client_reference_id
  const userId = metadata?.userId || client_reference_id;
  const platform = metadata?.platform; // 'pm', 'simulator', or 'bundle'
  const planType = metadata?.planType;
  const billingCycle = metadata?.billingCycle;

  if (!userId) {
    console.error('No user ID found in checkout session');
    return;
  }

  // Retrieve subscription details
  const stripeSubscription = subscription
    ? await stripe.subscriptions.retrieve(subscription)
    : null;

  if (platform === 'pm' || platform === 'bundle') {
    await createOrUpdatePMSubscription(userId, stripeSubscription, {
      planType,
      billingCycle,
      stripeCustomerId: customer,
    });
  }

  if (platform === 'simulator' || platform === 'bundle') {
    await createOrUpdateSimulatorSubscription(userId, stripeSubscription, {
      planType,
      billingCycle,
      stripeCustomerId: customer,
    });
  }
}

async function handleSubscriptionCreated(subscription) {
  console.log('Subscription created:', subscription.id);

  // Determine platform from metadata
  const platform = subscription.metadata?.platform;
  const userId = subscription.metadata?.userId;

  if (!userId) {
    console.error('No user ID found in subscription metadata');
    return;
  }

  if (platform === 'pm') {
    await createOrUpdatePMSubscription(userId, subscription);
  } else if (platform === 'simulator') {
    await createOrUpdateSimulatorSubscription(userId, subscription);
  }
}

async function handleSubscriptionUpdated(subscription) {
  console.log('Subscription updated:', subscription.id);

  // Update subscription in database
  const platform = subscription.metadata?.platform;
  const userId = subscription.metadata?.userId;

  if (platform === 'pm') {
    await updatePMSubscription(subscription);
  } else if (platform === 'simulator') {
    await updateSimulatorSubscription(subscription);
  }
}

async function handleSubscriptionDeleted(subscription) {
  console.log('Subscription deleted:', subscription.id);

  const platform = subscription.metadata?.platform;

  if (platform === 'pm') {
    await cancelPMSubscription(subscription.id);
  } else if (platform === 'simulator') {
    await cancelSimulatorSubscription(subscription.id);
  }
}

async function handlePaymentSucceeded(invoice) {
  console.log('Payment succeeded:', invoice.id);

  const subscription = invoice.subscription;

  if (!subscription) return;

  // Retrieve subscription to get metadata
  const stripeSubscription = await stripe.subscriptions.retrieve(subscription);
  const platform = stripeSubscription.metadata?.platform;

  if (platform === 'pm') {
    await updatePMSubscriptionPayment(stripeSubscription, invoice);
  } else if (platform === 'simulator') {
    await updateSimulatorSubscriptionPayment(stripeSubscription, invoice);
  }
}

async function handlePaymentFailed(invoice) {
  console.log('Payment failed:', invoice.id);

  const subscription = invoice.subscription;

  if (!subscription) return;

  const stripeSubscription = await stripe.subscriptions.retrieve(subscription);
  const platform = stripeSubscription.metadata?.platform;

  if (platform === 'pm') {
    await markPMSubscriptionPastDue(stripeSubscription);
  } else if (platform === 'simulator') {
    await markSimulatorSubscriptionPastDue(stripeSubscription);
  }
}

// Database operations for Platform subscriptions
async function createOrUpdatePMSubscription(userId, subscription, metadata = {}) {
  const subscriptionData = {
    user_id: userId,
    plan_type: metadata.planType || 'professional',
    status: subscription?.status || 'active',
    stripe_subscription_id: subscription?.id,
    stripe_customer_id: metadata.stripeCustomerId || subscription?.customer,
    billing_cycle: metadata.billingCycle || 'monthly',
    amount_paid: subscription?.items?.data[0]?.price?.unit_amount / 100,
    currency: subscription?.items?.data[0]?.price?.currency?.toUpperCase() || 'USD',
    current_period_start: subscription?.current_period_start
      ? new Date(subscription.current_period_start * 1000).toISOString()
      : null,
    current_period_end: subscription?.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null,
    next_billing_date: subscription?.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null,
    is_lifetime: metadata.billingCycle === 'one_time',
  };

  const { data, error } = await supabase
    .from('platform_subscriptions')
    .upsert(subscriptionData, {
      onConflict: 'stripe_subscription_id',
    });

  if (error) {
    console.error('Error creating Platform subscription:', error);
    throw error;
  }

  return data;
}

async function updatePMSubscription(subscription) {
  const { error } = await supabase
    .from('platform_subscriptions')
    .update({
      status: subscription.status,
      current_period_end: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Error updating Platform subscription:', error);
    throw error;
  }
}

async function cancelPMSubscription(stripeSubscriptionId) {
  const { error } = await supabase
    .from('platform_subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', stripeSubscriptionId);

  if (error) {
    console.error('Error cancelling Platform subscription:', error);
    throw error;
  }
}

async function markPMSubscriptionPastDue(subscription) {
  const { error } = await supabase
    .from('platform_subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Error marking PM subscription past due:', error);
    throw error;
  }
}

// Database operations for Simulator subscriptions (similar pattern)
async function createOrUpdateSimulatorSubscription(userId, subscription, metadata = {}) {
  const subscriptionData = {
    user_id: userId,
    plan_type: metadata.planType || 'professional',
    status: subscription?.status || 'active',
    stripe_subscription_id: subscription?.id,
    stripe_customer_id: metadata.stripeCustomerId || subscription?.customer,
    billing_cycle: metadata.billingCycle || 'monthly',
    amount_paid: subscription?.items?.data[0]?.price?.unit_amount / 100,
    currency: subscription?.items?.data[0]?.price?.currency?.toUpperCase() || 'USD',
    is_lifetime: metadata.billingCycle === 'one_time',
  };

  const { data, error } = await supabase
    .from('sim.simulator_subscriptions')
    .upsert(subscriptionData, {
      onConflict: 'stripe_subscription_id',
    });

  if (error) {
    console.error('Error creating Simulator subscription:', error);
    throw error;
  }

  return data;
}

async function updateSimulatorSubscription(subscription) {
  const { error } = await supabase
    .from('sim.simulator_subscriptions')
    .update({
      status: subscription.status,
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Error updating Simulator subscription:', error);
    throw error;
  }
}

async function cancelSimulatorSubscription(stripeSubscriptionId) {
  const { error } = await supabase
    .from('sim.simulator_subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', stripeSubscriptionId);

  if (error) {
    console.error('Error cancelling Simulator subscription:', error);
    throw error;
  }
}

async function markSimulatorSubscriptionPastDue(subscription) {
  const { error } = await supabase
    .from('sim.simulator_subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Error marking Simulator subscription past due:', error);
    throw error;
  }
}
```

---

## Stripe Checkout Session Creation

Create `api/create-checkout-session.js`:

```javascript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, priceId, platform, planType, billingCycle, successUrl, cancelUrl } = req.body;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: billingCycle === 'one_time' ? 'payment' : 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      metadata: {
        userId,
        platform,
        planType,
        billingCycle,
      },
      subscription_data: billingCycle !== 'one_time' ? {
        metadata: {
          userId,
          platform,
          planType,
          billingCycle,
        },
      } : undefined,
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
}
```

---

## Configuration Steps

### 1. Set Environment Variables

```env
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx
```

### 2. Configure Stripe Webhook

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Enter your webhook URL: `https://yourdomain.com/api/webhooks/stripe`
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the webhook signing secret to your `.env` file

### 3. Test Webhooks Locally

Use Stripe CLI:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Test specific events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
```

---

## Security Best Practices

1. **Always verify webhook signatures** - Prevents malicious requests
2. **Use HTTPS in production** - Required by Stripe
3. **Validate event data** - Check user IDs and amounts
4. **Handle idempotency** - Stripe may send duplicate events
5. **Log all webhook events** - For debugging and auditing
6. **Use service role key** - For bypassing RLS policies

---

## Error Handling

```javascript
// Implement retry logic
async function handleWebhookWithRetry(handler, data, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await handler(data);
      return;
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error);
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

---

## Testing Checklist

- [ ] Webhook endpoint responds with 200 OK
- [ ] Signature verification working
- [ ] PM subscription created on successful payment
- [ ] Simulator subscription created on successful payment
- [ ] Bundle creates both subscriptions
- [ ] Subscription updates reflected in database
- [ ] Cancellation handled correctly
- [ ] Payment failure triggers past_due status
- [ ] Grace period starts after failed payment
- [ ] Idempotency prevents duplicate records

---

**Last Updated:** 2025-11-26
**Status:** Ready for Implementation
