-- =============================================================================
-- v1604 — v1358 Slice 3a: organisation deletion — request, approval, owner confirmation, 30-day lock, cancel
-- PRD:  projectprd/v1358_organisation_data_export_and_deletion_PRD.md (D1, D5, D10–D13)
-- Plan: projectplan/v1358_organisation_data_export_and_deletion_plan.md
-- =============================================================================
-- Flow (status of a deletion request in public.organisation_data_requests):
--   pending_approval      the Account Owner asked (or a system admin opened it on their behalf, Admin v266)
--     → rejected          a system admin rejected it (reason)
--     → awaiting_confirmation  a system admin approved it (reason; refused while on legal hold); the owner is
--                         emailed a confirmation link valid 7 days, reminded once on day 5 (a new link)
--       → lapsed          not confirmed within 7 days: nothing locked or deleted
--       → locked          the owner confirmed: organisation locked for 30 days (app gate, members signed out,
--                         API keys / webhooks / SCIM switched off, subscription cancelled, final export made)
--         → deleting / deleted   day 30 (Slice 3b); paused while on legal hold
--   cancelled             by the owner or a system admin before day 30; a lock is undone and integrations
--                         switched back on (the subscription stays cancelled — the customer resubscribes, D10)
-- Emails with the confirmation link are sent by the worker (handler organisation.deletion_notify), which knows
-- the app address (SITE_URL, or PLANNER_SITE_URL for Project Planner organisations).
-- Run after v1600–v1603; then Admin SQL v266; then the tests v1605.
-- =============================================================================

-- ── 1. Request columns and states ────────────────────────────────────────────
ALTER TABLE public.organisation_data_requests
  ADD COLUMN IF NOT EXISTS reason               TEXT,
  ADD COLUMN IF NOT EXISTS opened_by_admin      UUID,
  ADD COLUMN IF NOT EXISTS decided_by_admin     UUID,
  ADD COLUMN IF NOT EXISTS decided_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS decision_reason      TEXT,
  ADD COLUMN IF NOT EXISTS confirm_token_hash   TEXT,
  ADD COLUMN IF NOT EXISTS confirm_expires_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirm_reminded_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmed_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmed_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS locked_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deletion_due_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_by         TEXT,
  ADD COLUMN IF NOT EXISTS final_export_request_id UUID,
  ADD COLUMN IF NOT EXISTS lock_state           JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.organisation_data_requests.lock_state IS
  'v1358: what the lock switched off (API key ids, webhook ids, SCIM), so a cancel switches exactly those back on; members signed out; subscriptions cancelled.';

ALTER TABLE public.organisation_data_requests DROP CONSTRAINT IF EXISTS organisation_data_requests_kind_check;
ALTER TABLE public.organisation_data_requests ADD CONSTRAINT organisation_data_requests_kind_check
  CHECK (kind IN ('export', 'deletion'));
ALTER TABLE public.organisation_data_requests DROP CONSTRAINT IF EXISTS organisation_data_requests_status_check;
ALTER TABLE public.organisation_data_requests ADD CONSTRAINT organisation_data_requests_status_check
  CHECK (status IN ('queued', 'building', 'ready', 'failed', 'expired',
                    'pending_approval', 'rejected', 'awaiting_confirmation', 'lapsed', 'locked',
                    'deleting', 'deleted', 'cancelled'));

CREATE INDEX IF NOT EXISTS idx_organisation_data_requests_deletion_open
  ON public.organisation_data_requests (account_id)
  WHERE kind = 'deletion' AND status IN ('pending_approval', 'awaiting_confirmation', 'locked', 'deleting');

-- ── 2. Organisation lock columns ─────────────────────────────────────────────
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS locked_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lock_reason      TEXT,
  ADD COLUMN IF NOT EXISTS deletion_due_at  TIMESTAMPTZ;
COMMENT ON COLUMN public.accounts.locked_at IS 'v1358 D5: set when the owner confirms a deletion; members cannot use the organisation until it is cancelled or deleted.';
COMMENT ON COLUMN public.accounts.deletion_due_at IS 'v1358 D5: when the locked organisation is permanently deleted (30 days after the lock; paused by a legal hold).';

-- ── 3. Helpers ───────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.organisation_deletion_open_request(p_account_id UUID)
RETURNS public.organisation_data_requests
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  SELECT r FROM public.organisation_data_requests r
   WHERE r.account_id = p_account_id AND r.kind = 'deletion'
     AND r.status IN ('pending_approval', 'awaiting_confirmation', 'locked', 'deleting')
   ORDER BY r.created_at DESC LIMIT 1;
$$;

-- Owner + everyone with a role on the organisation's projects + anyone working in it now.
CREATE OR REPLACE FUNCTION public.organisation_member_user_ids(p_account_id UUID)
RETURNS UUID[]
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  SELECT COALESCE(array_agg(DISTINCT x.id), ARRAY[]::UUID[]) FROM (
    SELECT a.owner_user_id AS id FROM public.accounts a WHERE a.id = p_account_id AND a.owner_user_id IS NOT NULL
    UNION SELECT ur.user_id FROM public.user_roles ur JOIN public.projects p ON p.id = ur.project_id
           WHERE p.account_id = p_account_id AND ur.is_active AND NOT COALESCE(ur.is_deleted, FALSE)
    UNION SELECT u.id FROM public.users u WHERE u.last_active_account_id = p_account_id
  ) x;
$$;

-- A new confirmation token: only its hash is stored; the plain token goes to the worker that emails it.
CREATE OR REPLACE FUNCTION public.organisation_deletion_issue_token(p_request_id UUID, p_kind TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions SET row_security = off
AS $$
DECLARE
  v_token TEXT := encode(gen_random_bytes(32), 'hex');
  v_acc   UUID;
BEGIN
  v_acc := (SELECT x.account_id FROM public.organisation_data_requests x WHERE x.id = p_request_id);
  IF v_acc IS NULL THEN RAISE EXCEPTION 'Deletion request not found'; END IF;
  UPDATE public.organisation_data_requests
     SET confirm_token_hash = encode(digest(v_token, 'sha256'), 'hex'), updated_at = NOW()
   WHERE id = p_request_id;
  PERFORM public.enqueue_background_job('organisation.deletion_notify',
            jsonb_build_object('request_id', p_request_id, 'kind', p_kind, 'token', v_token),
            NULL, 'orgdel-notify:' || p_request_id::TEXT || ':' || p_kind || ':' || extract(epoch FROM clock_timestamp())::TEXT,
            v_acc);
END;
$$;

-- ── 4. Owner functions (authenticated; the caller must be the Account Owner) ──
CREATE OR REPLACE FUNCTION public.organisation_data_request_deletion(p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_acc UUID := public.organisation_data_owned_account();
  v_id  UUID := gen_random_uuid();
BEGIN
  IF v_acc IS NULL THEN
    RAISE EXCEPTION 'Only the Account Owner can ask for the organisation to be deleted' USING ERRCODE = '42501';
  END IF;
  IF COALESCE(btrim(p_reason), '') = '' THEN RAISE EXCEPTION 'Please give a reason' USING ERRCODE = 'P0001'; END IF;
  IF (public.organisation_deletion_open_request(v_acc)).id IS NOT NULL THEN
    RAISE EXCEPTION 'A deletion request for this organisation is already open' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO public.organisation_data_requests (id, account_id, kind, status, requested_by_user_id, reason)
  VALUES (v_id, v_acc, 'deletion', 'pending_approval',
          (SELECT u.id FROM public.users u WHERE u.auth_user_id = auth.uid() LIMIT 1), btrim(p_reason));
  RETURN jsonb_build_object('id', v_id, 'status', 'pending_approval',
           'reference', (SELECT NULLIF(x.request_reference, '') FROM public.organisation_data_requests x WHERE x.id = v_id));
END;
$$;

CREATE OR REPLACE FUNCTION public.organisation_deletion_lock(p_request_id UUID, p_confirmed_by UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  r        public.organisation_data_requests;
  v_due    TIMESTAMPTZ := NOW() + INTERVAL '30 days';
  v_owner  UUID;
  v_ids    UUID[];
  v_state  JSONB := '{}'::jsonb;
  v_list   JSONB;
  v_export UUID := gen_random_uuid();
  v_tz     TEXT;
  v_vars   JSONB;
  m        UUID;
BEGIN
  r := (SELECT x FROM public.organisation_data_requests x WHERE x.id = p_request_id);
  v_owner := public.organisation_export_owner(r.account_id);
  v_ids := public.organisation_member_user_ids(r.account_id);

  -- Integrations off (only what exists and is on now; remembered for a cancel).
  IF to_regclass('public.api_credentials') IS NOT NULL THEN
    v_list := (SELECT COALESCE(jsonb_agg(c.id), '[]'::jsonb) FROM public.api_credentials c
                WHERE c.account_id = r.account_id AND c.revoked_at IS NULL);
    UPDATE public.api_credentials SET revoked_at = NOW()
     WHERE id IN (SELECT (e #>> '{}')::UUID FROM jsonb_array_elements(v_list) e);
    v_state := v_state || jsonb_build_object('api_credentials', v_list);
  END IF;
  IF to_regclass('public.webhook_endpoints') IS NOT NULL THEN
    v_list := (SELECT COALESCE(jsonb_agg(w.id), '[]'::jsonb) FROM public.webhook_endpoints w
                WHERE w.account_id = r.account_id AND w.status = 'active');
    UPDATE public.webhook_endpoints SET status = 'disabled'
     WHERE id IN (SELECT (e #>> '{}')::UUID FROM jsonb_array_elements(v_list) e);
    v_state := v_state || jsonb_build_object('webhook_endpoints', v_list);
  END IF;
  IF to_regclass('public.scim_settings') IS NOT NULL THEN
    v_state := v_state || jsonb_build_object('scim_enabled',
                 EXISTS (SELECT 1 FROM public.scim_settings s WHERE s.account_id = r.account_id AND s.enabled));
    UPDATE public.scim_settings SET enabled = FALSE WHERE account_id = r.account_id AND enabled;
  END IF;

  -- Subscription cancelled at lock, no refund (D10).
  v_list := (SELECT COALESCE(jsonb_agg(ps.id), '[]'::jsonb) FROM public.platform_subscriptions ps
              WHERE ps.account_id = r.account_id AND ps.status IN ('active', 'trial', 'trialing', 'past_due'));
  UPDATE public.platform_subscriptions SET status = 'cancelled', cancelled_at = NOW()
   WHERE id IN (SELECT (e #>> '{}')::UUID FROM jsonb_array_elements(v_list) e);
  v_state := v_state || jsonb_build_object('subscriptions_cancelled', v_list,
                                           'members', to_jsonb(v_ids));

  -- Members (not the owner) are signed out; the app gate keeps them out while locked.
  DELETE FROM auth.sessions s
   WHERE s.user_id IN (SELECT u.auth_user_id FROM public.users u
                        WHERE u.id = ANY (v_ids) AND u.id IS DISTINCT FROM v_owner AND u.auth_user_id IS NOT NULL);
  UPDATE public.users SET last_active_account_id = NULL
   WHERE last_active_account_id = r.account_id AND id IS DISTINCT FROM v_owner;

  -- Final export (D5), available to the owner during the 30 days.
  INSERT INTO public.organisation_data_requests (id, account_id, kind, status, requested_by_user_id)
  VALUES (v_export, r.account_id, 'export', 'queued', p_confirmed_by);
  PERFORM public.enqueue_background_job('organisation.export_build', jsonb_build_object('request_id', v_export),
                                        NULL, 'orgexport:' || v_export::TEXT || ':0', r.account_id);

  UPDATE public.organisation_data_requests
     SET status = 'locked', confirmed_at = NOW(), confirmed_by_user_id = p_confirmed_by, confirm_token_hash = NULL,
         locked_at = NOW(), deletion_due_at = v_due, final_export_request_id = v_export, lock_state = v_state,
         updated_at = NOW()
   WHERE id = r.id;
  UPDATE public.accounts SET locked_at = NOW(), lock_reason = 'deletion', deletion_due_at = v_due, updated_at = NOW()
   WHERE id = r.account_id;

  v_tz := public.bj_account_time_zone(r.account_id);
  v_vars := jsonb_build_object(
    'organisation', (SELECT a.account_name FROM public.accounts a WHERE a.id = r.account_id),
    'reference', COALESCE(NULLIF(r.request_reference, ''), 'deletion'),
    'date', public.bj_format_date((v_due AT TIME ZONE v_tz)::DATE, public.bj_account_date_format(r.account_id)));
  PERFORM public.bj_notice(v_owner, 'organisation_deletion_locked', v_vars, 'system', 'warning', TRUE,
                           'orgdel-locked:' || r.id::TEXT, r.account_id, 'public', 'organisation_data_request', r.id);
  FOREACH m IN ARRAY v_ids LOOP
    CONTINUE WHEN m = v_owner;
    PERFORM public.bj_notice(m, 'organisation_deletion_locked_member', v_vars, 'system', 'warning', TRUE,
                             'orgdel-locked-member:' || r.id::TEXT, r.account_id, 'public', 'organisation_data_request', r.id);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.organisation_data_confirm_deletion(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions SET row_security = off
AS $$
DECLARE
  v_acc  UUID := public.organisation_data_owned_account();
  r      public.organisation_data_requests;
BEGIN
  IF v_acc IS NULL THEN
    RAISE EXCEPTION 'Sign in as the Account Owner to confirm the deletion' USING ERRCODE = '42501';
  END IF;
  r := (SELECT x FROM public.organisation_data_requests x
         WHERE x.account_id = v_acc AND x.kind = 'deletion' AND x.status = 'awaiting_confirmation'
           AND x.confirm_token_hash = encode(digest(COALESCE(p_token, ''), 'sha256'), 'hex'));
  IF r.id IS NULL THEN
    RAISE EXCEPTION 'This confirmation link is not valid any more. Use the latest email, or ask for a new link.' USING ERRCODE = 'P0001';
  END IF;
  IF r.confirm_expires_at < NOW() THEN
    RAISE EXCEPTION 'This confirmation link has expired.' USING ERRCODE = 'P0001';
  END IF;
  IF (SELECT a.legal_hold FROM public.accounts a WHERE a.id = v_acc) THEN
    RAISE EXCEPTION 'This organisation cannot be deleted at the moment. Please contact support.' USING ERRCODE = 'P0001';
  END IF;
  PERFORM public.organisation_deletion_lock(r.id, (SELECT u.id FROM public.users u WHERE u.auth_user_id = auth.uid() LIMIT 1));
  RETURN jsonb_build_object('id', r.id, 'reference', NULLIF(r.request_reference, ''), 'status', 'locked',
           'deletion_due_at', (SELECT x.deletion_due_at FROM public.organisation_data_requests x WHERE x.id = r.id));
END;
$$;

-- Cancel by the owner (p_by = 'owner') or a system admin (p_by = 'admin', from Admin v266). Undoes a lock.
CREATE OR REPLACE FUNCTION public.organisation_deletion_cancel_apply(p_request_id UUID, p_by TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  r     public.organisation_data_requests;
  v_ids UUID[];
BEGIN
  r := (SELECT x FROM public.organisation_data_requests x WHERE x.id = p_request_id AND x.kind = 'deletion');
  IF r.id IS NULL THEN RAISE EXCEPTION 'Deletion request not found'; END IF;
  IF r.status NOT IN ('pending_approval', 'awaiting_confirmation', 'locked') THEN
    RAISE EXCEPTION 'This deletion request can no longer be cancelled (it is %)', r.status;
  END IF;
  IF r.status = 'locked' THEN
    IF r.lock_state ? 'api_credentials' THEN
      v_ids := ARRAY(SELECT (e #>> '{}')::UUID FROM jsonb_array_elements(r.lock_state -> 'api_credentials') e);
      EXECUTE 'UPDATE public.api_credentials SET revoked_at = NULL WHERE id = ANY ($1)' USING v_ids;
    END IF;
    IF r.lock_state ? 'webhook_endpoints' THEN
      v_ids := ARRAY(SELECT (e #>> '{}')::UUID FROM jsonb_array_elements(r.lock_state -> 'webhook_endpoints') e);
      EXECUTE 'UPDATE public.webhook_endpoints SET status = ''active'' WHERE id = ANY ($1)' USING v_ids;
    END IF;
    IF COALESCE((r.lock_state ->> 'scim_enabled')::BOOLEAN, FALSE) THEN
      EXECUTE 'UPDATE public.scim_settings SET enabled = TRUE WHERE account_id = $1' USING r.account_id;
    END IF;
    UPDATE public.accounts SET locked_at = NULL, lock_reason = NULL, deletion_due_at = NULL, updated_at = NOW()
     WHERE id = r.account_id;
  END IF;
  UPDATE public.organisation_data_requests
     SET status = 'cancelled', cancelled_at = NOW(), cancelled_by = p_by, confirm_token_hash = NULL, updated_at = NOW()
   WHERE id = r.id;
  PERFORM public.bj_notice(public.organisation_export_owner(r.account_id), 'organisation_deletion_cancelled',
            jsonb_build_object('organisation', (SELECT a.account_name FROM public.accounts a WHERE a.id = r.account_id),
                               'reference', COALESCE(NULLIF(r.request_reference, ''), 'deletion')),
            'system', 'info', TRUE, 'orgdel-cancelled:' || r.id::TEXT, r.account_id, 'public', 'organisation_data_request', r.id);
  RETURN jsonb_build_object('id', r.id, 'status', 'cancelled', 'was', r.status);
END;
$$;

CREATE OR REPLACE FUNCTION public.organisation_data_cancel_deletion()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_acc UUID := public.organisation_data_owned_account();
  v_id  UUID;
BEGIN
  IF v_acc IS NULL THEN
    RAISE EXCEPTION 'Only the Account Owner can cancel the deletion' USING ERRCODE = '42501';
  END IF;
  v_id := (public.organisation_deletion_open_request(v_acc)).id;
  IF v_id IS NULL THEN RAISE EXCEPTION 'There is no deletion request to cancel' USING ERRCODE = 'P0001'; END IF;
  RETURN public.organisation_deletion_cancel_apply(v_id, 'owner');
END;
$$;

-- ── 5. Admin decisions (called only by the audited Admin v266 RPCs) ─────────
CREATE OR REPLACE FUNCTION public.organisation_deletion_open_apply(p_account_id UUID, p_reason TEXT, p_admin UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_id UUID := gen_random_uuid();
BEGIN
  IF COALESCE(btrim(p_reason), '') = '' THEN RAISE EXCEPTION 'A reason is required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.accounts a WHERE a.id = p_account_id AND NOT COALESCE(a.is_deleted, FALSE)) THEN
    RAISE EXCEPTION 'Organisation not found';
  END IF;
  IF (public.organisation_deletion_open_request(p_account_id)).id IS NOT NULL THEN
    RAISE EXCEPTION 'A deletion request for this organisation is already open';
  END IF;
  INSERT INTO public.organisation_data_requests (id, account_id, kind, status, reason, opened_by_admin)
  VALUES (v_id, p_account_id, 'deletion', 'pending_approval', btrim(p_reason), p_admin);
  RETURN jsonb_build_object('id', v_id, 'status', 'pending_approval');
END;
$$;

CREATE OR REPLACE FUNCTION public.organisation_deletion_decide_apply(p_request_id UUID, p_approve BOOLEAN, p_reason TEXT, p_admin UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  r    public.organisation_data_requests;
  v_vars JSONB;
BEGIN
  IF COALESCE(btrim(p_reason), '') = '' THEN RAISE EXCEPTION 'A reason is required'; END IF;
  r := (SELECT x FROM public.organisation_data_requests x WHERE x.id = p_request_id AND x.kind = 'deletion');
  IF r.id IS NULL THEN RAISE EXCEPTION 'Deletion request not found'; END IF;
  IF r.status <> 'pending_approval' THEN RAISE EXCEPTION 'Only a request waiting for approval can be decided (it is %)', r.status; END IF;
  v_vars := jsonb_build_object('organisation', (SELECT a.account_name FROM public.accounts a WHERE a.id = r.account_id),
                               'reference', COALESCE(NULLIF(r.request_reference, ''), 'deletion'),
                               'reason', btrim(p_reason));
  IF p_approve THEN
    IF (SELECT a.legal_hold FROM public.accounts a WHERE a.id = r.account_id) THEN
      RAISE EXCEPTION 'This organisation is on legal hold, so its deletion cannot be approved';
    END IF;
    UPDATE public.organisation_data_requests
       SET status = 'awaiting_confirmation', decided_by_admin = p_admin, decided_at = NOW(), decision_reason = btrim(p_reason),
           confirm_expires_at = NOW() + INTERVAL '7 days', confirm_reminded_at = NULL, updated_at = NOW()
     WHERE id = r.id;
    PERFORM public.organisation_deletion_issue_token(r.id, 'confirm');
    RETURN jsonb_build_object('id', r.id, 'status', 'awaiting_confirmation');
  END IF;
  UPDATE public.organisation_data_requests
     SET status = 'rejected', decided_by_admin = p_admin, decided_at = NOW(), decision_reason = btrim(p_reason), updated_at = NOW()
   WHERE id = r.id;
  PERFORM public.bj_notice(public.organisation_export_owner(r.account_id), 'organisation_deletion_rejected', v_vars,
                           'system', 'info', TRUE, 'orgdel-rejected:' || r.id::TEXT, r.account_id, 'public', 'organisation_data_request', r.id);
  RETURN jsonb_build_object('id', r.id, 'status', 'rejected');
END;
$$;

-- ── 6. Worker context for the confirmation email (service role only) ────────
CREATE OR REPLACE FUNCTION public.organisation_deletion_notify_context(p_request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  r    public.organisation_data_requests;
  v_tz TEXT;
BEGIN
  r := (SELECT x FROM public.organisation_data_requests x WHERE x.id = p_request_id AND x.kind = 'deletion');
  IF r.id IS NULL OR r.status <> 'awaiting_confirmation' THEN RETURN jsonb_build_object('skip', 'request is not waiting for confirmation'); END IF;
  v_tz := public.bj_account_time_zone(r.account_id);
  RETURN (
    SELECT jsonb_build_object(
      'reference', COALESCE(NULLIF(r.request_reference, ''), 'deletion'),
      'organisation', a.account_name,
      'edition', COALESCE(a.product_edition::TEXT, 'platform'),
      'owner_user_id', u.id,
      'owner_name', COALESCE(u.display_name, u.full_name, u.email),
      'owner_email', u.email,
      'expires', public.bj_format_date((r.confirm_expires_at AT TIME ZONE v_tz)::DATE, public.bj_account_date_format(r.account_id)))
      FROM public.accounts a LEFT JOIN public.users u ON u.id = a.owner_user_id
     WHERE a.id = r.account_id);
END;
$$;

-- ── 7. Lifecycle job (organisation.deletion_lifecycle, hourly) ───────────────
-- Day-5 reminder (a new link), lapse after 7 days. Day-30 deletion is Slice 3b; until then due locks are
-- only counted (none can be due before 30 days after this file runs).
CREATE OR REPLACE FUNCTION public.run_organisation_deletion_lifecycle(p_context JSONB DEFAULT '{}'::jsonb)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_dry      BOOLEAN := COALESCE((p_context ->> 'dry_run')::BOOLEAN, FALSE);
  r          RECORD;
  v_reminded INTEGER := 0;
  v_lapsed   INTEGER := 0;
  v_due      INTEGER := 0;
  v_held     INTEGER := 0;
BEGIN
  FOR r IN SELECT x.id, x.account_id, x.request_reference FROM public.organisation_data_requests x
            WHERE x.kind = 'deletion' AND x.status = 'awaiting_confirmation'
              AND x.confirm_expires_at > NOW() AND x.confirm_expires_at <= NOW() + INTERVAL '2 days'
              AND x.confirm_reminded_at IS NULL
  LOOP
    v_reminded := v_reminded + 1;
    CONTINUE WHEN v_dry;
    UPDATE public.organisation_data_requests SET confirm_reminded_at = NOW() WHERE id = r.id;
    PERFORM public.organisation_deletion_issue_token(r.id, 'reminder');
  END LOOP;

  FOR r IN SELECT x.id, x.account_id, x.request_reference FROM public.organisation_data_requests x
            WHERE x.kind = 'deletion' AND x.status = 'awaiting_confirmation' AND x.confirm_expires_at <= NOW()
  LOOP
    v_lapsed := v_lapsed + 1;
    CONTINUE WHEN v_dry;
    UPDATE public.organisation_data_requests SET status = 'lapsed', confirm_token_hash = NULL, updated_at = NOW() WHERE id = r.id;
    PERFORM public.bj_notice(public.organisation_export_owner(r.account_id), 'organisation_deletion_lapsed',
              jsonb_build_object('organisation', (SELECT a.account_name FROM public.accounts a WHERE a.id = r.account_id),
                                 'reference', COALESCE(NULLIF(r.request_reference, ''), 'deletion')),
              'system', 'info', TRUE, 'orgdel-lapsed:' || r.id::TEXT, r.account_id, 'public', 'organisation_data_request', r.id);
  END LOOP;

  v_due := (SELECT count(*) FROM public.organisation_data_requests x JOIN public.accounts a ON a.id = x.account_id
             WHERE x.kind = 'deletion' AND x.status = 'locked' AND x.deletion_due_at <= NOW() AND NOT a.legal_hold);
  v_held := (SELECT count(*) FROM public.organisation_data_requests x JOIN public.accounts a ON a.id = x.account_id
              WHERE x.kind = 'deletion' AND x.status = 'locked' AND x.deletion_due_at <= NOW() AND a.legal_hold);
  RETURN jsonb_build_object('processed', v_reminded + v_lapsed, 'reminded', v_reminded, 'lapsed', v_lapsed,
                            'due_for_deletion', v_due, 'paused_by_legal_hold', v_held, 'dry_run', v_dry);
END;
$$;

-- ── 8. Lock status for the app gate (authenticated) ──────────────────────────
CREATE OR REPLACE FUNCTION public.organisation_lock_status()
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  SELECT COALESCE((
    SELECT jsonb_build_object(
      'locked', a.locked_at IS NOT NULL,
      'is_owner', public.organisation_data_owned_account() = a.id,
      'organisation', a.account_name,
      'deletion_due_at', a.deletion_due_at)
      FROM public.accounts a WHERE a.id = public.auth_user_current_account_id()), jsonb_build_object('locked', FALSE));
$$;

-- Owner list: also deletion requests and lock details (replaces v1600's version).
CREATE OR REPLACE FUNCTION public.organisation_data_requests_list()
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  SELECT jsonb_build_object(
    'is_owner', public.organisation_data_owned_account() IS NOT NULL,
    'requests', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'id', x.id, 'reference', NULLIF(x.request_reference, ''), 'kind', x.kind, 'status', x.status,
               'requested_by', (SELECT COALESCE(u.display_name, u.full_name, u.email) FROM public.users u WHERE u.id = x.requested_by_user_id),
               'opened_by_support', x.opened_by_admin IS NOT NULL,
               'reason', x.reason, 'decision_reason', CASE WHEN x.status = 'rejected' THEN x.decision_reason END,
               'created_at', x.created_at, 'finished_at', x.finished_at, 'expires_at', x.expires_at,
               'confirm_expires_at', x.confirm_expires_at, 'locked_at', x.locked_at, 'deletion_due_at', x.deletion_due_at,
               'table_count', x.table_count, 'row_count', x.row_count, 'file_count', x.file_count,
               'byte_size', x.byte_size, 'files', CASE WHEN x.status = 'ready' THEN x.files ELSE '[]'::jsonb END,
               'error', CASE WHEN x.status = 'failed' THEN x.last_error END)
             ORDER BY x.created_at DESC)
        FROM public.organisation_data_requests x
       WHERE x.account_id = public.organisation_data_owned_account()), '[]'::jsonb));
$$;

-- ── 9. Grants ────────────────────────────────────────────────────────────────
DO $$
DECLARE
  fn TEXT;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.organisation_deletion_open_request(uuid)',
    'public.organisation_member_user_ids(uuid)',
    'public.organisation_deletion_issue_token(uuid, text)',
    'public.organisation_deletion_lock(uuid, uuid)',
    'public.organisation_deletion_cancel_apply(uuid, text)',
    'public.organisation_deletion_open_apply(uuid, text, uuid)',
    'public.organisation_deletion_decide_apply(uuid, boolean, text, uuid)',
    'public.organisation_deletion_notify_context(uuid)',
    'public.run_organisation_deletion_lifecycle(jsonb)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
  FOREACH fn IN ARRAY ARRAY[
    'public.organisation_data_request_deletion(text)',
    'public.organisation_data_confirm_deletion(text)',
    'public.organisation_data_cancel_deletion()',
    'public.organisation_lock_status()',
    'public.organisation_data_requests_list()'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', fn);
  END LOOP;
END $$;

-- ── 10. Messages ─────────────────────────────────────────────────────────────
INSERT INTO public.background_job_messages (message_key, title, body, description) VALUES
  ('organisation_deletion_locked', '{organisation} is locked and will be deleted on {date}',
   'You confirmed deletion request {reference}. {organisation} is now locked: members cannot use it, integrations are switched off and the subscription is cancelled. A final export is being prepared; download it from Data export & deletion. You can cancel until {date}. After that, the data is deleted permanently.',
   'v1358 D5: to the Account Owner when the organisation locks.'),
  ('organisation_deletion_locked_member', '{organisation} is closing',
   'The Account Owner of {organisation} has asked for it to be deleted. You can no longer use it. Its data is deleted on {date}. Your own account and any other organisations you belong to are not affected.',
   'v1358 D5: to members when the organisation locks.'),
  ('organisation_deletion_cancelled', 'Deletion of {organisation} cancelled',
   'Deletion request {reference} for {organisation} has been cancelled. If the organisation was locked, members can use it again and integrations are back on. A cancelled subscription is not restarted: choose a plan again under Subscription.',
   'v1358 D5: to the Account Owner when a deletion is cancelled.'),
  ('organisation_deletion_rejected', 'Deletion request {reference} was not approved',
   'Our support team did not approve deletion request {reference} for {organisation}. Reason: {reason}. Nothing has been changed.',
   'v1358 D1: to the Account Owner when a system admin rejects a deletion request.'),
  ('organisation_deletion_lapsed', 'Deletion request {reference} has lapsed',
   'Deletion request {reference} for {organisation} was not confirmed within 7 days, so nothing was locked or deleted. You can ask again from Data export & deletion.',
   'v1358 D12: to the Account Owner when the confirmation link expires.')
ON CONFLICT (message_key) DO UPDATE SET title = EXCLUDED.title, body = EXCLUDED.body,
  description = EXCLUDED.description, updated_at = NOW();

-- ── 11. Catalogue rows (rule 80) ─────────────────────────────────────────────
SELECT public.background_job_register(
  p_code => 'organisation.deletion_notify',
  p_name => 'Organisation deletion confirmation email',
  p_kind => 'handler',
  p_description => 'v1358: emails the Account Owner the link that confirms an approved deletion (and the day-5 reminder).',
  p_owner_system => 'platform',
  p_timeout_seconds => 60,
  p_max_attempts => 6,
  p_backoff_schedule => ARRAY[60, 300, 1800, 7200, 21600],
  p_item_ttl_seconds => 172800
);

SELECT public.background_job_register(
  p_code => 'organisation.deletion_lifecycle',
  p_name => 'Organisation deletion lifecycle',
  p_kind => 'sql',
  p_description => 'v1358: day-5 confirmation reminders and lapse after 7 days; day-30 deletion of locked organisations (Slice 3b), paused by a legal hold.',
  p_owner_system => 'platform',
  p_sql_function => 'public.run_organisation_deletion_lifecycle',
  p_cron => '15 * * * *',
  p_time_basis => 'utc',
  p_timeout_seconds => 300
);

-- ── 12. Menu label and field help ────────────────────────────────────────────
UPDATE public.menu_items
   SET menu_label = 'Data export & deletion',
       menu_description = 'Download a full copy of the organisation’s data, or ask for the organisation to be deleted (v1358).',
       updated_at = NOW()
 WHERE menu_code IN ('plat_acct_data_export', 'pln_settings_data_export');

INSERT INTO public.field_help (help_key, title, purpose, examples, format_notes, extra_notes, module_code)
VALUES
  ('public.organisation_data_requests.reason', 'Reason for deleting the organisation',
   'Why you want the organisation and all its data deleted. Our support team reads it before approving.',
   '- We are moving to another tool at the end of our contract
- The project this organisation was set up for has finished',
   NULL,
   'After approval you confirm by an email link. The organisation is then locked for 30 days (you can cancel and download a final export), and deleted permanently after that.',
   'organisation_data')
ON CONFLICT (help_key, form_key, locale) DO UPDATE SET
  title = EXCLUDED.title, purpose = EXCLUDED.purpose, examples = EXCLUDED.examples,
  format_notes = EXCLUDED.format_notes, extra_notes = EXCLUDED.extra_notes,
  module_code = EXCLUDED.module_code, is_active = TRUE;

-- ── Check (read-only) ────────────────────────────────────────────────────────
SELECT public.run_organisation_deletion_lifecycle('{"dry_run": true}'::jsonb) AS lifecycle_dry_run;
