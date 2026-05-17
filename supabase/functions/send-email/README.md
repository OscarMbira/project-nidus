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
  "from": "noreply@updates.projectastute.com",
  "from_name": "Project Nidus",
  "template_id": "uuid (optional)",
  "project_type_id": "uuid (optional — resolves sender profile)"
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

- **Resend** (recommended): `service_provider = 'resend'`, `api_key` set in **Platform → Admin → Email Settings**
- **SendGrid**: Requires `api_key` in configuration
- **SMTP**: `smtp_config` JSON (host, port, username, password, tls)

Verified sending domain for Project Astute: `updates.projectastute.com`  
Default from address: `noreply@updates.projectastute.com`

## Sender profiles

When `project_type_id` is provided (or omitted), the function looks up `email_sender_profiles`:

1. Match `project_type_id` for the active `email_configurations` row
2. Else match `is_default = true`
3. Else use `email_configurations.from_email` / `from_name`

Omit `from` / `from_name` in the request body to use profile resolution. Explicit `from` values override profiles.

Configure profiles in **Platform → Admin → Sender Profiles**.

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

