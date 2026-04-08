# Supabase Edge Functions for Paynow Integration

This directory contains Supabase Edge Functions for handling Paynow payment integration.

## Functions

### 1. `paynow-initiate`
**Purpose:** Initiates a Paynow payment request

**Endpoint:** `POST /functions/v1/paynow-initiate`

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

### 2. `paynow-poll`
**Purpose:** Polls Paynow for payment status

**Endpoint:** `GET /functions/v1/paynow-poll?pollUrl=...`

**Response:**
```json
{
  "success": true,
  "status": "paid",
  "reference": "SUB-1234567890-abc123",
  "paynowReference": "PAYNOW-REF-123"
}
```

### 3. `paynow-verify-subscription`
**Purpose:** Verifies payment and creates subscription

**Endpoint:** `POST /functions/v1/paynow-verify-subscription/:reference`

**Response:**
```json
{
  "success": true,
  "subscription_id": "uuid",
  "project_id": "uuid"
}
```

### 4. `paynow-webhook`
**Purpose:** Handles Paynow webhook callbacks

**Endpoint:** `POST /functions/v1/paynow-webhook`

**Note:** This endpoint should be configured in Paynow dashboard as the result URL.

## Environment Variables

Set these in your Supabase project settings:

```bash
PAYNOW_INTEGRATION_ID=your_integration_id
PAYNOW_INTEGRATION_KEY=your_integration_key
PAYNOW_URL=https://www.paynow.co.zw/interface/initiatetransaction
SITE_URL=https://yourdomain.com
```

## Deployment

Deploy these functions using the Supabase CLI:

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

## Testing

Test locally using Supabase CLI:

```bash
# Start local development
supabase start

# Test a function
supabase functions serve paynow-initiate
```

## Database Requirements

Ensure the `payment_transactions` table exists:

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

## Security Notes

- All functions verify user authentication via Bearer token
- Hash verification is performed for webhook security
- Service role key is used for database operations
- CORS headers are properly configured

