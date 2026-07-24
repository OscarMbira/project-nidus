# v796 — Fix Publish to Simulator for process templates (`practice_project_id`)

## Problem
**Publish to Simulator** returns HTTP 400 for process templates:
`column "project_id" of relation "activity_attributes" does not exist` (and the same for other process tables).

Live probe: ~185 pending `process_template` rows fail this way; `project_template` / `portfolio_template` / `form_template` / `industry_plan` / `opa` simulator publishes succeed.

## Root cause
`public._sync_global_process_template_catalog` inserts into `sim.<table>` with column `project_id`. Simulator process tables (v629) use **`practice_project_id`**.

## Fix
1. [x] `SQL/v796_fix_process_template_sim_catalog_sync.sql` — sim branch uses `practice_project_id`; upsert by `reference_code` on sim
2. [x] Admin mirror `project-nidus-admin/SQL/v192_fix_process_template_sim_catalog_sync.sql` (same body — apply either once)
3. [ ] Apply in Supabase SQL Editor
4. [ ] Re-test **Publish to Simulator**

## Review
Confirmed against live RPC with `p_target='simulator'`. Platform path unchanged (still uses `project_id` on `public.*`).
