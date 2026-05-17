# v567 — PM Sidebar Rationalisation Plan

**Objective:** Rationalise the Project Manager sidebar by merging shared PMO/PM items under a clean, best-practice structure. Remove duplications. Give PMs appropriate access levels (full, view-only, or restricted) per their role. Leave the PMO menu unchanged.

**Constraint:** PMO menu is frozen — no changes to `pmoMenuConfig.js` or any PMO `role_menu_items`.

---

## 1. Access-Level Framework (Best Practice)

| Level | Meaning | PM applicability |
|---|---|---|
| **Full** | Create, read, update, delete, approve | Own project's delivery artefacts |
| **Contribute** | Create and edit; cannot approve or delete others' | Shared registers, forms, reports |
| **View-only** | Read access, no create/edit | PMO governance baselines, strategies |
| **None** | No access | Organisation admin, Portfolio/Programme oversight, Email admin |

---

## 2. Full Overlap / Duplication Analysis

### 2a. Items that exist in BOTH menus — rationalisation decision

| Topic | PMO path | PM path (current) | Decision |
|---|---|---|---|
| Dashboard | `/pmo/dashboard` (PMO executive) | `/platform/dashboard` (project-scoped) | **Keep both, different scopes.** PM gets project dashboard tab. |
| My Projects | `/platform/projects` | `/platform/projects` | **Same page.** One entry for PM. |
| Create Project | `/platform/projects/create` | `/platform/projects/create` | **Full access** for PM (they initiate projects). |
| Archived Projects | `/platform/projects/archives` | `/platform/projects/archives` | **View-only** for PM (own projects only). |
| On Hold / Drafts | `/app/projects/on-hold` | `/app/projects/on-hold` | **Full** for PM (own projects only). |
| Members & roles | `/app/project-members` | `/app/project-members` | **Full** for PM (their project). |
| Templates | `/platform/templates` | `/platform/templates` | **View-only** for PM (PMO owns templates). |
| Daily Log | `/app/daily-log/my-entries` | `/app/daily-log/my-entries` | **Full** for PM (personal). |
| Process Group Forms | `/pmo/forms` (all) | `/platform/projects/:id/forms` (scoped) | **PM gets project-scoped forms only.** Different route. |
| Risk Register | `/pmo/oversight/risk-register` (ALL projects) | project-scoped route | **PM gets own-project route only.** PMO keeps cross-project oversight. |
| Issue Log | `/pmo/oversight/issue-register` (ALL) | project-scoped | Same split as risk. |
| Change Register | `/pmo/registers/changes` (ALL) | project-scoped | Same split. |
| Quality Register | `/pmo/oversight/quality-register` (ALL) | project-scoped | Same split. |
| Lessons Log | `/pmo/oversight/lessons-log` (ALL) | project-scoped | Same split. |
| Delay Register | `/pmo/oversight/delays` (ALL) | `/platform/delays` (own) | **PM: own project delays. Full access.** |
| Report Library | `/platform/reports` | `/platform/reports` | **Full** for PM (own project reports). |
| Analytics | `/platform/reports/analytics` | `/platform/reports/analytics` | **View-only** for PM. |
| Highlight Reports | `/pmo/reporting/highlight-reports` | Existed in PM config | **Contribute** — PM *submits* their own; PMO *reads all*. Same route, different data shown. |
| Exception Reports | `/pmo/reporting/exception-reports` | Existed in PM config | Same as Highlight. |
| End Stage Reports | `/pmo/reporting/end-stage-reports` | Existed in PM config | **Contribute** for PM. |
| End Project Reports | `/pmo/reporting/end-project-reports` | Existed in PM config | **Contribute** for PM. |
| Communication Strategy | `/pmo/governance/communication-strategy` | PM config had it | **View-only** for PM — PMO sets baseline, PM reads. |
| Configuration Strategy | `/pmo/governance/configuration-strategy` | PM config had it | **View-only** for PM. |
| Quality Strategy | `/pmo/governance/quality-strategy` | PM config had it | **View-only** for PM. |
| Risk Strategy | `/pmo/governance/risk-strategy` | PM config had it | **View-only** for PM. |
| ITTO Templates | `/platform/itto/templates` | PM config had it | **View-only** for PM. |
| Testing Centre | `/platform/testing-centre` | PM config had it | **Full** for PM (own project testing only). |
| Stakeholder Register | `/platform/stakeholders/register` | PM config had it | **Full** for PM (own project). |
| Resource Directory | `/platform/teams/directory` | PM config had it | **View-only** for PM. |
| Business Case | `/pmo/initiation/business-case` | PM config had it | **Contribute** — PM submits for own project, PMO approves. |
| Project Brief | `/pmo/initiation/project-brief` | PM config had it | **Contribute** for PM. |

### 2b. Items PMO has that PM should NOT see

| Item | Reason |
|---|---|
| PMO Dashboard (`/pmo/dashboard`) | Executive cross-portfolio — PMO only |
| Portfolio (all sub-items) | Strategic portfolio management — PMO only |
| Programme Management | Cross-project programme delivery — PMO only |
| Benefits Management (programme-level) | PMO strategic scope |
| Project Oversight routes (`/pmo/oversight/...`) | Cross-project read — PMO only; PM uses project-scoped routes |
| PMO Planning routes (`/pmo/planning/collisions`, `/pmo/planning/governance-config`) | Cross-portfolio collision detection and org-wide governance config — PMO only. PM uses `/pm/planning/*` routes |
| PMO Oversight Scope/Schedule (`/pmo/oversight/scope`, `/pmo/oversight/schedules`) | Cross-project scope/schedule audit — PMO only; PM has project-scoped equivalents |
| Financial Management (Portfolio EVM, Expense Approvals org-wide, Thresholds) | PMO financial governance |
| Procurement (Load RFP, RFP Drafts — write) | PMO only; PM can *view* RFP Register |
| Administration section | Organisation settings, user management, role menu config — PMO only |
| Email & Notifications | Email admin — PMO only |
| People & Resources (Manager Assignments, Assignment Settings) | PMO workforce management |
| Role Menu Access | System config — PMO only |
| Subscription / Branding | System admin — PMO only |
| Corporate Lessons | PMO oversight aggregation |

### 2c. Items PM has that are not in PMO menu (PM-exclusive)

| Item | Status |
|---|---|
| AI Assistant | Keep for PM |
| Tasks (My Tasks, Board, Calendar) | Keep — PM delivery tooling |
| My Lesson Actions (personal) | Keep |
| Teams → My Team | Keep |
| Teams → Skill Matrix | Keep |
| Teams → Leave Calendar | Keep |
| Work Authorisations (request) | Keep — PM submits, PMO approves |
| Report Builder | Keep (own project) |
| Team & Members section (from v399) | Keep — PM-specific invite flow |

---

## 3. Rationalised PM Sidebar — Proposed Structure

```
§1  PROJECT DASHBOARD
    • Project Dashboard              /platform/dashboard?tab=projects   [Full]

§2  MY PROJECTS
    • My Projects                    /platform/projects                  [Full]
    • Create Project                 /platform/projects/create           [Full]
    • On Hold / Drafts               /app/projects/on-hold               [Full]
    • Archived Projects              /platform/projects/archives         [View]

§3  TEAM & MEMBERS
    • Manage Members                 /app/project-members                [Full]
    • Invite Team Manager / Lead     /app/project-members?action=invite&role=team_manager  [Full]
    • Invite Project Team Member     /app/project-members?action=invite  [Full]
    • Pending Invitations            /app/project-members?tab=pending    [Full]

§4  PROJECT PLANNING  (project-scoped — full access)

    ── Plans & Documents ──
    • Plans Dashboard                /platform/projects/:id/plans                         [Full]
    • Project Plan                   /platform/projects/:id/plans/project-plan            [Full]
    • Create Stage Plan              /platform/projects/:id/plans/stage-plan/create       [Full]

    ── Scope Management ──
    • Scope Statement                /platform/projects/:id/scope/statement               [Full]
    • Scope Management Plan          /platform/projects/:id/scope/management-plan         [Full]
    • WBS Builder                    /platform/projects/:id/scope/wbs                     [Full]
    • Requirements Register          /platform/projects/:id/scope/requirements            [Full]
    • Traceability Matrix            /platform/projects/:id/scope/traceability            [Full]

    ── Schedule & Activities ──
    • Schedule Management Plan       /platform/projects/:id/schedule/management-plan      [Full]
    • Activity List                  /platform/projects/:id/schedule/activities           [Full]
    • Activity Sequencing            /platform/projects/:id/schedule/dependencies         [Full]
    • Gantt Chart                    /platform/projects/:id/schedule/gantt               [Full]
    NOTE: Activity Detail (effort / duration estimates, attributes) accessible via Activity List rows.

    ── Resource Planning ──
    • Resource List                  /platform/resources                                  [Full]
    • Capacity Planning              /platform/resources/capacity                         [Full]
    • Resource Conflicts             /platform/resources/conflicts                        [View]  ← PM sees conflicts; resolution is PMO/TM

    ── Advanced Planning Tools ──  (dedicated PM routes at /pm/planning/*)
    • Planning Hub                   /pm/planning                                         [Full]
    • AI Plan Generator              /pm/planning/ai                                      [Full]
    • What-If Scenarios              /pm/planning/scenarios                               [Full]
    • PBS Builder                    /pm/planning/pbs                                     [Full]
    • Plan Health Dashboard          /pm/planning/health                                  [Full]
    • Confidence Forecast            /pm/planning/confidence                              [Full]
    • Recovery Planning              /pm/planning/recovery                                [Full]
    • Governance Gates               /pm/planning/governance                              [Contribute]
    • Planning Analytics             /pm/planning/intelligence                            [View]   ← PM-scoped only; PMO cross-portfolio version excluded
    • Micro Plans                    /pm/planning/microplans                              [Full]
    • Micro Plan Drafts              /pm/planning/microplans/drafts                       [Full]

§5  DELIVERY CONTROLS  (RAID + Change + Delay + Team Artefacts)

    ── RAID & Change ──
    • Risk Register                  /app/risks (project-scoped)         [Full]
    • Issue Log                      /app/issues (project-scoped)        [Full]
    • Change Requests                /app/change-requests (scoped)       [Full]
    • Delay Register                 /platform/delays                    [Full]
    • Daily Log                      /app/daily-log/my-entries           [Full]
    • Lessons Log                    /app/lessons/my-actions             [Full]

    ── Team Delivery Artefacts ──  (PM issues to / receives from Team Managers)
    • Work Packages                  /pm/delivery/work-packages                    [Full]  ← PM issues WPs to TMs; reviews TM execution
    • Checkpoint Reports             /pm/reporting/checkpoint-reports              [Full]  ← TMs submit progress reports; PM reads all
    • Product Descriptions           /pm/delivery/product-description              [Full]  ← PM defines product scope for TM delivery
    • Project Product Description    /pm/delivery/project-product-description      [Full]  ← top-level product scope baseline
    • Product Status Accounts        /pm/delivery/product-status-account           [Full]  ← PM tracks delivery status per product
    NOTE: Simulator equivalents use /simulator/pm/delivery/* and /simulator/pm/reporting/* prefixes — all routes exist in App.jsx.

§6  PROCESS GROUP FORMS
    • Initiating                     /platform/projects/:id/forms?group=Initiating   [Full]
    • Planning                       /platform/projects/:id/forms?group=Planning      [Full]
    • Executing                      /platform/projects/:id/forms?group=Executing     [Full]
    • Monitoring & Controlling       /platform/projects/:id/forms?group=Monitoring    [Full]
    • Closing                        /platform/projects/:id/forms?group=Closing       [Full]
    • Agile                          /platform/projects/:id/forms?group=Agile         [Full]
    • My Drafts                      /platform/projects/:id/forms/drafts              [Full]
    • Pending Approvals              /platform/projects/:id/forms?status=in_review    [Contribute]

§7  TASKS
    • My Tasks                       /platform/tasks                     [Full]
    • Board View                     /platform/tasks/board               [Full]
    • Calendar                       /platform/tasks/calendar            [Full]

§8  INITIATION DOCUMENTS  (contribute — own project; PMO reviews/approves)
    • Business Case                  /pmo/initiation/business-case       [Contribute]
    • Project Brief                  /pmo/initiation/project-brief       [Contribute]
    • Work Authorisations            /platform/work-authorisations       [Contribute]

§9  REPORTING  (project-scoped)
    • Report Library                 /platform/reports                   [Full]
    • Report Builder                 /platform/reports/builder           [Full]
    • Highlight Reports              /pmo/reporting/highlight-reports    [Contribute]
    • Exception Reports              /pmo/reporting/exception-reports    [Contribute]
    • End Stage Reports              /pmo/reporting/end-stage-reports    [Contribute]
    • End Project Reports            /pmo/reporting/end-project-reports  [Contribute]

§10 QUALITY & TESTING  (project-scoped)
    • Testing Dashboard              /platform/testing-centre            [Full]
    • Test Case Library              /platform/testing-centre/cases      [Full]
    • Test Suites                    /platform/testing-centre/suites     [Full]
    • Test Runs                      /platform/testing-centre/runs       [Full]
    • Screenshot Evidence            /platform/testing-centre/evidence   [Full]
    • Defects & Issue Links          /platform/testing-centre/defects    [Full]
    • Quality Register (own)         /platform/quality-management        [Full]

§11 STAKEHOLDERS
    • Stakeholder Register           /platform/stakeholders/register     [Full]
    • Engagement Planning            /platform/stakeholders/engagement   [Full]
    • Communication Plans            /platform/stakeholders/communications [Full]

§12 GOVERNANCE BASELINES  (view-only — set by PMO)
    • Communication Strategy         /pmo/governance/communication-strategy  [View]
    • Configuration Strategy         /pmo/governance/configuration-strategy  [View]
    • Quality Strategy               /pmo/governance/quality-strategy        [View]
    • Risk Strategy                  /pmo/governance/risk-strategy           [View]
    • ITTO Templates                 /platform/itto/templates                [View]
    • Project Mandate                /pmo/governance/mandate                 [View]

§13 ORG KNOWLEDGE — EEF & OPA  (already built — v401 SQL, routes /platform/eef & /platform/opa)
    • Org Knowledge Hub              /platform/org-knowledge             [View]  ← landing page
    • Environment Factors (EEF)      /platform/eef                       [View]  ← PMO-defined; PM reads only
    • Process Assets (OPA)           /platform/opa                       [Contribute]  ← PM views + contributes project OPAs
    • Add OPA                        /platform/opa/new                   [Contribute]  ← PM can submit own (lessons, historical info)
    • OPA Drafts                     /platform/opa/on-hold               [Full]  ← PM's own draft OPAs
    • Browse OPA Templates           /platform/opa?type=template         [View]  ← v572: PM browses PMO-defined templates before copying
    • My Project Templates           /app/projects/:id/opa-templates     [Full]  ← v572: PM's project-specific tailored templates
    NOTE: EEF Add/Edit/Bulk and OPA Bulk Upload → PMO-only (can_use=FALSE for project_manager)
          OPA Bulk Upload kept accessible to PMO only; PM uses single-record capture.
          Browse OPA Templates and My Project Templates are seeded by v573 (depends on v572 tailoring tables existing first).

§14 KNOWLEDGE & RESOURCES
    • Template Library               /platform/templates                 [View]
    • Resource Directory             /platform/teams/directory           [View]
    • Skill Matrix                   /platform/teams/skills              [View]
    • AI Assistant                   /platform/ai                        [Full]
    • Industry Templates             /platform/industry-templates        [View]   ← v575: browse PMO-seeded industry plan blueprints
    • My Industry Plan               /app/projects/:id/industry-plan     [Full]   ← v575: PM's project-scoped copy of an industry template

§15 COMMUNICATIONS & MEETINGS  (both Platform and Simulator routes fully built — no new pages needed)
    • Comms Hub                      /platform/comms                              [Full]  ← landing: channels + recent meetings
    • Schedule Meeting               /platform/comms/meetings/new                 [Full]  ← schedule video / audio meeting
    • My Meetings                    /platform/comms/meetings                     [Full]  ← all meetings PM is part of
    • Meeting Room                   /platform/comms/meetings/:id/room            [Full]  ← join/start video or audio call
    • Meeting Summaries              /platform/comms/meetings/summaries           [Full]  ← AI-generated meeting summaries
    • Direct Messages                /platform/comms/direct                       [Full]  ← 1:1 direct messaging
    • Channel Messages               /platform/comms/messages                     [Full]  ← team/project channel messaging
    • Pending AI Reviews             /platform/comms/pending-review               [Full]  ← review AI extractions (risks/issues from meeting notes)
    NOTE: Simulator equivalents use /simulator/comms/* prefix — all routes already exist in App.jsx for both systems.
          Meeting Room supports both video and audio calls (existing MeetingRoom.jsx component).
```

---

## 4. Access Level Summary per Section

| Section | Access | Notes |
|---|---|---|
| §1 Project Dashboard | Full | Project-scoped view only, not PMO executive |
| §2 My Projects | Full | Own/assigned projects only |
| §3 Team & Members | Full | Own project members only |
| §4 Project Planning | Full (View for Resource Conflicts, Contribute for Governance Gates) | Full planning suite — plans, scope, schedule, resources, advanced tools. PM routes only — PMO cross-portfolio planning excluded |
| §5 Delivery Controls | Full | Own project RAID/Change/Delay data + Team Delivery Artefacts (Work Packages, Checkpoint Reports, Product Descriptions, PSAs) — PM issues WPs to TMs and receives artefacts back |
| §6 Process Group Forms | Full (Contribute for approvals) | Own project forms |
| §7 Tasks | Full | Own + assigned tasks |
| §8 Initiation Documents | Contribute | PM submits; PMO reviews/approves |
| §9 Reporting | Full (own); Contribute (assurance reports) | Scoped to own project |
| §10 Quality & Testing | Full | Own project scope |
| §11 Stakeholders | Full | Own project |
| §12 Governance Baselines | **View-only** | PMO sets; PM reads for compliance |
| §13 Org Knowledge — EEF & OPA | View (EEF, Browse Templates) / Contribute (OPA add) / Full (Project Templates) | EEF read-only. OPA PM can contribute. Bulk upload PMO-only. Browse OPA Templates = view. My Project Templates = full CRUD on own project copies (v572) |
| §14 Knowledge & Resources | View-only (except My Industry Plan = Full) | Shared organisational assets. Industry Templates = View (browse blueprints); My Industry Plan = Full (PM's project copy — v575) |
| §15 Communications & Meetings | Full | Video/audio meetings, channels, DMs, AI meeting summaries. Scoped to PM's projects and teams |

---

## 5. What is REMOVED from current PM DB menu

Items to soft-delete from `role_menu_items` for `project_manager` (most were already cleaned by v398):

- All `/pmo/oversight/...` routes (cross-project — PMO only)
- All `/platform/portfolio/...` routes
- All `/platform/programme/...` routes  
- All `/platform/pmo-admin/...` routes
- All `/platform/admin/email-...` routes
- Manager Assignments, Assignment Settings
- **PMO-level planning routes**: `/pmo/planning`, `/pmo/planning/collisions`, `/pmo/planning/governance-config`, `/pmo/oversight/scope`, `/pmo/oversight/schedules` — PM uses `/pm/planning/*` and project-scoped routes instead
- Portfolio EVM, org-wide Financial Approvals
- Corporate Lessons
- PMO-exclusive ITTO Drafts (`/pmo/itto/drafts`) — PM only views templates

---

## 6. Implementation Plan (Todo List)

### Phase 1 — SQL: Clean & seed PM `role_menu_items`

> **Note:** v400–v405 are already used by EEF/OPA tables and menu seed. SQL versions below start at v568.

- [x] **v568**: Create or verify all required `menu_items` rows exist for PM sections §1–§15 with correct `menu_code`, `route_path`, `menu_icon`, `sort_order`.  
  Key new codes for §4 PROJECT PLANNING:
  - `pm_planning_section` (parent, no route)
  - `pm_plans_dashboard` → `/platform/projects/:id/plans`
  - `pm_project_plan` → `/platform/projects/:id/plans/project-plan`
  - `pm_stage_plan_create` → `/platform/projects/:id/plans/stage-plan/create`
  - `pm_scope_statement` → `/platform/projects/:id/scope/statement`
  - `pm_scope_management_plan` → `/platform/projects/:id/scope/management-plan`
  - `pm_wbs_builder` → `/platform/projects/:id/scope/wbs`
  - `pm_requirements_register` → `/platform/projects/:id/scope/requirements`
  - `pm_traceability_matrix` → `/platform/projects/:id/scope/traceability`
  - `pm_schedule_management_plan` → `/platform/projects/:id/schedule/management-plan`
  - `pm_activity_list` → `/platform/projects/:id/schedule/activities`
  - `pm_activity_sequencing` → `/platform/projects/:id/schedule/dependencies`
  - `pm_gantt_chart` → `/platform/projects/:id/schedule/gantt`
  - `pm_resource_list` → `/platform/resources`
  - `pm_resource_capacity` → `/platform/resources/capacity`
  - `pm_resource_conflicts` → `/platform/resources/conflicts`
  - `pm_planning_hub` → `/pm/planning`
  - `pm_planning_ai` → `/pm/planning/ai`
  - `pm_planning_scenarios` → `/pm/planning/scenarios`
  - `pm_planning_pbs` → `/pm/planning/pbs`
  - `pm_planning_health` → `/pm/planning/health`
  - `pm_planning_confidence` → `/pm/planning/confidence`
  - `pm_planning_recovery` → `/pm/planning/recovery`
  - `pm_planning_governance` → `/pm/planning/governance`
  - `pm_planning_intelligence` → `/pm/planning/intelligence`
  - `pm_microplans` → `/pm/planning/microplans`
  - `pm_microplans_drafts` → `/pm/planning/microplans/drafts`
  
  Key new codes for §5 Team Delivery Artefacts (routes exist — seed only):
  - `pm_delivery_work_packages` → `/pm/delivery/work-packages`
  - `pm_delivery_checkpoint_reports` → `/pm/reporting/checkpoint-reports`
  - `pm_delivery_product_description` → `/pm/delivery/product-description`
  - `pm_delivery_project_product_description` → `/pm/delivery/project-product-description`
  - `pm_delivery_product_status_account` → `/pm/delivery/product-status-account`

  Key new codes for §15 COMMUNICATIONS & MEETINGS:
  - `pm_comms_section` (parent, no route)
  - `pm_comms_hub` → `/platform/comms`
  - `pm_comms_schedule_meeting` → `/platform/comms/meetings/new`
  - `pm_comms_meetings` → `/platform/comms/meetings`
  - `pm_comms_meeting_room` → `/platform/comms/meetings/:id/room`
  - `pm_comms_summaries` → `/platform/comms/meetings/summaries`
  - `pm_comms_direct` → `/platform/comms/direct`
  - `pm_comms_channels` → `/platform/comms/messages`
  - `pm_comms_pending_review` → `/platform/comms/pending-review`

  Key new codes for §14 KNOWLEDGE & RESOURCES — Industry Templates (seeded by **v577**, not v568 — depends on v575 tables):
  - `pm_knowledge_section` (parent, no route — if not already in DB)
  - `pm_industry_templates_browse` → `/platform/industry-templates`  [View]
  - `pm_industry_plan` → `/app/projects/:projectId/industry-plan`  [Full]
  NOTE: These 2 items are seeded in v577 (industry template menu seed) not v568, because they depend on the `pmo_industry_templates` table created in v575 existing first.

  Key new codes for §13 OPA Tailoring (seeded by **v573**, not v568 — depends on v572 tables):
  - `pm_opa_templates_browse` → `/platform/opa?type=template`  [View]
  - `pm_project_opa_templates` → `/app/projects/:id/opa-templates`  [Full]

- [x] **v569**: Assign all §1–§15 items to `project_manager` role in `role_menu_items`:
  - Full/Contribute items: `can_view=true, can_use=true`
  - View-only items: `can_view=true, can_use=false` (Resource Conflicts, Planning Analytics, Governance Baselines, EEF, Browse OPA Templates)
  - OPA-specific: EEF bulk/add → `can_use=false`; OPA Hub/List/Add/Drafts → `can_use=true`
  - §5 Team Delivery Artefacts: all 5 items → `can_view=true, can_use=true` (Full)
  - §15 Comms: all 9 items (parent + 8 children) → `can_view=true, can_use=true` (Full)
  - §14 Industry Templates: `pm_industry_templates_browse` → `can_view=true, can_use=false` (View); `pm_industry_plan` → `can_view=true, can_use=true` (Full) — assigned by **v577**, not v569
  - Ensure PMO planning routes (`/pmo/planning/collisions`, `/pmo/planning/governance-config`) remain `can_use=false` or absent for project_manager
- [x] **v570**: Verify cleanup — confirm no PMO-exclusive items remain in `project_manager` role_menu_items
- [x] **v571**: Apply equivalent changes to Simulator `project_manager` role (parity rule)  
  Seed all of the following Simulator equivalents (menu_items + role_menu_items):
  - **§4 Planning**: `/simulator/pm/planning/*` routes (already routed in App.jsx)
  - **§5 Team Delivery Artefacts**: `/simulator/pm/delivery/work-packages`, `/simulator/pm/reporting/checkpoint-reports`, `/simulator/pm/delivery/product-description`, `/simulator/pm/delivery/project-product-description`, `/simulator/pm/delivery/product-status-account` (all exist in App.jsx)
  - **§15 Comms**: `/simulator/comms/*` routes (already routed in App.jsx)
  - **§14 Industry Templates**: Simulator industry template items (`sim_pm_industry_templates_browse`, `sim_pm_industry_plan`) are seeded by **v577**, not v571 — both Platform and Simulator items are in v577 together
  - **§13 OPA Tailoring**: Simulator OPA tailoring menu items (`sim_pm_opa_templates_browse`, `sim_pm_project_opa_templates`) are seeded by **v573**, not v571 — both Platform and Simulator items are in v573 together. v571 does not duplicate these.  
  Use `sim_pm_` prefix for all new Simulator menu codes in v571 to avoid collision with Platform codes.

### Phase 1b — Simulator Parity Gap: Build 5 Missing Routes

> Audit confirmed 22 of 27 §4 planning items exist in both systems. The 5 below exist only on Platform. Must be built before v571 SQL seeding or the Simulator menu items will link to 404 routes.

#### Gap 1 — Plans Dashboard (project-scoped)

| Item | Platform route (exists) | Simulator route (missing) |
|---|---|---|
| Plans Dashboard | `/platform/projects/:id/plans` | `/simulator/practice-projects/:id/plans` |
| Project Plan view | `/platform/projects/:id/plans/project-plan` | `/simulator/practice-projects/:id/plans/project-plan` |
| Stage Plan create | `/platform/projects/:id/plans/stage-plan/create` | `/simulator/practice-projects/:id/plans/stage-plan/create` |

**Root cause:** Simulator currently has only flat (non-project-scoped) practice plan routes at `/simulator/practice-plans`. A `practice_project_id` FK already exists in `sim.practice_project_plans`, so the data model supports project-scoped plans — routes and pages are the only gap.

**Work required:**
- [x] `SQL/v574_sim_practice_stage_plans.sql` — create `sim.practice_stage_plans` table (mirrors Platform `stage_plans`; columns: `practice_project_id`, `practice_plan_id`, `stage_number`, `stage_title`, dates, status, tolerance fields, version, on_hold). Add RLS. Register in `database_tables`.
- [x] `src/services/sim/practiceStageplanService.js` — CRUD service using `simDb` for `practice_stage_plans` (mirrors `stagePlanService.js`)
- [x] `src/pages/simulator/plans/SimPlansDashboard.jsx` — project-scoped plans dashboard; fetches practice project plan (`getPracticePlan(projectId)`) and practice stage plans (`getPracticeStageplansByProject(projectId)`); tabs for Project Plan / Stage Plans; links to create routes; navigates to `/simulator/practice-projects/:id/plans/...`
- [x] `src/pages/simulator/plans/SimProjectPlanCreate.jsx` — project-scoped create form (uses route param `projectId`, calls `createPracticePlan`); on save navigates to `/simulator/practice-projects/:id/plans/project-plan`
- [x] `src/pages/simulator/plans/SimProjectPlanView.jsx` — fetches practice plan by `practice_project_id`; shows fields (title, purpose, scope, dates, milestones); edit + export actions
- [x] `src/pages/simulator/plans/SimStagePlanCreate.jsx` — create stage plan form (calls `createPracticeStageplan`; requires project plan to exist first); fields: stage number, title, objectives, dates, tolerances; on save navigates to `/simulator/practice-projects/:id/plans`
- [x] `src/App.jsx` — add 3 new Simulator routes:
  ```
  simulator/practice-projects/:projectId/plans               → SimPlansDashboard
  simulator/practice-projects/:projectId/plans/project-plan  → SimProjectPlanView
  simulator/practice-projects/:projectId/plans/project-plan/create → SimProjectPlanCreate
  simulator/practice-projects/:projectId/plans/stage-plan/create   → SimStagePlanCreate
  ```

#### Gap 2 — Resource Capacity & Conflicts (Simulator routes)

| Item | Platform route (exists) | Simulator route (missing) |
|---|---|---|
| Resource Capacity | `/platform/resources/capacity` | `/simulator/resources/capacity` |
| Resource Conflicts | `/platform/resources/conflicts` | `/simulator/resources/conflicts` |

**Root cause:** `/simulator/resources` already exists and reuses the Platform `ResourcesPage` component (resources are organisational — public schema, shared). The capacity and conflicts sub-routes simply were never added.

**Design decision:** Resources (and their capacity/conflict data) live in the `public` schema, not `sim`. The Simulator resource routes reuse the same Platform components — consistent with how `/simulator/resources` already works. No new sim-specific pages or services are needed.

**Work required:**
- [x] `src/App.jsx` — add 2 new Simulator resource routes:
  ```
  /simulator/resources/capacity  → ResourceCapacity   (reuse existing Platform component)
  /simulator/resources/conflicts → ResourceConflicts  (reuse existing Platform component)
  ```

### Phase 2 — Frontend: `useMenu.js` PM path handling

- [x] Ensure `hasPMOContext` fix (v6 cache, done in earlier session) correctly gives PM the `baseline` flat menu
- [x] Validate that `baseline` renders correctly in `Sidebar.jsx` for non-PMO users (no category bucketing)
- [x] Check that View-only items render visually distinct (e.g. a lock icon or greyed label) — or gate the UI at the page level

### Phase 3 — Verification

- [x] Log in as Project Manager → confirm sidebar shows only §1–§12 items
- [x] Confirm no Portfolio, Programme, PMO Admin, Email Admin visible
- [x] Confirm Governance Baselines section loads but shows read-only content
- [x] Confirm Reports section shows PM's own project reports, not all-projects PMO view
- [x] Run v398 verification query to confirm no PMO items remain

---

## 7. Key Design Decisions

1. **Project-scoped vs cross-project routes**: Where the same feature exists at different scope levels (Risk Register, Change Register, etc.), PM gets the project-scoped URL (`/app/risks`, `/app/issues`). PMO keeps the cross-project oversight URL (`/pmo/oversight/risk-register`). These are different routes/pages so there is no duplication.

2. **Shared routes (same URL, different data)**: Highlight Reports, End Stage Reports etc. use the same URL for PM and PMO. The pages themselves should filter by the logged-in user's projects. No route duplication — PMO sees all, PM sees own.

3. **Governance baselines are view-only in DB**: `can_view=true, can_use=false` in `role_menu_items` for governance routes. The sidebar renders them, but the underlying pages enforce read-only for the PM role.

4. **Template Library** — PM views templates created by PMO. PM cannot create/edit organisation templates.

5. **No virtual fallback items**: PM sidebar uses `baseline` (not PMO category structure), so virtual fallbacks are irrelevant. Items shown are exactly what's in `role_menu_items`.

6. **PM Planning routes are separate from PMO Planning routes**: The codebase has `/pmo/planning/*` (PMO cross-portfolio tooling) and `/pm/planning/*` (PM project-scoped planning tools). PM sidebar links to `/pm/planning/*` only. PMO-exclusive routes (`/pmo/planning/collisions`, `/pmo/planning/governance-config`) remain blocked for PM. The `/pm/planning/intelligence` PM-scoped analytics view is included as View-only; the PMO cross-portfolio intelligence at `/pmo/planning/intelligence` is excluded.

7. **Activity estimation is inline**: There is no separate "Estimation" page. Effort estimates, duration estimates, and activity attributes are captured inside `ActivityDetail` (accessed via Activity List). No additional menu item is needed.

8. **Resource Conflicts is View-only for PM**: PM can see which resources have conflicts (awareness) but resolving cross-project conflicts is a PMO/Team Manager responsibility. `can_use=false` in DB.

9. **Communications & Meetings — no new pages needed**: All routes (`/platform/comms/*` and `/simulator/comms/*`) are fully built and routed in `App.jsx`. The Meeting Room (`MeetingRoom.jsx`) supports both video and audio calls. The only work required is seeding the 8 menu items into `role_menu_items` for `project_manager` (v568) and their Simulator equivalents (v571). The `Meeting Room` item in the sidebar links to the meetings list (`/platform/comms/meetings`) — the actual room URL is dynamic per meeting ID and opened from the meeting detail view.

11. **Team Manager/Lead artefacts are PM-owned delivery controls**: Work Packages are issued *by* the PM to Team Managers; Checkpoint Reports flow *from* TMs back to the PM; Product Descriptions and Product Status Accounts are defined by the PM and tracked against TM delivery. All five items sit in §5 under the "Team Delivery Artefacts" sub-group. Access is Full for all five — PM is the originator and primary reviewer of these artefacts. Both Platform routes (`/pm/delivery/*`, `/pm/reporting/checkpoint-reports`) and Simulator equivalents (`/simulator/pm/delivery/*`, `/simulator/pm/reporting/checkpoint-reports`) already exist in `App.jsx`; only menu seeds are needed in v568 and v571.

10. **OPA Tailoring items depend on v572**: `pm_opa_templates_browse` and `pm_project_opa_templates` are part of §13 but their menu seed (v573) must run AFTER v572 creates the `project_opa_customisations` table and routes. v568 seeds everything else in §13; v573 adds these two items separately. SQL execution order: v568 → v569 → v570 → v572 → v573 → v571 (sim parity last).

---

## 8. Files to be Modified

### Phase 1 — SQL (Platform + Simulator menu seed)

| File | Change |
|---|---|
| `SQL/v568_pm_menu_items_seed.sql` | Create/verify all menu_items for PM sections §1–§14 including full §4 planning suite (27 new menu codes) |
| `SQL/v569_pm_role_menu_items_assign.sql` | Assign to project_manager with correct can_use flags; block PMO planning routes |
| `SQL/v570_pm_menu_cleanup_verify.sql` | Cleanup verification query |
| `SQL/v571_sim_pm_menu_parity.sql` | Simulator PM role parity (simulator planning routes use `/simulator/pm/planning/*` and `/simulator/practice-projects/:id/...`) |

### Phase 1b — Simulator Parity Gap (build before v571)

| File | Change |
|---|---|
| `SQL/v572_project_opa_tailoring_tables.sql` | (v572 plan) Create `project_opa_customisations` + `project_template_field_config` tables — prerequisite for v573 |
| `SQL/v573_project_opa_tailoring_menu_seed.sql` | (v572 plan) Seed `pm_opa_templates_browse` and `pm_project_opa_templates` menu items + grant to project_manager |
| `SQL/v574_sim_practice_stage_plans.sql` | Create `sim.practice_stage_plans` table + RLS + DB registry entry |
| `src/services/sim/practiceStageplanService.js` | CRUD service for `practice_stage_plans` using `simDb` |
| `src/pages/simulator/plans/SimPlansDashboard.jsx` | Project-scoped plans dashboard (new page) |
| `src/pages/simulator/plans/SimProjectPlanCreate.jsx` | Project-scoped project plan create form (new page) |
| `src/pages/simulator/plans/SimProjectPlanView.jsx` | Project-scoped project plan view (new page) |
| `src/pages/simulator/plans/SimStagePlanCreate.jsx` | Stage plan create form for Simulator (new page) |
| `src/App.jsx` | Add 4 Simulator plan routes + 2 Simulator resource routes (capacity, conflicts) |

### Phase 2 — Frontend

| File | Change |
|---|---|
| `src/hooks/useMenu.js` | Already patched (hasPMOContext fix) — no further changes |
| `src/components/Sidebar.jsx` | Verify baseline rendering works for PM |

**Already done (no changes needed):**

| File | Status |
|---|---|
| `SQL/v400_eef_opa_tables.sql` | EEF/OPA tables — already applied |
| `SQL/v401_eef_opa_menu_seed.sql` | OPA menu_items + role_menu_items — already applied for project_manager |
| `SQL/v398_fix_pm_role_menu_items.sql` | PMO-exclusive item cleanup — already applied |
| `SQL/v399_pm_team_members_sidebar_menu.sql` | Team & Members section — already applied |

---

## Review Notes

**Completed 2026-05-17.** SQL: `v568`–`v571`, `v574` in `SQL/` and `supabase/migrations/` (`20260517150200`–`20260517150600`). Run order: v568 → v569 → v570 → v572 → v573 → v571 → v574 (v574 can run before v571 if stage plans table is missing).

**Frontend:** Simulator project-scoped plan pages under `src/pages/simulator/plans/`; routes in `App.jsx`; `/simulator/resources/capacity` and `/conflicts` reuse platform components. `sidebarRouteUtils.js` resolves `:id` / `:projectId` from current project context. `Sidebar.jsx` shows an eye icon and muted label when `canUse === false`.

**Manual verification:** Log in as `project_manager`, confirm §1–§15 structure, no portfolio/PMO admin items; run the SELECT at end of `v570_pm_menu_cleanup_verify.sql`.
