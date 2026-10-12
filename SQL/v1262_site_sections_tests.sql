-- ============================================================================
-- v1262 tests: what a public visitor (anon) can and cannot see in site_sections.
-- Run after v1262 (and its seed). Read-only in effect: the test rows it adds are removed before
-- the end. Supabase's SQL editor shows only the last result, so the script ends with a report.
--
--   T1 anon cannot read the draft column
--   T2 anon sees published active rows only (not hidden / draft-only rows)
--   T3 a valid preview token returns drafts
--   T4 an expired preview token is refused
--   T5 a malformed preview token is refused
--   T6 anon cannot write to site_sections
--   T7 anon cannot read site_preview_tokens
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.site_sections') IS NULL OR to_regprocedure('public.site_preview_sections(text)') IS NULL THEN
    RAISE EXCEPTION 'v1262 tests cannot run yet: run SQL/v1262_site_sections.sql first (then its seed, v1251 and Admin v231).';
  END IF;
END $$;

CREATE TEMP TABLE IF NOT EXISTS v1262_results (test TEXT PRIMARY KEY, passed BOOLEAN, detail TEXT);
TRUNCATE v1262_results;

DO $$
DECLARE
  v_good TEXT := 'v1262test' || replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_old  TEXT := 'v1262test' || replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  r1 BOOLEAN; r2 BOOLEAN; r3 BOOLEAN; r4 BOOLEAN; r5 BOOLEAN; r6 BOOLEAN; r7 BOOLEAN;
  d1 TEXT; d2 TEXT; d3 TEXT; d4 TEXT; d5 TEXT; d6 TEXT; d7 TEXT;
  v_count INT;
  v_json JSONB;
BEGIN
  -- Test rows: one published + shown, one hidden, one draft-only (published empty).
  INSERT INTO public.site_sections (page_slug, section_key, section_type, heading, is_active, sort_order, draft)
  VALUES ('v1262-test', 'shown', 'hero', 'Published hero', TRUE, 10, '{"heading": "Draft hero"}'),
         ('v1262-test', 'hidden', 'faq', 'Hidden FAQ', FALSE, 20, NULL),
         ('v1262-test', 'draft-only', 'cta_band', NULL, FALSE, 30, '{"heading": "New band", "is_active": true}');
  INSERT INTO public.site_preview_tokens (token_hash, expires_at)
  VALUES (encode(sha256(convert_to(v_good, 'UTF8')), 'hex'), NOW() + INTERVAL '10 minutes'),
         (encode(sha256(convert_to(v_old, 'UTF8')), 'hex'), NOW() - INTERVAL '1 minute');

  PERFORM set_config('request.jwt.claims', '{"role": "anon"}', TRUE);
  EXECUTE 'SET LOCAL ROLE anon';

  -- T1
  BEGIN
    PERFORM draft FROM public.site_sections LIMIT 1;
    r1 := FALSE; d1 := 'draft column was readable';
  EXCEPTION WHEN insufficient_privilege THEN r1 := TRUE; d1 := 'permission denied (expected)';
  END;

  -- T2
  SELECT COUNT(*) INTO v_count FROM public.site_sections WHERE page_slug = 'v1262-test';
  r2 := v_count = 1; d2 := v_count || ' visible row(s), expected 1';

  -- T3
  BEGIN
    v_json := public.site_preview_sections(v_good);
    SELECT COUNT(*) INTO v_count FROM jsonb_array_elements(v_json) e
     WHERE e->>'page_slug' = 'v1262-test' AND (e->>'heading') IN ('Draft hero', 'New band');
    r3 := v_count = 2; d3 := v_count || ' draft section(s) returned, expected 2 (hidden FAQ excluded)';
  EXCEPTION WHEN OTHERS THEN r3 := FALSE; d3 := SQLERRM;
  END;

  -- T4
  BEGIN
    PERFORM public.site_preview_sections(v_old);
    r4 := FALSE; d4 := 'expired token accepted';
  EXCEPTION WHEN raise_exception THEN r4 := TRUE; d4 := SQLERRM;
  END;

  -- T5
  BEGIN
    PERFORM public.site_preview_sections('short');
    r5 := FALSE; d5 := 'malformed token accepted';
  EXCEPTION WHEN raise_exception THEN r5 := TRUE; d5 := SQLERRM;
  END;

  -- T6
  BEGIN
    UPDATE public.site_sections SET heading = 'hacked' WHERE page_slug = 'v1262-test';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    r6 := v_count = 0; d6 := v_count || ' row(s) updated';
  EXCEPTION WHEN insufficient_privilege THEN r6 := TRUE; d6 := 'permission denied (expected)';
  END;

  -- T7
  BEGIN
    PERFORM 1 FROM public.site_preview_tokens LIMIT 1;
    r7 := FALSE; d7 := 'token table was readable';
  EXCEPTION WHEN insufficient_privilege THEN r7 := TRUE; d7 := 'permission denied (expected)';
  END;

  EXECUTE 'RESET ROLE';

  DELETE FROM public.site_sections WHERE page_slug = 'v1262-test';
  DELETE FROM public.site_preview_tokens WHERE token_hash IN (encode(sha256(convert_to(v_good, 'UTF8')), 'hex'), encode(sha256(convert_to(v_old, 'UTF8')), 'hex'));

  INSERT INTO v1262_results VALUES
    ('T1 anon cannot read draft column', r1, d1),
    ('T2 anon sees published active rows only', r2, d2),
    ('T3 valid preview link returns drafts', r3, d3),
    ('T4 expired preview link refused', r4, d4),
    ('T5 malformed preview link refused', r5, d5),
    ('T6 anon cannot write sections', r6, d6),
    ('T7 anon cannot read preview tokens', r7, d7);
END $$;

SELECT CASE WHEN passed THEN 'PASS' ELSE 'FAIL' END AS result, test, detail FROM v1262_results ORDER BY test;
