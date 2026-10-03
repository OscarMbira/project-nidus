# Project Multi-Industry Classification (v1106)

**Applies to:** Platform (`apps/platform`), Simulator (`apps/simulator`)
**Related:** `projectprd/v1106_project_multi_industry_PRD.md`,
`projectplan/v1106_project_multi_industry_plan.md`

## What this adds

A project (Platform) or practice project (Simulator) can now be tagged with **more than one
industry**, with exactly one marked **primary** — the same pattern already used for an
organisation's own industries (`account_industries`). Previously a project carried at most one
industry via a single `industry_category_id` column.

1. **Project Create / Edit / View** (Platform: `ProjectsCreate.jsx` / `ProjectsEdit.jsx` /
   `ProjectsDetail.jsx`; Simulator: `PracticeProjectCreate.jsx` / `PracticeProjectDetail.jsx`) —
   the single Industry dropdown is replaced with a checkbox list. Tick as many industries as
   apply; one ticked industry can be marked **Primary** (defaults to the first tick if none is
   chosen explicitly).
2. **Sidebar industry-pack scoping** — a project-scoped ('pm'/'tm') sidebar now shows the
   industry pack section(s) for **all** of the current project's tagged industries, not just one.
   Simulator's `useSimMenu.js` gained this restriction for the first time (it previously applied
   none at all for the 'pm' scope).
3. **Add from Built-in Roles picker** (`ProjectFunctionalRoleFromLibrary.jsx` /
   `PracticeProjectFunctionalRoleFromLibrary.jsx`) — the industry filter is now a multi-select
   chip toggle, defaulting to all of the project's tagged industries. Unchecking every chip shows
   roles from every industry (equivalent to the old "All industries" option).

## Data model

- `public.project_industries` (Platform) / `sim.practice_project_industries` (Simulator) — one row
  per (project, industry), a boolean `is_primary` (at most one `TRUE` per project, enforced by a
  partial unique index), `added_at`, `added_by`.
- Direct RLS-gated reads/writes from the client — no RPC. Platform's `projects.industry_category_id`
  is kept in sync as the "primary industry" pointer so every pre-existing single-column read site
  keeps working unchanged. Simulator's `practice_projects` has no equivalent legacy column, so
  there is nothing to sync there.
- The `industry_categories` catalog itself is shared (`public.industry_categories`, read by both
  apps) — only the per-project **tagging** lives in separate `public`/`sim` tables, per the
  mandatory Platform/Simulator schema separation.

## Services

- `apps/platform/src/services/projectIndustryService.js` — `listProjectIndustries(projectId)`,
  `replaceProjectIndustries(projectId, picks, userId)`.
- `apps/simulator/src/services/sim/simProjectIndustryService.js` — `listPracticeProjectIndustries`,
  `replacePracticeProjectIndustries` (same shape, no legacy-column sync).

Both `replace*` functions: delete rows no longer picked, upsert the rest, and enforce "at least one
pick implies exactly one primary" client-side (defaults the first pick to primary if none is
marked; force exactly one `isPrimary: true` even if the caller ticks several).

## Sidebar restriction mechanics

- **Platform** (`useMenu.js`, pre-existing chain, only the data source changed):
  `getProjectIndustryCategoryIds(projectId)` now reads `project_industries` instead of the single
  column — the rest of the pack-grouping chain (`getMenuItemIndustryPackMap`,
  `groupMenuTreeByIndustryPack`) already accepted an array of ids.
- **Simulator** (`useSimMenu.js`, new capability): resolves the current practice project id from
  the `:projectId` route path segment (the dominant convention across pm-scoped Simulator routes)
  with a `?projectId=`/`?practiceProjectId=` query-string fallback, fetches its industries via
  `listPracticeProjectIndustries`, and restricts `getMenuItemIndustryPackMap` to them for the
  `pm` scope only. **If a practice project has zero tagged industries** (e.g. any project created
  before this feature — there is no Simulator backfill migration), the restriction falls back to
  unrestricted (every org-enabled industry pack shows), rather than hiding every pack — avoiding a
  regression for projects that simply haven't been tagged yet. `pmo`/`portfolio`/`programme`/
  `coordinator` scopes are org-wide and unaffected.

## Running the SQL

Run these in order against Supabase (SQL editor, pgAdmin, or DBeaver):

1. `SQL/v1112_project_industries_schema.sql` — `public.project_industries` + RLS.
2. `SQL/v1113_sim_practice_project_industries_schema.sql` — `sim.practice_project_industries` + RLS.
3. `SQL/v1114_project_industries_migration.sql` — idempotent backfill: every Platform project that
   already has a single `industry_category_id` gets a matching primary row in
   `project_industries`. **Simulator has no equivalent backfill** — practice projects start
   untagged (see sidebar fallback behaviour above).

### Verify

```sql
-- Every project with a legacy industry_category_id should now have a matching primary row
select p.id, p.industry_category_id
from public.projects p
where p.industry_category_id is not null
  and not exists (
    select 1 from public.project_industries pi
    where pi.project_id = p.id and pi.industry_category_id = p.industry_category_id and pi.is_primary
  );
-- Should return 0 rows
```

## Tests

- `apps/platform/src/services/__tests__/projectIndustryService.test.js` (8 tests)
- `apps/simulator/src/services/sim/__tests__/simProjectIndustryService.test.js` (7 tests)

Both cover: list sorting (primary-first), primary-defaulting when no pick is marked, forcing
exactly one primary when several are ticked, delete-down-to-zero, and update-in-place (no
duplicate rows on re-save).
