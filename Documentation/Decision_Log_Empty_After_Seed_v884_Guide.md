# Decision Log empty after seed — cause & fix (v882 / v884)

## Why the page stayed empty

Two separate issues stacked:

### 1. Wrong project in the URL vs header (UI)

Your screenshot showed:

| Surface | Project |
|--------|---------|
| Header / breadcrumb | **SEED334-PRJ-08** Velocity Freight |
| Page **Project** dropdown / `?projectId=` | **SEED334-PRJ-27** Bloom Agronomy |

v882 seeds **every** empty `SEED334-PRJ-*` project (including both). Looking at PRJ-27 while expecting PRJ-08 still shows rows **if** RLS allows them — but a mismatched bar made it easy to think seed “did nothing.”

**Fix (app):** Decision Log now uses `usePlatformProjectId()` (same as the header), and the old page-local Project bar was removed (Platform + Simulator).

### 2. Broken RLS hid all rows (DB)

Even with seed data present, `project_decisions` SELECT used:

`user_projects.user_id = auth.uid()`

`user_projects.user_id` is `public.users.id`, not Auth UUID — so most sessions saw **zero** rows.

**Fix (SQL):** run `SQL/v884_project_decisions_rls_fix.sql` in Supabase. It rewrites policies to join via `users.auth_user_id` / memberships (same pattern as change log). Notices report counts for PRJ-08 / PRJ-27.

## What to run

1. **`SQL/v884_project_decisions_rls_fix.sql`** (required for visibility)
2. If the NOTICE says `total=0`, re-run **`SQL/v882_seed_decision_log_seed334.sql`**
3. Hard-refresh Decision Log with **SEED334-PRJ-08** (or any SEED334 project) selected in the **header**

## Related

- Seed: `Documentation/Decision_Log_Seed_v882_Guide.md`
- Seed SQL: `SQL/v882_seed_decision_log_seed334.sql`
- RLS SQL: `SQL/v884_project_decisions_rls_fix.sql`
