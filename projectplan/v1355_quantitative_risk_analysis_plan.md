# v1355 — Quantitative Risk Analysis — Implementation plan

**PRD:** `projectprd/v1355_quantitative_risk_analysis_PRD.md` (owner decisions D1–D12, 2026-11-22).
**Systems:** Platform (`public`) and Simulator (`sim`) in full; Planner (`public`, Planner edition) schedule-only (D11).
**Method:** test-first vertical slices (App_Guide), one per D12 step; each slice builds in all its apps, tests pass with
no new failures (suites run one at a time), is committed, and the owner runs its SQL and checks in the browser before
the next starts. SQL numbers are taken from `ls SQL` immediately before each file (rule 18.0).

## Facts this plan builds on

- `risks` (v26 +): `pre_` / `post_` probability and impact (1–5), rationale, `pre_cost_impact` / `post_cost_impact`,
  `pre_schedule_impact_days` / `post_schedule_impact_days`; `risk_probability_scales` / `risk_impact_scales`,
  `risk_matrix_thresholds`. Form: `apps/platform/src/components/risks/EnhancedRiskForm.jsx`.
- `sim.practice_risks`: probability / impact 1–5, score, level only — gains the quantified fields.
- Schedule engine: `recalculate_project_schedule` RPC (v1245) + client engine in `packages/planning` with shared test
  vectors — the simulation calls the client engine per iteration.
- Cost: `activity_cost_estimates`, `project_budget_baselines`, `cost_baselines`, `project_cost_entries` (public + sim
  twins, v417 / v629); plan budget lines `project_plan_budget_lines` / `stage_plan_budget_lines`; plan contingency
  fields `contingency_amount`, `contingency_percentage`, `management_reserve` (v205).
- Charts: existing chart library used by EVM dashboards (dataviz guidance for new charts, theme-aware).

## Engine (pure JS, `packages/planning/src/engine/qra/`)

- `distributions.js` — seeded PRNG (stored seed), triangular / PERT / uniform sampling, group correlation by shared
  draws blended by strength Low / Medium / High (D4, D7).
- `riskExposure.js` — probability band mapping (D2), EMV per risk and totals, opportunities negative (D3).
- `scheduleMonteCarlo.js` — per iteration: sample durations, apply occurring risks to linked tasks (or finish),
  run the schedule engine; collect finish dates, critical-path hits (D5, D8).
- `costMonteCarlo.js` — sample cost lines, add risk costs, scale per-day lines by simulated delay (D6).
- `results.js` — P10 / P50 / P80 / P90, chance of target, histogram / S-curve bins, tornado (rank correlation of
  driver to outcome), criticality index, contingency (D8, D9).
- `qra.worker.js` — Web Worker wrapper with progress and cancel (D11).
- Shared test vectors (`__vectors__/qra/*.json`).

## Data model (`public` + `sim` twins unless noted; RLS on; registered in `database_tables`; Planner wall)

| Change | Slice | Purpose |
|---|---|---|
| `risks` / `sim.practice_risks` columns: `pre_` / `post_probability_percent`, `pre_` / `post_cost_min` / `_ml` / `_max`, `pre_` / `post_schedule_days_min` / `_ml` / `_max`, `impact_distribution`, `qra_group_id` | 1 | Quantified risk (D2, D3, D4); backfill `_ml` from existing single values |
| `qra_settings` (org) + project override | 1 | Target confidence (default P80), default distribution (D9) |
| `qra_groups` | 2 | “Moves together” groups with strength (D7) |
| `task_duration_ranges` | 2 | Task min / ml / max days, distribution (D5) |
| `risk_task_links` | 2 | Risk ↔ task (D5) |
| `cost_line_ranges` | 3 | Cost line min / ml / max, distribution, `is_time_dependent` + daily rate (D6) |
| `qra_runs` | 2 | Run header: display ID, kind (schedule / cost / both), pre / post, iterations, seed, inputs snapshot (JSONB), summary (JSONB), created by |
| `qra_run_task_stats` | 2 | Criticality index per task |

Database functions: input validation checks (min ≤ ml ≤ max, % 1–99); `save_qra_run` (immutable once saved);
`adopt_qra_contingency` (writes plan contingency fields, audited, D9); roll-up view `qra_project_latest_run` (D10).
Admin SQL: ID generation rule for `qra_runs` (rule 16.2).

## Slice 1 — Quantified risks and EMV

Tests first: band mapping, EMV, opportunities, backfill.
- [ ] Engine `riskExposure.js` + vectors.
- [ ] SQL: risk columns (public + sim), backfill, `qra_settings`, field help seeds (+ sim aliases).
- [ ] Risk form (Platform `EnhancedRiskForm`, Simulator practice risk page): probability %, three-point cost /
      schedule ranges, distribution; EMV shown. Register list: EMV column, sort, export.
- [ ] Risk exposure dashboard tab: total EMV pre / post, top risks by EMV, clickable cards (rule 64).
- [ ] Exit: builds, tests, commit; owner SQL + browser check.

## Slice 2 — Schedule Monte Carlo

Tests first: zero-range iteration = deterministic engine; risk delay propagation; groups; percentiles; seed
repeatability.
- [ ] Engine: distributions, schedule Monte Carlo, results, worker.
- [ ] SQL: `qra_groups`, `task_duration_ranges`, `risk_task_links`, `qra_runs`, `qra_run_task_stats` (public + sim),
      registry, triggers, Planner wall + allow-list.
- [ ] Pages (routed): Risk analysis › Inputs (task ranges grid, quick % range tool, risk–task links, groups) ·
      Run (iterations, pre / post, progress, cancel) · Results (chance of target, P-values, S-curve, histogram,
      tornado, criticality) · Runs list (compare two runs). Exports (rule 38.1).
- [ ] Planner: schedule-only (task ranges, no risks). Menus + taxonomy / placement docs (70, 75); field help.
- [ ] Exit as slice 1.

## Slice 3 — Cost Monte Carlo and contingency

- [ ] Engine: cost Monte Carlo, time–cost link, combined results, contingency.
- [ ] SQL: `cost_line_ranges`; `adopt_qra_contingency`.
- [ ] Inputs: cost-line ranges grid, per-day flag, quick % range; Results: cost P-values, S-curve, tornado; contingency
      panel (recommended vs held, gap, Adopt → success modal).
- [ ] Platform + Simulator; field help; exit.

## Slice 4 — Roll-up and guide

- [ ] View `qra_project_latest_run`; programme / portfolio risk analysis cards (EMV, P80 vs budget, on-time chance,
      stale > 30 days) — clickable (rule 64).
- [ ] Optional reminder (rule 80, v1352 A1): `reminder_record_types` row telling the PM when the latest analysis is
      older than 30 days.
- [ ] Guide `Documentation/Quantitative_Risk_Analysis_v1355_Guide.md`; ROADMAP status; parity; exit.

## Risks

| Risk | Mitigation |
|---|---|
| Wrong statistics erode trust | Vectors with known answers, zero-range check against the deterministic engine, seed repeatability |
| Slow runs on large schedules | Web Worker, progress + cancel, iteration cap 20,000, performance test |
| Users confused by statistics | Plain labels (“80% chance of finishing by …”), field help (76), guide; three shapes only |
| Simulator data thinner | Practice risks gain the same fields; seed examples (rule 18.2 / 77) |
| Planner wall / allow-list drift | Re-run v1251 and regenerate the allow-list in slice 2 |

## Review

(to be completed after each slice)
