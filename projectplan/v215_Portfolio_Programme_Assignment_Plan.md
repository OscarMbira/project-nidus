# v215 — Portfolio & Programme Assignment Tabs on Project Create/Edit

## Objective
Add two new tabs to the **Create New Project** (and Edit Project) form's existing tab bar:
1. **Portfolio** tab — optional assignment of the project to an existing portfolio (by code + name)
2. **Programme** tab — optional assignment of the project to an existing programme (by code + name)

Both tabs slot into the circled tab-bar area shown in `Developer Images/PMO Project Fields v1.png`, after the existing 5 tabs.

---

## Current State

### Tab bar (5 tabs today)
| # | Tab ID | Label |
|---|--------|-------|
| 1 | `details` | Project Details |
| 2 | `governance` | Governance & Justification |
| 3 | `delivery` | Delivery |
| 4 | `financial` | Financial |
| 5 | `assessment` | Risk & Documentation |

### Existing services & junction tables
- `portfolioService.js` → `portfolio_projects` junction table — `addProjectToPortfolio`, `removeProjectFromPortfolio`
- `programmeService.js` → `programme_projects` junction table — `addProjectToProgramme`, `removeProjectFromProgramme`
- Both tables already exist; **no new SQL migrations required**

---

## New Tabs (to be appended)

| # | Tab ID | Label | Description |
|---|--------|-------|-------------|
| 6 | `portfolio` | Portfolio | Link to portfolio |
| 7 | `programme` | Programme | Link to programme |

---

## Fields Per Tab

### Tab 6 — Portfolio Assignment
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Portfolio | Searchable dropdown | Optional | Shows `[portfolio_code] — portfolio_name` |
| Portfolio Code | Read-only text | — | Auto-fills from selection |
| Portfolio Name | Read-only text | — | Auto-fills from selection |
| Clear button | Action | — | Removes the current assignment |

UX: If no portfolio is selected, the tab shows a friendly "This project is not assigned to a portfolio" message with the selector below it.

### Tab 7 — Programme Assignment
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Programme | Searchable dropdown | Optional | Shows `[programme_code] — programme_name` |
| Programme Code | Read-only text | — | Auto-fills from selection |
| Programme Name | Read-only text | — | Auto-fills from selection |
| Clear button | Action | — | Removes the current assignment |

UX: Same pattern as portfolio tab.

---

## Data Flow

### On Project Create
1. User fills Portfolio / Programme tabs (optional)
2. On final submit: project row is saved first
3. After project is created:
   - If `portfolioId` selected → call `addProjectToPortfolio(portfolioId, newProjectId)`
   - If `programmeId` selected → call `addProjectToProgramme(programmeId, newProjectId)`
4. Success confirmation shows portfolio/programme linkage details

### On Project Edit (ProjectsDetail.jsx)
1. On load: query `portfolio_projects` and `programme_projects` to pre-populate the dropdowns
2. On save: compare old vs new selection
   - If changed → remove old link then add new link
   - If cleared → remove old link only
   - If unchanged → no-op

### Draft Queue
- `portfolio_id` and `programme_id` are added to the draft state object so hold/resume works correctly

---

## Files to Create

| File | Action |
|------|--------|
| `src/components/project/PortfolioAssignmentSection.jsx` | NEW — Portfolio tab content |
| `src/components/project/ProgrammeAssignmentSection.jsx` | NEW — Programme tab content |

## Files to Modify

| File | Change |
|------|--------|
| `src/components/project/ProjectFormTabs.jsx` | Add 2 new tab entries + completion indicator logic |
| `src/pages/ProjectsCreate.jsx` | Add state, tab rendering, and post-save linkage logic |
| `src/pages/ProjectsDetail.jsx` | Add pre-load, tab rendering, and save linkage logic |
| `src/services/portfolioService.js` | Add `getPortfolioList()` and `getProjectPortfolio()` |
| `src/services/programmeService.js` | Add `getProgrammeList()` and `getProjectProgramme()` |

## No SQL migrations required
- `portfolio_projects` and `programme_projects` junction tables already exist with correct columns.

---

## Simulator Applicability (Rule 34)
- The Simulator system has `v239_sim_portfolio_programme.sql` — sim portfolio/programme tables exist.
- The same 2 tabs should be added to the Simulator project create/edit form using the `simDb` client and `sim` schema tables.
- Simulator files to modify (after Platform is complete):
  - Sim equivalent of project create/edit form (if it exists)
  - Add `getSimPortfolioList()` / `getSimProgrammeList()` to sim services

---

## Todo List

### Phase 1 — Service Helpers
- [x] 1.1 Add `getPortfolioList()` to `portfolioService.js` — lightweight list (id, code, name)
- [x] 1.2 Add `getProjectPortfolio(projectId)` to `portfolioService.js` — find current assignment
- [x] 1.3 Add `getProgrammeList()` to `programmeService.js` — lightweight list (id, code, name)
- [x] 1.4 Add `getProjectProgramme(projectId)` to `programmeService.js` — find current assignment

### Phase 2 — New Section Components
- [x] 2.1 Create `PortfolioAssignmentSection.jsx` — searchable dropdown, read-only code/name, clear button, dark/light theme aware
- [x] 2.2 Create `ProgrammeAssignmentSection.jsx` — same pattern for programme

### Phase 3 — Tab Bar Update
- [x] 3.1 Add `portfolio` and `programme` tab entries to `ProjectFormTabs.jsx`
- [x] 3.2 Add `isTabStarted` logic for both new tabs (check if portfolio_id / programme_id is set)

### Phase 4 — ProjectsCreate Integration
- [x] 4.1 Add `selectedPortfolioId`, `selectedProgrammeId` (and detail) state
- [x] 4.2 Import and render `PortfolioAssignmentSection` and `ProgrammeAssignmentSection` in the tab switch
- [x] 4.3 After project save: call `addProjectToPortfolio` and/or `addProjectToProgramme` if selected
- [x] 4.4 Both IDs included in `tabCompletionData` so tab indicators light up

### Phase 5 — ProjectsDetail (Edit) Integration
- [x] 5.1 On load: `getProjectPortfolio` and `getProjectProgramme` run in parallel inside `fetchProject`
- [x] 5.2 Two inline cards rendered below project info — Portfolio and Programme
- [x] 5.3 Each card has Edit / Save / Cancel — diff old vs new → calls remove then add
- [x] 5.4 Success toast shown for 3 seconds after save

### Phase 6 — Simulator Parity
- [ ] 6.1 Pending — no sim project create/edit form found that uses the same tab pattern; to be reviewed in a separate plan if applicable

---

## Review

### Summary of Changes (completed 2026-03-09)

**Service layer** — 4 new helper functions added (no schema changes required):
- `portfolioService.js`: `getPortfolioList()`, `getProjectPortfolio(projectId)`
- `programmeService.js`: `getProgrammeList()`, `getProjectProgramme(projectId)`

**New components** (2 files):
- `src/components/project/PortfolioAssignmentSection.jsx` — dark/light theme aware, searchable inline dropdown, read-only code+name display, clear button
- `src/components/project/ProgrammeAssignmentSection.jsx` — same pattern, purple colour theme

**ProjectFormTabs.jsx** — 2 new tabs appended: `portfolio` (Tab 6) and `programme` (Tab 7), with `isTabStarted` dot indicators

**ProjectsCreate.jsx** — portfolio/programme state + post-save linkage to `portfolio_projects` / `programme_projects` junction tables; both IDs in `tabCompletionData`

**ProjectsDetail.jsx** — Portfolio and Programme inline cards with Edit/Save/Cancel; assignments loaded in parallel with QMS/RMS; success toast on save

**No new SQL migrations** — existing `portfolio_projects` and `programme_projects` junction tables used throughout.
