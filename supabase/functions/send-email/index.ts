/**
 * Send Email Edge Function
 * Handles sending transactional emails via configured email service
 * Supports Resend, SendGrid, and SMTP providers
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const emailData: EmailRequest = await req.json();

    // Validate required fields
    if (!emailData.to || !emailData.subject || !emailData.html) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: to, subject, html' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get active email configuration
    const { data: config, error: configError } = await supabase
      .from('email_configurations')
      .select('*')
      .eq('is_active', true)
      .eq('is_deleted', false)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (configError || !config) {
      console.warn('No active email configuration found');
      
      // Log email attempt even without config
      const { data: logData, error: logError } = await supabase
        .from('email_logs')
        .insert({
          to_email: emailData.to,
          subject: emailData.subject,
          body_html: emailData.html,
          body_text: emailData.text || emailData.html.replace(/<[^>]*>/g, ''),
          template_id: emailData.template_id || null,
          delivery_status: 'pending',
          error_message: 'No active email configuration found',
        })
        .select()
        .single();

      return new Response(
        JSON.stringify({
          success: false,
          error: 'No active email configuration found. Please configure an email service.',
          warning: true,
          email_log_id: logData?.id || null,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send email based on provider
    let sendResult;
    const fromEmail = emailData.from || config.from_email;
    const fromName = emailData.from_name || config.from_name || 'Project Nidus';

    switch (config.service_provider?.toLowerCase()) {
      case 'resend':
        sendResult = await sendViaResend(
          emailData.to,
          emailData.subject,
          emailData.html,
          emailData.text,
          fromEmail,
          fromName,
          config.api_key
        );
        break;

      case 'sendgrid':
        sendResult = await sendViaSendGrid(
          emailData.to,
          emailData.subject,
          emailData.html,
          emailData.text,
          fromEmail,
          fromName,
          config.api_key
        );
        break;

      case 'smtp':
        // SMTP requires server-side implementation
        sendResult = {
          success: false,
          error: 'SMTP sending requires server-side implementation',
          warning: true,
        };
        break;

      default:
        sendResult = {
          success: false,
          error: `Unsupported email provider: ${config.service_provider}`,
          warning: true,
        };
    }

    // Log email result
    const { data: logData, error: logError } = await supabase
      .from('email_logs')
      .insert({
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
      })
      .select()
      .single();

    if (logError) {
      console.error('Error logging email:', logError);
    }

    // Return response
    if (sendResult.success) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Email sent successfully',
          message_id: sendResult.messageId,
          email_log_id: logData?.id || null,
          timestamp: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: sendResult.error || 'Failed to send email',
          warning: sendResult.warning || false,
          email_log_id: logData?.id || null,
          timestamp: new Date().toISOString(),
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in send-email function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString(),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Send email via Resend API
 */
async function sendViaResend(
  to: string,
  subject: string,
  html: string,
  text: string | undefined,
  fromEmail: string,
  fromName: string,
  apiKey: string | null
): Promise<{ success: boolean; messageId?: string; error?: string; warning?: boolean }> {
  if (!apiKey) {
    return {
      success: false,
      error: 'Resend API key not configured',
      warning: true,
    };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [to],
        subject: subject,
        html: html,
        text: text || html.replace(/<[^>]*>/g, ''),
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
      throw new Error(error.message || `Resend API error: ${response.status}`);
    }

    const result = await response.json();
    return {
      success: true,
      messageId: result.id || null,
    };
  } catch (error) {
    console.error('Resend email sending failed:', error);
    return {
      success: false,
      error: error.message || 'Failed to send email via Resend',
    };
  }
}

/**
 * Send email via SendGrid API
 */
async function sendViaSendGrid(
  to: string,
  subject: string,
  html: string,
  text: string | undefined,
  fromEmail: string,
  fromName: string,
  apiKey: string | null
): Promise<{ success: boolean; messageId?: string; error?: string; warning?: boolean }> {
  if (!apiKey) {
    return {
      success: false,
      error: 'SendGrid API key not configured',
      warning: true,
    };
  }

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: to }],
          },
        ],
        from: {
          email: fromEmail,
          name: fromName,
        },
        subject: subject,
        content: [
          {
            type: 'text/html',
            value: html,
          },
          ...(text
            ? [
                {
                  type: 'text/plain',
                  value: text,
                },
              ]
            : []),
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`SendGrid API error: ${response.status} - ${error}`);
    }

    // SendGrid returns 202 Accepted with message ID in headers
    const messageId = response.headers.get('x-message-id');
    return {
      success: true,
      messageId: messageId || null,
    };
  } catch (error) {
    console.error('SendGrid email sending failed:', error);
    return {
      success: false,
      error: error.message || 'Failed to send email via SendGrid',
    };
  }
}

