# v1265 — Plan sheet and task classification fields — Implementation plan

**PRD:** `projectprd/v1265_plan_sheet_and_task_classification_PRD.md`
**Status:** awaiting owner approval.
**Shared code:** `packages/planning` (Platform, Simulator, Planner). **SQL:** `public` + `sim`. **Admin:** not affected.

## Files

| Area | File | Change |
|---|---|---|
| SQL | `SQL/v1265_task_outline_and_classification.sql` | Both schemas:<br>• `tasks.outline_position INT`, `wbs_code TEXT`, `external_reference TEXT(100)`, `owner_user_id UUID`, `phase_id UUID` (→ `project_phases` / `sim.practice_project_stages`)<br>• `projects.status_date DATE` (Simulator: practice project table)<br>• backfill `outline_position` from the current order (start date, then created)<br>• indexes |
| SQL | `SQL/v1265_multiple_baselines.sql` | Both schemas: `project_baselines` + `baseline_number`, `reason`, `change_request_ref`, `is_active` (partial unique index: one active per project); backfill numbers by date; latest = active + approved. RPC `set_active_baseline(project, baseline)`: checks it is approved, copies its snapshot into `tasks.baseline_*` in one transaction. |
| SQL | `SQL/v1265_task_risk_issue_links.sql` | `task_risk_links`, `task_issue_links` in `public` and `sim`: unique pair, RLS via the existing project-access functions, `database_tables` registration. |
| SQL | `SQL/v1265_..._seed.sql`, `SQL/v1265_..._tests.sql` | Demo positions / WBS on the seed project; RLS and uniqueness tests. |
| Shared logic | `packages/planning/src/services/planOutline.js` (new) | Pure functions: `buildOutline` (tree, outline numbers, depth), `rollUpSummaries`, `plannedPercent`, `deviation`, `parseDuration`, `parsePredecessors`, `formatPredecessors`, `moveTask` / `indentTask` / `outdentTask` (returns position changes). |
| Data | `packages/planning/src/services/scheduleData.js` | Order by `outline_position`. Save positions in a batch. Status date. Link / unlink risks and issues. New columns in `TASK_COLUMNS` / `EDITABLE_TASK_FIELDS`. |
| Import | `packages/planning/src/services/scheduleExchangeService.js` | XML import: OutlineLevel → parent + position, WBS, mode, estimated "?", lags, %, actuals, baseline; resource matching report. Exports keep outline. |
| UI | `packages/planning/src/components/PlanSheet.jsx` (+ `PlanSheetRow`, `ColumnChooser`) | Split table / bars, collapse, outline toggle, project summary row, column chooser, editing, keyboard, phone layout. |
| UI | `packages/planning/src/screens/schedule/ScheduleGanttScreen.jsx` | Renders the Plan sheet. Status-date control. Bars toggle. |
| UI | `packages/planning/src/screens/schedule/TaskFormScreen.jsx` | Classification group. Risks & issues on the Links tab. |
| Shared UI | `packages/ui/src/ExportListMenu.jsx` | Opt-in View preview + PDF (existing callers unchanged). |
| Export | `packages/planning/src/services/planSheetExport.js` (new) | Outline-aware rows, Gantt-bar print layout. |
| Docs | `Documentation/Plan_Sheet_v1265_Guide.md` | User guide (for people coming from desktop tools) + blog summary. |

No sidebar / menu change: the Gantt tab is reused, so the menu taxonomy (rule 70) is unchanged.

## Tasks (vertical slices; each one is tested and usable end-to-end)

- [ ] **S1: outline, read-only.**
  - SQL outline columns (both schemas) + backfill
  - `planOutline.js` (tree, numbers, roll-ups) + tests
  - Gantt tab renders the Plan sheet table with indent, outline numbers + toggle, collapse / expand, summary rows, project summary row, default columns, bars lined up
  - phone layout
- [ ] **S2: baselines and progress columns.**
  - multiple baselines: SQL + RPC; Baselines tab (number, reason, change request, approve with justification, Active badge, make active); reason required from B1
  - status date (SQL + control)
  - Planned % / Actual % / % Deviation against the active baseline, with roll-up + colours
  - Baseline N columns, Slip since original, optional second baseline bars
  - "save a baseline" prompt
  - tests
- [ ] **S3: column chooser + View / Export.**
  - column chooser: add / remove / reorder, remembered per user; extra columns (WBS, baseline, actuals, float, critical, priority, task ID)
  - `ExportListMenu`: opt-in `onView` preview + PDF (shared, backward compatible)
  - Plan sheet export adapter: outline-aware Excel, desktop-format XML, CSV / JSON with outline number + parent, Word / PPT up to 10 columns, Print / PDF with optional Gantt bars and expanded-rows-only
  - task page `ExportRecordMenu` (View + Export)
  - tests
- [ ] **S4: import fidelity.**
  - XML OutlineLevel / WBS / mode / "?" / lags / % / actuals / Baseline + Baseline1–10 → B0…Bn
  - resource matching report
  - tests with an outline sample
- [ ] **S5: editing in the sheet.**
  - cell edit (name, duration, start, finish, predecessors, %, resources, WBS) → save + recalculate, cell errors, conflict prompt
  - row actions (insert, insert sub-task, indent, outdent, move, delete, open)
  - keyboard
  - tests
- [ ] **S6: classification fields.**
  - SQL columns + link tables (both schemas)
  - task form Classification group (external reference, stage / phase with inheritance, owner, status + blocked reason, due date + warning, tags)
  - Links tab Risks & issues (link, unlink, raise new)
  - sheet indicators / columns
  - tests
- [ ] **S7: finish.**
  - re-run v1251 + Planner allow-list
  - drift check
  - builds (Platform, Simulator, Planner)
  - full retest
  - REVIEW.md checks
  - guide doc
  - review section

## Owner run order

SQL files from S1, S2 and S6, in version order, after each slice is approved. Then re-run `SQL/v1251_planner_table_wall.sql`.

## Risks

- **Performance** on 350+ row plans: collapsed branches aren't rendered, and rows are windowed if needed. Tested with a generated 500-row plan.
- **Simulator naming differences** (`practice_*` tables): each SQL file maps them explicitly, with parity tests in both schemas.
- **Editing in the sheet is the largest slice (S5).** S1–S4 are useful on their own, so migrating users get value before S5 ships.

## Review

_(added after implementation)_
