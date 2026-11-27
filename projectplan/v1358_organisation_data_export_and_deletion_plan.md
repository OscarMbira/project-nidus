# v1358 — Organisation data export and deletion — Implementation plan

**PRD:** `projectprd/v1358_organisation_data_export_and_deletion_PRD.md` (owner decisions D1–D16, 2026-11-27).
**Systems:** Platform and Planner edition (`public`); Admin (`E:\project-nidus-admin`). Simulator excluded (D9).
**Method:** test-first vertical slices (App_Guide), one per D16 step; each slice builds, tests pass with no new
failures (suites run one at a time), is committed, and the owner runs its SQL and checks in the browser before the
next starts. SQL numbers are taken from `ls SQL` immediately before each file (rule 18.0), in each repo.

## Facts this plan builds on

- `public.organisation_data_footprint(account_id)` (SQL v1597): tables linked to an account directly or through its
  projects, with row counts.
- v1108 per-person privacy: `gdpr_export_registry`, `data_export_requests` / `data_deletion_requests` (user level),
  Platform Data Management page (`pmo-admin/data-management`) and Privacy Center.
- v1352 background jobs: catalogue + `background_job_register`, queue with back-off, `queue_email`, `bj_notice`,
  `retention_targets`, `storage.cleanup`, worker adapter (`storageRemove`, `invokeFunction`).
- v1356: API keys, SCIM tokens, webhooks, SSO connections per organisation (gateway checks the organisation).
- Ownership: `transferAccountOwnership` (v734) — owner only. `accounts.is_deleted` only; no lock state.
- Our billing: `payment_transactions`, `platform_subscriptions`. Customer billing (v1353) `client_*` tables.
- Audit / security logs: `audit_log`, `data_access_logs`, `security_events` (retention targets off until legal
  confirms, v1352).

## Data model (`public`; RLS on; registered in `database_tables`; Planner wall re-run)

| Table / change | Slice | Purpose |
|---|---|---|
| `organisation_data_requests` | 1 | Request: reference (display ID), account, kind export / deletion, status, requested by, on behalf of (admin), reason, timestamps, export file path, expires at, error |
| `organisation_data_table_rules` | 1 | Per-table rules (replaces the planned kept list): in the export or not, delete or keep with reason and period (D6, D7), allowed columns, extra scope (people) |
| `accounts` lifecycle columns | 2 / 3 | `legal_hold`, `legal_hold_reason`, `locked_at`, `lock_reason`, `deletion_due_at` |
| `organisation_deletion_records` | 3 | Kept after deletion: reference, organisation name, requester / approver / confirmer, dates, tables + row counts deleted, kept tables + reasons, certificate path |

Admin SQL: ID generation rules for the two reference columns (rule 16.2); permissions
`organisations.data.view|approve|hold|transfer`; audited `public.admin_organisation_data_*` RPCs; narrow exception in
both CLAUDE.md files (rule 34.5).

## Slice 1 — Organisation export (D2, D3, D4)

Tests first: footprint + kept list cover every organisation table (no table unaccounted for); ZIP contents (CSV +
JSON per table, files, dictionary, display IDs); owner-only request; 7-day expiry.
- [x] SQL: `organisation_data_requests`, `organisation_data_table_rules` (seeded), scope / plan / page RPCs, owner
      request / list RPCs, private bucket `organisation-exports` + owner read policy, registry, display-ID trigger.
      (`SQL/v1600`, tests `SQL/v1601`, Admin `SQL/v264`)
- [x] Job `organisation.export_build` (handler): streams each table to CSV + JSON, copies referenced Storage files,
      writes the read-me / dictionary, uploads the ZIP, resumes if a run stops; owner notice + email (no link).
- [x] Expired exports removed after 7 days: job `organisation.export_expire` (also fails builds stalled 24 hours).
- [x] Pages: Platform (Account › Data export, `/platform/organisation/data-export`) and Planner (Settings › Data
      export, `/app/settings/data`): request export, list with status, download per part; success modal; menu
      catalogue + grants + placement + taxonomy (rules 70, 75). No input fields, so no field help; not a record
      form, so no Audit tab.
- [x] Admin: moved to Slice 2, which builds the Admin requests list (one list for exports and deletions).
- [ ] Exit: builds, tests (done); owner SQL + a real export downloaded and opened.

## Slice 2 — Admin tools (D13, D14)

- [ ] SQL: legal hold columns + RPCs; Admin ownership transfer RPC (to an existing PMO Admin; emails both owners).
- [ ] Admin pages: Organisation data requests (list + detail), legal hold place / lift, transfer ownership — reason
      required, audited, field help (Admin rule 23).
- [ ] Exit as slice 1.

## Slice 3 — Deletion (D1, D5–D12, D15)

Tests first: approval refused under legal hold; confirmation link 7 days + day-5 reminder + lapse; lock blocks sign-in,
API keys, SCIM, webhooks and jobs; cancel restores; day-30 deletion removes every in-scope row of a test organisation
and leaves another untouched; kept tables keep rows; member rules (D8); certificate contents.
- [ ] SQL: deletion request flow (request, admin approve / reject / open on behalf, owner confirm token, cancel),
      lock columns, `organisation_deletion_records`, deletion in dependency order in batches.
- [ ] Lock enforcement: organisation route guard (Platform, Planner), API gateway / SCIM / webhook delivery (v1356),
      background jobs skip locked organisations; subscription cancelled at lock (D10).
- [ ] Job `organisation.deletion_lifecycle` (daily, UTC): reminders, lapse, final export at lock, day-30 deletion,
      member clean-up (D8), certificate PDF + email (D15); kept audit / security logs to a 7-year retention target.
- [ ] Pages: owner request / confirm / cancel (Platform, Planner); Admin approve / reject / cancel / record view.
- [ ] Guide `Documentation/Organisation_Data_Export_and_Deletion_v1358_Guide.md`; ROADMAP status; exit.

## Risks

| Risk | Mitigation |
|---|---|
| Deleting another organisation’s data | Scope from the footprint by account; isolation test with two organisations; dependency-ordered deletes with counts checked |
| A table missed by deletion or export | Footprint + kept list must account for every table; unaccounted tables fail the job and alert Admin |
| Stolen owner login exports everything | Owner only, sign-in to download, no link in email, 7-day expiry, audit (accepted risk, D2) |
| Mistaken or malicious deletion | Admin approval + owner email confirmation + 30-day lock with cancel + legal hold |
| Large organisations exceed edge limits | Streamed per table, batched, resumable runs on the v1352 queue |
| Locked organisation still reachable by API / SCIM | Lock checked in the gateway, SCIM and webhook delivery; tested |

## Review

### Slice 1 review (2026-11-27) — code complete, SQL run and worker redeployed by the owner (2026-11-27)

**Run order (owner):**

| # | Repo | Step | Status |
|---|---|---|---|
| 0 | — | Redeploy `background-job-worker` (`--no-verify-jwt`): new handlers `organisation.export_build`, `organisation.export_expire`; adapter gained `storageDownload` / `storageUpload` | done 2026-11-27 |
| 1 | monorepo | `SQL/v1600_organisation_data_export.sql` (ends with a read-only check: tables in scope, menus, jobs) | done 2026-11-27 |
| 2 | Admin | `SQL/v264_organisation_data_requests_id_generation_seed.sql` | done 2026-11-27 |
| 3 | monorepo | `SQL/v1251_planner_table_wall.sql` (re-run; two new tables) | done 2026-11-27 |
| 4 | monorepo | `SQL/v1601_organisation_data_export_tests.sql` (rolls back; expect "v1601: all organisation export tests passed (rolling back)") | done 2026-11-27 |

**Built:** scope from the database catalogue (account / organisation / project columns, foreign-key children up
to three levels, rule scopes; `users` never a parent); per-table rules (`organisation_data_table_rules`); export
plan stored on the request so resumed runs use the same plan; worker builds ZIP parts (~40 MB, stored, own ZIP
writer — no library) with README, dictionary, CSV + JSON per table (large tables split), uploaded files; checkpoint
after each part, continuation when the 100-second budget is used; owner notice + email without a link; 7-day
expiry; owner-only download policy on the private bucket; shared page in Platform and Planner.

**Decisions made while building (owner may change):**
- Large exports come as several ZIP parts (about 40 MB each) instead of one ZIP, so the worker stays inside the
  edge memory and the 50 MB upload limit. Files over 45 MB are listed in `files-not-included.csv`.
- People export only name, email, job title, active flag and created date (`users` rule); secret-looking columns
  (hash, secret, token, password, encrypted, salt, otp) are never exported.
- CSV text starting with = + - @ gets a leading apostrophe (spreadsheet formula safety).
- The Admin read-only list moved to Slice 2 (one list for exports and deletions).

**Tests:** worker Vitest `v1358OrganisationExport.test.js` 12/12; screen test `OrganisationDataExportPage.test.jsx`
4/4; `check-background-jobs` passes; SQL tests E1–E7 written (owner runs).

**Known gaps / notes:** the Planner table allow-list is already stale from other work (API, SCIM, billing
tables) — not changed by this slice, which uses RPCs only. Tables linked more than three foreign keys away
from the organisation are not exported; E1 prints the count found.
