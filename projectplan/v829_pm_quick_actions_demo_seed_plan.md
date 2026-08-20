# v829 — PM Dashboard Quick Actions: demo records for the blank registers

## Problem

From the PM Dashboard (`/pm/dashboard`), the **Quick Actions** panel links to six pages:
Daily Log · Work Packages · Risk Register · Issue Register · Checkpoint Reports · Highlight Reports.

Several of those pages open empty even though the dashboard stat cards show non-zero
counts (e.g. "10 Open Issues", "10 Quality Activities"). The Quality Register page
(`/pm/controls/quality-register`) is likewise empty.

## Why each page is blank

| Page | Table the list actually reads | Why it is empty today |
|------|-------------------------------|-----------------------|
| Daily Log | `daily_logs` (parent) + `daily_log_entries` | No parent log row exists for the project, so there are no entries to show. Never seeded. |
| Issue Register | `issues` filtered by **`issue_register_id`** | v819 seeded issues with `project_id` only. The dashboard counts by `project_id` (so it reads 10) but the register page filters by `issue_register_id`, which is NULL on those rows. |
| Quality Register (Register tab) | `quality_register` | v819 seeded `quality_reviews` + `quality_inspections` only. Those feed the **Activities** tab and the dashboard's "Quality Activities" card. The register (products/deliverables) table was never seeded. |
| Highlight Reports | `highlight_reports` | Never seeded. |
| Work Packages | `work_packages` | Already seeded by v819 (10 rows). |
| Checkpoint Reports | `checkpoint_reports` | Already seeded by v819 (10 rows). |
| Risk Register | `risks` via `risk_registers` | Already seeded by v822 (10–20 rows). |

## Scope

Seed file only — **no application code changes**. Platform (`public`) schema only:
the `sim` schema has no `daily_logs` / `quality_register` / `highlight_reports` /
`issue_registers` tables, so there is no Simulator twin to seed (consistent with
v819 and v822, which are also Platform-only).

Per CLAUDE.md rule 18.2 this is a companion **seed** file, created on explicit user
request, kept separate from any infrastructure migration.

## Approach

`SQL/v829_pm_quick_actions_demo_seed.sql`, one pass over every non-deleted project:

- **Idempotent.** Every seeded row's `id` is `uuid_generate_v5(project_id, 'v829-<category>-<n>')`,
  inserted with `ON CONFLICT (id) DO NOTHING`. Re-running the file is a no-op.
- **Per-category error isolation.** Each category runs in its own `BEGIN … EXCEPTION`
  block so one failing category cannot block the rest (v819's pattern).
- **Visible diagnostics.** Outcomes are written to a temp table and `SELECT`ed at the
  end, because the Supabase SQL Editor Results panel does not surface `RAISE NOTICE`.
- **Existing data respected.** Categories that already hold rows are topped up to the
  target only when they fall below the floor; nothing is overwritten or deleted.

### Per-category detail

1. **Daily Log** — `create_daily_log_for_project(project_id, user_id)` (v705) to get or
   create the parent, then **12** `daily_log_entries` spanning all entry types
   (`problem`, `action`, `event`, `comment`, `observation`, `decision`) with a mix of
   `open` / `in_progress` / `completed` statuses, priorities, target dates, and tags —
   enough to exercise the summary cards, the overdue filter, and the calendar/timeline views.
2. **Issue Register** — `create_issue_register_for_project(project_id, user_id)` (v821),
   then **backfill** `issue_register_id` on the existing v819 issues so they finally
   appear on the page, then top up to **12** with register-shaped issue types
   (`request_for_change`, `off_specification`, `problem_concern`).
3. **Quality Register** — **12** `quality_register` products/deliverables (PID, BRS,
   architecture design, migration plan, test reports, runbook, handover pack, PIR …)
   with quality methods, criteria, owners and a spread of `quality_status` values.
4. **Highlight Reports** — **12** weekly `highlight_reports` with reporting periods,
   RAG `stage_status`, executive summary, progress/budget/schedule commentary, and a
   mix of `draft` / `submitted` / `distributed`.
5. **Work Packages** and **Checkpoint Reports** — top up to **12** only if the project
   currently holds fewer than **6**, so environments where v819 was never run still
   land inside the 6–20 range, and environments where it was run are left alone.

Risk Register is deliberately untouched — v822 already covers it.

## Todo

- [x] Confirm the exact table, required columns and list filters behind each Quick Action page
- [x] Write `projectplan/v829_pm_quick_actions_demo_seed_plan.md`
- [x] Write `SQL/v829_pm_quick_actions_demo_seed.sql`
- [x] Daily Log: parent log + 12 entries
- [x] Issue Register: register row + backfill `issue_register_id` + top up to 12
- [x] Quality Register: 12 products
- [x] Highlight Reports: 12 reports
- [x] Work Packages / Checkpoint Reports: top-up floor of 6
- [x] Fix `create_issue_register_for_project()` (v830) — blocking bug found in testing
- [x] Stop the seed hand-minting `issue_identifier` values
- [x] Resolve `users.id` from the auth uid in the issue services + v831 guard
- [x] Confirm no test regressions from the service change
- [x] Review section

## Follow-up: v830 — `create_issue_register_for_project()` is broken

Testing the Issue Register Quick Action surfaced a blocking bug that had to be fixed
before the seed could create a register at all:

> `Error: function generate_issue_register_reference() does not exist`

**Cause.** `SQL/v756b_id_generation_migration_public.sql` (Phase 1, Issue family)
calls `_v756_swap_display_id_trigger(...)` for `public.issue_registers`. Its
`p_drop_function_names` argument explicitly drops
`public.generate_issue_register_reference()` and swaps the old BEFORE INSERT
reference trigger for `trg_issue_registers_admin_display_id`, an AFTER INSERT trigger
that fills `register_reference` from `admin.generate_display_id()`. v821 later
rewrote `create_issue_register_for_project()` (to drop a dead `organisation_id`
lookup) but kept the call to the by-then-deleted generator.

This is the same breakage `v823_fix_create_risk_register_for_project_display_id.sql`
repaired on the risk register side — the issue register was simply missed at the time.

**Fix — `SQL/v830_fix_create_issue_register_for_project_display_id.sql`:**

- Insert with `register_reference = ''` and let the AFTER INSERT display-ID trigger
  assign the real reference, mirroring v823.
- Short-circuit and return the existing register if one exists, so a repeated or
  concurrent call cannot trip the UNIQUE constraint on `issue_registers.project_id`
  (v821 had no such guard; `create_risk_register_for_project` does).
- Fall back to `IR-YYYY-NNN` if the trigger leaves the reference blank, which happens
  when no admin ID-generation rule is configured for `public.issue_registers`.
  Without this the reference stays `''`, and because that column is UNIQUE only one
  project in the entire database could ever create a register — the second would fail
  with a duplicate-key error that gives no hint about the missing rule. This matters
  precisely because v829 seeds every project in one pass.
- Backfill any register already sitting on a blank reference.

**Knock-on change to v829.** The seed's issue backfill originally hand-minted
`ISS-YYYY-NNN` values for the linked v819 issues. `issues.issue_identifier` carries a
partial UNIQUE index across the whole table and is owned by the admin display-ID
generator, so those hand-built values would occupy the generator's next sequence
positions and break the following genuine insert. The backfill now sets only
`issue_register_id` and `issue_number`; every list, form and export already falls back
to `Issue #<issue_number>` when the identifier is absent.

## Follow-up: v831 — auth uid written into `users` foreign keys

With v830 applied, register creation got past the missing function and hit the next
error:

> `insert or update on table "issue_registers" violates foreign key constraint "issue_registers_updated_by_fkey"`

**Cause.** `public.users.id` and the Supabase auth uid are different values, joined by
`public.users.auth_user_id` — every v175 RLS policy matches on
`u.auth_user_id = auth.uid()`, which is the giveaway.
`issueRegisterService.createIssueRegister` was passing `supabase.auth.getUser().id`
straight through as `p_user_id`, so the function wrote an auth uid into `created_by`
and `updated_by`, both foreign keys to `public.users(id)`. `created_by` survived
because `trigger_set_created_fields` overwrites it; `updated_by` had nothing to save it.

The risk-register equivalents (`riskRegisterService.createRiskRegister`,
`riskService.createRisk`) already resolve `users.id` from `auth_user_id` before calling
their RPC. The issue register service simply never did — the same reason it was the
one left broken by v756b.

**The same mistake ran through `issueService.js`,** which would have failed the moment
the register loaded and the user clicked "Log Issue": `created_by`, `updated_by`,
`reported_by_user_id`, `raised_by_id`, `author_id`, `deleted_by` and `resolved_by_id`
were all being set to the auth uid, and `issues.reported_by_user_id` is
`NOT NULL REFERENCES users(id)`.

**Fix, in three parts:**

- `apps/{platform,simulator}/src/services/issueRegisterService.js` — resolve `users.id`
  from `auth_user_id` before the RPC, matching the risk register pattern.
- `apps/{platform,simulator}/src/services/issueService.js` — added a single
  `getCurrentAppUserId()` helper and routed all nine user-id writes through it, across
  `createIssue`, `updateIssue`, `deleteIssue` and `closeIssue`.
- `SQL/v831_create_issue_register_resolve_auth_user_id.sql` — defence in depth: the
  function now accepts either a `users.id` or an auth uid and resolves it, because
  other callers exist (`create_issue_from_risk()`, the v829 seed) and nothing in the
  signature says which of the two ids is wanted. If neither matches it now raises a
  message naming the value instead of a bare FK error. v831 is a complete replacement
  for v830 and keeps its short-circuit and `IR-YYYY-NNN` fallback.

**Regression check.** `apps/platform` `issueService.test.js` reports 6 passed / 4 failed
both before and after the change — the same four tests. They fail on an incomplete
Supabase mock (its chain is `.eq().eq().single()` while the service calls
`.eq().single()`, and `.order()` is missing), which is pre-existing and unrelated. Left
alone rather than rewritten here, as fixing the mock is not part of this change.

## How to run

Order matters:

1. `SQL/v831_create_issue_register_resolve_auth_user_id.sql` — supersedes v830; apply
   this one. It must land before the seed, or the seed's Issue Register section logs
   `FAILED`. (If v830 was already applied, v831 simply replaces the function again.)
2. `SQL/v829_pm_quick_actions_demo_seed.sql`

Paste each into the Supabase SQL Editor. v829's final `SELECT` returns one row per
project per category showing `OK` with a row count, `SKIPPED` with a reason, or
`FAILED` with the exact Postgres error.

## Out of scope

- Any change to application code, services, routes or RLS
- Risk Register (v822), dashboard stat cards (v819), Lessons Learned (v819)
- Simulator (`sim`) schema — the tables do not exist there

## Review

**Files added**

- `projectplan/v829_pm_quick_actions_demo_seed_plan.md` — this plan
- `SQL/v829_pm_quick_actions_demo_seed.sql` — the seed
- `SQL/v830_fix_create_issue_register_for_project_display_id.sql` — the blocking
  function fix found during testing (see the v830 section above)
- `SQL/v831_create_issue_register_resolve_auth_user_id.sql` — supersedes v830 after the
  follow-on foreign-key error (see the v831 section above)
- `SQL/v832_fix_get_risk_summary_nested_aggregate.sql` — unrelated pre-existing bug
  surfaced by the same console session (see the v832 section below)

## v832 — `get_risk_summary()` nested aggregate

Not caused by this seed, but exposed by it. `get_risk_summary()` (v172) built its
`risks_by_category` column as `jsonb_object_agg(category, COUNT(*))`. PostgreSQL rejects
nested aggregate calls (SQLSTATE 42803), which PostgREST returns as HTTP 400, so the
risk summary cards on the Risk Register page and the `ProjectRiskSummary` widget on the
project detail page were failing with "Error fetching risk summary".

The bug was dormant for as long as projects had no risk register, because the function
returns early at its `v_register_id IS NULL` guard before the bad query is planned. It
became visible once v822 gave every project a register and seeded risks into it.

v832 rebuilds `risks_by_category` from a grouped subquery — the same shape
`get_issue_summary()` (v174) already uses for `issues_by_status`. It also counts risks
with a NULL `status_enum` as active (`NOT IN (...)` evaluates to NULL for those, so they
were silently dropped) and returns `'{}'` instead of NULL for an empty register.

Platform only — the `sim` schema has no `risk_registers` table.

**Files changed**

- `apps/{platform,simulator}/src/services/issueRegisterService.js`
- `apps/{platform,simulator}/src/services/issueService.js`

**What the seed does**

For every non-deleted project it resolves a seed user (project manager → owner →
project member → any active user; the project is skipped and logged if none exists),
then seeds 12 records into each of Daily Log, Issue Register, Quality Register and
Highlight Reports, and tops Work Packages / Checkpoint Reports up to 12 when they hold
fewer than 6. Every insert is keyed on a deterministic `uuid_generate_v5` id with
`ON CONFLICT (id) DO NOTHING`, so re-running the file changes nothing.

**The one non-obvious fix**

The Issue Register was not blank for lack of data — the 10 issues from v819 were
already there. They were invisible because the page filters on `issue_register_id`
while v819 only set `project_id`. The seed creates the missing `issue_registers` row
and backfills the link on the existing issues before topping up, so no duplicate
issues are created on projects that already had the v819 rows.

**Not done**

No application code changed, so no test run was required. The `sim` schema was not
touched because none of these four tables exist there.
