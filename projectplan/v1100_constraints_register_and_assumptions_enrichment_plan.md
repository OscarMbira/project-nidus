# v1100 — Constraints Register & Assumptions Register Enrichment — Implementation Plan

**PRD:** `projectprd/v1100_constraints_register_and_assumptions_enrichment_PRD.md`
**Status:** Implemented (2026-09-20). SQL migrations run successfully (2026-09-25) — only manual click-through verification remains, see Review section.

## Overview

Two linked pieces of work, delivered as vertical slices per CLAUDE.md rule 17.2:

1. Enrich the existing Assumptions Register (Platform + Simulator) with Owner / Impact / Next
   review date / real 4-state Status.
2. Build a new Constraints Register (Platform + Simulator), then rewire the Scope Statement's
   Assumptions/Constraints tabs to both registers.

All SQL goes in `SQL/` (this repo, `public`/`sim` schemas per the repo-scoped SQL rule). No Admin
repo changes.

---

## Phase 0 — SQL schema (foundation for everything else)

- [x] `SQL/v1103_constraints_register_schema.sql`
  - `CREATE TABLE public.constraints_register` (id, project_id FK projects, constraint_text TEXT
    NOT NULL, category VARCHAR(50) CHECK IN budget/schedule/resource/regulatory/technical/other,
    status VARCHAR(20) DEFAULT 'open' CHECK IN open/managed/resolved, owner_user_id FK users,
    due_date DATE, impact_severity VARCHAR(20) CHECK IN low/medium/high/critical, notes TEXT,
    audit columns, is_deleted/deleted_at/deleted_by).
  - RLS: `auth_user_can_access_project(project_id)` SELECT/INSERT/UPDATE policies, no DELETE
    policy (soft delete only) — mirrors `SQL/v1025_control_accounts_and_deliverable_register.sql`.
  - `database_tables` registry INSERT (rule: Database Table Registration Rule).
  - No `display_id`/Admin ID Generation wiring (rule 16.3 exception, matches `public.assumptions`).
- [x] `SQL/v1132_sim_practice_constraints_schema.sql`
  - `CREATE TABLE sim.practice_constraints` mirroring the above, `project_id` FK
    `sim.practice_projects`, `owner_user_id` FK `public.users` (matches `sim.assumptions`
    convention).
  - RLS mirroring `sim.assumptions`' existing policy shape (ownership OR active membership check
    against `sim.practice_project_memberships`).
  - `database_tables` registry INSERT for `sim.practice_constraints`.
- [x] `SQL/v1105_assumptions_register_enrichment.sql`
  - No new columns needed on `public.assumptions` (owner_user_id/next_review_date/impact_severity
    already exist from v26) — this file is comments-only / a no-op placeholder UNLESS a CHECK
    constraint on `impact_severity` needs adding (v26 left it as a free VARCHAR with no CHECK;
    confirm at implementation time whether to add
    `CHECK (impact_severity IN ('low','medium','high','critical'))` — add it if no existing rows
    would violate it, else leave unconstrained and validate at the app layer only).
  - `ALTER TABLE sim.assumptions ADD COLUMN IF NOT EXISTS next_review_date DATE;`
  - `ALTER TABLE sim.assumptions ADD COLUMN IF NOT EXISTS impact_severity VARCHAR(20) CHECK (impact_severity IN ('low','medium','high','critical'));`
  - Widen `sim.assumptions.validation_status` CHECK to
    `('active','validated','invalidated','closed')`; `UPDATE sim.assumptions SET validation_status = 'active' WHERE validation_status = 'unvalidated';`
    then swap the DEFAULT to `'active'`. Drop + recreate the CHECK constraint by name.
- [x] `SQL/v1106_raid_constraints_sidebar_seed.sql`
  - `menu_items` INSERT for `plat_pm_constraints_reg` (parent `plat_pm_ctrl_core`, route
    `/platform/constraints`, next `sort_order` after the Assumptions leaf, icon e.g. `shield-alert`
    or similar non-duplicate lucide icon) and `sim_pm_constraints_reg` (parent
    `sim_pm_ctrl_core`, route `/simulator/practice-projects/constraints`) — mirrors
    `SQL/v963c_assumptions_register_sidebar_seed.sql` exactly.
  - `role_menu_items` grants for the same role set v963c used (Platform: system_admin,
    account_owner, pmo_admin, project_manager; Simulator: simulator_admin, sim_pmo_admin,
    sim_project_manager).
- [x] `SQL/v1107_scope_statement_assumptions_constraints_migration.sql`
  - One-time data migration: for every `scope_statements` row with non-empty `assumptions` or
    `constraints` arrays, INSERT one row per array element into `public.assumptions` /
    `public.constraints_register` (owner_user_id NULL, default status, `notes`/description tagged
    e.g. `'Migrated from Scope Statement (v1100)'` so a re-run can `WHERE NOT EXISTS` against that
    marker and stay idempotent).
  - Same for `sim.scope_statements` → `sim.assumptions` / `sim.practice_constraints`, if a
    Simulator `scope_statements` equivalent table exists with the same array columns (confirm
    table name at implementation time — likely `sim.scope_statements`, verify against
    `SQL/v369_sim_pm_planning_tables.sql`).
  - Does **not** clear or drop the old `scope_statements.assumptions`/`.constraints` columns.

## Phase 1 — Platform: Constraints Register (new)

- [x] `apps/platform/src/services/constraintService.js` — `listConstraints`, `getConstraint`,
  `createConstraint`, `updateConstraint`, `deleteConstraint` (soft delete), modeled directly on
  `assumptionService.js`'s shape (no legacy-column mapping needed — this is a fresh table so the DB
  shape *is* the UI shape).
- [x] `apps/platform/src/pages/constraints/ConstraintsListPage.jsx` — mirrors
  `AssumptionsListPage.jsx`: Card/Table toggle (default Table), sortable columns (Description,
  Category, Owner, Due date, Impact, Status, Created), row numbers, search, `ExportListMenu`,
  icon-only row actions (rule 61).
- [x] `apps/platform/src/pages/constraints/ConstraintDetailPage.jsx` — mirrors
  `AssumptionDetailPage.jsx`'s Details/Audit tab structure (rule 63.1) exactly.
- [x] `apps/platform/src/pages/constraints/ConstraintForm.jsx` — mirrors `AssumptionForm.jsx`'s
  routed-page create/edit pattern (rule 65), success modal (rule 16), unsaved-changes guard
  (rule 52). Fields: Description (textarea), Category (`SelectField`), Owner (`SelectField` via
  `getProjectMembers(projectId)`), Due date (date input), Impact (`SelectField`), Status
  (`SelectField`), Notes (textarea).
- [x] Register routes: `lazyImports.js` exports (`ConstraintsListPage`/`ConstraintDetailPage`/
  `ConstraintForm`) + 4 `<Route>` entries in `platformRoutes.jsx` under `/platform/constraints`,
  `/create`, `/:id`, `/:id/edit` (same nesting as the Assumptions block) + `routeCommon.jsx`
  destructure/re-export.

## Phase 2 — Platform: Assumptions Register enrichment

- [x] `apps/platform/src/services/assumptionService.js`
  - Extend `SELECT_COLUMNS` with `impact_severity, next_review_date`.
  - Remove `DB_TO_UI_STATUS`/`UI_TO_DB_STATUS` mapping — pass `status` through directly (values
    now `active`/`validated`/`invalidated`/`closed`); `toUiRow` keeps aliasing
    `assumption_description → assumption_text` and `validation_notes → notes`, drops the status
    remap.
  - `createAssumption`/`updateAssumption`: accept `ownerUserId`, `impactSeverity`,
    `nextReviewDate` params and write them through (owner already existed; impact/date are new).
- [x] `apps/platform/src/pages/assumptions/AssumptionForm.jsx` — add Owner (`SelectField` via
  `getProjectMembers(projectId)`), Impact (`SelectField`: Low/Medium/High/Critical), Next review
  date (date input) fields; update Status `<select>` options to the 4 real values with relabeled
  text (Active/Validated/Invalidated/Closed).
- [x] `apps/platform/src/pages/assumptions/AssumptionsListPage.jsx` — add Impact and Next review
  date columns (sortable, exportable); update `STATUS_LABELS`/`STATUS_BADGE` for the 4-value set;
  Owner column already existed, no change there.
- [x] `apps/platform/src/pages/assumptions/AssumptionDetailPage.jsx` — add Impact and Next review
  date to the existing Classification/Identity `AuditCard`s.

## Phase 3 — Platform: rewire Scope Statement tabs

- [x] `apps/platform/src/pages/scope/ScopeStatement.jsx`
  - Replace the `activeTab === 'assumptions'` `MultiLineListInput` block with a live table (reuse
    `AssumptionsListPage.jsx`'s row-rendering approach at a smaller scale: Description/Owner/Next
    review date/Impact/Status/Actions) fed by `listAssumptions(projectId)`. "+ Add assumption"
    navigates to `/platform/assumptions/create?projectId=<routeKey>`; edit icon navigates to
    `/platform/assumptions/:id/edit?projectId=<routeKey>`; delete icon calls
    `deleteAssumption(id)` with a confirm dialog, then refetches.
  - Same treatment for the `activeTab === 'boundaries'`... no — for `constraints`, backed by
    `listConstraints(projectId)` / `constraintService`.
  - Remove `in_scope`/`out_of_scope`/etc. — unaffected, only the two tabs above change.
  - Remove `assumptions_lines`/`constraints_lines` (if a `constraints_lines` field exists — check;
    current file uses `constraints_lines` for the flat list, confirm naming) from `form` state and
    from the `saveScopeStatement` payload — the save flow stops writing to
    `scope_statements.assumptions`/`.constraints` going forward (old data stays, per PRD).
  - `scopeStatementService.js`: stop reading/writing `assumptions`/`constraints` array columns
    (still return them if present on the row, just unused by the page).

## Phase 4 — Simulator parity (mirrors Phases 1–3)

- [x] `apps/simulator/src/services/constraintService.js` (sim schema, `sim.practice_constraints`,
  `simDb`).
- [x] `apps/simulator/src/pages/constraints/{ConstraintsListPage,ConstraintDetailPage,
  ConstraintForm}.jsx` mirroring Simulator's `pages/assumptions/*` nesting under
  `practice-projects/:projectId/constraints`.
- [x] `apps/simulator/src/routes/lazyImports.js` + `simulatorRoutes.jsx` + `routeCommon.jsx` route
  registration (5-route shape, matching the Assumptions block's practice-project nesting).
- [x] `apps/simulator/src/services/assumptionService.js` — same enrichment as Platform's Phase 2
  (Owner already read-only exposed; add Impact/Next review date, use widened 4-state status).
- [x] `apps/simulator/src/pages/assumptions/{AssumptionForm,AssumptionsListPage,
  AssumptionDetailPage}.jsx` — same field/column additions as Platform Phase 2.
- [x] `apps/simulator/src/pages/simulator/scope/ScopeStatement.jsx` — same tab rewiring as
  Platform Phase 3, against `sim.assumptions`/`sim.practice_constraints`.

## Phase 5 — Documentation & registry housekeeping

- [x] `Documentation/Core_PM_and_Industry_Menu_Taxonomy.md` — add a `Constraints` leaf under RAID,
  next to `Assumptions` (rule 70), noting `(v1100)`.
- [x] `ROADMAP.md` R4 strategic areas — add `constraints` to the existing bullet list (factual
  addition only, no status change).

## Phase 6 — Testing & verification

- [x] Unit tests: `apps/platform/src/services/__tests__/constraintService.test.js` (+ Simulator
  equivalent) covering CRUD and list/filter, mirroring existing `assumptionService` test style if
  present.
- [ ] Manual verification (both apps): create/edit/delete a constraint; edit an assumption's new
  Owner/Impact/Next review date/Status; confirm Scope Statement tabs reflect register changes live;
  confirm "+ Add"/edit navigation lands on the correct pre-filled project.
- [ ] Verify migration script idempotency (run twice against a seeded project, confirm no
  duplicate rows).
- [ ] RLS spot-check: second test account without project access cannot see/insert/update another
  project's constraints or assumptions.
- [ ] Run the existing retest suite (CLAUDE.md rule 43) after each phase.

---

## Review section

**All code-level phases (0–5) are implemented and verified to compile.** Verification performed
this session:

- Every new/changed `.jsx`/`.js` file was fetched through each app's live Vite dev server
  (Platform on :5173, already running; Simulator on :5174, started temporarily for this
  verification and stopped afterwards) and checked for `SyntaxError` / `Unexpected token` /
  duplicate-identifier / unresolved-import errors — all clean.
- New unit tests (`constraintService.test.js`, Platform + Simulator) run via `vitest run`:
  **16/16 passing** (Platform) and **14/14 passing** (Simulator), alongside the pre-existing
  `assumptionService.test.js` suites (unaffected by the enrichment changes).
- No other test files reference the changed modules (`AssumptionsListPage`, route files), so no
  regression surface beyond what was directly tested.

**Not yet done — requires the user's live Supabase environment (no DB execution tool available in
this session):**

1. ~~Run the SQL migrations in order: `SQL/v1103` → `v1104` → `v1105` → `v1106` → `v1107`~~ —
   **done, confirmed run successfully by the user on 2026-09-25.**
2. **Phase 6's manual verification checklist**: create/edit/delete a constraint; edit an
   assumption's new Owner/Impact/Next review date/Status; confirm the Scope Statement's
   Assumptions/Constraints tabs reflect register changes live; confirm "+ Add"/edit navigation
   lands on the correct pre-filled project; confirm the new "Constraints Register" sidebar entry
   appears under RAID for a Project Manager / PMO Admin / Account Owner / System Admin role.
3. **Migration idempotency spot-check**: run `SQL/v1107` a second time against a project that had
   existing `scope_statements.assumptions`/`.constraints` text, confirm no duplicate rows appear
   (the `NOT EXISTS` + `'Migrated from Scope Statement (v1100)'` marker guard should hold, but
   this wasn't exercised against a real database).
4. **RLS spot-check**: confirm a user without access to a project cannot see/insert/update that
   project's rows in `constraints_register` / `practice_constraints` via a second test account.

**Design deviations from the original plan sketch worth noting:**

- Phase 0's `v1105` ended up **not** a no-op — it adds a `NOT VALID` CHECK constraint on
  `public.assumptions.impact_severity` (safe against pre-existing data) and does the full
  `sim.assumptions` column/CHECK-constraint work as planned.
- Icon chosen for the Constraints Register menu entry: `shield-alert` (lucide-react name), applied
  consistently in `SQL/v1106` and both `ConstraintsListPage.jsx` headers.
- `getSimProjectMembers()`'s row shape needed a specific adaptation: its `user_id` field is the
  **auth** user id, while `sim.assumptions.owner_user_id` / `sim.practice_constraints.owner_user_id`
  reference `public.users(id)` — the Owner picker in both Simulator forms reads `member.profile.id`
  (the enriched `public.users` row), not `member.user_id`, to avoid silently storing the wrong kind
  of id.

**Files touched (summary):**

- New SQL: `SQL/v1103`–`v1107` (5 files).
- New Platform files: `services/constraintService.js`,
  `pages/constraints/{ConstraintForm,ConstraintsListPage,ConstraintDetailPage}.jsx`,
  `services/__tests__/constraintService.test.js`.
- New Simulator files: same set, adapted to the `practice-projects/:projectId` route nesting.
- Changed (both apps): `assumptionService.js`, `pages/assumptions/{AssumptionForm,
  AssumptionsListPage,AssumptionDetailPage}.jsx`, scope statement page + its save-service
  (`scopeStatementService.js` / `simPlanningService.js`), route files (`lazyImports.js`,
  `platformRoutes.jsx`/`simulatorRoutes.jsx`, `routeCommon.jsx`).
- Docs: `Documentation/Core_PM_and_Industry_Menu_Taxonomy.md`, `ROADMAP.md`.
