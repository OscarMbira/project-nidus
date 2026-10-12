-- ============================================================================
-- v1241 verification (read-only checks; run AFTER v1241 + seed and Admin v225).
-- Raises an exception on the first failed check; prints PASS notices otherwise.
-- Everything runs inside a transaction that is rolled back — no data changes.
-- ============================================================================
BEGIN;

DO $$
DECLARE
  v_count INTEGER;
  v_inactive INTEGER;
BEGIN
  SELECT COUNT(*) FILTER (WHERE NOT is_active) INTO v_inactive FROM public.site_products;

  -- 1. anon sees active rows only
  SET LOCAL ROLE anon;
  SELECT COUNT(*) INTO v_count FROM public.site_products WHERE is_active = FALSE;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL: anon can read % inactive site_products rows', v_count;
  END IF;
  SELECT COUNT(*) INTO v_count FROM public.site_products;
  IF v_count = 0 THEN
    RAISE EXCEPTION 'FAIL: anon reads no active site_products rows (seed run?)';
  END IF;
  RAISE NOTICE 'PASS: anon reads % active product rows and none of the % inactive ones', v_count, v_inactive;

  -- 2. anon cannot write
  BEGIN
    INSERT INTO public.site_products (slug, name, landing_url) VALUES ('rls-probe', 'probe', 'https://x/');
    RAISE EXCEPTION 'FAIL: anon INSERT into site_products succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS: anon INSERT rejected';
  END;
  BEGIN
    UPDATE public.site_content SET content_value = 'x' WHERE content_key = 'hero.heading';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count > 0 THEN
      RAISE EXCEPTION 'FAIL: anon UPDATE changed % site_content rows', v_count;
    END IF;
    RAISE NOTICE 'PASS: anon UPDATE changed no rows';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS: anon UPDATE rejected';
  END;

  -- 3. authenticated (non-admin, no session) cannot use the Admin RPCs
  RESET ROLE;
  SET LOCAL ROLE authenticated;
  BEGIN
    PERFORM public.admin_list_site_products();
    RAISE EXCEPTION 'FAIL: non-admin could call admin_list_site_products';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
    RAISE NOTICE 'PASS: non-admin RPC call rejected (%)', SQLERRM;
  END;
  RESET ROLE;
END $$;

ROLLBACK;
