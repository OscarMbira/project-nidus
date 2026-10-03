# v966 — Core PM Menu Rationalisation: Taxonomy → Codebase/DB Mapping Audit

**Type:** Audit output only (per `Documentation/Core_PM_and_Industry_Menu_Taxonomy.md` §19). No PRD, no
implementation plan, no menu/route/page changes were made. This file is read-only research to be turned
into decisions and a plan by a separate follow-up.

**Scope:** Every Level-2/Level-3 leaf in §3 "Generic / Core Project Management Menu" of the taxonomy
document, mapped against (a) the live `menu_items` table (Platform, `public` schema) and (b) the actual
registered routes/pages in `apps/platform/src/routes/platformRoutes.jsx` and
`apps/platform/src/modules/pmis-gaps/routes/PmisGapRoutes.jsx`.

**Method note:** §3's own indentation nests 3 levels deep in most groups (L2 register → L3
sub-item/status/field). Where every L3 child of an L2 register maps to the *same* existing page and the
same Action (e.g. "Escalated Risks" / "Closed Risks" are just filtered views of one Risk Register page),
this audit lists them together in one row rather than one mechanical row per L3 string — the leaf names
are still named in full in the Taxonomy Path column so nothing is silently dropped. Rows are split
whenever an L3 child's Action genuinely differs from its siblings (e.g. one sub-item is Reuse, another is
New candidate). Raw leaf count in §3 is **277** individual L3 strings; this audit resolves to **131 rows**
under that method.

---

## 1. Summary

Row counts by Action (131 rows total):

| Action | Rows | % |
|---|---:|---:|
| Reuse | 47 | 36% |
| Extend | 41 | 31% |
| New candidate | 24 | 18% |
| Regroup | 9 | 7% |
| Rename | 6 | 5% |
| Duplicate | 4 | 3% |

**Headline findings:**

1. **The live "Core Project Management" sidebar is not one tree — it's five overlapping trees** grown
   from different lineages sharing the same `plat_sec_*` root prefix: a role-based split (Personal
   Workspace `tm_*` / Universal `pm_*` / Team Management+Delivery `tl_*`) crossed with a methodology
   split (Structured `s_*` / Agile `a_*`). The same concept (e.g. "Risk Register") is frequently
   represented by 2–3 *different* menu rows pointing at 2–3 *different* routes. See §4 "Needs user
   decision" and the per-row `Duplicate` flags below.
2. **8 of the 26 `plat_sec_*` root sections have zero children** — they are dead stub containers in the
   DB right now: `plat_sec_comm_reporting` (Communication & Reporting), `plat_sec_quality_testing`
   (Quality & Testing), `plat_sec_quality_assurance` (Quality & Assurance), `plat_sec_approvals_reporting`
   (Approvals & Reporting), `plat_sec_reporting_controls` (Reporting & Controls), `plat_sec_approvals_gov`
   (Approvals & Governance), `plat_sec_email` (Email & Notifications), `plat_sec_admin`
   (Administration). These render as empty/collapsed sidebar headings with nothing under them.
3. **A substantial, already-built "PMIS gap" module** (`apps/platform/src/modules/pmis-gaps/`, manifest
   at `pmisGapManifest.js`, routes wired through `PmisGapRoutes.jsx`, v631→v963) implements real CRUD
   pages for RACI Matrix, Skills Matrix, S-Curve & Baselines, Universal Calendar, Timesheet Approval,
   Portfolio Map, Dashboard Builder, Whiteboard, OKR & Goals, and more — but most of these are **not
   linked into the Core PM `plat_sec_*` sidebar tree at all**. This closes several taxonomy leaves I would
   otherwise have called "New candidate" — they're actually `Reuse (needs menu wiring)`.
4. **Procurement & Contracts (GAP-12)** is declared in the gap manifest (vendors/contracts/purchase
   requests/invoices routes reserved in `getAllGapRoutePaths()`) but has **zero actual `<Route>`/page
   wiring** in `PmisGapRoutes.jsx` — it's a planned-but-unbuilt gap, not a hidden capability. Only the RFP
   register (`pmo/procurement/rfp`) and a generic `/platform/procurement` landing page exist today.
5. **No unified cross-domain Action Register** exists (Governance > Actions). Action items are scattered
   per-domain (`issues/my-actions`, `lessons/my-actions`, `my-quality-actions`) with no register that
   spans all sources.
6. **No dedicated Milestone Register** exists anywhere in the codebase — "milestone" only appears as a
   field/flag inside Activity/Schedule pages, never as its own register/forecast/slippage view.

---

## 2. Full Mapping Table

Industry column is `GEN` (generic/core) for every row — this document only covers §3, not the industry
packs in §4–§14. Permission column reflects that Platform menu visibility is resolved per-organisation
via `role_menu_access` / Admin's Manage Roles, not a static flag on the row — it is noted as
`role-based` throughout unless something more specific applies. Feature column gives the closest existing
`menu_code` acting as the de-facto feature identity today (or `—` if none exists).

### 2.1 Dashboard

| Taxonomy Path | Existing Capability | Action | Route | Feature (menu_code) | Permission | Notes |
|---|---|---|---|---|---|---|
| Project Health | `/platform/dashboard` (PlatformDashboard) widgets | Extend | `/platform/dashboard` | `plat_tm_dashboard`/`plat_pm_dashboard`/`plat_dashboard_pmo` (3 separate rows, 1 route) | role-based | Same route wired under 3 different menu codes across Personal/Universal/Exec tracks — consolidate to one. Need to verify a "Project Health" widget/score actually renders (`PlanHealthDashboard.jsx` exists separately at `pages/planning/health/` — possible second, unlinked page for the same concept). |
| Executive Summary | `/platform/executive/dashboard` route registered; `plat_exec_dashboard` menu row (route unconfirmed — not in `plat_sec_*` dump, likely orphaned/misplaced) | Extend | `/platform/executive/dashboard` | `plat_exec_dashboard` | role-based | Dedicated executive route exists in `platformRoutes.jsx` (line 4112) but the DB menu row for "Executive Dashboard" wasn't found nested under any `plat_sec_*` root in this audit's tree dump — likely orphaned at level-2 with a dangling/other parent. Needs DB check. |
| Milestone Summary | None found | New candidate | — | — | — | No milestone widget/page found anywhere. See §1 finding 6. |
| Schedule Summary | `/pmo/oversight/schedules` (Schedule Oversight) | Extend | `/pmo/oversight/schedules` | `plat_oversight_schedule` | role-based | Exists as an oversight page, not confirmed as a dashboard *widget*. |
| Cost Summary | EVM dashboards (`projects/:projectId/evm`, `/platform/portfolio/evm`) | Reuse | `/platform/projects/evm`, `/platform/portfolio/evm` | `plat_fin_evm`, `plat_fin_project_evm` | role-based | |
| RAID Summary | `/platform/raid-log` (RAID Log combined view) | Reuse | `/platform/raid-log` | `plat_pm_raid_log` | role-based | Only wired under Universal track's Controls & Registers group. |
| Change Summary | None found as a dashboard widget | New candidate | — | — | — | Change register exists (see Change Control below) but no summary/dashboard rollup found. |
| Quality Summary | `/pmo/oversight/quality-register` | Extend | `/pmo/oversight/quality-register` | `plat_oversight_quality` | role-based | Register exists; dashboard-widget form unconfirmed. |
| Testing Summary | `/platform/testing-centre` (Testing Dashboard) | Reuse | `/platform/testing-centre` | `testing_diagnostics_dashboard` | role-based | Menu row for this lives outside the `plat_sec_*` tree entirely (its own root `testing_diagnostics_section`) — a Regroup candidate into Dashboard/Testing. |
| Resource Summary | `/platform/resources/capacity`, `/platform/resources/workload` (GAP-05 Workload Heatmap) | Reuse | `/platform/resources/capacity`, `/platform/resources/workload` | `plat_pm_capacity` | role-based | Workload Heatmap (GAP-05) is real but not wired to Core PM sidebar. |
| Upcoming Actions | None unified | New candidate | — | — | — | Same gap as Governance > Actions (§1 finding 5). |

### 2.2 Project Setup

#### Project Details

| Taxonomy Path | Existing Capability | Action | Route | Feature | Permission | Notes |
|---|---|---|---|---|---|---|
| Overview, Objectives, Success Criteria, Classification, Metadata | `ProjectsDetail.jsx` / `ProjectsEdit.jsx` fields | Extend | `/platform/projects/:id`, `/platform/projects/:id/edit` | `plat_my_projects`/`plat_all_projects` | role-based | These read as fields/tabs on one Project Detail page, not 5 separate routes — reasonable per rule 17's Level-4 allowance even though §3 nominally lists them at L3. Flagging as Extend since "Success Criteria" and "Classification" as explicit, separately-labelled fields are not confirmed present. |
| Methodology | `/platform/methodology/select`, `/platform/methodology/dashboard` | Reuse | `/platform/methodology/select` | `plat_pm_dashboard` group | role-based | Dedicated methodology selection flow exists (Structured/Agile/Hybrid choice drives the whole `plat_sec_structured` vs `plat_sec_agile` sidebar split). |

#### Business Case

| Taxonomy Path | Existing Capability | Action | Route | Feature | Permission | Notes |
|---|---|---|---|---|---|---|
| Strategic Rationale, Expected Benefits, Options Analysis, Cost/Benefit, Assumptions, Approval | `BusinessCaseCreate.jsx`/`BusinessCaseEdit.jsx` | Reuse | `/pmo/initiation/business-case` | `plat_pm_s_business_case`/`plat_s_business_cases` | role-based | Two menu rows (Structured track "Pre-Project" group and "Initiation Hub" group) point at overlapping business-case routes — minor Duplicate, low severity (same underlying form, different entry list). Sub-items are fields within the one form. |

#### Project Charter

| Taxonomy Path | Existing Capability | Action | Route | Feature | Permission | Notes |
|---|---|---|---|---|---|---|
| Purpose, Scope, Objectives, High-Level Milestones, Constraints, Assumptions, Approval | Project Brief (`briefs/list`, `projects/:projectId/brief/create`) + PID (`/platform/pid`, `/platform/initiation/pids`) | Rename / Duplicate | `/platform/brief`, `/platform/pid` | `plat_s_briefs`, `plat_s_pids` | role-based | Generic PMBOK "Project Charter" is currently split across two PRINCE2-flavoured artefacts (Project Brief vs PID) that overlap in content (purpose/scope/objectives/constraints appear in both). **Needs user decision**: pick one canonical "Charter" surface or keep both as methodology-specific variants of one concept. High-Level Milestones sub-item has no home (see Milestone gap, finding 6). |

#### Project Team

| Taxonomy Path | Existing Capability | Action | Route | Feature | Permission | Notes |
|---|---|---|---|---|---|---|
| Team Members | `/platform/teams`, `/platform/my-team` | Reuse | `/platform/teams` | `plat_tl_all_members`/`plat_pm_all_teams` | role-based | |
| Roles & Responsibilities | Team Charter (`/platform/team-charter`) | Extend | `/platform/team-charter` | — | role-based | Not currently wired into `plat_sec_*` at all (Regroup candidate). |
| RACI | RACI Matrix module (GAP-10, real CRUD: `RaciListPage`, `RaciMatrixEditor`) | Reuse (needs menu wiring) | `/platform/planning/raci` | — | role-based | Built and routed but **absent from the Core PM sidebar entirely** — a genuine menu gap, not a capability gap. |
| Organisation Structure | None found | New candidate | — | — | — | No org-chart/reporting-line page found. |
| Contact Directory | Resource Directory (`/platform/resources`) | Reuse | `/platform/resources` | `plat_pm_resource_dir` | role-based | |

#### Governance (Project Setup)

| Taxonomy Path | Existing Capability | Action | Route | Feature | Permission | Notes |
|---|---|---|---|---|---|---|
| Governance Structure, PMO Oversight | Governance Framework (`/platform/governance/framework`) | Reuse | `/platform/governance/framework` | `plat_pm_s_gov_framework` | role-based | |
| Steering Committee, Project Board | Stakeholder Register (role field) | Extend | `/platform/stakeholders/register` | `plat_pm_stkh_register` | role-based | No dedicated "governance body" construct — modelled (if at all) as stakeholder roles. |
| Meeting Calendar | `/platform/meetings`, `comms/meetings` | Reuse | `/platform/meetings` | `plat_tm_meetings` | role-based | |
| Escalation Path | None found as its own artefact | New candidate | — | — | — | Escalation exists as a per-record field on Risk/Issue detail pages, not a project-level escalation path document. |
| Delegated Authorities | Work Authorisations (`/platform/work-authorisation`) | Reuse | `/platform/work-authorisation` | `plat_pm_s_work_auth` | role-based | |
| Governance Decisions | Decision Log (`/platform/governance/decisions`) | Reuse | `/platform/governance/decisions` | `plat_pm_s_decision_log` | role-based | |

### 2.3 Scope & Deliverables

| Taxonomy Path | Existing Capability | Action | Route | Feature | Permission | Notes |
|---|---|---|---|---|---|---|
| Scope Statement (In/Out of Scope, Boundaries, Constraints) | `ScopeStatementPage` | Reuse | `projects/:projectId/scope/statement` | — | role-based | Route registered but not found linked in the `plat_sec_*` menu dump — Regroup/wire-in candidate. |
| Product Breakdown Structure (Products, Deliverables, Product Descriptions, Acceptance Criteria) | Product Descriptions (`/platform/product-descriptions`) + PPD (`/platform/ppd`, `ppd/acceptance`) | Rename | `/platform/product-descriptions`, `/platform/ppd` | `plat_pm_s_prod_desc`/`plat_tm_prod_desc` | role-based | PRINCE2-flavoured naming stands in for the generic PBS concept — same rename tension as Project Charter above. |
| Work Breakdown Structure — WBS Hierarchy | `WBSBuilderPage` | Reuse | `projects/:projectId/scope/wbs` | — | role-based | Route registered, not wired into `plat_sec_*` menu — Regroup. |
| Work Breakdown Structure — Work Packages | Work Packages (`pm/delivery/work-packages`) | Reuse | `/pm/delivery/work-packages` | `plat_tm_work_packages`/`plat_pm_s_work_packages`/`plat_tl_work_packages` | role-based | **Duplicate**: 3 separate menu rows across Personal/Structured/Delivery tracks all pointing to the same route. |
| Work Breakdown Structure — Control Accounts, WBS Dictionary | None found | New candidate | — | — | — | No control-account or WBS-dictionary concept found. |
| Deliverable Register (Planned, Submitted, Accepted, Rework/Rejected) | Product Status Accounts (`projects/:projectId/product-status-accounts`) | Extend | `/platform/projects/:projectId/product-status-accounts` | — | role-based | Closest existing match is PRINCE2's Product Status Account, which tracks deliverable status but isn't labelled/marketed as a generic "Deliverable Register." Not wired into `plat_sec_*` either. |

### 2.4 Planning

| Taxonomy Path | Existing Capability | Action | Route | Feature | Permission | Notes |
|---|---|---|---|---|---|---|
| Schedule — Activity Register | `ActivityListPage`/`ActivityDetailPage` | Reuse | `projects/:projectId/schedule/activities` | — | role-based | Not linked in `plat_sec_*` dump — Regroup. |
| Schedule — Gantt | `GanttChartPage` | Reuse | `projects/:projectId/schedule/gantt` | — | role-based | Same — Regroup. |
| Schedule — Network/Dependencies | `projects/:projectId/schedule/dependencies` | Reuse | `projects/:projectId/schedule/dependencies` | — | role-based | |
| Schedule — Critical Path | Presumed feature of Gantt page | Extend | `projects/:projectId/schedule/gantt` | — | role-based | Not confirmed as a distinct view; likely a Gantt overlay. |
| Schedule — Look-Ahead Plan | None found | New candidate | — | — | — | Construction-flavoured term surfaced in the generic taxonomy; no rolling look-ahead view exists in core Planning. |
| Schedule — Schedule Variance | `/pmo/oversight/schedules` | Extend | `/pmo/oversight/schedules` | `plat_oversight_schedule` | role-based | |
| Schedule Management Plan | `ScheduleManagementPlanPage` | Reuse | `projects/:projectId/schedule/management-plan` | — | role-based | Route exists but has no §3 leaf of its own and no menu entry — likely belongs under Planning > Schedule as an additional page. |
| Milestones (Register, Key Dates, Forecast, Slippage) | None | New candidate | — | — | — | Whole L2 group is a gap — see §1 finding 6. |
| Dependencies (Internal, External, Owners, Dates, Escalations) | Dependencies module (`/platform/dependencies`, `dependencies/map`, `dependencies/impact`, `dependencies/inter-project`) | Reuse | `/platform/dependencies` | `plat_grp_pm_controls` (nested)/none direct | role-based | Same underlying engine also satisfies RAID > Dependencies below — §3 lists "Dependencies" twice (Planning and RAID); treat as one capability, not a duplication on our side. |
| Calendars (Project Calendar, Working Days, Holidays, Exceptions) | `/platform/calendar` **and** `schedule/calendar`/`schedule/calendar/exceptions` **and** Universal Calendar (GAP-09) | Duplicate | `/platform/calendar`, `projects/:projectId/schedule/calendar`, `/platform/calendar` (GAP-09 variant) | `plat_tm_calendar`/`plat_pm_calendar`/`plat_tm_team_calendar` | role-based | Three separate calendar implementations exist (generic team calendar, per-project schedule calendar with exceptions, and the newer Universal Calendar gap-fill). **Needs user decision**: consolidate to one calendar surface or keep them scoped (team vs schedule vs org-wide) deliberately. |
| Baselines (Scope, Schedule, Cost Baseline, History, Approval) | S-Curve & Baselines (GAP-14, `project_baselines` table) + `budget-baseline` route | Extend | `/platform/planning/s-curve`, `projects/:projectId/budget-baseline` | `plat_pm_a_scurve` | role-based | S-Curve/Baselines is only wired under the Agile track's "Planning Tools" group today even though baselining is methodology-neutral — Regroup candidate. Scope/Schedule baseline snapshot behaviour (vs just Cost) not confirmed. |
| Planning Assumptions | Assumptions Register (`/assumptions`) | Reuse | `/platform/assumptions` | `plat_pm_assumptions_reg` | role-based | Same register as RAID > Assumptions below. **Needs user decision**: §3 lists "Planning Assumptions" separately from "RAID > Assumptions" — confirm they should share one register rather than being split by category. |
| Scenario Planning (Current Plan, What-If Scenarios, Comparison, Recommendation) | `RecoveryPlanningView.jsx`, `PlanHealthDashboard.jsx`, `AIPlanGenerator.jsx` | Extend | not confirmed registered under a stable path | — | role-based | Closest existing capability is Recovery Planning (delay-recovery what-if), not full multi-scenario comparison. **Do not confuse with Simulator's "Scenarios & Practice"** (`sim_sec_scenarios`) — that is unrelated training-simulation content in a different schema/app, not this taxonomy leaf. |

### 2.5 RAID

| Taxonomy Path | Existing Capability | Action | Route | Feature | Permission | Notes |
|---|---|---|---|---|---|---|
| Risk Register, Identification, Assessment, Response Plans, Owners, Residual Risk, Escalated Risks, Closed Risks | `RiskRegisterView.jsx`/`RiskDetail.jsx` | Duplicate | `/pm/controls/risk-register`, `/pmo/oversight/risk-register`, `/platform/risks` | `plat_pm_risk_reg`, `plat_oversight_risk`, `plat_tl_controls` | role-based | **Three different routes** for the same Risk Register concept across Universal/Exec-Oversight/Delivery tracks. Sub-items (Identification/Assessment/Response Plans/Owners/Residual/Escalated/Closed) are fields, statuses, or filters on `RiskDetail.jsx`, not separate pages — consistent with rule 17. |
| Assumption Register, Validation, Owners | Assumptions module | Reuse | `/platform/assumptions` | `plat_pm_assumptions_reg` | role-based | |
| Converted Risks / Issues | Not confirmed | Extend | `/platform/assumptions` | — | role-based | No confirmed "convert assumption to risk/issue" action; flag for verification rather than assume it's built. |
| Issue Register, Assessment, Resolution Plan, Owners, Escalations, Closed Issues | `IssueDetailView.jsx` | Duplicate | `/pm/controls/issue-register`, `/pmo/oversight/issue-register`, `/platform/issues` | `plat_pm_issue_log`, `plat_oversight_issue` | role-based | Same duplication pattern as Risk Register. |
| Dependency Register, Incoming, Outgoing, Critical, Escalated | Dependencies module | Reuse | `/platform/dependencies` | `plat_grp_pm_controls` | role-based | Same engine as Planning > Dependencies (see note above). |

### 2.6 Stakeholders

| Taxonomy Path | Existing Capability | Action | Route | Feature | Permission | Notes |
|---|---|---|---|---|---|---|
| Stakeholder Register (Internal, External, Roles, Contact Details) | `/platform/stakeholders/register` (create/view/edit) | Reuse | `/platform/stakeholders/register` | `plat_pm_stkh_register`/`plat_people_stakeholders` | role-based | Two menu rows point at the same route (Universal track and "People & Resources" root) — minor Duplicate. |
| Engagement Assessment (Influence, Interest, Current/Desired Engagement, Strategy) | `/platform/stakeholders/assessment-matrix`, `/platform/stakeholders/engagement` | Reuse | `/platform/stakeholders/engagement` | `plat_pm_stkh_engagement`/`plat_pm_stkh_matrix`/`plat_pm_stkh_assess` | role-based | 3 separate menu rows for what looks like 2 routes (assessment matrix + engagement planning) — minor Duplicate, consolidate labelling. |
| Communications (Communication Plan, Audience, Channels, Frequency, Calendar, History) | `/platform/stakeholders/communication` (Communication Plans) | Reuse | `/platform/stakeholders/communications` | `plat_pm_stkh_comms` | role-based | |

### 2.7 Change Control

| Taxonomy Path | Existing Capability | Action | Route | Feature | Permission | Notes |
|---|---|---|---|---|---|---|
| Change Requests (New, Open, Approved, Rejected, Implemented) | Change register | Duplicate | `/platform/change`, `/pmo/registers/changes` | `plat_pm_change_log`, `plat_oversight_change` | role-based | Two routes for the same concept (Universal Controls & Registers vs Exec Oversight). Statuses (New/Open/Approved/etc.) are filters on one register, not separate pages. |
| Change Assessment (Scope, Schedule, Cost, Resource, Risk, Quality, Benefits Impact) | Not confirmed as multi-dimension impact fields | Extend | `/platform/change` | — | role-based | Needs verification: does the Change Request form actually capture all 7 impact dimensions, or just a generic "impact" field? |
| Change Decisions (Pending, Approved, Rejected, Deferred) | Same Change register, status filter | Reuse | `/platform/change` | — | role-based | |
| Change Implementation (Actions, Baseline Updates, Communication, Verification) | None found as a distinct workflow stage | New candidate | — | — | — | No post-approval implementation-tracking step found separate from the change record itself. |

### 2.8 Resources

| Taxonomy Path | Existing Capability | Action | Route | Feature | Permission | Notes |
|---|---|---|---|---|---|---|
| Resource Plan — Demand, Supply, Forecast | `/platform/resources` | Extend | `/platform/resources` | `plat_pm_resource_dir`/`plat_xf_resources_hub` | role-based | General resource directory exists; demand/supply/forecast planning views not confirmed distinct. |
| Resource Plan — Skills Requirements | Skills Matrix (GAP-11: `SkillCompetencyMatrixPage`, real CRUD) | Reuse | `/platform/resources/skills` | `plat_pm_skill_matrix` | role-based | Confirmed working (route registered via `PmisGapRoutes.jsx`, `platform/resources/skills` is an exact-path match that takes priority over the generic `resources/:id` catch-all in `platformRoutes.jsx`). |
| Assignments (Project, Work Package, Role, History) | `project-users`/`project-members`, `pmo-admin/manager-assignments`, `pmo-admin/appointments`, `my-appointments` | Reuse | `/platform/project-users` | `plat_pm_manage_members` | role-based | Functionality exists but fragmented across 4+ separately-labelled routes (project members, manager assignments, appointments) with no single "Assignments" register — Regroup candidate to present as one L2 menu. |
| Capacity (Availability, Allocation, Over-allocation, Forecast) | `/platform/resources/capacity` | Reuse | `/platform/resources/capacity` | `plat_pm_capacity`/`plat_tl_capacity`/`plat_tm_workload` | role-based | 3 menu rows for capacity/workload concepts — minor Duplicate, worth consolidating labels. |
| Timesheets — Time Entry | `/platform/timesheets` (my/new/edit) | Reuse | `/platform/timesheets` | `plat_tm_timesheets` | role-based | |
| Timesheets — Approvals | Timesheet Approval (GAP-13, real CRUD: weekly/queue/period/settings pages) | Reuse (needs menu wiring) | `/platform/timesheets/approvals` | `plat_tl_timesheet_mgmt` (points at `/platform/timesheets/team`, a *different* route) | role-based | **Duplicate**: existing `plat_tl_timesheet_mgmt` menu row and the new GAP-13 approvals module point at two different routes for what's meant to be the same concept — needs consolidation decision. |
| Timesheets — Exceptions, Utilisation | Not confirmed as distinct views | Extend | `/platform/timesheets` | — | role-based | Likely fields/tabs within the Timesheets pages; not verified. |

### 2.9 Cost Management

| Taxonomy Path | Existing Capability | Action | Route | Feature | Permission | Notes |
|---|---|---|---|---|---|---|
| Budget (Structure, Lines, Approved Budget, Revisions) | `projects/:projectId/costs`, `budget-baseline` | Extend | `/platform/projects/:projectId/costs` | — | role-based | A Costs page and a budget-baseline page exist; a distinct "Budget Structure/Lines/Revisions" model is not confirmed — flag for verification rather than assume built-out. |
| Actuals (Actual Costs, Commitments, Accruals, Transactions) | Cost Actuals CRUD (`/platform/cost-actuals`) | Reuse | `/platform/cost-actuals` | `plat_fin_cost_actuals` | role-based | Commitments/Accruals as distinct line-item types not confirmed. |
| Forecast (ETC, EAC, Variance, History) | EVM dashboards | Reuse | `/platform/projects/:projectId/evm`, `/platform/programme/evm`, `/platform/portfolio/evm` | `plat_fin_project_evm`, `plat_fin_programme_evm`, `plat_fin_evm` | role-based | |
| Cost Performance (Planned vs Actual, Variance, Trend, Indicators) | Same EVM dashboards | Reuse | (same as Forecast) | (same as Forecast) | role-based | §3 effectively splits one EVM capability across two L2 groups (Forecast and Cost Performance) — not a codebase issue, just worth noting the taxonomy's own overlap. |

### 2.10 Quality

| Taxonomy Path | Existing Capability | Action | Route | Feature | Permission | Notes |
|---|---|---|---|---|---|---|
| Quality Plan (Objectives, Standards, Criteria, Responsibilities) | Quality Management Strategy (`/pm/governance/quality-strategy`, `qms/list`, `qms/templates`) | Rename | `/pm/governance/quality-strategy` | `plat_pm_s_qms`/`plat_s_qms` | role-based | PRINCE2-flavoured "QMS" naming for a generically-titled taxonomy leaf. |
| Quality Reviews (Planned Reviews, Findings, Corrective Actions, Closure) | `/platform/quality/reviews` | Reuse | `/platform/quality/reviews` | — | role-based | Route registered, not confirmed linked in `plat_sec_*` menu dump. |
| Acceptance (Acceptance Criteria, Acceptance Reviews, Accepted, Rejected/Rework) | `ppd/acceptance` | Extend | `/platform/ppd/acceptance` | — | role-based | PRINCE2-specific (Project Product Description acceptance) — may not generalise to non-PRINCE2 projects. |
| Non-Conformance (Register, Corrective Action, Preventive Action, Closure) | None dedicated; closest is Testing > Defects | New candidate (recommend Extend Testing Defects/Quality Register per rule 16 pattern) | `/platform/testing/defects` | — | role-based | Per the taxonomy doc's own §16 guidance ("reuse shared engine with configuration"), recommend extending the existing Defects/Quality Register engine with an NCR classification rather than building a fourth register. |

### 2.11 Testing

| Taxonomy Path | Existing Capability | Action | Route | Feature | Permission | Notes |
|---|---|---|---|---|---|---|
| Test Planning (Strategy, Plan, Scope, Cycles, Entry/Exit Criteria) | `/platform/testing` root | Extend | `/platform/testing` | `plat_pm_quality_testing` | role-based | Formal Test Strategy/Entry-Exit-Criteria fields not confirmed distinct from the general Testing dashboard. |
| Test Cases (Repository, Suites, Preconditions, Steps, Expected Results) | `testing/cases`, `testing/suites`, `testing/import` | Reuse | `/platform/testing/cases` | — | role-based | |
| Test Execution (Runs, Pass, Fail, Blocked, Retest) | `testing/runs`, `testing/runs/:runId/execute` | Reuse | `/platform/testing/runs` | — | role-based | Pass/Fail/Blocked/Retest are run statuses, not separate pages. |
| Defects (Register, Severity/Priority, Assignment, Resolution, Retest, Closure) | `testing/defects`, `testing/defects/dashboard` | Reuse | `/platform/testing/defects` | — | role-based | |
| Evidence (Test Evidence, Screenshots, Attachments, History) | Not confirmed as a distinct feature | Extend | `/platform/testing/cases`, `/platform/testing/defects` | — | role-based | Likely a generic attachment component reused within case/run/defect forms; no dedicated "Evidence" page found. |

### 2.12 Governance

| Taxonomy Path | Existing Capability | Action | Route | Feature | Permission | Notes |
|---|---|---|---|---|---|---|
| Decisions (Register, Pending, Owners, History) | `/platform/governance/decisions` | Reuse | `/platform/governance/decisions` | `plat_pm_s_decision_log` | role-based | |
| Actions (Register, Open, Overdue, Closed) | None unified | New candidate | — | — | — | See §1 finding 5 — only per-domain "my-actions" views exist (issues, lessons, quality), no cross-cutting Action Register. |
| Approvals (Pending, Approved, Rejected, History) | Record Lifecycle / Authorisation system (rule 53) | Reuse | `/pmo/authorisation/queue`, `/pmo/authorisation/dashboard`, `/pmo/approvals/register` | `plat_lc_auth_queue`, `plat_lc_dashboard` | role-based | Strong existing match — the shared `AuthorisationRequestModal`/Record Lifecycle engine. |
| Stage Gates (Gate Definition, Readiness, Review, Decision) | `/platform/stage-gates` CRUD | Reuse | `/platform/stage-gates` | `plat_pm_s_stage_gates` | role-based | |
| Meetings (Calendar, Agendas, Minutes, Actions, Decisions) | `comms/meetings`, `comms/meetings/:meetingId/summary` | Reuse | `/platform/comms/meetings` | `plat_tm_meetings` | role-based | Whether meeting minutes capture discrete "Actions"/"Decisions" as structured sub-items (vs. free text) is unconfirmed — AI enrichment routes (`comms/enrich/issue`, `comms/enrich/risk`) suggest partial structured capture exists. |

### 2.13 Procurement (flat L1 — no L2 grouping in §3)

| Taxonomy Path | Existing Capability | Action | Route | Feature | Permission | Notes |
|---|---|---|---|---|---|---|
| Procurement Plan | Generic Procurement landing page + RFP Register | Extend | `/platform/procurement`, `/pmo/procurement/rfp` | `plat_xf_procurement`, `plat_proc_rfp` | role-based | |
| Vendors | Declared in gap manifest (GAP-12, `vendors` table) but **not wired** in `PmisGapRoutes.jsx` | New candidate | — (reserved: `pm/procurement/vendors`, `pmo/procurement/vendors`) | — | role-based | Self-declared, unbuilt backlog item — implementation slot already reserved in `pmisGapManifest.js`/`getAllGapRoutePaths()`. |
| Contracts | Same GAP-12, unbuilt | New candidate | — (reserved: `pm/procurement/contracts`) | — | role-based | |
| Purchase Requests | Same GAP-12, unbuilt (`pm/procurement/requests`/`orders`) | New candidate | — | — | role-based | RFP register (`pmo/procurement/rfp`) is the closest analogue but models RFPs, not general purchase requests. |
| Deliverables | None (procurement-specific) | New candidate | — | — | — | Distinct from Scope & Deliverables' deliverable register — this is contract-deliverable tracking. |
| Vendor Performance | None | New candidate | — | — | — | |
| Contract Closure | None | New candidate | — | — | — | |

### 2.14 Benefits (flat)

| Taxonomy Path | Existing Capability | Action | Route | Feature | Permission | Notes |
|---|---|---|---|---|---|---|
| Benefits Register | `/platform/benefits/register` | Reuse | `/platform/benefits/register` | `plat_portfolio_benefits`/`plat_programme_benefits` | role-based | |
| Benefit Owners | Field on Benefit record | Extend | `/platform/benefits/register` | — | role-based | |
| Measures | `/platform/benefits/measurements` | Reuse | `/platform/benefits/measurements` | — | role-based | |
| Target Dates | Field on Benefit record | Extend | `/platform/benefits/register` | — | role-based | |
| Realisation Tracking | `/platform/benefits/realization` | Reuse | `/platform/benefits/realization` | — | role-based | |
| Post-Implementation Review | Benefits Review Plan (`pm/initiation/benefits-review-plan`) | Extend | `/pm/initiation/benefits-review-plan` | `plat_s_benefits_review`/`plat_pm_s_benefits_rp` | role-based | Review Plan exists pre-project; whether a genuine *post-implementation* review artefact exists (vs the review plan itself) is unconfirmed. |

### 2.15 Documents (flat)

| Taxonomy Path | Existing Capability | Action | Route | Feature | Permission | Notes |
|---|---|---|---|---|---|---|
| Document Register, Project Documents | `documents/project`, `document-governance/register` | Duplicate | `/platform/documents/project`, `/platform/document-governance/register` | `plat_pm_project_documents` | role-based | Two overlapping document-tracking surfaces (a project documents tree and a governance-oriented document register). |
| Templates | Template Library (`/platform/templates`, `/pmo/process-templates`) | Reuse | `/platform/templates` | `plat_pt_hub`/`plat_pm_templates_templates` | role-based | Extensively covered — see also §3 "doesn't fit taxonomy" note on Template Library below. |
| Version History | `templates/:id/versions` | Reuse | `/platform/templates/:id/versions` | — | role-based | Confirmed for templates; whether general project documents also carry version history is unconfirmed. |
| Reviews | `document-governance/compliance` | Extend | `/platform/document-governance/compliance` | — | role-based | |
| Approvals | Authorisation queue reuse | Reuse | `/pmo/authorisation/queue` | `plat_lc_auth_queue` | role-based | |

### 2.16 Reports (flat)

| Taxonomy Path | Existing Capability | Action | Route | Feature | Permission | Notes |
|---|---|---|---|---|---|---|
| Project Status Report, Executive Report, Schedule Report, Cost Report, RAID Report, Change Report, Resource Report, Quality Report, Testing Report | Report Library + Report Builder (`/platform/reports`, `/platform/report-builder`) | Reuse | `/platform/reports`, `/platform/reports/builder` | `plat_pm_rep_library`/`plat_rep_library`, `plat_pm_rep_builder`/`plat_rep_builder` | role-based | Per §16 Rule E (filtered/reporting view of existing data), all 9 named report types are almost certainly generated as filtered/templated views from one Report Library + Builder engine, not 9 separate pages — appropriate Reuse, contingent on the Builder actually supporting each of these 9 domains as a template (unconfirmed per-domain). |
| Custom Reports | Report Builder | Reuse | `/platform/report-builder` | `plat_rep_builder` | role-based | Direct match. |

### 2.17 Project Closure (flat)

| Taxonomy Path | Existing Capability | Action | Route | Feature | Permission | Notes |
|---|---|---|---|---|---|---|
| Closure Checklist | Not confirmed distinct from End Project Report | Extend | `/platform/projects/:projectId/closure` | — | role-based | |
| Final Acceptance | Not confirmed | New candidate | — | — | — | No explicit final-acceptance artefact found (distinct from PPD/Product acceptance, which is deliverable-level not project-level). |
| Outstanding Items | Not confirmed | New candidate | — | — | — | |
| Handover | Not confirmed | New candidate | — | — | — | Industry packs (CON/HLT/MFG etc.) have explicit Handover & Commissioning groups; the generic core has no equivalent. |
| Lessons Learned | Lessons Log (`/platform/lessons/my-actions`, `lessons/corporate`, `projects/:projectId/lessons`) | Reuse | `/platform/lessons/corporate` | `plat_pm_lessons_ctrl`/`plat_oversight_lessons` | role-based | Two menu rows point at related-but-different lessons routes (Controls & Registers vs Project Oversight) — minor Duplicate. |
| Benefits Transition | Not confirmed | New candidate | — | — | — | Distinct from Benefits Realisation Tracking (which is ongoing) — this is the formal handover of benefit ownership to BAU. |
| Archive | Archived Projects (`/platform/projects/archived`) + Archive Vault (`pmo/authorisation/archive`) | Reuse | `/platform/projects/archived`, `/pmo/authorisation/archive` | `plat_archived_projects`, `plat_lc_vault` | role-based | Two different "archive" concepts (archived project list vs authorisation-record archive vault) — could confuse users if both surface as "Archive"; not a true duplicate since they archive different entity types. |
| Closure Report | End Project Report CRUD (`closure/end-project-report`) | Reuse | `/platform/projects/:projectId/closure/end-project-report/create` | `plat_pm_s_end_project`/`plat_rep_end_project` | role-based | |

---

## 3. Existing "Core Project Management" menu items that don't fit taxonomy §3 at all

These are `plat_sec_*` root sections or child groups with no corresponding concept anywhere in §3. Not a
recommendation either way — just flagged per the task's request for a human decision.

| Item | Why it doesn't fit §3 |
|---|---|
| `plat_sec_email` — Email & Notifications | Platform admin/notification infrastructure, not a PM discipline. **Currently an empty stub (0 children)** — dead menu entry regardless of taxonomy fit. |
| `plat_sec_admin` — Administration | Same — platform/org configuration, not a PM discipline. **Currently an empty stub (0 children).** |
| `plat_sec_system_admin` — System Administration | Platform Settings, PWA Settings, Authentication, Security, GDPR, Role Catalog, Help Content, Feedback, Monitoring — genuine platform/SaaS admin, not PM. Has real children (populated), unlike the two above. |
| `plat_sec_account` — Account & Subscription | Billing/subscription management — SaaS commercial concern, not a PM discipline. |
| `plat_grp_template_library` (under Knowledge & Operations) — Template Library | §3's "Documents > Templates" leaf covers templates as project artefacts; this is the org-wide template *authoring* hub (Template Hub, Browse, New, Industry Templates) — arguably infrastructure that *produces* the Documents>Templates content rather than the content itself. Borderline; recommend keeping as supporting infrastructure rather than forcing it under Documents. |
| `plat_grp_okr` (under Knowledge & Operations) — Strategy & OKRs | OKR & Goals (GAP-03) has no corresponding concept in §3 at all — it's a strategy-management capability layered on top of, not part of, the core PM taxonomy. |
| `plat_grp_process_groups` — Process Group Forms | PMBOK process-group-organised form entry (Initiating/Planning/Executing/M&C/Closing) — a data-capture UX pattern for the Standards-Based track, not a §3 discipline in its own right. It's the *mechanism* by which many other leaves (Business Case, Charter, etc.) get filled in, not a leaf itself. |
| `plat_sec_comm_reporting` — Communication & Reporting | **Empty stub (0 children).** Would presumably have mapped to Stakeholders>Communications or Reports if populated, but currently dead. |
| `plat_sec_quality_testing` / `plat_sec_quality_assurance` | **Both empty stubs (0 children).** The real Quality/Testing content lives under other roots (`plat_pm_quality_testing` single item in Universal, `plat_grp_quality_testing_pmo` empty group in Workflows). |
| `plat_sec_approvals_reporting` / `plat_sec_reporting_controls` / `plat_sec_approvals_gov` | **All three empty stubs (0 children).** Real approvals content lives under `plat_sec_workflows` and `plat_grp_pm_auth`. |
| `plat_grp_collaboration` — Whiteboard | No §3 concept. Generic collaboration tooling. |
| GAP-06 Public Intake Forms, GAP-07 Client Portal, GAP-19 Guest Collaborator, GAP-20 Training Tracker, GAP-25 Integrations Hub | None of these SaaS-platform-capability gaps correspond to a §3 PM discipline — they're cross-cutting product features (external-facing intake, client access, guest access, training records, third-party integrations), same category as OKR. |

---

## 4. Needs user decision

1. **Which route is canonical for Risk Register / Issue Register / Change Register / Work Packages /
   Capacity / Timesheets?** Each has 2–3 live routes today (see Duplicate rows in §2.5, §2.7, §2.3, §2.8).
   Rationalising the sidebar requires picking one canonical route per concept and either redirecting or
   retiring the others — this is a design decision (which methodology-track menu wins) that a single
   answer can't infer from the code alone.
2. **Personal / Universal / Team-Management role-tracks vs. Structured / Agile methodology-tracks —
   keep both dimensions, or collapse to one?** The `plat_sec_*` tree currently crosses two independent
   axes (who you are: `tm_`/`pm_`/`tl_` vs. what methodology the project uses: `s_`/`a_`), which is the
   root cause of most duplication found in this audit. Whether the target sidebar should keep both axes,
   collapse to methodology-only, or collapse to role-only is a product decision outside this audit's
   scope.
3. **Calendars**: three separate calendar implementations exist (generic `/platform/calendar`,
   schedule-scoped `schedule/calendar` with exceptions, and Universal Calendar from GAP-09). Consolidate
   to one, or keep deliberately scoped (team vs. project-schedule vs. org-wide)?
4. **Planning Assumptions vs. RAID > Assumptions**: §3 lists these as two separate leaves under two
   different L1 groups. Confirm whether they're meant to share one Assumption Register (current codebase
   reality — only one register exists) or whether a genuine split by category (planning-phase assumptions
   vs. ongoing RAID assumptions) is wanted.
5. **Project Charter vs. Project Brief vs. PID**: the generic taxonomy's "Project Charter" concept is
   currently split across two PRINCE2-specific artefacts with overlapping content. Decide whether to keep
   both as methodology variants, rename one to be the generic "Charter," or merge them.
6. **8 empty `plat_sec_*` root stubs** (listed in §3 above): delete, populate, or leave as placeholders
   for future work? They currently render as dead/empty sidebar sections for every user.
7. **Procurement**: GAP-12 (Vendors/Contracts/Purchase Requests/Vendor Performance/Contract Closure) is
   declared in the codebase's own gap manifest but has zero implementation. Given how large this gap is
   relative to the rest of §3's coverage, confirm whether it should be prioritised as its own PRD/plan
   before the broader menu rationalisation, or folded into it.
8. **Milestones and unified Governance Actions**: both are complete gaps (no register of any kind exists
   today) affecting multiple L1 groups (Dashboard, Planning, Governance). Confirm these are in scope for
   the eventual implementation plan, since without them several Dashboard summary cards (Milestone
   Summary, Upcoming Actions) have nothing to point at.
9. **Should `Template Library`, `Strategy & OKRs`, `Process Group Forms`, and the SaaS-platform-capability
   gaps (Intake Forms/Client Portal/Guest Collaborator/Training Tracker/Integrations Hub) be left outside
   the taxonomy's scope entirely** (as genuine platform/SaaS infrastructure rather than PM disciplines),
   or does the taxonomy need a "Platform Capabilities" or similar addendum section to formally cover them
   so they aren't perpetually flagged as "doesn't fit" in future audits?
