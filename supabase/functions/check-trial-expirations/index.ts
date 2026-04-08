/**
 * Daily Trial Expiry Check Edge Function
 * Runs daily to check for expiring trials, send reminders, and lock expired projects
 * 
 * Schedule: Daily at midnight UTC
 * Can be triggered manually or via Supabase Cron
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

    console.log('Running trial expiry check...');

    const results = {
      expiring3Days: 0,
      expiring1Day: 0,
      expired: 0,
      errors: [] as string[],
    };

    // Get trials expiring in 3 days (for first warning)
    const { data: expiring3Days, error: error3Days } = await supabase
      .rpc('get_expiring_trials', { days_threshold: 3 });

    if (error3Days) {
      console.error('Error getting expiring trials (3 days):', error3Days);
      results.errors.push(`Error getting 3-day expiring trials: ${error3Days.message}`);
    } else if (expiring3Days) {
      for (const trial of expiring3Days) {
        try {
          // Send 3-day warning email (placeholder - implement email service)
          await sendTrialExpiryWarning(supabase, trial, 3);

          // Mark reminder sent
          await supabase
            .from('trial_project_tracking')
            .update({ reminder_3_days_sent: true })
            .eq('project_id', trial.project_id);

          results.expiring3Days++;
        } catch (error) {
          console.error(`Error processing 3-day warning for trial ${trial.project_id}:`, error);
          results.errors.push(`Error processing trial ${trial.project_id}: ${error.message}`);
        }
      }
    }

    // Get trials expiring in 1 day (for final warning)
    const { data: expiring1Day, error: error1Day } = await supabase
      .rpc('get_expiring_trials', { days_threshold: 1 });

    if (error1Day) {
      console.error('Error getting expiring trials (1 day):', error1Day);
      results.errors.push(`Error getting 1-day expiring trials: ${error1Day.message}`);
    } else if (expiring1Day) {
      for (const trial of expiring1Day) {
        try {
          // Send 1-day warning email
          await sendTrialExpiryWarning(supabase, trial, 1);

          // Mark reminder sent
          await supabase
            .from('trial_project_tracking')
            .update({ reminder_1_day_sent: true })
            .eq('project_id', trial.project_id);

          results.expiring1Day++;
        } catch (error) {
          console.error(`Error processing 1-day warning for trial ${trial.project_id}:`, error);
          results.errors.push(`Error processing trial ${trial.project_id}: ${error.message}`);
        }
      }
    }

    // Lock expired trials (0 days remaining)
    const { data: expiredTrials, error: expiredError } = await supabase
      .from('trial_project_tracking')
      .select(`
        *,
        projects (
          id,
          project_name,
          account_id
        )
      `)
      .eq('status', 'active')
      .lte('trial_end_date', new Date().toISOString());

    if (expiredError) {
      console.error('Error getting expired trials:', expiredError);
      results.errors.push(`Error getting expired trials: ${expiredError.message}`);
    } else if (expiredTrials) {
      for (const trial of expiredTrials) {
        try {
          // Lock the project
          const { error: lockError } = await supabase
            .from('projects')
            .update({
              locked_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', trial.project_id);

          if (lockError) {
            throw lockError;
          }

          // Update tracking
          await supabase
            .from('trial_project_tracking')
            .update({
              status: 'expired',
              expired_at: new Date().toISOString(),
              expiry_notification_sent: true,
              updated_at: new Date().toISOString(),
            })
            .eq('project_id', trial.project_id);

          // Send expiry notification email
          await sendTrialExpiredEmail(supabase, trial);

          results.expired++;
        } catch (error) {
          console.error(`Error locking expired trial ${trial.project_id}:`, error);
          results.errors.push(`Error locking trial ${trial.project_id}: ${error.message}`);
        }
      }
    }

    console.log(`Trial expiry check complete. Processed ${results.expiring3Days + results.expiring1Day + results.expired} trials.`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Trial expiry check completed',
        results,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in trial expiry check:', error);
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
 * Send trial expiry warning email
 * Uses Supabase Edge Function to call email service
 */
async function sendTrialExpiryWarning(
  supabase: any,
  trial: any,
  daysRemaining: number
) {
  // Get account owner email
  const { data: account } = await supabase
    .from('accounts')
    .select('owner_user_id')
    .eq('id', trial.account_id)
    .single();

  if (!account) {
    throw new Error(`Account not found for trial ${trial.project_id}`);
  }

  // Get user email from auth
  const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(
    account.owner_user_id
  );

  if (userError || !user) {
    throw new Error(`User not found for account ${trial.account_id}`);
  }

  // Calculate expiry date
  const expiryDate = new Date(trial.trial_end_date);
  const formattedDate = expiryDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Call email service Edge Function (if available)
  // Otherwise, log for manual sending
  const siteUrl = Deno.env.get('SITE_URL') || 'https://yourdomain.com';
  const upgradeLink = `${siteUrl}/upgrade/trial?project_id=${trial.project_id}`;

  try {
    // Try to call email service Edge Function
    const emailFunctionUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-trial-email`;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (emailFunctionUrl && anonKey) {
      await fetch(emailFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`
        },
        body: JSON.stringify({
          type: daysRemaining === 1 ? 'warning-1day' : 'warning-3days',
          to: user.email,
          projectName: trial.project_name || 'Your project',
          daysRemaining,
          expiryDate: formattedDate,
          projectId: trial.project_id,
          upgradeLink
        })
      });
    } else {
      // Log for manual sending if Edge Function not available
      console.log(
        `[EMAIL] ${daysRemaining}-day warning to ${user.email} for project ${trial.project_name || trial.project_id}`
      );
      console.log(`Upgrade link: ${upgradeLink}`);
    }
  } catch (emailError) {
    console.error(`Error sending ${daysRemaining}-day warning email:`, emailError);
    // Don't throw - continue processing other trials
  }
}

/**
 * Send trial expired email
 * Uses Supabase Edge Function to call email service
 */
async function sendTrialExpiredEmail(supabase: any, trial: any) {
  // Get account owner email
  const { data: account } = await supabase
    .from('accounts')
    .select('owner_user_id')
    .eq('id', trial.account_id)
    .single();

  if (!account) {
    throw new Error(`Account not found for trial ${trial.project_id}`);
  }

  // Get user email from auth
  const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(
    account.owner_user_id
  );

  if (userError || !user) {
    throw new Error(`User not found for account ${trial.account_id}`);
  }

  const siteUrl = Deno.env.get('SITE_URL') || 'https://yourdomain.com';
  const upgradeLink = `${siteUrl}/upgrade/trial?project_id=${trial.project_id}`;
  const projectName = trial.projects?.project_name || trial.project_name || 'Your project';

  try {
    // Try to call email service Edge Function
    const emailFunctionUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-trial-email`;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (emailFunctionUrl && anonKey) {
      await fetch(emailFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`
        },
        body: JSON.stringify({
          type: 'expired',
          to: user.email,
          projectName,
          projectId: trial.project_id,
          upgradeLink
        })
      });
    } else {
      // Log for manual sending if Edge Function not available
      console.log(
        `[EMAIL] Expiry notification to ${user.email} for project ${projectName}`
      );
      console.log(`Upgrade link: ${upgradeLink}`);
    }
  } catch (emailError) {
    console.error('Error sending expiry notification email:', emailError);
    // Don't throw - continue processing
  }
}

