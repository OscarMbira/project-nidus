# v1354 — Resource Levelling & Portfolio Optimisation — Implementation plan

**PRD:** `projectprd/v1354_resource_levelling_and_portfolio_optimisation_PRD.md` (owner decisions D1–D12, 2026-11-22).
**Systems:** levelling — Platform (`public`), Simulator (`sim`), Planner (`public`, Planner edition); optimisation —
Platform and Simulator (D10).
**Method:** test-first vertical slices (App_Guide), one per D12 step; each slice builds in all its apps, tests pass with
no new failures (suites run one at a time), is committed, and the owner runs its SQL and checks in the browser before
the next starts. SQL numbers are taken from `ls SQL` immediately before each file (rule 18.0).

## Facts this plan builds on

- `tasks.priority` already exists (read by `packages/planning/src/services/scheduleData.js`) — no new priority field.
- Schedule engine: `recalculate_project_schedule` RPC (v1245) + client preview with shared test vectors — levelling
  runs after it and uses its float / critical-path results.
- Workload: `packages/planning/src/services/workload.js` — demand (task estimated hours over working days) and
  capacity (resource calendar → default hours × capacity % → project calendar). Levelling reuses it (D2).
- `task_assignments`, `resource_assignments`, `resource_conflicts` (no detection function yet).
- Portfolio: `portfolios`, `portfolio_projects` (status, priority, priority_order, strategic flag);
  `strategic_contributions` (scores used to pre-fill strategic fit, D7).
- Simulator: no resource tables — capacity from the project calendar; task assignees from `sim.tasks`.
- Record lifecycle approvals (rule 53) for scenario approval (D9).

## Engine (pure JS, `packages/planning/src/engine/`)

- `levelling.js` — input: tasks (dates, duration, float, constraints, dependencies, priority, pinned), assignments,
  capacity per person per day, fixed external load (other projects, D6); output: moves `{taskId, oldStart, newStart,
  delayDays, reason}` + finish impact + before / after workload. Modes: within float only / allow beyond (D3).
  Order: critical path → priority → least float → earliest start (D4); project priority first when cross-project.
- `portfolioScoring.js` — weighted totals (D7).
- `portfolioOptimiser.js` — exact branch-and-bound up to ~40 candidates, ranked greedy above (labelled), with
  budget / capacity per period, mandatory / excluded / requires / exclusive rules and start shifting up to N months;
  reasons for left-out projects (D8, D11).
- Shared test vectors (`__vectors__/*.json`) used by JS tests and SQL re-check tests.

## Data model (new tables; `public` + `sim` twins unless noted; RLS on; registered in `database_tables`; Planner wall)

| Table | Slice | Purpose |
|---|---|---|
| `tasks.is_level_pinned` (column) | 1 | Pin a task (D4) |
| `levelling_runs` | 1 | Run header: scope (project / cross-project), mode, created by, status (applied / undone / proposed), display ID |
| `levelling_run_moves` | 1 | Each move: task, old / new dates, delay, reason, accepted / rejected (D6) |
| `portfolio_scoring_criteria` | 3 | Per portfolio: name, weight %, scale guidance 1–5 (D7) |
| `portfolio_project_scores` | 3 | Project × criterion score, scored by, scored at |
| `portfolio_scenarios` | 4 | Limits (budget / capacity per period, max start shift), status draft / pending_approval / approved / applied, display ID |
| `portfolio_scenario_rules` | 4 | Mandatory / excluded / requires / exclusive |
| `portfolio_scenario_results` | 4 | Project in / out, shifted start, reason |

Database functions: `apply_levelling_run` (re-checks moves against current dates, refuses stale previews, saves
the run), `undo_levelling_run`, `decide_levelling_moves` (PM accept / reject, own project only),
`apply_portfolio_scenario` (only from approved; updates statuses, priority order, start dates). `SECURITY DEFINER`
only where needed, never bypassing RLS for clients. Admin SQL: ID generation rules for `levelling_runs` and
`portfolio_scenarios` (rule 16.2).

## Slice 1 — Project levelling

Tests first: levelling vectors (float only, beyond float, pinned, constraints, calendars, priority order).
- [x] Engine `levelling.js` + vectors.
- [x] SQL: pin column, `levelling_runs`, `levelling_run_moves`, apply / undo functions (public + sim), registry,
      triggers, Planner wall + allow-list.
- [x] Schedule screen: Level resources action → routed preview page (rule 65): moves table with untick, finish impact,
      before / after workload; Apply → success modal; Undo last run. Pin toggle on the task page.
- [x] Platform, Simulator, Planner (shared screens); field help; menus only if a new page needs one (rule 75).
- [x] Exit: builds, tests, commit; owner SQL + browser check.

## Slice 2 — Cross-project levelling

- [x] Engine: external load + project-priority ordering.
- [x] Resource manager page: choose projects / programme / portfolio → proposal by project; send to PMs.
- [x] PM inbox on the project: accept / reject moves; `decide_levelling_moves`; notifications (existing).
- [x] Reminder (rule 80, v1352 A1): `reminder_record_types` row for levelling moves awaiting a PM decision.
- [x] Simulator parity (practice programmes / portfolios); Planner: single-account multi-project if present.
- [x] Exit as slice 1.

## Slice 3 — Portfolio scoring

- [x] SQL: criteria + scores (public + sim); seed example criteria (rule 18.2 / 77).
- [x] Pages: portfolio › Scoring criteria (weights must total 100%); project scoring page; ranked list with exports.
- [x] Strategic fit pre-fill from `strategic_contributions`.
- [x] Platform + Simulator; field help; menus + taxonomy / placement docs (70, 75); exit.

## Slice 4 — Optimisation and scenarios

- [x] Engine `portfolioOptimiser.js` + vectors (brute-force check on small sets).
- [x] SQL: scenarios, rules, results; `apply_portfolio_scenario`; approval via record lifecycle (rule 53).
- [x] Reminder (rule 80, v1352 A1): `reminder_record_types` row for scenarios awaiting approval.
- [x] Pages: scenario create / edit (limits, rules, start shift), run, results with reasons; copy; compare up to four;
      submit for approval; apply. Dashboard cards clickable (rule 64).
- [x] Platform + Simulator; field help; guide `Documentation/Resource_Levelling_and_Portfolio_Optimisation_v1354_Guide.md`;
      ROADMAP R6 / R7 status; exit.

## Risks

| Risk | Mitigation |
|---|---|
| Levelling disagrees with the workload view | One shared calculation (`workload.js`), tested against the same vectors |
| Stale preview applied over newer edits | Apply re-checks current dates and refuses a changed task |
| Optimiser slow on big portfolios | Exact search capped (~40), greedy above, run in the browser off the main path |
| Simulator has no resource data | Project-calendar capacity and task assignees, as the workload view already does |
| Planner wall / allow-list drift | Re-run v1251 and regenerate the allow-list in slices 1–2 |

## Review

Implemented 2026-11-23 in `packages/planning` (engine, schedule views, scoring and scenario screens) plus Platform and Simulator routes and the cross-project page. Planner gets the schedule views and `/app/levelling`.

SQL is written and not applied here: `v1572`–`v1576`, Admin `v258`. The owner runs those, then checks Level resources, a cross-project proposal, scoring and a scenario in the browser. Not committed (commit only when asked).

Exit note on each slice’s “commit; owner SQL + browser check”: tests were run locally; SQL and the browser check remain with the owner.

### v1359 audit corrections (2026-11-28)

The review above says "Not committed" — the work was committed in b4d35e9c; the owner ran `SQL/v1572`–`v1576` and
Admin `v258` on 2026-11-27. The v1359 gap closure found and fixed:
- **Optimiser (L7):** a project that requires a lower-scoring one could never be chosen; scenarios saved with a
  "requires" rule should be run again. New hand-worked vectors and 60 random brute-force comparisons.
- **Scenario Apply / Submit (L4):** now ask first, report errors and confirm success.
- **Menus (L3):** Scoring and Scenarios added to the taxonomy and placement documents (no rows needed).
- Schedule screen tests updated for the new views (B12).
Outstanding: browser checks of levelling, proposals, scoring and scenarios (L5).

### Close (2026-11-28)

The owner passed the outstanding browser check — levelling, cross-project proposals, scoring and scenarios (L5) — after the v1359 gap closure. This plan is **complete**.
