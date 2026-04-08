/**
 * Daily Draft Expiry Check Edge Function
 * Runs daily to expire old drafts and send warning notifications
 *
 * Schedule: Daily at midnight UTC
 * Can be triggered manually or via Supabase Cron
 *
 * @version v201
 * @created 2026-01-31
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
    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Running draft expiry check...');

    const results = {
      expiredPlatform: 0,
      expiredSimulator: 0,
      warningsSent: 0,
      errors: [] as string[],
    };

    // ========================================
    // PLATFORM DRAFTS (public schema)
    // ========================================

    // Expire old drafts using the database function
    const { data: platformExpired, error: platformError } = await supabase
      .rpc('expire_old_drafts');

    if (platformError) {
      console.error('Error expiring platform drafts:', platformError);
      results.errors.push(`Platform expire error: ${platformError.message}`);
    } else {
      results.expiredPlatform = platformExpired || 0;
      console.log(`Expired ${platformExpired} platform drafts`);
    }

    // Send warning notifications for drafts expiring soon
    const { data: expiringDrafts, error: warningError } = await supabase
      .rpc('get_expiring_drafts', { p_warning_days: 3 });

    if (warningError) {
      console.error('Error getting expiring drafts:', warningError);
      results.errors.push(`Warning fetch error: ${warningError.message}`);
    } else if (expiringDrafts && expiringDrafts.length > 0) {
      console.log(`Found ${expiringDrafts.length} drafts expiring soon`);

      for (const draft of expiringDrafts) {
        try {
          await sendDraftExpiryWarning(supabase, draft);
          results.warningsSent++;
        } catch (error) {
          console.error(`Error sending warning for draft ${draft.draft_id}:`, error);
          results.errors.push(`Warning send error: ${error.message}`);
        }
      }
    }

    // ========================================
    // SIMULATOR DRAFTS (sim schema)
    // ========================================

    try {
      const { data: simExpired, error: simError } = await supabase
        .rpc('sim.expire_old_drafts');

      if (simError) {
        console.error('Error expiring simulator drafts:', simError);
        results.errors.push(`Simulator expire error: ${simError.message}`);
      } else {
        results.expiredSimulator = simExpired || 0;
        console.log(`Expired ${simExpired} simulator drafts`);
      }
    } catch (simErr) {
      // Simulator schema may not exist
      console.log('Simulator draft expiry skipped (schema may not exist)');
    }

    // ========================================
    // CLEANUP OLD DELETED DRAFTS (over 30 days)
    // ========================================

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { error: cleanupError } = await supabase
      .from('draft_queue')
      .delete()
      .eq('is_deleted', true)
      .lt('deleted_at', thirtyDaysAgo.toISOString());

    if (cleanupError) {
      console.error('Error cleaning up old drafts:', cleanupError);
      results.errors.push(`Cleanup error: ${cleanupError.message}`);
    }

    console.log(`Draft expiry check complete. Expired ${results.expiredPlatform + results.expiredSimulator} drafts, sent ${results.warningsSent} warnings.`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Draft expiry check completed',
        results,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in draft expiry check:', error);
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
 * Send draft expiry warning notification
 * Creates a notification in the database and optionally sends email
 */
async function sendDraftExpiryWarning(supabase: any, draft: any) {
  const { draft_id, user_id, entity_type, entity_title, expires_at, days_remaining } = draft;

  // Create notification in database
  try {
    const { error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id,
        type: 'draft_expiry_warning',
        title: 'Draft Expiring Soon',
        message: `Your ${entity_type.replace('_', ' ')} draft "${entity_title || 'Untitled'}" will expire in ${days_remaining} day${days_remaining > 1 ? 's' : ''}. Resume editing or it will be automatically removed.`,
        data: {
          draft_id,
          entity_type,
          entity_title,
          expires_at,
          days_remaining
        },
        is_read: false,
        created_at: new Date().toISOString()
      });

    if (notifError) {
      console.warn('Could not create notification:', notifError.message);
      // Continue even if notification fails
    }
  } catch (err) {
    console.warn('Notification table may not exist:', err);
  }

  // Get user email for email notification
  const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(user_id);

  if (userError || !user) {
    console.warn(`Could not get user ${user_id} for email notification`);
    return;
  }

  // Send email notification (optional - log if email service not configured)
  const siteUrl = Deno.env.get('SITE_URL') || 'https://yourdomain.com';
  const resumeLink = `${siteUrl}/app/${entity_type.replace('_', '-')}s/on-hold`;

  try {
    const emailFunctionUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (emailFunctionUrl && anonKey) {
      await fetch(emailFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`
        },
        body: JSON.stringify({
          to: user.email,
          subject: `Draft Expiring: ${entity_title || entity_type}`,
          template: 'draft-expiry-warning',
          data: {
            userName: user.user_metadata?.full_name || 'User',
            entityType: entity_type.replace('_', ' '),
            entityTitle: entity_title || 'Untitled',
            daysRemaining: days_remaining,
            expiryDate: new Date(expires_at).toLocaleDateString(),
            resumeLink
          }
        })
      });
    } else {
      console.log(`[EMAIL] Draft expiry warning to ${user.email} for ${entity_title || entity_type}`);
    }
  } catch (emailError) {
    console.warn('Error sending draft expiry email:', emailError);
    // Don't throw - notification in DB is sufficient
  }
}
