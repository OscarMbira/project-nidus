-- ============================================================================
-- v1560: Background jobs — existing jobs moved to the catalogue + the single tick (v1352 Slice 0)
-- PRD:  projectprd/v1352_background_jobs_PRD.md (D2, D4, D9)   Plan: projectplan/v1352_background_jobs_plan.md
--
-- Wrap, don't rewrite: each job keeps the function or edge function it has today and its schedule.
--   trial.expiry_check           sql      public.check_trial_expirations_cron()   0 0 * * *   (was daily-trial-expiry-check, v118)
--   lifecycle.auto_archive        sql      public.auto_archive_expired_history()   0 0 * * *   (was nidus_auto_archive_history, v658)
--   ai.retention_purge            sql      public.ai_purge_expired()               30 2 * * *  (was nidus_ai_retention_purge, v1273)
--   ai.embed                      handler  ai-embed edge function                  */2 * * * * (was nidus_ai_embed, v1284)
--   drafts.expire                 handler  expire-drafts edge function             0 0 * * *   (had no schedule)
--   testers.moratorium_expiry     handler  admin-moratorium-cron edge function     15 0 * * *  (had no schedule)
-- Framework jobs:
--   system.detect_late            sql      public.background_jobs_detect_late()    */5 * * * *
--   system.alert_email            handler  send-email (queue only, D4 alert emails)
-- Admin-owned jobs (ID capacity alerts, Admin lifecycle archive) are registered by Admin SQL v255.
--
-- Then the old pg_cron entries are removed and ONE pg_cron entry is created:
--   nidus_background_tick   * * * * *   SELECT public.run_due_background_jobs();
-- Rule 80: no other cron.schedule may be added; register jobs in public.background_jobs instead.
--
-- Before running (so AI embedding does not pause):
--   1. Deploy the background-job-worker edge function (--no-verify-jwt) and set its secret
--      BACKGROUND_JOB_SECRET to the same value as public.background_job_config.worker_secret
--      (v1559 copies it from public.ai_job_config.cron_secret when that is set).
--   2. Make sure expire-drafts and admin-moratorium-cron are deployed (the worker calls them).
-- Prerequisites: v1559, v118, v658, v1273, v1284. Requires pg_cron and pg_net. Idempotent.
-- ============================================================================

-- Guard for the AI embed job: same checks ai_embed_kick() made before calling ai-embed, so the
-- worker is only woken when something is waiting (behaviour unchanged).
CREATE OR REPLACE FUNCTION public.ai_embed_has_work()
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, sim SET row_security = off
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.ai_platform_settings WHERE id AND kill_switch) THEN RETURN FALSE; END IF;
  RETURN EXISTS (SELECT 1 FROM public.search_index WHERE embedding IS NULL AND embed_text IS NOT NULL AND NOT is_deleted AND embed_attempts < 3)
      OR EXISTS (SELECT 1 FROM sim.search_index WHERE embedding IS NULL AND embed_text IS NOT NULL AND NOT is_deleted AND embed_attempts < 3);
END;
$$;
REVOKE ALL ON FUNCTION public.ai_embed_has_work() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_embed_has_work() TO service_role;

-- ── Catalogue rows ───────────────────────────────────────────────────────────
SELECT public.background_job_register(
  p_code => 'trial.expiry_check',
  p_name => 'Trial expiry check',
  p_kind => 'sql',
  p_description => 'Marks the 3-day and 1-day trial reminders and locks projects whose free trial has ended.',
  p_owner_system => 'platform',
  p_sql_function => 'public.check_trial_expirations_cron',
  p_cron => '0 0 * * *',
  p_timeout_seconds => 900
);

SELECT public.background_job_register(
  p_code => 'lifecycle.auto_archive',
  p_name => 'Lifecycle history auto-archive',
  p_kind => 'sql',
  p_description => 'Moves lifecycle history rows past their retention to the archive tables, for organisations that switched auto-archive on.',
  p_owner_system => 'platform',
  p_sql_function => 'public.auto_archive_expired_history',
  p_cron => '0 0 * * *',
  p_timeout_seconds => 1800
);

SELECT public.background_job_register(
  p_code => 'ai.retention_purge',
  p_name => 'AI retention purge',
  p_kind => 'sql',
  p_description => 'Removes AI conversations, agent run text and usage rows older than each organisation’s retention.',
  p_owner_system => 'platform',
  p_sql_function => 'public.ai_purge_expired',
  p_cron => '30 2 * * *',
  p_timeout_seconds => 1800
);

SELECT public.background_job_register(
  p_code => 'ai.embed',
  p_name => 'AI meaning-search embedding',
  p_kind => 'handler',
  p_description => 'Embeds new and changed records so meaning search finds them. Runs only when records are waiting.',
  p_owner_system => 'platform',
  p_cron => '*/2 * * * *',
  p_timeout_seconds => 120,
  p_max_attempts => 1,
  p_item_ttl_seconds => 600,
  p_batch_size => 1,
  p_enqueue_guard => 'public.ai_embed_has_work'
);

SELECT public.background_job_register(
  p_code => 'drafts.expire',
  p_name => 'Draft expiry',
  p_kind => 'handler',
  p_description => 'Expires old drafts in both apps, warns owners three days before, and clears drafts deleted over 30 days ago.',
  p_owner_system => 'platform',
  p_cron => '0 0 * * *',
  p_timeout_seconds => 600,
  p_max_attempts => 1,
  p_item_ttl_seconds => 21600,
  p_batch_size => 1
);

SELECT public.background_job_register(
  p_code => 'testers.moratorium_expiry',
  p_name => 'Tester moratorium expiry',
  p_kind => 'handler',
  p_description => 'Emails system testers 90, 30 and 7 days before their moratorium ends (once per window).',
  p_owner_system => 'platform',
  p_cron => '15 0 * * *',
  p_timeout_seconds => 600,
  p_max_attempts => 1,
  p_item_ttl_seconds => 21600,
  p_batch_size => 1
);

SELECT public.background_job_register(
  p_code => 'system.detect_late',
  p_name => 'Late and stuck job check',
  p_kind => 'sql',
  p_description => 'Alerts when a job was due but has not started, and closes runs that stopped before finishing.',
  p_owner_system => 'system',
  p_sql_function => 'public.background_jobs_detect_late',
  p_cron => '*/5 * * * *',
  p_timeout_seconds => 120
);

SELECT public.background_job_register(
  p_code => 'system.alert_email',
  p_name => 'Background job alert emails',
  p_kind => 'handler',
  p_description => 'Sends the grouped email for a failed or late background job to Admin users who watch jobs.',
  p_owner_system => 'system',
  p_timeout_seconds => 120,
  p_max_attempts => 5,
  p_backoff_schedule => ARRAY[60, 300, 1800, 7200],
  p_item_ttl_seconds => 86400,
  p_batch_size => 50
);

-- ── Old schedules out, one tick in ───────────────────────────────────────────
DO $$
DECLARE
  v_name TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE 'v1560: pg_cron is not installed. Enable it (Database → Extensions), then re-run this file.';
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RAISE WARNING 'v1560: pg_net is not installed, so worker jobs (AI embed, draft expiry, moratorium, alert emails) cannot start. Enable it (Database → Extensions or CREATE EXTENSION IF NOT EXISTS pg_net), then check SELECT public.background_job_wake_worker(); returns requested.';
  END IF;
  FOREACH v_name IN ARRAY ARRAY['daily-trial-expiry-check', 'nidus_auto_archive_history',
                                'nidus_ai_retention_purge', 'nidus_ai_embed', 'nidus_background_tick'] LOOP
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = v_name;
  END LOOP;
  PERFORM cron.schedule('nidus_background_tick', '* * * * *', $cron$SELECT public.run_due_background_jobs();$cron$);
  RAISE NOTICE 'v1560: old job schedules removed; nidus_background_tick runs every minute.';
END $$;

-- Start the tick window now, so the first tick does not replay the past hour.
UPDATE public.background_job_settings SET last_tick_at = date_trunc('minute', NOW()), updated_at = NOW()
 WHERE id AND last_tick_at IS NULL;

-- ── Checks ───────────────────────────────────────────────────────────────────
-- A. Catalogue
SELECT code, kind, cron, owner_system, enabled FROM public.background_jobs ORDER BY code;
-- B. pg_cron entries (expect only nidus_background_tick, plus Admin entries until Admin v255 runs)
SELECT jobname, schedule, command FROM cron.job ORDER BY jobname;
