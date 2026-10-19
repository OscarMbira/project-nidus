-- ============================================================================
-- v1284: Meaning search — background embedding job (PRD D24; plan SQL #13)
--
--   public.ai_embed_kick() — calls the ai-embed edge function through pg_net, using
--   public.ai_job_config (functions_base_url + cron_secret, server-only, v1272). Does nothing until
--   both are set, and nothing when no row is waiting, so it is cheap to run often.
--   pg_cron job 'nidus_ai_embed' every 2 minutes. Embedding never blocks a user's save: records
--   are queued by the search-index triggers (v1283) and embedded here in batches.
--
-- Setup (once, as the owner):
--   UPDATE public.ai_job_config SET functions_base_url = 'https://<project-ref>.supabase.co/functions/v1',
--                                   cron_secret = '<same value as the AI_CRON_SECRET edge secret>', updated_at = NOW();
-- Requires pg_cron and pg_net (Supabase: Database → Extensions). Skipped with a notice if missing.
-- Prerequisite: v1283. Idempotent.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.ai_embed_kick()
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, sim SET row_security = off
AS $$
DECLARE
  v_cfg public.ai_job_config;
  v_waiting BOOLEAN;
BEGIN
  SELECT * INTO v_cfg FROM public.ai_job_config WHERE id;
  IF v_cfg.functions_base_url IS NULL OR v_cfg.cron_secret IS NULL THEN RETURN 'not configured'; END IF;
  IF EXISTS (SELECT 1 FROM public.ai_platform_settings WHERE id AND kill_switch) THEN RETURN 'kill switch on'; END IF;
  v_waiting := EXISTS (SELECT 1 FROM public.search_index WHERE embedding IS NULL AND embed_text IS NOT NULL AND NOT is_deleted AND embed_attempts < 3)
            OR EXISTS (SELECT 1 FROM sim.search_index WHERE embedding IS NULL AND embed_text IS NOT NULL AND NOT is_deleted AND embed_attempts < 3);
  IF NOT v_waiting THEN RETURN 'nothing waiting'; END IF;
  PERFORM net.http_post(
    url := rtrim(v_cfg.functions_base_url, '/') || '/ai-embed',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-ai-cron-secret', v_cfg.cron_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  RETURN 'requested';
END;
$$;
REVOKE ALL ON FUNCTION public.ai_embed_kick() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_embed_kick() TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE 'v1284: pg_cron is not installed — enable it, then re-run this file to schedule embedding.';
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RAISE NOTICE 'v1284: pg_net is not installed — enable it, then re-run this file to schedule embedding.';
    RETURN;
  END IF;
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'nidus_ai_embed';
  PERFORM cron.schedule('nidus_ai_embed', '*/2 * * * *', $cron$SELECT public.ai_embed_kick();$cron$);
  RAISE NOTICE 'v1284: nidus_ai_embed scheduled every 2 minutes. Set public.ai_job_config if not done yet.';
END $$;
