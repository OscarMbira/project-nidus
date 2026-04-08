# Send Email Edge Function

This Edge Function handles sending transactional emails via configured email service providers (Resend, SendGrid, SMTP).

## Endpoint

`POST /functions/v1/send-email`

## Authentication

Requires Supabase anon key or service role key in the Authorization header.

## Request Body

```json
{
  "to": "user@example.com",
  "subject": "Verify Your Organisation",
  "html": "<html>...</html>",
  "text": "Plain text version (optional)",
  "from": "noreply@projectnidus.com",
  "from_name": "Project Nidus",
  "template_id": "uuid (optional)"
}
```

## Response

### Success
```json
{
  "success": true,
  "message": "Email sent successfully",
  "message_id": "msg_xxx",
  "email_log_id": "uuid",
  "timestamp": "2025-01-XX..."
}
```

### Error
```json
{
  "success": false,
  "error": "Error message",
  "warning": true,
  "email_log_id": "uuid",
  "timestamp": "2025-01-XX..."
}
```

## Email Configuration

The function automatically retrieves the active email configuration from the `email_configurations` table. It supports:

- **Resend**: Requires `api_key` in configuration
- **SendGrid**: Requires `api_key` in configuration
- **SMTP**: Requires server-side implementation (not yet supported)

## Deployment

```bash
# Deploy the function
supabase functions deploy send-email

# Test locally
supabase functions serve send-email
```

## Environment Variables

No additional environment variables required. The function uses:
- `SUPABASE_URL` (automatically available)
- `SUPABASE_SERVICE_ROLE_KEY` (automatically available)

## Usage from Client

```javascript
const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${anonKey}`,
    'apikey': anonKey
  },
  body: JSON.stringify({
    to: 'user@example.com',
    subject: 'Test Email',
    html: '<h1>Hello</h1>',
    from: 'noreply@projectnidus.com',
    from_name: 'Project Nidus'
  })
});

const result = await response.json();
```

## Email Logging

All email attempts are automatically logged to the `email_logs` table with:
- Delivery status (sent/failed/pending)
- Message ID (if available)
- Error messages (if failed)
- Timestamp

