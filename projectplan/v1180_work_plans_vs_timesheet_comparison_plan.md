# v1180 — Work Plans vs Timesheet Comparison: Implementation Plan

PRD: `projectprd/v1180_work_plans_vs_timesheet_comparison_PRD.md`
Scope: Platform + Simulator (parity per rule 34.1/34.3), `public` schema only (Simulator reuses
the same Timesheet tables/pattern already established this session — not a `sim`-schema build).

**Do not begin implementation until this plan is approved.**

---

## Phase 0 — Facts already confirmed (no further research needed)

- `projects` has no billing-type column today (new column needed).
- `timesheet_entries.task_id` is a bare UUID with no FK (noted as a gap to fix for the new
  `project_work_plan_items.task_id`, not retroactively for `timesheet_entries`).
- Timesheet Settings already has an org-default + project-override pattern
  (`organisation_timesheet_settings` / `project_timesheet_settings`,
  `timesheetSettingsService.js`) — Work Plan cadence reuses this exact mechanism.
- `timesheet_work_categories` lookup table already exists and will be reused as-is for Work
  Plan items' optional Category field.
- The `userCanManageProjectTimesheetSettings` role-check bug (legacy `project_manager_user_id`
  column vs `user_roles` project-scoped assignment) was just fixed in v1178 — the new Work Plan
  approval-authority check will be built on the corrected pattern from day one, extended with
  `team_manager`/`lead` role names.

---

## Phase 1 — SQL: schema, lookups, settings, RLS, registration

- [ ] `SQL/v1180_project_billing_type.sql`
  - `ALTER TABLE public.projects ADD COLUMN billing_type VARCHAR(20)` with
    `CHECK (billing_type IS NULL OR billing_type IN ('time_and_material', 'fixed_price'))`.
  - `NOTIFY pgrst, 'reload schema';`
- [ ] `SQL/v1181_work_plan_status_lookup.sql`
  - `work_plan_item_statuses` table (`code, name, description, sort_order, is_active`) +
    `database_tables` registration.
  - Seed: `not_started`, `in_progress`, `completed`, `blocked`, `carried_forward`.
- [ ] `SQL/v1182_work_plan_settings.sql`
  - Add `work_plan_period_type VARCHAR(10) DEFAULT 'weekly' CHECK (... IN ('weekly','monthly'))`
    to `organisation_timesheet_settings` and `project_timesheet_settings` (both already exist —
    this is an additive column on each, not a new settings table).
  - Extend `resolveTimesheetSettings`'s merge shape (service-layer change, Phase 2) to carry it.
- [ ] `SQL/v1183_project_work_plans.sql`
  - `project_work_plans` (header): `id, project_id, user_id, period_type, period_start_date,
    period_end_date, status ('draft'|'submitted'|'approved'|'rejected'), submitted_at,
    reviewed_by, reviewed_at, review_notes, created_at, updated_at, is_deleted`.
  - Unique constraint on `(project_id, user_id, period_start_date)` — one plan per person per
    period.
  - RLS: owner can see/edit own rows (draft/rejected only for writes); PM/PMO/Team
    Manager/Lead/Programme Manager can see all rows for their project — mirror
    `timesheet_entries`' RLS shape, using `get_user_id_from_auth()`, never raw `auth.uid()`
    comparisons (the v1172 bug class).
  - `database_tables` registration.
  - Mirror table in `sim` schema is **not** created — Simulator reuses the `public` tables via
    the same `platformDb` client pattern already used by its Timesheet pages (confirmed
    precedent: Simulator's `MyTimesheetsPage.jsx`/`OvertimeGrid.jsx`/`timesheetSettingsService.js`
    all import `platformDb`, not `simDb`, despite living in `apps/simulator`).
- [ ] `SQL/v1184_project_work_plan_items.sql`
  - `project_work_plan_items`: `id, work_plan_id (FK project_work_plans), sort_order, details
    (text, required), status_code (FK work_plan_item_statuses), target_completion_pct
    (0-100, nullable), planned_start_date, planned_end_date, role_code (nullable, free text or
    FK to project_roles — decide exact FK during implementation based on how `project_roles` is
    keyed per-project), task_id (FK tasks, nullable), work_category (FK
    timesheet_work_categories, nullable), estimated_hours (numeric, nullable), remark (text),
    created_at, updated_at, is_deleted`.
  - RLS inherited via `work_plan_id` join to `project_work_plans` (same pattern as how
    `timesheet_entry_edit_history` inherits from `timesheet_entries`, v1177).
  - `database_tables` registration.
- [ ] `SQL/v1185_work_plan_review_history.sql`
  - `project_work_plan_reviews` (append-only decision log) — same shape as
    `timesheet_entry_reviews`: `id, work_plan_id, reviewer_id, decision, reason_ids/notes,
    decided_at`. Mandatory-justification enforced at the service layer (same pattern as
    `approveTimesheetEntry`/`rejectTimesheetEntry`).
- [ ] Seed/demo data companion file(s) per rule 18.2 — **only if** the user wants seeded demo
  Work Plans; otherwise skip (rule 12: no sample data unless requested). Flag this as a question
  before writing seed SQL.

---

## Phase 2 — Service layer

- [ ] `apps/platform/src/services/projectWorkPlanService.js` (new)
  - `getWorkPlan(projectId, userId, periodStart)`, `getWorkPlanItems(workPlanId)`,
    `upsertWorkPlan(...)`, `createWorkPlanItem`, `updateWorkPlanItem`, `deleteWorkPlanItem`,
    `submitWorkPlan` (enforces ≥1 item), `approveWorkPlan`/`rejectWorkPlan` (mandatory
    justification, same shape as `approveTimesheetEntry`/`rejectTimesheetEntry`).
  - `userCanManageWorkPlanApprovals(projectId, accountId)` — extends the corrected
    `userCanManageProjectTimesheetSettings` pattern (v1178) with `team_manager`/`lead` role
    names in addition to `project_manager`/`programme_manager`, plus the PMO/owner fallback.
  - `getCarryForwardCandidates(previousWorkPlanId)` — pure-ish helper returning items from the
    prior period where `status_code != 'completed'`, for the opt-in carry-forward UI.
  - `matchWorkPlanItemToTimesheetEntries(item, timesheetEntries)` — pure function, two-tier
    match (task_id → work_category → unmatched), unit-testable with no DB mocking.
  - `computeWorkPlanVariance(items, timesheetEntries)` — pure function: planned hours (sum of
    `estimated_hours`), actual hours (sum of matched entries' `hours_worked`), variance
    amount/%, and per-item coverage flags.
- [ ] Extend `timesheetSettingsService.js`'s resolve/merge functions to carry
  `work_plan_period_type` (additive field in the existing merge shape, same file).
- [ ] `apps/platform/src/services/billingTypeService.js` (new, small) or fold into
  `projectService.js` — `getProjectBillingType`/`updateProjectBillingType`.
- [ ] Mirror every file above into `apps/simulator/src/services/` verbatim (same `platformDb`
  import pattern already established for this component family).

---

## Phase 3 — UI: Work Plan tab (self-service)

- [ ] `apps/platform/src/components/timesheets/WorkPlanGrid.jsx` (new) — follows the exact
  structural pattern of `OvertimeGrid.jsx`/`WeeklyTimesheetGrid.jsx` (table-fixed + colgroup,
  per-row draft state, `canEditCell`/`StatusBadge` reuse, blur-to-save).
  - Columns: SN (row number) / Details / Status / % Target Completion / Start / End / Role /
    Task (optional picker) / Category (optional picker) / Estimated Hours / Remark.
  - Theme-aware (rule 28.1), icon-only row actions where applicable (rule 61).
  - Carry-forward affordance when opening a period with zero items and a prior period exists.
  - Submit button disabled until ≥1 item exists (mirrors `draftEntryCount`-gated Submit Week).
- [ ] Add "Work Plan" as a third tab in `WeeklyTimesheetGrid.jsx`'s existing
  `gridTab` state (`'standard' | 'overtime' | 'work_plan'`), reusing the same tab-bar markup.
  - When `settings.work_plan_period_type === 'monthly'`, the Work Plan tab's own navigator
    collapses to month-only (no week dropdown) — the Standard/Overtime tabs are unaffected
    (they stay weekly regardless of this setting, since Timesheets themselves are always
    weekly).
- [ ] Inline variance/coverage summary on the Work Plan tab — only rendered when the project's
  `billing_type === 'time_and_material'` (hidden entirely otherwise, not just disabled).
- [ ] Mirror `WorkPlanGrid.jsx` and the `WeeklyTimesheetGrid.jsx` tab wiring into
  `apps/simulator/src/components/timesheets/`.

---

## Phase 4 — UI: Team Work Plan view + billing type setting

- [ ] `apps/platform/src/components/timesheets/TeamWorkPlanGrid.jsx` (new) — mirrors
  `TeamWeeklyTimesheetGrid.jsx`'s read/approve pattern: PM/PMO/Team Manager/Lead sees every
  team member's plan for the period, can open each for approve/reject with mandatory
  justification (reuse `AuthorisationRequestModal` or the existing Timesheet review panel
  pattern — `TimesheetReviewPanel.jsx` — whichever fits with less duplication).
- [ ] Add "Work Plan" tab to `TeamTimesheetsPage.jsx` alongside its existing content.
- [ ] Billing Type field on Project Setup → Project Details (or a dedicated small settings
  panel) — simple select: unset / Time & Material / Fixed Price. Theme-aware, uses the shared
  success-confirmation modal (rule 16) on save.
- [ ] Mirror Phase 4 files into Simulator.

---

## Phase 5 — Reporting

- [ ] `apps/platform/src/pages/platform-app/WorkPlanVarianceReport.jsx` (new) — team-wide,
  period-filterable Planned vs Actual hours + coverage flags, alongside the existing
  EVM/Schedule Variance report family under Reports. Only reachable/meaningful for
  Time & Material projects (empty-state messaging otherwise, not a hard block — a PM might
  flip a project to T&M mid-stream and want to check history).
  - Export support (Excel/Word/PowerPoint/CSV/XML/JSON/Print) per rule 38, reusing the existing
    shared export utility — not a new bespoke exporter.
- [ ] Add to `Documentation/Core_PM_and_Industry_Menu_Taxonomy.md` per rule 70 (new report entry
  under the Reports taxonomy), and wire into the Reports sidebar menu (role-gated to
  PMO/PM/Team Manager/Lead) — SQL menu-item migration as part of Phase 1 or a small follow-up
  `SQL/v1186_work_plan_variance_report_menu.sql`.
- [ ] Mirror into Simulator.

---

## Phase 6 — Tests

- [ ] `projectWorkPlanService.test.js` (Platform + Simulator): pure-function tests for
  `matchWorkPlanItemToTimesheetEntries`, `computeWorkPlanVariance`, `getCarryForwardCandidates`;
  mocked-Supabase tests for submit/approve/reject validation (mandatory justification, ≥1 item
  to submit, retroactive-window enforcement) and `userCanManageWorkPlanApprovals` (including the
  "multiple active roles on one project" case already covered for Timesheet Settings, v1178).
- [ ] esbuild syntax-check every new/touched file in both apps.
- [ ] Re-run the full existing `timesheet*.test.js` + `projectService.search.test.js` suites in
  both apps to confirm no regressions (the Work Plan tab touches `WeeklyTimesheetGrid.jsx`,
  already modified repeatedly this session).

---

## Open question before implementation starts

Rule 18.2 says seed data should accompany new tables when the feature is demo-worthy. Do you
want seeded demo Work Plan data (a few sample plans/items, blank display references per the
Admin ID Generation rule — though note: this feature doesn't need Admin ID Generation at all,
since `timesheet_entries` itself has no human-readable display ID and Work Plan items are the
same kind of leaf transactional record), or skip seed data entirely and let real usage populate
it (rule 12 default: no sample data unless requested)?

---

## Review section

**Status: all 6 phases implemented and verified.** Every new/touched file passed esbuild
syntax-check; the full Timesheet + Work Plan test suite (69 tests across 9 files) passes in
both Platform and Simulator with no regressions.

### What was built

- **Phase 1 (SQL):** `v1180`–`v1185` — `projects.billing_type`, `work_plan_item_statuses`
  lookup (+ seed), `work_plan_period_type` on both Timesheet Settings tables,
  `project_work_plans`/`project_work_plan_items`/`project_work_plan_reviews` with RLS built on
  the proven `SECURITY DEFINER + row_security=off` pattern (a new
  `auth_user_can_manage_work_plans()` function, extending the v1086 Team Charter role-set with
  PMO Admin/account-owner and named-PM checks), a seed Work Plan for SEED334-PRJ-08 (6 items
  inspired by the sample sheet, project flipped to Time & Material), and the Reports menu item.
- **Phase 2 (services):** `projectWorkPlanService.js` — full CRUD, submit/approve/reject
  (mandatory justification), `userCanManageWorkPlanApprovals` (PM/Programme Manager/Team
  Lead/Team Manager/PMO Admin — broader than Timesheet Settings' approver set by design), the
  two pure functions (`matchWorkPlanItemToTimesheetEntries`, `computeWorkPlanVariance`),
  carry-forward candidate lookup, and billing-type get/update. `timesheetSettingsService.js`
  extended to carry `work_plan_period_type` through its existing merge shape.
- **Phase 3 (self-service UI):** `WorkPlanGrid.jsx` — a flat per-period item list (not
  day-grouped, since plan items aren't tied to one day), wired as a third "Work Plan" tab on
  `WeeklyTimesheetGrid.jsx` alongside Standard/Overtime. Respects the project's resolved weekly/
  monthly cadence, shows the inline Planned-vs-Actual summary only on Time & Material projects,
  and offers opt-in carry-forward of incomplete items from the prior period.
- **Phase 4 (team view + billing type):** `TeamWorkPlanGrid.jsx` + `WorkPlanReviewPanel.jsx` —
  a self-contained "Work Plan" tab on Team Timesheets, consolidating every member's plan for a
  self-navigated period with Approve/Reject (mandatory justification, no reason catalog — a
  deliberately simpler shape than Timesheets' reason-based review). Billing Type added to
  Project Details (form field + Classification export section + Audit tab).
- **Phase 5 (reporting):** `WorkPlanVarianceReport.jsx` — team-wide, period-navigable variance
  report under Reports, wired through the full `lazyImports.js` → `routeCommon.jsx` →
  `platformRoutes.jsx` chain at `/platform/reports/work-plan-variance`, menu item under the
  existing Reports group, taxonomy doc updated.
- **Phase 6 (tests):** pure-function and service-layer tests added in Phase 2 (12 new tests),
  syntax-checked throughout rather than as a separate pass.

### Scoped parity decisions (not gaps — documented, not silently skipped)

- **Simulator gets the full self-service + team-approval feature** (`WorkPlanGrid.jsx`,
  `TeamWorkPlanGrid.jsx`, `WorkPlanReviewPanel.jsx`, `projectWorkPlanService.js`,
  `WeeklyTimesheetGrid.jsx`, `TeamTimesheetsPage.jsx` — all mirrored verbatim, same `platformDb`
  pattern already established for the rest of the Timesheet family).
- **Billing Type UI on Project Details is Platform-only** — Simulator has no
  `ProjectDetailsPage.jsx`/`projectDetailsService.js` at all (it uses a separate
  `practice_projects` model for its own "Projects" concept); there is nothing to mirror into.
- **The Work Plan Variance Report page is Platform-only** — Simulator has no "Reports" section
  in its menu/routing at all (confirmed zero references to `CostReportPage` or any sibling
  report anywhere in `apps/simulator/src/routes/`), so there's no existing taxonomy slot to add
  this into without inventing a Reports section from scratch, which was out of scope.

### Known follow-ups (not blocking, not yet requested)

- No dedicated React Testing Library component tests for `WorkPlanGrid.jsx`/`TeamWorkPlanGrid.jsx`
  — consistent with every other component in this family (Overtime/Standard grids), which rely
  on syntax-check + service-layer tests + manual verification, since no browser automation tool
  is available in this environment.
- `role_code` on `project_work_plan_items` is free text, not an FK — deliberate per the PRD
  (project role naming varies by org/`project_roles` template), but means no validation against
  the project's actual role list yet.
- ROADMAP.md was not updated — this was a net-new feature with no prior roadmap entry; per rule
  12 of the Standard Workflow, ROADMAP.md is only touched when strategic status/priority
  materially changes, and nothing else on the roadmap was reprioritised by this work.
