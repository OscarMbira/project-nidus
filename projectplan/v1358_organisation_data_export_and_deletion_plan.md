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
| `organisation_data_kept_tables` | 1 | Data-driven kept list: table, reason, keep period (D6, D7) |
| `accounts` lifecycle columns | 2 / 3 | `legal_hold`, `legal_hold_reason`, `locked_at`, `lock_reason`, `deletion_due_at` |
| `organisation_deletion_records` | 3 | Kept after deletion: reference, organisation name, requester / approver / confirmer, dates, tables + row counts deleted, kept tables + reasons, certificate path |

Admin SQL: ID generation rules for the two reference columns (rule 16.2); permissions
`organisations.data.view|approve|hold|transfer`; audited `public.admin_organisation_data_*` RPCs; narrow exception in
both CLAUDE.md files (rule 34.5).

## Slice 1 — Organisation export (D2, D3, D4)

Tests first: footprint + kept list cover every organisation table (no table unaccounted for); ZIP contents (CSV +
JSON per table, files, dictionary, display IDs); owner-only request; 7-day expiry.
- [ ] SQL: `organisation_data_requests`, `organisation_data_kept_tables` (seeded), request / list / download-URL RPCs
      (owner only), private bucket `organisation-exports`, registry, display-ID trigger, Planner wall.
- [ ] Job `organisation.export_build` (handler): streams each table to CSV + JSON, copies referenced Storage files,
      writes the read-me / dictionary, uploads the ZIP, resumes if a run stops; owner notice + email (no link).
- [ ] Expired exports removed after 7 days (retention / storage clean-up).
- [ ] Pages: Platform (Organisation › Data export & deletion, routed) and Planner (Settings): request export, list
      with status, download. Field help, Audit tab, success modal; menu catalogue + placement + taxonomy (rules 70, 75).
- [ ] Admin: export requests visible in a read-only list.
- [ ] Exit: builds, tests; owner SQL + a real export downloaded and opened.

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

(Added after implementation.)
