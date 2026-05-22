# v628 — Team Member Comprehensive Sidebar Menu

**Date:** 2026-05-22  
**Status:** PENDING APPROVAL

---

## Problem Statement

After a Team Member accepts their invitation and logs in, they land on `/platform/dashboard` but the left-hand sidebar only contains **3 items**: Stakeholders, Industry Templates, Invitation Status. This is insufficient — they cannot navigate to tasks, daily log, schedule, plans, risks, defects, delay log, status reports, documents, or team pages without manually typing URLs.

Additionally:
- **Team Managers/Leads** need to create and manage **workstream (team) plans** for their team — backed by the existing `project_micro_plans` table with `plan_type = 'team_delivery'`.
- **Regular Team Members** need to create **individual personal plans** — a new `plan_type = 'individual'` to be added to the same table. This replaces scattered Excel sheets with centralised, project-linked plans.

**Root cause of sidebar gap:** The `role_menu_items` DB table assigns only top-level section-header nodes to the `team_member` role with no navigable child rows, so the sidebar collapses to 3 virtual fallback items.

---

## Scope

- Platform: Full team-member sidebar revamp including role-differentiated Plans section  
- Simulator: Apply equivalent sections to the sim team-member role  
- New page: Team Charter (read-only for TM, create/edit for PM/TL)  
- New routes: `/platform/plans/*` for team-accessible plan management  
- SQL: Add `'individual'` to `project_micro_plans.plan_type` CHECK constraint  
- No changes to PM or PMO menus  

---

## Role Definitions (confirmed in DB)

| Role | `role_name` | Plan access |
|---|---|---|
| Team Member | `team_member` | Create **individual** plans only; view project/stage plans |
| Team Lead | `team_lead` | Create **team workstream** plans + individual plans; view project/stage plans |
| Team Manager | `team_manager` | Same as Team Lead |

---

## Target Sidebar Structure

> **Legend:**  
> ✏️ = can create/edit  ·  👁️ = view-only  ·  🔒 = Team Lead/Manager only

```
Dashboard                                      /platform/dashboard
───────────────────────────────────────────────────────────────────────
My Work  [section]
  ├─ My Tasks ✏️                              /platform/tasks
  ├─ Task Board ✏️                            /platform/tasks/board
  ├─ Task Calendar 👁️                         /platform/tasks/calendar
  ├─ Daily Log ✏️                             /app/daily-log/my-entries
  ├─ My Lesson Actions ✏️                     /app/lessons/my-actions
  └─ My Issue Actions ✏️                      /app/issues/my-actions
───────────────────────────────────────────────────────────────────────
My Projects  [section]
  ├─ My Projects (list) 👁️                    /platform/projects
  └─ Project Members (view) 👁️               /app/project-members
───────────────────────────────────────────────────────────────────────
Plans  [section — ROLE-SENSITIVE]
  ├─ My Plans ✏️                              /platform/plans/my-plans
  │     (individual plans — all team members can create their own)
  ├─ Team Workstream Plans ✏️ 🔒              /platform/plans/team-workstreams
  │     (team_delivery plans — Team Leads & Managers only)
  ├─ Project Plan 👁️                          /platform/projects/__PROJECT__/plans/project-plan
  ├─ Stage Plans 👁️                           /platform/projects/__PROJECT__/plans/stage-plan/:id
  └─ Plans Overview 👁️                        /platform/projects/__PROJECT__/plans
───────────────────────────────────────────────────────────────────────
Controls & Registers  [section — FULL EDIT for TMs]
  ├─ Risk Register ✏️                         /pmo/oversight/risk-register
  ├─ Issue Log ✏️                             /pmo/oversight/issue-register
  ├─ Change Log ✏️                            /platform/projects/:id/registers/changes
  ├─ Delay Log ✏️                             /platform/delays
  ├─ Defect Register ✏️                       /platform/testing/defects
  └─ Decision Log ✏️                          /platform/governance/decisions     ← NEW PAGE REQUIRED
───────────────────────────────────────────────────────────────────────
Process Group Forms  [section — VIEW ONLY for TMs]
  ├─ Initiating 👁️                            /platform/projects/:id/forms?group=Initiating
  ├─ Planning 👁️                              /platform/projects/:id/forms?group=Planning
  ├─ Executing 👁️                             /platform/projects/:id/forms?group=Executing
  ├─ Monitoring & Controlling 👁️              /platform/projects/:id/forms?group=Monitoring
  ├─ Closing 👁️                               /platform/projects/:id/forms?group=Closing
  └─ My Draft Forms ✏️                        /platform/projects/:id/forms/drafts
───────────────────────────────────────────────────────────────────────
Team Charter  [section — VIEW ONLY]               ← NEW PAGE REQUIRED
  └─ Team Charter 👁️                          /platform/projects/__PROJECT__/team-charter
      (Team Lead/Manager can also edit: /platform/projects/__PROJECT__/team-charter/edit)
───────────────────────────────────────────────────────────────────────
Communications  [section — NEW FEATURE]           ← NEW PAGES REQUIRED
  ├─ Team Chat ✏️                             /platform/communications/chat
  ├─ Video Calls ✏️                           /platform/communications/video-calls
  └─ Voice Calls ✏️                           /platform/communications/voice-calls
───────────────────────────────────────────────────────────────────────
Team & Collaboration  [section]
  ├─ My Team 👁️                               /platform/teams/my-team
  └─ Team Directory 👁️                        /platform/teams
───────────────────────────────────────────────────────────────────────
Stakeholders  [section — VIEW ONLY]
  ├─ Stakeholder Register 👁️                  /platform/stakeholders/register
  └─ Stakeholder Analysis 👁️                  /platform/stakeholders/analysis
───────────────────────────────────────────────────────────────────────
Reporting & Status  [section — VIEW ONLY]
  ├─ Highlight Reports 👁️                     /pm/reporting/highlight-reports
  ├─ Checkpoint Reports 👁️                    /pm/reporting/checkpoint-reports
  └─ Reports Library 👁️                       /platform/reports
───────────────────────────────────────────────────────────────────────
Timesheets  [section — FULL CRUD — NEW FEATURE]    ← NEW PAGES REQUIRED
  ├─ My Timesheets ✏️                         /platform/timesheets
  ├─ Log Time ✏️                              /platform/timesheets/new
  └─ Team Timesheets ✏️ 🔒                   /platform/timesheets/team
        (TL/TM: review & approve team submissions)
───────────────────────────────────────────────────────────────────────
Knowledge & Resources
  └─ Industry Templates 👁️                    /platform/industry-templates
───────────────────────────────────────────────────────────────────────
Appointment Status                             /app/invitation-tracker
───────────────────────────────────────────────────────────────────────
Profile / Settings                             /platform/settings
```

---

## Route Inventory — What Exists vs. What's New

| Sidebar Item | Route | Status |
|---|---|---|
| Dashboard | `/platform/dashboard` | ✅ Existing |
| My Tasks | `/platform/tasks` | ✅ Existing |
| Task Board | `/platform/tasks/board` | ✅ Existing |
| Task Calendar | `/platform/tasks/calendar` | ✅ Existing |
| Daily Log | `/app/daily-log/my-entries` | ✅ Existing |
| My Lesson Actions | `/app/lessons/my-actions` | ✅ Existing |
| My Issue Actions | `/app/issues/my-actions` | ✅ Existing |
| My Projects | `/platform/projects` | ✅ Existing |
| Project Members (view) | `/app/project-members` | ✅ Existing |
| **My Plans** | `/platform/plans/my-plans` | ❌ **NEW ROUTE** — wraps `MicroPlanList` filtered to `owner=currentUser, plan_type='individual'` |
| **Team Workstream Plans** | `/platform/plans/team-workstreams` | ❌ **NEW ROUTE** — wraps `MicroPlanList` filtered to `plan_type='team_delivery'`, TL/TM only |
| Plans Overview | `/platform/projects/__PROJECT__/plans` | ✅ Existing (`PlansDashboard`) |
| Project Plan (view) | `/platform/projects/__PROJECT__/plans/project-plan` | ✅ Existing (`ProjectPlanViewPage`) |
| Stage Plans (view) | `/platform/projects/__PROJECT__/plans/stage-plan/:id` | ✅ Existing (`StagePlanViewPage`) |
| Risk Register (**edit**) | `/pmo/oversight/risk-register` | ✅ Existing — change `can_use` to `true` |
| Issue Log (**edit**) | `/pmo/oversight/issue-register` | ✅ Existing — change `can_use` to `true` |
| Change Log (**edit**) | project-scoped `/registers/changes` | ✅ Existing — change `can_use` to `true` |
| **Delay Log (edit)** | `/platform/delays` | ✅ Existing — change `can_use` to `true` |
| **Defect Register (edit)** | `/platform/testing/defects` | ✅ Existing — change `can_use` to `true` |
| **Decision Log (edit)** | `/platform/governance/decisions` | ❌ **NEW PAGE + ROUTE** — referenced in PM menu config but no page exists; needs full CRUD |
| **Team Chat** | `/platform/communications/chat` | ❌ **NEW PAGE + ROUTE** — in-app team messaging |
| **Video Calls** | `/platform/communications/video-calls` | ❌ **NEW PAGE + ROUTE** — call scheduling/links |
| **Voice Calls** | `/platform/communications/voice-calls` | ❌ **NEW PAGE + ROUTE** — call log/scheduling |
| **My Timesheets** | `/platform/timesheets` | ❌ **NEW PAGE + ROUTE** — list/weekly view of own time entries |
| **Log Time** | `/platform/timesheets/new` | ❌ **NEW PAGE + ROUTE** — create time entry form |
| **Timesheet Detail/Edit** | `/platform/timesheets/:id` | ❌ **NEW PAGE + ROUTE** — view/edit single entry |
| **Team Timesheets** | `/platform/timesheets/team` | ❌ **NEW PAGE + ROUTE** — TL/TM review & approve |
| Process Group Forms (view) | `/platform/projects/:id/forms?group=*` | ✅ Existing — `can_use=false` for TMs |
| My Draft Forms | `/platform/projects/:id/forms/drafts` | ✅ Existing |
| **Team Charter (view)** | `/platform/projects/__PROJECT__/team-charter` | ❌ **NEW PAGE + ROUTE** |
| Team Charter (edit) | `/platform/projects/__PROJECT__/team-charter/edit` | ❌ **NEW PAGE + ROUTE** (TL/TM only) |
| My Team | `/platform/teams/my-team` | ✅ Existing |
| Team Directory | `/platform/teams` | ✅ Existing |
| Stakeholder Register (view) | `/platform/stakeholders/register` | ✅ Existing |
| Stakeholder Analysis (view) | `/platform/stakeholders/analysis` | ✅ Existing |
| **Highlight Reports (view)** | `/pm/reporting/highlight-reports` | ✅ Existing — needs role assignment |
| **Checkpoint Reports (view)** | `/pm/reporting/checkpoint-reports` | ✅ Existing — needs role assignment |
| Reports Library | `/platform/reports` | ✅ Existing |
| Industry Templates | `/platform/industry-templates` | ✅ Existing |
| Appointment Status | `/app/invitation-tracker` | ✅ Existing |
| Profile / Settings | `/platform/settings` | ✅ Existing |

**New items requiring new routes/pages:**
1. `/platform/plans/my-plans` — reuses `MicroPlanList` + `MicroPlanDetail`, needs new route + props
2. `/platform/plans/team-workstreams` — reuses same pages, TL/TM only route
3. Team Charter view page + edit page

---

## Implementation Plan

### Phase 1 — SQL: Add `'individual'` plan type

**File:** `SQL/v628a_individual_plan_type.sql`  
Alter the `project_micro_plans.plan_type` CHECK constraint to add `'individual'`.  
Also update the `sim.project_micro_plans` table for Simulator parity.

```sql
-- Platform
ALTER TABLE public.project_micro_plans
  DROP CONSTRAINT IF EXISTS project_micro_plans_plan_type_check,
  ADD CONSTRAINT project_micro_plans_plan_type_check
    CHECK (plan_type IN (
      'individual','team_delivery','quality','risk_response','test',
      'procurement','communications','stakeholder_engagement',
      'change_management','resource','custom'
    ));

-- Simulator
ALTER TABLE sim.project_micro_plans
  DROP CONSTRAINT IF EXISTS project_micro_plans_plan_type_check,
  ADD CONSTRAINT project_micro_plans_plan_type_check
    CHECK (plan_type IN (
      'individual','team_delivery','quality','risk_response','test',
      'procurement','communications','stakeholder_engagement',
      'change_management','resource','custom'
    ));
```

### Phase 2 — New Routes: `/platform/plans/*`

**File:** `src/App.jsx`

Add two new routes inside the `platform/*` block, reusing existing `MicroPlanList` and `MicroPlanDetail` pages with filter props:

| Route | Page | Filter Props | Roles |
|---|---|---|---|
| `platform/plans/my-plans` | `MicroPlanList` | `scope="individual"` (filters to `owner=me, plan_type='individual'`) | All team members |
| `platform/plans/my-plans/:id` | `MicroPlanDetail` | `scope="individual"` | All team members |
| `platform/plans/team-workstreams` | `MicroPlanList` | `scope="team"` (filters to `plan_type='team_delivery'`) | Team Lead, Team Manager |
| `platform/plans/team-workstreams/:id` | `MicroPlanDetail` | `scope="team"` | Team Lead, Team Manager |

**Note:** `MicroPlanList` will need a small prop (`scope`) to apply the right default filter and create-button label. Alternatively, use URL search params: `?scope=individual` or `?scope=team`.

### Phase 3 — Team Charter Page (new feature)

**Why:** No team charter page exists. It defines team purpose, values, norms, ways of working, and RACI.

**DB table:** `team_charters` (minimal):
```sql
id, project_id, title, purpose, values, ways_of_working,
norms, raci_notes, created_by, created_at, updated_at, is_deleted
```

**Files to create:**
- `src/pages/platform-app/TeamCharterPage.jsx` — view-only (TM)
- `src/pages/platform-app/TeamCharterEditPage.jsx` — create/edit (TL, TM role)

**Routes to add in `App.jsx`:**
- `platform/projects/:projectId/team-charter` → `TeamCharterPage`
- `platform/projects/:projectId/team-charter/edit` → `TeamCharterEditPage` (requires TL/TM permission)

**SQL:** `team_charters` table + RLS + register in `database_tables`

### Phase 4 — SQL: Comprehensive Menu Seed (v628b)

**File:** `SQL/v628b_team_member_comprehensive_menu.sql`

**Steps:**
1. Upsert section-header `menu_items` for each sidebar group (My Work, My Projects, Plans, Controls, Forms, Team Charter, Team, Stakeholders, Reporting, Knowledge).
2. Upsert leaf `menu_items` for every target route (prefix `tm_` for team-member items, `tl_` for team-lead-only).
3. Link children to parent sections via `parent_menu_id`.
4. Insert `role_menu_items` for **`team_member`** with correct flags:
   - `can_view=true, can_use=true` → My Work items, My Plans, Draft Forms, **all Controls & Registers**, Communications
   - `can_view=true, can_use=false` → view-only plans, Reports, Stakeholders, Charter, Process Group Forms
5. Insert `role_menu_items` for **`team_lead`** and **`team_manager`** with:
   - `can_view=true, can_use=true` → All team_member items PLUS Team Workstream Plans + Charter edit
6. Register `team_charters` table in `database_tables`.

### Phase 5 — useMenu.js: Team Member Sidebar Logic

**File:** `src/hooks/useMenu.js`

**Steps:**
1. Add `isTeamMemberContext(baseline)`:
   - Returns `true` when `hasPMOContext = false` AND no PM signals (`action=send-invite`, project-creation paths).
2. Add `isTeamLeadContext(baseline)`:
   - Returns `true` when `isTeamMemberContext` is true AND baseline contains a `team_workstreams` or `team_delivery` route signal.
3. Add `ensureTeamMemberMenus(menuItems, isLead)`:
   - Virtualises full sidebar for team members.
   - When `isLead = true`, includes the Team Workstream Plans and Charter edit items.
   - When `isLead = false`, omits Team Workstream Plans (TM only sees My Plans).
4. Update non-PMO branch:
   ```js
   if (!hasPMOContext) {
     const isTM = isTeamMemberContext(baseline)
     if (isTM) {
       const isLead = isTeamLeadContext(baseline)
       return ensureTeamMemberMenus(baseline, isLead)
     }
     return ensurePmInvitationTrackerMenu(
       ensurePmSendRoleInvitationMenu(ensureIndustryPlanMenusForPm(baseline)),
     )
   }
   ```
5. Bump `MENU_CACHE_KEY_PREFIX` → `nidus_menu_v17_`.

### Phase 12 — Communications Feature (new)

**DB tables** (`SQL/v628c_communications_tables.sql`):
- `team_messages` — project-scoped instant messages: `id, project_id, sender_id, message, created_at, is_deleted`
- `team_calls` — call log/schedule: `id, project_id, organiser_id, call_type ('video'|'voice'), title, scheduled_at, join_link, notes, created_at`

**New pages:**
- `TeamChatPage.jsx` — real-time team messaging using Supabase Realtime (channel per project). Send/receive text messages, shows sender name + timestamp.
- `VideoCallsPage.jsx` — schedule and log video calls. Stores join link (e.g. Zoom/Teams URL), title, date/time. No embedded video — this is a coordination page.
- `VoiceCallsPage.jsx` — same structure as Video, `call_type='voice'`.

**Routes (App.jsx):**
```
platform/communications/chat        → TeamChatPage
platform/communications/video-calls → VideoCallsPage
platform/communications/voice-calls → VoiceCallsPage
```

### Phase 9 — Decision Log Page (new)

The `Decision Log` menu item in the PM config points to `/platform/governance/decisions` but no route or page exists. A standalone Decision Log page is needed.

**DB:** Uses existing `decisions` data (from `issueDecisionService.js` and related services). Confirm table name and add a generic `project_decisions` table if a standalone store is needed:
```sql
project_decisions (
  id uuid PK,
  project_id uuid FK,
  decision_reference text,
  decision_title text NOT NULL,
  description text,
  decision_date date,
  decided_by uuid FK auth.users,
  status text CHECK IN ('proposed','approved','rejected','deferred') DEFAULT 'proposed',
  rationale text,
  impact text,
  created_by uuid FK auth.users,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_deleted boolean DEFAULT false
)
```

**Pages:**
- `src/pages/platform-app/DecisionLogPage.jsx` — list of all decisions (card + table toggle, search, sort, export); full CRUD for all roles.
- `src/pages/platform-app/DecisionLogForm.jsx` — create/edit form with draft queue support.
- `src/pages/platform-app/DecisionLogDetail.jsx` — read/edit view with status badge.

**Routes (App.jsx):**
```
platform/governance/decisions         → DecisionLogPage
platform/governance/decisions/new     → DecisionLogForm (create)
platform/governance/decisions/:id     → DecisionLogDetail
platform/governance/decisions/:id/edit → DecisionLogForm (edit)
```

### Phase 11 — Timesheets Feature (new)

**DB tables** (`SQL/v628d_timesheets.sql`):

```sql
-- Core time entries table
timesheet_entries (
  id uuid PK,
  project_id uuid FK projects,
  user_id uuid FK auth.users,
  task_id uuid FK tasks nullable,         -- optional task linkage
  entry_date date NOT NULL,
  hours_worked numeric(5,2) NOT NULL,
  description text,
  status text CHECK IN ('draft','submitted','approved','rejected') DEFAULT 'draft',
  submitted_at timestamptz,
  reviewed_by uuid FK auth.users nullable,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_deleted boolean DEFAULT false
)
```

**RLS policies:** user can SELECT/INSERT/UPDATE their own entries; TL/TM can SELECT all entries within their project; only TL/TM can UPDATE `status` to `approved`/`rejected`.

**New pages:**
- `src/pages/platform-app/timesheets/MyTimesheetsPage.jsx` — weekly grouped list of own entries; Export (CSV/Excel/Print); card + table view toggle; search + sort.
- `src/pages/platform-app/timesheets/TimesheetEntryForm.jsx` — create + edit form; date picker, hours (shorthand: e.g. `1.5h`), task link dropdown, description; draft queue support.
- `src/pages/platform-app/timesheets/TimesheetEntryDetail.jsx` — read/edit view of a single entry with status badge.
- `src/pages/platform-app/timesheets/TeamTimesheetsPage.jsx` — TL/TM view: all team members' entries grouped by week; approve/reject with notes; bulk actions.

**Routes (App.jsx):**
```
platform/timesheets          → MyTimesheetsPage
platform/timesheets/new      → TimesheetEntryForm (create mode)
platform/timesheets/:id      → TimesheetEntryDetail
platform/timesheets/:id/edit → TimesheetEntryForm (edit mode)
platform/timesheets/team     → TeamTimesheetsPage (TL/TM only)
```

### Phase 13 — Simulator Parity

Apply equivalent routes, SQL assignments, and virtual menu items for the Simulator's team-member and team-lead roles using `sim.*` schema and `/simulator/...` route paths. Communications pages also get simulator equivalents under `/simulator/communications/...`.

---

## Todo List

- [x] **1.** `SQL/v628a_individual_plan_type.sql` — Alter `plan_type` CHECK to add `'individual'` (platform + sim schemas)
- [x] **2.** Update `MicroPlanList.jsx` — accept `scope` prop for `individual` vs `team` filtering
- [x] **3.** Add `/platform/plans/my-plans` and `/platform/plans/team-workstreams` routes in `App.jsx`
- [x] **4.** Create `team_charters` DB table SQL + RLS (`SQL/v628c_team_charters.sql`)
- [x] **5.** Create `src/pages/platform-app/TeamCharterPage.jsx` (view-only)
- [x] **6.** Create `src/pages/platform-app/TeamCharterEditPage.jsx` (TL/TM create/edit)
- [x] **7.** Add team charter routes to `App.jsx`
- [x] **8.** `SQL/v628b_team_member_comprehensive_menu.sql`:
  - [x] 8a. Section-header menu_items (all sidebar groups)
  - [x] 8b. Leaf menu_items for all target routes (TM items + TL-only items)
  - [x] 8c. `role_menu_items` for `team_member` with correct `can_use` flags
  - [x] 8d. `role_menu_items` for `team_lead` + `team_manager` with elevated flags
  - [x] 8e. Register `team_charters` in `database_tables`
- [x] **9.** `src/hooks/useMenu.js`:
  - [x] 9a. Add `isTeamMemberContext()` + `isTeamLeadContext()`
  - [x] 9b. Add `ensureTeamMemberMenus(items, isLead)`
  - [x] 9c. Update `applyRoleSidebarRevamp()` non-PMO branch
  - [x] 9d. Bump cache key to `nidus_menu_v17_`
- [x] **10.** Decision Log feature — DB + 3 pages + routes (full CRUD for all TM roles):
  - [x] 10a. SQL `v628d_decision_log.sql` — `project_decisions` table + RLS + register in `database_tables`
  - [x] 10b. `src/pages/platform-app/DecisionLogPage.jsx` (list, card+table toggle, export)
  - [x] 10c. `src/pages/platform-app/DecisionLogForm.jsx` (create + edit, draft queue)
  - [x] 10d. `src/pages/platform-app/DecisionLogDetail.jsx` (detail view)
  - [x] 10e. Add routes to `App.jsx`
- [x] **11.** Timesheets feature — DB + 4 pages + routes (full CRUD + TL/TM approval):
  - [x] 11a. SQL `v628e_timesheets.sql` — `timesheet_entries` table + RLS + register in `database_tables`
  - [x] 11b. `src/pages/platform-app/timesheets/MyTimesheetsPage.jsx`
  - [x] 11c. `src/pages/platform-app/timesheets/TimesheetEntryForm.jsx` (create + edit)
  - [x] 11d. `src/pages/platform-app/timesheets/TimesheetEntryDetail.jsx`
  - [x] 11e. `src/pages/platform-app/timesheets/TeamTimesheetsPage.jsx` (TL/TM review/approve)
  - [x] 11f. Add routes to `App.jsx`
- [x] **12.** Communications feature — DB + 3 pages (Team Chat, Video Calls, Voice Calls) + routes:
  - [x] 12a. SQL `v628f_communications_tables.sql` — `team_messages`, `team_calls` tables + RLS
  - [x] 12b. `src/pages/platform-app/communications/TeamChatPage.jsx`
  - [x] 12c. `src/pages/platform-app/communications/VideoCallsPage.jsx`
  - [x] 12d. `src/pages/platform-app/communications/VoiceCallsPage.jsx`
  - [x] 12e. Add routes to `App.jsx`
- [x] **13.** Simulator parity:
  - [x] 13a. Sim service files: `simTimesheetService.js`, `simDecisionService.js`, `simTeamCharterService.js`, `simCommunicationsService.js`
  - [x] 13b. `src/config/simulatorTMMenuConfig.js` — static menu config for sim team member
  - [x] 13c. `src/components/sim/tm/SimulatorTMSidebar.jsx` + `SimulatorTMLayout.jsx`
  - [x] 13d. `src/pages/simulator/tm/SimulatorTMDashboard.jsx`
  - [x] 13e. Sim TM routes added to `App.jsx` (dashboard, plans, decisions, timesheets, charter, communications)
- [ ] **14.** Smoke test: all sections visible; Controls & Registers allows edit (incl. Decision Log); Timesheets CRUD works; Communications pages load
- [ ] **15.** Documentation: `Documentation/Team_Member_Sidebar_Guide.md`

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| `plan_type='individual'` added to existing table | Reuses `project_micro_plans` + all its CRUD, draft queue, RLS, and export; no new table needed |
| My Plans vs Team Workstream Plans as separate routes | Keeps scope clear — TMs see their own plans, TLs see team plans; both backed by same table, filtered by type |
| `MicroPlanList` reuse with `scope` prop | Avoids creating duplicate pages; a single prop switches filter + create-button label |
| Team Charter as new page | No existing page; lightweight table + view/edit; PM/TL creates, all TMs view |
| `can_use=false` for Controls, Plans overview, Reports, Stakeholders | TMs need awareness without edit rights; the Eye icon in `SidebarMenuItem` already signals this |
| Process Group Forms `can_use=false` | TMs complete assigned form tasks but do not own form definitions |
| Role-differentiated sidebar via DB flags (`can_use`) | Clean: same sidebar component, different permissions per role, no extra conditional JSX |
| JS virtual fallback + SQL migration | SQL seeds new installs; JS ensures existing installs get full menu immediately |
| Cache key bump to `v17` | Forces fresh DB fetch, discards stale 3-item cache for all team member sessions |
| Controls & Registers `can_use=true` for TMs | Team members log risks, issues, changes, delays, defects as part of their daily work — read-only was overly restrictive |
| Communications as coordination layer, not embedded AV | Video/voice pages schedule and log calls with external join links (Zoom/Teams URL); Team Chat uses Supabase Realtime for lightweight in-app IM; no WebRTC complexity required |
| Single `timesheet_entries` table with `status` workflow | draft → submitted → approved/rejected covers the full cycle; TL/TM can approve, TM can resubmit after rejection; no separate approval table needed |
| Timesheets link optionally to tasks | `task_id` is nullable — TMs can log time against a task or just against the project; keeps it flexible without forcing task selection |

---

## Review (to be completed after implementation)

_Pending implementation._
