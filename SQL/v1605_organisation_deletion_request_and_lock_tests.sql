-- ============================================================================
-- v1605 tests: v1358 Slice 3a — deletion request, approval, confirmation, 30-day lock, cancel, reminder, lapse.
-- Run after v1604 (and Admin v266). Everything runs in one transaction that ROLLS BACK at the end: nothing is
-- kept, no table is created (state lives in transaction settings). The worker is not woken (its address is
-- cleared inside the transaction). Each block raises an exception or prints a NOTICE "PASS …"; blocks that need
-- data the database does not have print "SKIP …".
--
--   D1  owner request: reason required, one open request, non-owner refused
--   D2  decisions: legal hold blocks approval; approval issues a link (hash only) and queues the email;
--       a decided request cannot be decided again; rejection tells the owner
--   D3  confirmation: wrong / expired token refused; right token locks the organisation (account + request),
--       integrations off, subscription cancelled, final export queued, members told
--   D4  lock status for the app gate (owner / member); cancel undoes the lock and switches integrations back on
--   D5  lifecycle: day-5 reminder issues a new link once; expired confirmation lapses; dry run changes nothing
--   D6  catalogue rows, menu label
-- ============================================================================

BEGIN;

UPDATE public.background_job_config SET functions_base_url = NULL WHERE id;

DO $$
DECLARE
  v_acc  UUID;
  v_auth UUID;
BEGIN
  v_acc := (SELECT a.id FROM public.accounts a JOIN public.users u ON u.id = a.owner_user_id
             WHERE NOT COALESCE(a.is_deleted, FALSE) AND u.auth_user_id IS NOT NULL
               AND EXISTS (SELECT 1 FROM auth.users au WHERE au.id = u.auth_user_id)
               AND EXISTS (SELECT 1 FROM public.projects p WHERE p.account_id = a.id)
             ORDER BY a.created_at LIMIT 1);
  v_auth := (SELECT u.auth_user_id FROM public.accounts a JOIN public.users u ON u.id = a.owner_user_id WHERE a.id = v_acc);
  PERFORM set_config('deltest.account', COALESCE(v_acc::TEXT, ''), true);
  PERFORM set_config('deltest.owner_auth', COALESCE(v_auth::TEXT, ''), true);
  IF v_acc IS NOT NULL THEN
    UPDATE public.users SET last_active_account_id = v_acc WHERE auth_user_id = v_auth;
    UPDATE public.accounts SET legal_hold = FALSE, locked_at = NULL, deletion_due_at = NULL WHERE id = v_acc;
    DELETE FROM public.organisation_data_requests WHERE account_id = v_acc;
  END IF;
END $$;

-- D1 ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_acc  UUID := NULLIF(current_setting('deltest.account'), '')::UUID;
  v_auth TEXT := current_setting('deltest.owner_auth');
  v_res  JSONB;
  v_msg  TEXT;
BEGIN
  IF v_acc IS NULL THEN RAISE NOTICE 'SKIP D1–D5 (no organisation with a project and an owner who can sign in)'; RETURN; END IF;
  PERFORM set_config('request.jwt.claims', '{}', true);
  BEGIN PERFORM public.organisation_data_request_deletion('Test');
  EXCEPTION WHEN insufficient_privilege THEN v_msg := 'refused'; END;
  ASSERT v_msg = 'refused', 'D1 non-owner refused';

  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_auth, 'role', 'authenticated')::TEXT, true);
  v_msg := NULL;
  BEGIN PERFORM public.organisation_data_request_deletion('   ');
  EXCEPTION WHEN raise_exception THEN v_msg := SQLERRM; END;
  ASSERT v_msg = 'Please give a reason', 'D1 reason required';

  v_res := public.organisation_data_request_deletion('Moving to another tool');
  ASSERT v_res ->> 'status' = 'pending_approval', 'D1 pending approval';
  PERFORM set_config('deltest.request', v_res ->> 'id', true);
  v_msg := NULL;
  BEGIN PERFORM public.organisation_data_request_deletion('Again');
  EXCEPTION WHEN raise_exception THEN v_msg := SQLERRM; END;
  ASSERT v_msg = 'A deletion request for this organisation is already open', 'D1 one open request';
  ASSERT EXISTS (SELECT 1 FROM jsonb_array_elements(public.organisation_data_requests_list() -> 'requests') r
                  WHERE r ->> 'id' = v_res ->> 'id' AND r ->> 'kind' = 'deletion' AND r ->> 'reason' = 'Moving to another tool'), 'D1 owner sees it';
  PERFORM set_config('request.jwt.claims', '{}', true);
  RAISE NOTICE 'PASS D1 owner request';
END $$;

-- D2 ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_acc UUID := NULLIF(current_setting('deltest.account'), '')::UUID;
  v_req UUID := NULLIF(current_setting('deltest.request', true), '')::UUID;
  v_msg TEXT;
  v_rej UUID;
BEGIN
  IF v_req IS NULL THEN RETURN; END IF;
  UPDATE public.accounts SET legal_hold = TRUE WHERE id = v_acc;
  BEGIN PERFORM public.organisation_deletion_decide_apply(v_req, TRUE, 'Approved', NULL);
  EXCEPTION WHEN OTHERS THEN v_msg := SQLERRM; END;
  ASSERT v_msg = 'This organisation is on legal hold, so its deletion cannot be approved', 'D2 legal hold blocks approval';
  UPDATE public.accounts SET legal_hold = FALSE WHERE id = v_acc;

  PERFORM public.organisation_deletion_decide_apply(v_req, TRUE, 'Confirmed with the customer', NULL);
  ASSERT (SELECT status = 'awaiting_confirmation' AND confirm_token_hash ~ '^[0-9a-f]{64}$'
                 AND confirm_expires_at BETWEEN NOW() + INTERVAL '6 days 23 hours' AND NOW() + INTERVAL '7 days 1 hour'
            FROM public.organisation_data_requests WHERE id = v_req), 'D2 approved, link hash stored, 7 days';
  ASSERT EXISTS (SELECT 1 FROM public.background_job_queue q WHERE q.job_code = 'organisation.deletion_notify'
                  AND q.payload ->> 'request_id' = v_req::TEXT AND q.payload ->> 'kind' = 'confirm'
                  AND length(q.payload ->> 'token') = 64), 'D2 confirmation email queued with the plain token';
  ASSERT (public.organisation_deletion_notify_context(v_req) ->> 'owner_email') IS NOT NULL, 'D2 email context';

  v_msg := NULL;
  BEGIN PERFORM public.organisation_deletion_decide_apply(v_req, FALSE, 'Changed my mind', NULL);
  EXCEPTION WHEN OTHERS THEN v_msg := SQLERRM; END;
  ASSERT v_msg LIKE 'Only a request waiting for approval can be decided%', 'D2 decided only once';

  -- A second organisation-free check of rejection on a throwaway request.
  v_rej := gen_random_uuid();
  INSERT INTO public.organisation_data_requests (id, account_id, kind, status, reason)
  VALUES (v_rej, v_acc, 'deletion', 'cancelled', 'x');
  UPDATE public.organisation_data_requests SET status = 'pending_approval' WHERE id = v_rej;
  UPDATE public.organisation_data_requests SET status = 'cancelled' WHERE id = v_req;
  PERFORM public.organisation_deletion_decide_apply(v_rej, FALSE, 'Contract still running', NULL);
  ASSERT (SELECT status FROM public.organisation_data_requests WHERE id = v_rej) = 'rejected', 'D2 rejected';
  ASSERT EXISTS (SELECT 1 FROM public.notifications n WHERE n.related_entity_id = v_rej
                  AND n.notification_data ->> 'message_key' = 'organisation_deletion_rejected'), 'D2 owner told of the rejection';
  UPDATE public.organisation_data_requests SET status = 'awaiting_confirmation' WHERE id = v_req;
  RAISE NOTICE 'PASS D2 decisions';
END $$;

-- D3 ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_acc  UUID := NULLIF(current_setting('deltest.account'), '')::UUID;
  v_req  UUID := NULLIF(current_setting('deltest.request', true), '')::UUID;
  v_auth TEXT := current_setting('deltest.owner_auth');
  v_tok  TEXT := 'deltest-known-token';
  v_msg  TEXT;
  v_res  JSONB;
BEGIN
  IF v_req IS NULL THEN RETURN; END IF;
  -- A known token (the real one only exists in the queued email).
  UPDATE public.organisation_data_requests
     SET confirm_token_hash = encode(extensions.digest(v_tok, 'sha256'), 'hex') WHERE id = v_req;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_auth, 'role', 'authenticated')::TEXT, true);

  BEGIN PERFORM public.organisation_data_confirm_deletion('wrong');
  EXCEPTION WHEN raise_exception THEN v_msg := SQLERRM; END;
  ASSERT v_msg LIKE 'This confirmation link is not valid any more%', 'D3 wrong token refused';

  UPDATE public.organisation_data_requests SET confirm_expires_at = NOW() - INTERVAL '1 minute' WHERE id = v_req;
  v_msg := NULL;
  BEGIN PERFORM public.organisation_data_confirm_deletion(v_tok);
  EXCEPTION WHEN raise_exception THEN v_msg := SQLERRM; END;
  ASSERT v_msg = 'This confirmation link has expired.', 'D3 expired token refused';
  UPDATE public.organisation_data_requests SET confirm_expires_at = NOW() + INTERVAL '1 day' WHERE id = v_req;

  v_res := public.organisation_data_confirm_deletion(v_tok);
  ASSERT v_res ->> 'status' = 'locked', 'D3 locked';
  ASSERT (SELECT locked_at IS NOT NULL AND deletion_due_at BETWEEN NOW() + INTERVAL '29 days 23 hours' AND NOW() + INTERVAL '30 days 1 hour'
            FROM public.accounts WHERE id = v_acc), 'D3 organisation locked for 30 days';
  ASSERT (SELECT confirm_token_hash IS NULL AND final_export_request_id IS NOT NULL AND lock_state ? 'members'
            FROM public.organisation_data_requests WHERE id = v_req), 'D3 token cleared, final export, lock state';
  ASSERT EXISTS (SELECT 1 FROM public.organisation_data_requests e
                  WHERE e.id = (SELECT final_export_request_id FROM public.organisation_data_requests WHERE id = v_req)
                    AND e.kind = 'export' AND e.status = 'queued'), 'D3 final export queued';
  ASSERT NOT EXISTS (SELECT 1 FROM public.platform_subscriptions
                      WHERE account_id = v_acc AND status IN ('active', 'trial', 'trialing', 'past_due')), 'D3 subscription cancelled';
  IF to_regclass('public.api_credentials') IS NOT NULL THEN
    ASSERT NOT EXISTS (SELECT 1 FROM public.api_credentials WHERE account_id = v_acc AND revoked_at IS NULL), 'D3 API keys off';
  END IF;
  ASSERT EXISTS (SELECT 1 FROM public.notifications n WHERE n.related_entity_id = v_req
                  AND n.notification_data ->> 'message_key' = 'organisation_deletion_locked'), 'D3 owner told';
  PERFORM set_config('request.jwt.claims', '{}', true);
  RAISE NOTICE 'PASS D3 confirmation and lock';
END $$;

-- D4 ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_acc  UUID := NULLIF(current_setting('deltest.account'), '')::UUID;
  v_req  UUID := NULLIF(current_setting('deltest.request', true), '')::UUID;
  v_auth TEXT := current_setting('deltest.owner_auth');
  v_st   JSONB;
  v_res  JSONB;
BEGIN
  IF v_req IS NULL THEN RETURN; END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_auth, 'role', 'authenticated')::TEXT, true);
  v_st := public.organisation_lock_status();
  ASSERT (v_st ->> 'locked')::BOOLEAN AND (v_st ->> 'is_owner')::BOOLEAN, 'D4 owner sees the lock';
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::TEXT, true);
  ASSERT NOT COALESCE((public.organisation_lock_status() ->> 'locked')::BOOLEAN, FALSE), 'D4 a stranger has no locked organisation';

  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_auth, 'role', 'authenticated')::TEXT, true);
  v_res := public.organisation_data_cancel_deletion();
  ASSERT v_res ->> 'was' = 'locked' AND v_res ->> 'status' = 'cancelled', 'D4 cancelled from locked';
  ASSERT (SELECT locked_at IS NULL AND deletion_due_at IS NULL FROM public.accounts WHERE id = v_acc), 'D4 unlocked';
  ASSERT NOT COALESCE((public.organisation_lock_status() ->> 'locked')::BOOLEAN, FALSE), 'D4 gate open again';
  IF to_regclass('public.api_credentials') IS NOT NULL THEN
    ASSERT (SELECT count(*) FROM public.api_credentials WHERE account_id = v_acc AND revoked_at IS NULL)
         = (SELECT jsonb_array_length(COALESCE(lock_state -> 'api_credentials', '[]'::jsonb)) FROM public.organisation_data_requests WHERE id = v_req),
           'D4 the same API keys back on';
  END IF;
  ASSERT EXISTS (SELECT 1 FROM public.notifications n WHERE n.related_entity_id = v_req
                  AND n.notification_data ->> 'message_key' = 'organisation_deletion_cancelled'), 'D4 owner told';
  PERFORM set_config('request.jwt.claims', '{}', true);
  RAISE NOTICE 'PASS D4 lock status and cancel';
END $$;

-- D5 ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_acc  UUID := NULLIF(current_setting('deltest.account'), '')::UUID;
  v_soon UUID := gen_random_uuid();
  v_late UUID := gen_random_uuid();
  v_res  JSONB;
BEGIN
  IF v_acc IS NULL THEN RETURN; END IF;
  INSERT INTO public.organisation_data_requests (id, account_id, kind, status, reason, confirm_expires_at, confirm_token_hash)
  VALUES (v_soon, v_acc, 'deletion', 'awaiting_confirmation', 'x', NOW() + INTERVAL '1 day', 'old');
  v_res := public.run_organisation_deletion_lifecycle('{"dry_run": true}'::jsonb);
  ASSERT (v_res ->> 'reminded')::INT >= 1 AND (SELECT confirm_reminded_at IS NULL FROM public.organisation_data_requests WHERE id = v_soon), 'D5 dry run changes nothing';
  v_res := public.run_organisation_deletion_lifecycle('{}'::jsonb);
  ASSERT (SELECT confirm_reminded_at IS NOT NULL AND confirm_token_hash <> 'old' FROM public.organisation_data_requests WHERE id = v_soon), 'D5 reminder with a new link';
  ASSERT EXISTS (SELECT 1 FROM public.background_job_queue q WHERE q.job_code = 'organisation.deletion_notify'
                  AND q.payload ->> 'request_id' = v_soon::TEXT AND q.payload ->> 'kind' = 'reminder'), 'D5 reminder email queued';
  PERFORM public.run_organisation_deletion_lifecycle('{}'::jsonb);
  ASSERT (SELECT count(*) FROM public.background_job_queue q WHERE q.job_code = 'organisation.deletion_notify'
           AND q.payload ->> 'request_id' = v_soon::TEXT AND q.payload ->> 'kind' = 'reminder') = 1, 'D5 reminded once';

  UPDATE public.organisation_data_requests SET status = 'cancelled' WHERE id = v_soon;
  INSERT INTO public.organisation_data_requests (id, account_id, kind, status, reason, confirm_expires_at, confirm_token_hash)
  VALUES (v_late, v_acc, 'deletion', 'awaiting_confirmation', 'x', NOW() - INTERVAL '1 minute', 'abc');
  PERFORM public.run_organisation_deletion_lifecycle('{}'::jsonb);
  ASSERT (SELECT status = 'lapsed' AND confirm_token_hash IS NULL FROM public.organisation_data_requests WHERE id = v_late), 'D5 lapsed';
  ASSERT EXISTS (SELECT 1 FROM public.notifications n WHERE n.related_entity_id = v_late
                  AND n.notification_data ->> 'message_key' = 'organisation_deletion_lapsed'), 'D5 owner told it lapsed';
  RAISE NOTICE 'PASS D5 reminder and lapse';
END $$;

-- D6 ─────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  ASSERT EXISTS (SELECT 1 FROM public.background_jobs WHERE code = 'organisation.deletion_notify' AND kind = 'handler' AND cron IS NULL), 'D6 notify job';
  ASSERT EXISTS (SELECT 1 FROM public.background_jobs WHERE code = 'organisation.deletion_lifecycle' AND kind = 'sql'
                  AND sql_function = 'public.run_organisation_deletion_lifecycle'), 'D6 lifecycle job';
  ASSERT (SELECT menu_label FROM public.menu_items WHERE menu_code = 'plat_acct_data_export') = 'Data export & deletion', 'D6 menu label';
  RAISE NOTICE 'PASS D6 catalogue and menu';
END $$;

DO $$ BEGIN RAISE NOTICE 'v1605: all organisation deletion (slice 3a) tests passed (rolling back)'; END $$;

ROLLBACK;
