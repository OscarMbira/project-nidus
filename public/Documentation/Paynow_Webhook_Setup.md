# Paynow Webhook Setup Guide

**Version:** 1.0  
**Last Updated:** 2025-01-XX

---

## Overview

This guide explains how to set up Paynow webhooks for payment notifications and subscription management.

---

## Paynow Webhook Overview

### What is a Webhook?

A webhook is an HTTP callback that Paynow sends to your server when payment events occur. This allows real-time updates on payment status.

### Webhook Events

Paynow sends webhooks for:
- **Payment Created**: Initial payment request
- **Payment Paid**: Successful payment
- **Payment Cancelled**: User cancelled payment
- **Payment Failed**: Payment processing failed

---

## Webhook Endpoint

### Supabase Edge Function

**Endpoint**: `https://YOUR_PROJECT.supabase.co/functions/v1/paynow-webhook`

**Method**: POST

**Content-Type**: `application/x-www-form-urlencoded`

### Local Development

For local testing, use a tool like:
- **ngrok**: Expose local server to internet
- **Supabase CLI**: Local Edge Function development

---

## Paynow Configuration

### Step 1: Get Integration Credentials

1. Log in to Paynow dashboard
2. Navigate to **Settings** > **Integration**
3. Copy **Integration ID** and **Integration Key**
4. Store securely (use environment variables)

### Step 2: Configure Webhook URL

1. In Paynow dashboard, go to **Settings** > **Webhooks**
2. Enter webhook URL: `https://YOUR_PROJECT.supabase.co/functions/v1/paynow-webhook`
3. Select events to receive:
   - Payment Created
   - Payment Paid
   - Payment Cancelled
   - Payment Failed
4. Save configuration

### Step 3: Test Webhook

1. Use Paynow test/sandbox environment
2. Make a test payment
3. Verify webhook is received
4. Check webhook logs in Supabase

---

## Webhook Security

### Hash Verification

Paynow includes a hash in webhook payloads for verification:

```javascript
// Verify hash
const hashString = Object.keys(params)
  .filter(key => key !== 'hash')
  .sort()
  .map(key => `${key}=${params[key]}`)
  .join('&') + integrationKey;

const calculatedHash = crypto
  .createHash('sha512')
  .update(hashString)
  .digest('hex')
  .toUpperCase();

if (hash !== calculatedHash) {
  return res.status(400).json({ error: 'Invalid hash' });
}
```

### Best Practices

1. **Always Verify Hash**: Never process unverified webhooks
2. **Use HTTPS**: Webhook URL must use HTTPS
3. **Store Keys Securely**: Never commit keys to code
4. **Log All Webhooks**: Keep audit trail
5. **Idempotent Processing**: Handle duplicate webhooks

---

## Webhook Payload

### Payment Paid Event

```javascript
{
  reference: "SUB-1234567890",
  paynowreference: "PAYNOW-REF-123",
  amount: "99.00",
  status: "Paid",
  pollurl: "https://www.paynow.co.zw/Interface/CheckPayment/...",
  hash: "ABC123..."
}
```

### Payment Cancelled Event

```javascript
{
  reference: "SUB-1234567890",
  paynowreference: null,
  amount: "99.00",
  status: "Cancelled",
  pollurl: null,
  hash: "ABC123..."
}
```

---

## Webhook Processing

### Edge Function Handler

The webhook handler (`supabase/functions/paynow-webhook/index.ts`) processes:

1. **Hash Verification**: Verify webhook authenticity
2. **Status Update**: Update `payment_transactions` table
3. **Subscription Creation**: Create subscription if payment successful
4. **Project Update**: Update project mode if upgrading from trial
5. **Response**: Return success to Paynow

### Processing Flow

```
1. Receive Webhook
   ↓
2. Verify Hash
   ↓
3. Update Payment Transaction
   ↓
4. If Status = "Paid":
   - Create Subscription
   - Update Project
   - Send Confirmation Email
   ↓
5. Return Success Response
```

---

## Testing Webhooks

### Using Paynow Sandbox

1. **Enable Sandbox**: Use Paynow test environment
2. **Test Payments**: Make test payments
3. **Monitor Webhooks**: Check webhook logs
4. **Verify Processing**: Confirm database updates

### Manual Testing

1. **Use ngrok**: Expose local endpoint
2. **Update Paynow URL**: Point to ngrok URL
3. **Make Test Payment**: Trigger webhook
4. **Check Logs**: Verify webhook received

### Webhook Testing Tools

- **Postman**: Send test webhook payloads
- **curl**: Command-line testing
- **Paynow Test Mode**: Official test environment

---

## Error Handling

### Common Errors

#### Invalid Hash

**Cause**: Hash verification failed

**Solution**: 
- Check Integration Key is correct
- Verify hash calculation logic
- Ensure parameters are sorted correctly

#### Duplicate Webhook

**Cause**: Paynow may send duplicate webhooks

**Solution**:
- Check if payment already processed
- Use idempotent processing
- Log duplicate attempts

#### Network Timeout

**Cause**: Webhook endpoint not responding

**Solution**:
- Ensure endpoint is accessible
- Check server logs
- Verify HTTPS is working
- Increase timeout if needed

---

## Monitoring

### Webhook Logs

Monitor webhook processing:

```sql
SELECT * FROM payment_transactions
WHERE payment_provider = 'paynow'
ORDER BY created_at DESC
LIMIT 100;
```

### Success Rate

Track webhook success:

```sql
SELECT 
  status,
  COUNT(*) as count,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage
FROM payment_transactions
WHERE payment_provider = 'paynow'
GROUP BY status;
```

### Failed Webhooks

Check for failed processing:

```sql
SELECT * FROM payment_transactions
WHERE payment_provider = 'paynow'
AND status = 'failed'
ORDER BY created_at DESC;
```

---

## Environment Variables

### Required Variables

```bash
# Paynow Configuration
PAYNOW_INTEGRATION_ID=your_integration_id
PAYNOW_INTEGRATION_KEY=your_integration_key
PAYNOW_URL=https://www.paynow.co.zw/interface/initiatetransaction

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Application URLs
SITE_URL=https://yourdomain.com
PAYNOW_RETURN_URL=https://yourdomain.com/checkout/success
PAYNOW_RESULT_URL=https://yourdomain.com/api/webhooks/paynow
```

### Setting in Supabase

1. Go to **Project Settings** > **Edge Functions**
2. Add environment variables
3. Redeploy Edge Functions
4. Verify variables are set

---

## Troubleshooting

### Issue: Webhook not received

**Check**:
1. Webhook URL is correct in Paynow
2. Endpoint is accessible (HTTPS)
3. Paynow is sending webhooks
4. Check Paynow webhook logs

### Issue: Hash verification fails

**Check**:
1. Integration Key is correct
2. Hash calculation matches Paynow format
3. Parameters are sorted correctly
4. No extra whitespace in values

### Issue: Subscription not created

**Check**:
1. Webhook status is "Paid"
2. Payment transaction exists
3. Metadata contains required fields
4. Database constraints are met
5. Check Edge Function logs

---

## Best Practices

### Security

1. **Always Verify Hash**: Never skip verification
2. **Use HTTPS**: Required for webhooks
3. **Store Keys Securely**: Use environment variables
4. **Log Everything**: Keep audit trail
5. **Rate Limiting**: Prevent abuse

### Reliability

1. **Idempotent Processing**: Handle duplicates
2. **Error Handling**: Graceful failure handling
3. **Retry Logic**: Retry failed processing
4. **Monitoring**: Track success rates
5. **Alerting**: Notify on failures

### Performance

1. **Async Processing**: Don't block webhook response
2. **Database Indexes**: Optimize queries
3. **Caching**: Cache frequently accessed data
4. **Connection Pooling**: Reuse database connections

---

## Support

For webhook issues:
- **Paynow Support**: support@paynow.co.zw
- **Technical Support**: devops@yourdomain.com
- **Documentation**: [Paynow API Docs](https://www.paynow.co.zw/support/api)

---

**Last Updated**: 2025-01-XX

