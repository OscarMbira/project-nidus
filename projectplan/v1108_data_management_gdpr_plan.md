# v1108 — Data Management (GDPR Compliance Suite) — Implementation Plan

**PRD:** `projectprd/v1108_data_management_gdpr_PRD.md`
**Status:** Approved, implemented, and SQL run (2026-09-26) — all phases complete. Remaining:
manual click-through verification (Phase 8, item 2).

Delivered as vertical slices (rule 17.2). SQL in `E:\project-nidus\SQL\` only (public + sim); no
Admin repo change.

---

## Phase 0 — SQL

- [x] `SQL/v1119_gdpr_rls_and_access_fix.sql` (public schema, fixes all 6 existing v54 tables —
  plan text below undercounted at "5"; data_processing_records also needed the same fix)
  - Replace every `role_name = 'System Admin'` check with `role_name = 'PMO Admin' OR` an
    `accounts.owner_user_id` check (mirroring the access pattern used elsewhere, e.g. rule 53's
    approval surfaces).
  - Replace every `user_id = auth.uid()` comparison with a correct resolution through
    `public.users.auth_user_id` (the established fix pattern for this bug class — likely a
    `SECURITY DEFINER` helper, mirroring `auth_user_can_access_project`/`_account` from
    `SQL/v1016_fix_change_requests_select_rls.sql`'s pattern per the `row_security=off`
    incident history).
  - Verify (do not assume) the 5 tables and their columns still exist exactly as `v54` created
    them — confirm via a live `information_schema` check before writing policy SQL against them.
- [x] `SQL/v1120_gdpr_export_deletion_registry.sql` (public schema, new)
  - New table `gdpr_export_registry`: one row per Tier-1 module (`module_name`, `table_name`,
    `owner_column` — e.g. `created_by`/`owner_user_id`/`assigned_to`, `is_active`). Seeded with the
    confirmed Tier-1 list: Risks, Issues, Changes, Assumptions, Constraints, Daily Logs, Lessons
    Log, Stakeholder/Governance memberships — resolve each module's actual table name(s) and owner
    column(s) by reading the live schema first, not by assumption.
  - Register in `database_tables` per the mandatory rule.
  - RLS: readable by PMO Admin / Account Owner only (it's an internal configuration table, not
    end-user data).
- [x] `SQL/v1121_sim_gdpr_compliance_schema.sql` (sim schema, new — Simulator never had these
  tables at all)
  - Mirrors `v54`'s 5 tables (`consent_logs`, `data_processing_records`, `data_export_requests`,
    `data_deletion_requests`, `privacy_preferences`, `data_breach_records`) into `sim.*`, with RLS
    already fixed to the current role/`auth_user_id` model from the start (no legacy bug to
    inherit).
  - Mirrors the `gdpr_export_registry` table into `sim.practice_gdpr_export_registry`, seeded with
    the `sim` schema's own Tier-1 module table names.
  - Register both in `database_tables`.
- [x] `SQL/v1122_sim_data_management_menu.sql` (sim schema)
  - `menu_items` row for `simulator/admin/data-management` under the existing
    `simulator/admin/*` menu group, plus `role_menu_items` grants for PMO Admin / Account Owner —
    confirm the exact existing menu group/parent code by reading `v682_menu_revamp_simulator_
    hierarchy.sql` first, don't invent a new parent group.
  - Update `Documentation/Core_PM_and_Industry_Menu_Taxonomy.md` in the same change (rule 70).

## Phase 1 — Platform: service layer

- [x] `apps/platform/src/services/gdprService.js` (amend in place)
  - Fix `auth.getUser()`-based `created_by`/audit stamping to resolve the internal `public.users.id`
    (not the raw auth UUID) before writing `created_by`/`updated_by` — same class of fix as the
    RLS fix, applied at the service layer.
  - Replace `generateDataExportFile`'s hardcoded `[userData, projects, tasks, preferences]` fetch
    with a registry-driven fetch: read `gdpr_export_registry`, fetch each active module's rows
    where the owner column matches the requesting user, merge into the export payload alongside
    the existing `users`/`user_projects`/`tasks`/`user_preferences` fetch (kept as the baseline).
  - Replace `anonymizeUserData`'s "users row only" scope with the same registry-driven approach:
    for each active Tier-1 module, update its owner column to the anonymized identity (or a
    documented "Deleted User" sentinel), recording each table touched in `deletion_scope.
    tables_affected`.
  - Keep `recordConsent`/`getConsentHistory`/`requestDataExport`/`requestDataDeletion`/
    `updatePrivacyPreferences`/`getPrivacyPreferences`/`createDataBreachRecord`'s existing shapes —
    only the internals above change.
- [x] Unit tests: registry-driven export (given a stubbed registry + stubbed table rows, correctly
  merges results), registry-driven anonymization (correctly updates owner columns across Tier-1
  tables, leaves inactive registry rows untouched), and the corrected audit-stamping resolution.

## Phase 2 — Platform: Admin dashboard page

- [x] New routed page `apps/platform/src/pages/platform-app/DataManagementAdmin.jsx` at
  `/platform/pmo-admin/data-management`, rebuilt from `pages/admin/GDPRCompliance.jsx`'s content:
  - Stat cards (total consents, pending exports, pending deletions, active breaches) — clickable
    into the matching filtered list per rule 64, since each is a count of individually-identifiable
    records with an expressible filter.
  - Export requests, deletion requests, consent logs, and breach records as sortable Table-List /
    Card toggle lists (rules 40/41/44) with row numbers, search, and export (rule 38) — not the
    plain unsorted tables the old page used.
  - Process-export / process-deletion / log-new-breach actions use the shared success-confirmation
    modal (rule 16), not `alert()`/`confirm()`.
  - Icon-only View/Edit/Delete-equivalent row actions where applicable (rule 61); Process/Log stay
    text-labeled (rule 61's own exclusion for non-CRUD action types).
  - Audit tab on the breach-record create/edit surface (rule 63.1).
  - Access-gated to PMO Admin / Account Owner (mirroring the RLS fix from Phase 0 at the UI layer
    too — redirect/blank state for anyone else).
- [x] `apps/platform/src/pages/platform-app/PMOAdmin.jsx`: Data Management tab's `onClick` changed
  from `setActiveTab('data')` to `navigate('/platform/pmo-admin/data-management')`, matching the
  Users & Roles / Billing pattern already shipped. Remove the now-unused inline stub block and its
  `Database` icon usage there (icon import stays — reused by the new page).

## Phase 3 — Platform: Self-service Privacy Center

- [x] New routed page `apps/platform/src/pages/settings/PrivacyCenter.jsx` (amend the existing
  file in place — it already lives at the right path) at `/platform/settings/privacy`:
  - Consent history + record-new-consent (`ConsentManager.jsx` content).
  - Request data export, see status, download once processed (`DataExportRequest.jsx` content).
  - Request data deletion, see the 30-day grace period countdown, cancel within the window
    (`DataDeletionRequest.jsx` content).
  - Privacy preferences (`PrivacySettings.jsx` content).
  - Success-confirmation modal on every submit/cancel action (rule 16). Dark mode (rule 28.1).
    Audit tab showing the user's own consent/request history timeline (rule 63.1).
- [x] `apps/platform/src/pages/Settings.jsx`: add `{ id: 'privacy', label: 'Privacy', icon: Lock }`
  to the existing `tabs` array, `onClick` navigating to `/platform/settings/privacy` (same
  navigate-away pattern as PMOAdmin's tabs, not an inline embed).

## Phase 4 — Simulator: service layer

- [x] `apps/simulator/src/services/sim/simGdprService.js` (new) — mirrors Phase 1's Platform
  service against `sim.*` tables via `simDb`, registry-driven from day one (no legacy scope to
  migrate away from, unlike Platform).
- [x] Unit tests mirroring Phase 1's Platform tests.

## Phase 5 — Simulator: Admin dashboard page

- [x] New page `apps/simulator/src/pages/simulator/admin/DataManagementAdmin.jsx` (placed in the
  existing `admin/` subfolder alongside SimUserManagement.jsx etc. — plan text above said
  `pages/simulator/`, corrected for consistency with the real folder convention) at
  `simulator/admin/data-management`, same structure as Phase 2's Platform page, against
  `simGdprService.js`, plus `DataBreachRecordForm.jsx` (breach create/edit). Registered in
  `simulatorRoutes.jsx` + `lazyImports.js`, reachable via the `menu_items` row from Phase 0.

## Phase 6 — Simulator: Self-service Privacy Center

- [x] New page `apps/simulator/src/pages/simulator/PrivacyCenter.jsx` at
  `simulator/settings/privacy`, same structure as Phase 3's Platform page, against
  `simGdprService.js`.
- [x] `apps/simulator/src/components/headers/SimulatorAppHeader.jsx`: its existing
  `settingsPath="/simulator/settings"` prop currently points at a route that doesn't exist
  (confirmed dead link — Simulator's `Settings.jsx` is imported but never routed). Repoint it to
  `/simulator/settings/privacy` directly, rather than reviving the full unrelated Settings hub —
  makes an already-present but currently-broken header link work for the first time, without
  expanding scope.

## Phase 7 — Tests, docs, review

- [x] Unit tests from Phases 1 and 4 passing.
- [x] Dev-server compile check of every new/changed file in both apps (rule 35).
- [x] `Documentation/Data_Management_GDPR_v1108_Guide.md` (feature guide + SQL run order + the
  registry-extension pattern for future modules).
- [x] `Documentation/Core_PM_and_Industry_Menu_Taxonomy.md`: checked, no update needed — that
  document's own declared scope is the Generic/Core PM menu and industry packs; the new
  `sim_sys_data_mgmt` item is Simulator platform administration (same category as the existing,
  also-undocumented `sim_sys_user_mgmt`/`sim_sys_leaderboard_admin`/`sim_sys_cert_admin` siblings),
  not a PM capability or industry extension.
- [x] Review section below; `REVIEW.md` checks.

## Phase 8 — User actions after implementation

1. ~~Run `v1119 → v1120 → v1121 → v1122` in Supabase.~~ Done (2026-09-26) — user confirmed all
   pending SQL ran successfully.
2. Manual click-through (both apps, per PRD §e): submit an export request as a regular user,
   process it as PMO Admin, confirm the file's contents cover the Tier-1 modules; submit a
   deletion request, confirm the 30-day grace period and cancel path; process a deletion and
   confirm Tier-1 rows are anonymized, not deleted; log a new breach record. **Not yet done.**

---

## Review section

**Summary of changes:**

- **SQL (not yet run):** `v1119` (RLS/access fix + `account_id` on all 6 `public` GDPR tables),
  `v1120` (`public.gdpr_export_registry` + Tier-1 seed), `v1121` (6 `sim.*` GDPR tables + `sim.
  practice_gdpr_export_registry`, new Simulator capability), `v1122` (Simulator sidebar entry).
- **Platform:** `gdprService.js` rewritten — fixed the `created_by`/`updated_by` raw-auth-uid bug,
  made export/anonymization registry-driven, added `cancelDataDeletionRequest`,
  `updateDataBreachRecord`, `getGdprDashboardData`. New `DataManagementAdmin.jsx` (admin dashboard,
  4 sortable tabs, clickable stat cards) and `DataBreachRecordForm.jsx` (routed create/edit, audit
  tab) reached from `PMOAdmin.jsx`'s Data Management tab. `PrivacyCenter.jsx` (already existed,
  never routed) rewritten to fix its own copy of the same identity bug, use the success modal
  instead of `alert()`/`confirm()`/`prompt()`, and add cancel-deletion. New "Privacy" tab on
  `Settings.jsx`.
- **Simulator:** new `simGdprService.js` (mirrors Platform, handles the mixed
  `auth.users`/`public.users` identity split across sim Tier-1 tables via each registry row's
  `owner_identity_space`). New `pages/simulator/admin/DataManagementAdmin.jsx` +
  `DataBreachRecordForm.jsx` (placed in the existing `admin/` subfolder for consistency with
  `SimUserManagement.jsx` etc., not the path originally written in this plan). New
  `pages/simulator/PrivacyCenter.jsx`. Fixed `SimulatorAppHeader.jsx`'s `settingsPath` prop, which
  pointed at a route that had never existed (`/simulator/settings`) — now points at the new
  Privacy Center directly rather than reviving the unrelated dead `Settings.jsx` hub.
- **Tests:** `gdprService.test.js` (Platform, 5 tests) and `simGdprService.test.js` (Simulator, 4
  tests), both passing.
- **Docs:** `Documentation/Data_Management_GDPR_v1108_Guide.md`.

**Verification performed:**

- Every new/changed file in both apps fetched through its live Vite dev server (5173 Platform,
  5174 Simulator) and checked for `SyntaxError`/unresolved-import errors — 15 files, all clean.
- Full `vitest run` of both new test files plus the pre-existing `organisationIndustryService.
  test.js` and `useMenu.test.js` suites in both apps (to catch any regression from files these
  changes touch indirectly) — 39 Platform tests, 38 Simulator tests, all passing.
- Confirmed no existing test file referenced any of the touched pages/services before this change.

**Facts discovered during implementation that shaped the build (not covered by the original
PRD interview, since they only surfaced once the schema was actually read):**

- `v54` created six tables, not five as the plan initially said — `data_processing_records` needed
  the identical RLS fix and got it in the same `v1119` pass.
- Sim schema tables are internally inconsistent about whether owner/audit columns reference
  `auth.users(id)` or `public.users(id)` — older RAID/Change-management tables (`v232`/`v233`/
  `v794`/`v235`) use `auth.users(id)` uniformly; the newer `sim.assumptions` (`v963b`) and
  `practice_constraints` (`v1104`) use `public.users(id)`. Handled via the registry's
  `owner_identity_space` column rather than assuming one convention.
- Governance body membership was dropped from the Tier-1 list (differs from the PRD's original
  proposed list) — `project_governance_members` stores members by free-text name/email, not a
  `users(id)` FK, so it doesn't fit the registry's owner-column model. Documented in `SQL/v1120`'s
  header comment as a future extension point, not silently omitted.

**Known gaps / deliberately out of scope (per the PRD):**

- Full exhaustive export/deletion coverage beyond the Tier-1 list; automated breach notification;
  automatic scheduled processing of the 30-day deletion grace period.
- Manual click-through (Phase 8, item 2) has not been performed yet.
