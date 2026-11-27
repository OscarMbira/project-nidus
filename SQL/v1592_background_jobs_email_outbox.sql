-- ============================================================================
-- v1592 — v1352 background jobs, Slice 2 (2.1): email outbox, retry wake-up, shared notice helpers
-- ============================================================================
-- PRD: projectprd/v1352_background_jobs_PRD.md · Plan: projectplan/v1352_background_jobs_plan.md (Slice 2)
-- Prerequisites: v1559, v1560 (framework + tick), v1562 (bj_* helpers). Idempotent.
--
-- 1. Email outbox. One queue item of job `email.send` = one email. Retry, back-off, `dead` and single-item
--    replay are the v1352 queue's own (background_job_item_complete / background_job_replay_item) — there
--    is no second retry mechanism. Entry point for SQL jobs, triggers and RPCs (and handlers through
--    ctx.rpc): public.queue_email(to, subject, html | body, dedupe_key, organisation_id, practice).
--    No client grant: a feature calls it from its own SECURITY DEFINER function.
-- 2. Retry wake-up (`system.queue_wake`). Until now a queue item waiting for its next back-off step only ran
--    when something else woke the worker. This job wakes the worker once a minute, but only while an item
--    has been ready for 30 seconds or more (the guard keeps the run history quiet otherwise).
-- 3. Shared pieces for Slice 2 jobs (v1593):
--    - public.background_job_markers   "already done" markers per job (idempotency keys, period keys)
--    - public.background_job_messages  notice texts per message key (rule 25.1 — texts are data)
--    - public.saas_job_settings         one row of thresholds (re-check window, reminder days, …)
--    - public.bj_mark_once, public.bj_render, public.bj_notice (in-app notice + optional outbox email)
-- All new tables: RLS on, no client access; registered in database_tables.
-- After running: re-run SQL/v1251_planner_table_wall.sql (table registration rule 6).
-- ============================================================================

-- ── 1. Tables ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.background_job_markers (
  job_code         TEXT NOT NULL,
  marker_key       TEXT NOT NULL CHECK (length(marker_key) BETWEEN 1 AND 300),
  organisation_id  UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  detail           JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_background_job_markers PRIMARY KEY (job_code, marker_key)
);
CREATE INDEX IF NOT EXISTS idx_background_job_markers_org ON public.background_job_markers (organisation_id)
  WHERE organisation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_background_job_markers_created ON public.background_job_markers (created_at);
COMMENT ON TABLE public.background_job_markers IS
  'v1352 Slice 2: one row per thing a job must do only once (a reminder step, a follow-up, a monthly period). Rule 80 idempotency.';

CREATE TABLE IF NOT EXISTS public.background_job_messages (
  message_key  TEXT PRIMARY KEY CHECK (message_key ~ '^[a-z][a-z0-9_]*$'),
  title        TEXT NOT NULL,
  body         TEXT NOT NULL,
  description  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.background_job_messages IS
  'v1352 Slice 2: notice texts used by background jobs (in-app title / message, also the email subject / body). Placeholders {name}. Rule 25.1.';

CREATE TABLE IF NOT EXISTS public.saas_job_settings (
  id                               BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  pending_recheck_min_age_minutes  INTEGER NOT NULL DEFAULT 10   CHECK (pending_recheck_min_age_minutes BETWEEN 1 AND 1440),
  pending_recheck_window_hours     INTEGER NOT NULL DEFAULT 72   CHECK (pending_recheck_window_hours BETWEEN 1 AND 720),
  pending_expire_after_days        INTEGER NOT NULL DEFAULT 7    CHECK (pending_expire_after_days BETWEEN 1 AND 365),
  failed_payment_min_age_minutes   INTEGER NOT NULL DEFAULT 60   CHECK (failed_payment_min_age_minutes BETWEEN 0 AND 10080),
  failed_payment_window_days       INTEGER NOT NULL DEFAULT 7    CHECK (failed_payment_window_days BETWEEN 1 AND 90),
  renewal_reminder_days            INTEGER[] NOT NULL DEFAULT ARRAY[7, 1],
  renewal_expired_notice_days      INTEGER NOT NULL DEFAULT 3    CHECK (renewal_expired_notice_days BETWEEN 0 AND 30),
  invitation_notify_window_days    INTEGER NOT NULL DEFAULT 7    CHECK (invitation_notify_window_days BETWEEN 0 AND 90),
  allowance_notice_enabled         BOOLEAN NOT NULL DEFAULT TRUE,
  allowance_window_days            INTEGER NOT NULL DEFAULT 3    CHECK (allowance_window_days BETWEEN 1 AND 28),
  updated_at                       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT saas_job_settings_reminder_days CHECK (cardinality(renewal_reminder_days) BETWEEN 1 AND 6)
);
INSERT INTO public.saas_job_settings (id) VALUES (TRUE) ON CONFLICT (id) DO NOTHING;
COMMENT ON TABLE public.saas_job_settings IS
  'v1352 Slice 2: thresholds of the payment, renewal, invitation and allowance jobs (one row; edited with SQL until an Admin screen exists).';

ALTER TABLE public.background_job_markers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.background_job_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_job_settings       ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.background_job_markers, public.background_job_messages, public.saas_job_settings FROM anon, authenticated;
GRANT ALL ON public.background_job_markers, public.background_job_messages, public.saas_job_settings TO service_role;

-- ── 2. Notice texts (data, rule 25.1; examples follow rule 77) ───────────────
INSERT INTO public.background_job_messages (message_key, title, body, description) VALUES
  ('subscription_renewal_due',
   'Your subscription renews on {date}',
   'Your {plan} subscription ends on {date} ({days_left} left).
To keep working without a break, renew it from Subscription & Billing before then.',
   'Renewal reminder before the end date of a Platform / Planner subscription (owner and billing delegates).'),
  ('subscription_expired',
   'Your subscription ended on {date}',
   'Your {plan} subscription ended on {date}.
Renew it from Subscription & Billing to restore full access. Your data is kept.',
   'Sent once after a Platform / Planner subscription end date has passed.'),
  ('simulator_subscription_renewal_due',
   'Simulator: your subscription renews on {date}',
   'Your Simulator {plan} subscription ends on {date} ({days_left} left).
Renew it from the Simulator’s subscription page to keep your practice access.',
   'Renewal reminder for a Simulator subscription (the learner).'),
  ('simulator_subscription_expired',
   'Simulator: your subscription ended on {date}',
   'Your Simulator {plan} subscription ended on {date}.
Renew it from the Simulator’s subscription page to restore your practice access.',
   'Sent once after a Simulator subscription end date has passed.'),
  ('payment_failed',
   'Your payment did not go through',
   'Your payment of {amount} (reference {reference}) was {status} at Paynow, so nothing was charged.
You can try again from Subscription & Billing. If money left your account, contact support with the reference.',
   'Follow-up after a failed or cancelled Paynow payment (the payer, or the account owner).'),
  ('invitation_expired',
   'Invitation expired: {email}',
   'The invitation you sent to {email} for {target} expired on {date} before it was accepted.
Send a new invitation if they still need access.',
   'Tells the inviter that a Platform invitation expired.'),
  ('invitation_expired_practice',
   'Practice: invitation expired: {email}',
   'The practice invitation you sent to {email} for {target} expired on {date} before it was accepted.
Send a new one from the Simulator if it is still needed.',
   'Tells the inviter that a Simulator practice invitation expired.'),
  ('ai_credits_renewed',
   'AI credits renewed: {allowance} credits',
   'Your organisation’s AI credits for the period starting {date} are ready: {allowance} credits.
In the previous period your organisation used {used} credits.',
   'Monthly AI allowance notice for the organisation’s owner and PMO Admins (when AI is switched on).')
ON CONFLICT (message_key) DO NOTHING;

-- ── 3. Helpers ───────────────────────────────────────────────────────────────
-- TRUE the first time a (job, key) is marked; FALSE afterwards. The marker is the "already done" record.
CREATE OR REPLACE FUNCTION public.bj_mark_once(p_job_code TEXT, p_key TEXT, p_organisation_id UUID DEFAULT NULL,
                                               p_detail JSONB DEFAULT '{}'::jsonb)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_rows INTEGER;
BEGIN
  INSERT INTO public.background_job_markers (job_code, marker_key, organisation_id, detail)
  VALUES (p_job_code, p_key, p_organisation_id, COALESCE(p_detail, '{}'::jsonb))
  ON CONFLICT (job_code, marker_key) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$;

-- {name} placeholders filled from a JSON object (missing values become empty).
CREATE OR REPLACE FUNCTION public.bj_render(p_text TEXT, p_vars JSONB)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  v_out TEXT := COALESCE(p_text, '');
  r     RECORD;
BEGIN
  FOR r IN SELECT key, value FROM jsonb_each_text(COALESCE(p_vars, '{}'::jsonb)) LOOP
    v_out := replace(v_out, '{' || r.key || '}', COALESCE(r.value, ''));
  END LOOP;
  RETURN v_out;
END;
$$;

-- ── 4. Email outbox (2.1) ────────────────────────────────────────────────────
SELECT public.background_job_register(
  p_code => 'email.send',
  p_name => 'Email outbox',
  p_kind => 'handler',
  p_description => 'Sends queued emails through send-email, one email per item, with retry and back-off (public.queue_email).',
  p_owner_system => 'system',
  p_timeout_seconds => 120,
  p_max_attempts => 6,
  p_backoff_schedule => ARRAY[60, 300, 1800, 7200, 21600, 86400],
  p_item_ttl_seconds => 259200,
  p_batch_size => 100,
  p_per_org_batch_cap => 25
);

-- Queue one email. Give ready HTML (p_html) or a plain text body (p_body, built by the handler).
-- Returns the queue item id (the existing one when p_dedupe_key was used before). Does not wake the worker:
-- the caller does that once after its loop (public.background_job_wake_worker), or system.queue_wake does
-- within a minute.
CREATE OR REPLACE FUNCTION public.queue_email(
  p_to TEXT,
  p_subject TEXT,
  p_html TEXT DEFAULT NULL,
  p_body TEXT DEFAULT NULL,
  p_dedupe_key TEXT DEFAULT NULL,
  p_organisation_id UUID DEFAULT NULL,
  p_practice BOOLEAN DEFAULT FALSE
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_to TEXT := lower(btrim(COALESCE(p_to, '')));
BEGIN
  IF v_to !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN RAISE EXCEPTION 'queue_email: not an email address: %', p_to; END IF;
  IF COALESCE(btrim(p_subject), '') = '' THEN RAISE EXCEPTION 'queue_email: a subject is required'; END IF;
  IF COALESCE(btrim(p_html), '') = '' AND COALESCE(btrim(p_body), '') = '' THEN
    RAISE EXCEPTION 'queue_email: html or body is required';
  END IF;
  RETURN public.enqueue_background_job('email.send',
    jsonb_strip_nulls(jsonb_build_object('to', v_to, 'subject', left(btrim(p_subject), 300),
      'html', NULLIF(btrim(COALESCE(p_html, '')), ''), 'body', NULLIF(btrim(COALESCE(p_body, '')), ''),
      'practice', COALESCE(p_practice, FALSE))),
    NULL,
    CASE WHEN NULLIF(btrim(COALESCE(p_dedupe_key, '')), '') IS NOT NULL THEN 'email:' || btrim(p_dedupe_key) END,
    p_organisation_id);
END;
$$;

-- One notice to one person: an in-app notification (both apps read public.notifications; p_schema 'sim'
-- puts it in the Simulator) and, when p_email, the same text as an outbox email. An emailed notice is
-- marked email_sent so the daily digest does not repeat it. Returns {notified, emailed}.
CREATE OR REPLACE FUNCTION public.bj_notice(
  p_user_id UUID,
  p_message_key TEXT,
  p_vars JSONB,
  p_category TEXT,
  p_type TEXT DEFAULT 'info',
  p_email BOOLEAN DEFAULT FALSE,
  p_dedupe_key TEXT DEFAULT NULL,
  p_organisation_id UUID DEFAULT NULL,
  p_schema TEXT DEFAULT 'public',
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_msg   public.background_job_messages;
  v_title TEXT;
  v_body  TEXT;
  v_email TEXT;
  v_id    UUID;
  v_sent  BOOLEAN := FALSE;
BEGIN
  IF p_user_id IS NULL THEN RETURN jsonb_build_object('notified', FALSE, 'emailed', FALSE); END IF;
  v_msg := (SELECT m FROM public.background_job_messages m WHERE m.message_key = p_message_key);
  IF v_msg.message_key IS NULL THEN RAISE EXCEPTION 'bj_notice: unknown message key %', p_message_key; END IF;
  v_title := public.bj_render(v_msg.title, p_vars);
  v_body  := public.bj_render(v_msg.body, p_vars);

  v_id := public.bj_notify(p_user_id, COALESCE(p_type, 'info'), p_category, v_title, v_body, p_entity_type, p_entity_id,
                           NULL, jsonb_build_object('schema', COALESCE(p_schema, 'public'), 'message_key', p_message_key,
                                                    'source', 'background_job'));
  IF COALESCE(p_email, FALSE) THEN
    v_email := (SELECT NULLIF(btrim(u.email), '') FROM public.users u
                 WHERE u.id = p_user_id AND NOT COALESCE(u.is_deleted, FALSE));
    IF v_email IS NOT NULL AND v_email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
      PERFORM public.queue_email(v_email, v_title, NULL, v_body,
                                 CASE WHEN p_dedupe_key IS NOT NULL THEN p_dedupe_key || ':' || p_user_id::TEXT END,
                                 p_organisation_id, FALSE);
      UPDATE public.notifications SET email_sent = TRUE, email_sent_at = NOW() WHERE id = v_id;
      v_sent := TRUE;
    END IF;
  END IF;
  RETURN jsonb_build_object('notified', v_id IS NOT NULL, 'emailed', v_sent, 'notification_id', v_id);
END;
$$;

-- ── 5. Retry wake-up (system.queue_wake) ──────────────────────────────────────
-- Guard: an item of an enabled job has been ready for 30 seconds or more (a just-queued item was already
-- woken by whoever queued it).
CREATE OR REPLACE FUNCTION public.background_job_queue_has_ready_items()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  SELECT EXISTS (SELECT 1 FROM public.background_job_queue q
                   JOIN public.background_jobs j ON j.code = q.job_code AND j.enabled
                  WHERE q.status = 'pending' AND q.run_after <= NOW() - INTERVAL '30 seconds');
$$;

CREATE OR REPLACE FUNCTION public.background_job_wake_for_ready_items()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_ready INTEGER;
  v_wake  TEXT := 'nothing waiting';
BEGIN
  v_ready := (SELECT count(*) FROM public.background_job_queue q
                JOIN public.background_jobs j ON j.code = q.job_code AND j.enabled
               WHERE q.status = 'pending' AND q.run_after <= NOW());
  IF v_ready > 0 THEN v_wake := public.background_job_wake_worker(); END IF;
  RETURN jsonb_build_object('processed', v_ready, 'wake', v_wake);
END;
$$;

SELECT public.background_job_register(
  p_code => 'system.queue_wake',
  p_name => 'Queue retry wake-up',
  p_kind => 'sql',
  p_description => 'Wakes the worker when queue items are waiting (retries after back-off, outbox emails), so they never wait for an unrelated job.',
  p_owner_system => 'system',
  p_sql_function => 'public.background_job_wake_for_ready_items',
  p_cron => '* * * * *',
  p_timeout_seconds => 60,
  p_enqueue_guard => 'public.background_job_queue_has_ready_items'
);

-- ── 6. Grants (job internals: service role only) ─────────────────────────────
DO $$
DECLARE
  fn TEXT;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.bj_mark_once(text,text,uuid,jsonb)',
    'public.queue_email(text,text,text,text,text,uuid,boolean)',
    'public.bj_notice(uuid,text,jsonb,text,text,boolean,text,uuid,text,text,uuid)',
    'public.background_job_queue_has_ready_items()',
    'public.background_job_wake_for_ready_items()'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
END $$;

-- ── 7. Register the new tables ───────────────────────────────────────────────
INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('background_job_markers', 'Background job "already done" markers: reminder steps, follow-ups, monthly periods (v1352 Slice 2)', true, true),
  ('background_job_messages', 'Notice texts used by background jobs, per message key (v1352 Slice 2)', true, true),
  ('saas_job_settings', 'Thresholds of the payment, renewal, invitation and allowance background jobs (v1352 Slice 2)', true, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

NOTIFY pgrst, 'reload schema';

-- Check
SELECT code, kind, cron, enabled, enqueue_guard FROM public.background_jobs WHERE code IN ('email.send', 'system.queue_wake') ORDER BY code;
