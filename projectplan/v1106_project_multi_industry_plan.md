# v1106 — Project Multi-Industry Classification — Implementation Plan

**PRD:** `projectprd/v1106_project_multi_industry_PRD.md`
**Status:** Approved, implemented, and SQL run (2026-09-26) — all phases complete. Remaining:
manual click-through verification (Phase 6, item 2).

Delivered as vertical slices (rule 17.2). SQL in `E:\project-nidus\SQL\` only (public + sim); no
Admin repo change.

---

## Phase 0 — SQL

- [ ] `SQL/v1112_project_industries_schema.sql`
  - `CREATE TABLE public.project_industries` (id, project_id FK `projects` CASCADE,
    industry_category_id FK `industry_categories`, is_primary BOOLEAN DEFAULT FALSE, added_at,
    added_by FK `users`). Unique `(project_id, industry_category_id)`; unique
    `(project_id) WHERE is_primary = TRUE` (mirrors `account_industries`' two constraints exactly).
  - RLS: SELECT/INSERT/UPDATE/DELETE all gated on `auth_user_can_access_project(project_id)` —
    same shape as `project_functional_roles` (v1084), no stricter edit-tier check at the RLS layer
    (page-level `canEdit` handles that, consistent with the rest of this codebase).
  - `database_tables` registry row. No `display_id` (no reference column).
- [ ] `SQL/v1113_sim_practice_project_industries_schema.sql`
  - `CREATE TABLE sim.practice_project_industries` mirroring the above,
    `practice_project_id` FK `sim.practice_projects` CASCADE, `industry_category_id` FK
    `public.industry_categories` (shared catalog), `added_by` FK `public.users`.
  - RLS mirrors `sim.practice_constraints`' pattern exactly: ownership
    (`practice_projects.user_id = auth.uid()`) OR active `sim.practice_project_memberships` row.
  - `database_tables` registry row for `sim.practice_project_industries`.
- [ ] `SQL/v1114_project_industries_migration.sql`
  - Idempotent backfill: for every `public.projects` row with a non-null `industry_category_id`,
    insert one `project_industries` row with `is_primary = TRUE` (`WHERE NOT EXISTS` guard on the
    unique index). Nothing to backfill in `sim` (no legacy column there).
  - Does **not** drop `projects.industry_category_id` — it stays as the synced "primary industry"
    pointer (see Phase 1).

## Phase 1 — Platform: service layer

- [x] `services/projectIndustryService.js` (new):
  - `listProjectIndustries(projectId)` — join-read with `industry_categories(id, name)`, ordered
    primary-first (mirrors `getOrgIndustryOptions`'s shape).
  - `replaceProjectIndustries(projectId, picks[{ industryCategoryId, isPrimary }], userId)` —
    delete rows no longer selected, upsert the rest, **then** update
    `projects.industry_category_id` to whichever pick has `isPrimary` (keeps the legacy column in
    sync in the same call). Enforces client-side: at least one row implies exactly one primary; if
    the caller ticks 1+ industries but marks none primary, the first one is defaulted to primary
    rather than leaving the unique-partial-index constraint to reject the write.
  - Update `organisationIndustryService.js`'s `getProjectIndustryCategoryIds(projectId)` to read
    from `project_industries` instead of the single column — this is the **only** change needed
    for the existing pm/tm sidebar-scoping chain (`useMenu.js` → `getMenuItemIndustryPackMap`)
    to support multiple industries, since that chain already threads an array through
    end-to-end (confirmed: `restrictToIndustryCategoryIds` already accepts N ids, not just 0-or-1).
- [x] `components/project/ProjectWizardPanels.jsx`: replace the single `SearchableSelect` Industry
  field with a multi-select-with-primary control (checkbox list + a "set primary" affordance per
  ticked industry, interaction pattern borrowed from `IndustrySelectionStep.jsx`), sourced from
  `getOrgIndustryOptions(accountId)` (already exists — the same org-restricted list the current
  single-select uses). Used by both `ProjectsCreate.jsx` and `ProjectsEdit.jsx` (already shared).
- [x] `pages/projectSetup/ProjectDetailsPage.jsx` / `services/projectDetailsService.js`: the
  read-only Industry summary lists all ticked industries, primary visually distinguished (badge),
  instead of the single resolved name.

## Phase 2 — Platform: role picker filter becomes multi-select

- [x] `pages/platform-app/ProjectFunctionalRoleFromLibrary.jsx`: replace the single-value industry
  `SelectField` with a multi-select filter (checkbox group, consistent with the rest of the
  picker's existing tick-box interaction), defaulting to **all** of the project's industries
  (via the new `listProjectIndustries(projectId)`) rather than the single primary. "All
  industries" remains reachable by unchecking every filter chip.

## Phase 3 — Simulator: service layer + sidebar restriction (new capability, not a port)

- [x] `services/sim/simProjectIndustryService.js` (new): `listPracticeProjectIndustries`,
  `replacePracticeProjectIndustries` — same shape as Phase 1's Platform service, targeting
  `sim.practice_project_industries` via `simDb`. No legacy column to keep in sync (Simulator has
  none).
- [x] **New capability**: `useSimMenu.js` currently applies **no** per-practice-project
  restriction at all (`getMenuItemIndustryPackMap(accountId)` is called with no
  `restrictToIndustryCategoryIds`, unlike Platform's pm/tm layout) — confirmed by reading the hook.
  Add the same restriction Platform's `useMenu.js` already has: resolve the current practice
  project id at the call site (the existing `?practiceProjectId=`/`?projectId=` query-param
  convention already used by `PracticeProjectFunctionalRolesPage.jsx` — verify at implementation
  time whether a dedicated resolution hook needs to be added, mirroring `usePlatformProjectId()`,
  or whether the existing search-param read is sufficient here), fetch its industries via
  `listPracticeProjectIndustries`, and pass them through to `getMenuItemIndustryPackMap` as
  `restrictToIndustryCategoryIds` for `pm`-equivalent (project-scoped) layouts only — `pmo`-scoped
  layouts keep showing every org-enabled industry, unchanged.
- [x] `pages/simulator/PracticeProjectCreate.jsx`: add the same multi-select-with-primary Industry
  step used in Platform's wizard (new UI here — no existing single-select to convert, since the
  field never existed).
- [x] `pages/simulator/PracticeProjectDetail.jsx`: show the practice project's industries (read-only;
  no pre-existing edit flow for the base project exists to extend — its Edit button already points
  at a route with no matching handler, a pre-existing gap out of this feature's scope)
  (list read-only industries today are shown, if any equivalent section exists — verify at
  implementation time; add one if not).

## Phase 4 — Simulator: role picker filter becomes multi-select

- [x] `pages/simulator/PracticeProjectFunctionalRoleFromLibrary.jsx`: same multi-select filter
  change as Phase 2, sourced from `listPracticeProjectIndustries(practiceProjectId)`. This
  **replaces** the "always defaults to All industries" placeholder behaviour this page shipped
  with in v1105 (practice projects had no industry field to default from at the time).

## Phase 5 — Tests, docs, review

- [x] Unit tests: `projectIndustryService.test.js` (Platform, 8 tests), `simProjectIndustryService.test.js`
  (Simulator, 7 tests) — list/replace, primary-defaulting, delete-down-to-zero. All passing.
- [x] Dev-server compile check of every new/changed file in both apps (rule 35).
- [x] `Documentation/Project_Multi_Industry_v1106_Guide.md` (feature guide + SQL run order).
- [x] No `menu_items` change → taxonomy doc (rule 70) and `ROADMAP.md` unchanged.
- [x] Review section below; `REVIEW.md` checks.

## Phase 6 — User actions after implementation

1. ~~Run `v1112 → v1113 → v1114` in Supabase.~~ Done (2026-09-26) — user confirmed all pending
   SQL ran successfully.
2. Manual click-through (both apps, per PRD §e): multi-tag a project, confirm sidebar + role
   picker both reflect it; confirm an existing single-industry project survived migration as
   primary; confirm a practice project with zero industries behaves as today. **Not yet done.**

---

## Review section

**Summary of changes:**

- **SQL (not yet run):** `SQL/v1112_project_industries_schema.sql` (`public.project_industries` +
  RLS), `SQL/v1113_sim_practice_project_industries_schema.sql`
  (`sim.practice_project_industries` + RLS), `SQL/v1114_project_industries_migration.sql`
  (idempotent backfill of existing Platform projects' single industry into the new table as
  primary).
- **Platform:** new `services/projectIndustryService.js`; `organisationIndustryService.js`'s
  `getProjectIndustryCategoryIds` now reads the new table instead of the single column (only
  change needed for the pre-existing array-ready sidebar chain); `ProjectWizardPanels.jsx`'s
  single Industry `SearchableSelect` replaced with a checkbox-list-with-primary control, shared by
  `ProjectsCreate.jsx` / `ProjectsEdit.jsx` / `ProjectsDetail.jsx`; `projectWizardFormUtils.js`'s
  `industry_category_id` field removed (superseded by the new table);
  `projectSetup/ProjectDetailsPage.jsx` + `projectDetailsService.js` read-only summary now lists
  all tagged industries with a Primary badge; `platform-app/ProjectFunctionalRoleFromLibrary.jsx`'s
  industry filter converted from a single dropdown to a multi-select chip toggle defaulting to all
  of the project's industries.
- **Simulator:** new `services/sim/simProjectIndustryService.js` (no legacy-column sync — practice
  projects never had one); `useSimMenu.js` gained the 'pm'-scope sidebar industry-pack restriction
  for the first time (resolves the current practice project from its `:projectId` route segment,
  falls back to unrestricted when a project has zero tagged industries — no backfill exists for
  Simulator); `PracticeProjectCreate.jsx` gained a new Industries checkbox-list-with-primary step;
  `PracticeProjectDetail.jsx` gained a read-only Industries display (no working Edit flow exists
  for the base practice project to extend — its Edit button already points at a route with no
  handler, a pre-existing gap outside this feature's scope);
  `simulator/PracticeProjectFunctionalRoleFromLibrary.jsx`'s industry filter converted the same way
  as its Platform counterpart, replacing the v1105 "always All industries" placeholder.
- **Tests:** `projectIndustryService.test.js` (Platform, 8 tests) and
  `simProjectIndustryService.test.js` (Simulator, 7 tests), both passing — cover primary
  sort-order, primary-defaulting, forcing exactly one primary, delete-down-to-zero, and
  update-in-place.
- **Docs:** `Documentation/Project_Multi_Industry_v1106_Guide.md`.

**Verification performed:**

- Every new/changed `.jsx`/`.js` file in both apps was fetched through its live Vite dev server
  (5173 Platform, 5174 Simulator) and checked for `SyntaxError` / unresolved-import errors — all
  clean.
- Full `vitest run` of both new test files — 15/15 passing.
- No existing test files reference any of the touched pages/services (checked via grep), so no
  pre-existing suite needed updating.

**Known gaps / deliberately out of scope:**

- Phase 0 SQL has not been run yet — the feature is inert in the live database until the user runs
  `v1112 → v1113 → v1114`.
- `PracticeProjectDetail.jsx`'s Edit button points at a route with no matching handler — a
  pre-existing bug, unrelated to this feature, left as-is rather than fixed as a side effect.
- Manual click-through (Phase 6, item 2) has not been performed — requires the SQL to be run
  first.
