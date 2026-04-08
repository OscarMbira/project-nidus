-- ============================================================================
-- Schedule Trial Expiry Check Cron Job
-- Version: v118
-- Description: Sets up Supabase Cron to run trial expiry check daily
-- Author: Development Team
-- Date: 2025-01-XX
-- ============================================================================

-- Purpose:
-- This migration sets up a cron job to automatically check for expiring trials
-- and send reminders/lock expired projects daily at midnight UTC.

-- Prerequisites:
-- - pg_cron extension must be enabled in Supabase
-- - Edge Function 'check-trial-expirations' must be deployed
-- - SUPABASE_URL and SUPABASE_ANON_KEY must be available

-- ============================================================================
-- CRON JOB: Daily Trial Expiry Check
-- ============================================================================

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Drop existing cron job if it exists (for idempotency)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-trial-expiry-check') THEN
    PERFORM cron.unschedule('daily-trial-expiry-check');
  END IF;
END $$;

-- Create database function to check trial expirations
-- This function can be called directly by cron or via Edge Function
CREATE OR REPLACE FUNCTION check_trial_expirations_cron()
RETURNS void AS $$
DECLARE
  expiring_3_days RECORD;
  expiring_1_day RECORD;
  expired_trial RECORD;
BEGIN
  -- Get trials expiring in 3 days
  FOR expiring_3_days IN
    SELECT tpt.*, p.project_name, p.account_id, a.owner_user_id
    FROM trial_project_tracking tpt
    INNER JOIN projects p ON tpt.project_id = p.id
    INNER JOIN accounts a ON p.account_id = a.id
    WHERE tpt.status = 'active'
    AND tpt.reminder_3_days_sent = FALSE
    AND tpt.trial_end_date BETWEEN NOW() AND NOW() + INTERVAL '3 days'
    AND tpt.trial_end_date > NOW() + INTERVAL '2 days' -- More than 2 days remaining
  LOOP
    -- Mark reminder sent (email sending would be handled by Edge Function or email service)
    UPDATE trial_project_tracking
    SET reminder_3_days_sent = TRUE,
        updated_at = NOW()
    WHERE project_id = expiring_3_days.project_id;
    
    -- Log the action (in production, trigger email notification here)
    RAISE NOTICE '3-day reminder marked for trial project: %', expiring_3_days.project_id;
  END LOOP;

  -- Get trials expiring in 1 day
  FOR expiring_1_day IN
    SELECT tpt.*, p.project_name, p.account_id, a.owner_user_id
    FROM trial_project_tracking tpt
    INNER JOIN projects p ON tpt.project_id = p.id
    INNER JOIN accounts a ON p.account_id = a.id
    WHERE tpt.status = 'active'
    AND tpt.reminder_1_day_sent = FALSE
    AND tpt.trial_end_date BETWEEN NOW() AND NOW() + INTERVAL '1 day'
    AND tpt.trial_end_date > NOW() -- More than 0 days remaining
  LOOP
    -- Mark reminder sent
    UPDATE trial_project_tracking
    SET reminder_1_day_sent = TRUE,
        updated_at = NOW()
    WHERE project_id = expiring_1_day.project_id;
    
    -- Log the action
    RAISE NOTICE '1-day reminder marked for trial project: %', expiring_1_day.project_id;
  END LOOP;

  -- Lock expired trials
  FOR expired_trial IN
    SELECT tpt.*, p.id as project_id, p.project_name, p.account_id, a.owner_user_id
    FROM trial_project_tracking tpt
    INNER JOIN projects p ON tpt.project_id = p.id
    INNER JOIN accounts a ON p.account_id = a.id
    WHERE tpt.status = 'active'
    AND tpt.trial_end_date <= NOW()
    AND p.locked_at IS NULL
  LOOP
    -- Lock the project
    UPDATE projects
    SET locked_at = NOW(),
        updated_at = NOW()
    WHERE id = expired_trial.project_id;

    -- Update tracking
    UPDATE trial_project_tracking
    SET 
      status = 'expired',
      expired_at = NOW(),
      expiry_notification_sent = TRUE,
      updated_at = NOW()
    WHERE project_id = expired_trial.project_id;
    
    -- Log the action
    RAISE NOTICE 'Trial expired and project locked: %', expired_trial.project_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule the database function to run daily at midnight UTC
-- Using explicit parameter types to avoid ambiguity
SELECT cron.schedule(
  job_name := 'daily-trial-expiry-check',
  schedule := '0 0 * * *', -- Every day at midnight UTC
  command := 'SELECT check_trial_expirations_cron();'
);

-- Alternative: If you prefer to call the Supabase Edge Function via HTTP
-- (Requires pg_net extension and proper configuration)
-- Uncomment and configure if you want to use Edge Function instead:
/*
-- Enable pg_net extension for HTTP calls
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create function to call Edge Function
CREATE OR REPLACE FUNCTION call_trial_expiry_edge_function()
RETURNS void AS $$
DECLARE
  supabase_url TEXT;
  supabase_anon_key TEXT;
  response_id BIGINT;
BEGIN
  -- Get Supabase URL and anon key from environment or settings
  -- Note: These should be set via Supabase dashboard or environment variables
  supabase_url := current_setting('app.settings.supabase_url', true);
  supabase_anon_key := current_setting('app.settings.supabase_anon_key', true);
  
  -- If not set, use default (you should configure these)
  IF supabase_url IS NULL THEN
    supabase_url := 'https://YOUR_PROJECT.supabase.co';
  END IF;
  
  IF supabase_anon_key IS NULL THEN
    RAISE EXCEPTION 'Supabase anon key not configured';
  END IF;

  -- Call Edge Function
  SELECT net.http_post(
    url := supabase_url || '/functions/v1/check-trial-expirations',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || supabase_anon_key
    ),
    body := '{}'::jsonb
  ) INTO response_id;
  
  RAISE NOTICE 'Edge Function called with request_id: %', response_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule Edge Function version (uncomment to use)
-- SELECT cron.schedule(
--   job_name := 'daily-trial-expiry-check-edge',
--   schedule := '0 0 * * *',
--   command := 'SELECT call_trial_expiry_edge_function();'
-- );
*/

-- Add comments
COMMENT ON FUNCTION check_trial_expirations_cron() IS 'Checks for expiring trials, sends reminders, and locks expired projects. Called daily by cron job.';

-- Note: To manually trigger the cron job for testing:
-- SELECT cron.run_job('daily-trial-expiry-check');

-- Note: To view cron job status:
-- SELECT * FROM cron.job WHERE jobname = 'daily-trial-expiry-check';

-- Note: To view cron job execution history:
-- SELECT * FROM cron.job_run_details WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'daily-trial-expiry-check');

