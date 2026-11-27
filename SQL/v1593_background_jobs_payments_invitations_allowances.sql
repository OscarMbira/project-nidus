-- ============================================================================
-- v1593 — v1352 background jobs, Slice 2 (2.3, 2.4, 2.5): payment follow-up, invitation expiry,
--          monthly allowances
-- ============================================================================
-- PRD: projectprd/v1352_background_jobs_PRD.md · Plan: projectplan/v1352_background_jobs_plan.md (Slice 2)
-- Prerequisites: v1559–v1562, v1592 (outbox, markers, messages, settings). Idempotent.
--
-- Jobs (all through the catalogue and the single tick — rule 80; thresholds in public.saas_job_settings):
--   payments.pending_recheck        handler  hourly :05 UTC   Server-side Paynow re-check of pending payments
--                                                            (handlers/payments.pending_recheck.js; hash-verified,
--                                                            verified final answers go to paynow-webhook).
--                                                            Only queued while a payment is due a check.
--   payments.followup               sql      hourly :20 UTC   Pending payments past the expiry age → 'expired';
--                                                            failed / cancelled payments → one follow-up (in-app +
--                                                            email) unless the organisation paid since.
--   subscriptions.renewal_reminders sql      08:00 organisation  Renewal reminders (default 7 and 1 days before the
--                                                            end date) and one notice after it passed — Platform /
--                                                            Planner subscriptions (owner + billing delegates) and
--                                                            Simulator subscriptions (the learner). In-app + email.
--   invitations.expire              sql      01:00 UTC        Pending invitations past their expiry → 'expired'
--                                                            (project / portfolio / programme, organisation, and
--                                                            Simulator practice invitations); the inviter gets an
--                                                            in-app notice (email through the daily digest).
--   allowances.monthly              sql      01:30 UTC        AI credits renew by themselves (the allowance is
--                                                            computed per period from the ledger, v1272), so nothing
--                                                            is written to the ledger. Once per organisation and
--                                                            period the job records the previous period's use and
--                                                            tells the owner and PMO Admins the new allowance.
-- Each effect happens once: payment / renewal / allowance markers in public.background_job_markers; an
-- invitation's status change is its own marker.
-- No new tables (payment_transactions gains three check columns), so no Planner wall re-run for this file.
-- ============================================================================

-- ── 1. Payment check columns ─────────────────────────────────────────────────
ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS last_checked_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS check_count       INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_check_result TEXT;
COMMENT ON COLUMN public.payment_transactions.last_checked_at IS 'v1352: when the payments.pending_recheck job last asked Paynow about this payment';
COMMENT ON COLUMN public.payment_transactions.last_check_result IS 'v1352: outcome of the last server-side check (verified status, not verified, no answer)';

-- ── 2. Shared helpers ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.bj_is_uuid(p_text TEXT)
RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE
AS $$
  SELECT COALESCE(p_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', FALSE);
$$;

-- Account owner + active billing delegates (people who can pay).
CREATE OR REPLACE FUNCTION public.bj_billing_contacts(p_account_id UUID)
RETURNS UUID[]
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  SELECT ARRAY(SELECT DISTINCT x FROM (
    SELECT a.owner_user_id AS x FROM public.accounts a WHERE a.id = p_account_id AND NOT COALESCE(a.is_deleted, FALSE)
    UNION
    SELECT d.user_id FROM public.account_billing_delegates d
     WHERE d.account_id = p_account_id AND d.is_active AND d.revoked_at IS NULL
  ) s WHERE x IS NOT NULL);
$$;

-- Which renewal reminder step is due with p_days_left days to go (steps e.g. {7,1}): the largest step that
-- has been reached but not the next smaller one. NULL when none (too early, or already past the end).
CREATE OR REPLACE FUNCTION public.renewal_step(p_days_left INTEGER, p_steps INTEGER[])
RETURNS INTEGER
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  v_sorted INTEGER[];
  i        INTEGER;
BEGIN
  IF p_days_left IS NULL OR p_days_left < 0 OR p_steps IS NULL THEN RETURN NULL; END IF;
  v_sorted := ARRAY(SELECT DISTINCT s FROM unnest(p_steps) s WHERE s >= 0 ORDER BY s DESC);
  FOR i IN 1 .. COALESCE(cardinality(v_sorted), 0) LOOP
    IF p_days_left <= v_sorted[i] AND (i = cardinality(v_sorted) OR p_days_left > v_sorted[i + 1]) THEN
      RETURN v_sorted[i];
    END IF;
  END LOOP;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.bj_days_text(p_days INTEGER)
RETURNS TEXT
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE WHEN p_days = 0 THEN 'ends today' WHEN p_days = 1 THEN '1 day' ELSE p_days::TEXT || ' days' END;
$$;

CREATE OR REPLACE FUNCTION public.bj_plan_label(p_plan TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE
AS $$
  SELECT initcap(replace(COALESCE(NULLIF(btrim(p_plan), ''), 'paid'), '_', ' '));
$$;

-- ── 3. Payments (2.3) ────────────────────────────────────────────────────────
-- Guard for payments.pending_recheck: a pending Paynow payment is due a check.
CREATE OR REPLACE FUNCTION public.payments_has_pending_recheck()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.payment_transactions t, public.saas_job_settings s
     WHERE s.id AND t.status = 'pending' AND COALESCE(t.payment_provider, 'paynow') = 'paynow'
       AND COALESCE(btrim(t.poll_url), '') <> ''
       AND t.created_at <= NOW() - make_interval(mins => s.pending_recheck_min_age_minutes)
       AND t.created_at >= NOW() - make_interval(hours => s.pending_recheck_window_hours)
       AND (t.last_checked_at IS NULL OR t.last_checked_at < NOW() - INTERVAL '50 minutes'));
$$;

-- Claims up to p_limit payments for one check (stamps last_checked_at, so two workers never ask twice).
CREATE OR REPLACE FUNCTION public.payments_pending_for_recheck(p_limit INTEGER DEFAULT 50)
RETURNS TABLE (reference TEXT, poll_url TEXT)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
#variable_conflict use_column
DECLARE
  s public.saas_job_settings;
BEGIN
  s := (SELECT x FROM public.saas_job_settings x WHERE x.id);
  RETURN QUERY
  WITH picked AS (
    SELECT t.id AS picked_id
      FROM public.payment_transactions t
     WHERE t.status = 'pending' AND COALESCE(t.payment_provider, 'paynow') = 'paynow'
       AND COALESCE(btrim(t.poll_url), '') <> ''
       AND t.created_at <= NOW() - make_interval(mins => s.pending_recheck_min_age_minutes)
       AND t.created_at >= NOW() - make_interval(hours => s.pending_recheck_window_hours)
       AND (t.last_checked_at IS NULL OR t.last_checked_at < NOW() - INTERVAL '50 minutes')
     ORDER BY t.created_at
     LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 50), 200))
     FOR UPDATE SKIP LOCKED
  )
  UPDATE public.payment_transactions t
     SET last_checked_at = NOW(), check_count = t.check_count + 1
    FROM picked
   WHERE t.id = picked.picked_id
  RETURNING t.reference::TEXT, t.poll_url;
END;
$$;

CREATE OR REPLACE FUNCTION public.payments_recheck_note(p_reference TEXT, p_outcome TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_rows INTEGER;
BEGIN
  UPDATE public.payment_transactions
     SET last_check_result = left(COALESCE(p_outcome, ''), 500)
   WHERE reference = p_reference;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$;

-- payments.followup: expire stale pending payments; one follow-up per failed / cancelled payment.
CREATE OR REPLACE FUNCTION public.run_payment_followup(p_context JSONB DEFAULT '{}'::jsonb)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_dry      BOOLEAN := COALESCE((p_context ->> 'dry_run')::BOOLEAN, FALSE);
  s          public.saas_job_settings;
  t          RECORD;
  v_account  UUID;
  v_user     UUID;
  v_key      TEXT;
  v_expired  INTEGER := 0;
  v_followed INTEGER := 0;
  v_emailed  INTEGER := 0;
  v_res      JSONB;
BEGIN
  s := (SELECT x FROM public.saas_job_settings x WHERE x.id);

  IF v_dry THEN
    v_expired := (SELECT count(*) FROM public.payment_transactions
                   WHERE status = 'pending' AND created_at < NOW() - make_interval(days => s.pending_expire_after_days));
  ELSE
    UPDATE public.payment_transactions
       SET status = 'expired',
           last_check_result = left(COALESCE(last_check_result || ' · ', '') ||
                                    format('expired: no final status after %s days', s.pending_expire_after_days), 500)
     WHERE status = 'pending' AND created_at < NOW() - make_interval(days => s.pending_expire_after_days);
    GET DIAGNOSTICS v_expired = ROW_COUNT;
  END IF;

  FOR t IN
    SELECT p.id, p.reference, p.amount, p.currency, p.status, p.metadata, p.created_at
      FROM public.payment_transactions p
     WHERE p.status IN ('failed', 'cancelled')
       AND p.updated_at <= NOW() - make_interval(mins => s.failed_payment_min_age_minutes)
       AND p.updated_at >= NOW() - make_interval(days => s.failed_payment_window_days)
     ORDER BY p.updated_at
  LOOP
    v_account := CASE WHEN public.bj_is_uuid(t.metadata ->> 'organisation_id') THEN (t.metadata ->> 'organisation_id')::UUID END;
    -- the organisation paid since: nothing to chase
    CONTINUE WHEN v_account IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.payment_transactions n
       WHERE n.status = 'paid' AND n.metadata ->> 'organisation_id' = v_account::TEXT AND n.created_at > t.created_at);
    v_user := public.bj_user_from_auth(CASE WHEN public.bj_is_uuid(t.metadata ->> 'initiated_by_auth_user_id')
                                            THEN (t.metadata ->> 'initiated_by_auth_user_id')::UUID END);
    v_user := COALESCE(v_user, (SELECT a.owner_user_id FROM public.accounts a WHERE a.id = v_account));
    CONTINUE WHEN v_user IS NULL;
    v_key := 'failed:' || t.id::TEXT;

    IF v_dry THEN
      IF NOT EXISTS (SELECT 1 FROM public.background_job_markers m
                      WHERE m.job_code = 'payments.followup' AND m.marker_key = v_key) THEN
        v_followed := v_followed + 1;
      END IF;
      CONTINUE;
    END IF;

    CONTINUE WHEN NOT public.bj_mark_once('payments.followup', v_key, v_account,
                    jsonb_build_object('reference', t.reference, 'status', t.status, 'user_id', v_user));
    v_res := public.bj_notice(v_user, 'payment_failed',
               jsonb_build_object('amount', COALESCE(t.currency, 'USD') || ' ' || to_char(t.amount, 'FM999,999,999,990.00'),
                                  'reference', t.reference,
                                  'status', CASE t.status WHEN 'cancelled' THEN 'cancelled' ELSE 'declined' END),
               'billing', 'warning', TRUE, 'payment_failed:' || t.id::TEXT, v_account, 'public', 'payment_transaction', t.id);
    v_followed := v_followed + 1;
    IF (v_res ->> 'emailed')::BOOLEAN THEN v_emailed := v_emailed + 1; END IF;
  END LOOP;

  IF v_emailed > 0 THEN PERFORM public.background_job_wake_worker(); END IF;
  RETURN jsonb_build_object('processed', v_expired + v_followed, 'expired', v_expired, 'followed_up', v_followed,
                            'emailed', v_emailed, 'dry_run', v_dry);
END;
$$;

-- ── 4. Renewal reminders (2.3) ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.run_subscription_renewal_reminders(p_context JSONB DEFAULT '{}'::jsonb)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, sim SET row_security = off
AS $$
DECLARE
  v_dry     BOOLEAN := COALESCE((p_context ->> 'dry_run')::BOOLEAN, FALSE);
  s         public.saas_job_settings;
  v_max     INTEGER;
  r         RECORD;
  v_tz      TEXT;
  v_today   DATE;
  v_end     DATE;
  v_left    INTEGER;
  v_step    INTEGER;
  v_key     TEXT;
  v_msg     TEXT;
  v_vars    JSONB;
  v_user    UUID;
  v_account UUID;
  v_res     JSONB;
  v_due     INTEGER := 0;
  v_sent    INTEGER := 0;
  v_emailed INTEGER := 0;
BEGIN
  s := (SELECT x FROM public.saas_job_settings x WHERE x.id);
  v_max := (SELECT max(d) FROM unnest(s.renewal_reminder_days) d);

  -- Platform / Planner subscriptions (organisation level)
  FOR r IN
    SELECT ps.id, ps.account_id, ps.plan_type, ps.expires_at
      FROM public.platform_subscriptions ps
      JOIN public.accounts a ON a.id = ps.account_id AND NOT COALESCE(a.is_deleted, FALSE)
     WHERE ps.status IN ('active', 'past_due', 'expired')
       AND NOT COALESCE(ps.is_trial, FALSE) AND NOT COALESCE(ps.is_lifetime, FALSE)
       AND ps.expires_at IS NOT NULL
       AND ps.expires_at >= NOW() - make_interval(days => s.renewal_expired_notice_days + 1)
       AND ps.expires_at <= NOW() + make_interval(days => v_max + 1)
  LOOP
    v_step := NULL;
    v_tz := public.bj_account_time_zone(r.account_id);
    CONTINUE WHEN NOT public.bj_zone_due(p_context, v_tz);
    -- renewed already: another paid subscription of the organisation runs longer
    CONTINUE WHEN EXISTS (SELECT 1 FROM public.platform_subscriptions n
                           WHERE n.account_id = r.account_id AND n.id <> r.id AND n.status = 'active'
                             AND NOT COALESCE(n.is_trial, FALSE)
                             AND (COALESCE(n.is_lifetime, FALSE) OR n.expires_at IS NULL OR n.expires_at > r.expires_at));
    v_today := (NOW() AT TIME ZONE v_tz)::DATE;
    v_end   := (r.expires_at AT TIME ZONE v_tz)::DATE;
    v_left  := v_end - v_today;
    IF v_left >= 0 THEN
      v_step := public.renewal_step(v_left, s.renewal_reminder_days);
      CONTINUE WHEN v_step IS NULL;
      v_key := 'platform:' || r.id::TEXT || ':' || v_end::TEXT || ':' || v_step::TEXT;
      v_msg := 'subscription_renewal_due';
    ELSE
      CONTINUE WHEN -v_left > s.renewal_expired_notice_days;
      v_key := 'platform:' || r.id::TEXT || ':' || v_end::TEXT || ':ended';
      v_msg := 'subscription_expired';
    END IF;
    v_due := v_due + 1;
    IF v_dry THEN CONTINUE; END IF;
    CONTINUE WHEN NOT public.bj_mark_once('subscriptions.renewal_reminders', v_key, r.account_id,
                    jsonb_build_object('subscription_id', r.id, 'end_date', v_end, 'step', COALESCE(v_step::TEXT, 'ended')));
    v_vars := jsonb_build_object('plan', public.bj_plan_label(r.plan_type),
                                 'date', public.bj_format_date(v_end, public.bj_account_date_format(r.account_id)),
                                 'days_left', public.bj_days_text(v_left));
    FOREACH v_user IN ARRAY public.bj_billing_contacts(r.account_id) LOOP
      v_res := public.bj_notice(v_user, v_msg, v_vars, 'billing', CASE WHEN v_left >= 0 THEN 'info' ELSE 'warning' END,
                                TRUE, 'renewal:' || v_key, r.account_id, 'public', 'subscription', r.id);
      v_sent := v_sent + 1;
      IF (v_res ->> 'emailed')::BOOLEAN THEN v_emailed := v_emailed + 1; END IF;
    END LOOP;
  END LOOP;

  -- Simulator subscriptions (per learner; D8 parity)
  FOR r IN
    SELECT ss.id, ss.user_id AS auth_user_id, ss.plan_type, ss.expires_at
      FROM sim.simulator_subscriptions ss
     WHERE ss.status IN ('active', 'past_due', 'expired')
       AND NOT COALESCE(ss.is_lifetime, FALSE) AND ss.plan_type <> 'free'
       AND ss.expires_at IS NOT NULL
       AND ss.expires_at >= NOW() - make_interval(days => s.renewal_expired_notice_days + 1)
       AND ss.expires_at <= NOW() + make_interval(days => v_max + 1)
  LOOP
    v_step := NULL;
    v_user := public.bj_user_from_auth(r.auth_user_id);
    CONTINUE WHEN v_user IS NULL;
    v_account := public.bj_user_account(v_user);
    v_tz := public.bj_account_time_zone(v_account);
    CONTINUE WHEN NOT public.bj_zone_due(p_context, v_tz);
    CONTINUE WHEN EXISTS (SELECT 1 FROM sim.simulator_subscriptions n
                           WHERE n.user_id = r.auth_user_id AND n.id <> r.id AND n.status = 'active' AND n.plan_type <> 'free'
                             AND (COALESCE(n.is_lifetime, FALSE) OR n.expires_at IS NULL OR n.expires_at > r.expires_at));
    v_today := (NOW() AT TIME ZONE v_tz)::DATE;
    v_end   := (r.expires_at AT TIME ZONE v_tz)::DATE;
    v_left  := v_end - v_today;
    IF v_left >= 0 THEN
      v_step := public.renewal_step(v_left, s.renewal_reminder_days);
      CONTINUE WHEN v_step IS NULL;
      v_key := 'sim:' || r.id::TEXT || ':' || v_end::TEXT || ':' || v_step::TEXT;
      v_msg := 'simulator_subscription_renewal_due';
    ELSE
      CONTINUE WHEN -v_left > s.renewal_expired_notice_days;
      v_key := 'sim:' || r.id::TEXT || ':' || v_end::TEXT || ':ended';
      v_msg := 'simulator_subscription_expired';
    END IF;
    v_due := v_due + 1;
    IF v_dry THEN CONTINUE; END IF;
    CONTINUE WHEN NOT public.bj_mark_once('subscriptions.renewal_reminders', v_key, v_account,
                    jsonb_build_object('simulator_subscription_id', r.id, 'end_date', v_end, 'step', COALESCE(v_step::TEXT, 'ended')));
    v_res := public.bj_notice(v_user, v_msg,
               jsonb_build_object('plan', public.bj_plan_label(r.plan_type),
                                  'date', public.bj_format_date(v_end, public.bj_account_date_format(v_account)),
                                  'days_left', public.bj_days_text(v_left)),
               'billing', CASE WHEN v_left >= 0 THEN 'info' ELSE 'warning' END,
               TRUE, 'renewal:' || v_key, v_account, 'sim', 'simulator_subscription', r.id);
    v_sent := v_sent + 1;
    IF (v_res ->> 'emailed')::BOOLEAN THEN v_emailed := v_emailed + 1; END IF;
  END LOOP;

  IF v_emailed > 0 THEN PERFORM public.background_job_wake_worker(); END IF;
  RETURN jsonb_build_object('processed', v_sent, 'due', v_due, 'emailed', v_emailed, 'dry_run', v_dry);
END;
$$;

-- ── 5. Invitation expiry (2.4) ───────────────────────────────────────────────
-- Platform invitation expiry columns are TIMESTAMP (UTC wall time); the Simulator's is TIMESTAMPTZ.
CREATE OR REPLACE FUNCTION public.run_invitation_expiry(p_context JSONB DEFAULT '{}'::jsonb)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, sim SET row_security = off
AS $$
DECLARE
  v_dry      BOOLEAN := COALESCE((p_context ->> 'dry_run')::BOOLEAN, FALSE);
  s          public.saas_job_settings;
  v_now_utc  TIMESTAMP := (NOW() AT TIME ZONE 'UTC');
  v_cutoff   TIMESTAMPTZ;
  r          RECORD;
  v_account  UUID;
  v_target   TEXT;
  v_expires  TIMESTAMPTZ;
  v_project  INTEGER := 0;
  v_org      INTEGER := 0;
  v_sim      INTEGER := 0;
  v_notified INTEGER := 0;
BEGIN
  s := (SELECT x FROM public.saas_job_settings x WHERE x.id);
  v_cutoff := NOW() - make_interval(days => s.invitation_notify_window_days);

  IF v_dry THEN
    v_project := (SELECT count(*) FROM public.project_invitations i
                   WHERE i.invitation_status = 'pending' AND NOT COALESCE(i.is_deleted, FALSE)
                     AND i.invitation_expires_at IS NOT NULL AND i.invitation_expires_at < v_now_utc);
    v_org := (SELECT count(*) FROM public.organisation_invitations i
               WHERE i.invitation_status = 'pending' AND NOT COALESCE(i.is_deleted, FALSE)
                 AND i.invitation_expires_at IS NOT NULL AND i.invitation_expires_at < v_now_utc);
    v_sim := (SELECT count(*) FROM sim.entity_invitations i
               WHERE i.invitation_status = 'pending' AND NOT COALESCE(i.is_deleted, FALSE)
                 AND i.invitation_expires_at IS NOT NULL AND i.invitation_expires_at < NOW());
    RETURN jsonb_build_object('processed', 0, 'project_invitations', v_project, 'organisation_invitations', v_org,
                              'practice_invitations', v_sim, 'dry_run', TRUE);
  END IF;

  -- Project / portfolio / programme invitations
  FOR r IN
    UPDATE public.project_invitations i
       SET invitation_status = 'expired', updated_at = NOW()
     WHERE i.invitation_status = 'pending' AND NOT COALESCE(i.is_deleted, FALSE)
       AND i.invitation_expires_at IS NOT NULL AND i.invitation_expires_at < v_now_utc
    RETURNING i.id, i.invited_email, i.invited_by_user_id, i.invitation_expires_at, i.entity_type,
              i.project_id, i.portfolio_id, i.programme_id
  LOOP
    v_project := v_project + 1;
    v_expires := r.invitation_expires_at AT TIME ZONE 'UTC';
    CONTINUE WHEN r.invited_by_user_id IS NULL OR v_expires < v_cutoff;
    v_account := COALESCE(public.bj_project_account('public', r.project_id),
                          (SELECT pf.account_id FROM public.portfolios pf WHERE pf.id = r.portfolio_id),
                          (SELECT pg.account_id FROM public.programmes pg WHERE pg.id = r.programme_id),
                          public.bj_user_account(r.invited_by_user_id));
    v_target := CASE COALESCE(r.entity_type, 'project')
                  WHEN 'portfolio' THEN 'the portfolio ' || COALESCE((SELECT pf.portfolio_name FROM public.portfolios pf WHERE pf.id = r.portfolio_id), '')
                  WHEN 'programme' THEN 'the programme ' || COALESCE((SELECT pg.programme_name FROM public.programmes pg WHERE pg.id = r.programme_id), '')
                  ELSE 'the project ' || COALESCE((SELECT p.project_name FROM public.projects p WHERE p.id = r.project_id), '')
                END;
    PERFORM public.bj_notice(r.invited_by_user_id, 'invitation_expired',
              jsonb_build_object('email', r.invited_email, 'target', btrim(v_target),
                                 'date', public.bj_format_date((v_expires AT TIME ZONE public.bj_account_time_zone(v_account))::DATE,
                                                               public.bj_account_date_format(v_account))),
              'invitation', 'info', FALSE, NULL, v_account, 'public', 'project_invitation', r.id);
    v_notified := v_notified + 1;
  END LOOP;

  -- Organisation invitations
  FOR r IN
    UPDATE public.organisation_invitations i
       SET invitation_status = 'expired', updated_at = NOW()
     WHERE i.invitation_status = 'pending' AND NOT COALESCE(i.is_deleted, FALSE)
       AND i.invitation_expires_at IS NOT NULL AND i.invitation_expires_at < v_now_utc
    RETURNING i.id, i.invited_email, i.invited_by_user_id, i.invitation_expires_at, i.organisation_id
  LOOP
    v_org := v_org + 1;
    v_expires := r.invitation_expires_at AT TIME ZONE 'UTC';
    CONTINUE WHEN r.invited_by_user_id IS NULL OR v_expires < v_cutoff;
    PERFORM public.bj_notice(r.invited_by_user_id, 'invitation_expired',
              jsonb_build_object('email', r.invited_email,
                                 'target', 'the organisation ' || COALESCE((SELECT a.account_name FROM public.accounts a WHERE a.id = r.organisation_id), ''),
                                 'date', public.bj_format_date((v_expires AT TIME ZONE public.bj_account_time_zone(r.organisation_id))::DATE,
                                                               public.bj_account_date_format(r.organisation_id))),
              'invitation', 'info', FALSE, NULL, r.organisation_id, 'public', 'organisation_invitation', r.id);
    v_notified := v_notified + 1;
  END LOOP;

  -- Simulator practice invitations (D8)
  FOR r IN
    UPDATE sim.entity_invitations i
       SET invitation_status = 'expired', updated_at = NOW()
     WHERE i.invitation_status = 'pending' AND NOT COALESCE(i.is_deleted, FALSE)
       AND i.invitation_expires_at IS NOT NULL AND i.invitation_expires_at < NOW()
    RETURNING i.id, i.invited_email, i.invited_by_user_id, i.invitation_expires_at, i.entity_type, i.entity_name
  LOOP
    v_sim := v_sim + 1;
    CONTINUE WHEN r.invited_by_user_id IS NULL OR r.invitation_expires_at < v_cutoff;
    v_account := public.bj_user_account(r.invited_by_user_id);
    PERFORM public.bj_notice(r.invited_by_user_id, 'invitation_expired_practice',
              jsonb_build_object('email', r.invited_email,
                                 'target', COALESCE(NULLIF(btrim(r.entity_name), ''), 'the practice ' || replace(r.entity_type, '_', ' ')),
                                 'date', public.bj_format_date((r.invitation_expires_at AT TIME ZONE public.bj_account_time_zone(v_account))::DATE,
                                                               public.bj_account_date_format(v_account))),
              'invitation', 'info', FALSE, NULL, v_account, 'sim', 'entity_invitation', r.id);
    v_notified := v_notified + 1;
  END LOOP;

  RETURN jsonb_build_object('processed', v_project + v_org + v_sim, 'project_invitations', v_project,
                            'organisation_invitations', v_org, 'practice_invitations', v_sim,
                            'inviters_notified', v_notified, 'dry_run', FALSE);
END;
$$;

-- ── 6. Monthly allowances (2.5) ──────────────────────────────────────────────
-- AI credits: the allowance for the current period is computed (public.ai_period_start / ai_account_allowance,
-- v1272 / v1288 / v1291) and usage counts from the period start, so a new period starts fresh without any
-- ledger write — a "top-up" row here would double the allowance. The job only records each new period once
-- (marker with the previous period's use) and tells the owner and PMO Admins. The first period (trial, new
-- subscription, new organisation) is not a renewal and is skipped.
CREATE OR REPLACE FUNCTION public.run_monthly_allowances(p_context JSONB DEFAULT '{}'::jsonb)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_dry      BOOLEAN := COALESCE((p_context ->> 'dry_run')::BOOLEAN, FALSE);
  s          public.saas_job_settings;
  r          RECORD;
  v_start    TIMESTAMPTZ;
  v_prev     TIMESTAMPTZ;
  v_allow    NUMERIC;
  v_used     NUMERIC;
  v_key      TEXT;
  v_user     UUID;
  v_due      INTEGER := 0;
  v_notified INTEGER := 0;
BEGIN
  s := (SELECT x FROM public.saas_job_settings x WHERE x.id);
  IF NOT s.allowance_notice_enabled THEN
    RETURN jsonb_build_object('processed', 0, 'note', 'allowance notices are switched off (saas_job_settings)');
  END IF;

  FOR r IN
    SELECT st.organisation_id AS account_id, a.created_at AS account_created
      FROM public.ai_settings st
      JOIN public.accounts a ON a.id = st.organisation_id AND NOT COALESCE(a.is_deleted, FALSE)
     WHERE COALESCE(st.ai_enabled, FALSE) AND st.data_privacy_accepted_at IS NOT NULL
       AND NOT COALESCE(st.admin_ai_disabled, FALSE)
  LOOP
    v_start := public.ai_period_start(r.account_id);
    CONTINUE WHEN v_start IS NULL OR v_start > NOW() OR v_start < NOW() - make_interval(days => s.allowance_window_days);
    CONTINUE WHEN v_start = r.account_created
               OR EXISTS (SELECT 1 FROM public.platform_subscriptions ps
                           WHERE ps.account_id = r.account_id AND ps.started_at = v_start);
    v_allow := public.ai_account_allowance(r.account_id);
    CONTINUE WHEN COALESCE(v_allow, 0) <= 0;
    v_prev := v_start - INTERVAL '1 month';
    v_used := COALESCE((SELECT sum(l.credits) FROM public.ai_credit_ledger l
                         WHERE l.account_id = r.account_id AND l.entry_type = 'usage'
                           AND l.created_at >= v_prev AND l.created_at < v_start), 0);
    v_key := 'ai_credits:' || r.account_id::TEXT || ':' || to_char(v_start AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI');
    v_due := v_due + 1;
    IF v_dry THEN CONTINUE; END IF;
    CONTINUE WHEN NOT public.bj_mark_once('allowances.monthly', v_key, r.account_id,
                    jsonb_build_object('allowance', 'ai_credits', 'period_start', v_start, 'previous_period_start', v_prev,
                                       'credits', v_allow, 'used_previous_period', v_used));
    FOREACH v_user IN ARRAY public.bj_account_admin_users(r.account_id) LOOP
      PERFORM public.bj_notice(v_user, 'ai_credits_renewed',
                jsonb_build_object('allowance', to_char(v_allow, 'FM999,999,990'),
                                   'used', to_char(round(v_used, 1), 'FM999,999,990.0'),
                                   'date', public.bj_format_date((v_start AT TIME ZONE public.bj_account_time_zone(r.account_id))::DATE,
                                                                 public.bj_account_date_format(r.account_id))),
                'ai', 'info', FALSE, NULL, r.account_id, 'public', 'ai_allowance', NULL);
      v_notified := v_notified + 1;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object('processed', v_notified, 'periods', v_due, 'dry_run', v_dry);
END;
$$;

-- ── 7. Grants (job internals: service role only) ─────────────────────────────
DO $$
DECLARE
  fn TEXT;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.bj_billing_contacts(uuid)', 'public.payments_has_pending_recheck()',
    'public.payments_pending_for_recheck(integer)', 'public.payments_recheck_note(text,text)',
    'public.run_payment_followup(jsonb)', 'public.run_subscription_renewal_reminders(jsonb)',
    'public.run_invitation_expiry(jsonb)', 'public.run_monthly_allowances(jsonb)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
  END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION public.payments_pending_for_recheck(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.payments_recheck_note(TEXT, TEXT) TO service_role;

-- ── 8. Catalogue rows (rule 80) ──────────────────────────────────────────────
SELECT public.background_job_register(
  p_code => 'payments.pending_recheck',
  p_name => 'Pending payment re-check',
  p_kind => 'handler',
  p_description => 'Asks Paynow about pending payments the browser did not finish; only hash-verified answers count, and final ones go to paynow-webhook.',
  p_owner_system => 'platform',
  p_cron => '5 * * * *',
  p_timeout_seconds => 300,
  p_max_attempts => 2,
  p_backoff_schedule => ARRAY[600],
  p_item_ttl_seconds => 3000,
  p_batch_size => 1,
  p_enqueue_guard => 'public.payments_has_pending_recheck'
);
SELECT public.background_job_register(
  p_code => 'payments.followup',
  p_name => 'Payment follow-up',
  p_kind => 'sql',
  p_description => 'Marks long-pending payments as expired and follows up once on each failed or cancelled payment (in-app and email).',
  p_owner_system => 'platform',
  p_sql_function => 'public.run_payment_followup',
  p_cron => '20 * * * *',
  p_timeout_seconds => 300
);
SELECT public.background_job_register(
  p_code => 'subscriptions.renewal_reminders',
  p_name => 'Subscription renewal reminders',
  p_kind => 'sql',
  p_description => 'Reminds billing contacts before a subscription ends and once after it ended (Platform, Planner and Simulator subscriptions).',
  p_owner_system => 'platform',
  p_sql_function => 'public.run_subscription_renewal_reminders',
  p_cron => '0 8 * * *',
  p_time_basis => 'organisation',
  p_timeout_seconds => 300
);
SELECT public.background_job_register(
  p_code => 'invitations.expire',
  p_name => 'Invitation expiry',
  p_kind => 'sql',
  p_description => 'Marks pending invitations past their expiry date as expired (Platform and Simulator) and tells the inviter in the app.',
  p_owner_system => 'platform',
  p_sql_function => 'public.run_invitation_expiry',
  p_cron => '0 1 * * *',
  p_timeout_seconds => 300
);
SELECT public.background_job_register(
  p_code => 'allowances.monthly',
  p_name => 'Monthly allowances',
  p_kind => 'sql',
  p_description => 'Records each organisation’s new AI credit period once and tells the owner and PMO Admins (credits renew by themselves).',
  p_owner_system => 'platform',
  p_sql_function => 'public.run_monthly_allowances',
  p_cron => '30 1 * * *',
  p_timeout_seconds => 300
);

NOTIFY pgrst, 'reload schema';

-- Checks: the new jobs, and what each would do today (dry runs change nothing).
SELECT code, kind, cron, time_basis, enabled, enqueue_guard FROM public.background_jobs
 WHERE code IN ('payments.pending_recheck', 'payments.followup', 'subscriptions.renewal_reminders',
                'invitations.expire', 'allowances.monthly')
 ORDER BY code;
SELECT public.run_payment_followup('{"dry_run": true}') AS payments,
       public.run_subscription_renewal_reminders('{"dry_run": true}') AS renewals,
       public.run_invitation_expiry('{"dry_run": true}') AS invitations,
       public.run_monthly_allowances('{"dry_run": true}') AS allowances;
