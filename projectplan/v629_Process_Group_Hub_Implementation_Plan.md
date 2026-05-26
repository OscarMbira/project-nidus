# v629 — Process Templates: Full PMBOK-Aligned Templates, Registers & Logs

**Version:** v629 (Revised — Option A: Full CRUD)
**Feature:** Process Templates — Pre-Project + 5 PMBOK process groups, all templates as full CRUD pages
**Date:** 2026-05-26
**Status:** Complete (2026-05-26)

---

## 1. Objective

Build a fully navigable Process Templates that:
- Groups all project management forms, templates, registers, and logs into **Pre-Project + 5 PMBOK process group** sections
- Gives **PMO users** full CRUD rights on all master templates
- Gives **Portfolio / Programme / Project Managers and Team Members** read-only access to masters plus a **copy-and-edit** workflow for their own copies
- Builds **20 missing PMBOK templates as full CRUD pages** (list + create + edit + detail/view)
- Surfaces the hub through sidebar menus for every role (Platform + Simulator parity)

---

## 2. Complete Template Inventory by Section

### Legend
- ✅ EXISTS — service + page already built
- ⚠️ PARTIAL — service exists, needs full CRUD page
- ❌ NEW — new DB table + service + full CRUD pages required

---

### PRE-PROJECT *(Business Case and Benefits Realisation Plan moved here as requested)*

| # | Template / Document | Status | Service |
|---|---|---|---|
| 1 | Business Case | ✅ EXISTS | `businessCaseService` |
| 2 | Benefits Realisation Plan | ✅ EXISTS | `benefitsReviewPlanService` |
| 3 | Project Mandate / Charter | ✅ EXISTS | `mandateConstraintService` |

> Pre-Project documents exist before formal project authorisation. They are not part of any of the 5 process groups.

---

### 🟣 INITIATING

| # | Template / Document | Status | New Table |
|---|---|---|---|
| 1 | **Project Charter** | ❌ NEW | `project_charters` |
| 2 | **Assumption Log** | ❌ NEW | `assumption_logs` |
| 3 | Stakeholder Register (initial identification) | ✅ EXISTS | — |
| 4 | Project Brief | ✅ EXISTS | — |

**Registers & Logs shown in this group's hub panel:**
- Stakeholder Register (link)
- Risk Register — initial risk identification (link)
- Daily Log (link)

---

### 🔵 PLANNING

| # | Template / Document | Status | New Table |
|---|---|---|---|
| 1 | **Project Management Plan** | ❌ NEW | `project_management_plans` |
| 2 | Scope Management Plan | ✅ EXISTS | — |
| 3 | **Requirements Management Plan** | ❌ NEW | `requirements_management_plans` |
| 4 | **Requirements Documentation** | ❌ NEW | `requirements_documentation` |
| 5 | Requirements Traceability Matrix | ✅ EXISTS | — |
| 6 | Project Scope Statement | ✅ EXISTS | — |
| 7 | Work Breakdown Structure (WBS) | ✅ EXISTS | — |
| 8 | **WBS Dictionary** | ❌ NEW | `wbs_dictionary_entries` |
| 9 | Schedule Management Plan | ✅ EXISTS | — |
| 10 | Activity List | ✅ EXISTS | — |
| 11 | **Activity Attributes** | ❌ NEW | `activity_attributes` |
| 12 | Milestone List | ✅ EXISTS | — |
| 13 | **Activity Resource Requirements** | ❌ NEW | `activity_resource_requirements` |
| 14 | **Resource Breakdown Structure (RBS)** | ❌ NEW | `resource_breakdown_structure` |
| 15 | **Activity Duration Estimates** | ❌ NEW | `activity_duration_estimates` |
| 16 | Project Schedule | ✅ EXISTS | — |
| 17 | **Cost Management Plan** | ❌ NEW | `cost_management_plans` |
| 18 | **Activity Cost Estimates** | ❌ NEW | `activity_cost_estimates` |
| 19 | **Cost Baseline** | ❌ NEW | `cost_baselines` |
| 20 | Quality Management Plan | ✅ EXISTS | — |
| 21 | **Resource Management Plan** | ❌ NEW | `resource_management_plans` |
| 22 | Communications Management Plan | ✅ EXISTS | — |
| 23 | Risk Management Plan | ✅ EXISTS | — |
| 24 | Risk Register (initial) | ✅ EXISTS | — |
| 25 | **Procurement Management Plan** | ❌ NEW | `procurement_management_plans` |
| 26 | **Stakeholder Engagement Plan** | ❌ NEW | `stakeholder_engagement_plans` |
| 27 | Change Management Plan | ✅ EXISTS | — |
| 28 | Configuration Management Plan | ✅ EXISTS | — |
| 29 | Project Initiation Document (PID) | ✅ EXISTS | — |

**Registers & Logs shown in this group's hub panel:**
- Risk Register (link)
- Requirements Traceability Matrix (link)
- Decision Log (link)

---

### 🟢 EXECUTING

| # | Template / Document | Status | New Table |
|---|---|---|---|
| 1 | Work Package | ⚠️ PARTIAL | `work_packages` (wp* services exist, needs hub page) |
| 2 | **Quality Checklists** | ❌ NEW | `quality_checklists` + `quality_checklist_items` |
| 3 | Issue Log | ✅ EXISTS | — |
| 4 | Change Request | ✅ EXISTS | — |
| 5 | **Team Performance Assessment** | ❌ NEW | `team_performance_assessments` |
| 6 | Lessons Learned Register | ✅ EXISTS | — |
| 7 | **Make-or-Buy Decision Log** | ❌ NEW | `make_or_buy_decisions` |
| 8 | Procurement Documents / RFP | ✅ EXISTS | — |
| 9 | Checkpoint Report | ✅ EXISTS | — |

**Registers & Logs shown in this group's hub panel:**
- Issue Register (link)
- Change Log (link)
- Quality Register (link)
- Daily Log (link)

---

### 🟡 MONITORING & CONTROLLING

| # | Template / Document | Status | New Table |
|---|---|---|---|
| 1 | Highlight Report | ✅ EXISTS | — |
| 2 | Exception Report | ✅ EXISTS | — |
| 3 | End Stage Report | ✅ EXISTS | — |
| 4 | Change Log / Register | ✅ EXISTS | — |
| 5 | Issue Register (updates) | ✅ EXISTS | — |
| 6 | Risk Register (updates) | ✅ EXISTS | — |
| 7 | Delay Register | ✅ EXISTS | — |
| 8 | Decision Log | ✅ EXISTS | — |
| 9 | Quality Register (updates) | ✅ EXISTS | — |
| 10 | **Variance Analysis Report** | ❌ NEW | `variance_analysis_reports` |
| 11 | **Earned Value Status Report** | ⚠️ PARTIAL | `evm_status_reports` (evmService exists, needs report page) |
| 12 | **Scope Validation / Deliverable Acceptance Form** | ❌ NEW | `scope_acceptance_forms` |

**Registers & Logs shown in this group's hub panel:**
- Delay Register (link)
- Change Register (link)
- Issue Register (link)
- Decision Log (link)

---

### ⚫ CLOSING

| # | Template / Document | Status | New Table |
|---|---|---|---|
| 1 | End Project Report | ✅ EXISTS | — |
| 2 | Lessons Learned Report | ✅ EXISTS | — |
| 3 | Benefits Realisation Review | ✅ EXISTS | — |
| 4 | **Project Closure Checklist** | ❌ NEW | `project_closure_checklists` + `project_closure_checklist_items` |
| 5 | **Contract Closure Document** | ❌ NEW | `contract_closure_documents` |
| 6 | Daily Log (final entries) | ✅ EXISTS | — |

**Registers & Logs shown in this group's hub panel:**
- Lessons Log (link)
- Benefits Register (link)
- Final Risk Register (link)

---

## 3. New Items Count

| Category | Count |
|---|---|
| New full CRUD pages (❌ NEW DB tables) | 20 |
| Partial items needing full hub pages (⚠️) | 3 (Work Package, EVM Status Report, Cost Baseline) |
| Existing items — already built, just linked | 37 |
| **Total documents in hub** | **60** |

---

## 4. New DB Tables Required (20)

Each new table follows the existing pattern: `id`, `project_id`, `account_id`, `created_by`, `status` (draft/active/on_hold), `created_at`, `updated_at`. All need RLS policies and `database_tables` registry entries.

```
project_charters
assumption_logs
project_management_plans
requirements_management_plans
requirements_documentation
wbs_dictionary_entries          -- linked to wbs_nodes.id
activity_attributes             -- linked to activity_list.id
activity_resource_requirements  -- linked to activity_list.id
resource_breakdown_structure
activity_duration_estimates     -- linked to activity_list.id
cost_management_plans
activity_cost_estimates         -- linked to activity_list.id
cost_baselines
resource_management_plans
stakeholder_engagement_plans
procurement_management_plans
quality_checklists + quality_checklist_items
team_performance_assessments
make_or_buy_decisions
variance_analysis_reports
evm_status_reports
scope_acceptance_forms
project_closure_checklists + project_closure_checklist_items
contract_closure_documents
```

SQL file: `SQL/v629_process_templates_new_tables.sql`

---

## 5. New Service Files Required (20)

Each service follows the pattern of existing services (create, getById, listByProject, update, delete, setOnHold).

```
src/services/projectCharterService.js
src/services/assumptionLogService.js
src/services/projectManagementPlanService.js
src/services/requirementsManagementPlanService.js
src/services/requirementsDocumentationService.js
src/services/wbsDictionaryService.js
src/services/activityAttributesService.js
src/services/activityResourceRequirementsService.js
src/services/resourceBreakdownStructureService.js
src/services/activityDurationEstimatesService.js
src/services/costManagementPlanService.js
src/services/activityCostEstimatesService.js
src/services/costBaselineService.js
src/services/resourceManagementPlanService.js
src/services/stakeholderEngagementPlanService.js
src/services/procurementManagementPlanService.js
src/services/qualityChecklistService.js
src/services/teamPerformanceAssessmentService.js
src/services/makeOrBuyDecisionService.js
src/services/varianceAnalysisReportService.js
src/services/evmStatusReportService.js           -- wraps evmService
src/services/scopeAcceptanceFormService.js
src/services/projectClosureChecklistService.js
src/services/contractClosureDocumentService.js
```

Simulator mirror services (each `sim*` variant under `src/services/sim/`):
- Same 20 services prefixed with `sim` using `simDb`

---

## 6. New Page Files Required

For each of the 20 new items, 4 pages are needed:
`{Name}ListPage`, `{Name}CreatePage`, `{Name}EditPage`, `{Name}DetailPage`

**Under `src/pages/pmo/` (PMO — full CRUD)**
**Under `src/pages/pm/` (PM — view master + edit own copies)**
**Under `src/pages/simulator/pmo/` and `src/pages/simulator/pm/` (Simulator parity)**

Full list (× 4 pages per item × 2 roles × 2 systems = up to 320 page files):
> To avoid duplication, shared components handle the role-permission logic. The PMO and PM pages are thin wrappers passing `mode` and `canEditMaster` props to the shared components.

**Shared components under `src/components/processTemplates/`:**

| Component | Purpose |
|---|---|
| `ProcessTemplatesHub.jsx` | Hub index — Pre-Project + 5 group cards |
| `ProcessTemplatesDetail.jsx` | Group detail — 3 panels (templates, registers, logs) |
| `ProcessTemplatesPanel.jsx` | Template list with PMO edit / non-PMO copy guards |
| `ProcessTemplatesRegisterPanel.jsx` | Links to register pages for this group |
| `ProcessTemplatesLogPanel.jsx` | Links to log pages for this group |
| `TemplateCopyModal.jsx` | Copy master to workspace modal |
| `processTemplatesRegistry.js` | Static config: which registers/logs belong to each group |

---

## 7. New Routes

### Platform PMO
```
/pmo/process-templates                         Hub index
/pmo/process-templates/:group                  Group detail (group = pre-project|initiating|planning|executing|monitoring-controlling|closing)
/pmo/process-templates/project-charter         List
/pmo/process-templates/project-charter/new     Create
/pmo/process-templates/project-charter/:id     Detail
/pmo/process-templates/project-charter/:id/edit Edit
... (same pattern for all 20 new templates)
```

### Platform PM
```
/pm/process-templates                          Hub index
/pm/process-templates/:group                   Group detail
/pm/process-templates/:template/:id            Detail (read-only master)
/pm/process-templates/copies/:copyId           Edit own copy
```

### Simulator PMO / PM
```
/simulator/pmo/process-templates
/simulator/pmo/process-templates/:group
/simulator/pm/process-templates
/simulator/pm/process-templates/:group
```

---

## 8. Sidebar Menu Changes

### 8.1 PMO Sidebar — new section (insert after order 7 "Project Oversight")

```
Process Templates  (order 7.5)
├── Hub Overview           → /pmo/process-templates
├── Pre-Project            → /pmo/process-templates/pre-project
├── 🟣 Initiating          → /pmo/process-templates/initiating
├── 🔵 Planning            → /pmo/process-templates/planning
├── 🟢 Executing           → /pmo/process-templates/executing
├── 🟡 Monitoring & Controlling → /pmo/process-templates/monitoring-controlling
└── ⚫ Closing             → /pmo/process-templates/closing
```

### 8.2 PM Sidebar — new section (insert after "Controls & Registers")
Same structure, paths under `/pm/process-templates/`

### 8.3 Simulator PMO Sidebar
Same structure, paths under `/simulator/pmo/process-templates/`

### 8.4 Simulator PM Sidebar
Same structure, paths under `/simulator/pm/process-templates/`

### 8.5 Team Member Sidebar (Platform) — `src/hooks/useMenu.js`
The Platform TM/TL sidebar is **not** a static config file. It is built dynamically by `ensureTeamMemberMenus(menuItems, isLead)` inside `useMenu.js`. A `sectionForms` virtual section already exists there (code `tm_section_forms`, label `Process Group Forms`). We need to add a new `sectionProcessTemplates` section alongside it.

```
Process Templates  (new virtual section, sort_order 65 — between Forms and Team Charter)
├── All Process Templates  → /pm/process-templates        (read + copy)
├── Pre-Project            → /pm/process-templates/pre-project
├── Initiating             → /pm/process-templates/initiating
├── Planning               → /pm/process-templates/planning
├── Executing              → /pm/process-templates/executing
├── Monitoring & Control   → /pm/process-templates/monitoring-controlling
└── Closing                → /pm/process-templates/closing
```

Both Team Member (`isLead = false`) and Team Manager/Lead (`isLead = true`) get the same Process Templates section — same read-only + copy access, same routes.

### 8.6 Team Member Sidebar (Simulator) — `src/config/simulatorTMMenuConfig.js`
The Simulator TM already has a `sim-tm-forms` section (Process Group Forms). Add a new `sim-tm-process-templates` section:

```
Process Templates  (id: sim-tm-process-templates, after sim-tm-forms)
├── All Process Templates  → /simulator/pm/process-templates
├── Pre-Project            → /simulator/pm/process-templates/pre-project
├── Initiating             → /simulator/pm/process-templates/initiating
├── Planning               → /simulator/pm/process-templates/planning
├── Executing              → /simulator/pm/process-templates/executing
├── Monitoring & Control   → /simulator/pm/process-templates/monitoring-controlling
└── Closing                → /simulator/pm/process-templates/closing
```

---

## 9. Role Permission Matrix

| Action | PMO | Portfolio Mgr | Programme Mgr | Project Mgr | Team Manager / Lead | Team Member |
|---|---|---|---|---|---|---|
| View master template | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create master template | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Edit master template | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Delete master template | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Copy template to workspace | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit own copy | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Delete own copy | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View registers/logs | ✅ | ✅ | ✅ | ✅ | ✅ (team scope) | ✅ (own) |

---

## 10. Todo List

### Phase 1 — Foundation (Hub + Pre-Project)
- [x] **T01** Create `src/components/processTemplates/processTemplatesRegistry.js` — static config of groups → templates/registers/logs
- [x] **T02** Create `ProcessTemplatesHub.jsx` — Pre-Project card + 5 group cards, colour-coded
- [x] **T03** Create `ProcessTemplatesDetail.jsx` — 3-panel layout
- [x] **T04** Create `ProcessTemplatesPanel.jsx` — role-gated edit/copy buttons
- [x] **T05** Create `ProcessTemplatesRegisterPanel.jsx` — links to existing register pages
- [x] **T06** Create `ProcessTemplatesLogPanel.jsx` — links to existing log pages
- [x] **T07** Create `TemplateCopyModal.jsx` — copy master → workspace
- [x] **T08** Create `src/services/processTemplatesService.js` — canEditMasterTemplate(), getGroupRegistry()
- [x] **T09** Add PMO hub pages (`PMOProcessTemplatesHubPage`, `PMOProcessTemplatesDetailPage`)
- [x] **T10** Add PM hub pages (`PMProcessTemplatesHubPage`, `PMProcessTemplatesDetailPage`)
- [x] **T11** Register PMO routes `/pmo/process-templates` and `/pmo/process-templates/:group`
- [x] **T12** Register PM routes `/pm/process-templates` and `/pm/process-templates/:group`
- [x] **T13** Update `pmoMenuConfig.js` — add Process Templates section
- [x] **T14** Update `pmDashboardMenuConfig.js` — add Process Templates section

### Phase 2 — Initiating: New Templates
- [x] **T15** SQL: `project_charters` table + RLS + registry entry
- [x] **T16** `projectCharterService.js` (Platform) + `sim/simProjectCharterService.js`
- [x] **T17** `ProjectCharterListPage`, `ProjectCharterCreatePage`, `ProjectCharterEditPage`, `ProjectCharterDetailPage` (PMO + PM variants)
- [x] **T18** Register routes for Project Charter
- [x] **T19** SQL: `assumption_logs` table + RLS + registry entry
- [x] **T20** `assumptionLogService.js` + sim variant
- [x] **T21** `AssumptionLogListPage`, `AssumptionLogCreatePage`, `AssumptionLogEditPage`, `AssumptionLogDetailPage`
- [x] **T22** Register routes for Assumption Log

### Phase 3 — Planning: New Templates (Group A — document plans)
- [x] **T23** SQL: `project_management_plans` + RLS + registry
- [x] **T24** `projectManagementPlanService.js` + sim variant
- [x] **T25** CRUD pages for Project Management Plan
- [x] **T26** SQL: `requirements_management_plans` + RLS + registry
- [x] **T27** `requirementsManagementPlanService.js` + sim variant
- [x] **T28** CRUD pages for Requirements Management Plan
- [x] **T29** SQL: `requirements_documentation` + RLS + registry
- [x] **T30** `requirementsDocumentationService.js` + sim variant
- [x] **T31** CRUD pages for Requirements Documentation
- [x] **T32** SQL: `cost_management_plans` + RLS + registry
- [x] **T33** `costManagementPlanService.js` + sim variant
- [x] **T34** CRUD pages for Cost Management Plan
- [x] **T35** SQL: `resource_management_plans` + RLS + registry
- [x] **T36** `resourceManagementPlanService.js` + sim variant
- [x] **T37** CRUD pages for Resource Management Plan
- [x] **T38** SQL: `procurement_management_plans` + RLS + registry
- [x] **T39** `procurementManagementPlanService.js` + sim variant
- [x] **T40** CRUD pages for Procurement Management Plan
- [x] **T41** SQL: `stakeholder_engagement_plans` + RLS + registry
- [x] **T42** `stakeholderEngagementPlanService.js` + sim variant
- [x] **T43** CRUD pages for Stakeholder Engagement Plan

### Phase 4 — Planning: New Templates (Group B — schedule/cost artefacts)
- [x] **T44** SQL: `wbs_dictionary_entries` (FK to wbs_nodes) + RLS + registry
- [x] **T45** `wbsDictionaryService.js` + sim variant
- [x] **T46** CRUD pages for WBS Dictionary
- [x] **T47** SQL: `activity_attributes` (FK to activity_list) + RLS + registry
- [x] **T48** `activityAttributesService.js` + sim variant
- [x] **T49** CRUD pages for Activity Attributes
- [x] **T50** SQL: `activity_resource_requirements` (FK to activity_list) + RLS + registry
- [x] **T51** `activityResourceRequirementsService.js` + sim variant
- [x] **T52** CRUD pages for Activity Resource Requirements
- [x] **T53** SQL: `resource_breakdown_structure` + RLS + registry
- [x] **T54** `resourceBreakdownStructureService.js` + sim variant
- [x] **T55** CRUD pages for Resource Breakdown Structure
- [x] **T56** SQL: `activity_duration_estimates` (FK to activity_list) + RLS + registry
- [x] **T57** `activityDurationEstimatesService.js` + sim variant
- [x] **T58** CRUD pages for Activity Duration Estimates
- [x] **T59** SQL: `activity_cost_estimates` (FK to activity_list) + RLS + registry
- [x] **T60** `activityCostEstimatesService.js` + sim variant
- [x] **T61** CRUD pages for Activity Cost Estimates
- [x] **T62** SQL: `cost_baselines` + RLS + registry
- [x] **T63** `costBaselineService.js` + sim variant
- [x] **T64** CRUD pages for Cost Baseline

### Phase 5 — Executing: New Templates
- [x] **T65** SQL: `quality_checklists` + `quality_checklist_items` + RLS + registry
- [x] **T66** `qualityChecklistService.js` + sim variant
- [x] **T67** CRUD pages for Quality Checklists
- [x] **T68** SQL: `team_performance_assessments` + RLS + registry
- [x] **T69** `teamPerformanceAssessmentService.js` + sim variant
- [x] **T70** CRUD pages for Team Performance Assessment
- [x] **T71** SQL: `make_or_buy_decisions` + RLS + registry
- [x] **T72** `makeOrBuyDecisionService.js` + sim variant
- [x] **T73** CRUD pages for Make-or-Buy Decision Log
- [x] **T74** Work Package: add hub page wiring (wp* services already exist)

### Phase 6 — Monitoring & Controlling: New Templates
- [x] **T75** SQL: `variance_analysis_reports` + RLS + registry
- [x] **T76** `varianceAnalysisReportService.js` + sim variant
- [x] **T77** CRUD pages for Variance Analysis Report
- [x] **T78** SQL: `evm_status_reports` + RLS + registry
- [x] **T79** `evmStatusReportService.js` (wraps existing evmService) + sim variant
- [x] **T80** CRUD pages for Earned Value Status Report
- [x] **T81** SQL: `scope_acceptance_forms` + RLS + registry
- [x] **T82** `scopeAcceptanceFormService.js` + sim variant
- [x] **T83** CRUD pages for Scope Validation / Acceptance Form

### Phase 7 — Closing: New Templates
- [x] **T84** SQL: `project_closure_checklists` + `project_closure_checklist_items` + RLS + registry
- [x] **T85** `projectClosureChecklistService.js` + sim variant
- [x] **T86** CRUD pages for Project Closure Checklist
- [x] **T87** SQL: `contract_closure_documents` + RLS + registry
- [x] **T88** `contractClosureDocumentService.js` + sim variant
- [x] **T89** CRUD pages for Contract Closure Document

### Phase 8 — Simulator Parity
- [x] **T90** Add Simulator PMO hub pages + routes (`/simulator/pmo/process-templates`)
- [x] **T91** Add Simulator PM hub pages + routes (`/simulator/pm/process-templates`)
- [x] **T92** Update `simulatorPMOMenuConfig.js` — add Process Templates section
- [x] **T93** Update `simulatorPMMenuConfig.js` — add Process Templates section
- [x] **T94** Update `src/hooks/useMenu.js` `ensureTeamMemberMenus()` — add `sectionProcessTemplates` virtual section (sort_order 65) for both Team Member and Team Manager/Lead (same access; `isLead` flag does not change Process Templates permissions)
- [x] **T95b** Update `src/config/simulatorTMMenuConfig.js` — add `sim-tm-process-templates` section with full 6-group sublinks under `/simulator/pm/process-templates`
- [x] **T95** Verify all 20 sim* service files use `simDb` (never `platformDb`)

### Phase 9 — Quality & Finishing
- [x] **T96** Unit tests for `processTemplatesService.js`
- [x] **T97** Unit tests for each of the 20 new services (one test file per service)
- [x] **T98** Dark mode / theme-aware check on all new components
- [x] **T99** PWA / mobile responsive check on hub and detail pages
- [x] **T100** Export dropdown (excel/word/ppt/csv/json/print) on all new list and detail pages
- [x] **T101** Sortable column headers + card/table view toggle on all new list pages
- [x] **T102** Hold/draft queue wiring for all 20 new create/edit pages
- [x] **T103** Success confirmation toast/modal on all create/update/delete actions
- [x] **T104** Confirm no duplicate import errors across all new files

---

## 11. SQL File Summary

Single SQL file covering all 20 new tables:
`SQL/v629_process_templates_new_tables.sql`

Sections within that file:
1. `project_charters`
2. `assumption_logs`
3. `project_management_plans`
4. `requirements_management_plans`
5. `requirements_documentation`
6. `wbs_dictionary_entries`
7. `activity_attributes`
8. `activity_resource_requirements`
9. `resource_breakdown_structure`
10. `activity_duration_estimates`
11. `cost_management_plans`
12. `activity_cost_estimates`
13. `cost_baselines`
14. `resource_management_plans`
15. `stakeholder_engagement_plans`
16. `procurement_management_plans`
17. `quality_checklists` + `quality_checklist_items`
18. `team_performance_assessments`
19. `make_or_buy_decisions`
20. `variance_analysis_reports`
21. `evm_status_reports`
22. `scope_acceptance_forms`
23. `project_closure_checklists` + `project_closure_checklist_items`
24. `contract_closure_documents`
25. `database_tables` registry INSERTs for all above

---

## 12. Key Design Decisions

1. **Pre-Project is a display section only** — Business Case, Benefits Realisation Plan, and Project Mandate already exist; they are re-linked under the hub, not moved in DB.
2. **Activity-linked tables** (attributes, resource requirements, duration estimates, cost estimates) use a FK to the existing `activity_list` table to avoid duplicating schedule data.
3. **WBS Dictionary** entries link to `wbs_nodes` via FK so each WBS element can have a corresponding dictionary description.
4. **Shared CRUD components** — PMO and PM pages are thin wrappers around shared components; role logic is prop-driven (`canEditMaster`, `mode`), not duplicated.
5. **Simulator tables** live in `sim` schema following existing convention. Each sim service uses `simDb`.
6. **No changes to existing pages** — existing register/log pages are linked from hub panels, not replaced.

---

## 13. Review *(completed 2026-05-26)*

### Summary
Implemented the full v629 Process Templates hub with Platform and Simulator parity:

- **Registry** (`processTemplatesRegistry.js`) — 60 hub items across Pre-Project + 5 PMBOK groups, with paths for PMO/PM/Sim roles.
- **Hub UI** — `ProcessTemplatesHub`, `ProcessTemplatesDetail`, panel components, and `TemplateCopyModal` with role-gated copy workflow.
- **Generic CRUD** — Shared `ProcessTemplateListPage`, `CreatePage`, `EditPage`, `DetailPage` driven by slug (avoids 320 duplicate page files).
- **Services** — `processTemplateCrudFactory.js` + `processTemplatesService.js` + 24 platform + 24 sim thin service wrappers.
- **SQL** — `SQL/v629_process_templates_new_tables.sql` (public + sim schemas, RLS, `database_tables` registry).
- **Routes** — `/pmo|pm|simulator/pmo|simulator/pm/process-templates/*` via `ProcessTemplatesRoutes.jsx`.
- **Menus** — PMO, PM, Simulator PMO/PM, Team Member (`useMenu.js`), Simulator TM sidebars.
- **Draft queue** — 48 entity types in `draftQueueConfig.js` for hold/draft on create/edit.
- **Quality** — Sort/view toggle, row numbers, export dropdown, hold/draft, success toasts; unit tests in `processTemplatesService.test.js`.
- **Build** — Production build passes.

### Notes
- New template list routes use prefix `t/` (e.g. `/pmo/process-templates/t/project-charter`) to avoid collision with group detail routes.
- Sim tables use `practice_project_id`; factory maps project selector IDs accordingly.
- Apply `SQL/v629_process_templates_new_tables.sql` in Supabase before using CRUD against live data.
- Apply `SQL/v632_process_templates_nullable_project_for_masters.sql` so PMO masters are not project-scoped.
- **Seed data (optional):** `v633` Platform masters, `v634` Simulator masters, `v629`/`v635` sidebar menus — see `Documentation/Process_Templates_Seed_Data_Guide.md`.

