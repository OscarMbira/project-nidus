-- ============================================================================
-- v1607 tests: v1358 Slice 3b — day-30 deletion, kept records, members (D8), certificate data.
-- Run after v1606 (and Admin v267). Everything runs in one transaction that ROLLS BACK at the end: nothing is
-- kept, no table is created (state lives in transaction settings). The worker is not woken (its address is
-- cleared inside the transaction). The deletion runs on a throwaway organisation made here; a second, real
-- organisation is only counted before and after.
--
--   E1  delete order: children before parents, no kept table / accounts / users in the plan
--   E2  legal hold: deletion cannot begin, and a step pauses
--   E3  begin: record written, request deleting, worker queued, members and recipients captured, idempotent
--   E4  steps delete everything of the organisation
--   E5  finish: nothing left, kept rows counted, member without another organisation anonymised, owner kept,
--       organisation row anonymised, the other organisation untouched; certificate data
--   E6  certificate saved: recipients' emails cleared; nothing left for the worker
--   E7  catalogue rows and messages
-- ============================================================================

BEGIN;

UPDATE public.background_job_config SET functions_base_url = NULL WHERE id;

-- Setup ──────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_owner  UUID;
  v_acc    UUID := gen_random_uuid();
  v_proj   UUID := gen_random_uuid();
  v_mem    UUID := gen_random_uuid();
  v_req    UUID := gen_random_uuid();
  v_status UUID;
  v_role   UUID;
  v_other  UUID;
BEGIN
  -- The owner already owns a live organisation (so they belong to another one) and can sign in.
  v_owner := (SELECT a.owner_user_id FROM public.accounts a JOIN public.users u ON u.id = a.owner_user_id
               WHERE NOT COALESCE(a.is_deleted, FALSE) AND u.auth_user_id IS NOT NULL
                 AND EXISTS (SELECT 1 FROM auth.users au WHERE au.id = u.auth_user_id)
               ORDER BY a.created_at LIMIT 1);
  v_status := (SELECT s.id FROM public.project_statuses s WHERE s.is_active ORDER BY s.created_at LIMIT 1);
  v_role := (SELECT r.id FROM public.roles r ORDER BY r.created_at LIMIT 1);
  IF v_owner IS NULL OR v_status IS NULL OR v_role IS NULL THEN
    PERFORM set_config('deltest.account', '', true);
    RETURN;
  END IF;

  INSERT INTO public.accounts (id, owner_user_id, account_name, account_code, account_type, is_active, organisation_verified, product_edition, created_by)
  VALUES (v_acc, v_owner, 'v1607 Example Freight Ltd', 'V1607' || (1000 + floor(random() * 9000))::INT, 'company', TRUE, TRUE, 'planner', v_owner);
  INSERT INTO public.platform_subscriptions (user_id, account_id, plan_type, status, is_trial, trial_start, trial_end)
  VALUES ((SELECT u.auth_user_id FROM public.users u WHERE u.id = v_owner), v_acc, 'planner', 'trialing', TRUE, NOW(), NOW() + INTERVAL '14 days');
  INSERT INTO public.projects (id, project_name, project_code, account_id, owner_user_id, status_id, created_by)
  VALUES (v_proj, 'v1607 project', 'V1607-' || (floor(random() * 99999))::INT, v_acc, v_owner, v_status, v_owner);
  UPDATE public.platform_subscriptions SET status = 'cancelled', cancelled_at = NOW() WHERE account_id = v_acc;

  -- A member with no other organisation and no sign-in (so D8 removes them).
  INSERT INTO public.users (id, email, full_name) VALUES (v_mem, 'v1607-member-' || v_mem::TEXT || '@company.example', 'Team Member');
  INSERT INTO public.user_roles (user_id, role_id, project_id, is_active) VALUES (v_mem, v_role, v_proj, TRUE);

  -- Locked 31 days ago, due now.
  INSERT INTO public.organisation_data_requests (id, account_id, kind, status, requested_by_user_id, reason,
                                                 decided_at, decision_reason, confirmed_at, confirmed_by_user_id,
                                                 locked_at, deletion_due_at, lock_state)
  VALUES (v_req, v_acc, 'deletion', 'locked', v_owner, 'v1607 test', NOW() - INTERVAL '32 days', 'Approved in a test',
          NOW() - INTERVAL '31 days', v_owner, NOW() - INTERVAL '31 days', NOW() - INTERVAL '1 minute',
          jsonb_build_object('members', jsonb_build_array(v_mem)));
  UPDATE public.accounts SET locked_at = NOW() - INTERVAL '31 days', lock_reason = 'deletion', deletion_due_at = NOW() - INTERVAL '1 minute'
   WHERE id = v_acc;

  -- Another organisation, only counted.
  v_other := (SELECT a.id FROM public.accounts a WHERE a.id <> v_acc AND NOT COALESCE(a.is_deleted, FALSE)
                 AND EXISTS (SELECT 1 FROM public.projects p WHERE p.account_id = a.id) ORDER BY a.created_at LIMIT 1);

  PERFORM set_config('deltest.account', v_acc::TEXT, true);
  PERFORM set_config('deltest.owner', v_owner::TEXT, true);
  PERFORM set_config('deltest.owner_email', (SELECT u.email FROM public.users u WHERE u.id = v_owner), true);
  PERFORM set_config('deltest.member', v_mem::TEXT, true);
  PERFORM set_config('deltest.request', v_req::TEXT, true);
  PERFORM set_config('deltest.project', v_proj::TEXT, true);
  PERFORM set_config('deltest.other', COALESCE(v_other::TEXT, ''), true);
  PERFORM set_config('deltest.other_projects', (SELECT count(*)::TEXT FROM public.projects p WHERE p.account_id = v_other), true);
  PERFORM set_config('deltest.other_roles', (SELECT count(*)::TEXT FROM public.user_roles ur JOIN public.projects p ON p.id = ur.project_id
                                               WHERE p.account_id = v_other), true);
END $$;

-- E1 ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_acc  UUID := NULLIF(current_setting('deltest.account'), '')::UUID;
  v_plan JSONB;
  v_ur   BIGINT;
  v_pr   BIGINT;
BEGIN
  IF v_acc IS NULL THEN RAISE NOTICE 'SKIP E1–E6 (needs an organisation owner who can sign in, a project status and a role)'; RETURN; END IF;
  v_plan := public.organisation_deletion_plan(v_acc);
  ASSERT jsonb_array_length(v_plan) > 0, 'E1 plan has tables';
  v_ur := (SELECT e.n FROM jsonb_array_elements(v_plan) WITH ORDINALITY e(value, n) WHERE e.value ->> 'table' = 'user_roles');
  v_pr := (SELECT e.n FROM jsonb_array_elements(v_plan) WITH ORDINALITY e(value, n) WHERE e.value ->> 'table' = 'projects');
  ASSERT v_ur IS NOT NULL AND v_pr IS NOT NULL AND v_ur < v_pr, 'E1 user_roles before projects';
  ASSERT NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_plan) e
                      WHERE e ->> 'table' IN ('accounts', 'users', 'platform_subscriptions', 'payment_transactions', 'audit_log',
                                              'organisation_deletion_records', 'background_job_queue')), 'E1 nothing kept is in the plan';
  RAISE NOTICE 'PASS E1 delete order (% tables)', jsonb_array_length(v_plan);
END $$;

-- E2 ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_acc UUID := NULLIF(current_setting('deltest.account'), '')::UUID;
  v_req UUID := NULLIF(current_setting('deltest.request', true), '')::UUID;
  v_msg TEXT;
BEGIN
  IF v_acc IS NULL THEN RETURN; END IF;
  UPDATE public.accounts SET legal_hold = TRUE WHERE id = v_acc;
  BEGIN PERFORM public.organisation_deletion_begin(v_req);
  EXCEPTION WHEN OTHERS THEN v_msg := SQLERRM; END;
  ASSERT v_msg = 'The organisation is on legal hold', 'E2 legal hold blocks the start';
  ASSERT (public.run_organisation_deletion_lifecycle('{"dry_run": true}'::jsonb) ->> 'paused_by_legal_hold')::INTEGER >= 1, 'E2 counted as paused';
  UPDATE public.accounts SET legal_hold = FALSE WHERE id = v_acc;
  RAISE NOTICE 'PASS E2 legal hold';
END $$;

-- E3 ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_acc UUID := NULLIF(current_setting('deltest.account'), '')::UUID;
  v_req UUID := NULLIF(current_setting('deltest.request', true), '')::UUID;
  v_mem TEXT := current_setting('deltest.member', true);
  v_rec UUID;
  d     public.organisation_deletion_records;
BEGIN
  IF v_acc IS NULL THEN RETURN; END IF;
  v_rec := public.organisation_deletion_begin(v_req);
  d := (SELECT x FROM public.organisation_deletion_records x WHERE x.id = v_rec);
  ASSERT d.status = 'deleting' AND d.organisation_name = 'v1607 Example Freight Ltd' AND d.reason = 'v1607 test'
         AND d.confirmed_at IS NOT NULL AND jsonb_array_length(d.plan) > 0, 'E3 record written';
  ASSERT (SELECT status FROM public.organisation_data_requests WHERE id = v_req) = 'deleting', 'E3 request deleting';
  ASSERT EXISTS (SELECT 1 FROM public.background_job_queue q WHERE q.job_code = 'organisation.deletion_execute'
                  AND q.payload ->> 'record_id' = v_rec::TEXT AND q.status = 'pending'), 'E3 worker queued';
  ASSERT EXISTS (SELECT 1 FROM jsonb_array_elements(d.members) m
                  WHERE m ->> 'user_id' = v_mem AND NOT (m ->> 'other_org')::BOOLEAN AND NOT (m ->> 'simulator')::BOOLEAN), 'E3 member captured, no other organisation';
  ASSERT EXISTS (SELECT 1 FROM jsonb_array_elements(d.members) m
                  WHERE (m ->> 'is_owner')::BOOLEAN AND (m ->> 'other_org')::BOOLEAN), 'E3 owner belongs to another organisation';
  ASSERT EXISTS (SELECT 1 FROM jsonb_array_elements(d.recipients) e WHERE e ->> 'email' = current_setting('deltest.owner_email')), 'E3 owner gets the certificate';
  ASSERT public.organisation_deletion_begin(v_req) = v_rec, 'E3 begin is idempotent';
  PERFORM set_config('deltest.record', v_rec::TEXT, true);
  RAISE NOTICE 'PASS E3 begin';
END $$;

-- E4 ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_acc UUID := NULLIF(current_setting('deltest.account'), '')::UUID;
  v_rec UUID := NULLIF(current_setting('deltest.record', true), '')::UUID;
  v_res JSONB;
  i     INTEGER := 0;
BEGIN
  IF v_rec IS NULL THEN RETURN; END IF;
  UPDATE public.accounts SET legal_hold = TRUE WHERE id = v_acc;
  ASSERT (public.organisation_deletion_step(v_rec, 5000) ->> 'held')::BOOLEAN, 'E4 a step pauses on legal hold';
  UPDATE public.accounts SET legal_hold = FALSE WHERE id = v_acc;

  -- Files are the worker's job; mark them done here.
  PERFORM public.organisation_deletion_files_done(v_rec, (SELECT files_total FROM public.organisation_deletion_records WHERE id = v_rec), '[]'::jsonb);
  LOOP
    i := i + 1;
    v_res := public.organisation_deletion_step(v_rec, 20000);
    ASSERT NOT COALESCE((v_res ->> 'stalled')::BOOLEAN, FALSE), format('E4 deletion stalled: %s', v_res ->> 'errors');
    EXIT WHEN (v_res ->> 'done')::BOOLEAN OR i >= 30;
  END LOOP;
  ASSERT (v_res ->> 'done')::BOOLEAN, format('E4 done after %s steps: %s', i, v_res);
  ASSERT NOT EXISTS (SELECT 1 FROM public.projects WHERE account_id = v_acc), 'E4 projects deleted';
  ASSERT NOT EXISTS (SELECT 1 FROM public.user_roles WHERE project_id = current_setting('deltest.project')::UUID), 'E4 project roles deleted';
  RAISE NOTICE 'PASS E4 steps (% call(s), % rows)', i, (SELECT rows_deleted FROM public.organisation_deletion_records WHERE id = v_rec);
END $$;

-- E5 ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_acc   UUID := NULLIF(current_setting('deltest.account'), '')::UUID;
  v_rec   UUID := NULLIF(current_setting('deltest.record', true), '')::UUID;
  v_mem   UUID := NULLIF(current_setting('deltest.member', true), '')::UUID;
  v_owner UUID := NULLIF(current_setting('deltest.owner', true), '')::UUID;
  v_other UUID := NULLIF(current_setting('deltest.other', true), '')::UUID;
  v_cert  JSONB;
  d       public.organisation_deletion_records;
BEGIN
  IF v_rec IS NULL THEN RETURN; END IF;
  v_cert := public.organisation_deletion_finish(v_rec);
  ASSERT NOT COALESCE((v_cert ->> 'retry')::BOOLEAN, FALSE), format('E5 rows left: %s', v_cert -> 'left');
  d := (SELECT x FROM public.organisation_deletion_records x WHERE x.id = v_rec);
  ASSERT d.status = 'completed' AND d.finished_at IS NOT NULL AND d.members = '[]'::jsonb AND d.files = '[]'::jsonb, 'E5 record completed, members cleared';
  ASSERT EXISTS (SELECT 1 FROM jsonb_array_elements(d.tables_deleted) t WHERE t ->> 'table' = 'projects' AND (t ->> 'rows')::INTEGER = 1), 'E5 projects counted';
  ASSERT EXISTS (SELECT 1 FROM jsonb_array_elements(d.kept) k WHERE k ->> 'table' = 'platform_subscriptions' AND (k ->> 'rows')::INTEGER >= 1), 'E5 billing kept and counted';
  ASSERT EXISTS (SELECT 1 FROM public.platform_subscriptions WHERE account_id = v_acc), 'E5 billing row still there';
  ASSERT d.members_removed = 1 AND d.members_kept >= 1, format('E5 members removed %s kept %s', d.members_removed, d.members_kept);
  ASSERT (SELECT email = 'deleted-' || v_mem::TEXT || '@deleted.example' AND full_name = 'Deleted user' FROM public.users WHERE id = v_mem), 'E5 member anonymised';
  ASSERT (SELECT email FROM public.users WHERE id = v_owner) = current_setting('deltest.owner_email'), 'E5 owner kept';
  ASSERT (SELECT is_deleted AND account_name LIKE 'Deleted organisation %' AND account_code LIKE 'DEL-%' FROM public.accounts WHERE id = v_acc), 'E5 organisation row anonymised';
  ASSERT NOT EXISTS (SELECT 1 FROM public.organisation_data_requests WHERE account_id = v_acc), 'E5 requests deleted (the record is kept)';
  IF v_other IS NOT NULL THEN
    ASSERT (SELECT count(*) FROM public.projects p WHERE p.account_id = v_other)::TEXT = current_setting('deltest.other_projects'), 'E5 other organisation projects untouched';
    ASSERT (SELECT count(*) FROM public.user_roles ur JOIN public.projects p ON p.id = ur.project_id WHERE p.account_id = v_other)::TEXT
           = current_setting('deltest.other_roles'), 'E5 other organisation roles untouched';
  END IF;
  ASSERT v_cert ->> 'organisation' = 'v1607 Example Freight Ltd' AND (v_cert ->> 'table_count')::INTEGER >= 2
         AND (v_cert ->> 'rows_deleted')::BIGINT >= 2 AND v_cert ->> 'deleted_on' IS NOT NULL AND v_cert ->> 'confirmed_on' IS NOT NULL,
         format('E5 certificate data: %s', v_cert);
  ASSERT public.organisation_deletion_finish(v_rec) ->> 'reference' = v_cert ->> 'reference', 'E5 finish is idempotent';
  ASSERT (public.organisation_deletion_context(v_rec) -> 'certificate') IS NOT NULL, 'E5 worker sees the certificate to send';
  RAISE NOTICE 'PASS E5 finish (% tables, % rows deleted; kept: %)', jsonb_array_length(d.tables_deleted), d.rows_deleted, d.kept;
END $$;

-- E6 ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_rec UUID := NULLIF(current_setting('deltest.record', true), '')::UUID;
BEGIN
  IF v_rec IS NULL THEN RETURN; END IF;
  PERFORM public.organisation_deletion_certificate_saved(v_rec, v_rec::TEXT || '/deletion-certificate.pdf', 1);
  ASSERT (SELECT certificate_sent_at IS NOT NULL AND certificate_path IS NOT NULL FROM public.organisation_deletion_records WHERE id = v_rec), 'E6 saved';
  ASSERT NOT EXISTS (SELECT 1 FROM public.organisation_deletion_records d, jsonb_array_elements(d.recipients) e
                      WHERE d.id = v_rec AND e ? 'email'), 'E6 recipient emails cleared';
  ASSERT public.organisation_deletion_context(v_rec) ? 'skip', 'E6 nothing left for the worker';
  RAISE NOTICE 'PASS E6 certificate saved';
END $$;

-- E7 ─────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  ASSERT EXISTS (SELECT 1 FROM public.background_jobs WHERE code = 'organisation.deletion_execute' AND kind = 'handler' AND cron IS NULL), 'E7 execute job';
  ASSERT EXISTS (SELECT 1 FROM public.background_job_messages WHERE message_key = 'organisation_deleted_member'), 'E7 member message';
  ASSERT (SELECT on_delete FROM public.organisation_data_table_rules WHERE table_name = 'background_job_queue') = 'keep', 'E7 job queue kept';
  ASSERT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'organisation-deletion-certificates' AND NOT public), 'E7 private certificates bucket';
  ASSERT NOT public.organisation_person_has_simulator_record(NULL), 'E7 no sign-in, no Simulator record';
  RAISE NOTICE 'PASS E7 catalogue, messages, bucket';
END $$;

DO $$ BEGIN RAISE NOTICE 'v1607: all organisation deletion (slice 3b) tests passed (rolling back)'; END $$;

ROLLBACK;
