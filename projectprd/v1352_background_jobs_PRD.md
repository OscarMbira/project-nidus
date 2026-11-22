# v1352 — Background jobs (batch jobs) for the SaaS PMIS — PRD

**Status:** Decisions D1–D11 settled with the owner on 2026-11-22 (interview, rules 56–60). Remaining **P** items are
technical defaults that follow from those decisions. Next: implementation plan `projectplan/v1352_background_jobs_plan.md`.
**Roadmap:** R11 — Integrations, Notifications & Automation ("scheduled jobs"; indicators: failures observable,
side effects auditable, retries / idempotency handled). Touches R12 (observability, resilience).
**Systems:** Platform + Simulator (monorepo, `public` / `sim`), Admin (monitoring and manual runs), Planner
(only where its own tables are involved).

---

## a) Problem statement

Project Nidus already does work in the background, but in an unmanaged way, and several features promise
scheduled behaviour that never happens.

**1. Jobs that exist today are scattered and invisible.**

| Job | How it runs today | Found in |
|---|---|---|
| Trial expiry check (reminders, lock expired trials) | pg_cron daily 00:00 UTC → `check_trial_expirations_cron()`; edge function `check-trial-expirations` also exists | `SQL/v118` |
| Auto-archive expired lifecycle history | pg_cron daily 00:00 UTC | `SQL/v658`, Admin `SQL/v99` |
| AI retention purge (conversations, agent runs, ledger usage) | pg_cron daily 02:30 UTC | `SQL/v1273` |
| AI meaning-search embedding | pg_cron every 2 min → `ai-embed` edge function (queue) | `SQL/v1284` |
| Draft expiry + warnings | edge function `expire-drafts` — **no schedule found in SQL** | `supabase/functions/expire-drafts` |
| System-tester moratorium expiry | edge function `admin-moratorium-cron` — **no schedule found in SQL** | `supabase/functions/admin-moratorium-cron` |
| ID generation capacity alerts | function "designed to be called by pg_cron" | Admin `SQL/v140` |
| Paynow payment status | `paynow-poll` called from the browser only | `supabase/functions/paynow-poll` |

Nobody can see whether these ran, how long they took, what they changed or why they failed. Each one invents
its own scheduling, secrets and logging. Two have no schedule at all in version control.

**2. Features store schedules that nothing executes.**

| Feature | What users can set up | What actually happens |
|---|---|---|
| Scheduled health reports (both apps) | name, frequency, recipients | Nothing — `scheduledHealthReportService.js` says "No background worker exists yet"; "Run now" writes a placeholder run row |
| Recurring tasks (both apps) | templates and schedules | Instances are read-only history; nothing generates them on schedule |
| EVM snapshots (both apps) | period snapshots shown on EVM pages | Only seed data writes them; no period-end capture |
| Email digests, notification rules / preferences | preferences stored | No digest builder or rule runner |
| Timesheet reminders | logged when a manager sends one by hand | No automatic reminder before the period closes |
| Daily log reminders, strategy "scheduled activities" (quality, communication, configuration, risk) | dates stored | No due-date reminders |

For a low-training SaaS product this is a trust problem: a user schedules something and it silently never runs.

**3. SaaS operations needed before scale have no home** — subscription renewal / failed payment follow-up,
invitation expiry, storage clean-up, audit-log retention, roll-up refresh for portfolio / PMO dashboards, and
safe manual runs for back-fills (e.g. the v1001 Global Template sync back-fill was a one-off script).

## b) Solution

One small **job framework**, then jobs added on top of it in waves.

1. **Job catalogue + run log (database).** Every job is a row in a catalogue (code, purpose, owner system,
   trigger type, schedule, enabled, time-out, retry policy). Every execution writes a run row (start, finish,
   status, records processed, error, triggered by). Jobs are database functions or edge functions called
   through one runner, so logging, locking and retries are written once.
2. **Three trigger types**, chosen per job:
   - **Automatic (event / queue-driven)** — work created by a user action is queued and drained in the
     background within minutes (e.g. embeddings, outgoing notifications). The user never waits for it.
   - **Scheduled (time-based, pg_cron)** — runs on a clock: daily, weekly, period-end, or "every N minutes,
     pick up whatever is due" for user-defined schedules.
   - **Manual (on demand)** — started by an authorised person: Admin back-fills, re-index, re-run of a failed
     job, and a user's "Run now" on their own scheduled report.
3. **Admin › System › Background Jobs** page: list jobs, last run, next run, success / failure, run history,
   enable / disable, "Run now", with reason and audit (Admin narrow exception, same pattern as earlier ones).
4. **Migrate the existing jobs** onto the framework (no behaviour change), then **build the missing workers**
   for features that already promise scheduled behaviour.

## Recommended job catalogue

Trigger: **A** = automatic (queue / event), **S** = scheduled, **M** = manual. "Both" = Platform + Simulator.

### Wave 0 — framework + existing jobs (no new behaviour)

| # | Job | Purpose | Trigger | Why that trigger |
|---|---|---|---|---|
| 0.1 | Job runner + run log | One place that starts jobs, prevents overlap, records results, retries | — | Foundation |
| 0.2 | Trial expiry | Remind 3 / 1 day before; lock expired trials (CLAUDE.md conventions 35–38) | S daily | Date-based business rule |
| 0.3 | Lifecycle history auto-archive (public + Admin) | Archive history past its retention | S daily (off-peak) | Housekeeping, no user waiting |
| 0.4 | AI retention purge | Privacy retention for AI data | S daily 02:30 | Retention is date-based |
| 0.5 | AI embedding queue | Make new / changed records searchable by meaning | A every 2 min | Must follow saves quickly without slowing them |
| 0.6 | Draft expiry | Expire old drafts, warn owners first (rule 37) | S daily | Date-based; currently unscheduled |
| 0.7 | Tester moratorium expiry | Warn / end system-tester moratoriums | S daily | Date-based; currently unscheduled |
| 0.8 | ID generation capacity alerts (Admin) | Warn before an ID rule runs out of numbers | S daily | Slow-moving risk; daily is enough |

### Wave 1 — features that already promise scheduled behaviour (Both)

| # | Job | Purpose | Trigger | Why that trigger |
|---|---|---|---|---|
| 1.1 | Scheduled health reports | Build and email each due report; record the run | S every 15 min (picks due schedules) + M "Run now" | Users choose the time; owner can run on demand |
| 1.2 | Recurring task generator | Create the next task instances from recurring schedules | S daily (+ on schedule save) | Tasks should appear ahead of time, idempotently |
| 1.3 | Due-date reminders | Remind owners of approaching / overdue risk & issue reviews, actions, milestones, strategy activities, document sign-offs, daily logs | S daily, in each organisation's time zone | Date-based; one job, many record types |
| 1.4 | Timesheet reminders | Remind people with missing time before a period closes | S per period (e.g. Friday) | Period-based; replaces manual chasing (manual send stays) |
| 1.5 | EVM / progress snapshots | Capture period-end EVM and progress snapshots per project | S period-end (monthly; per project setting) | Trend charts need consistent points in time |

### Wave 2 — notifications and SaaS operations

| # | Job | Purpose | Trigger | Why that trigger |
|---|---|---|---|---|
| 2.1 | Notification / email outbox | Send queued in-app, email and Teams / Slack messages with retry | A every minute | Sending must not block saves; retries need a queue |
| 2.2 | Email digests | Daily / weekly summary per user preferences | S daily / weekly, user time zone | Batching reduces email noise |
| 2.3 | Payment follow-up | Re-check pending Paynow payments; renewal reminders; failed-payment follow-up | S hourly (pending) + daily (renewals) | Payments must not depend on the user's browser |
| 2.4 | Invitation expiry | Expire stale invitations, tell the inviter | S daily | Date-based security housekeeping |
| 2.5 | Monthly allowances | Reset / top up monthly AI credits and similar plan allowances | S monthly | Calendar-based billing rule |

### Wave 3 — data health and performance

| # | Job | Purpose | Trigger | Why that trigger |
|---|---|---|---|---|
| 3.1 | Roll-up refresh | Refresh portfolio / programme / PMO dashboard summaries | S hourly (+ A after big imports) | Keeps dashboards fast without live heavy queries |
| 3.2 | Storage clean-up | Remove orphaned uploaded files | S weekly | Low urgency, cost control |
| 3.3 | Audit / log retention | Archive or purge logs past retention | S weekly / monthly | Retention is date-based |
| 3.4 | Data-quality report | Find orphaned or inconsistent records; report to Admin | S weekly | Early warning, not urgent |
| 3.5 | Simulator housekeeping | Close abandoned practice runs; recompute leaderboards | S daily / hourly | Simulator-only; keeps rankings current |

### Manual-only jobs (Admin, reason required, audited)

| # | Job | Purpose | Why manual |
|---|---|---|---|
| M.1 | Re-run a failed job | Retry after fixing the cause | Needs a human decision |
| M.2 | Back-fills (e.g. Global Template sync to accounts) | Apply a fix to existing data | One-off, owner-approved |
| M.3 | Search re-index / re-embed | Rebuild after model or schema changes | Expensive; rare |
| M.4 | Large bulk import processing | Process a large upload in the background with progress | Started by the user's upload, runs async |
| M.5 | Organisation data export / deletion | Customer exit and privacy requests | Legal / contractual action |

## Is now the right time?

**Yes.** The framework, the existing jobs and Wave 1 are overdue; Waves 2–3 follow in the same PRD (D1, D10).

- Users can already set up scheduled health reports and recurring tasks that never run; that is a defect
  visible to customers, not a future feature.
- Eight jobs already exist without monitoring; before go-live a failed trial-lock or payment check must be
  visible, not silent (R11 / R12 indicators).
- The framework is small and stable; later jobs are added to it as their features ship (same pattern as the
  menu catalogue: a feature that needs background work registers its job in the same change).
- Owner decision D1: Waves 2–3 are built in this PRD too, after Waves 0–1 (D10). Their thresholds (digest
  times, roll-up frequency, retention periods) are stored as data so they can be tuned once real volumes exist.

## c) User stories

1. As the owner, I can see every background job, what it does, its trigger type and schedule, in one list.
2. As the owner, I can see each job's last run, next run, duration, records processed and result.
3. As the owner, I am told (in-app notification) when a job fails or has not run when expected.
4. As the owner, I can disable or enable a job, with a reason, and that change is audited.
5. As the owner, I can start a manual run of a job, with a reason, and see its result.
6. As the owner, I can re-run a failed run after fixing its cause.
7. A job never runs twice at the same time (no overlap), and running it twice for the same period does not
   duplicate its effect (idempotent).
8. A job that fails part-way can be retried without corrupting data.
9. As a schedule owner, my scheduled health report is built and emailed at the time I chose, in my
   organisation's time zone, and I can see each run.
10. As a schedule owner, "Run now" produces a real report, not a placeholder.
11. As a project manager, recurring tasks appear in the schedule ahead of their dates without duplicates.
12. As a record owner, I receive a reminder before a review date, due date or sign-off deadline, and when it
    becomes overdue — once, not repeatedly every run.
13. As a team member, I receive a timesheet reminder before the period closes if my time is incomplete.
14. As a project manager, EVM and progress trend charts show period-end snapshots captured automatically.
15. As a Simulator learner, the same reminders, recurring tasks, reports and snapshots work on my practice
    projects (`sim` schema).
16. As a user, I can turn reminder emails off in my notification preferences; in-app notices remain.
17. As the owner, existing jobs (trial expiry, archive, AI purge, embedding, draft expiry, moratorium, ID
    capacity) appear in the same list, with unchanged behaviour.
18. As a Planner customer, only the jobs that touch Planner data (recurring tasks, reminders) run for my
    account; nothing outside the Planner allow-list.

## d) Implementation decisions (D = owner decision; P = technical default)

- **D2 Engine — portable design on pg_cron (owner, 2026-11-22; asked to avoid database lock-in).**
  PostgreSQL is the committed database; Supabase is the current host and must stay replaceable for jobs.
  - **Job logic** lives in plain Postgres functions (data work) and plain TypeScript handlers (email, AI,
    payments, external calls). Handlers use one small adapter for host-specific calls; no job calls
    Supabase-specific APIs directly.
  - **One clock tick:** `run_due_background_jobs()` runs every minute and starts whatever the catalogue says is
    due. Jobs never call `cron.schedule` themselves. Today pg_cron calls the tick; after a host move any
    scheduler (cloud scheduler, Kubernetes CronJob, server timer, worker) calls the same function.
  - **Queue table for outside work:** jobs that leave the database put rows in a work queue; a worker claims
    them (`FOR UPDATE SKIP LOCKED`), runs the handler and records the result. Today the worker is an edge
    function woken by the tick; nothing depends on pg_net beyond that single wake-up call, which a host move
    replaces with the new scheduler calling the worker directly.
  - **Catalogue, run log and queue are ordinary tables**, so they move with the database.
  - Existing jobs (v118, v658, v1273, v1284) move from their own `cron.schedule` entries to the catalogue + tick.
- **P2 Tables:** `public.background_jobs` (catalogue) and `public.background_job_runs` (run log), RLS on, no
  client writes; registered in `database_tables`; Planner wall re-run (rule 6 of table registration).
- **P3 One runner:** `public.run_background_job(code, triggered_by, reason)` — takes an advisory lock, writes
  the run row, calls the job, records the result, applies the retry policy.
- **D3 Monitoring (owner, 2026-11-22): Admin › System › Background Jobs** — list, last / next run, run history,
  failures, enable / disable, Run now, re-run failed — through `public.admin_background_job_*` SECURITY DEFINER
  RPCs gated by `system.background_jobs.view` / `.run` / `.edit`, reason required, every action audited. A new
  narrow exception is added to CLAUDE.md rule 34.5. No organisation-facing jobs page in Platform / Simulator
  (users see their own schedules where they set them up).
- **D5 Time zones (owner, 2026-11-22):** reports, reminders, digests and timesheet reminders follow the
  organisation's time zone from Regional & Format Settings (rule 68), with the project override where the job
  works per project. Archive, purge, clean-up and billing checks run in UTC at quiet hours.
- **D8 Simulator parity (owner, 2026-11-22):** every people-facing job (reminders, digests, scheduled reports,
  recurring tasks, EVM / progress snapshots, timesheet reminders) runs for `public` **and** `sim`. Emails from
  practice data are clearly marked as Simulator / practice.
- **D1 Scope (owner, 2026-11-22): all waves in this PRD** — framework, Wave 0, Wave 1, Wave 2, Wave 3 and the
  manual-only jobs. Delivered in slices (one wave per slice), each slice tested and committed before the next.
- **D4 Failure alerting (owner, 2026-11-22):** in-app notification **and** email to Admin users with
  `system.background_jobs.view`, for a failed run and for a job that has not run when expected (late). Repeat
  failures of the same job are grouped (one alert until it succeeds again), not sent every run.
- **D6 Reminder delivery (owner, 2026-11-22):** each reminder appears in-app per item; **email arrives as one
  daily digest per person** (not one email per reminder), in the organisation's time zone (D5). One reminder
  before the date and one when overdue, never repeated each run. Users can switch the digest email off in
  their notification preferences; in-app reminders stay. (The digest job, Wave 2.2, is therefore needed by
  Wave 1's reminders and is built with them.)
- **D7 Reminder lead times (owner, 2026-11-22):** defaults per record type stored as data (e.g. 3 days before;
  milestones 7 days), changeable per organisation by the PMO Admin in PMO Configuration (rule 25.1 — no
  hard-coded lead times). New screen gets field help (rule 76), Audit tab (rule 63.1) and Platform–Simulator
  parity.
- **D9 Governance rule (owner, 2026-11-22):** new CLAUDE.md **rule 80** (+ Admin equivalent): any feature that
  needs background work registers its job in the catalogue in the same change and runs through the tick —
  never its own `cron.schedule`. A check script (CI) fails on any `cron.schedule` outside the tick and on
  catalogue jobs without a handler.
- **D10 Delivery order (owner, 2026-11-22):** Wave 0 → 1 → 2 → 3 (then manual-only jobs with Wave 3), each slice
  tested and committed before the next. The daily digest (2.2) is pulled into Wave 1 because reminders use it (D6).
- **D11 Run history retention (owner, 2026-11-22):** successful runs kept 90 days, failed runs 1 year, purged by
  the log-retention job (3.3); the periods are stored as data and changeable in Admin.
- **P9 Secrets:** one server-only job configuration row (extends the `ai_job_config` pattern from v1272), never
  readable by clients.
- **A1 Amendment (owner, 2026-11-22): framework capabilities needed by v1353–v1356.** A review of the later plans
  (billing, levelling / portfolio, quantitative risk, public API / SCIM) found no new catalogue rows are needed in
  v1352 itself (each feature registers its own jobs under rule 80), but six framework capabilities must be built
  now so the queue is not reworked later:
  1. **Per-item retry timing** — each queue item has `run_after`, `attempts`, `max_attempts`, `expires_at` and a
     back-off schedule set per job (e.g. 1 min → 5 min → 30 min → 2 h, up to 24 h); items that run out of
     attempts or time become `dead` (final failure). Needed by v1356 webhooks and the 2.1 outbox.
  2. **Replay one queue item** — Admin (and, through the owning feature’s page, organisation admins) can re-queue a
     single dead / failed item with a reason, audited. Needed by v1356 webhook replay.
  3. **Enqueue from a transaction** — one function `enqueue_background_job(code, payload, run_after, dedupe_key,
     organisation_id)` callable from triggers and RPCs (`SECURITY DEFINER`, no client access); a duplicate
     `dedupe_key` is ignored. Needed by the v1356 webhook outbox and v1353 milestone-complete → billing line due.
  4. **Per-organisation fairness and batch limits** — the worker claims a capped batch per run and at most N items
     per organisation per batch (both stored as data per job), so one organisation’s event flood cannot starve
     others.
  5. **Retention list** — log retention (3.3) reads a table of targets (`table`, date column, keep period, optional
     status filter) instead of hard-coded tables; later features add rows (v1356 API request log, webhook
     deliveries, idempotency keys, rate counters).
  6. **Reminder record-type list** — due-date reminders (1.3) read a table of record types (record type, schema,
     table, date column, status filter, recipient rule: record owner / role / organisation admins, default lead
     time, message key) so later features add rows, not code: v1354 levelling moves awaiting a PM and portfolio
     scenarios awaiting approval; v1355 stale analyses (optional); v1356 API key, SCIM token and SAML certificate
     expiry.

  Jobs the later features will register (recorded in their own plans, not built here): v1353 overdue invoice
  reminders, recurring invoice drafts, billing schedule due lines; v1356 webhook delivery, idempotency / rate
  counter purge, SSO domain re-check. v1354 and v1355 need no jobs of their own.

## e) Testing decisions

- **Unit:** each job's database function tested for idempotency (run twice → one effect), period boundaries,
  time zones, and both schemas; edge functions with Vitest as the existing functions are.
- **Runner:** overlap prevention, retry, failure recording, disabled job skipped.
- **Admin:** RPC permission checks and audit rows; page tests in the Admin repo.
- **SQL checks:** an audit query listing catalogue jobs without a pg_cron entry and pg_cron entries without a
  catalogue row (so a job can never again exist unscheduled or unmonitored).
- **Done:** every Wave 0 job visible with run history; scheduled health reports, recurring tasks, reminders,
  timesheet reminders and EVM snapshots running in both apps; owner browser check in Admin.

## f) Out of scope

- External schedulers / queues (e.g. a separate worker service) — revisit only if pg_cron limits are reached.
- (Waves 2–3 and manual-only jobs are now in scope — D1.)
- A user-facing page listing all of an organisation's jobs (users see their own schedules where they set them).
- Exchange-rate import from an external provider (needs an integration decision first).

## g) Further notes

- Supabase plan must have pg_cron and pg_net enabled in each environment; the setup guide
  `Documentation/Cron_Job_Setup.md` exists and will be updated.
- Every future feature that needs background work registers its job in the catalogue in the same change
  (candidate CLAUDE.md rule, decided in the interview).
- Job code examples and seed rows follow rule 77 (no real names).
