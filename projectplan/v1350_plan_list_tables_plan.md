# v1350 — Plan lists as tables (not JSON)

**Owner request (2026-11-21):** "Fix these plan JSON issues into tables now… Keep the data in tables and not JSON for these plans."
Found during v1345 wave 4m: the project plan and stage plan forms asked users to type lists as raw JSON.

## Decisions

- **D1 — Storage (owner, 2026-11-21):** real database tables, one row per item (option "Real database tables"). Not JSON, not tab-separated text.
- **D2 — Screen:** each list is edited with `PlanListTable` (`@nidus/ui`), a thin wrapper of `TableListInput` (rule 67.1): table view by default, search, sortable columns, inline edit, confirm before delete.
- **D3 — Columns** (defaults chosen by Claude; change in `PLAN_LISTS`, then regenerate the SQL):

| List | Plans | Table(s) | Columns |
|---|---|---|---|
| Key risks | project, stage | `project_plan_key_risks`, `stage_plan_key_risks` | Risk · Impact (High / Medium / Low) · Owner · Response |
| Quality gates | project, stage | `project_plan_quality_gates`, `stage_plan_quality_gates` | Gate · Date · Criteria |
| Budget breakdown | project, stage | `project_plan_budget_lines`, `stage_plan_budget_lines` | Category · Amount (numeric) · Notes |
| Dependencies | stage | `stage_plan_dependencies` | Dependency · Type (Internal / External) · Notes |
| Resource allocation | stage | `stage_plan_resource_allocations` | Work package · Resource · Allocation |

- **D4 — One source of truth:** `PLAN_LISTS` in `packages/shared/src/services/planListTablesService.js`. `scripts/generate-plan-list-tables-sql.mjs` builds the SQL from it, so the columns and the JSON copy rules always match the app.
- **D5 — Access mirrors the parent plan (SQL v206):** read when the plan is visible to you; change only when you could edit the plan. SECURITY DEFINER helpers (`auth_user_can_view_/edit_project_plan`, `…_stage_plan`) with `row_security = off`.
- **D6 — Existing data:** the JSON values are copied once (arrays of objects via column aliases, arrays of text, `{ key: value }` maps). The JSON columns stay for reference (commented as superseded) and are no longer written. Drop them later once the copy is confirmed.
- **D7 — Seam:** the plan services (`projectPlanService.js`, `stagePlanService.js`, identical in both apps) split the lists out on create / update and attach them on load. The forms still edit arrays on `formData`.
- **D8 — Simulator:** Simulator mounts the same plan pages, and its plan services write `public.project_plans` / `public.stage_plans` (pre-existing — see Notes), so the new tables are `public` only and both apps use them.

## Todo

- [x] Shared config + load / save / legacy-read helpers (`planListTablesService.js`) with unit tests (10 pass).
- [x] `PlanListTable` UI component with tests (3 pass).
- [x] 7 plan sections × 2 apps: JSON text areas replaced; "(JSON)" removed from labels; JSON hints removed.
- [x] Plan services × 2 apps: split on create / update, load on read (a load error leaves the stored JSON visible).
- [x] `SQL/v1542_plan_list_tables.sql` (generated): 8 tables, RLS, helpers, one-time copy, registry. **Owner: run, then re-run `SQL/v1251_planner_table_wall.sql`.**
- [x] `SQL/v1543_field_help_plan_list_tables_seed.sql`: help rewritten for the 8 fields; stage dependencies / resource allocation got their own help keys.
- [ ] Owner: run v1542 → v1251 → v1543; open a project plan and a stage plan with old JSON data and confirm the rows appear.
- [ ] Later (after confirmation): drop the 8 superseded JSON columns.

## Review (2026-11-21)

- Files: `packages/shared/src/services/planListTablesService.js` (+ test, vitest config), `packages/ui/src/PlanListTable.jsx` (+ test), `apps/{platform,simulator}/src/components/plans/{ProjectPlanBudget,ProjectPlanQuality,ProjectPlanRisk,StagePlanBudget,StagePlanResource,StagePlanRisk,StagePlanSchedule}Section.jsx`, `apps/{platform,simulator}/src/services/{projectPlanService,stagePlanService}.js`, `scripts/generate-plan-list-tables-sql.mjs`, `scripts/field-help-content/plan_list_tables.mjs`, SQL v1542–v1543.
- Validation: all 20 changed source files compile; 13 new tests pass; existing TableListInput tests pass; field-help coverage 0 missing.
- Exports / views: the plan view pages never showed these fields; no export reads them.
- Audit tab (rule 63.1): not added — the rows are edited inside the plan form, which is the record; they are not records with their own page.

## Notes

- **Correction (2026-11-21, after checking routes):** the live Simulator plan pages (`simulator/practice-projects/:projectId/plans/*` → `pages/simulator/plans/Sim*`, and `simulator/practice-plans/*` → `PracticePlan*`) already save to `sim.practice_project_plans` / `sim.practice_stage_plans` through `services/sim/practicePlanService.js` / `practiceStageplanService.js` (`simDb`). The `public`-writing Simulator copies (`apps/simulator/src/pages/plans/*`, `components/plans/*`, `services/projectPlanService.js`, `services/stagePlanService.js`) are imported in `simulatorRoutes.jsx` but never mounted — dead code, so no simulation data reaches `public` through them. D8 and the Simulator edits in this change therefore only matter for that dead copy. Clean-up is a separate decision.
- Dates in quality gates are stored as text: old values include free text such as "Week 6".
