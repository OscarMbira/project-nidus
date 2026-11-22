# v1355 — Quantitative Risk Analysis — PRD

**Status:** Decisions D1–D12 settled with the owner on 2026-11-22 (interview, rules 56–60). Plan:
`projectplan/v1355_quantitative_risk_analysis_plan.md`.
**Roadmap:** R5 (RAID / risk management), R3 (planning & scheduling), R6 (cost & performance).
**Systems:** Platform and Simulator (full); Planner schedule-only analysis (D11). Admin: none.

---

## a) Problem statement

Nidus records risks **qualitatively** (a 1–5 probability × 1–5 impact score and a heat map) but cannot answer the
questions sponsors and PMOs actually ask: *how likely are we to finish by the target date?*, *how much contingency
do we need?*, *which risks drive the overrun?* Today these figures are worked out in spreadsheets or separate tools,
or guessed.

What exists (codebase, 2026-11-22):

| Area | What exists | Gap |
|---|---|---|
| Risk register (Platform) | `risks`: `pre_` / `post_` probability (1–5), impact (1–5), rationale, `pre_cost_impact` / `post_cost_impact` (one amount), `pre_schedule_impact_days` / `post_schedule_impact_days` (one number), `contingency_plan` (text); responses, mitigations, assessments history, matrix thresholds, probability / impact scales | Single-point impacts only; no probability %, no expected value, no ranges |
| Risk register (Simulator) | `sim.practice_risks`: probability / impact 1–5, score, level | No cost or schedule impact fields |
| Schedule | Critical-path engine `recalculate_project_schedule` (v1245) with shared test vectors; task durations, dependencies, calendars | Single-point durations; no uncertainty; no risk ↔ task link |
| Cost | Budgets, actuals, EVM; plan-level `contingency_amount`, `contingency_percentage`, `management_reserve` (project / stage plans) | Contingency entered by hand, not derived from risk |
| Portfolio | `portfolio_risks`, EVM / financial roll-ups | No risk-adjusted totals |

## b) Solution (shape)

1. **Quantified risks** — each risk can carry a probability % and a cost and / or schedule impact as a range
   (minimum / most likely / maximum); expected value (EMV) per risk and per project.
2. **Schedule and cost uncertainty** — optional three-point estimates on tasks and cost lines.
3. **Simulation** — a Monte Carlo run over the schedule and cost model with risks attached to the tasks / cost lines
   they affect; results as confidence levels (P50 / P80 / P90 finish date and cost), S-curves, histograms and a
   tornado chart of the biggest drivers.
4. **Contingency** — recommended contingency from the chosen confidence level, compared with what is held.

## c) User stories

1. As a risk owner, I can give a risk a probability % and a cost / schedule impact range.
2. As a PM, I can see the expected value of each risk and the total risk exposure of my project.
3. As a PM, I can add three-point estimates to tasks and cost lines.
4. As a PM, I can link a risk to the tasks or cost lines it affects.
5. As a PM, I can run a simulation and see the chance of meeting the target date and budget.
6. As a PM, I can see P50 / P80 / P90 finish dates and costs, an S-curve and a tornado chart.
7. As a sponsor / PMO, I can see recommended contingency against contingency held.
8. As a PM, I can compare results before and after responses (pre / post).
9. Simulator learners can practise the same analysis on practice risks.
10. As a PM, I can apply a quick % range to many tasks or cost lines at once.
11. As a PM, I can group risks that move together (Low / Medium / High).
12. As a PM, I can see which tasks are most often critical (criticality index).
13. As a PM, I can adopt the recommended contingency into my plan.
14. As a PMO, I can see risk exposure and confidence across a programme / portfolio and spot stale analyses.
15. As a Planner user, I can run a schedule-only analysis on task ranges.
16. As a PM, I can re-run a saved analysis and get exactly the same result (stored seed).

## d) Implementation decisions

*(settled one at a time in the interview)*

- **D1 Scope (owner, 2026-11-22): full — EMV plus schedule and cost Monte Carlo.** Quantified risks (probability %,
  impact ranges, EMV), three-point estimates on tasks and cost lines, risks linked to the tasks / cost lines they
  affect, Monte Carlo for both finish date and cost, P-values, S-curves, tornado and recommended contingency.
  Delivered in slices, EMV first.
- **D2 Probability (owner, 2026-11-22): optional %, mapped to the 1–5 band.** A risk may have an exact probability
  % (1–99), pre and post response. When given, the 1–5 score is set from the organisation’s probability scale bands
  so the heat map stays consistent. When not given, analysis uses the band’s mid-point and marks the risk “estimated
  from score”.
- **D3 Impact (owner, 2026-11-22): three-point ranges for cost and schedule.** Cost impact and schedule impact
  (working days) each as minimum / most likely / maximum, pre and post response. The existing single cost / days
  fields become the “most likely” value (kept, no data loss). Opportunities are allowed as negative impacts (savings
  or time gained).
- **D4 Distributions (owner, 2026-11-22): triangular by default, PERT optional.** Triangular is the default; PERT
  (beta) and Uniform can be chosen per item. No other shapes, no custom curves.
- **D5 Schedule model (owner, 2026-11-22): optional three-point durations, quick % ranges, risks linked to tasks.**
  Tasks may have min / most likely / max durations, or the PM applies a quick range to many tasks at once (e.g.
  −10% / +25% by task type or selection). Tasks with no range stay fixed. A risk links to one or more tasks; when it
  occurs in an iteration its schedule impact is added to those tasks and flows through dependencies. A risk with no
  task link adds to the project finish directly.
- **D6 Cost model (owner, 2026-11-22): budget lines with ranges, risk costs and a time–cost link.** Budget / cost
  lines may have min / most likely / max amounts (or a quick % range). Risk cost impacts are added when the risk
  occurs. Time-dependent cost lines (flagged “per day”, e.g. labour, site overheads) grow with the simulated delay,
  so schedule and cost results stay consistent. Lines with no range stay fixed.
- **D7 Correlation (owner, 2026-11-22): simple groups only.** Risks and ranges can be placed in a “moves together”
  group with strength Low / Medium / High (e.g. all ground-condition items). No correlation matrices.
- **D8 Results (owner, 2026-11-22): saved runs with standard outputs.** Default 5,000 iterations (1,000–20,000
  selectable) with a stored seed for an exact re-run. Outputs: chance of meeting the target date and budget;
  P10 / P50 / P80 / P90 finish date and cost; S-curves and histograms; tornado of the top drivers (risks and tasks);
  task criticality index (% of runs on the critical path); pre vs post response comparison. Each run is saved
  (inputs snapshot + summary) for trends and comparison, and exports through the shared engine (rule 38 / 38.1).
- **D9 Contingency (owner, 2026-11-22): recommend, the user adopts.** The organisation sets a target confidence
  (default P80; a project may override). Recommended cost contingency = cost at the target P-value − base budget;
  schedule contingency = finish at the target P-value − planned finish. Shown against contingency held, with the gap.
  The PM can adopt the figure into the plan’s contingency fields (success modal, audited). Never changed
  automatically.
- **D10 Roll-up (owner, 2026-11-22): latest-run summary on programme and portfolio.** Each project’s latest saved
  run feeds a programme / portfolio view: EMV totals, P80 cost vs budget, chance of on-time finish, and projects with
  no recent run (older than 30 days flagged as stale). Cards are clickable (rule 64). No combined portfolio-level
  simulation.
- **D11 Systems and engine (owner, 2026-11-22): Platform + Simulator, Planner schedule-only; browser engine.**
  Platform and Simulator get everything (Simulator practice risks gain the same quantified fields). Planner gets
  schedule-only analysis (task ranges, no risks), since the engine lives in `packages/planning`. Monte Carlo runs in
  the browser in a Web Worker, reusing the schedule engine; the database validates inputs and saves runs. No server
  compute.
- **D12 Delivery order (owner, 2026-11-22): four slices, EMV first.** (1) Quantified risks: probability %, impact
  ranges, EMV, exposure dashboard. (2) Schedule Monte Carlo: task ranges, quick ranges, risk–task links, groups,
  results, saved runs (Planner schedule-only too). (3) Cost Monte Carlo: cost-line ranges, time–cost link, combined
  results, contingency recommend / adopt. (4) Programme / portfolio roll-up and guide. Each slice in all its systems,
  tested and committed before the next.

Standing rules that apply throughout (not re-decided): routed pages, not modals (65); Audit tab (63.1); field help
(76) and regional date inputs (79); amount shorthand (36) and regional formats (68); success modal (16); list sort,
row numbers, card / table toggle and exports (38–44); clickable dashboard cards (64); theme-aware charts (28.1);
performance pass (66); RLS without bypass (42); menus via catalogue + placement (75, 70).

## e) Testing decisions

- **Pure logic (unit, Vitest, shared test vectors):** probability % ↔ 1–5 band mapping (D2); EMV and exposure with
  negative (opportunity) impacts (D3); triangular / PERT / uniform sampling — mean and percentiles within tolerance
  over many draws, same seed → same draws (D4, D8); schedule iteration equals the deterministic engine when all
  ranges are zero; risk delay flows through dependencies (D5); time-linked cost grows with delay (D6); grouped items
  move together (D7); P-values, criticality and tornado ranking on a known small model (D8); contingency arithmetic
  (D9).
- **Database (SQL test scripts in a rolled-back transaction):** range checks (min ≤ most likely ≤ max, % 1–99);
  existing single values preserved as most likely; saved runs immutable; adopt writes contingency with audit; RLS by
  organisation and role; Planner wall covers the new tables.
- **Screens (React Testing Library):** risk form ranges and EMV, quick-range tool, run page (progress, cancel), results
  charts render in light / dark, adopt contingency → success modal, roll-up cards open filtered lists.
- **Performance:** 5,000 iterations on a 500-task schedule finish in the worker without freezing the page (target
  under 15 s on a typical laptop).
- **Done:** each slice builds in all its apps, tests pass with no new failures, owner runs SQL and checks in the
  browser.

## f) Out of scope

- Portfolio-level combined simulation (D10).
- Correlation matrices and distributions beyond triangular / PERT / uniform (D4, D7).
- Probabilistic branching (alternative task paths) and conditional risks.
- Automatic contingency updates (D9).
- Server-side simulation (D11).
- Scheduled re-runs (could later use the v1352 background jobs).

## g) Further notes

- Reuse the schedule engine’s shared test vectors pattern (client preview + database authority).
- Monte Carlo results must be reproducible: a stored random seed per run.
- Examples follow rule 77.
