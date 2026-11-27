-- ============================================================================
-- v1594 tests: background jobs Slice 2 (v1352) — email outbox, retry wake-up, payment follow-up, renewal
-- reminders, invitation expiry, monthly allowances. Run after v1592 and v1593.
-- Everything runs in one transaction that ROLLS BACK at the end: nothing is kept, no table is created
-- (test state lives in transaction settings). The worker is not woken (its address is cleared inside the
-- transaction). Each block raises an exception (the editor shows the failing test) or a NOTICE "PASS …".
-- Blocks that need data the database does not have (an organisation without a subscription, a project
-- with a role) print "SKIP …" instead.
--
--   T1  helpers: bj_render, renewal_step, bj_days_text, bj_is_uuid, bj_mark_once
--   T2  queue_email: checks, dedupe, payload; the retry wake-up guard sees a waiting item
--   T3  bj_notice: in-app notice + outbox email, marked emailed so the digest skips it
--   T4  payments: re-check claim and window, stale pending expired, one follow-up per failed payment,
--       none after a later paid payment
--   T5  monthly allowances: a new AI credit period is recorded once with the previous period's use;
--       nothing is written to the credit ledger
--   T6  renewal reminders: 7-day step, 1-day step, ended notice, each once (Platform); Simulator step
--   T7  invitation expiry: practice invitations expired, inviter told only inside the window, once;
--       a Platform project invitation the same
--   T8  catalogue: the Slice 2 jobs are registered with the right kind, schedule and basis
-- ============================================================================

BEGIN;

UPDATE public.background_job_config SET functions_base_url = NULL WHERE id;

-- Test organisation: not Planner, owner with an auth user and an email, no running subscription.
DO $$
DECLARE
  v_acc  UUID;
  v_sim  UUID;
BEGIN
  v_acc := (SELECT a.id FROM public.accounts a
              JOIN public.users u ON u.id = a.owner_user_id
             WHERE NOT COALESCE(a.is_deleted, FALSE) AND COALESCE(a.product_edition::TEXT, 'platform') <> 'planner'
               AND u.auth_user_id IS NOT NULL AND COALESCE(btrim(u.email), '') <> '' AND NOT COALESCE(u.is_deleted, FALSE)
               AND EXISTS (SELECT 1 FROM auth.users au WHERE au.id = u.auth_user_id)  -- subscriptions reference auth.users
               AND NOT EXISTS (SELECT 1 FROM public.platform_subscriptions ps
                                WHERE ps.account_id = a.id AND ps.status IN ('active', 'trial', 'trialing', 'past_due'))
             ORDER BY a.created_at LIMIT 1);
  v_sim := (SELECT u.id FROM public.users u
             WHERE u.auth_user_id IS NOT NULL AND COALESCE(btrim(u.email), '') <> '' AND NOT COALESCE(u.is_deleted, FALSE)
               AND EXISTS (SELECT 1 FROM auth.users au WHERE au.id = u.auth_user_id)  -- simulator_subscriptions.user_id references auth.users
               AND NOT EXISTS (SELECT 1 FROM sim.simulator_subscriptions ss
                                WHERE ss.user_id = u.auth_user_id AND ss.status = 'active' AND ss.plan_type <> 'free')
             ORDER BY u.created_at LIMIT 1);
  PERFORM set_config('bjs2.account', COALESCE(v_acc::TEXT, ''), true);
  PERFORM set_config('bjs2.sim_user', COALESCE(v_sim::TEXT, ''), true);
END $$;

-- T1 ─────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  ASSERT public.bj_render('Plan {plan} ends {date}', '{"plan": "Professional", "date": "5 Dec 2026"}') = 'Plan Professional ends 5 Dec 2026', 'T1 render';
  ASSERT public.bj_render('Hello {name}', '{}') = 'Hello {name}', 'T1 render leaves unknown placeholders';
  ASSERT public.renewal_step(10, ARRAY[7, 1]) IS NULL, 'T1 too early';
  ASSERT public.renewal_step(7, ARRAY[7, 1]) = 7, 'T1 first step';
  ASSERT public.renewal_step(2, ARRAY[1, 7]) = 7, 'T1 between steps (order of the list does not matter)';
  ASSERT public.renewal_step(1, ARRAY[7, 1]) = 1, 'T1 last step';
  ASSERT public.renewal_step(0, ARRAY[7, 1]) = 1, 'T1 end day counts as the last step';
  ASSERT public.renewal_step(-1, ARRAY[7, 1]) IS NULL, 'T1 past the end';
  ASSERT public.renewal_step(20, ARRAY[30, 14, 3]) = 30, 'T1 three steps';
  ASSERT public.bj_days_text(1) = '1 day' AND public.bj_days_text(5) = '5 days' AND public.bj_days_text(0) = 'ends today', 'T1 days text';
  ASSERT public.bj_is_uuid(gen_random_uuid()::TEXT) AND NOT public.bj_is_uuid('not-a-uuid') AND NOT public.bj_is_uuid(NULL), 'T1 uuid check';
  ASSERT public.bj_mark_once('zz.test', 'k1', NULL, '{}'), 'T1 first mark';
  ASSERT NOT public.bj_mark_once('zz.test', 'k1', NULL, '{}'), 'T1 second mark refused';
  ASSERT public.bj_mark_once('zz.other', 'k1', NULL, '{}'), 'T1 markers are per job';
  RAISE NOTICE 'PASS T1 helpers';
END $$;

-- T2 ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_id   UUID;
  v_id2  UUID;
  v_item public.background_job_queue;
  v_err  INTEGER := 0;
BEGIN
  BEGIN PERFORM public.queue_email('not an address', 'Subject', NULL, 'Body'); EXCEPTION WHEN OTHERS THEN v_err := v_err + 1; END;
  BEGIN PERFORM public.queue_email('head.of.finance@company.example', '', NULL, 'Body'); EXCEPTION WHEN OTHERS THEN v_err := v_err + 1; END;
  BEGIN PERFORM public.queue_email('head.of.finance@company.example', 'Subject', NULL, NULL); EXCEPTION WHEN OTHERS THEN v_err := v_err + 1; END;
  ASSERT v_err = 3, 'T2 bad address, empty subject and empty body are refused';

  v_id := public.queue_email('Head.Of.Finance@Company.example', 'Example notice', NULL, 'Line one' || chr(10) || '- a point',
                             'zz-test-1', NULL, TRUE);
  v_id2 := public.queue_email('head.of.finance@company.example', 'Example notice again', NULL, 'Other', 'zz-test-1');
  ASSERT v_id IS NOT NULL AND v_id = v_id2, 'T2 same dedupe key → same item';
  v_item := (SELECT q FROM public.background_job_queue q WHERE q.id = v_id);
  ASSERT v_item.job_code = 'email.send' AND v_item.status = 'pending', 'T2 queued on email.send';
  ASSERT v_item.payload ->> 'to' = 'head.of.finance@company.example', 'T2 address lower-cased';
  ASSERT v_item.payload ->> 'subject' = 'Example notice' AND (v_item.payload ->> 'practice')::BOOLEAN, 'T2 payload';
  ASSERT NOT (v_item.payload ? 'html'), 'T2 no html when a body is given';
  ASSERT v_item.max_attempts = 6 AND v_item.expires_at IS NOT NULL, 'T2 outbox retry settings from the catalogue';
  ASSERT v_item.dedupe_key = 'email:zz-test-1', 'T2 dedupe key prefixed';

  UPDATE public.background_job_queue SET run_after = NOW() - INTERVAL '2 minutes' WHERE id = v_id;
  ASSERT public.background_job_queue_has_ready_items(), 'T2 retry wake-up guard sees a waiting item';
  ASSERT (public.background_job_wake_for_ready_items() ->> 'processed')::INT >= 1, 'T2 wake-up counts it';
  RAISE NOTICE 'PASS T2 email outbox';
END $$;

-- T3 ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_acc   UUID := NULLIF(current_setting('bjs2.account'), '')::UUID;
  v_owner UUID;
  v_res   JSONB;
  v_n     public.notifications;
BEGIN
  IF v_acc IS NULL THEN RAISE NOTICE 'SKIP T3 — no suitable organisation'; RETURN; END IF;
  v_owner := (SELECT a.owner_user_id FROM public.accounts a WHERE a.id = v_acc);
  v_res := public.bj_notice(v_owner, 'payment_failed', '{"amount": "USD 10.00", "reference": "ZZ-REF", "status": "declined"}',
                            'billing', 'warning', TRUE, 'zz-notice', v_acc, 'public', NULL, NULL);
  ASSERT (v_res ->> 'notified')::BOOLEAN AND (v_res ->> 'emailed')::BOOLEAN, 'T3 notified and emailed: ' || v_res::TEXT;
  v_n := (SELECT n FROM public.notifications n WHERE n.id = (v_res ->> 'notification_id')::UUID);
  ASSERT v_n.title = 'Your payment did not go through', 'T3 title from the message table';
  ASSERT v_n.message LIKE '%USD 10.00 (reference ZZ-REF) was declined%', 'T3 body rendered: ' || v_n.message;
  ASSERT v_n.email_sent, 'T3 marked emailed, so the digest skips it';
  ASSERT EXISTS (SELECT 1 FROM public.background_job_queue q
                  WHERE q.job_code = 'email.send' AND q.dedupe_key = 'email:zz-notice:' || v_owner::TEXT), 'T3 outbox email queued';
  v_res := public.bj_notice(v_owner, 'invitation_expired', '{"email": "x@company.example", "target": "the project Example", "date": "1 Dec 2026"}',
                            'invitation', 'info', FALSE, NULL, v_acc);
  ASSERT NOT (v_res ->> 'emailed')::BOOLEAN, 'T3 in-app only when no email asked';
  ASSERT NOT (SELECT n.email_sent FROM public.notifications n WHERE n.id = (v_res ->> 'notification_id')::UUID), 'T3 left for the digest';
  RAISE NOTICE 'PASS T3 notices';
END $$;

-- T4 ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_acc    UUID := NULLIF(current_setting('bjs2.account'), '')::UUID;
  v_owner  public.users;
  v_fresh  TEXT := 'ZZBJ2-FRESH-' || substr(gen_random_uuid()::TEXT, 1, 8);
  v_old    TEXT := 'ZZBJ2-OLD-' || substr(gen_random_uuid()::TEXT, 1, 8);
  v_stale  TEXT := 'ZZBJ2-STALE-' || substr(gen_random_uuid()::TEXT, 1, 8);
  v_failed UUID;
  v_paidfl UUID;
  v_before INTEGER;
  v_res    JSONB;
BEGIN
  IF v_acc IS NULL THEN RAISE NOTICE 'SKIP T4 — no suitable organisation'; RETURN; END IF;
  v_owner := (SELECT u FROM public.users u JOIN public.accounts a ON a.owner_user_id = u.id WHERE a.id = v_acc);

  INSERT INTO public.payment_transactions (reference, amount, currency, status, payment_provider, metadata, poll_url, created_at, updated_at) VALUES
    (v_fresh, 25, 'USD', 'pending', 'paynow', jsonb_build_object('organisation_id', v_acc), 'https://www.paynow.co.zw/Interface/CheckPayment/?guid=zz1', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour'),
    (v_old,   25, 'USD', 'pending', 'paynow', jsonb_build_object('organisation_id', v_acc), 'https://www.paynow.co.zw/Interface/CheckPayment/?guid=zz2', NOW() - INTERVAL '100 hours', NOW() - INTERVAL '100 hours'),
    (v_stale, 25, 'USD', 'pending', 'paynow', jsonb_build_object('organisation_id', v_acc), 'https://www.paynow.co.zw/Interface/CheckPayment/?guid=zz3', NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days');

  -- re-check claim: the fresh payment once, the old one never (outside the window)
  ASSERT public.payments_has_pending_recheck(), 'T4 guard sees the fresh payment';
  ASSERT EXISTS (SELECT 1 FROM public.payments_pending_for_recheck(200) x WHERE x.reference = v_fresh), 'T4 fresh payment claimed';
  ASSERT (SELECT check_count FROM public.payment_transactions WHERE reference = v_fresh) = 1, 'T4 check counted';
  ASSERT NOT EXISTS (SELECT 1 FROM public.payments_pending_for_recheck(200) x WHERE x.reference = v_fresh), 'T4 not asked again within the hour';
  ASSERT (SELECT check_count FROM public.payment_transactions WHERE reference = v_old) = 0, 'T4 outside the window: not checked';
  ASSERT public.payments_recheck_note(v_fresh, 'still pending at Paynow'), 'T4 note written';
  ASSERT (SELECT last_check_result FROM public.payment_transactions WHERE reference = v_fresh) = 'still pending at Paynow', 'T4 note stored';

  -- failed payment → one follow-up; a failed payment followed by a paid one → none
  v_failed := gen_random_uuid();
  INSERT INTO public.payment_transactions (id, reference, amount, currency, status, payment_provider, metadata, created_at, updated_at)
  VALUES (v_failed, 'ZZBJ2-FAIL-' || substr(gen_random_uuid()::TEXT, 1, 8), 40, 'USD', 'failed', 'paynow',
          jsonb_build_object('organisation_id', v_acc, 'initiated_by_auth_user_id', v_owner.auth_user_id, 'type', 'subscription'),
          NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours');
  PERFORM set_config('bjs2.failed', v_failed::TEXT, true);
  v_before := (SELECT count(*) FROM public.notifications WHERE user_id = v_owner.id AND notification_data ->> 'message_key' = 'payment_failed');

  v_res := public.run_payment_followup('{}'::jsonb);
  ASSERT (SELECT status FROM public.payment_transactions WHERE reference = v_stale) = 'expired', 'T4 stale pending payment expired';
  ASSERT (SELECT status FROM public.payment_transactions WHERE reference = v_old) = 'pending', 'T4 4-day-old payment still pending';
  ASSERT EXISTS (SELECT 1 FROM public.background_job_markers WHERE job_code = 'payments.followup' AND marker_key = 'failed:' || v_failed::TEXT),
         'T4 follow-up marker: ' || v_res::TEXT;
  ASSERT (SELECT count(*) FROM public.notifications WHERE user_id = v_owner.id AND notification_data ->> 'message_key' = 'payment_failed') = v_before + 1,
         'T4 one in-app follow-up to the payer';
  ASSERT EXISTS (SELECT 1 FROM public.background_job_queue q WHERE q.job_code = 'email.send'
                  AND q.dedupe_key = 'email:payment_failed:' || v_failed::TEXT || ':' || v_owner.id::TEXT), 'T4 follow-up email queued';

  PERFORM public.run_payment_followup('{}'::jsonb);
  ASSERT (SELECT count(*) FROM public.notifications WHERE user_id = v_owner.id AND notification_data ->> 'message_key' = 'payment_failed') = v_before + 1,
         'T4 second run sends nothing more';

  v_paidfl := gen_random_uuid();
  INSERT INTO public.payment_transactions (id, reference, amount, currency, status, payment_provider, metadata, created_at, updated_at)
  VALUES (v_paidfl, 'ZZBJ2-FAIL2-' || substr(gen_random_uuid()::TEXT, 1, 8), 40, 'USD', 'cancelled', 'paynow',
          jsonb_build_object('organisation_id', v_acc, 'initiated_by_auth_user_id', v_owner.auth_user_id),
          NOW() - INTERVAL '5 hours', NOW() - INTERVAL '4 hours');
  INSERT INTO public.payment_transactions (reference, amount, currency, status, payment_provider, metadata, created_at, updated_at)
  VALUES ('ZZBJ2-PAID-' || substr(gen_random_uuid()::TEXT, 1, 8), 40, 'USD', 'paid', 'paynow',
          jsonb_build_object('organisation_id', v_acc), NOW() - INTERVAL '4 hours', NOW() - INTERVAL '4 hours');
  v_res := public.run_payment_followup('{"dry_run": true}'::jsonb);
  ASSERT (v_res ->> 'followed_up')::INT = 0 OR NOT EXISTS (SELECT 1 FROM public.background_job_markers WHERE marker_key = 'failed:' || v_paidfl::TEXT),
         'T4 dry run writes no marker';
  PERFORM public.run_payment_followup('{}'::jsonb);
  ASSERT NOT EXISTS (SELECT 1 FROM public.background_job_markers WHERE job_code = 'payments.followup' AND marker_key = 'failed:' || v_paidfl::TEXT),
         'T4 no follow-up when the organisation paid since';
  RAISE NOTICE 'PASS T4 payments';
END $$;

-- T5 ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_acc     UUID := NULLIF(current_setting('bjs2.account'), '')::UUID;
  v_ledger  INTEGER;
  v_start   TIMESTAMPTZ;
  v_marker  public.background_job_markers;
  v_res     JSONB;
BEGIN
  IF v_acc IS NULL THEN RAISE NOTICE 'SKIP T5 — no suitable organisation'; RETURN; END IF;
  -- The organisation is one month and one day old, AI on with a 500-credit allowance → a new period began yesterday.
  UPDATE public.accounts SET created_at = NOW() - INTERVAL '1 month' - INTERVAL '1 day' WHERE id = v_acc;
  INSERT INTO public.ai_settings (organisation_id, ai_enabled, data_privacy_accepted_at, credit_allowance_override, admin_ai_disabled)
  VALUES (v_acc, TRUE, NOW() - INTERVAL '40 days', 500, FALSE)
  ON CONFLICT (organisation_id) DO UPDATE SET ai_enabled = TRUE, data_privacy_accepted_at = NOW() - INTERVAL '40 days',
                                              credit_allowance_override = 500, admin_ai_disabled = FALSE;
  INSERT INTO public.ai_credit_ledger (account_id, entry_type, credits, app, note, created_at)
  VALUES (v_acc, 'usage', 12.5, 'platform', 'v1594 test usage', NOW() - INTERVAL '10 days');
  v_start := public.ai_period_start(v_acc);
  ASSERT v_start > NOW() - INTERVAL '3 days' AND v_start <= NOW(), 'T5 setup: period began in the last days: ' || v_start::TEXT;
  v_ledger := (SELECT count(*) FROM public.ai_credit_ledger WHERE account_id = v_acc);

  v_res := public.run_monthly_allowances('{"dry_run": true}'::jsonb);
  ASSERT NOT EXISTS (SELECT 1 FROM public.background_job_markers WHERE job_code = 'allowances.monthly' AND organisation_id = v_acc), 'T5 dry run marks nothing';

  v_res := public.run_monthly_allowances('{}'::jsonb);
  v_marker := (SELECT m FROM public.background_job_markers m WHERE m.job_code = 'allowances.monthly' AND m.organisation_id = v_acc);
  ASSERT v_marker.marker_key IS NOT NULL, 'T5 period recorded: ' || v_res::TEXT;
  ASSERT (v_marker.detail ->> 'credits')::NUMERIC = 500, 'T5 allowance recorded';
  ASSERT (v_marker.detail ->> 'used_previous_period')::NUMERIC = 12.5, 'T5 previous period use recorded';
  ASSERT (SELECT count(*) FROM public.ai_credit_ledger WHERE account_id = v_acc) = v_ledger, 'T5 nothing written to the credit ledger';
  ASSERT EXISTS (SELECT 1 FROM public.notifications n
                  WHERE n.user_id = (SELECT a.owner_user_id FROM public.accounts a WHERE a.id = v_acc)
                    AND n.notification_data ->> 'message_key' = 'ai_credits_renewed'), 'T5 owner told';

  PERFORM public.run_monthly_allowances('{}'::jsonb);
  ASSERT (SELECT count(*) FROM public.background_job_markers WHERE job_code = 'allowances.monthly' AND organisation_id = v_acc) = 1,
         'T5 second run records nothing more';
  RAISE NOTICE 'PASS T5 monthly allowances';
END $$;

-- T6 ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_acc    UUID := NULLIF(current_setting('bjs2.account'), '')::UUID;
  v_owner  public.users;
  v_sub    UUID;
  v_tz     TEXT;
  v_count  INTEGER;
BEGIN
  IF v_acc IS NULL THEN RAISE NOTICE 'SKIP T6 — no suitable organisation'; RETURN; END IF;
  v_owner := (SELECT u FROM public.users u JOIN public.accounts a ON a.owner_user_id = u.id WHERE a.id = v_acc);
  v_tz := public.bj_account_time_zone(v_acc);

  v_sub := gen_random_uuid();
  INSERT INTO public.platform_subscriptions (id, user_id, account_id, plan_type, status, is_trial, is_lifetime, billing_cycle, started_at, expires_at)
  VALUES (v_sub, v_owner.auth_user_id, v_acc, 'professional', 'active', FALSE, FALSE, 'monthly',
          NOW() - INTERVAL '25 days', date_trunc('day', NOW() AT TIME ZONE v_tz) AT TIME ZONE v_tz + INTERVAL '5 days 12 hours');

  PERFORM public.run_subscription_renewal_reminders('{}'::jsonb);
  ASSERT EXISTS (SELECT 1 FROM public.background_job_markers WHERE job_code = 'subscriptions.renewal_reminders'
                  AND marker_key LIKE 'platform:' || v_sub::TEXT || ':%:7'), 'T6 7-day step sent (5 days left)';
  v_count := (SELECT count(*) FROM public.notifications WHERE user_id = v_owner.id AND notification_data ->> 'message_key' = 'subscription_renewal_due');
  ASSERT v_count >= 1, 'T6 owner told';
  ASSERT EXISTS (SELECT 1 FROM public.background_job_queue q WHERE q.job_code = 'email.send'
                  AND q.dedupe_key LIKE 'email:renewal:platform:' || v_sub::TEXT || ':%'), 'T6 renewal email queued';

  PERFORM public.run_subscription_renewal_reminders('{}'::jsonb);
  ASSERT (SELECT count(*) FROM public.notifications WHERE user_id = v_owner.id AND notification_data ->> 'message_key' = 'subscription_renewal_due') = v_count,
         'T6 second run sends nothing more';

  UPDATE public.platform_subscriptions SET expires_at = date_trunc('day', NOW() AT TIME ZONE v_tz) AT TIME ZONE v_tz + INTERVAL '1 day 12 hours' WHERE id = v_sub;
  PERFORM public.run_subscription_renewal_reminders('{}'::jsonb);
  ASSERT EXISTS (SELECT 1 FROM public.background_job_markers WHERE job_code = 'subscriptions.renewal_reminders'
                  AND marker_key LIKE 'platform:' || v_sub::TEXT || ':%:1'), 'T6 1-day step sent';

  UPDATE public.platform_subscriptions SET expires_at = NOW() - INTERVAL '30 hours' WHERE id = v_sub;
  PERFORM public.run_subscription_renewal_reminders('{}'::jsonb);
  ASSERT EXISTS (SELECT 1 FROM public.background_job_markers WHERE job_code = 'subscriptions.renewal_reminders'
                  AND marker_key LIKE 'platform:' || v_sub::TEXT || ':%:ended'), 'T6 ended notice sent';
  ASSERT (SELECT count(*) FROM public.background_job_markers WHERE job_code = 'subscriptions.renewal_reminders'
           AND marker_key LIKE 'platform:' || v_sub::TEXT || ':%') = 3, 'T6 exactly three notices for this subscription';
  RAISE NOTICE 'PASS T6 renewal reminders (Platform)';
END $$;

DO $$
DECLARE
  v_user  public.users;
  v_sub   UUID;
BEGIN
  v_user := (SELECT u FROM public.users u WHERE u.id = NULLIF(current_setting('bjs2.sim_user'), '')::UUID);
  IF v_user.id IS NULL THEN RAISE NOTICE 'SKIP T6 Simulator — no suitable learner'; RETURN; END IF;
  v_sub := gen_random_uuid();
  INSERT INTO sim.simulator_subscriptions (id, user_id, plan_type, status, is_lifetime, billing_cycle, started_at, expires_at)
  VALUES (v_sub, v_user.auth_user_id, 'basic', 'active', FALSE, 'monthly', NOW() - INTERVAL '29 days', NOW() + INTERVAL '20 hours');
  PERFORM public.run_subscription_renewal_reminders('{}'::jsonb);
  ASSERT EXISTS (SELECT 1 FROM public.background_job_markers WHERE job_code = 'subscriptions.renewal_reminders'
                  AND marker_key LIKE 'sim:' || v_sub::TEXT || ':%'), 'T6 Simulator reminder sent';
  ASSERT EXISTS (SELECT 1 FROM public.notifications n WHERE n.user_id = v_user.id
                  AND n.notification_data ->> 'message_key' = 'simulator_subscription_renewal_due'
                  AND n.notification_data ->> 'schema' = 'sim' AND n.title LIKE 'Simulator:%'), 'T6 Simulator notice marked Simulator';
  RAISE NOTICE 'PASS T6 renewal reminders (Simulator)';
END $$;

-- T7 ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_inviter UUID := NULLIF(current_setting('bjs2.sim_user'), '')::UUID;
  v_recent  UUID;
  v_old     UUID;
  v_before  INTEGER;
  v_res     JSONB;
BEGIN
  IF v_inviter IS NULL THEN RAISE NOTICE 'SKIP T7 practice — no user'; RETURN; END IF;
  v_recent := gen_random_uuid();
  INSERT INTO sim.entity_invitations (id, entity_type, entity_name, invited_email, invited_by_user_id, invitation_status,
                                      invitation_sent_at, invitation_expires_at)
  VALUES (v_recent, 'practice_project', 'Example Practice Project', 'practice.lead@company.example', v_inviter, 'pending',
          NOW() - INTERVAL '10 days', NOW() - INTERVAL '1 day');
  v_old := gen_random_uuid();
  INSERT INTO sim.entity_invitations (id, entity_type, entity_name, invited_email, invited_by_user_id, invitation_status,
                                      invitation_sent_at, invitation_expires_at)
  VALUES (v_old, 'practice_project', 'Example Practice Project', 'practice.member@company.example', v_inviter, 'pending',
          NOW() - INTERVAL '60 days', NOW() - INTERVAL '30 days');
  v_before := (SELECT count(*) FROM public.notifications WHERE user_id = v_inviter
                AND notification_data ->> 'message_key' = 'invitation_expired_practice');

  v_res := public.run_invitation_expiry('{"dry_run": true}'::jsonb);
  ASSERT (v_res ->> 'practice_invitations')::INT >= 2, 'T7 dry run counts them';
  ASSERT (SELECT invitation_status FROM sim.entity_invitations WHERE id = v_recent) = 'pending', 'T7 dry run changes nothing';

  v_res := public.run_invitation_expiry('{}'::jsonb);
  ASSERT (SELECT invitation_status FROM sim.entity_invitations WHERE id = v_recent) = 'expired', 'T7 recent one expired';
  ASSERT (SELECT invitation_status FROM sim.entity_invitations WHERE id = v_old) = 'expired', 'T7 old one expired';
  ASSERT (SELECT count(*) FROM public.notifications WHERE user_id = v_inviter
           AND notification_data ->> 'message_key' = 'invitation_expired_practice') = v_before + 1,
         'T7 inviter told about the recent one only: ' || v_res::TEXT;
  ASSERT EXISTS (SELECT 1 FROM public.notifications WHERE user_id = v_inviter AND related_entity_id = v_recent
                  AND title LIKE 'Practice:%' AND notification_data ->> 'schema' = 'sim'), 'T7 practice notice marked';

  v_res := public.run_invitation_expiry('{}'::jsonb);
  ASSERT (v_res ->> 'practice_invitations')::INT = 0, 'T7 second run expires nothing';
  RAISE NOTICE 'PASS T7 invitation expiry (Simulator)';
END $$;

DO $$
DECLARE
  v_project UUID;
  v_role    UUID;
  v_inviter UUID;
  v_inv     UUID;
BEGIN
  v_project := (SELECT p.id FROM public.projects p WHERE NOT COALESCE(p.is_deleted, FALSE) ORDER BY p.created_at LIMIT 1);
  v_role := (SELECT r.id FROM public.roles r ORDER BY r.id LIMIT 1);
  v_inviter := NULLIF(current_setting('bjs2.sim_user'), '')::UUID;
  IF v_project IS NULL OR v_role IS NULL OR v_inviter IS NULL THEN RAISE NOTICE 'SKIP T7 Platform — no project / role / user'; RETURN; END IF;
  v_inv := gen_random_uuid();
  INSERT INTO public.project_invitations (id, project_id, invited_email, role_id, invited_by_user_id, invitation_token,
                                          invitation_status, invitation_sent_at, invitation_expires_at, entity_type)
  VALUES (v_inv, v_project, 'team.member@company.example', v_role, v_inviter, 'zzbj2-' || gen_random_uuid()::TEXT, 'pending',
          (NOW() AT TIME ZONE 'UTC') - INTERVAL '10 days', (NOW() AT TIME ZONE 'UTC') - INTERVAL '2 days', 'project');
  PERFORM public.run_invitation_expiry('{}'::jsonb);
  ASSERT (SELECT invitation_status FROM public.project_invitations WHERE id = v_inv) = 'expired', 'T7 Platform invitation expired';
  ASSERT EXISTS (SELECT 1 FROM public.notifications WHERE user_id = v_inviter AND related_entity_id = v_inv
                  AND notification_data ->> 'message_key' = 'invitation_expired'), 'T7 Platform inviter told';
  RAISE NOTICE 'PASS T7 invitation expiry (Platform)';
END $$;

-- T8 ─────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  ASSERT (SELECT count(*) FROM public.background_jobs WHERE
           (code = 'email.send'                      AND kind = 'handler' AND cron IS NULL)
        OR (code = 'system.queue_wake'               AND kind = 'sql'     AND enqueue_guard = 'public.background_job_queue_has_ready_items')
        OR (code = 'payments.pending_recheck'        AND kind = 'handler' AND time_basis = 'utc' AND enqueue_guard = 'public.payments_has_pending_recheck')
        OR (code = 'payments.followup'               AND kind = 'sql'     AND time_basis = 'utc')
        OR (code = 'subscriptions.renewal_reminders' AND kind = 'sql'     AND time_basis = 'organisation')
        OR (code = 'invitations.expire'              AND kind = 'sql'     AND time_basis = 'utc')
        OR (code = 'allowances.monthly'              AND kind = 'sql'     AND time_basis = 'utc')) = 7, 'T8 seven Slice 2 jobs';
  ASSERT NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname <> 'nidus_background_tick'
                       AND jobname IN ('payments.followup', 'invitations.expire', 'allowances.monthly')), 'T8 no own pg_cron entries';
  ASSERT (SELECT count(*) FROM public.background_job_messages WHERE message_key IN
           ('subscription_renewal_due', 'subscription_expired', 'simulator_subscription_renewal_due', 'simulator_subscription_expired',
            'payment_failed', 'invitation_expired', 'invitation_expired_practice', 'ai_credits_renewed')) = 8, 'T8 notice texts seeded';
  RAISE NOTICE 'PASS T8 catalogue';
END $$;

DO $$ BEGIN RAISE NOTICE 'v1594: all Slice 2 background job tests passed (rolling back)'; END $$;

ROLLBACK;
