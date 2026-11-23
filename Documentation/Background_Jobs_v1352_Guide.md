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
`ctx.env(name)`, `ctx.log(text)`. Keep handlers free of Supabase imports so the jobs move with the database.

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

---

## 6. Moving host (D2)

Everything except two small pieces is plain PostgreSQL and TypeScript:
- replace pg_cron with any scheduler that runs `SELECT public.run_due_background_jobs();` every minute;
- replace `public.background_job_wake_worker()` (pg_net) by having that scheduler call the worker, and
  rewrite `background-job-worker/adapter.ts` for the new host.
