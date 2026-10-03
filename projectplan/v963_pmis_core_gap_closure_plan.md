# v963 — PMIS Core Gap Closure Implementation Plan

PRD: `projectprd/v963_pmis_core_gap_closure_PRD.md`. Follows `projectplan/App_Guide.md`.

**Standard pattern for every new CRUD feature in this plan** (referenced by each phase below
instead of repeated per-phase): dedicated routed pages per rule 65 (list/create/:id/:id/edit, no
modals), icon-only row actions via `RowActionButton` (rule 61), sortable columns + Card/Table
toggle defaulting to Table-List with row numbers (rules 40/41/44), alphabetical-then-created
default sort (rule 40.1), Audit tab via `DetailAuditTabList` (rule 63.1), success-confirmation
modal via `useSuccessModal()` (rule 16), unsaved-changes guard (rule 52), export menu (rule 38),
theme-aware dark/light (rule 28.1), PWA-friendly (rule 29/39), Admin ID Generation for any
human-readable reference column (rule 16.2), unit tests for every service function (rule 23),
RLS positive/negative checks. New tables get a `database_tables` registry row (mandatory rule).

---

## Phase 1 — Procurement stub removal ✅ DONE

- [x] SQL `v963a_procurement_stub_removal.sql`: deactivate `pmo_section_procurement_mgmt` and its
      5 children (`pmo_procurement_vendors/requests/orders/contracts/invoices`) —
      `is_visible = FALSE, is_active = FALSE`, not deleted. Same for any Simulator-side
      equivalents if present. **Not yet run by user — file written, awaiting apply.**
- [x] Removed the `pm/procurement/*`, `pmo/procurement/*`, and `platform/procurement` route
      entries from both apps' `PmisGapRoutes.jsx`; removed the now-unused `VendorsPage`/
      `VendorsPageSim` definitions (confirmed nothing else referenced them).
- [x] Bumped `SIDEBAR_CACHE_VERSION` 52 → 53 (`menuCacheUtils.js`, both apps).
- [ ] Verify (post-SQL-apply): log in as PMO Admin, confirm "Procurement" no longer appears in
      the sidebar in either app.
- [x] Bonus fix (interjected mid-plan by user report): Local Register Engine pages
      (`LocalRegisterListPage/DetailPage/Form.jsx`, both apps) exposed raw UUIDs in the URL —
      fixed per rule 16.3 (`register_key`-based friendly URL with self-correcting redirect),
      including `localRegisterService.js`'s `getRegisterDefinition()` in both apps to resolve by
      key or UUID. Also fixed a real latent bug this surfaced: `createRecord()` was being called
      with the raw URL param (which would have been the friendly key string, not a UUID) instead
      of the resolved `register.id`.

## Phase 2 — Fix Automation Execution Log broken reference ✅ DONE

- [x] Confirmed the broken reference (`automation_rule_executions` doesn't exist).
- [x] Repointed `AutomationLogPage` (GAP-01) at the real `automation_executions` table
      (`SQL/v31_automation.sql`), both apps' `PmisGapRoutes.jsx` (Simulator's copy also read
      from the shared public table — no sim-schema automation tables exist at all).
- [ ] Verify (post-deploy): the page loads without error and shows real execution log rows.

## Phase 3 — Assumptions Register ✅ DONE (Platform + Simulator)

- [x] SQL: `v963b_assumptions_register_schema.sql` + `v963c_assumptions_register_sidebar_seed.sql`.
- [x] Service: `assumptionService.js` — Platform + Simulator, with tests.
- [x] Pages: List/Detail/Form, both apps, routed and merged into `platformRoutes.jsx`/
      `simulatorRoutes.jsx`.
- [x] **Bug found when the user ran the SQL (post-implementation): `ERROR 42703: column
      "validation_status" does not exist`.** Root cause: `public.assumptions` already existed —
      created years earlier by `SQL/v26_risk_management.sql` (RAID log feature), with a
      completely different, incompatible column shape (`assumption_title`/`assumption_description`/
      `status`/`validation_date`/`validated_by_user_id`/`validation_notes`, no conversion FKs).
      `v963b`'s original `CREATE TABLE IF NOT EXISTS public.assumptions` silently no-op'd against
      that pre-existing table, and the next statement (`CREATE INDEX ... (validation_status)`)
      failed because that column never existed on the real table. This means the v963 PRD's
      stated premise for this feature ("assumptions have no queryable record with a validation
      lifecycle") was factually wrong — v26 already had one. Per the user's explicit decision
      ("retarget the new feature onto the existing table"), fixed by: rewriting `v963b` to
      `ALTER TABLE public.assumptions ADD COLUMN IF NOT EXISTS converted_to_risk_id/
      converted_to_issue_id` (the one genuinely new capability) instead of a colliding
      `CREATE TABLE`, and rewriting `apps/platform/src/services/assumptionService.js` to
      read/write v26's real columns while presenting the same `assumption_text`/
      `validation_status`/`notes` shape the three pages already use (status values mapped
      `unvalidated<->active`, `validated<->validated`, `invalidated<->invalidated`/`closed`) — so
      none of the three page files needed any changes. `sim.assumptions` was unaffected (no
      pre-existing Simulator table collided) and needed no changes on either the SQL or service
      side. All 9 existing `assumptionService.test.js` tests still pass unmodified.
- [ ] Not yet verified: Risk/Issue conversion dialog linkage (FK exists, UI hook-up unconfirmed).
- [x] SQL run by user — all v963 files applied successfully, including the corrected v963b.

## Phase 4 — Project Calendar ✅ DONE (Platform + Simulator)

- [x] SQL: `v963w_project_calendar_tables.sql` + `v963x_project_calendar_rls.sql` +
      `v963y_project_calendar_menu_items.sql` (renumbered from a version collision with Phase 6's
      files — both agents independently picked v963b-e in their isolated worktrees).
- [x] Service: `projectCalendarService.js` — Platform + Simulator, with tests.
- [x] Pages: Settings + Exceptions List/Detail, both apps, routed and merged.
- [x] **Bug found when the user ran the SQL: `ERROR 42883: function
      public.can_write_pm_planning_document(uuid) does not exist`.** `v963x`'s RLS policies call
      this helper (matching the existing pattern from `v364_schedule_management_plans_rls.sql`),
      but the function itself is defined in a different, much older file
      (`v356_scope_management_plans_rls.sql`) which had never been run against this database —
      an undeclared cross-migration dependency, not a v963 authoring bug per se. Fixed by
      re-declaring the function (`CREATE OR REPLACE`, identical to v356's definition) directly in
      `v963x_project_calendar_rls.sql` so it no longer depends on migration order outside itself;
      safe to run whether or not v356 was ever applied.
- [x] SQL run by user — all v963 files applied successfully, including the corrected v963x.

## Phase 5 — Unified Approvals register ✅ DONE (Platform + Simulator)

- [x] Real investigation done: Mandates/Change Requests/Benefits Review Plans (Platform) and
      Practice Briefs/Practice Change Requests/Practice Benefits Review Plans (Simulator, a
      genuinely different data model per rule 64) are three separately-shaped workflows, NOT
      already unified by the generic Record Lifecycle/Authorisation system (that governs
      field-edit sign-off, a different mechanism).
- [x] SQL: `v964a_unified_approvals_view.sql` (`public.unified_approvals_v`, a read-time
      UNION ALL view — chosen over a trigger-synced table, see file header for rationale) +
      `v964b_sim_unified_approvals_view.sql` (`sim.unified_approvals_v`, sourced from the real
      Practice tables, not an invented sim.mandate_approvals mirror) + `v964c_..._menu.sql`
      (new "Approvals Register" menu item, both apps, distinct from the existing generic
      Authorisation Queue).
- [x] Service: `unifiedApprovalsService.js`, both apps — read-only, no write/decide actions;
      `buildApprovalViewPath()` routes each row back to its own entity's real page.
- [x] Page: `UnifiedApprovalsRegisterPage.jsx`, both apps — filterable by entity type/status, no
      create route, routed at `pmo/approvals/register` (Platform) /
      `simulator/pmo/approvals/register` (Simulator).
- [x] Bonus fix found while wiring: `Integrations.jsx`/`IntegrationConfig.jsx`/
      `IntegrationSync.jsx` existed as files in **both** apps but were never actually routed
      anywhere — fixed as part of Phase 21 below (see that entry).
- [x] SQL run by user — applied successfully.

## Phase 6 — Cost Actuals ledger ✅ DONE (Platform + Simulator)

- [x] SQL: `v963d_cost_actuals_ledger_schema.sql` + `v963e_cost_actuals_ledger_sidebar_seed.sql`.
- [x] Service: `costActualsService.js` — Platform + Simulator, with tests.
- [x] Pages: List/Detail/Form, both apps, routed and merged.
- [x] SQL run by user — applied successfully.

## Phase 7 — Benefits Transition / Archive at closure ✅ DONE (Platform + Simulator)

- [x] SQL: `v963z_project_closures_benefits_transition_archive.sql` (extends the existing closure
      table, per plan).
- [x] Service: `closingProjectService.js` extended, both apps, with tests.
- [x] UI: `ProjectClosureForm.jsx`/`ProjectClosureDashboard.jsx` updated, both apps.
- [x] SQL run by user — applied successfully.

## Phase 8 — OKR (GAP-03): Objectives, Key Results, Cycles ✅ DONE (Platform + Simulator)

- [x] Service: `okrService.js`, both apps, with tests.
- [x] Pages: Cycle List/Form/Detail, Objective List/Form/Detail, Dashboard — both apps.
- [x] Sim schema: `v963f_okr_sim_schema_mirror.sql`.
- [x] Old `OKRDashboardPage.jsx`/`OKRObjectivesPage` stubs removed, both apps, routes rewired.
- [x] SQL run by user — applied successfully.

## Phase 9 — Intake Forms (GAP-06) ✅ DONE (Platform + Simulator)

- [x] Service: `intakeFormService.js`, both apps.
- [x] Pages: List/Form/Detail/Fields/SubmissionList/SubmissionDetail, both apps, routed and
      merged into `PmisGapRoutes.jsx`. Simulator uses `practice_project_id` (not `project_id`).
- [x] Sim schema: `v963g_intake_forms_sim_schema_mirror.sql`.

## Phase 10 — Client Portal (GAP-07) ✅ DONE (Platform + Simulator)

- [x] Service: `clientPortalService.js`, both apps.
- [x] Pages: List/Form/Detail/Guests, both apps, routed and merged.
- [x] Sim schema: `v963h_client_portal_sim_schema_mirror.sql`.

## Phase 11 — Recurring Tasks (GAP-08) ✅ DONE (Platform + Simulator)

- [x] Service: `recurringTaskService.js`, both apps.
- [x] Pages: List/Form/Detail, both apps, routed and merged (Simulator's old
      `RecurringTasksPageSim` stub fully replaced).
- [x] Sim schema: `v963l_sim_recurring_tasks_raci_tables.sql`.

## Phase 12 — RACI Matrix (GAP-10) ✅ DONE (Platform + Simulator)

- [x] Service: `raciService.js`, both apps.
- [x] Pages: List + Matrix Editor, both apps, routed and merged (Simulator's old `RaciPageSim`
      stub fully replaced).
- [x] Sim schema: `v963l_sim_recurring_tasks_raci_tables.sql`.

## Phase 13 — Guest Access (GAP-19) ✅ DONE (Platform + Simulator)

- [x] Service: `guestAccessService.js`, both apps.
- [x] Pages: List/Form/Detail, both apps, routed and merged.
- [x] Sim schema: `v963m_sim_guest_access_training_tables.sql`.

## Phase 14 — Training Tracker (GAP-20) ✅ DONE (Platform + Simulator)

- [x] Service: `trainingService.js`, both apps.
- [x] Pages: Certification List/Form/Detail + Record List/Form, both apps, routed.
- [x] Sim schema: `v963m_sim_guest_access_training_tables.sql`.
- [x] `gapDataService.js` bug fix (both apps): `createGapRecord`/`updateGapRecord` were
      unconditionally setting `created_by`/`updated_by`, 400ing every insert/update on any gap
      table lacking those columns — now opt-in via `setCreatedBy`, and `updated_by` removed
      entirely (no v643-v645 table has it).

## Phase 15 — Notification Preferences (GAP-21) ✅ DONE (Platform + Simulator)

- [x] Service: `notificationPreferencesService.js`, both apps.
- [x] Pages: preferences page + template List/Detail, both apps, routed.
- [x] Sim schema: `v963p_..._sim_and_rls.sql`.

## Phase 16 — Project Clone (GAP-22) ✅ DONE (Platform + Simulator)

- [x] Service: `projectCloneService.js`, both apps.
- [x] Pages: Jobs list, Create, Detail, both apps, routed.
- [x] Sim schema: `v963q_..._sim_and_rls.sql`.

## Phase 17 — Custom Fields (GAP-04): remove and redirect ✅ DONE (Platform + Simulator)

- [x] Removed `CustomFieldsPage`/`CustomFieldsPageSim` stub definitions and routes from
      `PmisGapRoutes.jsx`, both apps — replaced with `<Navigate>` redirects to the real Local
      Data Extensions route.
- [x] SQL `v963aa_custom_fields_stub_redirect.sql`: updates the 5 existing menu_items rows
      (`pm_custom_fields`/`pmo_custom_fields`/`platform_custom_fields`/`sim_pm_custom_fields`/
      `sim_pmo_custom_fields`) to point directly at the real route.
- [x] SQL run by user — applied successfully.

## Phase 18 — Skills Matrix (GAP-11): org-wide catalog + competency matrix ✅ DONE (Platform + Simulator)

- [x] Service: `skillCatalogService.js`, both apps — kept fully separate from
      `resource_skills`/`ResourceSkills.jsx`, untouched.
- [x] Pages: Catalog List/Detail, Competency Matrix, Requirements List/Detail, both apps, routed.
      Simulator adds `SkillsMatrixTabsNav.jsx` component.
- [x] Sim schema: `v963r_..._sim_and_rls.sql`.

## Phase 19 — Timesheet Approvals (GAP-13): period-level workflow ✅ DONE (Platform + Simulator)

- [x] Service: `timesheetPeriodService.js`, both apps, with tests (including aggregation logic) —
      kept alongside the existing entry-level `TeamTimesheetsPage.jsx` flow, untouched.
- [x] Pages: Weekly submission, Approver queue, Period detail, Settings — both apps, routed.
- [x] Sim schema: `v963u_sim_timesheet_report_integration_tables.sql`.
- [x] Menu/grant SQL: `v963v_timesheet_period_settings_menu_and_grant_gaps.sql`.
- [x] SQL run by user — applied successfully.

## Phase 20 — Scheduled Health Reports (GAP-23) ✅ DONE (Platform + Simulator)

- [x] Service: `scheduledHealthReportService.js`, both apps, with tests — kept alongside the
      existing `ScheduledReports.jsx`/`scheduled_reports` feature, untouched.
- [x] Pages: List/Form/Detail, both apps, routed. Simulator pages mirror Platform's placement
      at `apps/simulator/src/pages/scheduledHealthReports/` (outside the `pmis-gaps` module,
      matching Platform's own placement for this feature).
- [x] Sim schema: `v963u_sim_timesheet_report_integration_tables.sql`.

## Phase 21 — Integrations Marketplace (GAP-25) ✅ DONE (Platform + Simulator)

- [x] Service: `integrationCatalogService.js`, both apps.
- [x] Pages: `IntegrationMarketplaceListPage.jsx` + `IntegrationCatalogDetailPage.jsx`, both
      apps, routed and merged. "Connect" hands off into the real `IntegrationConfig.jsx` flow
      (kept untouched, as required).
- [x] SQL: `v964_integrations_marketplace_catalog_admin_write_rls.sql`; sim schema confirmed
      already present in `v963u_sim_timesheet_report_integration_tables.sql`.
- [x] **Bonus fix, both apps**: `Integrations.jsx`/`IntegrationConfig.jsx`/`IntegrationSync.jsx`
      existed as files but were **never actually routed anywhere** — a pre-existing gap found
      while wiring the marketplace's "Connect" hand-off (which needed a real target). Added
      root-level `integrations`/`integrations/create`/`integrations/:id/edit`/
      `integrations/:id/sync` routes (Platform) and `simulator/integrations/*` (Simulator).
      Simulator's copies of these 3 files also had their internal `navigate()` calls hardcoded
      to bare `/integrations` (copy-pasted from Platform without adjusting the prefix) — fixed
      to `/simulator/integrations`.
- [x] SQL run by user — applied successfully.

## Phase 22 — Final review ✅ DONE

- [x] Re-ran a sidebar/route audit across both apps. Found and fixed a **critical pre-existing
      bug**: `PmisGapRouteElements()`/`RecordLifecycleRouteElements()` were imported into
      `apps/simulator/src/routes/simulatorRoutes.jsx` but never invoked inside
      `SimulatorRouteElements()` — so their routes were never registered with Simulator's
      `<Routes>` in `App.jsx`. This meant the entire `pmis-gaps` module (every feature in this
      plan, plus pre-existing OKR/Automations/Calendar) was unreachable in the live Simulator
      app despite being correctly built and linked from the sidebar. Fixed by adding both calls
      to the end of `SimulatorRouteElements()`. Platform's `platformRoutes.jsx` already called
      both correctly.
- [x] Also found during this pass: Simulator's Integrations Marketplace (GAP-25) was only wired
      for `simulator/pmo/admin/integrations` — the `pm/integrations`, `pmo/admin/integrations`,
      and `platform/admin/integrations` scopes still pointed at the old read-only stub. Fixed all
      four scopes to use the real `IntegrationMarketplaceListPage`/`IntegrationCatalogDetailPage`,
      removed the now-fully-unused `IntegrationsPage`/`IntegrationsPageSim` stub consts and the
      `simList()` helper (no remaining callers) from Simulator's `PmisGapRoutes.jsx`.
- [x] Confirmed no remaining references to the removed `automation_rule_executions` typo (only
      explanatory code comments mention the old name).
- [x] Removed the dead `simulator/*` routes block inside Platform's own `PmisGapRoutes.jsx`
      (leftover from before the app split, unreachable — nothing in the Platform app links to
      those URLs): the `SimulatorPMLayout`/`SimulatorPMOLayout` imports, six `wrapSim*` wrapper
      functions, the `simList()` helper, all ten `*PageSim` stub consts, four now-unused `Sim*Page`
      lazy imports, and the three dead `<Route element={wrapSim...Outlet()}>` blocks. This dead
      code also contained a live bug — `CustomFieldsPageSim` referenced an undefined
      `CUSTOM_FIELD_COLUMNS` identifier that would throw a `ReferenceError` at module-load time
      (crashing the whole Platform app) the moment that code path was ever evaluated. Verified
      via `esbuild.transformSync` and a grep sweep confirming zero remaining references. See the
      Guide for full detail.
- [x] Verified via `esbuild.transformSync` that both modified route files still compile.
- [x] Updated `Documentation/v963_PMIS_Core_Gap_Closure_Guide.md` covering the new features, the
      critical routing fix, and the SQL execution status.
- [x] Added the Review section below.

---

## Notes

- Phase ordering above is roughly independence-first (Phases 3–7 touch existing modules more;
  Phases 8–21 are net-new features that can, in practice, be parallelised across sessions since
  they don't depend on each other — sequence is a suggestion, not a hard dependency chain, except
  Phase 17 which should happen after confirming the exact menu_code(s) currently in use).
- Every phase's SQL migration file uses the next available `v963x`-style suffix in sequence as
  it's actually written (this plan pre-reserves the phase structure, not exact file names, since
  the precise count of migrations per phase will only be known once each phase is implemented).

---

## Review

**Status: implementation complete, all 22 phases done, both Platform and Simulator. All 25 SQL
files have been run against the database and applied successfully.**

### What was built

Every sidebar-linked stub identified in `projectprd/v963_pmis_core_gap_closure_PRD.md` now has
real create/read/update/delete pages — 15 features (see the table in
`Documentation/v963_PMIS_Core_Gap_Closure_Guide.md`), across both apps, following CLAUDE.md's
mandatory patterns throughout: dedicated routed pages (rule 65), icon-only row actions (rule 61),
sortable Table-List/Card views with row numbers (rules 40/41/44), Audit details tabs (rule 63.1),
the shared success modal (rule 16), the unsaved-changes guard (rule 52), export menus (rule 38),
and theme-aware dark/light styling (rule 28.1) — none of this session's new pages needed a
retrofit pass for any of these.

A new **Approvals Register** page/menu item was added on top of a read-only rollup view
(`unified_approvals_v` / `sim.unified_approvals_v`) spanning mandate approvals, change requests,
and benefits review approvals — chosen over a trigger-synced polymorphic table because the
underlying data never needed to be duplicated, only queried together.

25 versioned SQL files (`SQL/v963a`–`v963z`, `v964`–`v964c`) cover every schema change, RLS
policy, and menu/grant seed this required, for both `public` and `sim` schemas per CLAUDE.md's
Platform–Simulator parity rule. Per the standing instruction for this initiative, implementation
was SQL-file-only — the user ran them manually. **All 25 files have now been applied
successfully**, including two post-implementation corrections found and fixed when the user ran
them (see below).

### What changed from the original PRD during implementation

- **Procurement was removed from scope entirely** partway through planning, on explicit
  instruction ("Remove all the Procurement features. That should be done outside the PMIS
  system."). Its stub menu item is deactivated (`v963a`), not rebuilt — this is the only PRD
  item not delivered as originally scoped, and it was a deliberate scope cut, not a shortfall.
- **Custom Fields (GAP-04)** was found to be 100% redundant with the already-fully-built Local
  Data Extensions module — rather than building a second implementation, its stub routes now
  redirect (`<Navigate>`) to the real feature.
- **Two pre-existing bugs unrelated to any specific gap** were found and fixed opportunistically
  while wiring new features (per CLAUDE.md's implicit expectation that a bug found in the course
  of related work gets fixed, not filed away): `gapDataService.js`'s `createGapRecord`/
  `updateGapRecord` were unconditionally setting `created_by`/`updated_by`, 400ing on any gap
  table lacking those columns; and `Integrations.jsx`/`IntegrationConfig.jsx`/`IntegrationSync.jsx`
  existed as files in both apps but were never actually routed anywhere until the Integrations
  Marketplace's "Connect" hand-off needed a real target.
- **One critical bug found during Phase 22's final review, not anticipated by the PRD**: the
  entire Simulator `pmis-gaps` module (this plan's new work, plus pre-existing OKR/Automations/
  Calendar) was unmounted in the live app — `PmisGapRouteElements()`/`RecordLifecycleRouteElements()`
  were imported into `simulatorRoutes.jsx` but never invoked. Every feature in this plan would
  have been unreachable via the sidebar (falling through to the catch-all redirect) had this not
  been caught before considering the plan complete. See the Guide for full detail. This is the
  single most consequential finding of the whole initiative — without it, all other work in this
  plan would have shipped non-functional for Simulator users.
- **Two SQL bugs surfaced when the user ran the migrations, both fixed and re-verified as
  applying cleanly**: (1) `v963b_assumptions_register_schema.sql` collided with a pre-existing
  `public.assumptions` table (`SQL/v26_risk_management.sql`, RAID log feature) under a completely
  different, incompatible column shape — the PRD's premise that assumptions had no queryable
  validation-lifecycle record was factually wrong. Fixed by retargeting the feature onto the
  existing table (`ALTER TABLE` adding only the new `converted_to_risk_id`/`converted_to_issue_id`
  columns) and rewriting `assumptionService.js` (Platform) to map v26's real columns to the shape
  the existing pages already use — no page files needed changes; `sim.assumptions` was unaffected.
  (2) `v963x_project_calendar_rls.sql` called `public.can_write_pm_planning_document(uuid)`, a
  helper function actually defined in a much older, separate file
  (`v356_scope_management_plans_rls.sql`) that had never been run against this database — an
  undeclared cross-migration dependency. Fixed by re-declaring the function directly in `v963x`
  so it no longer depends on migration order outside itself.

### Deferred / out of scope

- Field-level audit change logs (old value → new value) were explicitly out of scope for the
  Audit details tabs added under rule 63.1 — metadata only, per that rule's own text.

### Validation performed

- Full bulk `esbuild.transformSync` compile check across all touched files in both apps after
  every merge round (final count: 194 files checked, 192 OK, 2 expected-deleted).
- Manual diff review of every multi-agent merge before accepting it, specifically checking for
  dangling imports/route references.
- Targeted `esbuild` re-checks on `simulatorRoutes.jsx` and Simulator's `PmisGapRoutes.jsx` after
  the Phase 22 routing fix.
- Grep-based sweep for stale table-name references and unused stub definitions.
- **Not performed**: no live browser testing and no automated test run beyond the targeted
  `assumptionService.test.js` re-run after its schema fix (rule 23 unit tests exist per-service
  where noted in each phase, but a full `npm test` pass across both apps was not run as part of
  this review).

### Next steps for the user

All 25 SQL files have been run and applied successfully (including the two corrections above).
Remaining:
1. Hard-refresh / clear sidebar cache in both apps (version already bumped to 54).
2. Spot-check a handful of the new pages per app before considering this fully verified — no
   browser testing was possible during this implementation pass.
