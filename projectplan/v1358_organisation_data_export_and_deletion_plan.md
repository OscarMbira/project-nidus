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

- [x] SQL: legal hold columns on `accounts`, ownership candidates + transfer (`SQL/v1602`, tests `SQL/v1603`); Admin
      permissions, audited RPCs, sidebar item, field help (`Admin SQL/v265`). Both owners emailed.
- [x] Admin pages: Users & Organisations › Organisation Data Requests (all requests + organisations on hold);
      Organisation detail › Data & compliance (legal hold place / lift, transfer ownership, this organisation’s
      requests) — reason required, audited, field help (Admin rule 23). Organisation detail fixed for light mode
      (rule 28.1) and its back button now returns to the previous page (rule 73).
- [ ] Exit as slice 1 (owner SQL + Admin check).

## Slice 3 — Deletion (D1, D5–D12, D15) — built in two parts: 3a (up to the lock), 3b (day-30 deletion)

Tests first: approval refused under legal hold; confirmation link 7 days + day-5 reminder + lapse; lock blocks sign-in,
API keys, SCIM, webhooks and jobs; cancel restores; day-30 deletion removes every in-scope row of a test organisation
and leaves another untouched; kept tables keep rows; member rules (D8); certificate contents.
- [x] 3a SQL: deletion request flow (request, admin approve / reject / open on behalf, owner confirm token, cancel),
      lock columns (`SQL/v1604`, tests `SQL/v1605`, Admin `SQL/v266`).
- [x] 3b SQL: `organisation_deletion_records`, deletion in dependency order in batches (`SQL/v1606`, tests `SQL/v1607`,
      Admin `SQL/v267`).
- [x] 3a Lock enforcement: app gate (`OrganisationLockGate`) in Platform `ProtectedRoute` and the Planner shell;
      members signed out; API keys revoked, webhooks disabled, SCIM off (switched back on by a cancel); subscription
      cancelled at lock (D10).
- [x] 3a Jobs: `organisation.deletion_lifecycle` (hourly: day-5 reminder with a new link, lapse after 7 days) and
      `organisation.deletion_notify` (worker: confirmation email with the link); final export at lock.
- [x] 3b: day-30 deletion (worker `organisation.deletion_execute`), member clean-up (D8), certificate PDF + email
      (D15); kept audit / security logs.
- [x] 3a Pages: owner request / confirm (emailed link) / cancel on Data export & deletion (Platform, Planner);
      Admin open on behalf / approve / reject / cancel on Organisation detail. Menu label “Data export & deletion”.
- [x] 3b Admin deletion record view and certificate download (Organisation detail › Data & compliance; Organisation
      Data Requests › Deletion records).
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

### Slice 2 review (2026-11-27) — code complete, SQL run by the owner (2026-11-27)

**Run order (owner):**

| # | Repo | Step | Status |
|---|---|---|---|
| 1 | monorepo | `SQL/v1602_organisation_legal_hold_and_owner_transfer.sql` | done 2026-11-27 |
| 2 | Admin | `SQL/v265_organisation_data_admin.sql` (permissions, RPCs, sidebar item, field help) | done 2026-11-27 |
| 3 | monorepo | `SQL/v1603_organisation_legal_hold_and_owner_transfer_tests.sql` (rolls back; expect "v1603: all legal hold and ownership transfer tests passed (rolling back)") | done 2026-11-27 |

No edge function changes. No new tables (columns only), so no Planner wall re-run.

**Built:** legal hold on `accounts` (reason, since, admin); ownership candidates = users with the PMO Admin role who
have a role on one of the organisation’s projects or work in it now (`last_active_account_id`) — PMO Admin is a
global role, so “PMO Admin of the organisation” needs this membership test; transfer repeats the owner’s own
transfer (v734): PMO Admin + Account Owner roles, billing delegates revoked, billing audit row, plus in-app + email
to both owners. Admin: list page (requests newest first — a queue; holds A→Z), detail panel with place / lift hold
and a small transfer dialog (choose a candidate + reason).

**Decisions made while building:** the organisation is not told about a legal hold (holds are usually
confidential); requests are listed newest first rather than A→Z (rule 12.1 exception: it is a work queue — owner may
change); Admin success messages use the Admin toast (Admin has no success modal).

**Tests:** Admin `organisationDataServices.test.js` 4/4; SQL tests H1, T1–T3 written (owner runs).

### Slice 3a review (2026-11-27) — code complete; SQL run and worker redeployed by the owner (2026-11-27)

**Run order (owner):**

| # | Repo | Step | Status |
|---|---|---|---|
| 0 | — | Redeploy `background-job-worker` (`--no-verify-jwt`): new handler `organisation.deletion_notify`. It needs the secret `SITE_URL` (already set for other functions); set `PLANNER_SITE_URL` too if Project Planner runs on its own address | done 2026-11-27 |
| 1 | monorepo | `SQL/v1604_organisation_deletion_request_and_lock.sql` (ends with a dry run of the lifecycle job) | done 2026-11-27 |
| 2 | Admin | `SQL/v266_organisation_deletion_admin.sql` | done 2026-11-27 |
| 3 | monorepo | `SQL/v1605_organisation_deletion_request_and_lock_tests.sql` (rolls back; expect "v1605: all organisation deletion (slice 3a) tests passed (rolling back)") | done 2026-11-27 |

No new tables (columns only), so no Planner wall re-run.

**Built:** owner request with a reason (field help); Admin open on behalf / approve (refused on legal hold) / reject
(owner told, with the reason) / cancel; approval stores only the hash of a 64-character token and queues the email;
the emailed link opens Data export & deletion, which confirms it while signed in as the owner; the lock (30 days):
organisation locked, members signed out (`auth.sessions`) and told, API keys revoked / webhooks disabled / SCIM off
(remembered, so a cancel switches exactly those back on), subscription cancelled, final export queued; hourly
lifecycle: one day-5 reminder with a new link, lapse after 7 days; the app gate keeps everyone but the owner out
(the owner keeps Data export & deletion).

**Decisions made while building:**
- The lock is enforced by an app gate, by signing members out and by switching integrations off — not by changing
  the row-level security helpers (which grant access in many ways, including global PMO access); the data itself is
  deleted 30 days later. A member could still read data through the API with a fresh sign-in during the 30 days.
- The reminder sends a new link and the earlier one stops working (only the hash is kept).
- Admin is not alerted when a customer asks for deletion; pending requests show on Organisation Data Requests.
- SSO connections are left on during the lock, so the owner can still sign in to cancel.

**Tests:** worker `v1358OrganisationDeletion.test.js` 5/5; screens `OrganisationDataExportPage.test.jsx` +
`OrganisationLockGate.test.jsx` 11/11; Admin `organisationDataServices.test.js` 5/5; Admin users module builds;
SQL D1–D6 written (owner runs).

### Slice 3b review (2026-11-27) — code complete; SQL run and worker redeployed by the owner (2026-11-27)

**Run order (owner):**

| # | Repo | Step | Status |
|---|---|---|---|
| 0 | — | Redeploy `background-job-worker` (`--no-verify-jwt`): new handler `organisation.deletion_execute` (and the certificate PDF writer) | done 2026-11-27 |
| 1 | monorepo | `SQL/v1606_organisation_deletion_execute.sql` (ends with a read-only check: tables to delete for the oldest organisation, lifecycle dry run) | done 2026-11-27 |
| 2 | Admin | `SQL/v267_organisation_deletion_records_admin.sql` (ID rule ODL, deletion records, certificate download policy) | done 2026-11-27 |
| 3 | monorepo | `SQL/v1251_planner_table_wall.sql` (re-run; one new table) | done 2026-11-27 |
| 4 | monorepo | `SQL/v1607_organisation_deletion_execute_tests.sql` (rolls back; expect "v1607: all organisation deletion (slice 3b) tests passed (rolling back)") | done 2026-11-27 |

**Built:**
- Hourly `organisation.deletion_lifecycle` now starts day-30 deletions (not on legal hold) and resumes any that stopped,
  or whose legal hold was lifted. `organisation_deletion_begin` writes the deletion record (who asked / approved /
  confirmed, dates, delete order, Storage files, members with "other organisation" and "Simulator record" checks,
  certificate recipients, the organisation's date format and time zone) and queues the worker.
- Delete order from the catalogue: tables in scope minus kept tables, `accounts` and `users`, children before
  parents (foreign keys and scope filters). Self-links and, when a pass is stuck, other nullable links to the rows
  being deleted are cleared. Rows that stay (kept tables, people, the organisation row) are unlinked first; a
  required link from a kept row stops the deletion with a message rather than losing it.
- Worker `organisation.deletion_execute`: Storage files (missing files count as removed; other Storage errors retry),
  then `organisation_deletion_step` in 15-second batches with a saved place, then `organisation_deletion_finish`
  (checks nothing is left — tables with rows back go to the steps again; counts kept rows; D8; organisation row
  anonymised and marked deleted), then the PDF certificate (own PDF writer, no library) stored in the private bucket
  `organisation-deletion-certificates` and emailed to the Account Owner and the requester; their addresses are
  cleared after sending. Continues itself when its time is up; pauses on legal hold.
- D8: a member with no other organisation (owner, project role, last active) and no Simulator record has their
  profile anonymised (it stays, because kept rows point at it) and their sign-in deleted (blocked if it cannot be
  deleted). Others keep their account and are told (in-app + email).
- Admin: Organisation detail shows the deletion record (facts, counts, kept tables, notes, errors, certificate
  download); Organisation Data Requests lists every deletion record with the certificate.

**Decisions made while building:**
- The organisation row and the people's profiles are anonymised, not deleted: our kept billing records and audit logs
  point at them. Status, type and edition columns stay so lists read correctly.
- Internal job tables (queue, runs, markers) are kept, not deleted: the deletion's own queue items live there;
  Housekeeping removes them by age.
- D7's 7-year keep for audit and security logs uses the existing Housekeeping retention targets (already 7 years,
  switched off by default — an owner decision in Housekeeping); nothing new removes them earlier.
- Removed members are not emailed again at deletion (the lock email now says the sign-in is removed when they belong
  to no other organisation).
- A start that fails is noted on the request and retried hourly; the lifecycle run fails (Admin alert) only when
  that undoes nothing else.

**Risks:** a table whose own trigger refuses deletes (for example "approved records cannot be deleted") stops the
deletion with that message; Admin sees it on the record and the queue alert, and the trigger needs an exception.
Tested on a throwaway organisation only (SQL E1–E7); the first real deletion should be watched.

**Tests:** worker `v1358OrganisationDeletionExecute.test.js` 14/14 (worker suite 76/76); Admin
`organisationDataServices.test.js`; SQL E1–E7 written (owner runs).

