/**
 * Send Email Edge Function
 * Handles sending transactional emails via configured email service.
 * Supports Resend, SendGrid, and SMTP providers.
 *
 * The email_configurations table is queried via a direct fetch to the
 * PostgREST REST API (not through the Supabase JS client) so the service
 * role key is always sent in the correct headers without any client-library
 * auth-session interference.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// nodemailer is imported dynamically inside sendViaSMTP only.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  from_name?: string;
  template_id?: string;
  project_type_id?: string;
}

interface SenderProfileRow {
  from_email: string;
  from_name: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error: missing Supabase credentials.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Service-role headers ─────────────────────────────────────────────────
    // PostgREST requires BOTH headers:
    //   apikey        → identifies the project (public anon or service key)
    //   Authorization → determines the database role (service_role bypasses RLS)
    const srHeaders = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // ── Parse and validate request body ─────────────────────────────────────
    const emailData: EmailRequest = await req.json();

    if (!emailData.to || !emailData.subject || !emailData.html) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: to, subject, html' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Fetch active email configuration via direct PostgREST call ───────────
    // Using fetch() instead of the Supabase JS client eliminates all client
    // auth-session issues. The service role key in Authorization bypasses RLS.
    const configUrl =
      `${supabaseUrl}/rest/v1/email_configurations` +
      `?is_active=eq.true&order=is_default.desc,updated_at.desc&limit=1`;

    const configRes = await fetch(configUrl, { headers: srHeaders });

    if (!configRes.ok) {
      const errText = await configRes.text();
      console.error('email_configurations query failed:', configRes.status, errText);
      return new Response(
        JSON.stringify({ success: false, error: `Database query failed (${configRes.status}): ${errText}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const configs = await configRes.json();
    const config = Array.isArray(configs) ? configs[0] : null;

    if (!config) {
      console.warn('No active email configuration found in email_configurations.');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No active email configuration found. Please open Email Settings, enter your Resend API key, and click Save Configuration.',
          warning: true,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Resolve sender profile (project type → default → global config) ───
    const resolvedSender = await resolveSenderProfile(
      supabaseUrl,
      srHeaders,
      config.id,
      emailData.project_type_id,
      config.from_email,
      config.from_name || 'Project Nidus',
    );

    const fromEmail = emailData.from || resolvedSender.from_email;
    const fromName  = emailData.from_name || resolvedSender.from_name;

    let sendResult: { success: boolean; messageId?: string; error?: string; warning?: boolean };

    switch (config.service_provider?.toLowerCase()) {
      case 'resend':
        sendResult = await sendViaResend(
          emailData.to, emailData.subject, emailData.html, emailData.text,
          fromEmail, fromName, config.api_key
        );
        break;

      case 'sendgrid':
        sendResult = await sendViaSendGrid(
          emailData.to, emailData.subject, emailData.html, emailData.text,
          fromEmail, fromName, config.api_key
        );
        break;

      case 'smtp':
        sendResult = await sendViaSMTP(
          emailData.to, emailData.subject, emailData.html, emailData.text,
          fromEmail, fromName, config.smtp_config
        );
        break;

      default:
        sendResult = {
          success: false,
          error: `Unsupported email provider: ${config.service_provider}`,
          warning: true,
        };
    }

    // ── Log result to email_logs (best-effort, non-blocking) ─────────────────
    const logPayload = {
      email_config_id: config.id,
      to_email: emailData.to,
      subject: emailData.subject,
      body_html: emailData.html,
      body_text: emailData.text || emailData.html.replace(/<[^>]*>/g, ''),
      template_id: emailData.template_id || null,
      delivery_status: sendResult.success ? 'sent' : 'failed',
      sent_at: sendResult.success ? new Date().toISOString() : null,
      message_id: sendResult.messageId || null,
      error_message: sendResult.success ? null : (sendResult.error || 'Failed to send email'),
    };

    fetch(`${supabaseUrl}/rest/v1/email_logs`, {
      method: 'POST',
      headers: srHeaders,
      body: JSON.stringify(logPayload),
    }).catch((e) => console.error('email_logs insert failed (non-critical):', e));

    // ── Return result ────────────────────────────────────────────────────────
    if (sendResult.success) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Email sent successfully',
          message_id: sendResult.messageId ?? null,
          timestamp: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: sendResult.error || 'Failed to send email',
        warning: sendResult.warning ?? false,
        timestamp: new Date().toISOString(),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unhandled error in send-email:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Pick sender identity from email_sender_profiles, then fall back to global config.
 */
async function resolveSenderProfile(
  supabaseUrl: string,
  headers: Record<string, string>,
  emailConfigId: string,
  projectTypeId: string | undefined,
  globalFromEmail: string,
  globalFromName: string,
): Promise<SenderProfileRow> {
  const base = `${supabaseUrl}/rest/v1/email_sender_profiles`;
  const common =
    `?email_config_id=eq.${encodeURIComponent(emailConfigId)}` +
    `&is_active=eq.true&is_deleted=eq.false&select=from_email,from_name&limit=1`;

  if (projectTypeId) {
    const typeUrl = `${base}${common}&project_type_id=eq.${encodeURIComponent(projectTypeId)}`;
    const typeRes = await fetch(typeUrl, { headers });
    if (typeRes.ok) {
      const rows = await typeRes.json();
      if (Array.isArray(rows) && rows[0]?.from_email) {
        return {
          from_email: rows[0].from_email,
          from_name: rows[0].from_name || globalFromName,
        };
      }
    }
  }

  const defaultUrl = `${base}${common}&is_default=eq.true`;
  const defaultRes = await fetch(defaultUrl, { headers });
  if (defaultRes.ok) {
    const rows = await defaultRes.json();
    if (Array.isArray(rows) && rows[0]?.from_email) {
      return {
        from_email: rows[0].from_email,
        from_name: rows[0].from_name || globalFromName,
      };
    }
  }

  return { from_email: globalFromEmail, from_name: globalFromName };
}

// ── Provider implementations ─────────────────────────────────────────────────

async function sendViaResend(
  to: string, subject: string, html: string, text: string | undefined,
  fromEmail: string, fromName: string, apiKey: string | null
): Promise<{ success: boolean; messageId?: string; error?: string; warning?: boolean }> {
  if (!apiKey) return { success: false, error: 'Resend API key not configured.', warning: true };

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [to],
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''),
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
      throw new Error(err.message || `Resend API error: ${res.status}`);
    }

    const result = await res.json();
    return { success: true, messageId: result.id ?? undefined };
  } catch (error) {
    console.error('Resend send failed:', error);
    return { success: false, error: error.message || 'Failed to send via Resend' };
  }
}

async function sendViaSMTP(
  to: string, subject: string, html: string, text: string | undefined,
  fromEmail: string, fromName: string, smtpConfig: Record<string, unknown> | null
): Promise<{ success: boolean; messageId?: string; error?: string; warning?: boolean }> {
  if (!smtpConfig?.host) {
    return { success: false, error: 'SMTP configuration is missing.', warning: true };
  }

  const host     = String(smtpConfig.host);
  const port     = Number(smtpConfig.port) || 587;
  const username = String(smtpConfig.username || '');
  const password = String(smtpConfig.password || '');
  const secure   = smtpConfig.tls === true || port === 465;

  try {
    const nodemailer = (await import('npm:nodemailer@6')).default;
    const transporter = nodemailer.createTransport({
      host, port, secure,
      auth: username ? { user: username, pass: password } : undefined,
    });
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`, to, subject, html,
      text: text || html.replace(/<[^>]*>/g, ''),
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('SMTP send failed:', error);
    return { success: false, error: error.message || 'Failed to send via SMTP' };
  }
}

async function sendViaSendGrid(
  to: string, subject: string, html: string, text: string | undefined,
  fromEmail: string, fromName: string, apiKey: string | null
): Promise<{ success: boolean; messageId?: string; error?: string; warning?: boolean }> {
  if (!apiKey) return { success: false, error: 'SendGrid API key not configured.', warning: true };

  try {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: fromEmail, name: fromName },
        subject,
        content: [
          { type: 'text/html', value: html },
          ...(text ? [{ type: 'text/plain', value: text }] : []),
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`SendGrid API error: ${res.status} — ${errText}`);
    }

    return { success: true, messageId: res.headers.get('x-message-id') ?? undefined };
  } catch (error) {
    console.error('SendGrid send failed:', error);
    return { success: false, error: error.message || 'Failed to send via SendGrid' };
  }
}
