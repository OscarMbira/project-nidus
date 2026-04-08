# v221 – PMO Project Oversight – Full CRUD Implementation Plan
**Branch:** feature/platform-terminology
**Date:** 2026-03-12
**Goal:** Fully implement CRUD operations for all 4 items under Project Oversight:
Risk Register · Issue Register · Quality Register · Lessons Log — for both Platform and Simulator.

---

## Root Cause: Why All 4 Pages Are Currently Broken

All 4 PMO Oversight pages share the same fatal architectural flaw:

```
PMOOversightRiskRegister.jsx   → wraps <RiskRegisterView />
PMOOversightIssueRegister.jsx  → wraps <IssueRegisterView />
PMOOversightQualityRegister.jsx → wraps <QualityRegister />
PMOOversightLessonsLog.jsx     → wraps <LessonsLogView />
```

Each underlying view component reads `const { projectId } = useParams()`.
The PMO Oversight routes are `/pmo/oversight/risk-register` etc. — **no `:projectId` param**.
→ `projectId` is always `undefined` → `if (projectId) { fetch() }` never runs → **blank page every time**.

Additionally, all pages say *"read-only oversight"* — the user wants **full CRUD**.

The Simulator oversight pages have the **identical problem**:
```
SimulatorPMOOversightRiskRegister.jsx   → wraps <PracticeRiskRegister />   (needs projectId)
SimulatorPMOOversightIssueRegister.jsx  → wraps <PracticeIssueRegister />  (needs projectId)
SimulatorPMOOversightQualityRegister.jsx → wraps <PracticeQualityRegister /> (needs projectId)
SimulatorPMOOversightLessonsLog.jsx     → wraps <PracticeLessonsLog />     (needs projectId)
```

---

## Solution Architecture

Rebuild all 8 pages (4 Platform + 4 Simulator) as **proper standalone pages** with:

```
┌─────────────────────────────────────────────────────────────┐
│  PMO Oversight Header                                       │
│  ├── Page title + icon                                      │
│  ├── Cross-project selector:                                │
│  │     [ All Projects ▾ ] or [ Select a project... ▾ ]     │
│  └── Summary stats row: Total | Open | High-Priority | etc.│
├─────────────────────────────────────────────────────────────┤
│  Action Bar                                                 │
│  ├── [+ Create New] button  (PMO has full write access)     │
│  ├── Filters (status, priority, type, date range, search)  │
│  └── [Export ▾] dropdown (Excel/Word/PPT/CSV/XML/JSON/Print)│
├─────────────────────────────────────────────────────────────┤
│  Data Table (full CRUD)                                     │
│  ├── All records for selected project (or all projects)     │
│  ├── Project column when "All Projects" selected            │
│  ├── Per-row actions: View | Edit | Delete                  │
│  └── Pagination                                             │
├─────────────────────────────────────────────────────────────┤
│  Modal: Create/Edit form (reuses existing form components)  │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Decisions
1. **Project selector state** lives inside each oversight page (not from `useParams`)
2. **"All Projects" mode** — fetches data without project_id filter; adds Project column to table
3. **Full CRUD** — PMO Admin can Create, Read, Update, Delete any record across all projects
4. **Reuse existing form components** — `EnhancedRiskForm`, `IssueForm`, `LessonForm`, `QualityRegisterForm`, `QualityReviewForm`, `QualityInspectionForm`
5. **Reuse existing services** — all services already support `project_id` as an optional filter
6. **Export** — reuse `ExportListMenu` component (already used in QualityRegister)
7. **On-hold / draft queue** — each page links to its on-hold queue
8. **Success confirmation** — toast notification after create/update/delete

---

## Shared Component to Create

### `src/components/pmo/PMOOversightHeader.jsx`
Shared header component for all 4 pages:
- Props: `title`, `description`, `icon`, `stats[]`, `projectId`, `projects[]`, `onProjectChange`
- Renders: Page title, project selector dropdown, summary stat cards
- "All Projects" is always the default option

---

## Feature-by-Feature CRUD Specification

### 1. Risk Register (`/pmo/oversight/risk-register`)

**Data source:** `src/services/riskService.js` → `getRisksByProject(projectId, filters)`
**Form component:** `src/components/risks/EnhancedRiskForm.jsx`

**Create:**
- "Add Risk" button → opens `EnhancedRiskForm` modal
- PMO selects which project the risk belongs to (project selector within form if "All Projects" mode)
- Required fields: risk_title, risk_type, risk_category, risk_status, likelihood, impact
- Auto-generates risk_identifier

**Read (List view):**
- Columns: Risk ID | Title | Type | Category | Status | Level | Likelihood | Impact | Proximity | Owner | Project (if All Projects)
- Filters: status, risk_level, risk_type, risk_category, proximity, search
- View modes: List | Risk Matrix (2×2 heat map) | Analytics

**Update:**
- Edit button → opens `EnhancedRiskForm` pre-filled
- PMO can update all fields including status (open/closed/escalated)
- PMO-specific action: Escalate to Issue (calls `escalateRiskToIssue()`)

**Delete:**
- Delete button → confirmation modal → soft delete (`is_deleted = true`)
- Confirmation shows: Risk ID, Title, Project

**Summary stats (header cards):**
- Total Risks | Open | High/Critical | Closed | Escalated to Issue

---

### 2. Issue Register (`/pmo/oversight/issue-register`)

**Data source:** `src/services/issueService.js` → `getIssues(registerId, filters)` per project OR direct project query
**Form component:** `src/components/IssueForm.jsx`

**Create:**
- "Add Issue" button → opens `IssueForm` modal
- Issue type selector: RFC (Request for Change) | Off-Specification | Problem/Concern
- Required fields: issue_title, issue_type, priority, severity, issue_description
- Auto-generates issue_identifier

**Read (List view):**
- Tabs: All | RFC | Off-Specification | Problem/Concern
- Columns: Issue ID | Title | Type | Status | Priority | Severity | Raised Date | Owner | Project (if All Projects)
- Filters: status, priority, severity, issue_type, search
- View modes: List | Analytics (charts)

**Update:**
- Edit button → opens `IssueForm` pre-filled
- PMO can update status (open/in_progress/closed/deferred), priority, resolution

**Delete:**
- Delete button → confirmation modal → soft delete

**Summary stats (header cards):**
- Total Issues | Open | RFCs | Off-Specs | Problems | Overdue

---

### 3. Quality Register (`/pmo/oversight/quality-register`)

**Data source:** `src/services/qualityManagementService.js`
**Form components:** `src/components/quality/QualityRegisterForm.jsx`, `QualityReviewForm.jsx`, `QualityInspectionForm.jsx`

**Create:**
- "Add Quality Item" button → opens `QualityRegisterForm` modal
- Required fields: product_name, product_type, quality_method, quality_criteria, acceptance_criteria
- Optionally attach quality reviews/inspections

**Read (List view):**
- Tabs: Register | Reviews | Inspections
- Register columns: Product Name | Type | Method | Status | Score | Sign-off | Project (if All)
- Reviews columns: Title | Type | Planned Date | Status | Score | Project (if All)
- Inspections columns: Title | Inspection Date | Inspector | Result | Defects | Project (if All)
- Filters: quality_status, product_type, quality_method, sign_off_status, search

**Update:**
- Edit button → opens appropriate form pre-filled
- PMO can change quality_status (pending/in-review/passed/failed/conditional/approved)
- PMO can approve sign-off

**Delete:**
- Delete button → confirmation modal → soft delete per tab (register item / review / inspection)

**Summary stats (header cards):**
- Total Products | Passed | Failed | In Review | Pending Sign-off

---

### 4. Lessons Log (`/pmo/oversight/lessons-log`)

**Data source:** `src/services/lessonService.js` → `getLessonsByProject(projectId, filters)`
**Form component:** `src/components/lessonsLog/LessonForm.jsx`

**Create:**
- "Add Lesson" button → opens `LessonForm` modal
- Required fields: lesson_title, lesson_category, effect_type, description
- PMO-specific toggle: "Mark as Corporate Lesson" (promotes to org-wide lessons library)

**Read (List view):**
- Tabs: All Lessons | Positive | Negative | Corporate Lessons
- Columns: Reference | Title | Category | Effect | Status | Scope | Priority | Project (if All)
- Filters: lesson_category, effect_type, status, lesson_scope, priority, is_corporate_lesson, search

**Update:**
- Edit button → opens `LessonForm` pre-filled
- PMO can update all fields
- PMO-specific action: Promote to corporate lesson (sets `is_corporate_lesson = true`)

**Delete:**
- Delete button → confirmation modal → soft delete

**Summary stats (header cards):**
- Total Lessons | Positive | Negative | Corporate | Open | Implemented

---

## Simulator Parity

All 4 Platform pages have exact Simulator equivalents:

| Platform | Simulator |
|---------|-----------|
| `PMOOversightRiskRegister.jsx` | `SimulatorPMOOversightRiskRegister.jsx` |
| `PMOOversightIssueRegister.jsx` | `SimulatorPMOOversightIssueRegister.jsx` |
| `PMOOversightQualityRegister.jsx` | `SimulatorPMOOversightQualityRegister.jsx` |
| `PMOOversightLessonsLog.jsx` | `SimulatorPMOOversightLessonsLog.jsx` |

Simulator pages:
- Use `simDb` / `sim` schema services (practiceRiskService, practiceIssueService, etc.)
- Use `PracticeDocumentGovernanceProvider`
- Fetch `sim.practice_projects` for the project selector
- Reuse sim-specific form components where they exist, otherwise use shared forms

---

## Files to Create / Modify

### New Shared Component
- `src/components/pmo/PMOOversightHeader.jsx` — reusable header with project selector + stats

### Platform Pages (rebuild – replace current thin wrappers)
- `src/pages/pmo/PMOOversightRiskRegister.jsx`
- `src/pages/pmo/PMOOversightIssueRegister.jsx`
- `src/pages/pmo/PMOOversightQualityRegister.jsx`
- `src/pages/pmo/PMOOversightLessonsLog.jsx`

### Simulator Pages (rebuild – replace current thin wrappers)
- `src/pages/simulator/pmo/SimulatorPMOOversightRiskRegister.jsx`
- `src/pages/simulator/pmo/SimulatorPMOOversightIssueRegister.jsx`
- `src/pages/simulator/pmo/SimulatorPMOOversightQualityRegister.jsx`
- `src/pages/simulator/pmo/SimulatorPMOOversightLessonsLog.jsx`

### No Route or Menu Changes Needed
All routes and menu entries already exist and are correctly wired — only the page content changes.

---

## Todo Items

### Phase 1 – Shared Infrastructure
- [x] 1. Create `src/components/pmo/PMOOversightHeader.jsx` — project selector dropdown + summary stat cards component

### Phase 2 – Platform: Risk Register
- [x] 2. Rebuild `PMOOversightRiskRegister.jsx`:
  - Project selector (All Projects / specific project)
  - Cross-project data fetch via `getRisksByProject`
  - Summary stats: Total, Open, High/Critical, Closed
  - Full list with Edit / Delete per row
  - Reuse `EnhancedRiskForm` for Create / Edit
  - Export via `ExportListMenu`
  - Delete confirmation (browser confirm)

### Phase 3 – Platform: Issue Register
- [x] 3. Rebuild `PMOOversightIssueRegister.jsx`:
  - Project selector
  - Cross-project issue fetch via `getIssues` (register per project)
  - Tabs: All | RFC | Off-Spec | Problem
  - Summary stats: Total, Open, RFCs, Off-Specs, Problems
  - Full list with Edit / Delete per row
  - Reuse `IssueForm` for Create / Edit
  - Export via `ExportListMenu`
  - Delete confirmation (browser confirm)

### Phase 4 – Platform: Quality Register
- [x] 4. Rebuild `PMOOversightQualityRegister.jsx`:
  - Project selector
  - Tabs: Register | Reviews | Inspections
  - Data fetch via `getQualityRegister`, `getQualityReviews`, `getQualityInspections`
  - Summary stats: Total Products, Passed, Failed, In Review
  - Full list with Edit / Delete per tab
  - Reuse `QualityRegisterForm`, `QualityReviewForm`, `QualityInspectionForm` for Create / Edit
  - Export via `ExportListMenu`
  - Delete confirmation (browser confirm)

### Phase 5 – Platform: Lessons Log
- [x] 5. Rebuild `PMOOversightLessonsLog.jsx`:
  - Project selector
  - Cross-project lesson fetch via `getLessonsByProject`
  - Tabs: All | Positive | Negative | Corporate
  - Summary stats: Total, Positive, Negative, Corporate, Implemented
  - Full list with Edit / Delete per row
  - Reuse `LessonForm` for Create / Edit
  - Export via `ExportListMenu`
  - Delete confirmation (browser confirm)

### Phase 6 – Simulator: All 4 Pages
- [x] 6. Rebuild `SimulatorPMOOversightRiskRegister.jsx` (mirrors Phase 2, uses sim services + getMyPracticeProjects)
- [x] 7. Rebuild `SimulatorPMOOversightIssueRegister.jsx` (mirrors Phase 3, uses sim services)
- [x] 8. Rebuild `SimulatorPMOOversightQualityRegister.jsx` (mirrors Phase 4, uses sim services)
- [x] 9. Rebuild `SimulatorPMOOversightLessonsLog.jsx` (mirrors Phase 5, uses sim services; lesson entries with View/Edit navigation)

---

## Common Page Pattern (each of the 8 pages follows this)

```jsx
export default function PMOOversightXxxXxx() {
  const [projects, setProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState('')  // '' = All Projects
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState(null)   // for edit
  const [deleting, setDeleting] = useState(null)
  const [filters, setFilters] = useState({ search: '', status: '', ... })

  // Fetch all org projects for selector
  useEffect(() => { fetchProjects() }, [])

  // Fetch data when project or filters change
  useEffect(() => { fetchItems() }, [selectedProjectId, filters])

  const fetchItems = async () => {
    const data = await xxxService.getXxx(
      selectedProjectId || undefined,  // undefined = all projects
      filters
    )
    setItems(data)
  }

  const handleDelete = async (item) => {
    if (!confirm(`Delete ${item.title}?`)) return
    await xxxService.deleteXxx(item.id)
    toast.success(`Deleted successfully`)
    fetchItems()
  }

  return (
    <>
      <PMOOversightHeader
        title="Risk Register"
        projects={projects}
        selectedProjectId={selectedProjectId}
        onProjectChange={setSelectedProjectId}
        stats={[ { label: 'Total', value: items.length }, ... ]}
      />
      <ActionBar onCreate={() => setShowForm(true)} filters={...} export={...} />
      <DataTable items={items} onEdit={setSelected} onDelete={handleDelete} />
      {showForm && <XxxForm item={selected} onSave={fetchItems} onCancel={...} />}
    </>
  )
}
```

---

## Review

**Implementation completed (2026-03-12).**

### Summary of changes

1. **Shared component**
   - **`src/components/pmo/PMOOversightHeader.jsx`** — New reusable header with props: `title`, `description`, `icon`, `stats[]`, `projectId`, `projects[]`, `onProjectChange`. Renders page title, project selector (All Projects + list), and stat cards. Theme-aware (dark/light).

2. **Platform pages (4)**
   - **`PMOOversightRiskRegister.jsx`** — Project selector (All / specific via `getAllProjects`). Fetches risks with `getRisksByProject` (single project or all by iterating projects). Stats: Total, Open, High/Critical, Closed. Table with Risk ID, Title, Type, Category, Status, Level, Project (when All), Edit/Delete. Add Risk opens `EnhancedRiskForm` (requires project selected). Export via `ExportListMenu`. Toast on delete.
   - **`PMOOversightIssueRegister.jsx`** — Project selector; fetches issue registers per project then `getIssues(registerId)`. Tabs: All, RFC, Off-Spec, Problem. Stats: Total, Open, RFCs, Off-Specs, Problems. Table with Edit/Delete; Create via `IssueForm`. Export and delete confirmation.
   - **`PMOOversightQualityRegister.jsx`** — Project selector; tabs Register | Reviews | Inspections. Fetches via `getQualityRegister`, `getQualityReviews`, `getQualityInspections` (optional `project_id` in filters). Stats: Total Products, Passed, Failed, In Review. Per-tab table with Edit/Delete; Create/Edit via `QualityRegisterForm`, `QualityReviewForm`, `QualityInspectionForm`. Export and delete confirmation.
   - **`PMOOversightLessonsLog.jsx`** — Project selector; cross-project `getLessonsByProject`. Tabs: All, Positive, Negative, Corporate. Stats: Total, Positive, Negative, Corporate, Implemented. Table with Edit/Delete; Create via `LessonForm`. Export and delete confirmation.

3. **Simulator pages (4)**
   - **`SimulatorPMOOversightRiskRegister.jsx`** — Loads practice projects via `getMyPracticeProjects(simUserId)` (sim user from `simDb.auth.getUser` + `users` table). Same layout as platform: project selector, stats, table with View/Edit (navigate to `practice-risk-register/:id`), Delete. Add navigates to `practice-risk-register/create?projectId=`.
   - **`SimulatorPMOOversightIssueRegister.jsx`** — Same pattern; `getPracticeIssues`, `deletePracticeIssue`; Edit navigates to `practice-issue-register/:id`; Add to `practice-issue-register/create?projectId=`.
   - **`SimulatorPMOOversightQualityRegister.jsx`** — Tabs Register | Reviews | Inspections; `getPracticeQualityRegister`, `getPracticeQualityReviews`, `getPracticeQualityInspections`; when All Projects, aggregates by project and adds project_name. Delete per tab; Add navigates to register/create or reviews/inspections pages with projectId.
   - **`SimulatorPMOOversightLessonsLog.jsx`** — Aggregates lesson entries from all projects (get log per project, then `getPracticeLessonEntries(logId)`). Table with View/Edit (navigate to `practice-lessons-log/:logId/entry/:entryId`). Add navigates to log entry create when project selected. No delete on entries (sim service has no delete entry API).

### Notes

- Platform uses `getAllProjects()` from `pmoAdminService`; Simulator uses `getMyPracticeProjects(simUserId)` with sim user id from `simDb.auth.getUser()` + `users` select.
- Delete confirmation uses `window.confirm`; can be replaced later with a modal.
- Escalate-to-Issue (Risk) and Promote to Corporate (Lessons) were not added on this pass; can be added as follow-up actions.
- Routes and menu entries unchanged; only page content was rebuilt.
