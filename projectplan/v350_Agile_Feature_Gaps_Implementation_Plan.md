# v350 — Agile Project Management: Feature Gap Implementation Plan
**Date:** 2026-04-10
**Scope:** Platform + Simulator (parity)
**Methodologies:** Scrum, Kanban, Lean, XP
**Preceded by:** v349 (Financial Management)

---

## Audit Summary — What Already Exists

The following Agile features are **already built** and must NOT be rebuilt:

| Feature | Status | Key Files |
|---|---|---|
| Sprint planning, board, management | ✅ Full | `SprintPlanning.jsx`, `SprintBoard.jsx`, `sprints` table |
| Product backlog, user stories, epics | ✅ Full | `ProductBacklog.jsx`, `user_stories`, `epics` tables |
| Daily Scrum / standup | ✅ Full | `DailyScrum.jsx`, `StandupCard.jsx`, `BlockerPanel.jsx` |
| Sprint Review | ✅ Full | `SprintReview.jsx`, `DemoChecklist.jsx` |
| Sprint Retrospective | ✅ Full | `SprintRetrospective.jsx`, `RetroBoard.jsx`, `ActionItemTracker.jsx` |
| Kanban board (swimlanes, WIP limits) | ✅ Full | `KanbanBoard.jsx`, `KanbanBoards.jsx`, `kanban_boards/columns/cards` |
| Kanban metrics (CFD, control chart) | ✅ Full | `MetricsDashboard.jsx`, `flowMetricsCalculator.js` |
| Burndown chart | ✅ Full | `BurndownChart.jsx` |
| Team availability / sprint capacity | ✅ Full | `team_availability`, `sprints.team_capacity_*` |
| Story-level DoD & acceptance criteria | ✅ Full | `user_stories.definition_of_done`, `acceptance_criteria` |
| Methodology selection & dashboard | ✅ Full | `MethodologySelection.jsx`, `MethodologyDashboard.jsx` |
| Testing / QA module | ✅ Full | `src/pages/testing/` |

---

## Gap Analysis — What Is Missing

### 🔴 Not Implemented

| # | Feature | Methodology |
|---|---|---|
| G1 | Release Planning (release backlog, release burndown, roadmap) | Scrum / All |
| G2 | Program Increment (PI) Planning board | Scrum / SAFe |
| G3 | Story Mapping (journey → activity → task hierarchy, visual map) | Scrum |
| G4 | XP: Pair programming session tracker | XP |
| G5 | XP: TDD / test coverage indicators per story/task | XP |
| G6 | XP: Code review log | XP |
| G7 | XP: Continuous Integration (CI) status board | XP |
| G8 | Lean: Value stream map builder | Lean |
| G9 | Lean: Waste identification & Kaizen board | Lean |
| G10 | Scrum of Scrums (multi-team coordination) | Scrum at scale |

### 🟡 Partially Implemented

| # | Feature | What Exists | What Is Missing |
|---|---|---|---|
| G11 | Burnup chart | Burndown only | Burnup (cumulative completed vs total scope) |
| G12 | Velocity trend dashboard | Single sprint velocity field | Cross-sprint trend chart, forecasting |
| G13 | Sprint metrics / analytics dashboard | No consolidated view | Velocity trend, burndown, capacity, forecast in one page |
| G14 | Sprint forecasting | None | Predict how many sprints to clear backlog at current velocity |
| G15 | Definition of Ready (DoR) | DoD exists at story level | DoR at project level and story-level checklist enforcement |
| G16 | Project-level DoD templates | DoD only on story rows | Reusable DoD template set at project level, applied to stories |
| G17 | Advanced Kanban analytics | CFD + control chart exist | Lead time distribution, throughput trend, flow efficiency, classes of service |
| G18 | Lean metrics | Kanban WIP/flow exists | Takt time, flow efficiency %, process cycle efficiency |

---

## Implementation Phases

---

### Phase 1 — Scrum Completeness

#### 1a — Burnup Chart
Add a burnup chart alongside the existing burndown.

- **Component:** `src/components/charts/BurnupChart.jsx`
  - X-axis: sprint days; Y-axis: story points
  - Two lines: Total Scope (may grow) and Completed (cumulative)
  - Rendered on `SprintBoard.jsx` and `SprintMetricsDashboard.jsx`
- **No new DB table** — derived from `sprint_backlogs` and `user_stories`

#### 1b — Velocity Trend & Sprint Metrics Dashboard
Consolidated analytics page for a project's Scrum history.

- **New page:** `src/pages/scrum/SprintMetricsDashboard.jsx`
  - Velocity trend bar chart (completed story points per sprint)
  - Sprint-over-sprint comparison table (committed vs completed, capacity used)
  - Burndown & burnup for selected sprint (reuse `BurndownChart` + new `BurnupChart`)
  - Sprint forecasting widget (see 1c)
- **Route:** `/platform/projects/:projectId/scrum/metrics`
- **No new DB table** — queries `sprints` + `sprint_backlogs`

#### 1c — Sprint Forecasting
Predict how many sprints remain to clear the backlog.

- **Logic (in `sprintForecastService.js`):**
  - Average velocity = mean of last N completed sprint velocities (N configurable, default 3)
  - Remaining backlog points = sum of `user_stories.story_points` where status not `done`
  - Sprints remaining = `CEIL(remaining / avg_velocity)`
  - Confidence range using min/max velocity
- **Displayed as widget on** `SprintMetricsDashboard.jsx`
- **No new DB table**

#### 1d — Project-Level DoD & DoR Templates
Reusable project-wide templates that can be auto-applied to new stories.

- **New DB table:** `project_agile_templates`
  ```
  id (UUID, PK)
  project_id (FK → projects)
  template_type (VARCHAR — 'dod' | 'dor')
  items (JSONB — array of {text, order, is_required})
  is_active (BOOLEAN DEFAULT true)
  created_by_user_id (FK → users)
  created_at, updated_at (TIMESTAMPS)
  ```
- **New page:** `src/pages/scrum/AgileTemplates.jsx`
  - CRUD for DoD and DoR templates per project
  - Toggle: auto-apply template to new stories
  - Route: `/platform/projects/:projectId/scrum/templates`
- **Update `user_stories`** to add `definition_of_ready TEXT[]` column (DoR at story level)
- **Simulator parity:** `sim.project_agile_templates` table; `SimAgileTemplates.jsx`

#### 1e — Story Mapping
Visual user story map: Journey (horizontal) → Activities → User Stories (vertical priority).

- **New DB table:** `story_map_items`
  ```
  id (UUID, PK)
  project_id (FK → projects)
  item_type (VARCHAR — 'journey' | 'activity' | 'story')
  parent_id (FK → story_map_items, nullable — for hierarchy)
  user_story_id (FK → user_stories, nullable — leaf nodes link to stories)
  title (VARCHAR 300)
  description (TEXT)
  col_order (INTEGER)
  row_order (INTEGER)
  color (VARCHAR 20)
  created_at, updated_at (TIMESTAMPS)
  ```
- **New page:** `src/pages/scrum/StoryMap.jsx`
  - Drag-and-drop 2D grid: journeys as columns, activities as sub-columns, stories stacked vertically
  - Create/edit/delete nodes inline
  - Link existing `user_stories` to leaf nodes
  - Export as image / PowerPoint
  - Route: `/platform/projects/:projectId/scrum/story-map`
- **Simulator parity:** `sim.story_map_items`; `SimStoryMap.jsx`

---

### Phase 2 — Release Planning (Agile)

Full release management for Agile projects — release backlog, release burndown, roadmap timeline.

#### New DB Tables

**`agile_releases`:**
```
id (UUID, PK)
project_id (FK → projects)
release_name (VARCHAR 200)
release_version (VARCHAR 50)
target_date (DATE)
release_status (VARCHAR 30 — planned/in_progress/released/cancelled)
release_goal (TEXT)
is_deleted (BOOLEAN DEFAULT false)
created_at, updated_at (TIMESTAMPS)
```

**`release_stories`** (links stories to releases):
```
id (UUID, PK)
release_id (FK → agile_releases)
user_story_id (FK → user_stories)
added_at (TIMESTAMP)
```

#### New Pages (Platform)

- **`AgilReleases.jsx`** — release list (card + table, CRUD, export)
  - Route: `/platform/projects/:projectId/scrum/releases`
- **`AgileReleaseDetail.jsx`** — single release view:
  - Stories assigned to release (from backlogs across sprints)
  - Release burndown (remaining story points over time)
  - Completion % by story count and story points
  - Route: `/platform/projects/:projectId/scrum/releases/:releaseId`
- **`AgileRoadmap.jsx`** — timeline view of all releases with stories:
  - Gantt-style horizontal timeline
  - Releases as milestones; sprints shown underneath
  - Route: `/platform/projects/:projectId/scrum/roadmap`

**Simulator parity:** `sim.agile_releases`, `sim.release_stories`; `SimAgileReleases.jsx`, `SimAgileRoadmap.jsx`

---

### Phase 3 — Advanced Kanban Analytics

Extends existing `MetricsDashboard.jsx` with missing analytics.

#### 3a — Lead Time & Cycle Time Distribution
- **New component:** `src/components/kanban/LeadTimeCycleTimeChart.jsx`
  - Histogram of lead time distribution (days from created to done)
  - Histogram of cycle time (days from in-progress to done)
  - Percentile lines (50th, 85th, 95th) — SLA reference lines configurable
  - Data derived from `kanban_cards.created_at` and card status transitions

#### 3b — Throughput Run Chart
- **New component:** `src/components/kanban/ThroughputChart.jsx`
  - Items completed per week/day (bar chart)
  - Rolling average line
  - Used for Monte Carlo-style forecasting widget

#### 3c — Flow Efficiency Metrics
- **New component:** `src/components/kanban/FlowEfficiencyPanel.jsx`
  - Flow efficiency = active time / total lead time
  - Blocked time analysis (using `kanban_cards` blocker data)
  - Average age of items in each column

#### 3d — Classes of Service
- **New DB table:** `kanban_classes_of_service`
  ```
  id (UUID, PK)
  board_id (FK → kanban_boards)
  name (VARCHAR 100 — e.g. 'Expedite', 'Fixed Date', 'Standard', 'Intangible')
  policy (TEXT)
  color (VARCHAR 20)
  wip_limit (INTEGER, nullable)
  sort_order (INTEGER)
  ```
- Add `class_of_service_id` FK to `kanban_cards`
- **New config section** in board settings for managing classes of service
- **Simulator parity:** `sim.kanban_classes_of_service`

All new charts added as new tabs on existing `MetricsDashboard.jsx` — no new page needed.

---

### Phase 4 — XP (Extreme Programming) Practices

Lightweight tracking for XP ceremonies and disciplines.

#### New DB Tables

**`xp_pair_sessions`:**
```
id (UUID, PK)
project_id (FK → projects)
driver_user_id (FK → users)
navigator_user_id (FK → users)
task_id (FK → tasks, nullable)
user_story_id (FK → user_stories, nullable)
session_date (DATE)
duration_minutes (INTEGER)
notes (TEXT)
created_at (TIMESTAMP)
```

**`xp_code_reviews`:**
```
id (UUID, PK)
project_id (FK → projects)
reviewer_user_id (FK → users)
author_user_id (FK → users)
user_story_id (FK → user_stories, nullable)
review_date (DATE)
status (VARCHAR 20 — pending/approved/changes_requested)
feedback (TEXT)
created_at, updated_at (TIMESTAMPS)
```

**`xp_ci_builds`:**
```
id (UUID, PK)
project_id (FK → projects)
build_number (VARCHAR 100)
branch (VARCHAR 200)
status (VARCHAR 20 — passing/failing/unstable/cancelled)
build_date (TIMESTAMPTZ)
duration_seconds (INTEGER)
pipeline_url (TEXT)
notes (TEXT)
created_at (TIMESTAMP)
```

#### New Page: `src/pages/xp/XPDashboard.jsx`

Route: `/platform/projects/:projectId/xp/dashboard`

Tabs:
- **Pairing** — log pair sessions, pairing matrix heatmap (who has paired with whom), pairing frequency per story
- **Code Reviews** — log reviews, pending review queue, approval status per story
- **CI Status** — build history feed, pass rate trend, last build status indicator
- **TDD Tracker** — toggle per story whether tests were written first (checkbox on `user_stories`); TDD adoption % chart

Add `tdd_followed BOOLEAN DEFAULT false` column to `user_stories`.

**Simulator parity:** `sim.xp_pair_sessions`, `sim.xp_code_reviews`, `sim.xp_ci_builds`; `SimXPDashboard.jsx`

---

### Phase 5 — Lean Features

#### 5a — Value Stream Map Builder
Visual tool to map process steps, wait times, and flow.

- **New DB table:** `lean_value_stream_maps`
  ```
  id (UUID, PK)
  project_id (FK → projects)
  map_name (VARCHAR 200)
  map_data (JSONB — nodes: {id, type, label, process_time_min, wait_time_min, x, y}; edges: {from, to})
  created_by_user_id (FK → users)
  created_at, updated_at (TIMESTAMPS)
  ```
- **New page:** `src/pages/lean/ValueStreamMap.jsx`
  - Node-based drag-and-drop canvas (process boxes + arrows)
  - Process time / wait time per node
  - Total lead time and flow efficiency computed from map
  - Export as PNG / PowerPoint
  - Route: `/platform/projects/:projectId/lean/value-stream-map`

#### 5b — Kaizen / Waste Board
Log and track waste/improvement ideas.

- **New DB table:** `lean_kaizen_items`
  ```
  id (UUID, PK)
  project_id (FK → projects)
  title (VARCHAR 300)
  waste_type (VARCHAR 50 — overproduction/waiting/transport/overprocessing/inventory/motion/defects/unused_talent)
  description (TEXT)
  impact (VARCHAR 20 — low/medium/high)
  status (VARCHAR 30 — identified/in_progress/implemented/rejected)
  assigned_to_user_id (FK → users, nullable)
  target_date (DATE, nullable)
  implemented_at (DATE, nullable)
  is_deleted (BOOLEAN DEFAULT false)
  created_at, updated_at (TIMESTAMPS)
  ```
- **New page:** `src/pages/lean/KaizenBoard.jsx`
  - Kanban-style board: Identified → In Progress → Implemented / Rejected
  - Waste type filter and categorisation
  - Impact scoring
  - Route: `/platform/projects/:projectId/lean/kaizen`

#### 5c — Lean Metrics Dashboard
- **New page:** `src/pages/lean/LeanMetrics.jsx`
  - Flow efficiency % (from value stream map data)
  - Takt time = available time ÷ customer demand (configurable inputs)
  - Process cycle efficiency
  - Waste breakdown pie chart by waste type (from kaizen items)
  - Route: `/platform/projects/:projectId/lean/metrics`

**Simulator parity:** `sim.lean_value_stream_maps`, `sim.lean_kaizen_items`; `SimValueStreamMap.jsx`, `SimKaizenBoard.jsx`, `SimLeanMetrics.jsx`

---

### Phase 6 — Scrum of Scrums (Multi-team)

Basic multi-team Scrum coordination for projects involving multiple Scrum teams.

- **New DB table:** `scrum_of_scrums_meetings`
  ```
  id (UUID, PK)
  project_id (FK → projects)
  meeting_date (DATE)
  facilitator_user_id (FK → users)
  notes (TEXT)
  created_at (TIMESTAMP)
  ```
- **New DB table:** `sos_team_updates`
  ```
  id (UUID, PK)
  meeting_id (FK → scrum_of_scrums_meetings)
  team_name (VARCHAR 200)
  accomplished (TEXT)
  planned (TEXT)
  impediments (TEXT)
  needs_coordination (BOOLEAN DEFAULT false)
  created_at (TIMESTAMP)
  ```
- **New page:** `src/pages/scrum/ScrumOfScrums.jsx`
  - Meeting log (card + table)
  - Per-meeting team update capture (same 3 questions as daily scrum but per-team)
  - Cross-team impediment board
  - Route: `/platform/projects/:projectId/scrum/scrum-of-scrums`
- **Simulator parity:** `sim.scrum_of_scrums_meetings`, `sim.sos_team_updates`; `SimScrumOfScrums.jsx`

---

### Phase 7 — Agile Metrics Hub (Cross-methodology)

Single consolidated page accessible per project that shows the right metrics based on the project's selected methodology.

- **New page:** `src/pages/agile/AgileMetricsHub.jsx`
  - Auto-detects project methodology from `project_methodologies`
  - **Scrum view:** velocity trend, burndown/burnup, sprint forecast, DoD completion rate
  - **Kanban view:** CFD, lead/cycle time distribution, throughput, WIP compliance
  - **XP view:** pairing frequency, CI pass rate, TDD adoption %, code review rate
  - **Lean view:** flow efficiency, waste breakdown, kaizen completion rate
  - Export all metrics (Excel, PDF, PowerPoint)
  - Route: `/platform/projects/:projectId/agile/metrics`
- **Simulator parity:** `SimAgileMetricsHub.jsx`

---

### Phase 8 — Simulator Parity

All Simulator counterparts for new Agile features. All tables in `sim` schema; all services prefixed `sim`; all pages prefixed `Sim`.

| Platform Feature | Simulator Page | Simulator Table(s) |
|---|---|---|
| SprintMetricsDashboard | SimSprintMetricsDashboard | — (queries sim.sprints) |
| BurnupChart | SimBurnupChart component | — |
| AgileTemplates (DoD/DoR) | SimAgileTemplates | sim.project_agile_templates |
| StoryMap | SimStoryMap | sim.story_map_items |
| AgileReleases + Roadmap | SimAgileReleases, SimAgileRoadmap | sim.agile_releases, sim.release_stories |
| Kanban: classes of service | via SimKanbanBoard config | sim.kanban_classes_of_service |
| Kanban: advanced analytics | SimKanbanMetrics (new tabs) | — |
| XPDashboard | SimXPDashboard | sim.xp_pair_sessions, sim.xp_code_reviews, sim.xp_ci_builds |
| ValueStreamMap | SimValueStreamMap | sim.lean_value_stream_maps |
| KaizenBoard | SimKaizenBoard | sim.lean_kaizen_items |
| LeanMetrics | SimLeanMetrics | — |
| ScrumOfScrums | SimScrumOfScrums | sim.scrum_of_scrums_meetings, sim.sos_team_updates |
| AgileMetricsHub | SimAgileMetricsHub | — |

---

### Phase 9 — Sidebar, Routing & Navigation

#### Platform Menu (DB-driven `menu_items` + `role_menu_items`)

New items to INSERT via `v429_agile_menu_items.sql`:

| Label | Route | Section | Roles |
|---|---|---|---|
| Sprint Metrics | `/platform/projects/:id/scrum/metrics` | Projects › Scrum | PM, PMO, Sponsor, Board |
| Story Map | `/platform/projects/:id/scrum/story-map` | Projects › Scrum | PM, PMO |
| Agile Templates | `/platform/projects/:id/scrum/templates` | Projects › Scrum | PM, PMO |
| Releases | `/platform/projects/:id/scrum/releases` | Projects › Scrum | PM, PMO, Sponsor |
| Roadmap | `/platform/projects/:id/scrum/roadmap` | Projects › Scrum | All 6 roles |
| Scrum of Scrums | `/platform/projects/:id/scrum/scrum-of-scrums` | Projects › Scrum | PM, Programme Mgr, PMO |
| XP Dashboard | `/platform/projects/:id/xp/dashboard` | Projects › XP | PM, PMO |
| Value Stream Map | `/platform/projects/:id/lean/value-stream-map` | Projects › Lean | PM, PMO |
| Kaizen Board | `/platform/projects/:id/lean/kaizen` | Projects › Lean | All roles |
| Lean Metrics | `/platform/projects/:id/lean/metrics` | Projects › Lean | PM, PMO, Sponsor, Board |
| Agile Metrics Hub | `/platform/projects/:id/agile/metrics` | Projects › Agile | All 6 roles |

#### Static Config Updates

- **`pmDashboardMenuConfig.js`** — add Scrum Metrics, Story Map, Releases, Roadmap, XP Dashboard, Lean sections
- **`pmoMenuConfig.js`** — add Agile Metrics Hub, Roadmap overview
- **`simulatorMenuConfig.js`** — add all Simulator equivalents (premium tier)
- **`simulatorPMMenuConfig.js`** — add Sim Scrum, XP, Lean menu sections
- **Add icons** to `Sidebar.jsx` icon map: `map`, `git-merge`, `zap`, `recycle`, `compass`, `bar-chart-4`, `clock`

#### `App.jsx` Route Additions

Platform:
- `/platform/projects/:projectId/scrum/metrics`
- `/platform/projects/:projectId/scrum/story-map`
- `/platform/projects/:projectId/scrum/templates`
- `/platform/projects/:projectId/scrum/releases`
- `/platform/projects/:projectId/scrum/releases/:releaseId`
- `/platform/projects/:projectId/scrum/roadmap`
- `/platform/projects/:projectId/scrum/scrum-of-scrums`
- `/platform/projects/:projectId/xp/dashboard`
- `/platform/projects/:projectId/lean/value-stream-map`
- `/platform/projects/:projectId/lean/kaizen`
- `/platform/projects/:projectId/lean/metrics`
- `/platform/projects/:projectId/agile/metrics`

Simulator: mirror all above under `/simulator/practice-projects/:projectId/...`

---

### Phase 10 — Unit Tests

- `src/services/__tests__/sprintForecastService.test.js`
- `src/services/__tests__/agileReleaseService.test.js`
- `src/services/__tests__/xpPairSessionService.test.js`
- `src/services/__tests__/leanKaizenService.test.js`

---

## SQL Files Schedule (v433+; v423–v432 reserved by Financial Management)

| Version | File | Contents |
|---|---|---|
| v433 | `v433_project_agile_templates_and_story_map.sql` | `project_agile_templates`, `story_map_items`, `user_stories.definition_of_ready`, `tdd_followed`, RLS, `database_tables` |
| v434 | `v434_agile_releases_and_kanban_cos.sql` | `agile_releases`, `release_stories`, `kanban_classes_of_service`, `kanban_cards.class_of_service_id`, RLS |
| v435 | `v435_xp_lean_scrum_of_scrums.sql` | XP, Lean, Scrum of Scrums tables + RLS + registry |
| v436 | `v436_sim_agile_gap_tables.sql` | `sim.*` counterparts + grants + RLS + registry |
| v437 | `v437_agile_feature_gaps_menu_items.sql` | `menu_items` + `role_menu_items` for Agile project routes |
| v438 | `v438_agile_feature_gaps_seed_data.sql` | Logical seed data (Platform + Simulator) for agile gap tables — idempotent |

---

## New Files to Create

### SQL
```
SQL/v433_project_agile_templates_and_story_map.sql
SQL/v434_agile_releases_and_kanban_cos.sql
SQL/v435_xp_lean_scrum_of_scrums.sql
SQL/v436_sim_agile_gap_tables.sql
SQL/v437_agile_feature_gaps_menu_items.sql
SQL/v438_agile_feature_gaps_seed_data.sql
```

### Platform Services
```
src/services/sprintForecastService.js
src/services/agileReleaseService.js
src/services/storyMapService.js
src/services/xpPairSessionService.js
src/services/xpCodeReviewService.js
src/services/xpCIBuildService.js
src/services/leanValueStreamService.js
src/services/leanKaizenService.js
src/services/scrumOfScrumsService.js
src/services/agileTemplateService.js
```

### Platform Pages
```
src/pages/scrum/SprintMetricsDashboard.jsx
src/pages/scrum/AgileTemplates.jsx
src/pages/scrum/StoryMap.jsx
src/pages/scrum/AgileReleases.jsx
src/pages/scrum/AgileReleaseDetail.jsx
src/pages/scrum/AgileRoadmap.jsx
src/pages/scrum/ScrumOfScrums.jsx
src/pages/xp/XPDashboard.jsx
src/pages/lean/ValueStreamMap.jsx
src/pages/lean/KaizenBoard.jsx
src/pages/lean/LeanMetrics.jsx
src/pages/agile/AgileMetricsHub.jsx
```

### Platform Components
```
src/components/charts/BurnupChart.jsx
src/components/kanban/LeadTimeCycleTimeChart.jsx
src/components/kanban/ThroughputChart.jsx
src/components/kanban/FlowEfficiencyPanel.jsx
```

### Simulator Services
```
src/services/simAgileTemplateService.js
src/services/simAgileReleaseService.js
src/services/simStoryMapService.js
src/services/simXpPairSessionService.js
src/services/simXpCodeReviewService.js
src/services/simXpCIBuildService.js
src/services/simLeanValueStreamService.js
src/services/simLeanKaizenService.js
src/services/simScrumOfScrumsService.js
```

### Simulator Pages
```
src/pages/simulator/SimSprintMetricsDashboard.jsx
src/pages/simulator/SimAgileTemplates.jsx
src/pages/simulator/SimStoryMap.jsx
src/pages/simulator/SimAgileReleases.jsx
src/pages/simulator/SimAgileRoadmap.jsx
src/pages/simulator/SimScrumOfScrums.jsx
src/pages/simulator/SimXPDashboard.jsx
src/pages/simulator/SimValueStreamMap.jsx
src/pages/simulator/SimKaizenBoard.jsx
src/pages/simulator/SimLeanMetrics.jsx
src/pages/simulator/SimAgileMetricsHub.jsx
src/pages/simulator/SimAgileReleaseDetail.jsx
src/pages/simulator/SimKanbanMetrics.jsx
```

### Tests
```
src/services/__tests__/sprintForecastService.test.js
src/services/__tests__/agileReleaseService.test.js
src/services/__tests__/xpPairSessionService.test.js
src/services/__tests__/leanKaizenService.test.js
```

### Documentation
```
Documentation/v350_Agile_Feature_Gaps_Guide.md
```

---

## Todo List

### Phase 1 — Scrum Completeness
- [x] Create `SQL/v433_project_agile_templates_and_story_map.sql` (replaces planned v423)
- [x] Create `src/components/charts/BurnupChart.jsx`
- [x] Create `src/services/sprintForecastService.js`
- [x] Create `src/services/agileTemplateService.js`
- [x] Create `src/pages/scrum/SprintMetricsDashboard.jsx` (velocity trend, burndown, burnup, forecast)
- [x] Create `src/pages/scrum/AgileTemplates.jsx` (DoD/DoR templates)
- [x] Create `src/services/storyMapService.js`
- [x] Create `src/pages/scrum/StoryMap.jsx`
- [x] Create Simulator counterparts: `SimSprintMetricsDashboard.jsx`, `SimAgileTemplates.jsx`, `SimStoryMap.jsx`

### Phase 2 — Release Planning
- [x] Create `SQL/v434_agile_releases_and_kanban_cos.sql` (includes releases)
- [x] Create `src/services/agileReleaseService.js`
- [x] Create `src/pages/scrum/AgileReleases.jsx`
- [x] Create `src/pages/scrum/AgileReleaseDetail.jsx`
- [x] Create `src/pages/scrum/AgileRoadmap.jsx`
- [x] Create Simulator counterparts: `SimAgileReleases.jsx`, `SimAgileRoadmap.jsx`, `SimAgileReleaseDetail.jsx`

### Phase 3 — Advanced Kanban Analytics
- [x] Create `SQL/v434` (kanban_classes_of_service + card FK)
- [x] Create `src/components/kanban/LeadTimeCycleTimeChart.jsx`
- [x] Create `src/components/kanban/ThroughputChart.jsx`
- [x] Create `src/components/kanban/FlowEfficiencyPanel.jsx`
- [x] Add classes-of-service config to `KanbanBoard.jsx` (+ `kanbanClassOfServiceService.js`)
- [x] Add new analytics tabs to existing `MetricsDashboard.jsx`

### Phase 4 — XP Practices
- [x] Create `SQL/v435_xp_lean_scrum_of_scrums.sql` (XP section)
- [x] Create `src/services/xpPairSessionService.js`
- [x] Create `src/services/xpCodeReviewService.js`
- [x] Create `src/services/xpCIBuildService.js`
- [x] Create `src/pages/xp/XPDashboard.jsx`
- [x] Create `src/pages/simulator/SimXPDashboard.jsx`

### Phase 5 — Lean Features
- [x] Create `SQL/v435` (Lean section)
- [x] Create `src/services/leanValueStreamService.js`
- [x] Create `src/services/leanKaizenService.js`
- [x] Create `src/pages/lean/ValueStreamMap.jsx`
- [x] Create `src/pages/lean/KaizenBoard.jsx`
- [x] Create `src/pages/lean/LeanMetrics.jsx`
- [x] Create Simulator counterparts: `SimValueStreamMap.jsx`, `SimKaizenBoard.jsx`, `SimLeanMetrics.jsx`

### Phase 6 — Scrum of Scrums
- [x] Create `SQL/v435` (SoS section)
- [x] Create `src/services/scrumOfScrumsService.js`
- [x] Create `src/pages/scrum/ScrumOfScrums.jsx`
- [x] Create `src/pages/simulator/SimScrumOfScrums.jsx`

### Phase 7 — Agile Metrics Hub
- [x] Create `src/pages/agile/AgileMetricsHub.jsx`
- [x] Create `src/pages/simulator/SimAgileMetricsHub.jsx`

### Phase 8 — Simulator SQL
- [x] Create `SQL/v436_sim_agile_gap_tables.sql` (replaces planned v430/v432 split; registry included in v433–v436 inserts)

### Phase 9 — Routing, Menus & Navigation
- [x] Create `SQL/v437_agile_feature_gaps_menu_items.sql` (replaces planned v431)
- [x] Update `App.jsx` — all new Platform routes (+ nested sprint routes for board/review/retro/daily)
- [x] Update `App.jsx` — all new Simulator routes
- [x] `ProjectsDetail.jsx` quick links for Scrum/Kanban/XP/Lean (project-scoped entry points)
- [x] Optional static configs (`pmDashboardMenuConfig`, `pmoMenuConfig`, `simulatorMenuConfig`, `simulatorPMMenuConfig`, `Sidebar` icon map): **not required** for v350 closure — DB `menu_items` (`v437`) + dashboard buttons provide navigation; add static entries later if desired

### Phase 10 — Unit Tests
- [x] Create `src/services/__tests__/sprintForecastService.test.js`
- [x] Create `src/services/__tests__/agileReleaseService.test.js`
- [x] Create `src/services/__tests__/xpPairSessionService.test.js`
- [x] Create `src/services/__tests__/leanKaizenService.test.js`

### Phase 11 — Documentation
- [x] Create `Documentation/v350_Agile_Feature_Gaps_Guide.md`

### Out of scope / follow-up
- [ ] **G2 PI Planning board** — not implemented (gap table only); requires SAFe-specific schema/UI.
- [ ] Static `pmDashboardMenuConfig` / `Sidebar` icon map — optional polish once DB menu seed is verified in-app.

---

## Implementation review (2026-04-09)

**Done:** Platform and Simulator routes for all v350 pages; SQL `v433`–`v437`; optional logical seed `v438_agile_feature_gaps_seed_data.sql`; Kanban analytics tabs + CoS panel on `KanbanBoard`; burnup on `SprintBoard` and `SprintMetricsDashboard`; services and sim service wrappers; `ProjectsDetail` quick links; unit tests for four services; documentation guide.

**Gaps / follow-up:** PI Planning (G2) not built. Static menu config files (`pmDashboardMenuConfig`, `simulatorMenuConfig`, etc.) were not edited; navigation relies on `v437` `menu_items` + existing Sidebar resolution, plus project dashboard buttons. Card → class-of-service picker on each card is not wired (table + board list only). Simulator Kanban metrics page is explanatory (`SimKanbanMetrics`) until practice projects share platform `kanban_boards` linkage.

---

## Key Design Decisions

1. **No rebuilding** — all existing Scrum/Kanban features are preserved; gaps are additive only
2. **Burnup derived, not stored** — burnup chart computed from `sprint_backlogs` + `user_stories` at runtime
3. **Sprint forecasting is stateless** — computed in service from last N sprint velocities; no new table
4. **Story map is its own table** — not merged with `user_stories` to keep both independently queryable
5. **Value stream map stored as JSONB** — flexible canvas node/edge data without rigid schema
6. **XP is opt-in per project** — XP features only shown when project methodology includes XP
7. **Lean is opt-in per project** — Lean features shown when methodology is Lean or Lean-Kanban
8. **Agile Metrics Hub is methodology-aware** — shows different widgets based on `project_methodologies`
9. **All pages**: dark mode default, card/table toggle, sortable columns, export dropdown, PWA-responsive
10. **Amount/numeric fields**: shorthand `10k`/`3m` entry on Enter key
11. **Platform–Simulator parity**: every feature has a full Simulator counterpart

---

## What This Delivers (Methodology Coverage)

| Methodology | Before | After |
|---|---|---|
| **Scrum** | Ceremonies ✅, Backlog ✅, Board ✅ | + Metrics Dashboard, Burnup, Forecasting, Story Map, DoD/DoR templates, Releases, Roadmap, Scrum of Scrums |
| **Kanban** | Board ✅, WIP ✅, CFD ✅ | + Lead/cycle time distribution, Throughput chart, Flow efficiency, Classes of service |
| **XP** | Testing ✅ | + Pair programming tracker, Code review log, CI status board, TDD indicators |
| **Lean** | WIP limits ✅ | + Value stream mapping, Kaizen/waste board, Lean metrics (takt time, flow efficiency) |
| **All** | Methodology selection ✅ | + Unified Agile Metrics Hub (methodology-aware) |

---

*Plan version: v350 | Created: 2026-04-10*
