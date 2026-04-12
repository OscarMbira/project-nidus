# v354 — Project Planning Intelligence Module

**Date:** 2026-04-12
**Spec source:** `Documents/project_planning_module_gap_spec.md`
**SQL start version:** v449
**Systems:** Platform (public schema) + Simulator (sim schema)
**Approach:** Extend and integrate existing planning features; build net-new differentiators

---

## Executive Summary

The project already has a solid planning foundation. Rather than rebuilding what works, this plan targets the **15 strategic gaps** identified in the spec by layering intelligence, scenario planning, product-based planning, health scoring, AI generation, executive view, portfolio collision detection, and recovery planning **on top of** the existing infrastructure.

---

## What Already Exists (DO NOT Rebuild)

| Feature | Status | Key Files |
|---------|--------|-----------|
| Gantt chart | ✅ Exists | `GanttChart.jsx`, `ganttService.js` |
| Project plans | ✅ Exists | `ProjectPlanCreate/Edit/View.jsx`, `projectPlanService.js` |
| Stage plans | ✅ Exists | `StagePlanCreate/Edit/View.jsx`, `stagePlanService.js` |
| Milestones | ✅ Exists | `planMilestoneService.js` |
| Activities / schedule | ✅ Exists | `ActivityList/Detail/Sequencing.jsx`, `scheduleManagementPlanService.js` |
| WBS Builder | ✅ Exists | `WBSBuilder.jsx` (scope folder) |
| Work packages | ✅ Exists | `WorkPackageView.jsx`, `wpResourcesService.js` |
| Kanban board | ✅ Exists | `KanbanBoard.jsx` |
| Task board / calendar | ✅ Exists | `TasksBoard.jsx`, `TasksCalendar.jsx` |
| Resource capacity | ✅ Exists | `ResourceCapacity.jsx`, `pmCapacityService.js` |
| Resource conflicts | ✅ Exists | `ResourceConflicts.jsx`, `crossResourceService.js` |
| Resource utilization | ✅ Exists | `ResourceUtilization.jsx` |
| Portfolio view | ✅ Exists | `Portfolio.jsx`, `PortfolioDetail.jsx` |
| Programme view | ✅ Exists | `Programme.jsx`, `ProgrammeDetail.jsx` |

---

## What is NEW — The 11 Capability Modules to Build

| # | Capability | Maps to Spec Gap |
|---|-----------|-----------------|
| M1 | Planning Intelligence Engine | Gap 1, Gap 12 |
| M2 | Scenario Planning | Gap 2 |
| M3 | Product-Based Planning (PBS / PFD) | Gap 3 |
| M4 | Schedule Health Scoring | Gap 9 |
| M5 | AI Plan Generation | Gap 8 |
| M6 | Executive Decision Mode | Gap 10 |
| M7 | Portfolio Collision Detection | Gap 11 |
| M8 | Recovery Planning Engine | Gap 14 |
| M9 | Confidence-Based Planning | Gap 13 |
| M10 | Planning Governance Engine | Gap 15 |
| M11 | Team Micro-Plans (Sub/Mini Plans) | New — replaces team Excel plans |

> Gaps 4 (RAID integration), 5 (Resource), 6 (Financial), 7 (Hybrid) are already partially covered by existing modules (Issues, Risks, Resources, Financial, Kanban + Scrum). Those are integration tasks only — no new tables required.

---

## Data Model — New Tables Only

### Platform (public schema)

#### M1 — Planning Intelligence

**`plan_intelligence_rules`** — configurable quality rules
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| organisation_id | uuid FK | |
| rule_code | text | e.g. `missing_predecessor`, `negative_float` |
| rule_name | text | Human-readable name |
| rule_description | text | What the rule checks |
| severity | text | `warning` / `error` / `info` |
| is_active | boolean | Toggle per org |
| applies_to | text | `task` / `milestone` / `schedule` / `portfolio` |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**`plan_intelligence_findings`** — diagnostic results per plan scan
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| project_id | uuid FK → projects | |
| rule_id | uuid FK → plan_intelligence_rules | |
| task_id | uuid FK → tasks (nullable) | Task that triggered the finding |
| finding_text | text | Human-readable explanation e.g. "Task has no predecessor..." |
| severity | text | Copied from rule at scan time |
| status | text | `open` / `acknowledged` / `resolved` |
| scanned_at | timestamptz | When the scan ran |
| resolved_at | timestamptz | |
| resolved_by | uuid FK → profiles | |

#### M2 — Scenario Planning

**`plan_scenarios`** — what-if schedule scenarios per project
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| project_id | uuid FK → projects | |
| organisation_id | uuid FK | |
| name | text | e.g. "Best-Case Plan", "Vendor Delay Scenario" |
| scenario_type | text | `best_case` / `most_likely` / `worst_case` / `recovery` / `accelerated` / `constrained_resource` / `custom` |
| description | text | |
| status | text | `draft` / `active` / `promoted` / `archived` |
| is_baseline | boolean | TRUE = this scenario is the approved baseline |
| promoted_from_id | uuid FK → plan_scenarios (nullable) | If promoted from another scenario |
| promoted_at | timestamptz | |
| promoted_by | uuid FK → profiles | |
| approved_by | uuid FK → profiles | |
| approved_at | timestamptz | |
| milestone_delta_days | integer | Net milestone movement vs baseline |
| cost_delta | numeric | Net cost impact vs baseline |
| is_draft | boolean | On-hold queue |
| draft_expires_at | timestamptz | |
| created_by | uuid FK → profiles | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**`plan_scenario_task_snapshots`** — frozen copy of tasks for a scenario
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| scenario_id | uuid FK → plan_scenarios | |
| source_task_id | uuid FK → tasks | Original task |
| task_name | text | Snapshot at time of clone |
| start_date | date | |
| end_date | date | |
| duration_days | integer | |
| progress_percentage | integer | |
| assigned_to | uuid FK → profiles | |
| is_milestone | boolean | |
| is_critical_path | boolean | |
| dependency_type | text | Snapshot of dependency logic |
| confidence_level | integer | 0–100 |
| notes | text | Scenario-specific overrides |
| created_at | timestamptz | |

#### M3 — Product-Based Planning

**`plan_pbs_nodes`** — Product Breakdown Structure tree
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| project_id | uuid FK → projects | |
| parent_id | uuid FK → plan_pbs_nodes (nullable) | NULL = root node |
| node_code | text | e.g. `P1.2.3` |
| name | text | Product / deliverable name |
| description | text | |
| product_type | text | `product` / `sub-product` / `component` |
| quality_criteria | text | What good looks like |
| acceptance_criteria | text | Sign-off conditions |
| status | text | `not_started` / `in_progress` / `under_review` / `approved` / `rejected` |
| owner_id | uuid FK → profiles | |
| approval_required | boolean | |
| approved_by | uuid FK → profiles | |
| approved_at | timestamptz | |
| linked_work_package_id | uuid FK → work_packages (nullable) | |
| linked_milestone_id | uuid (nullable) | |
| sort_order | integer | |
| created_by | uuid FK → profiles | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**`plan_pfd_edges`** — Product Flow Diagram connections between PBS nodes
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| project_id | uuid FK → projects | |
| from_node_id | uuid FK → plan_pbs_nodes | |
| to_node_id | uuid FK → plan_pbs_nodes | |
| relationship_type | text | `produces` / `requires` / `approves` / `feeds_into` |
| notes | text | |
| created_at | timestamptz | |

#### M4 — Schedule Health Scoring

**`plan_health_scores`** — time-series health score per project
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| project_id | uuid FK → projects | |
| scored_at | timestamptz | |
| overall_score | integer | 0–100 |
| logic_quality | integer | 0–100 |
| dependency_completeness | integer | 0–100 |
| milestone_realism | integer | 0–100 |
| critical_path_stability | integer | 0–100 |
| baseline_discipline | integer | 0–100 |
| resource_feasibility | integer | 0–100 |
| scope_traceability | integer | 0–100 |
| risk_exposure | integer | 0–100 |
| change_pressure | integer | 0–100 |
| governance_readiness | integer | 0–100 |
| score_delta | integer | Change from previous scan (positive = improved) |
| summary_notes | text | AI / rules-generated summary |
| findings_count | integer | Number of open intelligence findings |
| created_by | uuid FK → profiles (nullable) | NULL = system-triggered |

#### M5 — AI Plan Generation

**`plan_ai_sessions`** — record of each AI generation request
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| project_id | uuid FK → projects | |
| organisation_id | uuid FK | |
| prompt_text | text | User's natural-language input |
| industry_template | text | e.g. `banking`, `software`, `infrastructure` |
| generated_phases | jsonb | Array of { name, duration, deliverables } |
| generated_milestones | jsonb | Array of milestones |
| generated_tasks | jsonb | Array of tasks with dependencies |
| generated_risks | jsonb | Starter RAID set |
| ai_assumptions | text | Assumptions the AI applied |
| ai_explanation | text | Why durations/tasks were suggested |
| status | text | `generated` / `accepted` / `modified` / `rejected` |
| accepted_at | timestamptz | |
| accepted_by | uuid FK → profiles | |
| created_by | uuid FK → profiles | |
| created_at | timestamptz | |

#### M6 — Executive Decision Mode

No new table needed. Executive view is a **read-only aggregated view** built from existing tables (milestones, health scores, risks, costs, scenarios). A `user_preferences` JSON field stores the `planning_view_mode` preference (`planner` vs `executive`).

#### M7 — Portfolio Collision Detection

**`plan_collision_alerts`** — cross-project conflicts detected
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| organisation_id | uuid FK | |
| collision_type | text | `resource_overlap` / `milestone_clash` / `environment_clash` / `vendor_bottleneck` / `budget_concentration` |
| project_a_id | uuid FK → projects | |
| project_b_id | uuid FK → projects (nullable) | NULL = single-project alert |
| resource_id | uuid FK → profiles (nullable) | |
| vendor_id | uuid (nullable) | |
| conflict_start_date | date | |
| conflict_end_date | date | |
| description | text | Human-readable explanation |
| severity | text | `info` / `warning` / `critical` |
| status | text | `open` / `acknowledged` / `resolved` |
| detected_at | timestamptz | |
| resolved_at | timestamptz | |
| resolved_by | uuid FK → profiles | |

#### M8 — Recovery Planning

**`plan_recovery_options`** — suggested recovery strategies per project
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| project_id | uuid FK → projects | |
| trigger_type | text | `milestone_slippage` / `resource_overload` / `budget_overrun` / `risk_materialised` |
| trigger_source_id | uuid (nullable) | ID of the milestone / risk / task that triggered this |
| strategy | text | `fast_track` / `crash` / `scope_defer` / `resequence` / `parallelise` / `wave_split` / `alternate_resource` |
| strategy_description | text | Full explanation of the recovery approach |
| schedule_saving_days | integer | Estimated days recovered |
| cost_impact | numeric | Estimated additional cost |
| risk_impact | text | Risk consequences of the strategy |
| requires_approval | boolean | If governance approval is needed |
| status | text | `suggested` / `under_review` / `approved` / `applied` / `rejected` |
| approved_by | uuid FK → profiles | |
| approved_at | timestamptz | |
| generated_by_ai | boolean | TRUE = AI-generated, FALSE = manually entered |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### M9 — Confidence-Based Planning

**`plan_confidence_forecasts`** — probability-based milestone delivery estimates
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| project_id | uuid FK → projects | |
| milestone_id | uuid (nullable) | |
| task_id | uuid FK → tasks (nullable) | |
| confidence_pct | integer | 0–100 (e.g. 70 = "70% confidence on-time") |
| optimistic_date | date | Best-case |
| likely_date | date | Most probable |
| pessimistic_date | date | Worst-case |
| uncertainty_band_days | integer | ± days around likely date |
| basis_notes | text | What the confidence is based on |
| created_by | uuid FK → profiles | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### M10 — Planning Governance Engine

**`plan_governance_rules`** — configurable gate requirements by project type
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| organisation_id | uuid FK | |
| project_type | text | e.g. `software`, `infrastructure`, `transformation` |
| gate_name | text | e.g. `Baseline Approval` |
| gate_description | text | |
| required_before | text | `execution_start` / `go_live` / `project_close` |
| check_type | text | `milestone_exists` / `risk_review_done` / `approval_obtained` / `readiness_gate` |
| is_mandatory | boolean | |
| is_active | boolean | |
| created_at | timestamptz | |

**`plan_governance_findings`** — gate compliance status per project
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| project_id | uuid FK → projects | |
| rule_id | uuid FK → plan_governance_rules | |
| status | text | `pending` / `compliant` / `non_compliant` / `waived` |
| waived_by | uuid FK → profiles | |
| waived_at | timestamptz | |
| waiver_reason | text | |
| last_checked_at | timestamptz | |

#### M11 — Team Micro-Plans (Sub / Mini / Workstream Plans)

**`project_micro_plans`** — plan header for any role-owned sub-plan

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| project_id | uuid FK → projects | |
| organisation_id | uuid FK | |
| plan_reference | text | Auto-generated e.g. `MPL-001` |
| plan_name | text | e.g. "QA Test Plan — Phase 2", "Backend Team Delivery Plan" |
| plan_type | text | `team_delivery` / `quality` / `risk_response` / `test` / `procurement` / `communications` / `stakeholder_engagement` / `change_management` / `resource` / `custom` |
| description | text | Purpose and context |
| objectives | text | What this plan aims to achieve |
| scope_in | text | Activities that are in scope |
| scope_out | text | Activities explicitly excluded |
| assumptions | text | Key planning assumptions |
| constraints | text | Known constraints (time, resources, budget) |
| responsible_team | text | Team or group responsible (free text) |
| owner_id | uuid FK → profiles | Plan owner (creator or delegated) |
| approver_id | uuid FK → profiles (nullable) | Who approved it |
| approved_at | timestamptz | |
| approval_notes | text | Approver's sign-off notes |
| status | text | `draft` / `active` / `under_review` / `approved` / `superseded` / `archived` |
| version_number | text | e.g. `1.0`, `1.1`, `2.0` |
| review_frequency | text | `daily` / `weekly` / `bi_weekly` / `monthly` / `as_needed` |
| next_review_date | date | |
| linked_master_plan_id | uuid FK → project_plans (nullable) | Parent project plan |
| linked_stage_plan_id | uuid FK → stage_plans (nullable) | Parent stage plan |
| linked_work_package_id | uuid FK (nullable) | Linked work package |
| overall_rag | text | `green` / `amber` / `red` — plan-level RAG |
| overall_progress_pct | integer | Computed from activities |
| tags | text[] | |
| is_draft | boolean | On-hold queue |
| draft_expires_at | timestamptz | |
| is_deleted | boolean | Soft delete |
| created_by | uuid FK → profiles | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

> **Unique constraint:** `UNIQUE(project_id, plan_reference)`
> Auto-generate `plan_reference` via trigger: `MPL-001`, `MPL-002`… per project.

---

**`micro_plan_activities`** — detailed activity rows within a micro-plan

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| micro_plan_id | uuid FK → project_micro_plans | |
| project_id | uuid FK → projects | Denormalised for easy querying |
| activity_reference | text | Auto-generated e.g. `MPA-001` per plan |
| activity_name | text | |
| description | text | |
| category | text | `planning` / `execution` / `review` / `sign_off` / `reporting` / `monitoring` / `quality_check` / `risk_response` / `testing` / `procurement` / `communication` / `training` / `other` |
| priority | text | `critical` / `high` / `medium` / `low` |
| owner_id | uuid FK → profiles | Primary responsible person |
| supporting_member_ids | uuid[] | Array of additional team member profile IDs |
| planned_start_date | date | |
| planned_end_date | date | |
| planned_duration_days | integer | Working days |
| planned_effort_days | numeric | Person-days of effort |
| actual_start_date | date | |
| actual_end_date | date | |
| actual_duration_days | integer | |
| actual_effort_days | numeric | |
| schedule_variance_days | integer | `actual_duration_days - planned_duration_days` (computed) |
| effort_variance_days | numeric | `actual_effort_days - planned_effort_days` (computed) |
| progress_pct | integer | 0–100 |
| status | text | `not_started` / `in_progress` / `on_hold` / `completed` / `cancelled` / `deferred` |
| rag_status | text | `green` / `amber` / `red` |
| is_milestone | boolean | Flag this as a micro-plan milestone |
| is_critical | boolean | On the critical path of this sub-plan |
| deliverable_output | text | What artefact / output this activity produces |
| quality_check_required | boolean | |
| quality_check_status | text | `not_required` / `pending` / `passed` / `failed` |
| quality_check_notes | text | |
| entry_criteria | text | What must be true before this activity starts |
| exit_criteria | text | What must be true for this activity to be complete |
| risk_flag | boolean | Linked to a risk |
| linked_risk_id | uuid FK → risks (nullable) | |
| issue_flag | boolean | Linked to an issue |
| linked_issue_id | uuid FK → issues (nullable) | |
| linked_master_task_id | uuid FK → tasks (nullable) | Link to master project plan task |
| predecessor_activity_id | uuid FK → micro_plan_activities (nullable) | Dependency within same micro-plan |
| dependency_type | text | `FS` / `SS` / `FF` / `SF` (default `FS`) |
| lag_days | integer | Lag/lead on dependency (positive = lag, negative = lead) |
| notes | text | |
| tags | text[] | |
| attachments | jsonb | Array of { name, url, type } |
| sort_order | integer | Manual ordering within plan |
| is_deleted | boolean | |
| created_by | uuid FK → profiles | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

> **Unique constraint:** `UNIQUE(micro_plan_id, activity_reference)`
> Auto-generate `activity_reference` via trigger: `MPA-001`, `MPA-002`… per micro-plan.

---

**`micro_plan_versions`** — immutable version snapshots (on each approval / major update)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| micro_plan_id | uuid FK → project_micro_plans | |
| version_number | text | e.g. `1.0` — copied from plan at snapshot time |
| snapshot_data | jsonb | Full copy of plan header + all activities at that point |
| change_summary | text | What changed in this version |
| created_by | uuid FK → profiles | Who approved / published this version |
| created_at | timestamptz | |

> Append-only — no rows ever updated or deleted. Provides a full version history and "restore previous version" capability.

---

**`micro_plan_comments`** — activity-level or plan-level comments / update log

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| micro_plan_id | uuid FK → project_micro_plans | |
| activity_id | uuid FK → micro_plan_activities (nullable) | NULL = plan-level comment |
| author_id | uuid FK → profiles | |
| comment_text | text | |
| is_status_update | boolean | TRUE = a formal status update entry |
| created_at | timestamptz | |
| updated_at | timestamptz | |

---

### Plan Types Explained

| Plan Type | Typical Owner | Typical Activities |
|-----------|--------------|-------------------|
| `team_delivery` | Team Manager / Team Lead | Task breakdown for team's deliverables, daily/weekly tracking |
| `quality` | QA Lead | Reviews, inspections, audits, quality gates, non-conformance tracking |
| `risk_response` | Risk Manager / Member | Mitigation tasks, contingency activities, monitoring checkpoints |
| `test` | Test Lead / QA | Test phases, test cycles, environments, entry/exit criteria |
| `procurement` | PM / Procurement Lead | Vendor activities, contract milestones, procurement lead times |
| `communications` | Comms Manager / PM | Communication events, audience, channel, frequency |
| `stakeholder_engagement` | PM / PMO | Engagement activities per stakeholder group |
| `change_management` | Change Manager | Change adoption activities, training, readiness checks |
| `resource` | Team Manager | Detailed resource allocation, skill mapping, availability planning |
| `custom` | Any role | Free-form plan for any other purpose |

---

### Simulator (sim schema)

Mirror all new tables in `sim` schema:
- `sim.plan_scenarios` + `sim.plan_scenario_task_snapshots`
- `sim.plan_pbs_nodes` + `sim.plan_pfd_edges`
- `sim.plan_health_scores`
- `sim.plan_intelligence_rules` + `sim.plan_intelligence_findings`
- `sim.plan_recovery_options`
- `sim.plan_confidence_forecasts`
- `sim.plan_governance_rules` + `sim.plan_governance_findings`
- `sim.plan_ai_sessions`
- `sim.plan_collision_alerts`

All FK to `sim.practice_projects` instead of `projects`.

---

## SQL Files

| File | Contents |
|------|----------|
| `v449_plan_scenarios.sql` | `plan_scenarios` + `plan_scenario_task_snapshots` + RLS + indexes + DB registry |
| `v450_plan_intelligence.sql` | `plan_intelligence_rules` + `plan_intelligence_findings` + RLS + seed rules (15 standard checks) |
| `v451_plan_health_scores.sql` | `plan_health_scores` + RLS + indexes |
| `v452_plan_pbs_pfd.sql` | `plan_pbs_nodes` + `plan_pfd_edges` + RLS + indexes |
| `v453_plan_ai_sessions.sql` | `plan_ai_sessions` + RLS |
| `v454_plan_recovery.sql` | `plan_recovery_options` + RLS |
| `v455_plan_confidence.sql` | `plan_confidence_forecasts` + RLS |
| `v456_plan_governance.sql` | `plan_governance_rules` + `plan_governance_findings` + RLS + seed rules |
| `v457_plan_collision_alerts.sql` | `plan_collision_alerts` + RLS + indexes |
| `v458_planning_menu_items.sql` | All permissions + menu items + role assignments |
| `v459_sim_planning_tables.sql` | All `sim.*` mirror tables + RLS |
| `v460_sim_planning_menu_items.sql` | Sim permissions + menu items |
| `v461_micro_plans.sql` | `project_micro_plans` + `micro_plan_activities` + `micro_plan_versions` + `micro_plan_comments` + auto-reference triggers + RLS + indexes + DB registry |
| `v462_sim_micro_plans.sql` | `sim.*` mirror tables for all four micro-plan tables + RLS + DB registry |

---

## Role Access Matrix

| Role | Intelligence | Scenarios | PBS/PFD | Health Score | AI Generator | Executive Mode | Portfolio Collision | Recovery | Governance | Micro-Plans |
|------|-------------|-----------|---------|-------------|-------------|---------------|--------------------|---------|-----------|-----------| 
| System Admin | Full | Full | Full | Full | Full | Full | Full | Full | Full | Full (all plans) |
| PMO Admin | Read + Config | Full | Read | Read | Use | Full | Full | Read | Full Config | Read all + approve |
| Portfolio Manager | Read | Read + Compare | Read | Read | — | Full | Full | Read | Read | Read all |
| Programme Manager | Read | Read + Compare | Read | Read | — | Full | Read | Read | Read | Read all |
| Project Manager | Read | Full (own) | Full (own) | Read (own) | Use (own) | Full | Read | Full (own) | Read | Full CRUD all types (own project) + approve |
| Team Manager / Lead | Read | Read (own) | Read + Edit (own) | Read (own) | — | — | — | Read (own) | Read | Full CRUD (own plans); Read other plans same project |
| Project Assurance | Read | Read | Read | Read | — | — | — | Read | Read | Read all (own project) |
| QA | Read | Read | Read | Read | — | — | — | — | Read | Full CRUD (quality + test plans); Read others |
| Risk Members | Read | Read | Read | Read | — | — | — | Read | Read | Full CRUD (risk_response plans); Read others |
| Team Member | Read | — | Read | — | — | — | — | — | — | Create + edit own plans; Read others (own project) |
| Stakeholder | — | — | — | — | — | Exec only | — | — | — | Read approved plans only |

### Permissions to create
| Permission Code | Description |
|-----------------|-------------|
| `planning.view` | View all planning intelligence features |
| `planning.intelligence.manage` | Configure intelligence rules (PMO/Admin) |
| `planning.scenario.create` | Create scenarios |
| `planning.scenario.promote` | Promote scenario to baseline |
| `planning.pbs.edit` | Create/edit PBS nodes |
| `planning.health.view` | View health scores |
| `planning.ai.use` | Use AI plan generator |
| `planning.executive.view` | Access executive decision mode |
| `planning.collision.view` | View portfolio collision alerts |
| `planning.recovery.manage` | Create/manage recovery options |
| `planning.governance.config` | Configure governance rules |
| `planning.confidence.edit` | Set confidence values on tasks/milestones |
| `planning.microplan.view` | View micro-plans in a project |
| `planning.microplan.create` | Create a new micro-plan |
| `planning.microplan.edit` | Edit own micro-plan |
| `planning.microplan.edit_any` | Edit any micro-plan in the project (PM / Admin) |
| `planning.microplan.delete` | Delete / archive own micro-plan |
| `planning.microplan.approve` | Approve and version-stamp a micro-plan (PM / PMO) |

---

## Frontend File Structure (New Files Only)

```
src/
  pages/
    planning/
      PlanningHub.jsx                  # Module home — links to all 10 sub-modules
      intelligence/
        PlanningIntelligenceDashboard.jsx  # M1: findings list, rule config
      scenarios/
        ScenarioList.jsx               # M2: list of scenarios for a project
        ScenarioForm.jsx               # M2: create/clone/edit scenario (multi-step)
        ScenarioComparison.jsx         # M2: side-by-side scenario diff
      pbs/
        PBSBuilder.jsx                 # M3: drag-and-drop PBS tree editor
        PFDView.jsx                    # M3: product flow diagram (node-edge canvas)
      health/
        PlanHealthDashboard.jsx        # M4: score cards, trend chart, dimension breakdown
      ai/
        AIPlanGenerator.jsx            # M5: natural-language wizard → generated plan review
      executive/
        ExecutivePlanView.jsx          # M6: executive mode — milestones, confidence, RAG
      portfolio/
        PortfolioCollisionDashboard.jsx # M7: heatmaps + conflict list
      recovery/
        RecoveryPlanningView.jsx       # M8: triggered options + simulation
      confidence/
        ConfidenceForecastView.jsx     # M9: uncertainty bands per milestone/task
      governance/
        GovernanceGateChecklist.jsx    # M10: gate status per project

    # Simulator mirrors
    sim/
      planning/
        SimPlanningHub.jsx
        intelligence/
          SimPlanningIntelligenceDashboard.jsx
        scenarios/
          SimScenarioList.jsx
          SimScenarioComparison.jsx
        pbs/
          SimPBSBuilder.jsx
        health/
          SimPlanHealthDashboard.jsx
        ai/
          SimAIPlanGenerator.jsx
        executive/
          SimExecutivePlanView.jsx
        recovery/
          SimRecoveryPlanningView.jsx
        governance/
          SimGovernanceGateChecklist.jsx

  services/
    planIntelligenceService.js         # M1: run scans, get findings, ack findings
    planScenarioService.js             # M2: scenario CRUD, clone, compare, promote
    planPBSService.js                  # M3: PBS node CRUD, PFD edge CRUD
    planHealthScoreService.js          # M4: score calculation, history, trend
    planAIService.js                   # M5: generate plan via Claude API, save session
    planCollisionService.js            # M7: detect and query cross-project conflicts
    planRecoveryService.js             # M8: suggest and apply recovery strategies
    planConfidenceService.js           # M9: forecast CRUD, uncertainty calculation
    planGovernanceService.js           # M10: gate evaluation, waiver management

    microPlanService.js                # M11: micro-plan CRUD, activity CRUD, versioning, approval

    sim/
      simPlanIntelligenceService.js
      simPlanScenarioService.js
      simPlanPBSService.js
      simPlanHealthScoreService.js
      simPlanAIService.js
      simPlanRecoveryService.js
      simPlanGovernanceService.js
      simMicroPlanService.js           # M11 sim mirror

  components/
    planning/
      PlanHealthScoreCard.jsx          # Score widget (used in project dashboard)
      PlanningFindingsBadge.jsx        # Count badge for open findings
      ScenarioCard.jsx                 # Card for a single scenario
      ScenarioCompareRow.jsx           # Row in the comparison grid
      PBSNodeCard.jsx                  # Card for a PBS node
      PBSTreeView.jsx                  # Recursive tree render of PBS
      ConfidenceBand.jsx               # Visual uncertainty band widget
      RecoveryOptionCard.jsx           # Card for a recovery strategy
      GovernanceGateRow.jsx            # Single gate row (compliant/non-compliant badge)
      ExecutiveRAGCard.jsx             # RAG status card for exec mode
      CollisionHeatmap.jsx             # Portfolio collision heatmap
      AIGeneratorStepper.jsx           # Step indicator for AI wizard
      MicroPlanCard.jsx                # Card view for a single micro-plan
      MicroPlanActivityRow.jsx         # Row in activity table (with inline edit)
      MicroPlanStatusBadge.jsx         # Status + RAG badge component
      MicroPlanVersionTag.jsx          # Version number + approved badge
      MicroPlanActivityForm.jsx        # Inline / modal form for activity CRUD

  pages/
    planning/
      microplans/
        MicroPlanList.jsx              # All micro-plans for a project (all roles can see)
        MicroPlanForm.jsx              # Create / edit micro-plan header (multi-step modal)
        MicroPlanDetail.jsx            # Full plan view: header info + activity table + comments
        MicroPlanActivityDetail.jsx    # Expanded single-activity view / edit
        MicroPlanVersionHistory.jsx    # Version timeline — view/restore previous versions
        MicroPlanDraftQueue.jsx        # On-hold / draft plans for current user

    # Simulator mirrors
    sim/
      planning/
        microplans/
          SimMicroPlanList.jsx
          SimMicroPlanForm.jsx
          SimMicroPlanDetail.jsx
```

---

## Implementation Phases & Todo List

> **Note:** Each Phase will generate a detailed sub-plan if the scope warrants it. This master plan tracks phase-level progress.

### Implementation status (2026-04-12)

| Phase | Status | Notes |
|-------|--------|--------|
| **1 — Database** | **Done** | SQL files exist as `v451_plan_scenarios.sql` … `v463_sim_micro_plans.sql` (sequence differs from early draft numbering in §SQL Files). |
| **2 — Platform services** | **Done** | All planned service modules under `src/services/` (+ `microPlanService.js`). |
| **3 — Pages & components** | **Done (MVP)** | Hub, intelligence, scenarios, PBS, health, AI, executive, collisions, recovery, confidence, governance, micro-plans + drafts; shared `PlanningProjectBar`, badges, health card. |
| **4 — Simulator services** | **Done** | `src/services/sim/simPlan*.js`, `simMicroPlanService.js`. |
| **5 — Menus & routes** | **Done (partial)** | `pmDashboardMenuConfig`, `pmoMenuConfig`, `simulatorPMMenuConfig`; `App.jsx` routes for `/pm/planning/*`, `/pmo/planning/*`, `/simulator/pm/planning/*`. **Not done:** `pmMenuConfig` `/platform/planning/*`; `simulatorPMOMenuConfig` / `simulatorMenuConfig` have no planning entries (optional). |
| **6 — Integration** | **Done (MVP)** | `ProjectPlanningOverview` on project detail; sidebar findings badge; Plans executive link; Gantt confidence strip; recovery deep links (timeline, risks); work package micro-plan count + draft create; intelligence rule for stale micro-plan activities (`v464` SQL). |
| **7 — Unit tests** | **Done (MVP)** | Plus `planHealthScoreService`, `planPBSService`, `planAIService`, `planGovernanceService`, `microPlanService` tests. |
| **8 — Documentation** | **Done** | `Documentation/v354_Project_Planning_Module_Guide.md`. |

**Checklist policy (2026-04-12 refresh):** Phases **1–2, 4–5, 7–8** use `[x]` where delivered. **Phase 3** marks **implemented pages/components** `[x]`; items **not** built as separate files or full UX are listed under [Deferred / simplified](#deferred--simplified-not-built-as-specified) below. **Phase 6** was already marked complete.

**SQL file names (actual repo sequence):** `v451_plan_scenarios.sql` → `v452_plan_intelligence.sql` → `v453_plan_health_scores.sql` → `v454_plan_pbs_pfd.sql` → `v455_plan_ai_sessions.sql` → `v456_plan_recovery.sql` → `v457_plan_confidence.sql` → `v458_plan_governance.sql` → `v459_plan_collision_alerts.sql` → `v460_planning_menu_items.sql` → `v461_sim_planning_tables.sql` → `v462_micro_plans.sql` → `v463_sim_micro_plans.sql` → `v464_plan_intelligence_micro_plan_stale_rule.sql` → optional seeds `v465_planning_module_seed_data.sql`, `v466_sim_planning_module_seed_data.sql`.

---

### Phase 1 — Database (SQL Migrations)

- [x] **1.1** `v451_plan_scenarios.sql` — `plan_scenarios`, `plan_scenario_task_snapshots`, `clone_scenario()`, RLS, indexes, registry
- [x] **1.2** `v452_plan_intelligence.sql` — rules + findings, seeds, RLS, registry
- [x] **1.3** `v453_plan_health_scores.sql` — scores + `calculate_plan_health()`, RLS, registry
- [x] **1.4** `v454_plan_pbs_pfd.sql` — PBS nodes + PFD edges, node_code trigger, RLS, registry *(no separate “closure table”; tree via `parent_id`)*
- [x] **1.5** `v455_plan_ai_sessions.sql` — AI sessions, RLS, registry
- [x] **1.6** `v456_plan_recovery.sql` — recovery options, RLS, registry
- [x] **1.7** `v457_plan_confidence.sql` — confidence forecasts, RLS, registry
- [x] **1.8** `v458_plan_governance.sql` — governance rules + findings, seeds, RLS, registry
- [x] **1.9** `v459_plan_collision_alerts.sql` — alerts + `detect_portfolio_collisions()`, RLS, registry
- [x] **1.10** `v460_planning_menu_items.sql` — permissions + menu items (replaces early draft label `v458_planning_menu_items.sql`)
- [x] **1.11** `v461_sim_planning_tables.sql` — sim mirrors + rule seeds + RLS *(replaces early draft `v459_sim_planning_tables.sql`)*
- [x] **1.12** *(merged into 1.10/1.11)* — Simulator menu items covered by `v460` + sim menu configs; no separate `v460_sim_planning_menu_items.sql` file
- [x] **1.13** `v462_micro_plans.sql` — platform micro-plans + activities + versions + comments, triggers, RLS, registry
- [x] **1.14** `v463_sim_micro_plans.sql` — sim micro-plan mirrors, triggers, RLS, registry
- [x] **1.15** `v464_plan_intelligence_micro_plan_stale_rule.sql` — `micro_plan_activity_stale` rule (Phase 6.11)
- [x] **1.16** *(optional)* `v465_planning_module_seed_data.sql`, `v466_sim_planning_module_seed_data.sql` — logical seed data for QA

---

### Phase 2 — Service Layer (Platform)

- [x] **2.1** Create `src/services/planIntelligenceService.js`
  - `runIntelligenceScan(projectId)` — evaluates all active rules, upserts findings
  - `getFindings(projectId, filters)` — list findings with rule info joined
  - `acknowledgeFindings(ids)` — bulk acknowledge
  - `resolveFindings(ids)` — bulk resolve
  - `getIntelligenceRules(orgId)` — list all rules
  - `toggleRule(ruleId, isActive)` — PMO: enable/disable a rule for the org

- [x] **2.2** Create `src/services/planScenarioService.js`
  - `getScenarios(projectId)` — all scenarios for a project
  - `getScenario(id)` — single scenario with task snapshots
  - `createScenario(data)` — new scenario (blank or from active baseline)
  - `cloneScenario(scenarioId, newName)` — calls `clone_scenario()` DB function
  - `updateScenario(id, data)` — edit metadata
  - `compareScenarios(idA, idB)` — returns diff: milestone delta, cost delta, task changes
  - `promoteToBaseline(scenarioId, approverId)` — marks scenario as baseline, archives previous
  - `deleteScenario(id)` — soft delete / archive

- [x] **2.3** Create `src/services/planPBSService.js`
  - `getPBSTree(projectId)` — full tree with children nested
  - `createPBSNode(data)` — add a node; auto-generates code via trigger
  - `updatePBSNode(id, data)` — edit node
  - `deletePBSNode(id)` — delete (cascades to children if leaf, blocks if has children)
  - `getPFDEdges(projectId)` — all flow diagram edges
  - `createPFDEdge(data)` — add edge
  - `deletePFDEdge(id)` — remove edge
  - `approveProduct(nodeId, approverId)` — stamps `approved_by` + `approved_at`

- [x] **2.4** Create `src/services/planHealthScoreService.js`
  - `calculateScore(projectId)` — calls `calculate_plan_health()` DB function, saves result
  - `getScoreHistory(projectId, limit)` — last N score records for trend chart
  - `getLatestScore(projectId)` — most recent score record
  - `getPortfolioScores(orgId)` — latest score per project for portfolio view

- [x] **2.5** Create `src/services/planAIService.js`
  - `generatePlan(prompt, industryTemplate, projectId)` — calls Claude API, parses JSON output, saves to `plan_ai_sessions`
  - `acceptGeneratedPlan(sessionId)` — creates tasks, milestones, phases from the AI session data
  - `getAISessions(projectId)` — history of AI generation attempts
  - Prompt includes assumption logging and explanation fields in the response schema

- [x] **2.6** Create `src/services/planCollisionService.js`
  - `detectCollisions(orgId)` — calls `detect_portfolio_collisions()` DB function
  - `getCollisionAlerts(orgId, filters)` — list with severity + type filters
  - `acknowledgeAlert(id)` — mark as acknowledged
  - `resolveAlert(id)` — mark resolved

- [x] **2.7** Create `src/services/planRecoveryService.js`
  - `getRecoveryOptions(projectId)` — all options for a project
  - `createRecoveryOption(data)` — manual option
  - `suggestRecovery(projectId, triggerId, triggerType)` — AI-assisted suggestions saved to table
  - `applyRecovery(id)` — marks as applied; logs in audit
  - `approveRecovery(id, approverId)` — governance approval

- [x] **2.8** Create `src/services/planConfidenceService.js`
  - `getConfidenceForecasts(projectId)` — all forecasts
  - `setConfidence(data)` — upsert confidence record for task or milestone
  - `getProjectConfidenceSummary(projectId)` — aggregated confidence across milestones

- [x] **2.9** Create `src/services/planGovernanceService.js`
  - `evaluateGates(projectId)` — scans all rules for project type, upserts findings
  - `getGovernanceFindings(projectId)` — gate status list
  - `waiveGate(findingId, reason, waivedBy)` — log waiver
  - `getGovernanceRules(orgId, projectType)` — list applicable rules

- [x] **2.10** Create `src/services/microPlanService.js`
  - **Plan CRUD:**
  - `getMicroPlans(projectId, filters)` — all plans for a project (filter by type / status / owner)
  - `getMicroPlan(id)` — single plan with activities, comments, version history
  - `createMicroPlan(data)` — create plan header; auto-generates `plan_reference`
  - `updateMicroPlan(id, data)` — update header fields
  - `deleteMicroPlan(id)` — soft delete (plan owner + PM/Admin only)
  - `approveMicroPlan(id, approverId, notes)` — sets `status = approved`, bumps `version_number`, snapshots into `micro_plan_versions`
  - `submitForReview(id)` — sets `status = under_review`; notifies PM/PMO
  - `saveDraft(id)` — sets `is_draft = true`, `draft_expires_at`
  - `getDraftPlans(userId)` — on-hold plans for current user
  - `getVersionHistory(microPlanId)` — all version snapshots ordered by date
  - `restoreVersion(microPlanId, versionId)` — restores snapshot data into current plan and bumps version
  - **Activity CRUD:**
  - `getActivities(microPlanId)` — all activities for a plan
  - `createActivity(data)` — add activity; auto-generates `activity_reference`
  - `updateActivity(id, data)` — edit activity (triggers plan progress recalculation)
  - `deleteActivity(id)` — soft delete
  - `bulkCreateActivities(microPlanId, rows)` — batch insert from CSV/Excel import
  - `reorderActivities(microPlanId, orderedIds)` — update `sort_order` for drag-and-drop
  - `updateActivityProgress(id, progressPct, ragStatus)` — quick progress update
  - **Comments:**
  - `getComments(microPlanId, activityId)` — comments for plan or specific activity
  - `addComment(data)` — add comment / status update
  - `deleteComment(id)` — own comments only
  - **Export:**
  - `exportMicroPlan(id, format)` — delegates to `exportUtils`; exports header + all activities
  - **Stats:**
  - `getMicroPlanSummary(projectId)` — count by type, status, overall progress across all plans

---

### Phase 3 — Platform Pages & Components

**Delivered (MVP) — `[x]`**

| Item | File(s) | Notes |
|------|---------|--------|
| 3.1 | `PlanningHub.jsx` | `PlanningProjectBar`, exec toggle, tiles; Simulator path uses same component (`/simulator/pm/planning`) — hub metrics partly Platform-only |
| 3.2 | `PlanningIntelligenceDashboard.jsx` | Scan, findings, export |
| 3.3 | `PlanningFindingsBadge.jsx` | Sidebar + overview |
| 3.4 | `ScenarioList.jsx` | Scenarios CRUD surface; rich compare / multi-step form **deferred** (see below) |
| 3.9 | `PBSBuilder.jsx` | PBS + PFD edges in-page (no standalone `PFDView.jsx`) |
| 3.13–3.14 | `PlanHealthDashboard.jsx`, `PlanHealthScoreCard.jsx` | |
| 3.15 | `AIPlanGenerator.jsx` | Wizard simplified vs full 4-step spec |
| 3.17 | `ExecutivePlanView.jsx` | |
| 3.19 | `PortfolioCollisionDashboard.jsx` | List + detect; **no** `CollisionHeatmap.jsx` |
| 3.21 | `RecoveryPlanningView.jsx` | Query-param triggers; **no** separate `RecoveryOptionCard.jsx` |
| 3.23 | `ConfidenceForecastView.jsx` | **No** standalone `ConfidenceBand.jsx` |
| 3.25 | `GovernanceGateChecklist.jsx` | **No** standalone `GovernanceGateRow.jsx` |
| 3.27–3.29, 3.32 | `MicroPlanList.jsx`, `MicroPlanDetail.jsx`, `MicroPlanDraftQueue.jsx` | Inline / merged flows vs separate `MicroPlanForm.jsx` / `MicroPlanActivityDetail.jsx` / `MicroPlanVersionHistory.jsx` as spec’d |
| — | `ProjectPlanningOverview.jsx`, `PlanningProjectBar.jsx` | Project context strip |

**Not built as separate files or full spec — see [Deferred / simplified](#deferred--simplified-not-built-as-specified)**

- [ ] **3.5** `ScenarioForm.jsx` (dedicated multi-step modal)
- [ ] **3.6** `ScenarioComparison.jsx` (side-by-side diff page)
- [ ] **3.7–3.8** `ScenarioCard.jsx`, `ScenarioCompareRow.jsx`
- [ ] **3.10** `PFDView.jsx` (dedicated canvas)
- [ ] **3.11–3.12** `PBSNodeCard.jsx`, `PBSTreeView.jsx`
- [ ] **3.16** `AIGeneratorStepper.jsx`
- [ ] **3.18** `ExecutiveRAGCard.jsx`
- [ ] **3.20** `CollisionHeatmap.jsx`
- [ ] **3.22** `RecoveryOptionCard.jsx`
- [ ] **3.24** `ConfidenceBand.jsx`
- [ ] **3.26** `GovernanceGateRow.jsx`
- [ ] **3.28** `MicroPlanForm.jsx` (standalone multi-step modal as specified)
- [ ] **3.30** `MicroPlanActivityDetail.jsx` (full-field modal as specified)
- [ ] **3.31** `MicroPlanVersionHistory.jsx` (standalone page)
- [ ] **3.33–3.37** `MicroPlanCard.jsx`, `MicroPlanActivityRow.jsx`, `MicroPlanStatusBadge.jsx`, `MicroPlanVersionTag.jsx`, `MicroPlanActivityForm.jsx`

---

### Phase 4 — Simulator Parity

- [x] **4.1** `src/services/sim/simPlan*.js` + `simPlanningService.js` — `simDb` mirrors for planning APIs
- [x] **4.11** `src/services/sim/simMicroPlanService.js`
- [x] **4.2–4.10, 4.12–4.14** *(approach)* — **Same** `src/pages/planning/*` components mounted under `/simulator/pm/planning/*` in `App.jsx` (no duplicate `src/pages/sim/planning/Sim*.jsx` tree). Services switch on route via `simDb` in sim wrappers.

---

### Phase 5 — Menu Config & Routes

- [x] **5.1** `pmDashboardMenuConfig.js` — Planning hub + sub-modules under `/pm/planning/...`
- [x] **5.2** `pmoMenuConfig.js` — `/pmo/planning`, collisions, intelligence, governance-config
- [ ] **5.3** `pmMenuConfig.js` — **Not done:** dedicated `/platform/planning/*` entries; planning remains on PM dashboard / role menus above
- [x] **5.4** `simulatorPMMenuConfig.js` — mirror of PM planning paths under `/simulator/pm/planning/...`
- [ ] **5.5–5.6** `simulatorPMOMenuConfig.js`, `simulatorMenuConfig.js` — verify/add if your deployment expects PMO/global sim entries *(optional parity)*

- [x] **5.7** `App.jsx` — **Implemented:** `/pm/planning/*`, `/pmo/planning/*`, `/simulator/pm/planning/*` (+ micro-plan routes). **Not implemented:** `/platform/planning/*`, `/simulator/pmo/planning/*`, `/simulator/planning/*` as separate roots (use PM/PMO/sim PM paths above).

---

### Phase 6 — Integration with Existing Modules

- [x] **6.1** Add **Plan Health Score card** to project dashboard (embed `PlanHealthScoreCard.jsx`) — via `ProjectPlanningOverview` on `ProjectsDetail.jsx`
- [x] **6.2** Add **"Run Intelligence Scan"** quick action to project dashboard — same strip
- [x] **6.3** Add **Findings badge** to Planning sidebar nav item (shows open error/warning count) — `Sidebar.jsx` + `useOpenPlanningFindingsCount` on `/pm/planning/intelligence`
- [x] **6.4** Link **milestone slippage** → auto-surface recovery options in `RecoveryPlanningView` — project timeline + `trigger=milestone`; banner in recovery view
- [x] **6.5** Link **risk materialisation** (from risk register) → auto-suggest recovery option — `ProjectRiskSummary` lifebuoy → `trigger=risk&sourceId=`
- [x] **6.6** Embed **confidence values** on the existing Gantt chart (optional column toggle) — strip + hide/show above Gantt (`GanttChart.jsx`)
- [x] **6.7** Add **"View in Executive Mode"** button to existing `PlansDashboard.jsx`
- [x] **6.8** Surface **governance gate status** in project overview page — attention count in `ProjectPlanningOverview`
- [x] **6.9** Add **"Team Plans"** summary widget to project dashboard: count of micro-plans by RAG, link to `MicroPlanList`
- [x] **6.10** Link **work packages** → show how many micro-plans are associated with each work package — `WorkPackageView.jsx` + `countMicroPlansByWorkPackage`
- [x] **6.11** Surface **overdue micro-plan activities** in the Planning Intelligence Dashboard as a finding category (rule: "Team member plan has overdue activities with no update in 3+ days") — `micro_plan_activity_stale` rule + scan in `planIntelligenceService` / sim mirror; SQL `v464_plan_intelligence_micro_plan_stale_rule.sql`
- [x] **6.12** Add **"Create Plan from Work Package"** quick action on `WorkPackageView.jsx` — `startDraftMicroPlanFromWorkPackage` + link to filtered `MicroPlanList`

---

### Phase 7 — Unit Tests

- [x] **7.1** `src/services/__tests__/planScenarioService.test.js`
- [x] **7.2** `src/services/__tests__/planIntelligenceService.test.js`
- [x] **7.3** `src/services/__tests__/planHealthScoreService.test.js`
- [x] **7.4** `src/services/__tests__/planPBSService.test.js`
- [x] **7.5** `src/services/__tests__/planAIService.test.js`
- [x] **7.6** `src/services/__tests__/planGovernanceService.test.js`
- [x] **7.7** `src/services/__tests__/microPlanService.test.js` (summary + WP count smoke tests; full approve/restore/RLS scenarios remain optional deep tests)

---

### Phase 8 — Documentation

- [x] **8.1** `Documentation/v354_Project_Planning_Module_Guide.md` — user guide for the module

---

## Deferred / simplified (not built as specified)

| Area | Spec / plan item | What shipped instead |
|------|-------------------|----------------------|
| Scenarios | Dedicated `ScenarioForm.jsx`, `ScenarioComparison.jsx`, card/row components | Flows folded into `ScenarioList.jsx` (MVP); rich compare deferred |
| PBS/PFD | Separate `PFDView.jsx`, `PBSNodeCard`, `PBSTreeView` | PBS + edges in `PBSBuilder.jsx` |
| Collisions | `CollisionHeatmap.jsx` | Alerts list + detect in `PortfolioCollisionDashboard.jsx` |
| Recovery / confidence / governance / AI | Extracted presentational components (`RecoveryOptionCard`, `ConfidenceBand`, `GovernanceGateRow`, `AIGeneratorStepper`, `ExecutiveRAGCard`) | UI inlined in parent pages |
| Micro-plans | Standalone `MicroPlanForm`, `MicroPlanActivityDetail`, `MicroPlanVersionHistory`, seven small components | `MicroPlanList` / `MicroPlanDetail` / drafts queue with merged patterns |
| Routes | `/platform/planning/*`, extra simulator roots | `/pm/planning/*` and `/simulator/pm/planning/*` only |
| `pmMenuConfig` | `/platform/planning/microplans` | Not added — use PM dashboard planning entries |
| Simulator UI | Duplicate `src/pages/sim/planning/Sim*.jsx` | Shared `src/pages/planning/*` + sim services |
| Planning Hub (sim) | Full parity metrics | `PlanningHub` skips some aggregates when `pathname` includes `/simulator/` |

**Optional tests not in Phase 7 list:** `planCollisionService`, `planRecoveryService`, `planConfidenceService` — no dedicated Vitest files yet.

---

## Key Design Decisions

1. **Extend, don't replace** — existing Gantt, tasks, milestones, work packages, Kanban, and resource pages are preserved. The new module layers intelligence, scenarios, and governance on top.
2. **Planning Hub as the entry point** — all 10 sub-modules are accessible from a single `/planning` landing page; the hub shows the key health indicators at a glance.
3. **Scenario engine is snapshot-based** — scenarios clone task data into `plan_scenario_task_snapshots`; the live schedule is never modified by scenario exploration, preserving schedule integrity.
4. **Health score is DB-calculated** — `calculate_plan_health()` PL/pgSQL function evaluates all 10 dimensions using real data; no client-side approximations.
5. **AI is explainable by design** — `plan_ai_sessions` stores `ai_assumptions` and `ai_explanation` for every generation; the UI always shows these before the user accepts anything.
6. **AI never auto-applies changes** — generated plan must be reviewed and accepted step-by-step; no silent baseline changes.
7. **Executive Mode is a view, not a role** — any user with `planning.executive.view` permission can toggle into executive mode; the same underlying data powers both modes.
8. **Governance rules are project-type-aware** — rules apply only to matching project types, avoiding noise for simple or short projects.
9. **Recovery options can be AI-suggested or manual** — `generated_by_ai` flag distinguishes the two; both require approval before application if the option has `requires_approval = true`.
10. **Confidence is additive, not mandatory** — confidence values are optional enhancements on tasks and milestones; the system works without them, but the executive view uses them when present.
11. **PBS is separate from WBS** — WBS (existing) is activity/task-centric; PBS is deliverable/product-centric. Both coexist and can cross-link.
12. **Portfolio collision detection is on-demand** — `detect_portfolio_collisions()` is called explicitly (button click) to avoid expensive scans on every page load; results are stored and timestamped.
13. **Amount fields use shorthand** — all cost fields (cost delta, cost impact) support `10k` → 10,000, `2m` → 2,000,000 on Enter key press.
14. **Draft queue on all forms** — ScenarioForm, AI sessions, PBS nodes, recovery options, and confidence forecasts all support on-hold / save as draft.
15. **Export on every list** — all list views include the export dropdown (Excel, Word, CSV, JSON, Print) using existing `exportUtils`.

---

## Review

### Summary (2026-04-12)

- **Services:** Implemented platform planning services (`planIntelligenceService`, `planScenarioService`, `planPBSService`, `planHealthScoreService`, `planAIService`, `planCollisionService`, `planRecoveryService`, `planConfidenceService`, `planGovernanceService`, `microPlanService`) and simulator counterparts under `src/services/sim/`.
- **UI:** Added Planning Hub and sub-pages with dark-theme layout, `?projectId=` project picker, and wired **PM**, **PMO**, and **Simulator PM** menus plus **App.jsx** routes.
- **Governance service:** `evaluateGates` resolves `project_types.type_code` for rule filtering.
- **SQL file names:** Repo uses `v451_plan_scenarios.sql`, `v452_plan_intelligence.sql`, … `v463_sim_micro_plans.sql` — align migrations to these filenames when deploying.
- **Follow-ups:** Rich scenario form/comparison; optional Word/PPT micro-plan exports; full approve E2E tests against Supabase.
- **2026-04-12 (Phase 6–7):** `ProjectPlanningOverview`, sidebar findings badge, `PlansDashboard` executive link, Gantt confidence strip, recovery query params, risk → recovery icon, WP micro-plan count + `startDraftMicroPlanFromWorkPackage`, `v464` intelligence rule, expanded Vitest files above.
- **2026-04-12 (optional follow-ups):** Micro-plan **list** card/table + search + sort + export + **detail** route (`MicroPlanDetail`); Gantt **per-row confidence** (toolbar toggle + labels + popup); **Vitest** for `getVersionHistory` / `getDraftPlans`; **`supabase/functions/plan-ai-generate`** (Gemini when `GEMINI_API_KEY` set, else stub JSON for `planAIService`).

### Doc refresh (2026-04-12)

- Synced **Phase 1** SQL filenames and numbering with repo (`v451`–`v466`); marked **Phase 2**, **Phase 4** (services + shared sim pages), **Phase 5** (partial: 5.3/5.5/5.6 noted), **Phase 8** complete.
- Replaced long **Phase 3** unchecked list with **delivered table** + explicit **deferred** items; added **[Deferred / simplified](#deferred--simplified-not-built-as-specified)** section.
- **Seed data:** `SQL/v465_planning_module_seed_data.sql` (public), `SQL/v466_sim_planning_module_seed_data.sql` (sim).

### Files touched (high level)

- `src/services/plan*.js`, `src/services/microPlanService.js`, `src/services/sim/simPlan*.js`, `src/services/sim/simMicroPlanService.js`
- `src/pages/planning/**/*.jsx`, `src/components/planning/*`
- `src/App.jsx`, `src/config/pmDashboardMenuConfig.js`, `src/config/pmoMenuConfig.js`, `src/config/simulatorPMMenuConfig.js`
- `src/services/__tests__/planScenarioService.test.js`, `planIntelligenceService.test.js`, and other `plan*` / `microPlan*` tests listed in Phase 7
- `Documentation/v354_Project_Planning_Module_Guide.md`
- `SQL/v465_planning_module_seed_data.sql`, `SQL/v466_sim_planning_module_seed_data.sql`
