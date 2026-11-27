-- ============================================================================
-- v1590: Retire empty v42 / v43 / v51 scaffolding (api_keys, webhooks, sso_*)
-- Companion to v1585–v1588. Safe to re-run. Prefer a quiet moment (pause other
-- SQL tabs / heavy API traffic) so AccessExclusiveLock can be taken.
-- Does not fail the script when a table is busy — skips and continues.
-- ============================================================================

DO $$
DECLARE
  v_keys BIGINT := 0;
  v_logs BIGINT := 0;
  v_hooks BIGINT := 0;
  v_wlogs BIGINT := 0;
  v_prov BIGINT := 0;
  v_sess BIGINT := 0;
  v_rel TEXT;
  v_list TEXT[];
BEGIN
  PERFORM set_config('lock_timeout', '5s', true);

  -- v42 api_keys
  IF to_regclass('public.api_keys') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM public.api_keys' INTO v_keys;
  END IF;
  IF to_regclass('public.api_logs') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM public.api_logs' INTO v_logs;
  END IF;
  IF v_keys = 0 AND v_logs = 0 THEN
    v_list := ARRAY['api_rate_limits', 'api_logs', 'api_keys', 'api_scopes'];
    FOREACH v_rel IN ARRAY v_list LOOP
      IF to_regclass('public.' || v_rel) IS NULL THEN CONTINUE; END IF;
      BEGIN
        EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', v_rel);
        RAISE NOTICE 'v1590: dropped public.%', v_rel;
      EXCEPTION
        WHEN deadlock_detected OR lock_not_available OR query_canceled THEN
          RAISE NOTICE 'v1590: skipped public.% (busy) — re-run later', v_rel;
      END;
    END LOOP;
  ELSE
    RAISE NOTICE 'v1590: kept v42 api tables — % keys, % logs', v_keys, v_logs;
  END IF;

  -- v43 webhooks
  IF to_regclass('public.webhooks') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM public.webhooks' INTO v_hooks;
  END IF;
  IF to_regclass('public.webhook_logs') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM public.webhook_logs' INTO v_wlogs;
  END IF;
  IF v_hooks = 0 AND v_wlogs = 0 THEN
    v_list := ARRAY['webhook_logs', 'webhooks', 'webhook_events'];
    FOREACH v_rel IN ARRAY v_list LOOP
      IF to_regclass('public.' || v_rel) IS NULL THEN CONTINUE; END IF;
      BEGIN
        EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', v_rel);
        RAISE NOTICE 'v1590: dropped public.%', v_rel;
      EXCEPTION
        WHEN deadlock_detected OR lock_not_available OR query_canceled THEN
          RAISE NOTICE 'v1590: skipped public.% (busy) — re-run later', v_rel;
      END;
    END LOOP;
  ELSE
    RAISE NOTICE 'v1590: kept v43 webhook tables — % endpoints, % logs', v_hooks, v_wlogs;
  END IF;

  -- v51 SSO
  IF to_regclass('public.sso_providers') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM public.sso_providers' INTO v_prov;
  END IF;
  IF to_regclass('public.sso_sessions') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM public.sso_sessions' INTO v_sess;
  END IF;
  IF v_prov = 0 AND v_sess = 0 THEN
    v_list := ARRAY['sso_login_logs', 'sso_sessions', 'user_identity_mappings', 'sso_providers'];
    FOREACH v_rel IN ARRAY v_list LOOP
      IF to_regclass('public.' || v_rel) IS NULL THEN CONTINUE; END IF;
      BEGIN
        EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', v_rel);
        RAISE NOTICE 'v1590: dropped public.%', v_rel;
      EXCEPTION
        WHEN deadlock_detected OR lock_not_available OR query_canceled THEN
          RAISE NOTICE 'v1590: skipped public.% (busy) — re-run later', v_rel;
      END;
    END LOOP;
  ELSE
    RAISE NOTICE 'v1590: kept v51 SSO tables — % providers, % sessions', v_prov, v_sess;
  END IF;
END $$;
