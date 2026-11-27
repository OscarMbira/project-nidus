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
- [x] SQL test script (`SQL/v{N}_background_jobs_tests.sql`, run in a transaction, rolls back): due-job
      selection for cron text in UTC and organisation time; disabled job skipped; overlap lock; run row written
      on success and failure; retry policy; late-job detection; (A1) per-item back-off and `run_after`, item
      becomes `dead` after `max_attempts` / `expires_at`, single-item replay, `enqueue_background_job` dedupe,
      per-organisation batch cap.
- [x] Vitest: worker claims queue rows once under concurrency (mocked client), handler errors recorded, adapter
      is the only module importing `@supabase/supabase-js`.

Build:
- [x] SQL migration: `background_jobs`, `background_job_runs`, `background_job_queue`,
      `background_job_settings` (retention D11, alert grouping), `run_background_job`,
      `run_due_background_jobs`, `background_jobs_detect_late`; registry rows; Planner wall re-run.
- [x] **A1 queue capabilities:** queue columns `run_after`, `attempts`, `max_attempts`, `expires_at`, `dedupe_key`
      (unique per job), `organisation_id`, status incl. `dead`; per-job `backoff_schedule`, `batch_size`,
      `per_org_batch_cap`; `enqueue_background_job(code, payload, run_after, dedupe_key, organisation_id)`
      (`SECURITY DEFINER`, no client grant); worker claim respects `run_after` and the per-organisation cap;
      `admin_background_job_replay_item(item_id, reason)` (audited) + a replay helper the owning feature can call
      for its own organisation’s items.
- [x] Move existing jobs into the catalogue (behaviour unchanged): trial expiry, auto-archive (public), AI
      retention purge, AI embed (handler, every 2 min), draft expiry (handler, daily), tester moratorium
      (handler, daily); `cron.unschedule` their old entries; one `cron.schedule('nidus_background_tick', '* * * * *', …)`.
- [x] Admin SQL (Admin repo): ID capacity alerts + Admin lifecycle archive registered through the same
      catalogue (Admin-owned rows, `owner_system = 'admin'`).
- [x] Worker edge function `background-job-worker` + handlers for draft expiry, moratorium, AI embed (wrapping
      the existing functions' logic, not rewriting it).
- [x] Failure / late alerts (D4): Admin in-app notification + grouped email via `send-email`.
- [x] Admin RPCs `public.admin_background_job_list|runs|set_enabled|run_now|rerun` gated by
      `system.background_jobs.view|run|edit`, reason required, audited; permissions seeded in Admin SQL.
- [x] Admin page **System › Background Jobs** (`modules/system`): table (rules 40, 40.1, 41, 44), job detail
      routed page with run history and Audit tab (rules 63.1, 65), Run now / re-run / enable-disable with reason
      (confirm dialogs), back button (rule 73), field help (Admin rule 23), dates via `AdminDateInput`.
- [x] Check script `scripts/check-background-jobs.mjs` + CI: no `cron.schedule` in SQL newer than this slice
      except the tick; every catalogue `handler` code has a handler file (D9).
- [x] CLAUDE.md **rule 80** + rule 34.5 narrow exception; Admin CLAUDE.md equivalent rule.
- [x] Guide `Documentation/Background_Jobs_v1352_Guide.md`; update `Documentation/Cron_Job_Setup.md`.
- [ ] Exit: all 8 existing jobs listed in Admin with run history; old cron entries gone; owner runs SQL +
      browser check; commit (monorepo + Admin).

## Slice 1 — Promised features (Wave 1 + daily digest 2.2), both schemas (D8)

Each job: failing SQL/Vitest test → job → Admin catalogue row → commit-ready.
- [x] **1.1 Scheduled health reports:** due-schedule picker (every 15 min, organisation time) → queue →
      handler builds the report from existing report services' data functions, emails recipients, writes
      `scheduled_report_runs`; "Run now" in both apps calls the same path (replaces the placeholder in
      `scheduledHealthReportService.js`, both apps). Practice emails marked Simulator (D8).
- [x] **1.2 Recurring task generator:** daily + on schedule save; idempotent on (schedule, occurrence date);
      writes `recurring_task_instances` and the tasks; both schemas.
- [x] **1.3 Due-date reminders:** one job over registered record types (risk / issue reviews, actions,
      milestones, strategy scheduled activities, document sign-offs, daily logs); in-app per item; marker table
      so each item gets one "before" and one "overdue" reminder only (D6).
      **(A1)** Record types come from a data table `reminder_record_types` (record type, schema, table, date column,
      status filter, recipient rule `owner` / `role:<code>` / `org_admins`, default lead time, message key) so
      v1354 / v1355 / v1356 add rows, not code; seeded with today’s types.
- [x] **1.3a Reminder lead times (D7):** `reminder_lead_time_settings` (system defaults + organisation
      overrides, both schemas) + PMO Configuration page in Platform and Simulator (routed page, field help,
      Audit tab, success modal, menu catalogue + placement + taxonomy rows — rules 70, 75).
- [x] **1.4 Timesheet reminders:** per timesheet period in organisation time; reuses `timesheet_reminders`
      logging; manual send stays.
- [x] **1.5 EVM / progress snapshots:** period-end capture per project, idempotent per (project, period);
      both schemas.
- [x] **2.2 Daily digest (pulled forward, D6):** one email per person per day with that day's reminders and
      notices, organisation time; respects the digest switch in notification preferences (add the preference
      key if missing, both schemas).
- [ ] Exit: each job visible in Admin, unit tests green, owner SQL run + browser check (reports email, tasks
      appear, reminder + digest received); commit.

## Slice 2 — Notifications and SaaS operations (Wave 2)

- [x] **2.1 Notification / email outbox** with retry and back-off; existing direct sends move onto it
      opportunistically (no batch rewrite).
- [x] **2.3 Payment follow-up:** hourly re-check of pending Paynow payments (server-side `paynow-poll` logic,
      hash-verified), daily renewal reminders and failed-payment follow-up.
- [x] **2.4 Invitation expiry**, **2.5 monthly allowances** (AI credits and other plan allowances).
- [ ] Exit: owner check with a test payment in Paynow's test mode; commit.

## Slice 3 — Data health, performance, manual jobs (Wave 3 + M)

- [x] **3.1 Roll-up refresh** — nothing to refresh (no materialised views or cached roll-ups exist; see review),
      **3.2 storage clean-up**, **3.3 log
      retention** (incl. D11 run-history purge; **A1:** driven by a `retention_targets` table — table, date
      column, keep period, optional status filter — so later features add rows), **3.4 data-quality report**, **3.5 Simulator housekeeping**.
- [x] **Manual jobs** in Admin with reason + audit: re-run failed (already in slice 0), back-fills (Global
      Template sync), re-index / re-embed — built (re-embed already existed: Admin v238). Large bulk-import
      processing and organisation data export / deletion — **not built, owner decisions** (see review); a read-only
      footprint dry run only.
- [x] Retention / storage settings in Admin (D11 "changeable in Admin"): Background Jobs › Housekeeping.
- [ ] Exit: owner SQL run + browser check (Admin Housekeeping pages, a report-only storage scan, the first weekly
      data check); commit done; plan review section done.

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

### Slice 0 review (2026-11-23) — code complete, all SQL run by the owner 2026-11-23

**SQL run order (owner runs; all run successfully 2026-11-23):**

| # | Repo | File | Status |
|---|---|---|---|
| 0 | — | Deploy edge function `background-job-worker` (`--no-verify-jwt`), set secret `BACKGROUND_JOB_SECRET`; confirm `expire-drafts` and `admin-moratorium-cron` are deployed | worker deployed 2026-11-23 ✓ (pg_net enabled, wake → 200, ai.embed runs); `expire-drafts` + `admin-moratorium-cron` deployed 2026-11-23 ✓ |
| 1 | monorepo | `SQL/v1559_background_jobs_framework.sql` | run 2026-11-23 ✓ |
| 2 | monorepo | `SQL/v1560_background_jobs_existing_jobs_and_tick.sql` (needs pg_cron + pg_net) | run 2026-11-23 ✓ |
| 3 | monorepo | `SQL/v1251_planner_table_wall.sql` (re-run, table registration rule 6) | run 2026-11-23 ✓ |
| 4 | monorepo | `SQL/v1561_background_jobs_tests.sql` (rolls back; expect "all background job tests passed") | run 2026-11-23 ✓ |
| 5 | Admin | `E:\project-nidus-admin\SQL\v255_background_jobs_admin.sql` | run 2026-11-23 ✓ |
| 6 | Admin | `E:\project-nidus-admin\SQL\v256_background_jobs_admin_tests.sql` (rolls back) | run 2026-11-23 ✓ |

After step 1, check `public.background_job_config` has `functions_base_url` and `worker_secret` (copied from
`ai_job_config` when set) and that `worker_secret` equals `BACKGROUND_JOB_SECRET`.

**Built:** catalogue / runs / queue / settings / config tables (RLS on, no client access, registry rows); cron
matcher with next-fire and organisation time zones; runner with advisory lock + running-row guard, retry policy,
grouped alerts; tick with catch-up of missed minutes; late / stuck detection; queue with dedupe, run_after,
back-off, dead, expiry, per-job batch and per-organisation cap, single-item replay (Admin and per-organisation);
worker edge function (`worker.js` core, `adapter.ts` the only Supabase import, 4 handlers); 8 existing jobs + 2
framework jobs in the catalogue; old pg_cron entries replaced by `nidus_background_tick`; Admin RPCs, page and job
page; `check-background-jobs.mjs` + CI in both repos; CLAUDE.md rule 80 + rule 34.5 exception (Admin rule 25 +
exception); guide `Documentation/Background_Jobs_v1352_Guide.md`; `Cron_Job_Setup.md` updated.

**Decisions made during the build (not in the plan text):**
- Admin "Run now" / "Re-run" for database jobs sets a run request that the next tick starts (within a minute),
  instead of running the job inside the Admin RPC — Supabase's statement time-out for signed-in users would cut
  long jobs. Worker jobs are queued at once. Run now is refused while a job is off.
- Handler jobs wrap the existing edge functions over HTTP (`ctx.invokeFunction`) — no logic copied.
- `ai.embed` keeps "only when rows wait" through a guard function (`public.ai_embed_has_work`).
- Alerts for Admin go through a configured hook name (`background_job_settings.alert_hook_function`), so monorepo
  SQL never names the `admin` schema. Alert emails are queue items of `system.alert_email`.
- `pg_try_advisory_xact_lock` (transaction-scoped) is used, so a crashed session can never leave a lock behind.
- SQL job time-outs are enforced by the late / stuck check (runs still `running` after the time-out are closed as
  failed); the worker enforces its own time budget.
- Settings edits in Admin (retention, late grace) are not in Slice 0; values are stored as data and edited with
  SQL until the retention job (3.3) lands.

**Tests:** `supabase/functions` Vitest 84/84 (14 new); `node --test scripts/__tests__/check-background-jobs.test.mjs`
6/6; Admin `packages/shared` new test 7/7 (full suite: 2 pre-existing failures in `shared.test.js` and
`documentationContentUtils.test.js`, unrelated). SQL tests (v1561, Admin v256) written, to be run by the owner.

**Exit still open:** owner SQL run, browser check in Admin, and confirming each existing job's next run behaves
as before.

**Slice 0 close-out (2026-11-23, owner asked to continue to Slice 1):**
- Done: all SQL run; pg_net enabled (was off — the v1284 AI embed schedule had never run); worker deployed, wake → 200.
- Fixed on the way: v1561 temp tables → transaction settings; v1560 pg_net warning + guide step 6; `ai.embed` sends
  small batches (e0deba72).
- **Open — `ai.embed` (v1272 issue, not v1352):** `ai-embed` returns 546 (edge CPU / memory limit) even with 3 rows;
  2,837 `public.search_index` rows have never been embedded; keyword search unaffected. Owner to turn the job off
  and run the one-word eval test; decision (leave off / external embedding API / plan limits) belongs to v1272.
- **Done (2026-11-23):** `expire-drafts` and `admin-moratorium-cron` deployed by the owner (they had never been deployed before); `drafts.expire` (00:00 UTC) and `testers.moratorium_expiry` (00:15 UTC) run from tonight.
- **Open — Admin browser check** of System › Background Jobs.

### Slice 1 review (2026-11-23) — code complete, SQL run 2026-11-27

**SQL run order (all run by the owner, 2026-11-27; `ai-embed` redeployed too):**

| # | Repo | File | Status |
|---|---|---|---|
| 0 | — | Redeploy edge function `background-job-worker` (new handlers `reports.health_send`, `notifications.digest_send`; `--no-verify-jwt`) | run 2026-11-27 |
| 1 | monorepo | `SQL/v1562_reminders_lead_times_daily_digest.sql` (ends with a dry run of the reminder engine: expect `skipped_types: []`) | run 2026-11-27 |
| 2 | monorepo | `SQL/v1563_scheduled_reports_recurring_tasks_timesheets_evm_jobs.sql` | run 2026-11-27 |
| 3 | monorepo | `SQL/v1564_reminder_lead_times_menu_and_help.sql` | run 2026-11-27 |
| 4 | monorepo | `SQL/v1251_planner_table_wall.sql` (re-run, table registration rule 6 — six new tables) | run 2026-11-27 |
| 5 | monorepo | `SQL/v1565_background_jobs_slice1_tests.sql` (rolls back; expect "all Slice 1 background job tests passed") | run 2026-11-27 |
| 4a | monorepo | `SQL/v1591_digest_preference_columns_fix.sql` (fix: `public.notification_preferences` has the v30 columns; run before step 5) | run 2026-11-27 |

No Admin SQL: the Admin Background Jobs page lists the new catalogue rows as they are. No new reference
columns, so no Admin ID Generation rule (rule 16.2).

**Built:** 8 catalogue jobs (6 sql, 2 handler), all for `public` and `sim`:
`reports.health_due` / `reports.health_send` (1.1; Run now in both apps uses the same queue item through
`scheduled_health_report_run_now`), `tasks.recurring_generate` (1.2, + trigger on schedule save),
`reminders.due_dates` (1.3, data-driven by `reminder_record_types` + `reminder_messages`, markers in
`public|sim.reminder_markers`), `timesheets.reminders` (1.4), `evm.period_snapshots` (1.5),
`notifications.daily_digest` / `notifications.digest_send` (2.2). Reminder Lead Times page (1.3a) in both apps:
routed page `/platform/pmo-admin/reminder-lead-times`, `/simulator/pmo/reminder-lead-times`, PMO Configuration card,
menu rows under the PMO Admin category (placement through the placed parent + `default_section_code`), field help
+ Simulator alias, Audit tab, success modal, unsaved-changes guard, back button, theme-aware. Taxonomy §26 and
placement proposal §3 / §6.8 updated; guide `Documentation/Background_Jobs_v1352_Guide.md` (Slice 1 jobs,
adding a reminder record type).

**Decisions made during the build (not in the plan text):**
- **Strategy scheduled activities are not seeded** as reminder types: `qms|rms|cms|cfg_scheduled_activities` have no
  date column (only a text `timing`). They need a date field first (own PRD/plan); then it is one row.
- **Sign-offs** = register record sign-offs (both schemas). No deadline column exists, so the date is "requested +
  7 days" (`due_offset_days`, data), and only the slot whose turn it is. Process-template document signatories are
  not included (template level, no project or deadline).
- **Actions** = issue actions (`issue_actions` / `sim.practice_issue_actions`); **issue reviews** use the issue due
  date (issues have no review date). Meeting action items are not included (project is optional on meetings).
- Record types that need a join use source views (`reminder_src_*`, no client access). A type whose table or
  columns are wrong is skipped and listed in the run result, never stopping the others.
- Each reminder marker key includes the due date: moving a date earns one new before / overdue pair. Overdue
  reminders stop after `overdue_window_days` (14), so the first run does not flood old items.
- `reports.health_due` runs every 15 minutes on UTC: `next_run_at` already holds the local send time (project
  override, else organisation — D5), kept filled by a trigger. Default send time Monday / 1st / quarter start at
  07:00 local; `schedule_config` `send_hour`, `weekday`, `day_of_month` override (no form field added).
- No recipients on a schedule → the schedule's creator; none at all → the run fails without retry.
- Recurring tasks: 7 days ahead by default (`recurrence_config.lead_days`, max 90); only `entity_type = 'task'`.
  Monthly patterns step by calendar month (31st → 28th drift after February).
- EVM: monthly at project-local month end for all projects with a budget and planned dates (no per-project period
  setting exists); EV uses the project's % complete when captured (the 1st); stops 92 days after planned end.
- Timesheet reminders: Friday 14:00 organisation time, week from the organisation's first day of week; only
  projects with time logged in the last 28 days; in-app only (email through the digest, D6). Simulator: the learner
  and practice-project members; no reminder log table in `sim` (markers only). `timesheet_reminders` gained
  `is_automatic`; `sent_by` is now nullable.
- Digest switch = the existing **Reports & Digests** category (`event_category = 'reports'`) in both apps'
  Notification Preferences — no new key needed. Unread notices of the last 24 hours not yet emailed, at most 100;
  marked `email_sent` after sending. "Weekly digest" is treated as on.
- In-app reminders for practice items go to `public.notifications` (the Simulator reads that table; no
  `sim.notifications` exists), titled "Practice: …" with `notification_data.schema = 'sim'`.
- Lead-time overrides are kept per schema (`public|sim.reminder_lead_time_settings`), so practice settings never
  change live reminders. Writes only through the RPCs (PMO Admin / account owner).
- Planner (story 18): `bj_account_allows_tables` — a Planner-edition account gets a job's effect only when every
  table is on the allow-list (risk reviews qualify today). Simulator tables are written `sim.<table>`.
- The PMO Configuration area list is still a code array (v1292 not built), so the new card follows that pattern.

**Tests:** `supabase/functions` Vitest 95/95 (11 new); `packages/shared` new `reminderLeadTimes` 4/4; Platform
`ReminderLeadTimes` page 5/5, `reminderLeadTimeService` 2/2, `scheduledHealthReportService` 8/8; Simulator same
5/5, 2/2, 5/5. SQL tests v1565 written (S1–S10), to be run by the owner. Checks: `check-background-jobs`,
`check-field-help --enforce` (100%), `check-native-date-inputs`, `find-unreachable-app-files --fail` (Platform,
Simulator, Planner) pass.

**Open / for the owner:** run the SQL above, redeploy the worker, browser check (lead-times page, Run now, a
recurring task, reminder + digest, Admin Background Jobs list). The Planner table allow-list was already stale
before this slice (`account_menu_settings` no longer used since b5bb0b7e) — not changed here.

### Slice 2 review (2026-11-27) — code complete, SQL run and functions redeployed by the owner 2026-11-27

**Run order (owner):**

| # | Repo | Step | Status |
|---|---|---|---|
| 0 | — | Redeploy edge functions `background-job-worker` (new handlers `email.send`, `payments.pending_recheck`; the adapter gained `httpGet` and form posts), `paynow-webhook` and `paynow-poll` (both now use `_shared/paynow.js`). Check `PAYNOW_INTEGRATION_KEY` is set (`supabase secrets list`; secrets are shared by all functions) | done 2026-11-27 |
| 1 | monorepo | `SQL/v1592_background_jobs_email_outbox.sql` (outbox, retry wake-up, markers / messages / settings tables) | done 2026-11-27 |
| 2 | monorepo | `SQL/v1593_background_jobs_payments_invitations_allowances.sql` (ends with dry runs of the four jobs: nothing changes) | done 2026-11-27 |
| 3 | monorepo | `SQL/v1251_planner_table_wall.sql` (re-run, table registration rule 6 — three new tables in v1592) | done 2026-11-27 |
| 4 | monorepo | `SQL/v1594_background_jobs_slice2_tests.sql` (rolls back; expect "v1594: all Slice 2 background job tests passed (rolling back)") | done 2026-11-27 |

No Admin SQL: the Admin Background Jobs page lists the seven new catalogue rows as they are. No new reference
columns (no Admin ID Generation rule, rule 16.2). No UI fields were added, so no field help rows (rule 76).

**Built:**
- **2.1 Email outbox** — handler job `email.send` (one item = one email; 6 attempts, back-off 1 min → 24 h, dead
  after 3 days, per-organisation cap 25) and `public.queue_email(to, subject, html | body, dedupe_key,
  organisation_id, practice)` for SQL, triggers, RPCs and handlers (`ctx.rpc`). It uses the v1352 queue's own
  retry / dead / replay — no second mechanism. `public.bj_notice` writes an in-app notice and, when asked, the
  same text as an outbox email (marked `email_sent`, so the daily digest does not repeat it). Texts in
  `public.background_job_messages`, markers in `public.background_job_markers`, thresholds in
  `public.saas_job_settings`.
- **Retry wake-up** `system.queue_wake` (found while building 2.1): items waiting for their back-off time were
  only picked up when some other job woke the worker. The new job wakes it each minute, guarded so it runs only
  while an item has been ready for 30 seconds or more.
- **2.3 Payments** — `payments.pending_recheck` (handler, hourly, guarded): the server-side `paynow-poll`, with
  the shared verifier `supabase/functions/_shared/paynow.js` (now also used by `paynow-webhook` and
  `paynow-poll`); verified final answers are handed to `paynow-webhook` unchanged, so fulfilment (subscription,
  Planner seats / edition) stays in one place and stays idempotent. `payments.followup` (sql, hourly): stale
  pending → `expired` after 7 days; one follow-up per failed / cancelled payment. `subscriptions.renewal_reminders`
  (sql, 08:00 organisation time): 7 / 1 days before the end and once after it, Platform / Planner and Simulator.
  `payment_transactions` gained `last_checked_at`, `check_count`, `last_check_result`.
- **2.4 Invitations** — `invitations.expire` (sql, 01:00 UTC): `project_invitations` (project / portfolio /
  programme), `organisation_invitations` and `sim.entity_invitations` (D8) → `expired`; the inviter gets an in-app
  notice.
- **2.5 Allowances** — `allowances.monthly` (sql, 01:30 UTC), AI credits.
- Health reports: a copy that failed while others were sent is queued on the outbox instead of being lost.
- Guide `Documentation/Background_Jobs_v1352_Guide.md` (Slice 2 jobs, sending an email from a feature,
  Paynow verification, AI credits, troubleshooting).

**Decisions made during the build (not in the plan text):**
- **The queue is the outbox.** Digest, alert and report emails were already queue items with per-item retry, so
  they were not re-routed (that would add a hop and a second dedupe); only partial report failures move to the
  outbox. New background emails (renewal, failed payment) use it. Direct sends from the apps (invitations,
  `send-trial-email`, AI quota warnings) move opportunistically.
- **The re-check hands off to the webhook** instead of copying its fulfilment code: one place creates
  subscriptions. The webhook verifies the hash again on the forwarded message.
- **The verifier accepts two hash methods.** The existing code hashed sorted `key=value&…` + key; Paynow documents
  "values in order + key". Both need the secret integration key, so accepting either cannot be forged; it keeps
  current behaviour and also accepts correctly-signed Paynow messages. `paynow-poll` now refuses unsigned answers
  and non-Paynow poll addresses (it trusted an answer with no hash, from any URL the caller passed). It has no
  caller in the apps today.
- **Billing emails go out regardless of the digest switch** (they are account notices, not reminders): to the
  owner and active billing delegates (Platform / Planner) or the learner (Simulator). The failed-payment follow-up
  goes to the payer (`initiated_by_auth_user_id`), else the owner.
- **Renewal = end date.** Paynow has no recurring charge, so "renewal" means paying again before `expires_at`.
  Trial and lifetime subscriptions are skipped; a longer-running active subscription of the same organisation
  (or learner) means it was already renewed. Steps work as a window (a missed day still sends the next step),
  once per subscription × end date × step.
- **Invitations:** only rows with an expiry date are expired (Platform rows always get one on insert, 7 days);
  notices only for expiries in the last 7 days, so the first run does not flood inviters with old ones. Planner
  accounts are included (housekeeping, no data outside the wall). In-app only, email through the digest (D6).
- **AI credits renew by themselves.** `ai_account_allowance` + `ai_period_start` already give each period a fresh
  allowance and usage counts from the period start; a ledger top-up would double it. The job records the new
  period once (marker with last period's use) and tells the owner / PMO Admins. It runs daily because periods are
  anchored on each subscription's start day, not the 1st. First periods (trial, new subscription, new
  organisation) are not renewals. No other monthly allowance exists today (seats, Planner limits and email limits
  are not monthly counters; Simulator leaderboard resets are Slice 3.5). AI credits are organisation-wide (both
  apps share the ledger), so there is no separate Simulator allowance job.
- Schedules: billing checks and housekeeping on UTC (D5); renewal reminders on organisation time (people-facing).

**Tests:** `supabase/functions` Vitest 115/115 (13 files; 12 new in `slice2Handlers.test.js`: verifier, outbox,
re-check, report retry); `node --test scripts/__tests__/check-background-jobs.test.mjs` 6/6;
`node scripts/check-background-jobs.mjs` passes. SQL tests v1594 (T1–T8) written, to be run by the owner.

**Owner checks after the run:**
1. Admin › System › Background Jobs lists `email.send`, `system.queue_wake`, `payments.pending_recheck`,
   `payments.followup`, `subscriptions.renewal_reminders`, `invitations.expire`, `allowances.monthly`.
2. **Paynow test-mode payment:** start a payment in test mode and close the browser on the Paynow page before
   returning. Within about an hour (`:05`) the payment row shows `last_check_result` "verified paid; passed to
   paynow-webhook" and the subscription exists. If it says "answer not verified", the integration key or the hash
   method does not match. A cancelled test payment gets one follow-up email after an hour.
3. A test subscription with `expires_at` 5 days ahead gets one reminder email at 08:00 organisation time.

**Open / for the owner:**
- **`paynow-webhook` trusts unsigned messages for non-Planner payments** (pre-existing): when no `hash` is sent it
  still sets the status and creates a subscription. Recommend refusing messages without a valid hash whenever
  `PAYNOW_INTEGRATION_KEY` is set — not changed here (behaviour change to live payments; owner decision).
- **`paynow-initiate` signs with the sorted `key=value` method.** If Paynow rejects test payments with "Invalid
  hash", that signing (not this slice) needs Paynow's documented method; the test-mode payment above shows it.
- `payment_transactions` has a pre-existing policy `policy_payment_transactions_service_role` with no role
  (`FOR ALL USING (true)`, v117, never dropped by any later SQL file), which lets any signed-in user change payment rows. Check it live
  (`SELECT policyname FROM pg_policies WHERE tablename = 'payment_transactions'`); if present it needs a fix (not changed here).
- No Admin screen for `saas_job_settings` yet (SQL edits); invitations without an expiry date are never expired.

### Slice 3 review (2026-11-27) — code complete, SQL run by the owner 2026-11-27

**Run order (owner):**

| # | Repo | Step | Status |
|---|---|---|---|
| 0 | — | Redeploy edge function `background-job-worker` (new handler `storage.cleanup`; the adapter gained `storageRemove`; `--no-verify-jwt`). Until it is redeployed the weekly `storage.cleanup` item fails with "No handler is registered" | pending |
| 1 | monorepo | `SQL/v1596_background_jobs_housekeeping.sql` (context fix, retention list + D11 purge, storage clean-up tables / scan, Simulator housekeeping; ends with dry runs that change nothing) | done 2026-11-27 |
| 2 | monorepo | `SQL/v1597_background_jobs_data_quality_and_manual_jobs.sql` (weekly data check, Global Template back-fill, search re-index, footprint dry run; ends with dry runs) | done 2026-11-27 |
| 3 | monorepo | `SQL/v1251_planner_table_wall.sql` (re-run, table registration rule 6 — four new tables: `retention_targets`, `storage_cleanup_buckets`, `storage_cleanup_references`, `data_quality_checks`) | done 2026-11-27 |
| 3a | monorepo | `SQL/v1599_bj_safe_count_type_fix.sql` (fix found by v1598 T7: count / JSON helpers cast to one type, PL/pgSQL record type caching) | done 2026-11-27 |
| 4 | monorepo | `SQL/v1598_background_jobs_slice3_tests.sql` (rolls back; expect "v1598: all Slice 3 background job tests passed (rolling back)") | done 2026-11-27 |
| 5 | Admin | `E:\project-nidus-admin\SQL\v262_background_jobs_housekeeping_admin.sql` | done 2026-11-27 |
| 6 | Admin | `E:\project-nidus-admin\SQL\v263_background_jobs_housekeeping_admin_tests.sql` (rolls back; expect "v263: all housekeeping Admin tests passed (rolling back)") | done 2026-11-27 |

v1596 and v1356's `SQL/v1586_api_webhooks.sql` create `public.retention_targets` with the same base shape and key,
so either may run first (v1586's two rows then get the Slice 3 defaults). No new reference columns, so no Admin ID
Generation rule (rule 16.2). No monorepo UI fields (no `field_help` rows); the Admin fields have Admin help rows.

**Built:**
- **Context fix (found while building):** `background_job_function_shape` treated a job function whose single
  `jsonb` argument has a default as "no arguments", so the runner called every organisation-time job
  (`reminders.due_dates`, `notifications.daily_digest`, `timesheets.reminders`, `reports.health_due`,
  `subscriptions.renewal_reminders`) without the tick's `time_zones`; `bj_zone_due` then let every organisation
  through at the first zone's time (markers prevented duplicates, but the timing was wrong for most
  organisations). It now passes the context (v1596 §0, test T1).
- **3.3 Log retention** `retention.purge` (sql, Sunday 03:00 UTC): D11 run history (succeeded / skipped runs and
  finished items after `success_retention_days`, failed / partial runs and dead items after
  `failure_retention_days`; running runs and waiting items never) plus every active `public.retention_targets` row.
  Names checked against the catalog (`retention_target_problem`), `format('%I')` everywhere, plain tables only
  (ctid batches), `batch_size` × `max_batches` per run, one target failing never stops the others, last result
  per target, dry run.
- **3.2 Storage clean-up** `storage.cleanup` (handler, Saturday 04:00 UTC, guarded): SQL scan
  (`storage_cleanup_scan`) per bucket in `storage_cleanup_buckets` against its `storage_cleanup_references`; the
  worker deletes through the Storage API (`ctx.storageRemove`), never SQL. Report only per bucket until deletion is
  switched on in Admin (refused before one report-only scan); 30-day safety window; 500 files per bucket per run.
- **3.5 Simulator housekeeping** `simulator.housekeeping` (sql, 02:45 UTC): idle practice runs (90 days) and idle
  collaborative sessions (90 days) → `abandoned`; lobbies never started (30 days) → `abandoned`. Thresholds are
  new columns of `saas_job_settings`.
- **3.4 Weekly data check** `quality.weekly_report` (sql, Monday 07:00 organisation time): checks are rows of
  `public.data_quality_checks` (count SQL, `$1` organisation, `$2` local date; broken checks skipped and listed);
  one in-app notice per owner / PMO Admin when anything is found (email through the daily digest, D6); counts kept
  in the week's marker.
- **Manual jobs:** `backfill.global_templates` (M.2, 50 organisations per run) and `search.reindex` (M.3,
  `ai_search_backfill`) — catalogue rows without a schedule, started with Admin's existing Run now (reason,
  audited). Re-embedding already exists (Admin v238 › AI › Embeddings). `public.organisation_data_footprint` (M.5
  dry run, service role only).
- **Admin:** v262 RPCs + Background Jobs › **Housekeeping** page and three routed edit pages (run history, a
  retention target, a Storage bucket); `describeCron` shows manual jobs as "Only when run by hand". Narrow
  exception extended in both CLAUDE.md files (rule 34.5 / Admin Security).
- Guides: `Documentation/Background_Jobs_v1352_Guide.md` (Slice 3 jobs, adding a retention target / data check,
  storage clean-up), Admin `modules/system/docs/Background_Jobs_Guide.md` (Housekeeping), Admin plan note v219.

**Decisions made during the build (not in the plan text):**
- **3.1 Roll-up refresh: no job.** There are no materialised views or summary caches in `public` or `sim`;
  portfolio / programme / PMO dashboards compute from live tables. `public.portfolio_metrics` is written only by
  v36 test data and read by no live page, so refreshing it would invent a feature. A future cache registers its
  own refresh job (rule 80).
- **Retention seeds are conservative.** Active: technical logs (markers 400 days — every job window is under 100
  days; email / error / API / sync / session / sign-in logs 90–365 days; field help events 730 days). Off until the
  owner decides: `notifications` (read, older than a year), `audit_log`, `activity_logs`, `data_access_logs`,
  `security_events`. `consent_logs` (GDPR evidence) is not listed at all. Business records and revision histories
  are never targets.
- **D11 lives in `background_job_settings`, not in `retention_targets`:** run history needs two periods (success /
  failure) on one table, and the key of `retention_targets` (fixed by v1586) allows one row per table.
- **Storage references verified in code** for seven buckets; other buckets (signatures, templates, evidence,
  branding, programme / project documents) are not listed until their reference columns are confirmed — while
  deletion is off a wrong reference could only produce wrong counts. A file is "referenced" when a stored value,
  after dropping `?query` and any `…/<bucket>/` prefix, equals its name (or the name with `%20` for spaces).
- **Simulator leaderboards are not recomputed:** nothing in the app writes `sim.leaderboard_entries`, and the live
  table carries two conflicting definitions (v66 `leaderboard_type` / `score` NOT NULL, v692 `period` /
  `total_points`). Recomputing needs its own decision on the scoring rule.
- **Data check is Platform only:** practice projects belong to one learner and have no PMO Admin; a weekly "your
  practice data has gaps" notice would be noise. Rule 34.1 gap recorded here.
- **Data-check notices are in-app only;** the email comes through the daily digest under the Reports switch (D6),
  so people control it.
- **Manual jobs take no options from Admin** (Run now sends an empty context): the back-fill works in batches of 50
  (run again for more), the re-index covers both schemas.

**Tests:** `supabase/functions` Vitest 122/122 (14 files, 7 new in `slice3Handlers.test.js`; the count includes
another session's uncommitted `_shared/api` tests); `node scripts/check-background-jobs.mjs` passes,
`node --test scripts/__tests__/check-background-jobs.test.mjs` 6/6. Admin `packages/shared`
`backgroundJobServices.test.js` 14/14 (7 new); Admin `check-background-jobs` and `check-native-date-inputs` pass;
`check-field-help` 0 keys without help (its one raw label is another session's `ApiUsagePage.jsx`);
`pnpm turbo build --filter=@nidus-admin/system` builds. SQL tests v1598 (T1–T8) and Admin v263 (H1–H5) written,
to be run by the owner.

**Owner checks after the run:**
1. Admin › System › Background Jobs lists `retention.purge`, `storage.cleanup`, `simulator.housekeeping`,
   `quality.weekly_report` and the manual `backfill.global_templates`, `search.reindex` ("Only when run by hand").
2. Background Jobs › **Housekeeping** shows run history 90 / 365 days, the retention list (audit logs off) and the
   seven buckets (report only). Run **Storage clean-up** now (reason), then check each bucket's "Last scan" counts
   before switching deletion on for any bucket.
3. `SELECT public.run_retention_purge('{"dry_run": true}');` — check the counts per table before the first Sunday.
4. Monday 07:00 organisation time: owners / PMO Admins with gaps get one "Data check" notice.

**Decisions needing the owner:**
- **M.5 organisation data export / deletion — not built.** Recommended: a request record (organisation, type,
  reason, requested by, approved by, status) created in Admin with two-person approval; an export job that writes
  the organisation's rows (table list from `organisation_data_footprint` plus the GDPR registry) and Storage files
  to a private bucket with an expiring link; deletion only after a cooling-off period (e.g. 30 days) as a lock
  first, then a hard-delete job per table in dependency order. Needs a PRD: legal hold, billing records kept for
  tax, Storage files, Simulator data, and who may request it.
- **M.4 large bulk-import processing — not built.** Every bulk import today parses the file in the browser and
  saves through the normal services; there is no server-side import to move to the queue. Recommended: build it
  when the first import is too large for the browser (e.g. MS Project imports above a few thousand rows), as an
  `imports.process` handler that reads an uploaded file in chunks with progress on an import record.
- **Retention for audit / security logs and read notifications.** Recommended: keep `audit_log`,
  `data_access_logs`, `security_events` 7 years (2555 days, as seeded) once legal confirms, then switch them on in
  Housekeeping; read notifications 365 days.
- **Simulator leaderboards** — choose the scoring rule (and which table definition stays) before a recompute job.

**Remaining gaps:** no Admin screen for `saas_job_settings` (Simulator housekeeping thresholds are SQL edits);
Storage buckets beyond the seven listed need their reference columns confirmed before they are added.

### v1352 close-out (2026-11-27)

All four slices are built: framework and existing jobs (Slice 0), promised features (Slice 1), notifications and
SaaS operations (Slice 2), data health, housekeeping and manual jobs (Slice 3) — Platform, Simulator, Planner and
Admin jobs running through one tick from one catalogue, with run history, grouped alerts, retries, a queue with
back-off and replay, and Admin monitoring and housekeeping. Slices 0–2 SQL has been run; Slice 3 waits for the
owner's SQL run, worker redeploy and browser check. Open beyond v1352: the owner decisions above (M.4, M.5,
audit-log retention, leaderboards), the `ai.embed` edge limit (v1272) and the Slice 2 Paynow items listed above.
