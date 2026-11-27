-- ============================================================================
-- v1603 tests: v1358 Slice 2 — legal hold columns, ownership candidates, Admin ownership transfer.
-- Run after v1602 (and Admin v265 for the Admin RPCs, which add only the permission check and audit).
-- Everything runs in one transaction that ROLLS BACK at the end; nothing is kept, no table is created.
-- The worker is not woken (its address is cleared inside the transaction). Each block raises an
-- exception or prints a NOTICE "PASS …"; blocks that need data the database does not have print "SKIP …".
--
--   H1  legal hold columns exist and default to no hold
--   T1  candidates: PMO Admins working in the organisation, never the current owner
--   T2  transfer: refused without a reason, to the owner, or to someone who is not a candidate
--   T3  transfer: owner changed, Account Owner + PMO Admin roles granted, billing delegates revoked,
--       billing audit row written, both owners told
-- ============================================================================

BEGIN;

UPDATE public.background_job_config SET functions_base_url = NULL WHERE id;

-- H1 ─────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  ASSERT (SELECT count(*) FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'accounts'
             AND column_name IN ('legal_hold', 'legal_hold_reason', 'legal_hold_since', 'legal_hold_by_admin')) = 4, 'H1 columns';
  ASSERT (SELECT column_default FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'accounts' AND column_name = 'legal_hold') = 'false', 'H1 default no hold';
  RAISE NOTICE 'PASS H1 legal hold columns';
END $$;

-- Test organisation: an account with a project and an owner; a second user who becomes a PMO Admin there.
DO $$
DECLARE
  v_acc     UUID;
  v_owner   UUID;
  v_new     UUID;
  v_project UUID;
  v_role    UUID;
BEGIN
  v_acc := (SELECT a.id FROM public.accounts a
             WHERE NOT COALESCE(a.is_deleted, FALSE) AND a.owner_user_id IS NOT NULL
               AND EXISTS (SELECT 1 FROM public.projects p WHERE p.account_id = a.id)
             ORDER BY a.created_at LIMIT 1);
  IF v_acc IS NULL THEN RETURN; END IF;
  v_owner := (SELECT owner_user_id FROM public.accounts WHERE id = v_acc);
  v_project := (SELECT p.id FROM public.projects p WHERE p.account_id = v_acc ORDER BY p.created_at LIMIT 1);
  v_new := (SELECT u.id FROM public.users u
             WHERE u.id <> v_owner AND u.auth_user_id IS NOT NULL
               AND NOT COALESCE(u.is_deleted, FALSE) AND COALESCE(u.is_active, TRUE)
             ORDER BY u.created_at LIMIT 1);
  IF v_new IS NULL THEN RETURN; END IF;
  -- Make the second user a PMO Admin with a role on the organisation's project (rolled back at the end).
  PERFORM public.organisation_grant_global_role(v_new, 'pmo_admin');
  v_role := (SELECT r.id FROM public.roles r WHERE r.role_name = 'pmo_admin' AND r.account_id IS NULL AND r.is_active ORDER BY r.created_at LIMIT 1);
  INSERT INTO public.user_roles (user_id, role_id, project_id, is_active) VALUES (v_new, v_role, v_project, TRUE);
  PERFORM set_config('ottest.account', v_acc::TEXT, true);
  PERFORM set_config('ottest.owner', v_owner::TEXT, true);
  PERFORM set_config('ottest.new', v_new::TEXT, true);
END $$;

-- T1 ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_acc   UUID := NULLIF(current_setting('ottest.account', true), '')::UUID;
  v_owner TEXT := current_setting('ottest.owner', true);
  v_new   TEXT := current_setting('ottest.new', true);
  v_c     JSONB;
BEGIN
  IF v_acc IS NULL THEN RAISE NOTICE 'SKIP T1–T3 (no organisation with a project, an owner and a second user)'; RETURN; END IF;
  v_c := public.organisation_owner_candidates(v_acc);
  ASSERT EXISTS (SELECT 1 FROM jsonb_array_elements(v_c) c WHERE c ->> 'user_id' = v_new), 'T1 PMO Admin of the organisation is a candidate';
  ASSERT NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_c) c WHERE c ->> 'user_id' = v_owner), 'T1 the owner is not a candidate';
  ASSERT jsonb_array_length(public.organisation_owner_candidates(gen_random_uuid())) = 0, 'T1 unknown organisation has no candidates';
  RAISE NOTICE 'PASS T1 candidates (% for the test organisation)', jsonb_array_length(v_c);
END $$;

-- T2 ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_acc   UUID := NULLIF(current_setting('ottest.account', true), '')::UUID;
  v_owner UUID := NULLIF(current_setting('ottest.owner', true), '')::UUID;
  v_new   UUID := NULLIF(current_setting('ottest.new', true), '')::UUID;
  v_msg   TEXT;
BEGIN
  IF v_acc IS NULL THEN RETURN; END IF;
  v_msg := NULL;
  BEGIN PERFORM public.organisation_transfer_owner_apply(v_acc, v_new, '  ');
  EXCEPTION WHEN OTHERS THEN v_msg := SQLERRM; END;
  ASSERT v_msg = 'A reason is required', 'T2 reason required';
  v_msg := NULL;
  BEGIN PERFORM public.organisation_transfer_owner_apply(v_acc, v_owner, 'Test');
  EXCEPTION WHEN OTHERS THEN v_msg := SQLERRM; END;
  ASSERT v_msg = 'Choose a different person as the new owner', 'T2 not to the current owner';
  v_msg := NULL;
  BEGIN PERFORM public.organisation_transfer_owner_apply(v_acc, gen_random_uuid(), 'Test');
  EXCEPTION WHEN OTHERS THEN v_msg := SQLERRM; END;
  ASSERT v_msg = 'The new owner must be a PMO Admin who works in this organisation', 'T2 only candidates';
  ASSERT (SELECT owner_user_id FROM public.accounts WHERE id = v_acc) = v_owner, 'T2 nothing changed';
  RAISE NOTICE 'PASS T2 refusals';
END $$;

-- T3 ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_acc   UUID := NULLIF(current_setting('ottest.account', true), '')::UUID;
  v_owner UUID := NULLIF(current_setting('ottest.owner', true), '')::UUID;
  v_new   UUID := NULLIF(current_setting('ottest.new', true), '')::UUID;
  v_res   JSONB;
BEGIN
  IF v_acc IS NULL THEN RETURN; END IF;
  INSERT INTO public.account_billing_delegates (account_id, user_id, granted_by_user_id, is_active)
  VALUES (v_acc, v_new, v_owner, TRUE)
  ON CONFLICT (account_id, user_id) DO UPDATE SET is_active = TRUE, revoked_at = NULL;

  v_res := public.organisation_transfer_owner_apply(v_acc, v_new, 'The previous owner has left');
  ASSERT v_res ->> 'previous_owner_user_id' = v_owner::TEXT AND v_res ->> 'new_owner_user_id' = v_new::TEXT, 'T3 result';
  ASSERT (SELECT owner_user_id FROM public.accounts WHERE id = v_acc) = v_new, 'T3 owner changed';
  ASSERT EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id
                  WHERE ur.user_id = v_new AND r.role_name = 'account_owner' AND ur.is_active), 'T3 Account Owner role';
  ASSERT NOT EXISTS (SELECT 1 FROM public.account_billing_delegates WHERE account_id = v_acc AND is_active), 'T3 delegates revoked';
  ASSERT EXISTS (SELECT 1 FROM public.account_billing_audit_log
                  WHERE account_id = v_acc AND action = 'transfer_ownership' AND target_user_id = v_new
                    AND metadata ->> 'by' = 'system_admin'), 'T3 billing audit row';
  ASSERT EXISTS (SELECT 1 FROM public.notifications n WHERE n.user_id = v_new
                  AND n.notification_data ->> 'message_key' = 'organisation_owner_transferred_to_you'), 'T3 new owner told';
  ASSERT EXISTS (SELECT 1 FROM public.notifications n WHERE n.user_id = v_owner
                  AND n.notification_data ->> 'message_key' = 'organisation_owner_transferred_from_you'), 'T3 previous owner told';
  RAISE NOTICE 'PASS T3 transfer';
END $$;

DO $$ BEGIN RAISE NOTICE 'v1603: all legal hold and ownership transfer tests passed (rolling back)'; END $$;

ROLLBACK;
