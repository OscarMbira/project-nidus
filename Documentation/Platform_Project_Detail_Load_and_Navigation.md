# Platform project detail — load query and “not found” UX

## Issue
- Project **list** loaded seeded projects, but the **detail** route sometimes showed **Project not found** even for valid rows.
- **Back to Projects** sent users to `/projects` instead of `/platform/projects`.

## Cause
- `ProjectsDetail.jsx` used `project_methodologies!inner` in the Supabase select. Projects **without** a `project_methodologies` row were excluded from the result (inner join), so `.single()` behaved like “no row”.

## Changes (`src/pages/ProjectsDetail.jsx`)
1. Replaced `project_methodologies!inner` with a **left** embed: `project_methodologies ( ... )` so projects load without a methodology assignment.
2. **Not found / error** panel: clearer copy for missing rows (`PGRST116`) vs other errors; explains stale links after seed refreshes.
3. **Navigation**: **Back to Projects** and post-delete redirect use **`/platform/projects`**.

## Related seed
- After re-running `SQL/v334_seed_platform_projects_portfolio_programme_dev.sql`, old bookmarked UUIDs will not match new rows — the updated message describes that case.

## DB: `permission denied for table project_methodologies`
Apply **`SQL/v336_project_methodologies_grants_and_rls.sql`** (see `Documentation/Project_Methodologies_RLS_v336.md`).
