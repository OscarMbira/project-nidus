# Background Jobs — guide (v1352)

**PRD:** `projectprd/v1352_background_jobs_PRD.md` · **Plan:** `projectplan/v1352_background_jobs_plan.md`
**Rule:** CLAUDE.md rule 80 · **Admin page:** Admin › System › Background Jobs (Admin SQL v255)

Project Nidus runs background work — trial expiry, archiving, AI clean-up, embedding, draft expiry and
more — through one small framework. This guide covers what it is, how to set it up, how to add a job, and
how to deal with failures.

---

## 1. How it works

```
pg_cron (today) ── every minute ──► public.run_due_background_jobs()   ◄── any scheduler after a host move
                                      │ reads public.background_jobs (catalogue)
                                      ├─ kind 'sql'     → public.run_background_job(code) → the job's database function
                                      └─ kind 'handler' → a row in public.background_job_queue
                                                          + one wake-up call to the background-job-worker
background-job-worker (edge function) ── claims queue rows (FOR UPDATE SKIP LOCKED) → handler → result
every run ──► public.background_job_runs        failures / late jobs ──► Admin alert (in-app + one email)
```

| Table | What it holds |
|---|---|
| `public.background_jobs` | The catalogue: code, name, kind (`sql` / `handler`), cron schedule, time basis (`utc` / `organisation`), on / off, time-out, retry policy, queue settings, live status and open alert |
| `public.background_job_runs` | One row per run: status, start / finish, duration, records processed, error, who or what started it, reason |
| `public.background_job_queue` | Work items for handler jobs: payload, `run_after`, attempts, `max_attempts`, `expires_at`, `dedupe_key`, organisation, status (`pending`, `running`, `succeeded`, `dead`) |
| `public.background_job_settings` | Run-history retention (90 days success / 1 year failure), late grace, alert switches, tick and worker heartbeat |
| `public.background_job_config` | Server-only worker address and shared secret (never readable by clients) |

All five have RLS on and **no client access**. Platform and Simulator never read them. Admin reads and
changes them only through the `public.admin_background_job_*` RPCs (CLAUDE.md rule 34.5).

### Rules the runner applies

- **No overlap.** A database job takes a transaction advisory lock and refuses to start while a run of the
  same job is still `running` (within its time-out). A refused start is logged as `skipped`.
- **Missed minutes are caught up.** Each tick looks at every minute since the previous tick (up to 60), so a
  tick delayed by a long job does not lose a due job.
- **Retry policy (database jobs).** `max_retries` / `retry_delay_seconds`: a failed run is tried again by the
  tick after the delay. An alert is sent when the retries are used up.
- **Back-off (queue items).** A failed item waits for the next step of the job's `backoff_schedule`
  (default 1 min, 5 min, 30 min, 2 h, 24 h). It becomes `dead` when it has used `max_attempts` or passed
  `expires_at`. The worker claims at most `batch_size` items per job and `per_org_batch_cap` items per
  organisation in one claim, so one busy organisation cannot hold up the others.
- **Alerts (D4).** A failed run (or a job that was due but did not start within the late grace, default 15
  minutes) opens **one** alert for that job: an in-app notification and one email to every active Admin user
  with `system.background_jobs.view`. Nothing more is sent until the job succeeds again.
- **Time basis.** `utc` jobs fire on UTC time. `organisation` jobs fire when the schedule matches in at least
  one organisation's time zone (Regional & Format Settings, rule 68); the job function receives
  `{"time_zones": [...]}` in its context and should act only for organisations in those zones.

---

## 2. Jobs in the catalogue (Slice 0)

| Code | Kind | Schedule (UTC) | What it does | Was |
|---|---|---|---|---|
| `trial.expiry_check` | sql | `0 0 * * *` | Trial reminders marked, expired trial projects locked | pg_cron `daily-trial-expiry-check` (v118) |
| `lifecycle.auto_archive` | sql | `0 0 * * *` | Lifecycle history past retention archived | pg_cron `nidus_auto_archive_history` (v658) |
| `ai.retention_purge` | sql | `30 2 * * *` | AI conversations / run text / usage rows past retention removed | pg_cron `nidus_ai_retention_purge` (v1273) |
| `ai.embed` | handler | `*/2 * * * *` | Waiting search-index rows embedded (only queued when rows wait) | pg_cron `nidus_ai_embed` (v1284) |
| `drafts.expire` | handler | `0 0 * * *` | Old drafts expired, owners warned | edge function `expire-drafts`, had no schedule |
| `testers.moratorium_expiry` | handler | `15 0 * * *` | System testers emailed before their moratorium ends | edge function `admin-moratorium-cron`, had no schedule |
| `admin.id_capacity_alerts` | sql | `0 */6 * * *` | ID rules near the end of their codes flagged (Admin) | pg_cron `admin_id_generation_capacity_check` (Admin v140) |
| `admin.lifecycle_archive` | sql | `10 3 * * *` | Admin lifecycle history archived (Admin) | pg_cron `admin_record_lifecycle_auto_archive_daily` (Admin v99) |
| `system.detect_late` | sql | `*/5 * * * *` | Late jobs alerted, runs that stopped closed as failed | new |
| `system.alert_email` | handler | queue only | Alert emails sent through `send-email` | new |

Each moved job keeps the function or edge function it had; only the way it is started changed.

### Jobs added in Slice 1 (SQL v1562–v1564) — both apps (D8)

| Code | Kind | Schedule | What it does |
|---|---|---|---|
| `reports.health_due` | sql | `*/15 * * * *` UTC | Queues every scheduled health report whose send time has come. `next_run_at` already holds the local send time (project time zone, else organisation — D5); default Monday / 1st of the month / quarter at 07:00, or `schedule_config` `send_hour`, `weekday`, `day_of_month` |
| `reports.health_send` | handler | queue only | Builds one report (`scheduled_report_build`), emails each recipient, records the run (`scheduled_report_finish`). **Run now** in both apps queues the same item (`scheduled_health_report_run_now`) |
| `tasks.recurring_generate` | sql | `30 0 * * *` UTC | Creates recurring tasks up to 7 days ahead (`recurrence_config.lead_days`, max 90), once per template and date; also runs when a schedule is saved |
| `reminders.due_dates` | sql | `0 6 * * *` organisation | In-app reminders for every row of `reminder_record_types`: one "before" and one "overdue" per item and due date (`reminder_markers`) |
| `timesheets.reminders` | sql | `0 14 * * 5` organisation | Members with no or draft time this period (organisation's first day of week), once per project and period; logged in `timesheet_reminders` (`is_automatic`) |
| `evm.period_snapshots` | sql | `15 1 * * *` UTC | One snapshot per project at each project-local month end: PV = budget × planned share elapsed, EV = budget × % complete, AC = recorded costs. Existing snapshots are never changed |
| `notifications.daily_digest` | sql | `0 7 * * *` organisation | Queues one email per person per day with the unread notices of the last 24 hours |
| `notifications.digest_send` | handler | queue only | Sends the digest through `send-email` and marks the notices as emailed |

**Email rule (D6):** reminders are in-app per item; email only arrives as the daily digest. The digest
respects the **Reports & Digests** email switch in Notification Preferences (Platform items use the
Platform preference, practice items the Simulator one) and `users.email_notifications_enabled`.
Simulator items are marked "Practice:" in the app and "Simulator practice" in emails (D8).

**Planner (story 18):** a Planner-edition account only gets a job's effect when all the tables it touches
are on the Planner allow-list (`bj_account_allows_tables`). Simulator tables are written `sim.<table>`, so
they never match.

### Jobs added in Slice 2 (SQL v1592–v1593) — notifications and SaaS operations

| Code | Kind | Schedule | What it does |
|---|---|---|---|
| `email.send` | handler | queue only | **Email outbox.** One item = one email, sent through `send-email`. Up to 6 attempts (1 min, 5 min, 30 min, 2 h, 6 h, 24 h), dead after 3 days; Admin can replay a dead item |
| `system.queue_wake` | sql | every minute (only while an item has waited 30 s) | Wakes the worker for queue items whose back-off time has come, so retries never wait for an unrelated job |
| `payments.pending_recheck` | handler | `5 * * * *` UTC (only while a payment is due a check) | Server-side `paynow-poll`: asks Paynow about each pending payment 10 min – 72 h old (once an hour), trusts only hash-verified answers, and passes final ones to `paynow-webhook` (normal fulfilment) |
| `payments.followup` | sql | `20 * * * *` UTC | Pending payments older than 7 days → `expired`; one follow-up (in-app + email) per failed / cancelled payment, unless the organisation paid since |
| `subscriptions.renewal_reminders` | sql | `0 8 * * *` organisation | Reminders 7 and 1 days before a subscription ends and once after it ended (within 3 days): Platform / Planner subscriptions → owner + billing delegates; Simulator subscriptions → the learner. In-app + email |
| `invitations.expire` | sql | `0 1 * * *` UTC | Pending invitations past their expiry → `expired` (project / portfolio / programme, organisation, Simulator practice). The inviter gets an in-app notice (email through the daily digest) when it expired in the last 7 days |
| `allowances.monthly` | sql | `30 1 * * *` UTC | Records each organisation's new AI credit period once (with the previous period's use) and tells the owner and PMO Admins in the app. Nothing is written to the credit ledger — see below |

**Thresholds are data** — one row in `public.saas_job_settings` (re-check age and window, expiry age, failed
follow-up delay and window, renewal reminder days `{7,1}`, ended-notice days, invitation notice window,
allowance notice switch). Change them with SQL until an Admin screen exists. **Texts are data** —
`public.background_job_messages` (`{placeholder}` fields). **Once only** — `public.background_job_markers`
(job + key, e.g. `failed:<payment id>`, `platform:<subscription>:<end date>:7`, `ai_credits:<org>:<period start>`);
an invitation's own status change is its marker.

**Sending an email from a feature (2.1):**

```sql
-- from a SECURITY DEFINER function, trigger or job (no client grant)
SELECT public.queue_email(
  p_to => 'head.of.finance@company.example',
  p_subject => 'Your export is ready',
  p_body => 'Your organisation data export finished.' || chr(10) || '- Open it from Settings › Data export',
  p_dedupe_key => 'export:' || v_export_id,       -- a repeat is ignored
  p_organisation_id => v_account);                -- per-organisation fairness cap
-- or p_html => '<p>…</p>' for a ready HTML body; p_practice => TRUE adds the Simulator practice banner.
PERFORM public.background_job_wake_worker();      -- once after a loop (else system.queue_wake within a minute)

-- in-app notice + the same text by email, digest skipped for it:
PERFORM public.bj_notice(v_user, 'payment_failed', jsonb_build_object('amount', 'USD 40.00', …),
                         'billing', 'warning', TRUE, 'payment_failed:' || v_id, v_account);
```

A handler uses `ctx.rpc('queue_email', {...})`. Existing direct sends move to the outbox opportunistically
(no batch rewrite). Already on it or already retried by the queue: alert emails (`system.alert_email` items),
the daily digest (`notifications.digest_send` items), health reports (a copy that failed while others were
sent goes to the outbox).

**Paynow verification (2.3).** `supabase/functions/_shared/paynow.js` is the one verifier for
`paynow-webhook`, `paynow-poll` and the re-check job. A message counts only when its `hash` matches, with
the integration key, either Paynow's documented method (field values in order + key, SHA-512) or the method
this code used before (sorted `key=value&…` + key). No hash or no key → not trusted. The worker needs the
`PAYNOW_INTEGRATION_KEY` secret (Supabase secrets are shared by all functions); without it the re-check
fails and Admin is alerted. Only `https://www.paynow.co.zw` / `paynow.co.zw` (plus the host of `PAYNOW_URL`)
poll addresses are fetched.

**AI credits (2.5).** The monthly allowance is computed for the current period (`ai_period_start`,
`ai_account_allowance`) and usage counts from the period start, so credits renew by themselves. A "top-up"
ledger row would double them; the job only records the period and tells people. No other monthly plan
allowance exists today (seats and Planner limits are not monthly; Simulator leaderboard resets belong to
Slice 3 housekeeping).

### Jobs added in Slice 3 (SQL v1596–v1597) — data health, housekeeping, manual jobs

| Code | Kind | Schedule | What it does |
|---|---|---|---|
| `retention.purge` | sql | `0 3 * * 0` UTC | **Log retention.** Deletes background job history past its keep period (D11: successful / skipped runs and finished items after 90 days, failed / partly failed runs and dead items after 365 days — changeable in Admin) and old rows of every active table in `public.retention_targets`, in batches |
| `storage.cleanup` | handler | `0 4 * * 6` UTC (only while a bucket is listed) | **Storage clean-up.** Lists files no record points to any more, older than each bucket's safety window (30 days). Report only until deletion is switched on for a bucket in Admin; then the worker deletes them through the Storage API (up to 500 per bucket per run) |
| `simulator.housekeeping` | sql | `45 2 * * *` UTC | Practice runs idle for 90 days and collaborative sessions idle for 90 days → `abandoned`; collaborative lobbies never started after 30 days → `abandoned` (thresholds in `saas_job_settings`) |
| `quality.weekly_report` | sql | `0 7 * * 1` organisation | **Weekly data check.** Counts the checks in `public.data_quality_checks` per organisation and sends one in-app notice to the owner and PMO Admins when something needs attention (email through the daily digest). The counts are kept in the week's marker |
| `backfill.global_templates` | sql | manual only | Organisations missing Global Template copies catch up (50 per run; run again for more) |
| `search.reindex` | sql | manual only | Rebuilds `public` / `sim` `search_index` rows from the records; changed rows are embedded again by `ai.embed` |

**Manual jobs** have no schedule: start them from **Admin › System › Background Jobs › (job) › Run now** (reason
required, audited). Re-embedding everything is **Admin › AI › Embeddings** (Admin v238).

**Roll-up refresh (3.1)** needs no job: no materialised views or cached roll-up tables exist; portfolio, programme
and PMO dashboards read live tables. If a cached summary is added later, its feature registers its own refresh job.

**Adding a table to log retention (A1.5) — a row, not code:**

```sql
INSERT INTO public.retention_targets (table_schema, table_name, date_column, retain_days, status_column, status_values, notes)
VALUES ('public', 'api_request_log', 'created_at', 90, NULL, NULL, 'Public API request log (v1356).')
ON CONFLICT (table_schema, table_name) DO NOTHING;
-- only some rows: status_column => 'is_read', status_values => ARRAY['true']
```

- Plain tables only (`relkind = 'r'`); the table, date column (a date or time) and status column are checked
  against the catalog before each run, and a target that does not match is skipped and reported, never fatal.
- Seeded active: technical logs only (job markers 400 days, reminder markers 400 days by due date, email / error /
  sync / session / sign-in logs 90–365 days, field help events 730 days). Seeded **off**: `notifications` (read,
  older than a year), `audit_log`, `activity_logs`, `data_access_logs`, `security_events` — owner decision.
- Admin › Background Jobs › **Housekeeping** changes a target's keep period and on / off, and the run-history
  periods. New targets come from versioned SQL only.
- Check: `SELECT public.run_retention_purge('{"dry_run": true}');` counts what would go.

**Storage clean-up (3.2).** A bucket is checked only when it has rows in `public.storage_cleanup_references`
(table + column holding the path). A stored value matches a file when, after dropping any `?query` and any leading
`…/<bucket>/` (public or signed Storage URL), it equals the file name. If any reference column is missing, the
whole bucket is skipped. Seeded (all report only): `risk-attachments`, `defect-attachments`, `sim-defect-attachments`,
`local-register-attachments`, `change-log-attachments`, `user-avatars`, `stakeholder-photos`. Switch deletion on in
Admin › Background Jobs › Housekeeping only after a report-only run's counts look right — the server refuses it
before the first scan. Check: `SELECT public.storage_cleanup_scan(TRUE);`.

**Data checks (3.4) — a row, not code.** `count_sql` returns one count; `$1` is the organisation id, `$2` its
local date. A check that fails to run is skipped and listed in the run result. Planner-edition organisations only
get checks whose `planner_tables` are on the Planner allow-list.

```sql
INSERT INTO public.data_quality_checks (check_code, label, description, count_sql, planner_tables, sort_order)
VALUES ('task_without_owner', 'Open tasks without an owner', 'Open tasks nobody is assigned to.',
        'SELECT count(*) FROM public.tasks t JOIN public.projects p ON p.id = t.project_id WHERE p.account_id = $1 AND …',
        ARRAY['tasks', 'projects'], 80)
ON CONFLICT (check_code) DO NOTHING;
```

Seeded checks: open projects without a project manager, without planned dates, more than 30 days past their
planned finish; projects that finish before they start; open risks / issues without an owner; milestones more
than 30 days overdue. Platform only — practice projects belong to one learner and have no PMO Admin.

**Organisation data footprint (M.5 dry run).** `SELECT public.organisation_data_footprint('<account id>');` (SQL
editor, service role) lists the tables and row counts that belong to one organisation. It changes nothing.

**Organisation-time jobs now get their time zones.** Before v1596, a job function with a defaulted `jsonb`
argument was called without the tick's context, so organisation-time jobs ran for every organisation at the
first zone's time. `background_job_function_shape` now passes the context to them.

---

## 3. Setup (owner, once per environment)

1. **Extensions:** pg_cron and pg_net on (Supabase: Database → Extensions).
2. **Worker:** deploy the edge function and set its secret:
   ```
   supabase functions deploy background-job-worker --no-verify-jwt
   supabase secrets set BACKGROUND_JOB_SECRET=<a long random value>
   ```
   CI (`.github/workflows/supabase-functions.yml`) redeploys it with the cron functions on every change.
   `expire-drafts` and `admin-moratorium-cron` must be deployed too (the worker calls them).
3. **Worker address and secret in the database** (v1559 copies both from `public.ai_job_config` when that is
   set; otherwise set them):
   ```sql
   UPDATE public.background_job_config
      SET functions_base_url = 'https://<project-ref>.supabase.co/functions/v1',
          worker_secret      = '<same value as BACKGROUND_JOB_SECRET>',
          updated_at         = NOW()
    WHERE id;
   ```
   If you reuse the AI cron secret value, AI embedding keeps working without a gap.
4. **Run the SQL** in the order in the plan's "Slice 0 review" (monorepo v1559, v1560, the Planner wall
   v1251 again, the v1561 tests, then Admin v255 and the v256 tests).
5. **Check:** Admin › System › Background Jobs shows "Scheduler last ran less than a minute ago", and the
   jobs fill their **Last run** column as their schedules come round.
6. **Check the worker is reachable** (SQL editor):
   ```sql
   SELECT public.background_job_wake_worker();   -- expect: requested
   ```
   `pg_net missing` → turn pg_net on (`CREATE EXTENSION IF NOT EXISTS pg_net;`); `not configured` → step 3.
   About 10 seconds later:
   ```sql
   SELECT status_code, left(content::text, 200) FROM net._http_response ORDER BY created DESC LIMIT 3;
   ```
   200 = working; 401 = `BACKGROUND_JOB_SECRET` ≠ `worker_secret`; 404 = worker not deployed.
   (Found on first setup, 2026-11-23: pg_net was off, so the worker — and the old v1284 AI embed schedule —
   had never been reachable.)

---

## 4. Adding a job (rule 80)

Never call `cron.schedule`. In the feature's own versioned SQL:

```sql
-- A database job (function with no arguments, or one jsonb argument for the run context)
SELECT public.background_job_register(
  p_code          => 'reports.health_due',          -- area.job, lower case
  p_name          => 'Scheduled health reports',
  p_kind          => 'sql',
  p_description   => 'Builds and emails each health report that is due.',
  p_owner_system  => 'platform',
  p_sql_function  => 'public.run_due_health_reports',
  p_cron          => '*/15 * * * *',
  p_time_basis    => 'organisation'
);

-- A worker job: add supabase/functions/background-job-worker/handlers/<code>.js exporting
-- handle(payload, ctx) and list it in handlers/index.js, then register:
SELECT public.background_job_register(
  p_code => 'webhooks.deliver', p_name => 'Webhook delivery', p_kind => 'handler',
  p_max_attempts => 8, p_backoff_schedule => ARRAY[60, 300, 1800, 7200, 86400],
  p_item_ttl_seconds => 259200, p_per_org_batch_cap => 20
);
```

From a trigger or RPC, queue work with
`public.enqueue_background_job(code, payload, run_after, dedupe_key, organisation_id)` — a repeated
`dedupe_key` is ignored. It has no client grant; call it from a `SECURITY DEFINER` function.

**Handlers** receive `(payload, ctx)` and return `{ processed, error? }`. `ctx` (`adapter.ts`) is the only
code that talks to the database client or reads secrets: `ctx.rpc(fn, args)`, `ctx.invokeFunction(name, body)`,
`ctx.httpGet(url)`, `ctx.storageRemove(bucket, paths)` (Slice 3), `ctx.env(name)`, `ctx.log(text)`. Keep handlers free of Supabase imports so the jobs move with the database.

**Reminders for a new record type (A1.6) — add a row, not code:**

```sql
INSERT INTO public.reminder_messages (message_key, before_title, before_body, overdue_title, overdue_body)
VALUES ('scenario_approval', 'Scenario waiting for approval', 'The scenario “{title}” needs a decision by {date}.',
        'Scenario approval overdue', 'The scenario “{title}” needed a decision by {date}.')
ON CONFLICT (message_key) DO NOTHING;

INSERT INTO public.reminder_record_types (schema_name, record_type, label, description, table_name, date_column,
  title_column, project_column, owner_columns, status_filter, recipient_rule, default_lead_days, message_key, planner_tables)
VALUES ('public', 'scenario_approval', 'Portfolio scenarios', 'Scenarios waiting for approval.', 'portfolio_scenarios',
  'decision_due_date', 'scenario_name', 'project_id', ARRAY['approver_user_id'], 'r.status = ''submitted''',
  'owner', 3, 'scenario_approval', ARRAY['portfolio_scenarios'])
ON CONFLICT (schema_name, record_type) DO NOTHING;
```

- `table_name` may be a view (`reminder_src_*`) when the project is one join away; revoke client access on it.
- `project_column` or `account_column` is required (organisation, time zone, lead time).
- `owner_id_kind` is `user` (public.users.id) or `auth` (auth user id, most Simulator tables).
- `recipient_rule`: `owner`, `role:<role_code>` (e.g. `role:project_manager`) or `org_admins`; nobody found → the
  project manager (Simulator: the learner).
- `due_offset_days` turns a start date into a deadline (sign-offs: requested + 7 days).
- Organisations change the lead time on **PMO Configuration → Reminder Lead Times** (both apps).
- Check with `SELECT public.run_due_reminders('{"dry_run": true}');` — `skipped_types` must be empty.

**Replay from a feature page:** a feature's own `SECURITY DEFINER` RPC checks the caller's rights and calls
`public.background_job_replay_item_for_org(item_id, organisation_id, reason, actor)`, which refuses items of
other organisations.

**CI:** `scripts/check-background-jobs.mjs` (workflow `background-jobs.yml`) fails on any `cron.schedule` in SQL
from v1559 on other than the tick, and on a handler job without a handler file.

---

## 5. When something fails

1. The alert email / notification links to the job page in Admin.
2. **Run history** shows the error text of each run; **Work items** shows dead queue items with their last error.
3. Fix the cause, then **Re-run** the failed run or **Replay** the dead item (reason required, audited).
   Database jobs started from Admin begin at the next scheduler minute, so long jobs never run inside a web request.
4. The alert closes on the next successful run.

**Scheduler stopped?** The list page warns when the tick has not run for more than 5 minutes. Check
`SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;` and that `nidus_background_tick` exists.

**Worker not running?** Handler jobs then show as late after the grace period. Check the worker secret and
`public.background_job_config`, and the function's logs.

**A payment stays pending?** `SELECT reference, status, check_count, last_checked_at, last_check_result FROM
public.payment_transactions WHERE status = 'pending' ORDER BY created_at DESC;` — "answer not verified" means
the hash did not match (check `PAYNOW_INTEGRATION_KEY`); "Paynow did not answer" is retried next hour.

**An outbox email is dead?** Admin › Background Jobs › Email outbox › Work items shows the last error; fix
the cause (e.g. `send-email` settings) and **Replay** it.

---

## 6. Moving host (D2)

Everything except two small pieces is plain PostgreSQL and TypeScript:
- replace pg_cron with any scheduler that runs `SELECT public.run_due_background_jobs();` every minute;
- replace `public.background_job_wake_worker()` (pg_net) by having that scheduler call the worker, and
  rewrite `background-job-worker/adapter.ts` for the new host.
