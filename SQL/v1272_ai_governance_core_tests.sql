-- ============================================================================
-- v1272 tests: AI governance core. Run after v1272_ai_governance_core.sql.
-- Uses one existing organisation (the oldest account) and impersonates its owner through
-- request.jwt.claims. Every row it writes is tagged 'v1272-test' and removed at the end.
--
--   T1  tables and columns exist (public + sim)
--   T2  settings singleton exists with sane defaults
--   T3  RLS is enabled on every new table
--   T4  no consent → not allowed, reason not_enabled
--   T5  consent accepted by owner → allowed when credits remain
--   T6  usage ≥ warn % → warning_level warn
--   T7  usage ≥ 100 % → blocked (quota_blocked)
--   T8  a top-up lifts the block
--   T9  kill switch overrides everything
--   T10 admin disable overrides consent
--   T11 retention outside Admin min/max is refused
--   T12 a non-member gets reason no_account
-- ============================================================================

CREATE TEMP TABLE IF NOT EXISTS v1272_results (test TEXT PRIMARY KEY, passed BOOLEAN, detail TEXT);
TRUNCATE v1272_results;

DO $$
DECLARE
  v_account  UUID;
  v_owner    UUID;   -- auth uid of the owner
  v_status   JSONB;
  v_had_row  BOOLEAN;
  v_saved    public.ai_settings%ROWTYPE;
  v_kill     BOOLEAN;
  v_err      TEXT;
BEGIN
  -- T1
  INSERT INTO v1272_results VALUES ('T1 tables and columns exist',
    to_regclass('public.ai_platform_settings') IS NOT NULL AND to_regclass('public.ai_credit_ledger') IS NOT NULL
    AND to_regclass('public.agent_runs') IS NOT NULL AND to_regclass('sim.agent_runs') IS NOT NULL
    AND to_regclass('public.agent_steps') IS NOT NULL AND to_regclass('sim.agent_steps') IS NOT NULL
    AND to_regclass('public.ai_ui_messages') IS NOT NULL
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'subscription_plans' AND column_name = 'monthly_ai_credits')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'planner_plan_limits' AND column_name = 'monthly_ai_credits')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'sim' AND table_name = 'languages' AND column_name = 'ai_supported')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'sim' AND table_name = 'ai_conversations' AND column_name = 'organisation_id'),
    NULL);

  -- Without the v1272 tables nothing else can be checked: report it instead of failing on T2.
  IF to_regclass('public.ai_platform_settings') IS NULL OR to_regclass('public.ai_credit_ledger') IS NULL THEN
    INSERT INTO v1272_results VALUES ('T2-T12 not run', FALSE,
      'v1272 tables are missing: run SQL/v1272_ai_governance_core.sql first (and fix any error it reports), then re-run this file');
    RETURN;
  END IF;

  -- T2
  INSERT INTO v1272_results SELECT 'T2 settings singleton defaults',
    COUNT(*) = 1 AND bool_and(model_agent <> '' AND warn_percent = 80 AND retention_min_months <= conversation_retention_months), NULL
    FROM public.ai_platform_settings;

  -- T3
  INSERT INTO v1272_results SELECT 'T3 RLS enabled on new tables', bool_and(c.relrowsecurity), string_agg(n.nspname || '.' || c.relname || '=' || c.relrowsecurity, ', ')
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE (n.nspname, c.relname) IN (('public','ai_platform_settings'),('public','ai_job_config'),('public','ai_credit_ledger'),
                                    ('public','agent_runs'),('public','agent_steps'),('sim','agent_runs'),('sim','agent_steps'),('public','ai_ui_messages'));

  SELECT a.id, u.auth_user_id INTO v_account, v_owner
    FROM public.accounts a JOIN public.users u ON u.id = a.owner_user_id
   WHERE u.auth_user_id IS NOT NULL AND COALESCE(a.is_deleted, FALSE) = FALSE
   ORDER BY a.created_at LIMIT 1;
  IF v_account IS NULL THEN
    INSERT INTO v1272_results VALUES ('T4-T12 skipped', TRUE, 'no account with an owner to test against');
    RETURN;
  END IF;

  SELECT * INTO v_saved FROM public.ai_settings WHERE organisation_id = v_account;
  v_had_row := FOUND;
  SELECT kill_switch INTO v_kill FROM public.ai_platform_settings WHERE id;
  UPDATE public.ai_platform_settings SET kill_switch = FALSE WHERE id;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner, 'role', 'authenticated')::text, TRUE);

  -- Clean slate for this organisation, with a fixed allowance of 100 credits.
  INSERT INTO public.ai_settings (organisation_id, ai_enabled, data_privacy_accepted_at, credit_allowance_override, admin_ai_disabled)
  VALUES (v_account, FALSE, NULL, 100, FALSE)
  ON CONFLICT (organisation_id) DO UPDATE SET ai_enabled = FALSE, data_privacy_accepted_at = NULL,
    credit_allowance_override = 100, admin_ai_disabled = FALSE, retention_admin_override = FALSE;

  -- T4
  v_status := public.ai_org_status(v_account);
  INSERT INTO v1272_results VALUES ('T4 no consent → not_enabled',
    NOT (v_status ->> 'allowed')::boolean AND v_status ->> 'reason' = 'not_enabled', v_status::text);

  -- T5
  v_status := public.ai_accept_consent(v_account);
  INSERT INTO v1272_results VALUES ('T5 consent → allowed',
    (v_status ->> 'allowed')::boolean AND (v_status ->> 'consent_accepted')::boolean, v_status::text);

  -- T6 (85 of 100 used; earlier usage this period counts too, so add only what is missing)
  INSERT INTO public.ai_credit_ledger (account_id, entry_type, credits, app, note)
  SELECT v_account, 'usage', GREATEST(85 - (public.ai_org_status(v_account) ->> 'used')::numeric, 0), 'platform', 'v1272-test';
  v_status := public.ai_org_status(v_account);
  INSERT INTO v1272_results VALUES ('T6 ≥ 80% → warn',
    v_status ->> 'warning_level' = 'warn' AND (v_status ->> 'allowed')::boolean, v_status ->> 'percent');

  -- T7
  INSERT INTO public.ai_credit_ledger (account_id, entry_type, credits, app, note) VALUES (v_account, 'usage', 20, 'platform', 'v1272-test');
  v_status := public.ai_org_status(v_account);
  INSERT INTO v1272_results VALUES ('T7 ≥ 100% → quota_blocked',
    NOT (v_status ->> 'allowed')::boolean AND v_status ->> 'reason' = 'quota_blocked', v_status ->> 'percent');

  -- T8
  INSERT INTO public.ai_credit_ledger (account_id, entry_type, credits, app, note) VALUES (v_account, 'topup', 100, NULL, 'v1272-test');
  v_status := public.ai_org_status(v_account);
  INSERT INTO v1272_results VALUES ('T8 top-up lifts the block', (v_status ->> 'allowed')::boolean, v_status ->> 'percent');

  -- T9
  UPDATE public.ai_platform_settings SET kill_switch = TRUE WHERE id;
  v_status := public.ai_org_status(v_account);
  INSERT INTO v1272_results VALUES ('T9 kill switch', v_status ->> 'reason' = 'kill_switch', NULL);
  UPDATE public.ai_platform_settings SET kill_switch = FALSE WHERE id;

  -- T10
  UPDATE public.ai_settings SET admin_ai_disabled = TRUE WHERE organisation_id = v_account;
  v_status := public.ai_org_status(v_account);
  INSERT INTO v1272_results VALUES ('T10 admin disable', v_status ->> 'reason' = 'admin_disabled', NULL);
  UPDATE public.ai_settings SET admin_ai_disabled = FALSE WHERE organisation_id = v_account;

  -- T11
  BEGIN
    PERFORM public.ai_update_org_settings(v_account, TRUE, 999, 24, NULL);
    v_err := NULL;
  EXCEPTION WHEN OTHERS THEN v_err := SQLERRM;
  END;
  INSERT INTO v1272_results VALUES ('T11 retention outside min/max refused', v_err LIKE 'Conversation retention must be between%', v_err);

  -- T12
  PERFORM set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, TRUE);
  v_status := public.ai_org_status(v_account);
  INSERT INTO v1272_results VALUES ('T12 non-member → no_account', v_status ->> 'reason' = 'no_account', NULL);

  -- Clean up
  DELETE FROM public.ai_credit_ledger WHERE account_id = v_account AND note = 'v1272-test';
  IF v_had_row THEN
    UPDATE public.ai_settings SET ai_enabled = v_saved.ai_enabled, data_privacy_accepted_at = v_saved.data_privacy_accepted_at,
      consent_accepted_by = v_saved.consent_accepted_by, credit_allowance_override = v_saved.credit_allowance_override,
      admin_ai_disabled = v_saved.admin_ai_disabled, conversation_retention_months = v_saved.conversation_retention_months,
      audit_retention_months = v_saved.audit_retention_months, retention_admin_override = v_saved.retention_admin_override
     WHERE organisation_id = v_account;
  ELSE
    DELETE FROM public.ai_settings WHERE organisation_id = v_account;
  END IF;
  UPDATE public.ai_platform_settings SET kill_switch = v_kill WHERE id;
  PERFORM set_config('request.jwt.claims', NULL, TRUE);
END $$;

SELECT CASE WHEN passed THEN 'PASS' ELSE 'FAIL' END AS result, test, detail FROM v1272_results ORDER BY test;
