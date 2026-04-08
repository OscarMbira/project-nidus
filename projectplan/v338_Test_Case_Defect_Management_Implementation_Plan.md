# v338 — Test Case Management & Defect Tracking Module
## Implementation Plan

**Date:** 2026-03-27
**Branch:** feature/test-case-defect-management
**SQL Start Version:** v338
**Scope:** Platform + Simulator (full parity)

---

## 1. Executive Summary

This plan introduces a **fully-integrated Test Case Management and Defect Tracking module** into Project Nidus (Platform and Simulator). It enables project teams—across all roles (PMO Admin, PMO, PM, Team Member, Viewer)—to:

- Create and organise **Test Suites** and **Test Cases/Scripts**
- Execute test runs and record pass/fail results
- **Automatically generate a Defect** when a test case is marked as Failed, and immediately open the defect form pre-populated with context
- Attach **screenshots and comments** to defects
- Import test cases in bulk via **CSV, Excel, JSON, or XML**
- View **dashboards and trend reports** for testing and defects
- **Export** lists and individual records to Excel, Word, PowerPoint, CSV, XML, JSON, and Print

The module is surfaced as a **dedicated "Testing & QA" section** in the sidebar, visible to all authenticated roles.

---

## 2. Architecture Overview

### 2.1 Design Principles

| Principle | Decision |
|---|---|
| Domain isolation | Platform uses `public` schema + `platformDb`; Simulator uses `sim` schema + `simDb` |
| Auto-defect | PostgreSQL trigger on `test_case_executions` fires when `status = 'failed'` |
| File storage | Supabase Storage bucket `defect-attachments` (Platform) + `sim-defect-attachments` (Simulator) |
| Bulk import | Client-side parsing: PapaParse (CSV), SheetJS/XLSX (Excel), native JSON.parse(), DOMParser (XML) |
| Export | Reuse existing export utility (`exportService.js` / `reportBuilderService.js`) |
| Role access | All authenticated roles get read access; write access for PM+ roles; PMO Admin has full admin |
| PWA-ready | All components mobile-responsive, dark-mode first |

### 2.2 Module Diagram

```
Testing & QA Module
├── Test Management
│   ├── Test Suites (grouped sets of test cases)
│   ├── Test Cases / Scripts (individual test items with steps)
│   ├── Test Runs (execution sessions tied to a suite)
│   └── Test Execution Runner (mark each case pass/fail/blocked/skipped)
│
└── Defect Tracking
    ├── Defects (auto-created on failure OR manually raised)
    ├── Defect Detail (comments, attachments/screenshots, history)
    └── Defect Dashboard (metrics, trends, resolution SLA)
```

### 2.3 Auto-Defect Creation Flow

```
User marks Test Case Execution → status = 'failed'
    ↓
PostgreSQL trigger fires → INSERT INTO defects (pre-populated from test case data)
    ↓
Supabase returns new defect_id
    ↓
Frontend detects failed status → auto-navigates to DefectDetail page
    ↓
Defect form opens (pre-populated: title, test case ref, environment, description)
    ↓
User adds: severity, priority, screenshots, steps to reproduce, assignee
    ↓
Defect saved → linked back to test case execution record
```

### 2.4 Bulk Import Flow

```
User selects file (CSV / Excel / JSON / XML)
    ↓
Client-side parser validates and previews records (mapping step)
    ↓
User confirms or corrects field mappings
    ↓
Validated records submitted in batches of 50 via batchCreateTestCases()
    ↓
Results summary: X created, Y failed (with row-level error detail)
```

---

## 3. Database Schema (Platform — public schema)

### 3.1 Core Tables

#### `test_suites`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| project_id | uuid FK → projects | |
| name | varchar(255) | Required |
| description | text | |
| suite_type | varchar(50) | functional / regression / smoke / uat / performance / security / integration |
| status | varchar(50) | draft / active / archived |
| version | varchar(50) | e.g. v1.0 |
| created_by | uuid FK → users | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `test_cases`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| suite_id | uuid FK → test_suites | nullable (can exist without suite) |
| project_id | uuid FK → projects | |
| test_case_ref | varchar(50) | Auto-generated: TC-YYYYMMDD-NNNN |
| title | varchar(500) | Required |
| description | text | |
| preconditions | text | |
| test_type | varchar(50) | manual / automated |
| priority | varchar(50) | critical / high / medium / low |
| status | varchar(50) | draft / active / deprecated |
| expected_result | text | |
| tags | jsonb | Array of strings |
| estimated_duration | integer | Minutes |
| created_by | uuid FK → users | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `test_case_steps`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| test_case_id | uuid FK → test_cases | |
| step_number | integer | Ordered |
| action | text | What the tester does |
| expected_result | text | What should happen |
| created_at | timestamptz | |

#### `test_runs`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| project_id | uuid FK → projects | |
| suite_id | uuid FK → test_suites | nullable |
| run_name | varchar(255) | |
| environment | varchar(100) | dev / staging / uat / production / other |
| run_date | date | |
| status | varchar(50) | planned / in_progress / completed / cancelled / aborted |
| started_at | timestamptz | |
| completed_at | timestamptz | |
| run_by | uuid FK → users | |
| summary | jsonb | {total, passed, failed, blocked, skipped} auto-updated by trigger |
| notes | text | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `test_case_executions`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| run_id | uuid FK → test_runs | |
| test_case_id | uuid FK → test_cases | |
| project_id | uuid FK → projects | |
| status | varchar(50) | pending / passed / failed / blocked / skipped |
| actual_result | text | |
| notes | text | |
| executed_by | uuid FK → users | |
| executed_at | timestamptz | |
| defect_id | uuid FK → defects | NULL until auto-created |
| duration_minutes | integer | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `defects`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| project_id | uuid FK → projects | |
| defect_ref | varchar(50) | Auto-generated: DEF-YYYYMMDD-NNNN |
| test_case_id | uuid FK → test_cases | nullable (for manually raised defects) |
| execution_id | uuid FK → test_case_executions | nullable |
| title | varchar(500) | Required |
| description | text | |
| severity | varchar(50) | critical / high / medium / low / trivial |
| priority | varchar(50) | critical / high / medium / low |
| status | varchar(50) | new / open / in_progress / resolved / closed / reopened / deferred |
| environment | varchar(100) | |
| steps_to_reproduce | text | |
| expected_behavior | text | |
| actual_behavior | text | |
| browser_os | varchar(255) | |
| assigned_to | uuid FK → users | |
| reported_by | uuid FK → users | |
| resolved_by | uuid FK → users | |
| resolution | text | |
| resolution_type | varchar(50) | fixed / wont_fix / duplicate / cannot_reproduce / by_design / deferred |
| resolved_at | timestamptz | |
| due_date | date | |
| reopen_count | integer | default 0 |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `defect_comments`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| defect_id | uuid FK → defects | |
| comment | text | Required |
| is_internal | boolean | default false |
| created_by | uuid FK → users | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `defect_attachments`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| defect_id | uuid FK → defects | |
| file_name | varchar(500) | |
| file_url | text | Supabase Storage URL |
| file_path | text | Storage path |
| file_type | varchar(100) | MIME type |
| file_size | bigint | Bytes |
| is_screenshot | boolean | default false |
| uploaded_by | uuid FK → users | |
| created_at | timestamptz | |

#### `defect_history`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| defect_id | uuid FK → defects | |
| field_changed | varchar(100) | |
| old_value | text | |
| new_value | text | |
| changed_by | uuid FK → users | |
| changed_at | timestamptz | |

### 3.2 Database Triggers

**Trigger 1: Auto-Defect Creation**
```sql
-- Fires AFTER UPDATE on test_case_executions
-- When NEW.status = 'failed' AND OLD.status != 'failed'
-- Inserts a new defect record and sets defect_id back on the execution row
CREATE TRIGGER trg_auto_create_defect
  AFTER UPDATE OF status ON test_case_executions
  FOR EACH ROW
  WHEN (NEW.status = 'failed' AND OLD.status IS DISTINCT FROM 'failed')
  EXECUTE FUNCTION fn_auto_create_defect_on_failure();
```

**Trigger 2: Update test_runs summary**
```sql
-- Fires AFTER INSERT/UPDATE on test_case_executions
-- Recalculates and updates test_runs.summary jsonb
CREATE TRIGGER trg_update_run_summary
  AFTER INSERT OR UPDATE OF status ON test_case_executions
  FOR EACH ROW
  EXECUTE FUNCTION fn_update_test_run_summary();
```

**Trigger 3: Defect history audit**
```sql
-- Fires AFTER UPDATE on defects
-- Logs field-level changes into defect_history
CREATE TRIGGER trg_defect_audit
  AFTER UPDATE ON defects
  FOR EACH ROW
  EXECUTE FUNCTION fn_log_defect_history();
```

---

## 4. SQL Files Plan (v338–v352)

| File | Purpose |
|---|---|
| `v338_test_management_core_tables.sql` | test_suites, test_cases, test_case_steps |
| `v339_test_runs_tables.sql` | test_runs, test_case_executions |
| `v340_defect_management_tables.sql` | defects, defect_comments, defect_attachments, defect_history |
| `v341_test_management_rls_policies.sql` | RLS for test_suites, test_cases, test_case_steps |
| `v342_test_runs_rls_policies.sql` | RLS for test_runs, test_case_executions |
| `v343_defect_management_rls_policies.sql` | RLS for all defect tables |
| `v344_test_management_triggers.sql` | All 3 triggers + trigger functions |
| `v345_defect_storage_setup.sql` | Supabase Storage bucket + policies |
| `v346_test_management_sidebar_menu.sql` | Sidebar entries for all roles |
| `v347_sim_test_management_tables.sql` | Simulator: test_suites, test_cases, steps |
| `v348_sim_test_runs_tables.sql` | Simulator: test_runs, executions |
| `v349_sim_defect_management_tables.sql` | Simulator: defects, comments, attachments, history |
| `v350_sim_test_management_rls.sql` | Simulator RLS for all test tables |
| `v351_sim_defect_management_rls.sql` | Simulator RLS for defect tables |
| `v352_sim_test_management_triggers.sql` | Simulator triggers (same logic, sim schema) |

---

## 5. Frontend Structure

### 5.1 Pages (Platform)

```
src/pages/testing/
├── TestDashboard.jsx          # Overview: suite coverage, execution trend, defect summary
├── TestSuites.jsx             # List of test suites (table with export)
├── TestSuiteDetail.jsx        # Suite + its test cases (CRUD, run history)
├── TestCases.jsx              # All test cases cross-suite (filterable table)
├── TestCaseDetail.jsx         # Full test case view (steps, history, linked defects)
├── TestRuns.jsx               # List of all test runs
├── TestRunDetail.jsx          # Run detail: execution status per test case
├── TestRunExecute.jsx         # Step-by-step execution runner
├── TestCaseBulkUpload.jsx     # Import wizard (CSV/Excel/JSON/XML)
├── DefectDashboard.jsx        # Defect metrics, trends, severity breakdown
├── DefectList.jsx             # All defects (filterable, sortable, exportable)
└── DefectDetail.jsx           # Defect detail: comments, attachments, history, status flow
```

### 5.2 Components

```
src/components/testing/
├── TestSuiteForm.jsx           # Create/edit suite
├── TestCaseForm.jsx            # Create/edit test case
├── TestCaseStepEditor.jsx      # Drag-and-drop step ordering, add/remove steps
├── TestRunForm.jsx             # Create/edit test run
├── TestExecutionRow.jsx        # Single row in execution runner (Pass/Fail/Block/Skip buttons)
├── AutoDefectAlert.jsx         # Banner shown when defect auto-created (links to DefectDetail)
├── DefectForm.jsx              # Create/edit defect (used in modal + standalone)
├── DefectStatusBadge.jsx       # Colour-coded status chip
├── DefectSeverityBadge.jsx     # Colour-coded severity chip
├── DefectCommentSection.jsx    # Comment thread + add comment
├── DefectAttachmentUploader.jsx # Drag-and-drop upload with preview
├── DefectHistoryTimeline.jsx   # Audit trail timeline
├── TestBulkUploadWizard.jsx    # Multi-step import wizard
├── TestMetricsCards.jsx        # KPI cards (total/pass/fail/blocked rates)
├── DefectTrendChart.jsx        # Line chart: defects opened vs closed over time
├── DefectBySeverityChart.jsx   # Bar/Donut chart: defects by severity
├── TestExecutionProgressBar.jsx # Visual progress of a test run
└── TestCaseImportTemplate.jsx  # Template download helper
```

### 5.3 Services

```
src/services/
├── testSuiteService.js         # CRUD for test_suites
├── testCaseService.js          # CRUD for test_cases + test_case_steps
├── testRunService.js           # CRUD for test_runs + test_case_executions
├── defectService.js            # CRUD for defects, comments, attachments
├── testImportService.js        # Parse CSV/Excel/JSON/XML → validate → batch insert
│
└── sim/
    ├── simTestSuiteService.js
    ├── simTestCaseService.js
    ├── simTestRunService.js
    └── simDefectService.js
```

### 5.4 Simulator Pages (parity)

```
src/pages/sim/testing/
├── SimTestDashboard.jsx
├── SimTestSuites.jsx
├── SimTestSuiteDetail.jsx
├── SimTestCases.jsx
├── SimTestCaseDetail.jsx
├── SimTestRuns.jsx
├── SimTestRunDetail.jsx
├── SimTestRunExecute.jsx
├── SimTestCaseBulkUpload.jsx
├── SimDefectDashboard.jsx
├── SimDefectList.jsx
└── SimDefectDetail.jsx
```

---

## 6. Routes

### Platform Routes (add to App.jsx)

```
/app/testing                        → TestDashboard
/app/testing/suites                 → TestSuites
/app/testing/suites/:suiteId        → TestSuiteDetail
/app/testing/cases                  → TestCases
/app/testing/cases/:caseId          → TestCaseDetail
/app/testing/runs                   → TestRuns
/app/testing/runs/:runId            → TestRunDetail
/app/testing/runs/:runId/execute    → TestRunExecute
/app/testing/import                 → TestCaseBulkUpload
/app/testing/defects                → DefectList
/app/testing/defects/dashboard      → DefectDashboard
/app/testing/defects/:defectId      → DefectDetail
```

### Simulator Routes (add to App.jsx)

```
/simulator/testing                  → SimTestDashboard
/simulator/testing/suites           → SimTestSuites
... (mirrored structure)
```

---

## 7. Sidebar Menu Integration

New **"Testing & QA"** section in `pmMenuConfig.js` and `simulatorMenuConfig.js`:

```javascript
{
  id: 'testing_qa',
  label: 'Testing & QA',
  icon: 'TestTube',        // Lucide icon
  permission: 'testing:read',  // All roles have this
  children: [
    { id: 'test_dashboard',   label: 'Dashboard',      path: '/app/testing',                  icon: 'LayoutDashboard' },
    { id: 'test_suites',      label: 'Test Suites',    path: '/app/testing/suites',            icon: 'FolderOpen' },
    { id: 'test_cases',       label: 'Test Cases',     path: '/app/testing/cases',             icon: 'ClipboardList' },
    { id: 'test_runs',        label: 'Test Runs',      path: '/app/testing/runs',              icon: 'PlayCircle' },
    { id: 'test_import',      label: 'Bulk Import',    path: '/app/testing/import',            icon: 'Upload' },
    { id: 'defect_list',      label: 'Defects',        path: '/app/testing/defects',           icon: 'Bug' },
    { id: 'defect_dashboard', label: 'Defect Reports', path: '/app/testing/defects/dashboard', icon: 'BarChart2' },
  ]
}
```

---

## 8. Role-Based Access Control

| Action | Viewer | Team Member | PM | PMO | PMO Admin |
|---|---|---|---|---|---|
| View test suites/cases | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create/edit test cases | — | ✓ | ✓ | ✓ | ✓ |
| Delete test cases | — | — | ✓ | ✓ | ✓ |
| Execute test run | — | ✓ | ✓ | ✓ | ✓ |
| Create defects (manual) | — | ✓ | ✓ | ✓ | ✓ |
| Edit/close defects | — | ✓ | ✓ | ✓ | ✓ |
| Delete defects | — | — | ✓ | ✓ | ✓ |
| Bulk import | — | — | ✓ | ✓ | ✓ |
| View dashboards/reports | ✓ | ✓ | ✓ | ✓ | ✓ |
| Export data | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## 9. Bulk Import Design

### Supported Formats

| Format | Library | Template Provided |
|---|---|---|
| CSV | PapaParse (already in project) | Yes (.csv download) |
| Excel (.xlsx) | SheetJS/XLSX (already in project) | Yes (.xlsx download) |
| JSON | Native JSON.parse() | Yes (sample .json) |
| XML | Browser DOMParser | Yes (sample .xml) |

### Import Field Mapping

Required fields: `title`, `priority`, `test_type`
Optional fields: `description`, `preconditions`, `expected_result`, `tags`, `suite_name`, `steps` (JSON array)

### Wizard Steps
1. **Select File** — drag-and-drop or file picker; format auto-detected
2. **Preview & Map** — table showing parsed rows with column mapping dropdowns
3. **Validate** — client-side validation with error highlighting per row
4. **Confirm** — summary: X valid, Y errors; user can proceed or fix
5. **Result** — batch insert summary with per-row status

---

## 10. Export Functionality

### Test Case Lists (table view)
- Excel, CSV, JSON, XML — all test case fields
- PowerPoint / Word — up to 10 user-selected fields
- Print — formatted table

### Defect Lists (table view)
- Same formats as above
- Includes: defect ref, title, severity, status, assigned to, created date

### Test Run Report (single record)
- **Word** — each section as header: Summary, Pass Rate, Failed Cases, Defects Raised
- **Excel** — execution results per test case with status colour-coding
- **PowerPoint** — slide per test case type with charts

### Defect Detail (single record)
- **Word** — full defect report with description, steps, resolution
- **PowerPoint** — defect summary slide with severity and status
- **Excel** — defect data + comment history
- **PDF** (via print-to-PDF in browser)

All export buttons appear as a dropdown following the existing pattern in the codebase.

---

## 11. Implementation Phases & Todo List

### Phase 1: Database — Test Management Core
- [x] Create `v338_test_management_core_tables.sql` (test_suites, test_cases, test_case_steps)
- [x] Create `v339_test_runs_tables.sql` (test_runs, test_case_executions)
- [x] Create `v340_defect_management_tables.sql` (defects, defect_comments, defect_attachments, defect_history)
- [x] Create `v341_test_management_rls_policies.sql`
- [x] Create `v342_test_runs_rls_policies.sql`
- [x] Create `v343_defect_management_rls_policies.sql`
- [x] Create `v344_test_management_triggers.sql` (auto-defect + run summary + defect audit)
- [x] Create `v345_defect_storage_setup.sql` (storage bucket + policies)

### Phase 2: Services (Platform)
- [x] Create `testSuiteService.js`
- [x] Create `testCaseService.js` (include step management)
- [x] Create `testRunService.js` (include execution management)
- [x] Create `defectService.js` (include comments + attachments)
- [x] Create `testImportService.js` (CSV/Excel/JSON/XML parsers)

### Phase 3: Test Management Pages & Components
- [x] Create `TestSuiteForm.jsx` component
- [x] Create `TestCaseForm.jsx` + `TestCaseStepEditor.jsx`
- [x] Create `TestSuites.jsx` page (list + CRUD)
- [x] Create `TestSuiteDetail.jsx` page
- [x] Create `TestCases.jsx` page (list + CRUD)
- [x] Create `TestCaseDetail.jsx` page

### Phase 4: Test Execution
- [x] Create `TestRunForm.jsx`
- [x] Create `TestExecutionRow.jsx` + `TestExecutionProgressBar.jsx`
- [x] Create `TestRuns.jsx` page
- [x] Create `TestRunDetail.jsx` page
- [x] Create `TestRunExecute.jsx` page (live execution runner)
- [x] Create `AutoDefectAlert.jsx` banner component

### Phase 5: Defect Management Pages & Components
- [x] Create `DefectForm.jsx` (for both auto-create and manual)
- [x] Create `DefectStatusBadge.jsx` + `DefectSeverityBadge.jsx`
- [x] Create `DefectCommentSection.jsx`
- [x] Create `DefectAttachmentUploader.jsx` (with screenshot preview)
- [x] Create `DefectHistoryTimeline.jsx`
- [x] Create `DefectList.jsx` page
- [x] Create `DefectDetail.jsx` page

### Phase 6: Bulk Import
- [x] Create `TestBulkUploadWizard.jsx` (multi-step)
- [x] Create `TestCaseImportTemplate.jsx` (template downloads)
- [x] Create `TestCaseBulkUpload.jsx` page
- [x] Wire import service to wizard

### Phase 7: Dashboards & Reports
- [x] Create `TestMetricsCards.jsx` (KPI cards)
- [x] Create `TestExecutionProgressBar.jsx`
- [x] Create `DefectTrendChart.jsx`
- [x] Create `DefectBySeverityChart.jsx`
- [x] Create `TestDashboard.jsx` page
- [x] Create `DefectDashboard.jsx` page

### Phase 8: Export Functionality
- [x] Wire export dropdown to TestSuites, TestCases, TestRuns, DefectList pages
- [x] Implement single-record Word/Excel/PowerPoint export for DefectDetail
- [x] Implement single-record Word/Excel/PowerPoint export for TestRunDetail

### Phase 9: Sidebar & Routing
- [x] Add Testing & QA section to `pmMenuConfig.js`
- [x] Add all 12 routes to `App.jsx` (lazy-loaded)
- [x] Create `v346_test_management_sidebar_menu.sql` (DB menu entries; `route_path` aligned with `/platform/testing/*`)

### Phase 10: Simulator Parity
- [x] Create `v347–v352` SQL files (sim schema tables, RLS, triggers, storage)
- [x] Create sim services in `src/services/sim/` (`practiceTestSuiteService`, `practiceTestCaseService`, `practiceTestRunService`, `practiceDefectService`)
- [x] Create sim pages in `src/pages/sim/testing/`
- [x] Add Simulator Testing & QA links to `simulatorMenuConfig.js`
- [x] Add simulator routes to `App.jsx` (`/simulator/practice-testing/*`)

### Phase 11: Unit Tests
- [x] `testSuiteService.test.js`
- [x] `testCaseService.test.js`
- [x] `testRunService.test.js`
- [x] `defectService.test.js`
- [x] `testImportService.test.js`
- [x] Integration test: `src/test/integration/testRunAutoDefectFlow.test.js` (client contract for fail → defect; DB trigger exercised in deployed env; E2E optional later)

---

## 12. Key Technical Decisions & Best Practices

### 12.1 Auto-Defect Title Generation
The trigger auto-generates: `[FAILED] {test_case_ref} - {test_case.title}` so the defect always has traceable context.

### 12.2 Test Case Reference Format
`TC-{YYYYMMDD}-{4-digit sequence}` e.g. `TC-20260327-0001` — generated by a PostgreSQL sequence per project.

### 12.3 Defect Reference Format
`DEF-{YYYYMMDD}-{4-digit sequence}` e.g. `DEF-20260327-0001` — similarly generated.

### 12.4 Storage Bucket Policy
- Bucket: `defect-attachments` (private, authenticated only)
- Max file size: 10MB
- Allowed MIME types: `image/*`, `application/pdf`
- Path pattern: `{project_id}/{defect_id}/{filename}`

### 12.5 Bulk Import Batch Size
Process in batches of 50 rows to avoid DB connection timeouts. Show progress bar during batch processing.

### 12.6 Chart Library
Reuse existing chart library already in the project (likely Recharts based on existing dashboard components).

### 12.7 Draft Queue Integration (CLAUDE.md Rule #37)
Test cases created manually get a "Save as Draft" option using the existing hold/draft queue system (`v254_draft_queue_tables.sql`).

**Status:** *Deferred.* Forms support **draft** as a case/suite **status** only; global draft-queue save/resume is not wired for test cases in this phase. Tracked as follow-up in `Documentation/Test_Case_Defect_Implementation_Complete_Summary.md`.

### 12.8 Existing AcceptanceTestingPage
The existing `/acceptance-testing` page (tied to Product Product Description acceptance criteria) is **separate** from this module. It remains unchanged. This new module is a full test case management system, not acceptance criteria review.

---

## 13. Documentation Plan

| File | Location | Status |
|---|---|---|
| `Test_Case_Management_User_Guide.md` | Documentation/ | Done |
| `Defect_Management_User_Guide.md` | Documentation/ | Done |
| `Test_Bulk_Import_Guide.md` | Documentation/ | Done |
| `Test_Case_Defect_Technical_Documentation.md` | Documentation/ | Done |
| `Test_Case_Defect_Implementation_Complete_Summary.md` | Documentation/ | Done |

---

## 14. Review (to be completed after implementation)

**Completed (2026-03-27):**

- **Platform:** Lazy routes under `platform/*` for Testing & QA (`/platform/testing`, suites, cases, import, runs, execute, defects list/detail/dashboard including `defects/new`). `pmMenuConfig.js` section added. `v346` menu `route_path` values updated to `/platform/testing/*`.
- **Exports:** `TestCaseDetail`, `TestRunDetail`, and `DefectDetail` use `ExportRecordButtons` with `exportRecordTo*` from `exportUtils`. List pages already used `ExportListMenu`.
- **Defects:** New pages `DefectList.jsx`, `DefectDetail.jsx`, `DefectDashboard.jsx`; bulk upload page `TestCaseBulkUpload.jsx` with suite name → id map from `getTestSuites`. Success banner after create/update on defect detail. `TestRunExecute` refetches executions when embed omits defect after a fail.
- **Shared components:** `DefectCommentSection`, `DefectAttachmentUploader`, `DefectHistoryTimeline` accept injectable API functions for Simulator reuse. `AutoDefectAlert` accepts `defectDetailBasePath`. `DefectForm`, `TestCaseForm`, `TestRunForm`, `TestSuiteForm` support `projectIdKey` / `practice_project_id` for sim. `TestBulkUploadWizard` accepts `validateOptions` and `batchCreateFn`.
- **Simulator:** `SimTestingPageShell`, `resolveSimInternalUserId`, services `practiceTestSuiteService`, `practiceTestCaseService`, `practiceTestRunService`, `practiceDefectService`, pages under `src/pages/sim/testing/`, routes `/simulator/practice-testing/*`, `simulatorMenuConfig` entries. SQL `v347`–`v352` for `sim.practice_test_*`, `sim.practice_defect*`, RLS, auto-defect trigger, `sim-defect-attachments` bucket.
- **Tests:** `testSuiteService.test.js`, `testCaseService.test.js`, `testRunService.test.js`, `defectService.test.js`, `testImportService.test.js`; integration contract `testRunAutoDefectFlow.test.js`.

**Documentation (Section 13):** All five guides/summary files under `Documentation/`.

**Apply migrations:** Run SQL `v347` through `v352` in order on Supabase after `v346` (platform menu).

---

**Status: Plan phases 1–11 complete for delivered scope. §12.7 global draft-queue integration remains a documented follow-up, not a phased checkbox.**
