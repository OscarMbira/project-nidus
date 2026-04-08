# Dual-Subscription System Setup & Testing Guide

**Version:** 1.0
**Date:** 2025-11-26
**Status:** Implementation Complete

---

## Overview

This guide walks you through setting up and testing the dual-subscription system that allows users to register for Platform and Simulator separately with either the same or different email addresses.

---

## Prerequisites

Before starting, ensure you have:

- ✅ Supabase project configured
- ✅ Node.js and npm installed
- ✅ Stripe account set up
- ✅ Access to Supabase SQL Editor
- ✅ Access to `.env` file for environment variables

---

## Step 1: Database Setup

### 1.1 Run the SQL Migration

1. Open your Supabase dashboard
2. Navigate to **SQL Editor**
3. Open the file `SQL/v82_pm_subscriptions.sql`
4. Copy the entire contents
5. Paste into Supabase SQL Editor
6. Click **Run** to execute

**Expected Output:**
```
✓ All tables created successfully
  - platform_subscriptions: true
  - user_platform_access: true
  - account_links: true

Functions Created:
  1. auto_create_free_subscription()
  2. get_platform_subscription_status()
  3. get_all_user_subscriptions()
  4. update_platform_access()
  5. check_pm_subscription_grace_period()

RLS Policies: ✓ Enabled on all tables
```

### 1.2 Verify Tables Created

Run this verification query in Supabase SQL Editor:

```sql
-- Check if tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('platform_subscriptions', 'user_platform_access', 'account_links');
```

**Expected Result:** 3 rows returned

### 1.3 Verify Functions Created

```sql
-- Check if functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%subscription%' OR routine_name LIKE '%platform%';
```

**Expected Result:** All 5 functions listed

---

## Step 2: Stripe Configuration

### 2.1 Create Platform Products

1. Log in to your **Stripe Dashboard**
2. Navigate to **Products** → **Add Product**
3. Create the following products:

#### PM Free Tier
- **Name:** Platform - Free
- **Price:** $0
- **Billing:** N/A (free tier)
- Copy the Price ID

#### PM Starter Monthly
- **Name:** Platform - Starter (Monthly)
- **Price:** $19.99/month
- **Billing:** Recurring - Monthly
- Copy the Price ID

#### PM Starter Yearly
- **Name:** Platform - Starter (Yearly)
- **Price:** $191.90/year (20% discount)
- **Billing:** Recurring - Yearly
- Copy the Price ID

#### PM Professional Monthly
- **Name:** Platform - Professional (Monthly)
- **Price:** $49.99/month
- **Billing:** Recurring - Monthly
- Copy the Price ID

#### PM Professional Yearly
- **Name:** Platform - Professional (Yearly)
- **Price:** $479.90/year (20% discount)
- **Billing:** Recurring - Yearly
- Copy the Price ID

#### PM Lifetime Starter
- **Name:** Platform - Lifetime Starter
- **Price:** $399.99
- **Billing:** One-time payment
- Copy the Price ID

#### PM Lifetime Professional
- **Name:** Platform - Lifetime Professional
- **Price:** $999.99
- **Billing:** One-time payment
- Copy the Price ID

### 2.2 Create Bundle Products (Optional)

#### PM + Simulator Starter Bundle (Monthly)
- **Name:** PM & Simulator Bundle - Starter
- **Price:** $24.99/month (save $4.99)
- **Billing:** Recurring - Monthly
- Copy the Price ID

#### PM + Simulator Professional Bundle (Monthly)
- **Name:** PM & Simulator Bundle - Professional
- **Price:** $69.99/month (save $9.99)
- **Billing:** Recurring - Monthly
- Copy the Price ID

#### Lifetime Bundle
- **Name:** PM & Simulator Lifetime Bundle
- **Price:** $1,099 (save $199.99)
- **Billing:** One-time payment
- Copy the Price ID

---

## Step 3: Environment Variables

### 3.1 Update `.env` File

Add the following Stripe Price IDs to your `.env` file:

```env
# Existing Stripe Keys
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx

# Platform Pricing (Monthly)
VITE_STRIPE_PM_PRICE_STARTER_MONTHLY=price_xxxxx
VITE_STRIPE_PM_PRICE_PROFESSIONAL_MONTHLY=price_xxxxx

# Platform Pricing (Yearly)
VITE_STRIPE_PM_PRICE_STARTER_YEARLY=price_xxxxx
VITE_STRIPE_PM_PRICE_PROFESSIONAL_YEARLY=price_xxxxx

# Platform Pricing (Lifetime)
VITE_STRIPE_PM_PRICE_LIFETIME_STARTER=price_xxxxx
VITE_STRIPE_PM_PRICE_LIFETIME_PROFESSIONAL=price_xxxxx

# Bundle Pricing
VITE_STRIPE_BUNDLE_STARTER_MONTHLY=price_xxxxx
VITE_STRIPE_BUNDLE_PRO_MONTHLY=price_xxxxx
VITE_STRIPE_BUNDLE_LIFETIME=price_xxxxx

# Feature Flags
VITE_ENABLE_ACCOUNT_LINKING=true
VITE_ENABLE_BUNDLE_PRICING=true
VITE_ENABLE_PLATFORM_MIGRATION=true
```

### 3.2 Restart Development Server

```bash
npm run dev
```

---

## Step 4: Test the Registration Flow

### Test Case 1: New User Registration (Both Platforms)

**Steps:**
1. Navigate to `/register`
2. Enter user details:
   - Full Name: `Test User`
   - Email: `test@example.com`
   - Password: `password123`
3. Select **both platforms**:
   - ✅ Platform
   - ✅ Simulator
4. Click **Create account**

**Expected Results:**
- ✅ User created in Supabase Auth
- ✅ User record created in `public.users` table
- ✅ Free Platform subscription created in `public.platform_subscriptions`
- ✅ Free Simulator subscription created in `sim.simulator_subscriptions`
- ✅ Platform access records created in `public.user_platform_access` for both platforms
- ✅ Email verification sent (if enabled)

**Verification Query:**
```sql
-- Get user and subscriptions
SELECT
  u.email,
  u.full_name,
  pm.plan_type as pm_plan,
  pm.status as pm_status,
  sim.plan_type as sim_plan,
  sim.status as sim_status
FROM users u
LEFT JOIN platform_subscriptions pm ON pm.user_id = u.auth_user_id
LEFT JOIN sim.simulator_subscriptions sim ON sim.user_id = u.auth_user_id
WHERE u.email = 'test@example.com';
```

### Test Case 2: New User Registration (PM Only)

**Steps:**
1. Navigate to `/register`
2. Enter user details:
   - Full Name: `PM Only User`
   - Email: `pmonly@example.com`
   - Password: `password123`
3. Select **Platform only**:
   - ✅ Platform
   - ☐ Simulator
4. Click **Create account**

**Expected Results:**
- ✅ Free PM subscription created
- ❌ No Simulator subscription
- ✅ Platform access record for PM only

### Test Case 3: New User Registration (Simulator Only)

**Steps:**
1. Navigate to `/register`
2. Enter user details:
   - Full Name: `Simulator Only User`
   - Email: `simonly@example.com`
   - Password: `password123`
3. Select **Simulator only**:
   - ☐ Platform
   - ✅ Simulator
4. Click **Create account**

**Expected Results:**
- ❌ No PM subscription
- ✅ Free Simulator subscription created
- ✅ Platform access record for Simulator only
- ✅ Redirected to `/simulator` after login

### Test Case 4: Existing User Adding Second Platform

**Steps:**
1. Log in as a user who only has PM access
2. Navigate to `/simulator`
3. **Platform Selection Modal** should appear

**Expected Modal Content:**
- Welcome message
- List of Simulator features
- Free tier limits
- **Start Free Trial** button
- **View All Plans & Pricing** button
- **Maybe later** link

**Test Actions:**
- Click **Start Free Trial**

**Expected Results:**
- ✅ Free Simulator subscription created
- ✅ Platform access record created
- ✅ Modal closes
- ✅ User redirected to Simulator dashboard
- ✅ User now has access to both platforms

---

## Step 5: Test Subscription Dashboard

### Access Dashboard

**URL:** `/subscriptions` or `/subscription-dashboard`

**Expected View:**

1. **Summary Cards:**
   - Active Subscriptions: 2 (if user has both)
   - Registered Platforms: 2/2
   - Monthly Spend: $0.00 (for free tiers)

2. **Subscriptions List:**
   - Platform subscription card
     - Plan type
     - Status badge
     - Start date
     - Actions (Manage Plan button)
   - Simulator subscription card
     - Plan type
     - Status badge
     - Start date
     - Actions (Manage Plan button)

3. **Platform Access Status:**
   - Platform (✓ Active)
   - Simulator (✓ Active)

### Test Manage Plan Actions

1. Click **Manage Plan** on Platform
   - Should navigate to `/pricing`

2. Click **Manage Plan** on Simulator
   - Should navigate to `/simulator/pricing`

---

## Step 6: Test Platform Access Control

### Test Protected Routes

**Platform Routes (require `requiredPlatform="pm"`):**

```jsx
// Example usage in App.jsx or routes file
<Route
  path="/dashboard"
  element={
    <ProtectedRoute requiredPlatform="pm">
      <Dashboard />
    </ProtectedRoute>
  }
/>

<Route
  path="/projects"
  element={
    <ProtectedRoute requiredPlatform="pm">
      <Projects />
    </ProtectedRoute>
  }
/>
```

**Simulator Routes (require `requiredPlatform="simulator"`):**

```jsx
<Route
  path="/simulator"
  element={
    <ProtectedRoute requiredPlatform="simulator">
      <SimulatorDashboard />
    </ProtectedRoute>
  }
/>

<Route
  path="/simulator/scenarios"
  element={
    <ProtectedRoute requiredPlatform="simulator">
      <Scenarios />
    </ProtectedRoute>
  }
/>
```

### Test Access Scenarios

**Scenario 1:** User with PM access tries to access PM routes
- ✅ Should have immediate access
- ✅ Last access time updated

**Scenario 2:** User with PM access tries to access Simulator routes
- ✅ Platform Selection Modal appears
- ✅ User can start free trial or view pricing
- ✅ If user declines, redirected to home

**Scenario 3:** User with both platform accesses
- ✅ Can freely navigate between PM and Simulator routes
- ✅ Access tracking updated for each platform

---

## Step 7: Test Database Functions

### Test auto_create_free_subscription()

```sql
-- Manually insert platform access (simulating registration)
INSERT INTO user_platform_access (user_id, platform, has_registered)
VALUES ('user-uuid-here', 'pm', true);

-- Check if PM subscription was auto-created
SELECT * FROM platform_subscriptions WHERE user_id = 'user-uuid-here';
```

**Expected:** Free PM subscription created automatically

### Test get_platform_subscription_status()

```sql
SELECT * FROM get_platform_subscription_status('user-uuid-here', 'pm');
```

**Expected Output:**
```
has_subscription | plan_type | status | is_active | is_lifetime | expires_at | in_grace_period
-----------------|-----------|--------|-----------|-------------|------------|----------------
true             | free      | active | true      | false       | NULL       | false
```

### Test get_all_user_subscriptions()

```sql
SELECT * FROM get_all_user_subscriptions('user-uuid-here');
```

**Expected:** Returns all subscriptions (PM and Simulator) for the user

---

## Step 8: Test Stripe Integration (Optional Advanced Testing)

### Test Subscription Upgrade Flow

1. Navigate to `/pricing` (Platform pricing page)
2. Click **Upgrade** on Starter plan
3. Complete Stripe checkout
4. Return to app after payment

**Expected Results:**
- ✅ Stripe webhook received
- ✅ PM subscription updated from free → starter
- ✅ Status updated to active
- ✅ Billing details saved
- ✅ User sees updated subscription in dashboard

### Test Webhook Processing

**Stripe Webhooks to Configure:**

```
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.payment_succeeded
invoice.payment_failed
```

**Webhook Endpoint:** `https://yourdomain.com/api/webhooks/stripe`

---

## Step 9: Advanced Testing - Account Linking

### Test Secondary Email Linking

**Note:** This is an advanced feature for users who want different emails per platform.

**Steps:**
1. Log in as a user
2. Navigate to `/account/linking` (you may need to create this page)
3. Click **Link Secondary Email for Simulator**
4. Enter: `secondary@example.com`
5. Click **Send Verification**

**Expected Results:**
- ✅ Verification email sent to secondary email
- ✅ Record created in `account_links` table
- ✅ `is_verified` = false initially

**Verification:**
```sql
SELECT * FROM account_links WHERE primary_user_id = 'user-uuid';
```

### Test Email Verification

1. Check verification email (or check console logs)
2. Click verification link
3. Should see success message

**Expected Results:**
- ✅ `is_verified` = true
- ✅ `verified_at` timestamp set
- ✅ User can now use secondary email for that platform

---

## Step 10: Troubleshooting

### Common Issues

#### Issue 1: Tables Not Created

**Error:** `relation "platform_subscriptions" does not exist` (Note: Table was renamed from pm_subscriptions to platform_subscriptions in v90)

**Solution:**
- Re-run the SQL migration file
- Check Supabase SQL logs for errors
- Ensure you're connected to the correct project

#### Issue 2: RLS Policies Blocking Access

**Error:** `new row violates row-level security policy`

**Solution:**
- Check RLS policies in Supabase dashboard
- Temporarily disable RLS for testing: `ALTER TABLE platform_subscriptions DISABLE ROW LEVEL SECURITY;`
- Verify user authentication status

#### Issue 3: Platform Modal Not Showing

**Error:** Modal doesn't appear when accessing unregistered platform

**Solution:**
- Check browser console for errors
- Verify `ProtectedRoute` has `requiredPlatform` prop
- Check that `unifiedSubscriptionService` is imported correctly

#### Issue 4: Free Subscription Not Auto-Created

**Error:** No subscription after registration

**Solution:**
- Check that trigger is enabled:
  ```sql
  SELECT * FROM pg_trigger WHERE tgname = 'trg_auto_create_free_subscription';
  ```
- Manually test trigger:
  ```sql
  UPDATE user_platform_access SET has_registered = true WHERE user_id = 'user-uuid';
  ```

#### Issue 5: Stripe Integration Not Working

**Error:** Payment not processing

**Solution:**
- Verify Stripe API keys are correct (test mode vs production)
- Check Stripe webhook is configured
- Verify webhook secret is in environment variables
- Test webhook locally using Stripe CLI:
  ```bash
  stripe listen --forward-to localhost:5173/api/webhooks/stripe
  ```

---

## Step 11: Performance Testing

### Load Testing Queries

Test database performance with multiple users:

```sql
-- Create test users and subscriptions
DO $$
BEGIN
  FOR i IN 1..1000 LOOP
    -- Would need actual UUID generation and insertion logic
  END LOOP;
END $$;
```

### Monitor Query Performance

```sql
-- Check slow queries
SELECT
  query,
  calls,
  total_time,
  mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

---

## Step 12: Production Deployment Checklist

Before deploying to production:

- [ ] All SQL migrations run successfully in production Supabase
- [ ] Stripe products created in **Production mode** (not test mode)
- [ ] Environment variables updated with production Stripe keys
- [ ] RLS policies enabled and tested
- [ ] Email templates configured for verification and notifications
- [ ] Stripe webhooks configured with production endpoint
- [ ] SSL certificate valid for webhook endpoint
- [ ] Database backups configured
- [ ] Error monitoring set up (Sentry, LogRocket, etc.)
- [ ] Analytics tracking added (subscription events)
- [ ] Load testing completed
- [ ] User acceptance testing (UAT) completed
- [ ] Documentation updated for support team
- [ ] Rollback plan prepared

---

## Summary

You have successfully set up and tested the dual-subscription system! Users can now:

✅ Register for Platform and Simulator separately
✅ Use a single email for both platforms (recommended)
✅ Add a second platform after initial registration
✅ Manage subscriptions independently
✅ View unified subscription dashboard
✅ Upgrade/downgrade each platform separately

---

## Support & Troubleshooting Resources

**Documentation:**
- Main Plan: `projectplan/Dual_Subscription_Registration_Plan.md`
- This Setup Guide: `Documentation/Dual_Subscription_Setup_Guide.md`

**Database Schema:**
- SQL Migration: `SQL/v82_pm_subscriptions.sql`

**Services:**
- PM Subscription Service: `src/services/pmSubscriptionService.js`
- Unified Subscription Service: `src/services/unifiedSubscriptionService.js`
- Account Linking Service: `src/services/accountLinkingService.js`

**Components:**
- Registration: `src/pages/auth/Register.jsx`
- Platform Modal: `src/components/PlatformSelectionModal.jsx`
- Subscription Dashboard: `src/pages/SubscriptionDashboard.jsx`
- Protected Route: `src/components/ProtectedRoute.jsx`

---

**Last Updated:** 2025-11-26
**Status:** ✅ Setup Complete - Ready for Testing
