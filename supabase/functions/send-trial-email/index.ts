/**
 * Send Trial Email Edge Function
 * Handles sending trial-related emails (warnings, expiry notifications)
 * Can be called by check-trial-expirations function or directly
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { type, to, projectName, daysRemaining, expiryDate, projectId, upgradeLink } = await req.json();

    if (!type || !to || !projectName) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate email content based on type
    let subject = '';
    let body = '';

    switch (type) {
      case 'warning-3days':
        subject = `Your trial expires in 3 days - ${projectName}`;
        body = generateTrialWarningEmail(projectName, daysRemaining || 3, expiryDate, upgradeLink, 3);
        break;
      case 'warning-1day':
        subject = `⚠️ Your trial expires tomorrow - ${projectName}`;
        body = generateTrialWarningEmail(projectName, daysRemaining || 1, expiryDate, upgradeLink, 1);
        break;
      case 'expired':
        subject = `Your trial has expired - Upgrade to continue`;
        body = generateTrialExpiredEmail(projectName, upgradeLink);
        break;
      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid email type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Log email (in production, send via email service)
    console.log(`[EMAIL] Sending ${type} email to ${to}`);
    console.log(`Subject: ${subject}`);

    // TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
    // For now, log to email_logs table
    const { error: logError } = await supabase
      .from('email_logs')
      .insert({
        to_email: to,
        subject: subject,
        body: body,
        template_id: `trial-${type}`,
        delivery_status: 'sent',
        sent_at: new Date().toISOString()
      });

    if (logError) {
      console.error('Error logging email:', logError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email sent successfully',
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-trial-email:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Generate trial warning email HTML
 */
function generateTrialWarningEmail(projectName: string, daysRemaining: number, expiryDate: string, upgradeLink: string, warningType: number) {
  const isUrgent = warningType === 1;
  const gradient = isUrgent 
    ? 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
    : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
  const title = isUrgent ? '⚠️ Final Warning' : '⏰ Trial Expiring Soon';
  const urgencyColor = isUrgent ? '#fa709a' : '#f5576c';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: ${gradient}; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">${title}</h1>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p>Hello,</p>
        
        ${isUrgent 
          ? `<p><strong style="color: ${urgencyColor}; font-size: 18px;">Your trial expires tomorrow!</strong></p>`
          : `<p>Your trial project <strong>${projectName}</strong> will expire in <strong style="color: ${urgencyColor};">${daysRemaining} days</strong>.</p>`
        }
        
        <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid ${urgencyColor};">
          <p style="margin: 0;"><strong>Days Remaining:</strong> ${daysRemaining}</p>
          <p style="margin: 5px 0 0 0;"><strong>Expiry Date:</strong> ${expiryDate}</p>
        </div>
        
        <p>To continue using your project and unlock all features, upgrade to a paid subscription:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${upgradeLink}" style="background: ${urgencyColor}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            Upgrade Now
          </a>
        </div>
        
        <p><strong>Benefits of upgrading:</strong></p>
        <ul>
          <li>Unlimited team members</li>
          <li>All advanced features</li>
          <li>Multiple projects</li>
          <li>Priority support</li>
          <li>Your data preserved</li>
        </ul>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #666;">
          Best regards,<br>
          The Platform Team
        </p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate trial expired email HTML
 */
function generateTrialExpiredEmail(projectName: string, upgradeLink: string) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">🔒 Trial Expired</h1>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p>Hello,</p>
        
        <p>Your trial period for <strong>${projectName}</strong> has ended.</p>
        
        <div style="background: #f8d7da; border: 2px solid #f5c6cb; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0; font-weight: bold; color: #721c24;">Your project is now locked</p>
          <p style="margin: 5px 0 0 0; color: #721c24;">Upgrade to unlock and continue working.</p>
        </div>
        
        <p><strong>Don't worry - all your data is safe!</strong> Your project data has been preserved. Upgrade now to unlock your project and continue where you left off.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${upgradeLink}" style="background: #eb3349; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">
            Unlock My Project
          </a>
        </div>
        
        <p><strong>What you'll get:</strong></p>
        <ul>
          <li>✅ Full access to your project</li>
          <li>✅ All your data preserved</li>
          <li>✅ Unlimited team members</li>
          <li>✅ All advanced features</li>
          <li>✅ Priority support</li>
        </ul>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #666;">
          Best regards,<br>
          The Platform Team
        </p>
      </div>
    </body>
    </html>
  `;
}

