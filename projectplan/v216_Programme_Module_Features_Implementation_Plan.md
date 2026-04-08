# v216 — Programme Module Features Implementation Plan

## Objective
Make the **Programme** section in the left sidebar fully functional for the Platform app, aligned with the new `/platform/*` route structure and existing backend services.

Covered sidebar items (circled section):
- **All Programmes**
- **Programme Dashboard**
- **Programme Projects**
- **Dependencies**
- **Benefits**
- **Timeline**
- **Reports**

The goal is to wire these to real pages and data, using the existing `programmeService` and programme UI components, with minimal, well‑scoped changes.

---

## Current State (as of 2026‑03‑09)

- **Routes**
  - `/platform/programme` → `src/pages/platform-app/Programme.jsx` (All Programmes list page; works and uses `getProgrammes`).
  - No routes yet for:
    - `/platform/programme/create`
    - `/platform/programme/:id`
    - `/platform/programme/:id/edit`
    - `/platform/programme/dashboard`
    - `/platform/programme/projects`
    - `/platform/programme/dependencies`
    - `/platform/programme/benefits`
    - `/platform/programme/timeline`
    - `/platform/programme/reports`

- **Legacy Programme pages** (not wired to `/platform` routes yet):
  - `src/pages/programme/Programme.jsx` — older All Programmes page (non‑platform layout).
  - `src/pages/programme/ProgrammeDetail.jsx` — single‑programme view with tabs:
    - `dashboard` (already uses `ProgrammeDashboard` and full data)
    - `projects`, `dependencies`, `benefits`, `timeline`, `reports` (currently show “coming soon...” placeholders).
  - `src/pages/programme/ProgrammeEdit.jsx` — edit screen using `ProgrammeForm`.

- **Programme components** (already implemented and data‑driven):
  - `ProgrammeDashboard.jsx` — rich dashboard for a single programme; uses:
    - `getProgrammeDashboardStats`
    - `getProgrammeProjects`
    - `getProgrammeBenefits`
    - `getProgrammeDependencies`
    - `getProgrammeMilestones`
  - `ProgrammeTimelineView.jsx` — visual timeline of milestones + projects.
  - `DependencyMapVisualization.jsx` — dependency overview for a programme.
  - `BenefitsRealizationChart.jsx` — programme‑level benefits realization.
  - `ProgrammeProgressChart.jsx`, `ProgrammeRiskIndicator.jsx`,
    `ProgrammeMilestoneTracker.jsx`, `RelatedProjectsStatus.jsx`, `ResourceCoordinationView.jsx` — additional dashboard sub‑components.

- **Services & Tables** (`src/services/programmeService.js`):
  - `getProgrammes`, `getProgramme`, `saveProgramme`, `deleteProgramme`
  - `getProgrammeProjects`, `addProjectToProgramme`, `removeProjectFromProgramme`
  - `getProgrammeBenefits`, `saveProgrammeBenefit`, `deleteProgrammeBenefit`
  - `getProgrammeDependencies`, `saveProgrammeDependency`, `deleteProgrammeDependency`
  - `getProgrammeMilestones`, `saveProgrammeMilestone`, `deleteProgrammeMilestone`
  - `getProgrammeReports` (from `programme_reports`)
  - `getProgrammeDashboardStats` (aggregates all of the above)
  - `getAllProgrammeRollups` (account‑level rollup view)

**Conclusion:** Backend and visualization components already exist; the missing pieces are:
- Route wiring under `/platform/programme/*`
- Replacing “coming soon” placeholders in `ProgrammeDetail` with real tab content
- Light shell pages for the sidebar “Programme Dashboard / Projects / Dependencies / Benefits / Timeline / Reports” entries.

---

## Target UX Design

### 1. All Programmes (List)
- **Route:** `/platform/programme`
- **Page:** `src/pages/platform-app/Programme.jsx` (already implemented).
- **Behaviour:**
  - List of programmes for the user’s organisation (search + quick stats).
  - Clicking a card navigates to `/platform/programme/:id` (single‑programme view).
  - “Create Programme” button navigates to `/platform/programme/create`.

### 2. Single Programme View with Full Tabs
- **Route:** `/platform/programme/:id`
- **Page:** New Platform wrapper that reuses `ProgrammeDetail.jsx` logic, but aligned to `/platform/*` routes.
- **Tabs & Features:**
  - **Dashboard**:
    - Uses `ProgrammeDashboard` (already implemented).
  - **Projects**:
    - Uses `getProgrammeProjects(programmeId)` to load assignments.
    - Displays a table of projects with:
      - project name/code/status
      - programme priority and assignment status
      - link to open each project detail page.
  - **Dependencies**:
    - Uses `getProgrammeDependencies(programmeId)`.
    - Shows:
      - `DependencyMapVisualization` component.
      - A detail table listing dependencies (source → target, type, status, criticality).
  - **Benefits**:
    - Uses `getProgrammeBenefits(programmeId)`.
    - Shows:
      - `BenefitsRealizationChart` at top.
      - A list/table of programme benefits (name, type, status, expected vs actual value, owner).
  - **Timeline**:
    - Uses `getProgrammeMilestones(programmeId)` and `getProgrammeProjects(programmeId)`.
    - Feeds data + `programme` into `ProgrammeTimelineView` to render visual timeline.
  - **Reports**:
    - Uses `getProgrammeReports(programmeId)`.
    - Displays list of reports with:
      - report type, date, status, generated_by, approved_by.
    - Basic filters (by type & status) and record‑level export buttons (reuse generic export helpers where possible).

> **Note:** Editing of programme details continues to use `ProgrammeForm` in a modal (as in existing `ProgrammeDetail.jsx`), but the page route becomes `/platform/programme/:id`.

### 3. Create / Edit Programme
- **Create Route:** `/platform/programme/create`
  - **Page:** thin wrapper using `ProgrammeForm` in “create” mode.
  - On save → navigate to `/platform/programme/:newProgrammeId`.
- **Edit Route:** `/platform/programme/:id/edit`
  - **Page:** wrapper using `ProgrammeEdit.jsx` logic, but with `/platform/programme/:id` navigation.

### 4. Sidebar Items → Page Mapping

Assuming DB `menu_items.route_path` entries match these paths:

| Sidebar Label          | Route                             | Target Page / Behaviour                                           |
|------------------------|------------------------------------|-------------------------------------------------------------------|
| **All Programmes**     | `/platform/programme`             | `platform-app/Programme.jsx` (programme list)                     |
| **Programme Dashboard**| `/platform/programme/dashboard`   | New overview dashboard; see below                                 |
| **Programme Projects** | `/platform/programme/projects`    | New page: filterable view of `programme_projects` across programmes |
| **Dependencies**       | `/platform/programme/dependencies`| New page: dependencies across programmes, grouped by programme    |
| **Benefits**           | `/platform/programme/benefits`    | New page: programme‑level benefits, grouped/filtered by programme |
| **Timeline**           | `/platform/programme/timeline`    | New page: selector for programme → shows `ProgrammeTimelineView`  |
| **Reports**            | `/platform/programme/reports`     | New page: programme reports list with filters                     |

#### 4.1 Programme Dashboard (Global)
- **Route:** `/platform/programme/dashboard`
- **Page:** `src/pages/platform-app/ProgrammeDashboardOverview.jsx` (NEW).
- **Behaviour:**
  - Uses `getAllProgrammeRollups(accountId)` to show KPI cards per programme:
    - overall health, progress, benefits realization, risk indicators.
  - Table of programmes with key metrics and link to each `/platform/programme/:id`.

#### 4.2 Programme Projects (Global)
- **Route:** `/platform/programme/projects`
- **Page:** `src/pages/platform-app/ProgrammeProjects.jsx` (NEW).
- **Behaviour:**
  - Top filter: programme selector (using `getProgrammeList()`).
  - When a programme is selected:
    - Calls `getProgrammeProjects(selectedProgrammeId)`.
    - Shows table of assigned projects (code/name/status, priority).
  - Optional quick‑link per row to project detail.

#### 4.3 Programme Dependencies (Global)
- **Route:** `/platform/programme/dependencies`
- **Page:** `src/pages/platform-app/ProgrammeDependencies.jsx` (NEW).
- **Behaviour:**
  - Programme selector + optional filters (status, criticality).
  - When a programme is selected:
    - Uses `getProgrammeDependencies(programmeId)`.
    - Shows `DependencyMapVisualization` + detailed table.

#### 4.4 Programme Benefits (Global)
- **Route:** `/platform/programme/benefits`
- **Page:** `src/pages/platform-app/ProgrammeBenefits.jsx` (NEW).
- **Behaviour:**
  - Programme selector + filters (status, type).
  - Uses `getProgrammeBenefits(programmeId)`.
  - Shows `BenefitsRealizationChart` + list/table of benefits.

#### 4.5 Programme Timeline (Global)
- **Route:** `/platform/programme/timeline`
- **Page:** `src/pages/platform-app/ProgrammeTimeline.jsx` (NEW).
- **Behaviour:**
  - Programme selector.
  - Loads:
    - `getProgramme(programmeId)`
    - `getProgrammeMilestones(programmeId)`
    - `getProgrammeProjects(programmeId)`
  - Renders `ProgrammeTimelineView` with those datasets.

#### 4.6 Programme Reports (Global)
- **Route:** `/platform/programme/reports`
- **Page:** `src/pages/platform-app/ProgrammeReports.jsx` (NEW).
- **Behaviour:**
  - Programme selector + filters (report_type, status).
  - Uses `getProgrammeReports(programmeId)`.
  - Displays table:
    - report type, date, status, generated_by, approved_by, link to underlying report (where applicable).

---

## Implementation Steps

### Phase 1 — Route Wiring (Platform) ✅
- **Step 1.1**: Add new lazy imports in `App.jsx`:
  - `ProgrammeDetailPage` (wrapper using `ProgrammeDetail.jsx` logic).
  - `ProgrammeCreatePage`, `ProgrammeEditPage` (thin wrappers for create/edit).
  - `ProgrammeDashboardOverview`, `ProgrammeProjects`, `ProgrammeDependencies`, `ProgrammeBenefits`, `ProgrammeTimeline`, `ProgrammeReports`.
- **Step 1.2**: Under `/platform` route group, add:
  - `path="programme"` → `Programme` (already).
  - `path="programme/create"` → `ProgrammeCreatePage`.
  - `path="programme/:id"` → `ProgrammeDetailPage`.
  - `path="programme/:id/edit"` → `ProgrammeEditPage`.
  - `path="programme/dashboard"` → `ProgrammeDashboardOverview`.
  - `path="programme/projects"` → `ProgrammeProjects`.
  - `path="programme/dependencies"` → `ProgrammeDependencies`.
  - `path="programme/benefits"` → `ProgrammeBenefits`.
  - `path="programme/timeline"` → `ProgrammeTimeline`.
  - `path="programme/reports"` → `ProgrammeReports`.

### Phase 2 — Programme Detail Tabs ✅
- **Step 2.1**: Update `ProgrammeDetail.jsx` to:
  - Assume `/platform/programme/:id` as base route for navigation.
  - Replace “coming soon...” placeholders with:
    - Projects tab: table using `getProgrammeProjects(id)` (reuse data already fetched in `ProgrammeDashboard` where possible).
    - Dependencies tab: `DependencyMapVisualization` + dependency list.
    - Benefits tab: `BenefitsRealizationChart` + benefits list.
    - Timeline tab: `ProgrammeTimelineView` with `programme`, `milestones`, and `projects`.
    - Reports tab: `getProgrammeReports(id)` list.
- **Step 2.2**: Ensure all tabs are dark/light theme aware and responsive (reuse existing component styling).

### Phase 3 — Global Programme Pages ✅
- **Step 3.1**: Implement `ProgrammeDashboardOverview.jsx`:
  - Fetch `accountId` from context/organisation (reuse pattern from Portfolio/Analytics dashboards).
  - Use `getAllProgrammeRollups(accountId)` for KPI cards + table.
- **Step 3.2**: Implement `ProgrammeProjects.jsx`:
  - Programme dropdown + `getProgrammeProjects`.
  - Table of projects with key fields and link to `/platform/projects/:id`.
- **Step 3.3**: Implement `ProgrammeDependencies.jsx`:
  - Programme dropdown + filters.
  - `DependencyMapVisualization` + detail table.
- **Step 3.4**: Implement `ProgrammeBenefits.jsx`:
  - Programme dropdown + `BenefitsRealizationChart` + table.
- **Step 3.5**: Implement `ProgrammeTimeline.jsx`:
  - Programme dropdown + `ProgrammeTimelineView`.
- **Step 3.6**: Implement `ProgrammeReports.jsx`:
  - Programme dropdown + filters + report table.

### Phase 4 — Create/Edit Pages ✅
- **Step 4.1**: Create `ProgrammeCreatePage.jsx`:
  - Wraps `ProgrammeForm` in create mode; on save → `/platform/programme/:id`.
- **Step 4.2**: Adapt `ProgrammeEdit.jsx` into `ProgrammeEditPage`:
  - Update navigation to `/platform/programme/:id`.
  - Ensure it uses `saveProgramme` and reloads detail on success.

### Phase 5 — Simulator Parity (Deferred)
- **Step 5.1**: After Platform module is stable, mirror applicable views under `/simulator` using `simDb` and `sim` schema tables (new plan to be created then).

---

## Testing Plan

### Functional Tests
- **All Programmes**
  - Verify `/platform/programme` loads, search works, cards navigate to `/platform/programme/:id`.
  - “Create Programme” opens create page and successfully creates a record.
- **Single Programme**
  - Dashboard tab shows metrics and charts without errors.
  - Projects tab lists correct projects and links to project details.
  - Dependencies tab shows dependency stats and list.
  - Benefits tab reflects correct counts and value realization.
  - Timeline tab renders without crashes (handles missing dates gracefully).
  - Reports tab lists reports with correct filters.
- **Global Pages**
  - Each global page loads with a programme dropdown and reacts correctly when a programme is selected.
  - No console errors or 403/404s from app code.

### Performance & UX
- Ensure pages load in under ~1s for typical data volumes.
- Validate responsiveness (desktop + small screens) and dark theme defaults.

### Regression
- Confirm existing Portfolio / Programme assignment flows for projects still work (no changes to junction services).
- Confirm Simulator routes remain untouched.

---

## TODO Checklist

- [x] Wire Platform routes for all Programme pages under `/platform/programme/*` in `App.jsx`.
- [x] Implement `ProgrammeDetail` route and replace placeholder tabs with real content using existing components and services.
- [x] Create Platform pages for Programme Dashboard / Projects / Dependencies / Benefits / Timeline / Reports with programme selector + views.
- [x] Implement create/edit wrappers for programmes at `/platform/programme/create` and `/platform/programme/:id/edit`.
- [ ] Manually test all Programme sidebar items end‑to‑end (including navigation from list to detail and back).
- [x] Document the new Programme module behaviour in `Pages_Optimization_Summary.md` or a dedicated Programme user guide in `Documentation/` (see `Documentation/Programme_Module_User_Guide.md`).

