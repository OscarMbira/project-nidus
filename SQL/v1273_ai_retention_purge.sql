-- ============================================================================
-- v1273: AI retention purge (PRD D8; plan SQL #2)
--
--   public.ai_purge_expired()  — daily:
--     1. deletes conversations (public + sim) older than each organisation's conversation
--        retention period (Admin default when the organisation has none);
--     2. removes question/answer text from agent runs whose conversation no longer exists;
--     3. deletes agent runs (and their steps) older than the audit retention period;
--     4. deletes credit-ledger usage rows older than the audit retention period.
--   pg_cron job 'nidus_ai_retention_purge' at 02:30 UTC (skipped with a notice if pg_cron is absent).
--
-- Prerequisite: v1272. Idempotent.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.ai_purge_expired()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_default_conv  INTEGER;
  v_default_audit INTEGER;
  v_conv_public   INTEGER := 0;
  v_conv_sim      INTEGER := 0;
  v_runs_text     INTEGER := 0;
  v_runs_deleted  INTEGER := 0;
  v_ledger        INTEGER := 0;
  v_n             INTEGER;
BEGIN
  SELECT conversation_retention_months, audit_retention_months INTO v_default_conv, v_default_audit
    FROM public.ai_platform_settings WHERE id;

  -- 1. Conversations
  DELETE FROM public.ai_conversations c
   WHERE c.updated_at < NOW() - make_interval(months => COALESCE(
           (SELECT s.conversation_retention_months FROM public.ai_settings s WHERE s.organisation_id = c.organisation_id),
           v_default_conv));
  GET DIAGNOSTICS v_conv_public = ROW_COUNT;

  DELETE FROM sim.ai_conversations c
   WHERE c.updated_at < NOW() - make_interval(months => COALESCE(
           (SELECT s.conversation_retention_months FROM public.ai_settings s WHERE s.organisation_id = c.organisation_id),
           v_default_conv));
  GET DIAGNOSTICS v_conv_sim = ROW_COUNT;

  -- 2. Content-free audit rows once the conversation is gone
  UPDATE public.agent_runs r SET question_text = NULL, answer_text = NULL
   WHERE (r.question_text IS NOT NULL OR r.answer_text IS NOT NULL)
     AND (r.conversation_id IS NULL AND r.started_at < NOW() - make_interval(months => v_default_conv)
          OR r.conversation_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.ai_conversations c WHERE c.id = r.conversation_id));
  GET DIAGNOSTICS v_n = ROW_COUNT; v_runs_text := v_runs_text + v_n;

  UPDATE sim.agent_runs r SET question_text = NULL, answer_text = NULL
   WHERE (r.question_text IS NOT NULL OR r.answer_text IS NOT NULL)
     AND (r.conversation_id IS NULL AND r.started_at < NOW() - make_interval(months => v_default_conv)
          OR r.conversation_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sim.ai_conversations c WHERE c.id = r.conversation_id));
  GET DIAGNOSTICS v_n = ROW_COUNT; v_runs_text := v_runs_text + v_n;

  -- 3. Audit rows past the audit period (steps cascade)
  DELETE FROM public.agent_runs r
   WHERE r.started_at < NOW() - make_interval(months => COALESCE(
           (SELECT s.audit_retention_months FROM public.ai_settings s WHERE s.organisation_id = r.account_id), v_default_audit));
  GET DIAGNOSTICS v_n = ROW_COUNT; v_runs_deleted := v_runs_deleted + v_n;

  DELETE FROM sim.agent_runs r
   WHERE r.started_at < NOW() - make_interval(months => COALESCE(
           (SELECT s.audit_retention_months FROM public.ai_settings s WHERE s.organisation_id = r.account_id), v_default_audit));
  GET DIAGNOSTICS v_n = ROW_COUNT; v_runs_deleted := v_runs_deleted + v_n;

  -- 4. Old usage rows (top-ups and adjustments are kept as billing history)
  DELETE FROM public.ai_credit_ledger l
   WHERE l.entry_type = 'usage'
     AND l.created_at < NOW() - make_interval(months => COALESCE(
           (SELECT s.audit_retention_months FROM public.ai_settings s WHERE s.organisation_id = l.account_id), v_default_audit));
  GET DIAGNOSTICS v_ledger = ROW_COUNT;

  RETURN jsonb_build_object('conversations_public', v_conv_public, 'conversations_sim', v_conv_sim,
                            'runs_text_removed', v_runs_text, 'runs_deleted', v_runs_deleted, 'ledger_rows_deleted', v_ledger,
                            'ran_at', NOW());
END;
$$;

REVOKE ALL ON FUNCTION public.ai_purge_expired() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ai_purge_expired() TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'nidus_ai_retention_purge';
    PERFORM cron.schedule('nidus_ai_retention_purge', '30 2 * * *', $cron$SELECT public.ai_purge_expired();$cron$);
  ELSE
    RAISE NOTICE 'pg_cron not available — schedule SELECT public.ai_purge_expired(); daily by hand';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not schedule nidus_ai_retention_purge: %', SQLERRM;
END $$;

DO $$ BEGIN RAISE NOTICE 'v1273_ai_retention_purge.sql completed'; END $$;
