# v220 – Stakeholder Management – Full Implementation Plan
**Branch:** feature/platform-terminology
**Date:** 2026-03-12
**Goal:** Implement complete stakeholder management aligned to the 6-step best-practice lifecycle
(Identify → Understand → Analyse → Prioritise → Engage → Monitor) for both Platform and Simulator.

---

## Best-Practice Lifecycle Mapping

| # | Phase | What it means | Mapped Feature |
|---|-------|--------------|----------------|
| 1 | **Identify** | Clearly identify who can influence the project and who will be impacted — including hidden influencers | Stakeholder Register |
| 2 | **Understand** | Invest time to understand stakeholder expectations, interests, power, concerns, success criteria | Stakeholder Profiles (rich detail view) |
| 3 | **Analyse** | Analyse stakeholder influence, attitude, and potential impact — not all require the same attention | Power/Interest Matrix + Attitude Analysis |
| 4 | **Prioritise** | Prioritise based on influence and interest so time and communication effort is focused where it matters most | Engagement Priority Board |
| 5 | **Engage** | Tailor engagement strategies — the right message, the right format, the right frequency. Intentional, not random | Engagement Planning + Communication Plans |
| 6 | **Monitor** | Continuously monitor and adjust engagement strategies throughout the project lifecycle | Monitoring Dashboard |

---

## Proposed Sidebar Structure (under "Stakeholders")

```
Stakeholders  [parent]
  ├── Stakeholder Register        (Phase 1: Identify)
  ├── Stakeholder Analysis        (Phases 2–3: Understand + Analyse)
  ├── Engagement Planning         (Phases 4–5: Prioritise + Engage)
  ├── Communication Plans         (Phase 5: Engage)
  └── Monitoring                  (Phase 6: Monitor)
```

---

## Current State Gaps

### Critical (blocking)
1. `/platform/stakeholders` route shows a placeholder stub — actual CRUD is unreachable
2. No sub-routes exist for Analysis, Engagement, Communications, Monitoring
3. Power/Interest Matrix is read-only — no form to create/edit analysis records
4. CommunicationPlan component is an unfinished stub
5. No Engagement Planning or Monitoring pages at all

### Platform–Simulator Parity (broken)
6. Simulator has only a basic list view — no Analysis, Engagement, or Monitor equivalents
7. Simulator SQL has no practice_stakeholder_analysis, practice_engagement_plans, practice_communication_plans tables

---

## Detailed Scope per Sub-Feature

### 1. Stakeholder Register (`/platform/stakeholders/register`)
**Phase:** Identify
**Status:** Mostly complete — service + form + table component exist; routing broken
**Work needed:**
- Fix routing: replace placeholder `Stakeholders.jsx` with a working page that uses `StakeholderRegister` + `StakeholderForm`
- Add export dropdown (Excel, Word, PPT, CSV, XML, JSON, Print) via `ExportListMenu`
- Add bulk import (CSV upload)
- Add draft/hold queue support (on-hold register entries)
- Success toast on create/update with record ID
- Fix navigation: remove legacy back-nav to `/quality-management`

**Fields already in DB:** name, type (internal/external/customer/supplier/partner/regulator/community), category (individual/group/organization/community), role, email, phone, mobile, office_location, preferred_contact_method, project_role, organization_level, reports_to, is_decision_maker, is_influencer, is_affected_by_project, availability, status

---

### 2. Stakeholder Analysis (`/platform/stakeholders/analysis`)
**Phases:** Understand + Analyse
**Status:** Power/Interest Matrix component exists (read-only); no entry form; no detail view
**Work needed:**
- Create `StakeholderAnalysisForm.jsx` — modal/slide-over form to capture:
  - power_level (1–5 slider), interest_level (1–5 slider)
  - **Auto-calculate** matrix_quadrant from power + interest:
    - High Power + High Interest → "Manage Closely" (red)
    - High Power + Low Interest → "Keep Satisfied" (yellow)
    - Low Power + High Interest → "Keep Informed" (blue)
    - Low Power + Low Interest → "Monitor" (grey)
  - current_attitude (champion / supporter / neutral / critic / blocker)
  - desired_attitude (same options)
  - impact_on_project (text)
  - power_sources[] (checkboxes: budget, authority, expertise, information, relationships)
  - key_messages (text)
  - engagement_strategy (text/rich)
  - engagement_priority (critical/high/medium/low)
  - analysis_date, analysis_period
- Update `PowerInterestMatrix.jsx` to add Edit/Add buttons per quadrant cell
- Create `StakeholderAnalysisPage.jsx` with two views:
  - **Matrix View** — 2×2 grid with drag-to-reassign capability
  - **List View** — table with all analysis records, sortable by power/interest/attitude
- Add delete analysis record with soft delete
- Export functionality

**DB tables:** `stakeholder_analysis` (already exists with all fields)

---

### 3. Engagement Planning (`/platform/stakeholders/engagement`)
**Phases:** Prioritise + Engage
**Status:** `EngagementTracker.jsx` exists but partial; no Engagement Planning page; no priority matrix
**Work needed:**
- Create `StakeholderEngagementPage.jsx` with two tabs:
  - **Priority Board** — Kanban-style board grouped by engagement_priority (Critical / High / Medium / Low). Cards show stakeholder name, matrix quadrant badge, current vs desired attitude gap indicator
  - **Engagement Tracker** — Table of all engagement records with date, method, level, satisfaction
- Create `EngagementPlanForm.jsx` (new) — form to define engagement strategy per stakeholder:
  - engagement_priority (critical/high/medium/low)
  - engagement_strategy (text)
  - engagement_method (email/meeting/workshop/report/presentation/informal/survey)
  - preferred_engagement_format (text)
  - engagement_frequency (daily/weekly/fortnightly/monthly/quarterly/as-needed)
  - current_engagement_level (leading/supportive/neutral/unsupportive/blocking)
  - target_engagement_level (same options)
  - satisfaction_level (1–5)
  - next_engagement_date
  - engagement_notes
  - engagement_owner (user selector)
- Add "attitude gap" calculation: visual indicator showing distance between current and desired attitude
- Add engagement history log (chronological list per stakeholder)
- Export + On-hold queue support

**DB tables:** `stakeholder_engagement` (already exists)

---

### 4. Communication Plans (`/platform/stakeholders/communications`)
**Phase:** Engage
**Status:** `CommunicationPlan.jsx` is an unfinished stub; DB table exists
**Work needed:**
- Complete `CommunicationPlan.jsx` or replace with `CommunicationPlanPage.jsx`
- Create `CommunicationPlanForm.jsx` — full form:
  - plan_title, communication_type (update/report/meeting/newsletter/briefing/consultation/survey/other)
  - target_audience[] (multi-select from stakeholder register)
  - communication_channel (email/teams/phone/in-person/video-call/portal/notice-board)
  - frequency (daily/weekly/fortnightly/monthly/quarterly/event-driven/one-off)
  - schedule (day of week, time, or event trigger)
  - objective (text — what do you want them to know/do/feel?)
  - key_messages (text — core content points)
  - success_metrics (text)
  - plan_owner (user selector)
  - start_date, end_date
  - status (draft/active/completed/cancelled)
  - notes
- Create `CommunicationLog.jsx` — log of sent communications:
  - communication_type, content, sent_date, target_stakeholders[], status (sent/delivered/read/no-response)
  - Linked to communication plan
- Two-tab layout: **Plans** | **Communication Log**
- Export functionality
- On-hold queue

**DB tables:** `communication_plans`, `stakeholder_communications` (already exist)

---

### 5. Monitoring Dashboard (`/platform/stakeholders/monitoring`)
**Phase:** Monitor
**Status:** Zero implementation (DB stats function exists; no UI)
**Work needed:**
- Create `StakeholderMonitoringPage.jsx` with:
  - **Summary Cards:**
    - Total stakeholders, active count, high-priority count
    - Stakeholders by attitude (champion/supporter/neutral/critic/blocker) with trend arrows
    - Stakeholders by quadrant (manage-closely/keep-satisfied/keep-informed/monitor)
    - Engagement coverage % (how many have an engagement plan)
    - Communication plan compliance (scheduled vs actual)
  - **Engagement Trend Chart** — line chart showing average engagement level over time
  - **Attitude Distribution** — donut/bar chart of current attitude split
  - **High-Risk Stakeholders Table** — stakeholders where current attitude ≠ desired attitude OR engagement_level is unsupportive/blocking + high power/interest. Columns: name, quadrant, current attitude, desired attitude, last engagement date, days since last contact, owner
  - **Recent Engagement Log** — last 10 engagement records across all stakeholders
  - **Upcoming Communications** — next 7 days scheduled communications
- Export as report (PDF-style Word/PPT)

**DB functions:** `getStakeholderManagementStats()` (service already built)

---

## Platform Routes Summary (new/fixed)

| Path | Component | Phase |
|------|-----------|-------|
| `/platform/stakeholders` | redirect to `/platform/stakeholders/register` | — |
| `/platform/stakeholders/register` | `StakeholderRegisterPage` | Identify |
| `/platform/stakeholders/analysis` | `StakeholderAnalysisPage` | Understand + Analyse |
| `/platform/stakeholders/engagement` | `StakeholderEngagementPage` | Prioritise + Engage |
| `/platform/stakeholders/communications` | `CommunicationPlanPage` | Engage |
| `/platform/stakeholders/monitoring` | `StakeholderMonitoringPage` | Monitor |

---

## Simulator Parity

All 5 sub-features must be mirrored in the Simulator under `/simulator/practice-stakeholders/*`:

| Sim Route | Sim Component |
|-----------|--------------|
| `/simulator/practice-stakeholders/register` | `PracticeStakeholderRegisterPage` |
| `/simulator/practice-stakeholders/analysis` | `PracticeStakeholderAnalysis` |
| `/simulator/practice-stakeholders/engagement` | `PracticeEngagementPlanning` |
| `/simulator/practice-stakeholders/communications` | `PracticeCommunicationPlans` |
| `/simulator/practice-stakeholders/monitoring` | `PracticeStakeholderMonitoring` |

### New Simulator SQL Needed (`v300_sim_practice_stakeholder_analysis.sql`)
- `sim.practice_stakeholder_analysis` — mirrors `public.stakeholder_analysis`
- `sim.practice_engagement_plans` — mirrors `public.stakeholder_engagement`
- `sim.practice_communication_plans` — mirrors `public.communication_plans`
- `sim.practice_communication_log` — mirrors `public.stakeholder_communications`
- All tables: RLS user-scoped, soft-delete, audit fields

### New Simulator Service Methods (`practiceStakeholderService.js` additions)
- `getPracticeStakeholderAnalysis`, `savePracticeStakeholderAnalysis`, `deletePracticeStakeholderAnalysis`
- `getPracticeEngagementPlans`, `savePracticeEngagementPlan`, `deletePracticeEngagementPlan`
- `getPracticeCommunicationPlans`, `savePracticeCommunicationPlan`, `deletePracticeCommunicationPlan`
- `getPracticeCommunicationLog`, `savePracticeCommunicationLog`
- `getPracticeStakeholderStats`

---

## Updated Menu Config (pmMenuConfig.js)

```js
// Stakeholders – replace existing 4-item config with:
{
  id: 'platform-stakeholders',
  label: 'Stakeholders',
  icon: 'users-2',
  path: '/platform/stakeholders',
  permission: 'stakeholder.view',
  children: [
    { id: 'platform-stakeholders-register',     label: 'Stakeholder Register',  path: '/platform/stakeholders/register',       permission: 'stakeholder.view' },
    { id: 'platform-stakeholders-analysis',     label: 'Stakeholder Analysis',  path: '/platform/stakeholders/analysis',       permission: 'stakeholder.view' },
    { id: 'platform-stakeholders-engagement',   label: 'Engagement Planning',   path: '/platform/stakeholders/engagement',     permission: 'stakeholder.manage' },
    { id: 'platform-stakeholders-comms',        label: 'Communication Plans',   path: '/platform/stakeholders/communications', permission: 'stakeholder.view' },
    { id: 'platform-stakeholders-monitoring',   label: 'Monitoring',            path: '/platform/stakeholders/monitoring',     permission: 'stakeholder.view' },
  ]
}
```

---

## Updated Simulator Menu Config (simulatorMenuConfig.js)

Add under `sim-practice-controls` (Practice Controls & Registers):
```js
{
  id: 'sim-practice-stakeholders-register',     label: 'Stakeholder Register',  path: '/simulator/practice-stakeholders/register' },
  id: 'sim-practice-stakeholders-analysis',     label: 'Stakeholder Analysis',  path: '/simulator/practice-stakeholders/analysis' },
  id: 'sim-practice-stakeholders-engagement',   label: 'Engagement Planning',   path: '/simulator/practice-stakeholders/engagement' },
  id: 'sim-practice-stakeholders-comms',        label: 'Communication Plans',   path: '/simulator/practice-stakeholders/communications' },
  id: 'sim-practice-stakeholders-monitoring',   label: 'Monitoring',            path: '/simulator/practice-stakeholders/monitoring' },
```

---

## New Files to Create

### SQL
- `SQL/v300_sim_practice_stakeholder_analysis.sql`

### Platform Pages
- `src/pages/platform-app/StakeholderRegisterPage.jsx`
- `src/pages/platform-app/StakeholderAnalysisPage.jsx`
- `src/pages/platform-app/StakeholderEngagementPage.jsx`
- `src/pages/platform-app/CommunicationPlanPage.jsx`
- `src/pages/platform-app/StakeholderMonitoringPage.jsx`

### Platform Components
- `src/components/stakeholders/StakeholderAnalysisForm.jsx`
- `src/components/stakeholders/EngagementPlanForm.jsx`
- `src/components/stakeholders/CommunicationPlanForm.jsx`
- `src/components/stakeholders/CommunicationLog.jsx`
- `src/components/stakeholders/StakeholderMonitoringDashboard.jsx`
- `src/components/stakeholders/StakeholderExportMenu.jsx`

### Simulator Pages
- `src/pages/simulator/PracticeStakeholderRegisterPage.jsx`
- `src/pages/simulator/PracticeStakeholderAnalysis.jsx`
- `src/pages/simulator/PracticeEngagementPlanning.jsx`
- `src/pages/simulator/PracticeCommunicationPlans.jsx`
- `src/pages/simulator/PracticeStakeholderMonitoring.jsx`

---

## Todo Items

### Phase 1 – Database (Simulator SQL)
- [x] 1. Create `SQL/v301_sim_practice_stakeholder_analysis.sql` — sim tables for analysis, engagement plans, communication plans, communication log + RLS

### Phase 2 – Service Layer
- [x] 2. Extend `practiceStakeholderService.js` with analysis, engagement, comms, and stats functions

### Phase 3 – Platform Routing Fix
- [x] 3. Update `App.jsx` — remove placeholder `Stakeholders` route; add 5 new sub-page routes
- [x] 4. Add all lazy imports for 5 new platform pages
- [x] 5. Update `pmMenuConfig.js` — replace existing 4 children with 5 lifecycle-aligned children

### Phase 4 – Stakeholder Register Page
- [x] 6. Create `StakeholderRegisterPage.jsx` — uses existing `StakeholderRegister` + `StakeholderForm` components; adds export, success toasts

### Phase 5 – Stakeholder Analysis Page
- [x] 7. Create `StakeholderAnalysisForm.jsx` — power/interest sliders, auto-calculate quadrant, attitude fields
- [x] 8. Create `StakeholderAnalysisPage.jsx` — Matrix View + List View, edit/delete analysis records

### Phase 6 – Engagement Planning Page
- [x] 9. Create `EngagementPlanForm.jsx` — engagement strategy, method, frequency, attitude gap
- [x] 10. Create `StakeholderEngagementPage.jsx` — Priority Board (kanban) + Tracker table

### Phase 7 – Communication Plans Page
- [x] 11. Create `CommunicationPlanForm.jsx` — full form for communication plans
- [x] 12. Create `CommunicationLog.jsx` — log of sent communications
- [x] 13. Create `CommunicationPlanPage.jsx` — Plans tab + Communication Log tab

### Phase 8 – Monitoring Dashboard
- [x] 14. Create `StakeholderMonitoringDashboard.jsx` — summary cards, by attitude, by quadrant, high-risk table
- [x] 15. Create `StakeholderMonitoringPage.jsx` — page wrapper

### Phase 9 – Simulator Pages
- [x] 16. Create `PracticeStakeholderRegisterPage.jsx`
- [x] 17. Create `PracticeStakeholderAnalysis.jsx`
- [x] 18. Create `PracticeEngagementPlanning.jsx`
- [x] 19. Create `PracticeCommunicationPlans.jsx`
- [x] 20. Create `PracticeStakeholderMonitoring.jsx`

### Phase 10 – Simulator Routing & Menu
- [x] 21. Add 5 simulator route entries + lazy imports in `App.jsx`
- [x] 22. Update `simulatorMenuConfig.js` — add 5 stakeholder sub-items under Practice Controls & Registers

---

## Review

**Completed:** 2026-03-12

### Summary of changes

1. **SQL (Phase 1)**  
   - Added `SQL/v301_sim_practice_stakeholder_analysis.sql`: sim tables `practice_stakeholder_analysis`, `practice_engagement_plans`, `practice_communication_plans`, `practice_communication_log` with RLS and `database_tables` registration. (Plan referenced v300; v300 was already used for PMO menu, so v301 was used.)

2. **Services**  
   - **Platform** (`stakeholderService.js`): Fixed `communication_owner_user_id` alias for communication plans; added `deleteStakeholderAnalysis`, `getStakeholderCommunications`, `saveStakeholderCommunication`.  
   - **Simulator** (`practiceStakeholderService.js`): Added get/save/delete for analysis, engagement plans, communication plans, communication log, and `getPracticeStakeholderStats`.

3. **Platform routing and menu**  
   - `App.jsx`: `/platform/stakeholders` redirects to `/platform/stakeholders/register`. Added routes for register, analysis, engagement, communications, monitoring with lazy-loaded pages.  
   - `pmMenuConfig.js`: Register path set to `/platform/stakeholders/register`, label “Communication Plans”, and “Monitoring” child added.

4. **Platform pages and components**  
   - **StakeholderRegisterPage**: Project selector, `StakeholderRegister` + `StakeholderForm`, export dropdown, success toasts.  
   - **StakeholderAnalysisPage**: Project selector, Matrix/List view, `StakeholderAnalysisForm` modal, delete, export.  
   - **StakeholderEngagementPage**: Priority board (by engagement level) + `EngagementTracker`, `EngagementPlanForm`.  
   - **CommunicationPlanPage**: Plans table + Communication Log tab, `CommunicationPlanForm`, export.  
   - **StakeholderMonitoringPage**: Project selector + `StakeholderMonitoringDashboard` (cards, by attitude, by quadrant, high-risk table).  
   - New components: `StakeholderAnalysisForm`, `EngagementPlanForm`, `CommunicationPlanForm`, `CommunicationLog`, `StakeholderMonitoringDashboard`.  
   - `PowerInterestMatrix`: Optional `refreshTrigger` prop to refetch after analysis changes.

5. **Simulator**  
   - Five pages: `PracticeStakeholderRegisterPage`, `PracticeStakeholderAnalysis`, `PracticeEngagementPlanning`, `PracticeCommunicationPlans`, `PracticeStakeholderMonitoring`. Each has project selector, list/table or stats, and export where relevant.  
   - `App.jsx`: `/simulator/practice-stakeholders` redirects to `/simulator/practice-stakeholders/register`; added routes for register, analysis, engagement, communications, monitoring.  
   - `simulatorMenuConfig.js`: Under “Practice Controls & Registers”, added Stakeholder Register, Stakeholder Analysis, Engagement Planning, Communication Plans, Monitoring.

### Deferred / not implemented

- Bulk CSV import and on-hold queue on Stakeholder Register (can be added later).  
- Simulator SQL uses `sim.get_current_user_id()` for RLS; ensure this function exists and returns the correct user id in your environment.
