-- ============================================================================
-- v1601 tests: v1358 Slice 1 — organisation data export. Run after v1600.
-- Everything runs in one transaction that ROLLS BACK at the end: nothing is kept, no table is created
-- (test state lives in transaction settings). The worker is not woken (its address is cleared inside the
-- transaction). Each block raises an exception (the editor shows the failing test) or a NOTICE "PASS …";
-- blocks that need data the database does not have print "SKIP …".
--
--   E1  scope: accounts / projects at depth 0, foreign-key children found, users only through the rule
--   E2  columns: secrets never exported, rule allowed_columns respected, ordinary columns kept
--   E3  owner request: queued with a reference and a queue item; a second request refused; non-owner refused
--   E4  worker: begin builds the plan, pages return only this organisation’s rows without secrets,
--       a table outside the plan is refused, checkpoint saved
--   E5  finish: ready for 7 days, owner told once; download allowed only for the owner’s own ready files
--   E6  expiry and stale builds: expired files listed then marked; a stalled build fails
--   E7  catalogue rows and menus
-- ============================================================================

BEGIN;

UPDATE public.background_job_config SET functions_base_url = NULL WHERE id;

-- Test organisation: a non-deleted account with a project and an owner who can sign in.
DO $$
DECLARE
  v_acc  UUID;
  v_auth UUID;
BEGIN
  v_acc := (SELECT a.id FROM public.accounts a
              JOIN public.users u ON u.id = a.owner_user_id
             WHERE NOT COALESCE(a.is_deleted, FALSE)
               AND u.auth_user_id IS NOT NULL
               AND EXISTS (SELECT 1 FROM auth.users au WHERE au.id = u.auth_user_id)
               AND EXISTS (SELECT 1 FROM public.projects p WHERE p.account_id = a.id)
             ORDER BY a.created_at LIMIT 1);
  v_auth := (SELECT u.auth_user_id FROM public.accounts a JOIN public.users u ON u.id = a.owner_user_id WHERE a.id = v_acc);
  PERFORM set_config('odtest.account', COALESCE(v_acc::TEXT, ''), true);
  PERFORM set_config('odtest.owner_auth', COALESCE(v_auth::TEXT, ''), true);
  IF v_acc IS NOT NULL THEN
    -- The owner works in this organisation for the rest of the test.
    UPDATE public.users SET last_active_account_id = v_acc WHERE auth_user_id = v_auth;
  END IF;
END $$;

-- E1 ─────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  ASSERT EXISTS (SELECT 1 FROM public.organisation_data_scope() WHERE table_name = 'accounts' AND depth = 0 AND filter_sql = '{a}.id = $1'), 'E1 accounts row';
  ASSERT EXISTS (SELECT 1 FROM public.organisation_data_scope() WHERE table_name = 'projects' AND depth = 0 AND via = 'account_id'), 'E1 projects by account';
  ASSERT EXISTS (SELECT 1 FROM public.organisation_data_scope() WHERE table_name = 'users' AND via = 'rule'), 'E1 people through the rule';
  ASSERT NOT EXISTS (SELECT 1 FROM public.organisation_data_scope() WHERE via LIKE '% → users'), 'E1 users is never a parent';
  IF to_regclass('public.risk_attachments') IS NOT NULL THEN
    ASSERT EXISTS (SELECT 1 FROM public.organisation_data_scope() WHERE table_name = 'risk_attachments' AND depth >= 1), 'E1 child table found by foreign key';
  END IF;
  ASSERT NOT EXISTS (SELECT 1 FROM public.organisation_data_scope() WHERE filter_sql NOT LIKE '%$1%'), 'E1 every filter is tied to the organisation';
  RAISE NOTICE 'PASS E1 scope (% tables, % by foreign key)',
    (SELECT count(*) FROM public.organisation_data_scope()), (SELECT count(*) FROM public.organisation_data_scope() WHERE depth > 0);
END $$;

-- E2 ─────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  ASSERT NOT public.organisation_export_column_allowed('api_credentials', 'key_hash'), 'E2 hash';
  ASSERT NOT public.organisation_export_column_allowed('webhook_endpoints', 'secret_encrypted'), 'E2 secret';
  ASSERT NOT public.organisation_export_column_allowed('organisation_invitations', 'invitation_token'), 'E2 token';
  ASSERT public.organisation_export_column_allowed('ai_usage', 'tokens_used'), 'E2 tokens_used is not a secret';
  ASSERT public.organisation_export_column_allowed('risks', 'title'), 'E2 ordinary column';
  ASSERT public.organisation_export_column_allowed('users', 'email'), 'E2 allowed people column';
  ASSERT NOT public.organisation_export_column_allowed('users', 'avatar_url'), 'E2 people column outside the allowed list';
  ASSERT public.organisation_export_clean('users', '{"id": "1", "email": "head.of.finance@company.example", "phone": "x"}'::jsonb)
         = '{"id": "1", "email": "head.of.finance@company.example"}'::jsonb, 'E2 clean keeps only allowed columns';
  RAISE NOTICE 'PASS E2 columns';
END $$;

-- E3 ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_acc  UUID := NULLIF(current_setting('odtest.account'), '')::UUID;
  v_auth TEXT := current_setting('odtest.owner_auth');
  v_res  JSONB;
  v_ok   BOOLEAN := FALSE;
BEGIN
  IF v_acc IS NULL THEN RAISE NOTICE 'SKIP E3–E6 (no organisation with a project and an owner who can sign in)'; RETURN; END IF;
  DELETE FROM public.organisation_data_requests WHERE account_id = v_acc;

  -- Not signed in: refused.
  PERFORM set_config('request.jwt.claims', '{}', true);
  BEGIN
    PERFORM public.organisation_data_request_export();
  EXCEPTION WHEN insufficient_privilege THEN v_ok := TRUE;
  END;
  ASSERT v_ok, 'E3 someone who is not the owner is refused';

  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_auth, 'role', 'authenticated')::TEXT, true);
  ASSERT public.organisation_data_owned_account() = v_acc, 'E3 the owner owns the test organisation';
  v_res := public.organisation_data_request_export();
  ASSERT v_res ->> 'status' = 'queued', 'E3 queued';
  ASSERT EXISTS (SELECT 1 FROM public.background_job_queue q
                  WHERE q.job_code = 'organisation.export_build' AND q.payload ->> 'request_id' = v_res ->> 'id'), 'E3 job queued';
  ASSERT (public.organisation_data_requests_list() -> 'requests' -> 0 ->> 'id') = v_res ->> 'id', 'E3 owner sees the request';
  PERFORM set_config('odtest.request', v_res ->> 'id', true);

  v_ok := FALSE;
  BEGIN
    PERFORM public.organisation_data_request_export();
  EXCEPTION WHEN raise_exception THEN v_ok := SQLERRM LIKE 'An export is already being prepared%';
  END;
  ASSERT v_ok, 'E3 one export at a time';
  PERFORM set_config('request.jwt.claims', '{}', true);
  RAISE NOTICE 'PASS E3 owner request (reference %)', COALESCE(v_res ->> 'reference', 'not assigned: Admin v264 not run yet');
END $$;

-- E4 ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_acc   UUID := NULLIF(current_setting('odtest.account'), '')::UUID;
  v_req   UUID := NULLIF(current_setting('odtest.request', true), '')::UUID;
  v_begin JSONB;
  v_rows  JSONB;
  v_ok    BOOLEAN := FALSE;
BEGIN
  IF v_req IS NULL THEN RETURN; END IF;
  v_begin := public.organisation_export_begin(v_req);
  ASSERT v_begin ->> 'account_id' = v_acc::TEXT, 'E4 begin returns the organisation';
  ASSERT (SELECT status FROM public.organisation_data_requests WHERE id = v_req) = 'building', 'E4 building';
  ASSERT EXISTS (SELECT 1 FROM jsonb_array_elements(v_begin -> 'plan' -> 'tables') t WHERE t ->> 'table' = 'projects'), 'E4 projects in the plan';
  ASSERT NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_begin -> 'plan' -> 'tables') t
                      WHERE t ->> 'table' IN ('background_job_queue', 'background_job_runs', 'organisation_data_requests')), 'E4 internal tables left out';
  ASSERT NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_begin -> 'plan' -> 'tables') t, jsonb_array_elements(t -> 'columns') c
                      WHERE NOT public.organisation_export_column_allowed(t ->> 'table', c ->> 'name')), 'E4 dictionary has no secret columns';

  v_rows := public.organisation_export_page(v_req, 'projects', 0, 5000);
  ASSERT jsonb_array_length(v_rows) = (SELECT count(*) FROM public.projects WHERE account_id = v_acc), 'E4 every project of this organisation';
  ASSERT NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_rows) r WHERE r ->> 'account_id' IS DISTINCT FROM v_acc::TEXT), 'E4 no other organisation’s rows';
  ASSERT jsonb_array_length(public.organisation_export_page(v_req, 'projects', 0, 1)) = LEAST(1, jsonb_array_length(v_rows)), 'E4 paging limit';

  BEGIN
    PERFORM public.organisation_export_page(v_req, 'background_job_queue', 0, 10);
  EXCEPTION WHEN raise_exception THEN v_ok := TRUE;
  END;
  ASSERT v_ok, 'E4 a table outside the plan is refused';

  PERFORM public.organisation_export_checkpoint(v_req, '{"table": 3, "part": 2}'::jsonb, '[{"part": 1, "path": "x"}]'::jsonb);
  ASSERT (SELECT checkpoint ->> 'table' FROM public.organisation_data_requests WHERE id = v_req) = '3', 'E4 checkpoint saved';
  ASSERT (public.organisation_export_begin(v_req) -> 'checkpoint' ->> 'part') = '2', 'E4 resume returns the checkpoint';
  RAISE NOTICE 'PASS E4 worker pages (% tables, % projects)', jsonb_array_length(v_begin -> 'plan' -> 'tables'), jsonb_array_length(v_rows);
END $$;

-- E5 ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_acc   UUID := NULLIF(current_setting('odtest.account'), '')::UUID;
  v_req   UUID := NULLIF(current_setting('odtest.request', true), '')::UUID;
  v_auth  TEXT := current_setting('odtest.owner_auth');
  v_owner UUID;
  v_path  TEXT;
BEGIN
  IF v_req IS NULL THEN RETURN; END IF;
  v_owner := public.organisation_export_owner(v_acc);
  v_path := v_acc::TEXT || '/' || v_req::TEXT || '/nidus-export-part-1.zip';
  PERFORM public.organisation_export_finish(v_req, jsonb_build_array(jsonb_build_object('part', 1, 'path', v_path, 'size', 1234)));
  ASSERT (SELECT status FROM public.organisation_data_requests WHERE id = v_req) = 'ready', 'E5 ready';
  ASSERT (SELECT expires_at BETWEEN NOW() + INTERVAL '6 days 23 hours' AND NOW() + INTERVAL '7 days 1 hour'
            FROM public.organisation_data_requests WHERE id = v_req), 'E5 available for 7 days';
  ASSERT (SELECT byte_size FROM public.organisation_data_requests WHERE id = v_req) = 1234, 'E5 size';
  ASSERT (SELECT count(*) FROM public.notifications n WHERE n.user_id = v_owner AND n.related_entity_id = v_req
            AND n.notification_data ->> 'message_key' = 'organisation_export_ready') = 1, 'E5 owner told once';
  ASSERT (public.organisation_export_finish(v_req, '[]'::jsonb) ->> 'skip') = 'true', 'E5 finishing twice does nothing';

  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_auth, 'role', 'authenticated')::TEXT, true);
  ASSERT public.organisation_export_can_read(v_path), 'E5 owner may download';
  ASSERT NOT public.organisation_export_can_read(gen_random_uuid()::TEXT || '/' || v_req::TEXT || '/x.zip'), 'E5 another organisation folder refused';
  ASSERT NOT public.organisation_export_can_read(v_acc::TEXT || '/' || gen_random_uuid()::TEXT || '/x.zip'), 'E5 unknown request refused';
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::TEXT, true);
  ASSERT NOT public.organisation_export_can_read(v_path), 'E5 someone else may not download';
  PERFORM set_config('request.jwt.claims', '{}', true);
  RAISE NOTICE 'PASS E5 finish and download rights';
END $$;

-- E6 ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_acc   UUID := NULLIF(current_setting('odtest.account'), '')::UUID;
  v_req   UUID := NULLIF(current_setting('odtest.request', true), '')::UUID;
  v_stall UUID := gen_random_uuid();
  v_due   JSONB;
BEGIN
  IF v_req IS NULL THEN RETURN; END IF;
  ASSERT NOT EXISTS (SELECT 1 FROM jsonb_array_elements(public.organisation_export_due_expiry() -> 'expired') e
                      WHERE e ->> 'request_id' = v_req::TEXT), 'E6 not expired yet';
  UPDATE public.organisation_data_requests SET expires_at = NOW() - INTERVAL '1 minute' WHERE id = v_req;
  INSERT INTO public.organisation_data_requests (id, account_id, kind, status, updated_at)
  VALUES (v_stall, v_acc, 'export', 'building', NOW() - INTERVAL '25 hours');
  UPDATE public.organisation_data_requests SET updated_at = NOW() - INTERVAL '25 hours' WHERE id = v_stall;
  ASSERT public.organisation_export_has_work(), 'E6 the expiry job has work';
  v_due := public.organisation_export_due_expiry();
  ASSERT EXISTS (SELECT 1 FROM jsonb_array_elements(v_due -> 'expired') e
                  WHERE e ->> 'request_id' = v_req::TEXT AND jsonb_array_length(e -> 'files') = 1), 'E6 expired export listed with its files';
  ASSERT (SELECT status FROM public.organisation_data_requests WHERE id = v_stall) = 'failed', 'E6 stalled build failed';
  PERFORM public.organisation_export_mark_expired(v_req);
  ASSERT (SELECT status = 'expired' AND files = '[]'::jsonb FROM public.organisation_data_requests WHERE id = v_req), 'E6 marked expired';
  RAISE NOTICE 'PASS E6 expiry and stalled builds';
END $$;

-- E7 ─────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  ASSERT EXISTS (SELECT 1 FROM public.background_jobs WHERE code = 'organisation.export_build' AND kind = 'handler' AND cron IS NULL), 'E7 build job (queue only)';
  ASSERT EXISTS (SELECT 1 FROM public.background_jobs WHERE code = 'organisation.export_expire' AND kind = 'handler'
                  AND cron = '30 2 * * *' AND time_basis = 'utc'), 'E7 expiry job (daily, UTC)';
  ASSERT EXISTS (SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_acct_data_export' AND route_path = '/platform/organisation/data-export'), 'E7 Platform menu';
  ASSERT EXISTS (SELECT 1 FROM public.menu_items WHERE menu_code = 'pln_settings_data_export' AND route_path = '/app/settings/data'), 'E7 Planner menu';
  ASSERT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'organisation-exports' AND NOT public), 'E7 private bucket';
  RAISE NOTICE 'PASS E7 catalogue, menus and bucket';
END $$;

DO $$ BEGIN RAISE NOTICE 'v1601: all organisation export tests passed (rolling back)'; END $$;

ROLLBACK;
