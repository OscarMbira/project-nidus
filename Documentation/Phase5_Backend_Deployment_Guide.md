# Phase 5: Backend Endpoints - Deployment Guide

**Status:** ✅ All Backend Endpoints Created  
**Date:** 2025-01-XX

---

## ✅ Completed Backend Components

### 1. Supabase Edge Functions

All four Paynow integration functions have been created:

1. **`supabase/functions/paynow-initiate/index.ts`**
   - Initiates Paynow payment requests
   - Creates payment transaction records
   - Returns checkout URL and poll URL

2. **`supabase/functions/paynow-poll/index.ts`**
   - Polls Paynow for payment status
   - Updates transaction status
   - Verifies payment hash

3. **`supabase/functions/paynow-verify-subscription/index.ts`**
   - Verifies payment and creates subscription
   - Updates project from trial to paid
   - Updates account flags

4. **`supabase/functions/paynow-webhook/index.ts`**
   - Handles Paynow webhook callbacks
   - Processes payment status updates
   - Creates subscriptions automatically

### 2. Database Migration

**`SQL/v117_payment_transactions_table.sql`**
- Creates `payment_transactions` table
- Adds indexes for performance
- Sets up RLS policies
- Creates update trigger

### 3. Updated Service

**`src/services/paynowService.js`**
- Updated to use Supabase Edge Functions
- Added proper authentication headers
- Uses Supabase URL and anon key

---

## 📋 Deployment Steps

### Step 1: Run Database Migration

1. Open Supabase SQL Editor
2. Run `SQL/v117_payment_transactions_table.sql`
3. Verify table creation:
   ```sql
   SELECT * FROM payment_transactions LIMIT 1;
   ```

### Step 2: Set Environment Variables

In your Supabase project settings, add these secrets:

```bash
PAYNOW_INTEGRATION_ID=your_integration_id
PAYNOW_INTEGRATION_KEY=your_integration_key
PAYNOW_URL=https://www.paynow.co.zw/interface/initiatetransaction
SITE_URL=https://yourdomain.com
```

**To set secrets in Supabase:**
1. Go to Project Settings → Edge Functions → Secrets
2. Add each secret variable
3. Save changes

### Step 3: Deploy Edge Functions

#### Option A: Using Supabase CLI (Recommended)

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Deploy all functions
supabase functions deploy paynow-initiate
supabase functions deploy paynow-poll
supabase functions deploy paynow-verify-subscription
supabase functions deploy paynow-webhook
```

#### Option B: Using Supabase Dashboard

1. Go to Edge Functions in Supabase Dashboard
2. Click "Create a new function"
3. For each function:
   - Name: `paynow-initiate`, `paynow-poll`, etc.
   - Copy the contents from the corresponding `index.ts` file
   - Set environment variables
   - Deploy

### Step 4: Configure Paynow Webhook

1. Log in to your Paynow dashboard
2. Go to Settings → Integration
3. Set Result URL to:
   ```
   https://your-project-ref.supabase.co/functions/v1/paynow-webhook
   ```
4. Set Return URL to:
   ```
   https://yourdomain.com/checkout/success
   ```
5. Save settings

### Step 5: Test the Integration

#### Test Payment Initiation

```bash
curl -X POST https://your-project-ref.supabase.co/functions/v1/paynow-initiate \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 29.00,
    "currency": "USD",
    "reference": "TEST-123",
    "returnUrl": "https://yourdomain.com/checkout/success",
    "resultUrl": "https://your-project-ref.supabase.co/functions/v1/paynow-webhook",
    "description": "Test Subscription",
    "metadata": {
      "plan_id": "test-plan",
      "plan_type": "starter",
      "billing_cycle": "monthly",
      "organisation_id": "test-org-id",
      "member_limit": 20
    }
  }'
```

#### Test Webhook (Use Paynow Test Mode)

Paynow will automatically call your webhook when a payment status changes.

---

## 🔧 Configuration

### Frontend Environment Variables

Ensure these are set in your `.env` file:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Backend Environment Variables (Supabase Secrets)

Set in Supabase Dashboard → Project Settings → Edge Functions → Secrets:

```bash
PAYNOW_INTEGRATION_ID=your_integration_id
PAYNOW_INTEGRATION_KEY=your_integration_key
PAYNOW_URL=https://www.paynow.co.zw/interface/initiatetransaction
SITE_URL=https://yourdomain.com
```

---

## 🧪 Testing Checklist

- [ ] Database migration runs successfully
- [ ] `payment_transactions` table exists
- [ ] Edge functions deploy without errors
- [ ] Environment variables are set correctly
- [ ] Payment initiation returns checkout URL
- [ ] Payment polling works
- [ ] Webhook receives Paynow callbacks
- [ ] Subscription creation works
- [ ] Trial upgrade flow works
- [ ] Error handling works correctly

---

## 🔍 Troubleshooting

### Issue: "Missing authorization header"
**Solution:** Ensure the frontend is sending the Bearer token and apikey header

### Issue: "Paynow configuration missing"
**Solution:** Check that `PAYNOW_INTEGRATION_ID` and `PAYNOW_INTEGRATION_KEY` are set in Supabase secrets

### Issue: "Invalid hash" in webhook
**Solution:** Verify that `PAYNOW_INTEGRATION_KEY` matches your Paynow dashboard settings

### Issue: "Transaction not found"
**Solution:** Ensure payment transaction was created before verification. Check `payment_transactions` table.

### Issue: "Subscription creation error"
**Solution:** Verify that:
- `platform_subscriptions` table exists
- Required columns are present
- Account ID and plan information are correct

---

## 📊 Monitoring

### Check Function Logs

In Supabase Dashboard:
1. Go to Edge Functions
2. Click on a function name
3. View "Logs" tab

### Check Payment Transactions

```sql
SELECT 
  reference,
  status,
  amount,
  currency,
  created_at,
  updated_at
FROM payment_transactions
ORDER BY created_at DESC
LIMIT 10;
```

### Check Subscriptions

```sql
SELECT 
  id,
  account_id,
  project_id,
  plan_type,
  status,
  started_at,
  expires_at
FROM platform_subscriptions
ORDER BY started_at DESC
LIMIT 10;
```

---

## 🚀 Production Checklist

Before going live:

- [ ] All environment variables set in production
- [ ] Paynow webhook URL configured in production
- [ ] Test payment flow in Paynow sandbox
- [ ] Verify subscription creation works
- [ ] Test trial upgrade flow
- [ ] Monitor error logs for 24 hours
- [ ] Set up alerts for failed payments
- [ ] Document support procedures

---

## 📝 Next Steps

1. **Deploy to Staging**
   - Test all functions in staging environment
   - Verify Paynow sandbox integration

2. **Deploy to Production**
   - Update Paynow webhook URLs
   - Test with real payments (small amounts)
   - Monitor closely for first week

3. **Documentation**
   - Update API documentation
   - Create user guide for payment flow
   - Document support procedures

---

## ✅ Completion Status

All backend endpoints are complete and ready for deployment!

- ✅ Payment initiation endpoint
- ✅ Payment polling endpoint
- ✅ Subscription verification endpoint
- ✅ Webhook handler
- ✅ Database migration
- ✅ Service integration
- ✅ Documentation

**Ready to deploy!** 🎉

