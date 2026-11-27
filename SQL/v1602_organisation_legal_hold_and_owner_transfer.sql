-- =============================================================================
-- v1602 — v1358 Slice 2: legal hold and Admin ownership transfer (monorepo side)
-- PRD:  projectprd/v1358_organisation_data_export_and_deletion_PRD.md (D13, D14)
-- Plan: projectplan/v1358_organisation_data_export_and_deletion_plan.md
-- =============================================================================
--   1. accounts.legal_hold (+ reason, since, admin): a system admin places / lifts it through Admin SQL v265.
--      Slice 3 refuses deletion approval and pauses day-30 deletion while it is on; exports still work.
--   2. public.organisation_owner_candidates(account): who can take over ownership — users with the PMO Admin
--      role who work in this organisation (a role on one of its projects, or it is their current organisation).
--   3. public.organisation_transfer_owner_apply(account, new owner, reason): the same steps as the owner’s own
--      transfer (v734 accountBillingDelegateService.transferAccountOwnership): new owner gets the PMO Admin and
--      Account Owner roles, billing delegates are revoked, the billing audit log records it; both owners are
--      told in the app and by email. Called only by the audited Admin RPC (service role / definer).
-- Run before Admin SQL v265.
-- =============================================================================

-- ── 1. Legal hold ────────────────────────────────────────────────────────────
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS legal_hold_reason TEXT,
  ADD COLUMN IF NOT EXISTS legal_hold_since TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS legal_hold_by_admin UUID;

COMMENT ON COLUMN public.accounts.legal_hold IS
  'v1358 D13: set by a system admin (Admin RPC, reason required, audited). While TRUE the organisation cannot be deleted; exports still work.';
COMMENT ON COLUMN public.accounts.legal_hold_reason IS 'v1358: why the hold was placed (for example a dispute or a regulator request).';
COMMENT ON COLUMN public.accounts.legal_hold_since IS 'v1358: when the current hold was placed.';
COMMENT ON COLUMN public.accounts.legal_hold_by_admin IS 'v1358: the Admin user who placed the current hold (admin.admin_users id).';

-- ── 2. Ownership candidates ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.organisation_owner_candidates(p_account_id UUID)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'user_id', u.id, 'name', COALESCE(u.display_name, u.full_name, u.email), 'email', u.email)
         ORDER BY lower(COALESCE(u.display_name, u.full_name, u.email)), u.created_at), '[]'::jsonb)
    FROM public.users u
   WHERE NOT COALESCE(u.is_deleted, FALSE) AND COALESCE(u.is_active, TRUE) AND u.auth_user_id IS NOT NULL
     AND u.id IS DISTINCT FROM (SELECT a.owner_user_id FROM public.accounts a WHERE a.id = p_account_id)
     AND EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id
                  WHERE ur.user_id = u.id AND r.role_name = 'pmo_admin'
                    AND ur.is_active AND NOT COALESCE(ur.is_deleted, FALSE))
     AND (u.last_active_account_id = p_account_id
          OR EXISTS (SELECT 1 FROM public.user_roles pr JOIN public.projects p ON p.id = pr.project_id
                      WHERE pr.user_id = u.id AND p.account_id = p_account_id
                        AND pr.is_active AND NOT COALESCE(pr.is_deleted, FALSE)));
$$;

-- ── 3. Transfer ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.organisation_grant_global_role(p_user_id UUID, p_role_name TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_role UUID;
BEGIN
  v_role := (SELECT r.id FROM public.roles r
              WHERE r.role_name = p_role_name AND r.is_active AND r.account_id IS NULL
                AND (p_role_name = 'pmo_admin' OR r.is_system_role)
              ORDER BY r.created_at LIMIT 1);
  IF v_role IS NULL THEN RAISE EXCEPTION 'Role % not found', p_role_name; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_roles ur
                  WHERE ur.user_id = p_user_id AND ur.role_id = v_role AND ur.is_active AND NOT COALESCE(ur.is_deleted, FALSE)) THEN
    INSERT INTO public.user_roles (user_id, role_id, is_active) VALUES (p_user_id, v_role, TRUE);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.organisation_transfer_owner_apply(p_account_id UUID, p_new_owner_user_id UUID, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_acc   public.accounts;
  v_old   UUID;
  v_vars  JSONB;
BEGIN
  IF COALESCE(btrim(p_reason), '') = '' THEN RAISE EXCEPTION 'A reason is required'; END IF;
  PERFORM 1 FROM public.accounts a WHERE a.id = p_account_id FOR UPDATE;
  v_acc := (SELECT a FROM public.accounts a WHERE a.id = p_account_id);
  IF v_acc.id IS NULL OR COALESCE(v_acc.is_deleted, FALSE) THEN RAISE EXCEPTION 'Organisation not found'; END IF;
  v_old := v_acc.owner_user_id;
  IF p_new_owner_user_id IS NULL OR p_new_owner_user_id = v_old THEN
    RAISE EXCEPTION 'Choose a different person as the new owner';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(public.organisation_owner_candidates(p_account_id)) c
                  WHERE c ->> 'user_id' = p_new_owner_user_id::TEXT) THEN
    RAISE EXCEPTION 'The new owner must be a PMO Admin who works in this organisation';
  END IF;

  PERFORM public.organisation_grant_global_role(p_new_owner_user_id, 'pmo_admin');
  UPDATE public.accounts SET owner_user_id = p_new_owner_user_id, updated_at = NOW() WHERE id = p_account_id;
  PERFORM public.organisation_grant_global_role(p_new_owner_user_id, 'account_owner');

  UPDATE public.account_billing_delegates SET is_active = FALSE, revoked_at = NOW()
   WHERE account_id = p_account_id AND is_active;
  INSERT INTO public.account_billing_audit_log (account_id, actor_user_id, target_user_id, action, metadata)
  VALUES (p_account_id, NULL, p_new_owner_user_id, 'transfer_ownership',
          jsonb_build_object('by', 'system_admin', 'previous_owner_user_id', v_old, 'reason', btrim(p_reason)));

  v_vars := jsonb_build_object(
    'organisation', v_acc.account_name,
    'new_owner', (SELECT COALESCE(u.display_name, u.full_name, u.email) FROM public.users u WHERE u.id = p_new_owner_user_id));
  PERFORM public.bj_notice(p_new_owner_user_id, 'organisation_owner_transferred_to_you', v_vars, 'system', 'info', TRUE,
                           'owner-transfer:' || p_account_id::TEXT || ':' || p_new_owner_user_id::TEXT || ':' || extract(epoch FROM NOW())::BIGINT::TEXT,
                           p_account_id, 'public', 'account', p_account_id);
  IF v_old IS NOT NULL THEN
    PERFORM public.bj_notice(v_old, 'organisation_owner_transferred_from_you', v_vars, 'system', 'info', TRUE,
                             'owner-transfer-old:' || p_account_id::TEXT || ':' || v_old::TEXT || ':' || extract(epoch FROM NOW())::BIGINT::TEXT,
                             p_account_id, 'public', 'account', p_account_id);
  END IF;
  RETURN jsonb_build_object('account_id', p_account_id, 'previous_owner_user_id', v_old, 'new_owner_user_id', p_new_owner_user_id);
END;
$$;

DO $$
DECLARE
  fn TEXT;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.organisation_owner_candidates(uuid)',
    'public.organisation_grant_global_role(uuid, text)',
    'public.organisation_transfer_owner_apply(uuid, uuid, text)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
END $$;

-- ── 4. Messages ──────────────────────────────────────────────────────────────
INSERT INTO public.background_job_messages (message_key, title, body, description) VALUES
  ('organisation_owner_transferred_to_you', 'You are now the Account Owner of {organisation}',
   'Our support team has made you the Account Owner of {organisation}. You can now manage billing, the subscription and the organisation’s data export.',
   'v1358 D14: sent to the new owner after a system admin transfers ownership.'),
  ('organisation_owner_transferred_from_you', 'Ownership of {organisation} has moved',
   'Our support team has made {new_owner} the Account Owner of {organisation}. If you did not expect this, contact support.',
   'v1358 D14: sent to the previous owner after a system admin transfers ownership.')
ON CONFLICT (message_key) DO UPDATE SET title = EXCLUDED.title, body = EXCLUDED.body,
  description = EXCLUDED.description, updated_at = NOW();

-- ── Check (read-only) ────────────────────────────────────────────────────────
SELECT count(*) FILTER (WHERE legal_hold) AS organisations_on_hold,
       count(*) AS organisations
  FROM public.accounts;
