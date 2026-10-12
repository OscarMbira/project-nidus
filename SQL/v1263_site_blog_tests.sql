-- ============================================================================
-- v1263 tests: what a public visitor (anon) can and cannot see or do on the blog.
-- Run after v1263 (+ seed). Test rows are removed before the end; the script ends with a report.
--
--   T1 anon sees a published post, not a draft, scheduled or archived one
--   T2 anon cannot read the posts' draft column
--   T3 anon sees live attachments of visible posts only (not draft_add, not on hidden posts)
--   T4 anon cannot read attachment file paths
--   T5 anon cannot call the gated-download function
--   T6 gated-download function (service role) records a lead and returns the private path
--   T7 gated-download function refuses an open document and bad email
--   T8 slug status: archived vs missing (drafts/scheduled not revealed)
--   T9 anon cannot write posts
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.site_blog_posts') IS NULL OR to_regprocedure('public.site_record_gated_download(uuid,text,text,text,boolean,text,text)') IS NULL THEN
    RAISE EXCEPTION 'v1263 tests cannot run yet: run SQL/v1263_site_blog.sql first.';
  END IF;
END $$;

CREATE TEMP TABLE IF NOT EXISTS v1263_results (test TEXT PRIMARY KEY, passed BOOLEAN, detail TEXT);
TRUNCATE v1263_results;

DO $$
DECLARE
  v_live UUID; v_draft UUID; v_future UUID; v_arch UUID;
  v_open UUID; v_gated UUID; v_added UUID; v_hidden_att UUID;
  r BOOLEAN[] := ARRAY[]::BOOLEAN[]; d TEXT[] := ARRAY[]::TEXT[];
  v_count INT; v_json JSONB; v_text TEXT;
BEGIN
  INSERT INTO public.site_blog_posts (slug, title, published_at, first_published_at, draft)
    VALUES ('v1263-test-live', 'Live', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', '{"title": "Draft title"}') RETURNING id INTO v_live;
  INSERT INTO public.site_blog_posts (slug, title) VALUES ('v1263-test-draft', 'Draft') RETURNING id INTO v_draft;
  INSERT INTO public.site_blog_posts (slug, title, published_at, first_published_at)
    VALUES ('v1263-test-future', 'Future', NOW() + INTERVAL '7 days', NOW()) RETURNING id INTO v_future;
  INSERT INTO public.site_blog_posts (slug, title, published_at, first_published_at, archived_at)
    VALUES ('v1263-test-archived', 'Archived', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NOW()) RETURNING id INTO v_arch;
  INSERT INTO public.site_blog_attachments (post_id, display_name, bucket, file_path, public_url, mime_type, size_bytes, is_gated)
    VALUES (v_live, 'Open guide', 'site-assets', 'blog/test/open.pdf', 'https://example.test/open.pdf', 'application/pdf', 1000, FALSE) RETURNING id INTO v_open;
  INSERT INTO public.site_blog_attachments (post_id, display_name, bucket, file_path, mime_type, size_bytes, is_gated)
    VALUES (v_live, 'Gated guide', 'site-downloads', 'blog/test/gated.pdf', 'application/pdf', 1000, TRUE) RETURNING id INTO v_gated;
  INSERT INTO public.site_blog_attachments (post_id, display_name, bucket, file_path, public_url, mime_type, size_bytes, is_gated, state)
    VALUES (v_live, 'Not yet', 'site-assets', 'blog/test/new.pdf', 'https://example.test/new.pdf', 'application/pdf', 1000, FALSE, 'draft_add') RETURNING id INTO v_added;
  INSERT INTO public.site_blog_attachments (post_id, display_name, bucket, file_path, public_url, mime_type, size_bytes, is_gated)
    VALUES (v_draft, 'On draft post', 'site-assets', 'blog/test/d.pdf', 'https://example.test/d.pdf', 'application/pdf', 1000, FALSE) RETURNING id INTO v_hidden_att;

  -- T6 / T7 as the service role (the Edge Function's role)
  EXECUTE 'SET LOCAL ROLE service_role';
  BEGIN
    v_json := public.site_record_gated_download(v_gated, 'Test Person', 'v1263-test@example.test', NULL, TRUE, NULL, NULL);
    SELECT COUNT(*) INTO v_count FROM public.site_enquiries WHERE email = 'v1263-test@example.test' AND topic = 'download' AND marketing_opt_in AND marketing_opt_in_at IS NOT NULL;
    r := array_append(r, ((v_json->>'path' = 'blog/test/gated.pdf' AND v_count = 1))::boolean); d := array_append(d, (format('path %s, leads %s', v_json->>'path', v_count))::text);
  EXCEPTION WHEN OTHERS THEN r := array_append(r, (FALSE)::boolean); d := array_append(d, (SQLERRM)::text);
  END;
  BEGIN
    PERFORM public.site_record_gated_download(v_open, 'Test Person', 'v1263-test@example.test');
    r := array_append(r, (FALSE)::boolean); d := array_append(d, ('open document accepted')::text);
  EXCEPTION WHEN raise_exception THEN
    BEGIN
      PERFORM public.site_record_gated_download(v_gated, 'Test Person', 'not-an-email');
      r := array_append(r, (FALSE)::boolean); d := array_append(d, ('bad email accepted')::text);
    EXCEPTION WHEN raise_exception THEN r := array_append(r, (TRUE)::boolean); d := array_append(d, ('refused (expected)')::text);
    END;
  END;
  EXECUTE 'RESET ROLE';

  PERFORM set_config('request.jwt.claims', '{"role": "anon"}', TRUE);
  EXECUTE 'SET LOCAL ROLE anon';

  -- T1
  SELECT COUNT(*) INTO v_count FROM public.site_blog_posts WHERE slug LIKE 'v1263-test-%';
  SELECT string_agg(slug, ',') INTO v_text FROM public.site_blog_posts WHERE slug LIKE 'v1263-test-%';
  r := array_append(r, ((v_count = 1 AND v_text = 'v1263-test-live'))::boolean); d := array_append(d, (format('%s visible: %s', v_count, v_text))::text);
  -- T2
  BEGIN
    PERFORM draft FROM public.site_blog_posts LIMIT 1;
    r := array_append(r, (FALSE)::boolean); d := array_append(d, ('draft column readable')::text);
  EXCEPTION WHEN insufficient_privilege THEN r := array_append(r, (TRUE)::boolean); d := array_append(d, ('permission denied (expected)')::text);
  END;
  -- T3
  SELECT string_agg(display_name, ',' ORDER BY display_name) INTO v_text FROM public.site_blog_attachments WHERE post_id IN (v_live, v_draft);
  r := array_append(r, ((v_text = 'Gated guide,Open guide'))::boolean); d := array_append(d, (COALESCE(v_text, '(none)'))::text);
  -- T4
  BEGIN
    PERFORM file_path FROM public.site_blog_attachments LIMIT 1;
    r := array_append(r, (FALSE)::boolean); d := array_append(d, ('file_path readable')::text);
  EXCEPTION WHEN insufficient_privilege THEN r := array_append(r, (TRUE)::boolean); d := array_append(d, ('permission denied (expected)')::text);
  END;
  -- T5
  BEGIN
    PERFORM public.site_record_gated_download(v_gated, 'Anon', 'anon@example.test');
    r := array_append(r, (FALSE)::boolean); d := array_append(d, ('anon could call it')::text);
  EXCEPTION WHEN insufficient_privilege THEN r := array_append(r, (TRUE)::boolean); d := array_append(d, ('permission denied (expected)')::text);
  END;
  -- T8
  r := array_append(r, ((public.site_blog_slug_status('v1263-test-archived') = 'archived' AND public.site_blog_slug_status('v1263-test-draft') = 'missing'
             AND public.site_blog_slug_status('v1263-test-future') = 'missing' AND public.site_blog_slug_status('v1263-test-live') = 'published'))::boolean);
  d := array_append(d, ('archived / draft / future / live')::text);
  -- T9
  BEGIN
    UPDATE public.site_blog_posts SET title = 'hacked' WHERE slug = 'v1263-test-live';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    r := array_append(r, ((v_count = 0))::boolean); d := array_append(d, (v_count || ' row(s) updated')::text);
  EXCEPTION WHEN insufficient_privilege THEN r := array_append(r, (TRUE)::boolean); d := array_append(d, ('permission denied (expected)')::text);
  END;

  EXECUTE 'RESET ROLE';

  DELETE FROM public.site_enquiries WHERE email = 'v1263-test@example.test';
  DELETE FROM public.site_blog_posts WHERE slug LIKE 'v1263-test-%';

  INSERT INTO v1263_results VALUES
    ('T6 gated download records lead + returns private path', r[1], d[1]),
    ('T7 gated download refuses open doc / bad email', r[2], d[2]),
    ('T1 anon sees published posts only', r[3], d[3]),
    ('T2 anon cannot read draft column', r[4], d[4]),
    ('T3 anon sees live attachments of visible posts only', r[5], d[5]),
    ('T4 anon cannot read file paths', r[6], d[6]),
    ('T5 anon cannot call gated-download function', r[7], d[7]),
    ('T8 slug status hides drafts/scheduled, flags archived', r[8], d[8]),
    ('T9 anon cannot write posts', r[9], d[9]);
END $$;

SELECT CASE WHEN passed THEN 'PASS' ELSE 'FAIL' END AS result, test, detail FROM v1263_results ORDER BY test;
