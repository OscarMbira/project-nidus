# v1354 — Resource Levelling & Portfolio Optimisation — PRD

**Status:** Decisions D1–D12 settled with the owner on 2026-11-22 (interview, rules 56–60). Plan:
`projectplan/v1354_resource_levelling_and_portfolio_optimisation_plan.md`.
**Roadmap:** R3 (planning & scheduling), R6 (resource & capacity), R7 (PMO, programme & portfolio).
**Systems:** levelling — Platform, Simulator, Planner; portfolio optimisation — Platform, Simulator (D10). Admin: none.

---

## a) Problem statement

Nidus **detects** resource overload but does not help **fix** it, and it **scores** projects but does not help the PMO
**choose** which to fund. Both decisions are made outside the tool today.

What exists (codebase, 2026-11-22):

| Area | What exists | Gap |
|---|---|---|
| Schedule engine | Calendar-aware critical-path engine: `recalculate_project_schedule` RPC (v1245) + client preview, shared test vectors | Schedules ignore resource limits |
| Workload | `packages/planning/src/services/workload.js`: assigned hours per person per week vs capacity (resource calendar → resource default hours × capacity % → project calendar) | Shows overload; no levelling |
| Assignments | `task_assignments` (task ↔ user), `resource_assignments` (resource, dates, hours/day, allocation %), task `estimated_hours` | No priority used to decide who goes first |
| Conflicts | `resource_conflicts` table (type, severity, dates, affected assignments, resolution); Resource Conflicts / Capacity / Utilisation / Cross-project pages; Workload heatmap | Conflicts recorded, not computed or resolved |
| Portfolio | `portfolios`, `portfolio_projects` (status active / proposed / pending, priority, priority_order, strategic flag), Portfolio map, EVM / financial dashboards | No selection under budget / capacity limits |
| Strategy | `strategic_objectives`, `objective_hierarchies`, `project_objective_mappings`, `strategic_contributions` (contribution scores), Strategic Contribution scorer | Scores are not combined into a ranking with constraints |
| Simulator | No resource tables (workload uses the project calendar only) | — |

## b) Solution (shape)

1. **Resource levelling** — for a project (and across projects for shared people), propose a schedule where no
   one is over capacity: delay lower-priority work within float first, then beyond, honouring calendars,
   dependencies and constraints (no splitting or reassignment). Show the proposal as a preview (before / after, finish-date impact); apply only
   on confirmation; keep it reversible.
2. **Portfolio optimisation** — score candidate projects (strategy, value, risk, cost), then find the best set
   within budget and capacity limits per period, with mandatory / must-not combinations, and compare scenarios.
   Accepted scenarios update project statuses and priorities.

## c) User stories

1. As a PM, I can see where my project’s people are over capacity and get a levelled schedule proposal.
2. As a PM, I can preview the levelled schedule (what moves, by how much, new finish date) before applying it.
3. As a PM, I can choose to level only within float (no finish-date change) or allow the finish to move.
4. As a resource manager, I can level across projects for shared people using project priorities.
5. As a PMO lead, I can define scoring criteria and weights, and score candidate projects.
6. As a PMO lead, I can set budget and capacity limits per period and find the best set of projects.
7. As a PMO lead, I can mark projects as mandatory, excluded, or dependent on each other.
8. As a PMO lead, I can save and compare scenarios and apply the chosen one.
9. As a PM, I can pin a task so levelling never moves it.
10. As a PM, I can untick individual moves in the preview and apply the rest.
11. As a PM, I can undo the last levelling run in one click.
12. As a PM, I can accept or reject cross-project moves proposed for my project.
13. As a PMO lead, I can see why each left-out project is out (budget, capacity or rule).
14. As an approver, I approve a portfolio scenario with a mandatory justification before any project changes.
15. Simulator learners and Planner users can level their practice / planner schedules (D10).

## d) Implementation decisions

*(settled one at a time in the interview)*

- **D1 Shape (owner, 2026-11-22): one PRD, levelling first.** Resource levelling (project, then cross-project) ships
  first; portfolio optimisation follows and reuses the same capacity data to test whether a set of projects fits.
- **D2 Demand and capacity (owner, 2026-11-22): task assignments with estimated hours.** Demand = each assigned
  task’s estimated hours spread over its working days (as `workload.js` does); capacity = resource calendar entry →
  resource default hours × capacity % → project calendar. Levelling uses exactly the numbers people already see in
  the workload view (one shared calculation).
- **D3 Moves (owner, 2026-11-22): delay within float first.** Levelling delays lower-priority tasks within their
  float first (finish date unchanged); if overload remains, the user may allow delays beyond float (finish moves).
  Dependencies, calendars and date constraints are always respected. Levelling never splits tasks or reassigns
  people.
- **D4 Who goes first (owner, 2026-11-22): task priority, then float.** When tasks compete for the same person the
  order is: critical-path tasks, then task priority, then least float, then earliest start. A user can pin a task
  so levelling never moves it. Across projects, project (portfolio) priority comes before task priority.
- **D5 Apply flow (owner, 2026-11-22): preview, apply, undo.** The user runs levelling on demand (never
  automatic). The preview lists each moved task (old / new dates, delay, reason) with the finish-date impact and a
  before / after workload view. The user applies all moves or unticks some. Applying saves a levelling run, so the
  last run can be undone in one click.
- **D6 Cross-project (owner, 2026-11-22): resource manager proposes, PMs accept.** A resource manager / PMO runs
  levelling across selected projects (or a programme / portfolio). Higher-priority projects keep their dates; the
  proposal lists moves per project. Each Project Manager accepts or rejects the moves on their own project. A PM
  levelling one project treats other projects’ bookings of the same people as fixed load.
- **D7 Scoring (owner, 2026-11-22): weighted criteria per portfolio.** The PMO defines criteria per portfolio (e.g.
  strategic fit, financial value, risk, urgency) with weights summing to 100% and a 1–5 scale with guidance text per
  score. Strategic fit can pre-fill from existing strategic contribution scores. Each project gets a total score;
  every score keeps who scored it and when.
- **D8 Constraints (owner, 2026-11-22): budget + capacity per period, with rules.** Limits: budget per year /
  quarter and people capacity per role per period (D2 capacity data). Rules: mandatory (always in), excluded,
  A requires B, A and B mutually exclusive. A project may start later (up to N months, set per run) to fit. Result:
  the best total score within the limits, with the reason each left-out project is out.
- **D9 Scenarios (owner, 2026-11-22): saved scenarios, approve to apply.** Each run is saved as a scenario (limits,
  rules, result). The PMO can copy and adjust scenarios and compare up to four side by side (score, cost, capacity
  use, projects in / out). Accepting one needs approval with a mandatory justification (rule 53); on approval,
  project statuses (in → active / approved, out → deferred / rejected), priority order and any shifted start dates
  are updated.
- **D10 Systems (owner, 2026-11-22): levelling in all three, optimisation in Platform + Simulator.** Levelling lives
  in `packages/planning`, so Platform, Simulator (project-calendar capacity, task assignees) and Planner get it
  together. Portfolio optimisation ships in Platform and Simulator (practice portfolios); Planner has no portfolios.
- **D11 Engine (owner, 2026-11-22): shared JS engine, database applies.** Levelling and optimisation are pure
  functions in `packages/planning` (fast browser preview, unit-tested with shared test vectors). Applying goes
  through a database function that re-checks the moves / scenario, saves the run for undo and updates the records —
  the schedule-engine pattern (v1245). The optimiser does an exact search for up to about 40 candidate projects and
  a ranked greedy method above that, labelled as such on screen.
- **D12 Delivery order (owner, 2026-11-22): four slices, levelling first.** (1) Project levelling: engine, preview,
  apply, undo, pin, task priority. (2) Cross-project levelling: resource manager proposal, PM accept / reject.
  (3) Portfolio scoring: criteria, weights, scoring pages. (4) Optimisation: limits, rules, scenarios, compare,
  approve and apply. Each slice in all its systems, tested and committed before the next.

Standing rules that apply throughout (not re-decided): routed pages, not modals (65); Audit tab (63.1); field help
(76) and regional date inputs (79); success modal (16); display IDs in URLs (16.1); list sort, row numbers, card /
table toggle and exports (38–44); clickable dashboard cards (64); theme-aware (28.1); performance pass (66); RLS
without bypass (42); menus via catalogue + placement (75, 70); amount shorthand for budget limits (36).

## e) Testing decisions

- **Pure logic (unit, Vitest, shared test vectors):** levelling — overload matches `workload.js`; moves stay within
  float when the finish is locked; dependencies, calendars and date constraints respected; pinned tasks never move;
  order critical path → priority → float → start (D3, D4); cross-project order by project priority (D6). Scoring —
  weights sum to 100%, totals (D7). Optimiser — exact result equals brute force on small sets; limits and rules
  (mandatory, excluded, requires, exclusive, start shift) never broken; a reason for every left-out project (D8);
  greedy label above the threshold (D11).
- **Database (SQL test scripts in a rolled-back transaction):** apply re-checks moves and refuses a stale preview;
  undo restores dates exactly; PMs accept / reject only on their own project; scenario apply only after approval;
  RLS by organisation and role; Planner wall covers the new tables.
- **Screens (React Testing Library):** preview with untick, apply → success modal, undo; pin toggle; cross-project
  proposal and accept; criteria editor; scoring; scenario compare; approval with mandatory justification.
- **Done:** each slice builds in all its apps, tests pass with no new failures, owner runs SQL and checks in the
  browser.

## f) Out of scope

- Splitting tasks, changing assignees or suggesting substitute people (D3).
- Automatic levelling on every schedule change (D5).
- Skills-based matching and hiring recommendations.
- Financial models (NPV / IRR) — financial value is a scored criterion (D7), not calculated.
- Portfolio optimisation in Planner (D10).
- Scheduled re-runs (could later use the v1352 background jobs).

## g) Further notes

- Reuse the schedule engine’s shared test vectors pattern for levelling (client preview + database authority).
- Examples follow rule 77.
