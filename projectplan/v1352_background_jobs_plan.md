# v1352 — Background jobs — Implementation plan

**PRD:** `projectprd/v1352_background_jobs_PRD.md` (owner decisions D1–D11, 2026-11-22).
**Roadmap:** R11 (scheduled jobs; failures observable; retries / idempotency), R12 (observability).
**Repos:** monorepo `E:\project-nidus` (SQL in `SQL/`, both schemas) and Admin `E:\project-nidus-admin`
(Admin page, Admin SQL in its own `SQL/`, plan note in `projectplans/`).
**Method:** test-first vertical slices (App_Guide): each slice cuts through SQL → handler → Admin view → tests,
is tested and committed before the next (D10). SQL numbers are taken from `ls SQL` immediately before each
file (rule 18.0); none are reserved here.

---

## Facts this plan builds on

- pg_cron jobs today: `daily-trial-expiry-check` (v118), `nidus_auto_archive_history` (v658),
  `nidus_ai_retention_purge` (v1273), `nidus_ai_embed` (v1284); Admin v99 (lifecycle archive), v140 (ID capacity).
- Edge functions with no schedule in SQL: `expire-drafts`, `admin-moratorium-cron`; `paynow-poll` is browser-only.
- Server-only secrets pattern: `public.ai_job_config` (v1272: `functions_base_url`, `cron_secret`).
- Stored-but-never-run features: `scheduled_health_reports` / `scheduled_report_runs` (both schemas; service
  says "No background worker exists yet"), `recurring_task_templates|schedules|instances` (both),
  `project_evm_snapshots` (both), `notification_preferences` (both), `timesheet_reminders`,
  `daily_log_reminders`, `*_scheduled_activities` (quality / communication / configuration / risk strategies),
  `email_digests`, `notification_rules`.
- Email: `send-email` edge function. In-app: `notifications` table. Regional time zone: rule 68 resolver.

## Architecture (D2 — portable)

```
pg_cron (today) ──every minute──► public.run_due_background_jobs()        ◄── any scheduler after a host move
                                     │ reads public.background_jobs (catalogue: schedule, enabled, kind)
                                     ├─ kind = 'sql'     → public.run_background_job(code) → job SQL function
                                     └─ kind = 'handler' → enqueue rows in public.background_job_queue
                                                           + one wake-up call to the worker (pg_net adapter)
worker (edge function today) ── claims queue rows FOR UPDATE SKIP LOCKED → TypeScript handler → result
every run ──► public.background_job_runs (status, started/finished, counts, error, triggered_by, reason)
failures / late jobs ──► Admin in-app notification + email, grouped per job (D4)
```

- Catalogue / runs / queue are plain tables (RLS on, no client policies; registered in `database_tables`;
  Planner wall `v1251` re-run).
- `run_background_job` takes `pg_try_advisory_lock(hash(code))` → no overlap; each job function is idempotent
  by design (period keys / "already sent" markers).
- Schedules stored as cron text **plus** `time_basis` (`utc` | `organisation`) so D5 is data, not code.
- Handler interface (TypeScript, host-neutral): `handle(payload, ctx) → { processed, error? }` with `ctx` the
  only place that touches Supabase clients / secrets (adapter).

---

## Slice 0 — Framework + existing jobs + monitoring (Wave 0)

Tests first:
- [ ] SQL test script (`SQL/v{N}_background_jobs_tests.sql`, run in a transaction, rolls back): due-job
      selection for cron text in UTC and organisation time; disabled job skipped; overlap lock; run row written
      on success and failure; retry policy; late-job detection; (A1) per-item back-off and `run_after`, item
      becomes `dead` after `max_attempts` / `expires_at`, single-item replay, `enqueue_background_job` dedupe,
      per-organisation batch cap.
- [ ] Vitest: worker claims queue rows once under concurrency (mocked client), handler errors recorded, adapter
      is the only module importing `@supabase/supabase-js`.

Build:
- [ ] SQL migration: `background_jobs`, `background_job_runs`, `background_job_queue`,
      `background_job_settings` (retention D11, alert grouping), `run_background_job`,
      `run_due_background_jobs`, `background_jobs_detect_late`; registry rows; Planner wall re-run.
- [ ] **A1 queue capabilities:** queue columns `run_after`, `attempts`, `max_attempts`, `expires_at`, `dedupe_key`
      (unique per job), `organisation_id`, status incl. `dead`; per-job `backoff_schedule`, `batch_size`,
      `per_org_batch_cap`; `enqueue_background_job(code, payload, run_after, dedupe_key, organisation_id)`
      (`SECURITY DEFINER`, no client grant); worker claim respects `run_after` and the per-organisation cap;
      `admin_background_job_replay_item(item_id, reason)` (audited) + a replay helper the owning feature can call
      for its own organisation’s items.
- [ ] Move existing jobs into the catalogue (behaviour unchanged): trial expiry, auto-archive (public), AI
      retention purge, AI embed (handler, every 2 min), draft expiry (handler, daily), tester moratorium
      (handler, daily); `cron.unschedule` their old entries; one `cron.schedule('nidus_background_tick', '* * * * *', …)`.
- [ ] Admin SQL (Admin repo): ID capacity alerts + Admin lifecycle archive registered through the same
      catalogue (Admin-owned rows, `owner_system = 'admin'`).
- [ ] Worker edge function `background-job-worker` + handlers for draft expiry, moratorium, AI embed (wrapping
      the existing functions' logic, not rewriting it).
- [ ] Failure / late alerts (D4): Admin in-app notification + grouped email via `send-email`.
- [ ] Admin RPCs `public.admin_background_job_list|runs|set_enabled|run_now|rerun` gated by
      `system.background_jobs.view|run|edit`, reason required, audited; permissions seeded in Admin SQL.
- [ ] Admin page **System › Background Jobs** (`modules/system`): table (rules 40, 40.1, 41, 44), job detail
      routed page with run history and Audit tab (rules 63.1, 65), Run now / re-run / enable-disable with reason
      (confirm dialogs), back button (rule 73), field help (Admin rule 23), dates via `AdminDateInput`.
- [ ] Check script `scripts/check-background-jobs.mjs` + CI: no `cron.schedule` in SQL newer than this slice
      except the tick; every catalogue `handler` code has a handler file (D9).
- [ ] CLAUDE.md **rule 80** + rule 34.5 narrow exception; Admin CLAUDE.md equivalent rule.
- [ ] Guide `Documentation/Background_Jobs_v1352_Guide.md`; update `Documentation/Cron_Job_Setup.md`.
- [ ] Exit: all 8 existing jobs listed in Admin with run history; old cron entries gone; owner runs SQL +
      browser check; commit (monorepo + Admin).

## Slice 1 — Promised features (Wave 1 + daily digest 2.2), both schemas (D8)

Each job: failing SQL/Vitest test → job → Admin catalogue row → commit-ready.
- [ ] **1.1 Scheduled health reports:** due-schedule picker (every 15 min, organisation time) → queue →
      handler builds the report from existing report services' data functions, emails recipients, writes
      `scheduled_report_runs`; "Run now" in both apps calls the same path (replaces the placeholder in
      `scheduledHealthReportService.js`, both apps). Practice emails marked Simulator (D8).
- [ ] **1.2 Recurring task generator:** daily + on schedule save; idempotent on (schedule, occurrence date);
      writes `recurring_task_instances` and the tasks; both schemas.
- [ ] **1.3 Due-date reminders:** one job over registered record types (risk / issue reviews, actions,
      milestones, strategy scheduled activities, document sign-offs, daily logs); in-app per item; marker table
      so each item gets one "before" and one "overdue" reminder only (D6).
      **(A1)** Record types come from a data table `reminder_record_types` (record type, schema, table, date column,
      status filter, recipient rule `owner` / `role:<code>` / `org_admins`, default lead time, message key) so
      v1354 / v1355 / v1356 add rows, not code; seeded with today’s types.
- [ ] **1.3a Reminder lead times (D7):** `reminder_lead_time_settings` (system defaults + organisation
      overrides, both schemas) + PMO Configuration page in Platform and Simulator (routed page, field help,
      Audit tab, success modal, menu catalogue + placement + taxonomy rows — rules 70, 75).
- [ ] **1.4 Timesheet reminders:** per timesheet period in organisation time; reuses `timesheet_reminders`
      logging; manual send stays.
- [ ] **1.5 EVM / progress snapshots:** period-end capture per project, idempotent per (project, period);
      both schemas.
- [ ] **2.2 Daily digest (pulled forward, D6):** one email per person per day with that day's reminders and
      notices, organisation time; respects the digest switch in notification preferences (add the preference
      key if missing, both schemas).
- [ ] Exit: each job visible in Admin, unit tests green, owner SQL run + browser check (reports email, tasks
      appear, reminder + digest received); commit.

## Slice 2 — Notifications and SaaS operations (Wave 2)

- [ ] **2.1 Notification / email outbox** with retry and back-off; existing direct sends move onto it
      opportunistically (no batch rewrite).
- [ ] **2.3 Payment follow-up:** hourly re-check of pending Paynow payments (server-side `paynow-poll` logic,
      hash-verified), daily renewal reminders and failed-payment follow-up.
- [ ] **2.4 Invitation expiry**, **2.5 monthly allowances** (AI credits and other plan allowances).
- [ ] Exit: owner check with a test payment in Paynow's test mode; commit.

## Slice 3 — Data health, performance, manual jobs (Wave 3 + M)

- [ ] **3.1 Roll-up refresh** (portfolio / programme / PMO summaries), **3.2 storage clean-up**, **3.3 log
      retention** (incl. D11 run-history purge; **A1:** driven by a `retention_targets` table — table, date
      column, keep period, optional status filter — so later features add rows), **3.4 data-quality report**, **3.5 Simulator housekeeping**.
- [ ] **Manual jobs** in Admin with reason + audit: re-run failed (already in slice 0), back-fills (Global
      Template sync), re-index / re-embed, large bulk-import processing (async, with progress), organisation
      data export / deletion.
- [ ] Exit: owner check; commit; plan review section.

---

## Jobs later features will register (A1 — rule 80, built in their own plans)

| Feature | Job | Kind |
|---|---|---|
| v1353 | `billing.overdue_reminders` — email client billing contacts, once per reminder step | Scheduled daily, organisation time |
| v1353 | `billing.recurring_drafts` — draft due recurring invoices | Scheduled daily |
| v1353 | `billing.schedule_due` — date-based billing lines become due; milestone-based queued on milestone complete | Scheduled daily + enqueue |
| v1354 | Levelling moves awaiting a PM; portfolio scenarios awaiting approval | `reminder_record_types` rows |
| v1355 | Analysis older than 30 days (optional) | `reminder_record_types` row |
| v1356 | `webhooks.deliver` — signed delivery with back-off, endpoint disable after repeated failure | Queue handler |
| v1356 | `api.purge_idempotency_and_counters` | Scheduled hourly |
| v1356 | API key / SCIM token / SAML certificate expiry | `reminder_record_types` rows |
| v1356 | `sso.domain_recheck` — re-verify SSO domains | Scheduled weekly |
| v1356 | API request log, webhook deliveries retention | `retention_targets` rows |

## Cross-cutting checklist (every slice)

- Platform–Simulator parity (D8, rule 34.1) — live pages only (rule 78).
- No hard-coded schedules, lead times or texts in React (rule 25.1); examples follow rule 77.
- Admin parity rules: Admin rule 23 (help), 24 (dates), 18 (routed pages), 16.1 (Audit tab).
- Performance pass on new pages (rule 66).
- Retest after each fix (rule 43): targeted `vitest related` first, full suite once before commit, one suite at
  a time.
- Owner runs SQL; the plan records run status per file.

## Risks

| Risk | Mitigation |
|---|---|
| pg_cron / pg_net not enabled in an environment | Setup guide + a self-check row in Admin ("tick last seen") — the late-job alert fires if the tick stops |
| Duplicate emails / tasks after a retry | Idempotency keys per job (period / occurrence / reminder marker) tested in each slice |
| Many organisations in different time zones | Due-selection computed per organisation from rule 68 settings; tested across UTC boundaries |
| Moving existing jobs changes behaviour | Wrap, don't rewrite; compare a run before / after on the owner's data |
| Email volume | Daily digest (D6), grouped failure alerts (D4) |

## Review

(to be completed after each slice)
