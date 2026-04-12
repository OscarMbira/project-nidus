# Project Planning Intelligence Module (v354)

**Audience:** PM, PMO, Simulator users  
**Routes (Platform):** `/pm/planning/*`, `/pmo/planning/*`  
**Routes (Simulator):** `/simulator/pm/planning/*`

## Overview

The module adds planning intelligence on top of existing Gantt, tasks, and schedules:

- **Planning Hub** — summary tiles (health, findings, scenarios, governance, micro-plans, collisions) and links to sub-modules.
- **Plan intelligence** — rule-based findings; **Run scan** evaluates tasks and dependencies.
- **Scenarios** — what-if scenarios (`plan_scenarios`, snapshots).
- **PBS / PFD** — product breakdown and flow edges.
- **Plan health** — `calculate_plan_health()` RPC writes `plan_health_scores`.
- **AI plan generator** — stores sessions in `plan_ai_sessions`; requires Edge Function `plan-ai-generate` when using live AI.
- **Executive view** — milestones and health summary.
- **Portfolio collisions** — PMO `detect_portfolio_collisions` + `plan_collision_alerts`.
- **Recovery** — `plan_recovery_options`.
- **Confidence** — `plan_confidence_forecasts`.
- **Governance gates** — `plan_governance_rules` / `plan_governance_findings`.
- **Team micro-plans** — `project_micro_plans`, activities, versions, comments.

## Project selection

Most screens use **`?projectId=`** in the URL (persisted when navigating from the Planning Hub).

## SQL

Apply migrations in order (see `SQL/`): `v451_plan_scenarios.sql` through `v463_sim_micro_plans.sql` (version numbers in repo may differ slightly from early plan drafts).

## Permissions

Seeded in `v460_planning_menu_items.sql` (and simulator menu SQL): `planning.view`, `planning.scenario.create`, `planning.microplan.view`, etc.

## Simulator parity

Simulator uses the `sim` schema (`sim.plan_*`, `sim.project_micro_plans`, …) and `practice_project_id` instead of `project_id` where applicable.

---

*Generated as part of the v354 implementation. Extend this guide as features deepen.*
