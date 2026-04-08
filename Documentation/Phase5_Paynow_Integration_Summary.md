# Phase 5: Paynow Integration - Implementation Summary

**Status:** ✅ Frontend Components Complete | ⏳ Backend Endpoints Pending  
**Date:** 2025-01-XX

---

## ✅ Completed Components

### 1. PlanCard Component
**File:** `src/components/subscription/PlanCard.jsx`

- Displays subscription plan details
- Shows pricing, features, and member limits
- Supports plan selection with visual feedback
- Highlights popular plans
- Ready to use in plan selection pages

### 2. PaymentForm Component
**File:** `src/components/subscription/PaymentForm.jsx`

- Paynow payment integration
- Redirects to Paynow checkout
- Stores payment reference in sessionStorage
- Handles payment initiation errors
- Shows plan summary before payment

### 3. Enhanced Paynow Service
**File:** `src/services/paynowService.js`

**New Functions Added:**
- `createSubscriptionCheckout()` - Creates Paynow checkout for subscriptions
- `pollPaymentStatus()` - Polls Paynow for payment status
- `verifyAndCreateSubscription()` - Verifies payment and creates subscription
- `getAuthToken()` - Helper to get auth token

**Existing Functions:**
- `createCheckoutSession()` - General checkout creation
- `createExtraSeatCheckout()` - Extra seat purchases
- `verifyPayment()` - Payment verification

### 4. Updated CheckoutSuccess Page
**File:** `src/pages/checkout/CheckoutSuccess.jsx`

- Updated to work with Paynow reference parameter
- Verifies payment and creates subscription
- Shows success/error states
- Handles subscription creation
- Redirects to dashboard after success

---

## ⏳ Pending: Backend API Endpoints

The following backend endpoints need to be created (as Supabase Edge Functions or separate backend):

### 1. Payment Initiation Endpoint
**Path:** `/api/paynow/initiate`  
**Method:** POST

**Request Body:**
```json
{
  "amount": 29.00,
  "currency": "USD",
  "reference": "SUB-1234567890-abc123",
  "returnUrl": "https://yourdomain.com/checkout/success",
  "resultUrl": "https://yourdomain.com/api/webhooks/paynow",
  "description": "Platform Subscription",
  "metadata": {
    "plan_id": "uuid",
    "plan_type": "starter",
    "billing_cycle": "monthly",
    "organisation_id": "uuid",
    "project_id": "uuid",
    "member_limit": 20
  }
}
```

**Response:**
```json
{
  "success": true,
  "checkoutUrl": "https://www.paynow.co.zw/interface/paymentgateway/...",
  "pollUrl": "https://www.paynow.co.zw/interface/checkpaymentstatus/...",
  "reference": "SUB-1234567890-abc123"
}
```

**Implementation Notes:**
- Use Paynow Integration ID and Key from environment variables
- Create SHA512 hash for authentication
- Store payment transaction in database
- Return Paynow checkout URL

### 2. Payment Status Polling Endpoint
**Path:** `/api/paynow/poll`  
**Method:** GET

**Query Parameters:**
- `pollUrl` - Paynow poll URL

**Response:**
```json
{
  "success": true,
  "status": "paid", // or "cancelled", "pending", "failed"
  "reference": "SUB-1234567890-abc123"
}
```

### 3. Subscription Verification Endpoint
**Path:** `/api/paynow/verify-subscription/:reference`  
**Method:** POST

**Response:**
```json
{
  "success": true,
  "subscription_id": "uuid",
  "project_id": "uuid"
}
```

**Implementation Notes:**
- Verify payment status from Paynow
- Create subscription record in `platform_subscriptions` table
- Update project if upgrading from trial
- Return subscription and project IDs

### 4. Paynow Webhook Handler
**Path:** `/api/webhooks/paynow`  
**Method:** POST

**Request Body (form-encoded):**
```
reference=SUB-1234567890-abc123
paynowreference=PAYNOW-REF-123
amount=29.00
status=Paid
pollurl=https://www.paynow.co.zw/interface/checkpaymentstatus/...
hash=ABC123...
```

**Implementation Notes:**
- Verify hash using Paynow Integration Key
- Update payment transaction status
- Create/update subscription if payment successful
- Update project if upgrading from trial
- Return status to Paynow

---

## Environment Variables Required

Add these to your `.env` file:

```bash
# Paynow Configuration
PAYNOW_INTEGRATION_ID=your_integration_id
PAYNOW_INTEGRATION_KEY=your_integration_key
PAYNOW_URL=https://www.paynow.co.zw/interface/initiatetransaction
PAYNOW_SANDBOX_URL=https://sandbox.paynow.co.zw/interface/initiatetransaction

# Application URLs
VITE_API_URL=https://yourdomain.com/api
PAYNOW_RETURN_URL=https://yourdomain.com/checkout/success
PAYNOW_RESULT_URL=https://yourdomain.com/api/webhooks/paynow
```

---

## Database Table Required

Create a `payment_transactions` table to track payments:

```sql
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference VARCHAR(255) UNIQUE NOT NULL,
  paynow_reference VARCHAR(255),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(50) DEFAULT 'pending',
  payment_provider VARCHAR(50) DEFAULT 'paynow',
  metadata JSONB,
  poll_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payment_transactions_reference ON payment_transactions(reference);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
```

---

## Testing Checklist

- [ ] Test payment initiation with Paynow sandbox
- [ ] Test successful payment flow
- [ ] Test failed/cancelled payment handling
- [ ] Test webhook processing
- [ ] Test subscription creation after payment
- [ ] Test trial upgrade flow
- [ ] Verify payment transaction tracking
- [ ] Test error handling and user feedback

---

## Next Steps

1. **Set up Paynow Account**
   - Sign up at https://www.paynow.co.zw
   - Get Integration ID and Key
   - Configure return and result URLs

2. **Create Backend Endpoints**
   - Implement payment initiation endpoint
   - Implement webhook handler
   - Implement verification endpoint

3. **Test Integration**
   - Use Paynow sandbox for testing
   - Test complete payment flow
   - Verify subscription creation

4. **Deploy to Production**
   - Configure production Paynow credentials
   - Update webhook URLs
   - Test with real payments

---

## Integration with Existing Services

The Paynow integration works with:
- `platformSubscriptionService.js` - For subscription management
- `trialService.js` - For trial upgrade flows
- `accountService.js` - For account management
- `projectService.js` - For project updates

All components are ready to use once backend endpoints are implemented.

