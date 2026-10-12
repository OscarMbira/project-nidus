-- ============================================================================
-- v1264 tests: header settings table. Run after v1264 (+ seed). Test rows are removed before
-- the end; the script ends with a report.
--
--   T1 contrast function: known pairs (black/white 21, same colour 1, invalid NULL)
--   T2 bad hex rejected
--   T3 low-contrast text/background rejected
--   T4 low-contrast CTA text/accent rejected
--   T5 bad cta_url rejected
--   T6 anon reads active rows only
--   T7 anon cannot write
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.site_header_settings') IS NULL THEN
    RAISE EXCEPTION 'v1264 tests cannot run yet: run SQL/v1264_site_header_settings.sql first.';
  END IF;
END $$;

CREATE TEMP TABLE IF NOT EXISTS v1264_results (test TEXT PRIMARY KEY, passed BOOLEAN, detail TEXT);
TRUNCATE v1264_results;

DO $$
DECLARE
  r BOOLEAN[] := ARRAY[]::BOOLEAN[]; d TEXT[] := ARRAY[]::TEXT[];
  v_count INT; v_text TEXT;
BEGIN
  -- T1
  r := array_append(r, (public.site_color_contrast('#000000', '#FFFFFF') = 21
                        AND public.site_color_contrast('#2563EB', '#2563EB') = 1
                        AND public.site_color_contrast('#FFFFFF', '#16A34A') < 4.5
                        AND public.site_color_contrast('#FFFFFF', '#15803D') >= 4.5
                        AND public.site_color_contrast('red', '#FFFFFF') IS NULL));
  d := array_append(d, format('b/w %s, white on green-600 %s', public.site_color_contrast('#000000', '#FFFFFF'), public.site_color_contrast('#FFFFFF', '#16A34A')));

  -- T2
  BEGIN
    INSERT INTO public.site_header_settings (scope_slug, bg_color, text_color, accent_color, cta_text_color, cta_label)
      VALUES ('v1264-test-a', 'black', '#FFFFFF', '#2563EB', '#FFFFFF', 'Go');
    r := array_append(r, FALSE); d := array_append(d, 'bad hex accepted');
  EXCEPTION WHEN check_violation THEN r := array_append(r, TRUE); d := array_append(d, 'rejected (expected)');
  END;
  -- T3
  BEGIN
    INSERT INTO public.site_header_settings (scope_slug, bg_color, text_color, accent_color, cta_text_color, cta_label)
      VALUES ('v1264-test-b', '#030712', '#1F2937', '#2563EB', '#FFFFFF', 'Go');
    r := array_append(r, FALSE); d := array_append(d, 'low text contrast accepted');
  EXCEPTION WHEN check_violation THEN r := array_append(r, TRUE); d := array_append(d, 'rejected (expected)');
  END;
  -- T4
  BEGIN
    INSERT INTO public.site_header_settings (scope_slug, bg_color, text_color, accent_color, cta_text_color, cta_label)
      VALUES ('v1264-test-c', '#030712', '#FFFFFF', '#16A34A', '#FFFFFF', 'Go');
    r := array_append(r, FALSE); d := array_append(d, 'low CTA contrast accepted');
  EXCEPTION WHEN check_violation THEN r := array_append(r, TRUE); d := array_append(d, 'rejected (expected)');
  END;
  -- T5
  BEGIN
    INSERT INTO public.site_header_settings (scope_slug, bg_color, text_color, accent_color, cta_text_color, cta_label, cta_url)
      VALUES ('v1264-test-d', '#030712', '#FFFFFF', '#2563EB', '#FFFFFF', 'Go', 'javascript:alert(1)');
    r := array_append(r, FALSE); d := array_append(d, 'bad url accepted');
  EXCEPTION WHEN check_violation THEN r := array_append(r, TRUE); d := array_append(d, 'rejected (expected)');
  END;

  INSERT INTO public.site_header_settings (scope_slug, bg_color, text_color, accent_color, cta_text_color, cta_label, is_active)
    VALUES ('v1264-test-on', '#030712', '#FFFFFF', '#2563EB', '#FFFFFF', 'On', TRUE),
           ('v1264-test-off', '#030712', '#FFFFFF', '#2563EB', '#FFFFFF', 'Off', FALSE);

  PERFORM set_config('request.jwt.claims', '{"role": "anon"}', TRUE);
  EXECUTE 'SET LOCAL ROLE anon';
  -- T6
  SELECT string_agg(scope_slug, ',') INTO v_text FROM public.site_header_settings WHERE scope_slug LIKE 'v1264-test-%';
  r := array_append(r, v_text = 'v1264-test-on'); d := array_append(d, COALESCE(v_text, '(none)'));
  -- T7
  BEGIN
    UPDATE public.site_header_settings SET cta_label = 'hacked' WHERE scope_slug = 'v1264-test-on';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    r := array_append(r, v_count = 0); d := array_append(d, v_count || ' row(s) updated');
  EXCEPTION WHEN insufficient_privilege THEN r := array_append(r, TRUE); d := array_append(d, 'permission denied (expected)');
  END;
  EXECUTE 'RESET ROLE';

  DELETE FROM public.site_header_settings WHERE scope_slug LIKE 'v1264-test-%';

  INSERT INTO v1264_results VALUES
    ('T1 contrast function known pairs', r[1], d[1]),
    ('T2 bad hex rejected', r[2], d[2]),
    ('T3 low text contrast rejected', r[3], d[3]),
    ('T4 low CTA contrast rejected', r[4], d[4]),
    ('T5 bad cta_url rejected', r[5], d[5]),
    ('T6 anon reads active rows only', r[6], d[6]),
    ('T7 anon cannot write', r[7], d[7]);
END $$;

SELECT CASE WHEN passed THEN 'PASS' ELSE 'FAIL' END AS result, test, detail FROM v1264_results ORDER BY test;
