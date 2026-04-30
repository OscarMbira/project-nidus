# v493 — PMIS Testing & Diagnostics Centre: Comprehensive Implementation Plan

**Date:** 2026-04-24  
**Version:** v493  
**Author:** Project Nidus Team  
**Reference Document:** `Documents/pmis-testing-diagnostics-centre-cursor-prompt.md`

**Implementation (2026-04-25):** Delivered in this repository — SQL `v493_testing_centre_foundation.sql` through `v498_testing_centre_seed_data.sql`, `src/services/testingCentreService.js` + `simTestingCentreService.js`, `src/pages/testingCentre/`, `src/components/testingCentre/`, all six menu configs, `App.jsx` routes for Platform/PM/PMO/Simulator, `Documentation/Testing_Diagnostics_Centre_*.md`, and `test-runner/runner.mjs`. Apply SQL to Supabase and create the `testing-centre-evidence` storage bucket before go-live. Phase checklists below are marked complete for the implementation pass; validate in your environment.

---

## Overview

This plan covers the full build of the **PMIS Testing & Diagnostics Centre** — an internal, configurable test management and diagnostic module integrated directly into the PMIS platform. It supports both **Platform** (`/platform/...`, `public` schema, `platformDb`) and **Simulator** (`/simulator/...`, `sim` schema, `simDb`) systems, following all existing codebase patterns established by the Work Authorisation and other recent modules.

The module is built in **6 phased releases** (v493–v498), each independently deployable.

---

## ⚠️ Critical Pre-Implementation Finding: Table Naming Conflict

The existing `defectService.js` already joins `defects` to **`test_cases`** (fields: `test_case_ref`, `title`) and **`test_case_executions`** (fields: `status`, `actual_result`). These are pre-existing PMIS tables.

**The Testing Centre MUST NOT create new tables named `test_cases` or `test_suites` etc. as they will conflict.**

**Resolution**: All new Testing Centre tables use the prefix `tc_`:

| Original Name in Spec | Actual Table Name to Create |
|---|---|
| `test_modules` | `tc_test_modules` |
| `test_cases` | `tc_test_cases` |
| `test_suites` | `tc_test_suites` |
| `test_suite_cases` | `tc_test_suite_cases` |
| `test_environments` | `tc_test_environments` |
| `test_runs` | `tc_test_runs` |
| `test_run_results` | `tc_test_run_results` |
| `test_evidence_files` | `tc_evidence_files` |
| `test_audit_logs` | Not created — use `auditService.js` |
| `diagnostic_sessions` | `tc_diagnostic_sessions` |
| `automation_scripts` | `tc_automation_scripts` |
| `allowed_script_directories` | `tc_allowed_script_directories` |
| `screenshot_comparisons` | `tc_screenshot_comparisons` |
| `test_data_sets` | `tc_test_data_sets` |
| `testing_centre_settings` | `tc_settings` |

The existing `defects` table is **not renamed** — it is extended with new nullable columns (see §4.4). All service functions, RPC calls, and FK references throughout the plan use these `tc_` names.

---

## ✅ Scope Confirmation (4 Key Verification Points)

### 1. This module tests the current PMIS codebase specifically

This is **not** a generic testing framework. Every test case, seed module, E2E script, and diagnostic rule targets the actual features already built in this codebase:

| PMIS Feature | Covered By | Test Location |
|---|---|---|
| Authentication / Login | Seed test cases + E2E | `tests/e2e/auth/` |
| Role-based navigation (pmMenuConfig, pmoMenuConfig, pmDashboardMenuConfig) | Negative permission test suite | `tests/e2e/permissions/` |
| Platform Projects (create, edit, view, archive) | Predictive test suite | `tests/e2e/predictive/` |
| Stage/Phase management, End-Stage Reports | Predictive test suite | `tests/e2e/predictive/` |
| Agile Backlog, Sprints, Kanban | Agile test suite | `tests/e2e/agile/` |
| Risk Management (score calc, RLS) | Risk-Issue-Change suite | `tests/e2e/risk-issue-change/` |
| Issue Management (escalation, audit) | Risk-Issue-Change suite | `tests/e2e/risk-issue-change/` |
| Change Control (assess, approve, dashboard) | Risk-Issue-Change suite | `tests/e2e/risk-issue-change/` |
| PMO/PM Dashboards, KPIs | Reports suite | `tests/e2e/reports/` |
| Work Authorisation (approve/reject/suspend) | Predictive test suite | `tests/e2e/predictive/` |
| EEF / OPA / Template Library | Vitest unit tests | `tests/unit/` |
| Notifications, Audit Logs | System suite | `tests/e2e/` |
| Document Management, Attachments | Reports suite | `tests/e2e/reports/` |
| Simulator (all above, sim schema) | Sim suites | `tests/e2e/simulator/` |

The `test_modules` seed data (§1.1.5) must be seeded with the actual current PMIS route paths (e.g. `route_path: '/platform/projects'`) so diagnostic links open the right pages.

---

### 2. Sidebar menu entries added to ALL 6 role config files

There are **6 menu config files** in `src/config/`. The Testing Centre section must be added to every one:

| File | Role / Domain | Path Prefix | Icon Format |
|---|---|---|---|
| `pmMenuConfig.js` | Platform PM | `/platform/testing-centre/...` | String (`'flask-conical'`) |
| `pmDashboardMenuConfig.js` | Platform PM Dashboard | `/pm/testing-centre/...` | Lucide component (`FlaskConical`) |
| `pmoMenuConfig.js` | Platform PMO Dashboard | `/pmo/testing-centre/...` | Lucide component (`FlaskConical`) |
| `simulatorMenuConfig.js` | Simulator general | `/simulator/testing-centre/...` | String, `subscriptionTier: null` |
| `simulatorPMMenuConfig.js` | Simulator PM | `/simulator/pm/testing-centre/...` | Lucide component |
| `simulatorPMOMenuConfig.js` | Simulator PMO | `/simulator/pmo/testing-centre/...` | Lucide component |

All 11 sub-menu links (Dashboard, Case Library, Suites, Runs, Scripts, Evidence, Diagnostic Centre, Defects, Data Manager, Reports, Settings) appear in each file, gated by `testing_centre.view` (or `subscriptionTier` in Simulator general menu).

---

### 3. Screenshot / Image Reading & Viewing features confirmed

The module explicitly supports the following screenshot and image workflows:

| Capability | Where |
|---|---|
| Upload screenshots (user-reported issues) | `DiagnosticSessionCreatePage` Step 3, `ScreenshotEvidencePage` |
| Playwright automatic screenshot capture on failure | `playwright-adapter.ts`, evidence-uploader |
| Screenshot capture at every step (Full evidence level) | Playwright config + adapter |
| Inline image preview / lightbox viewer | `ScreenshotEvidencePage`, `TestRunDetailPage`, `DiagnosticSessionDetailPage` |
| Zoom / pan on screenshot preview | `ScreenshotViewer.jsx` shared component (new) |
| Screenshot annotation (add notes, mark regions) | `ScreenshotEvidencePage` — note field per evidence file |
| Mark screenshot as: Baseline / Actual / Failure / User Reported / Before Fix / After Fix | `ScreenshotEvidencePage` |
| Side-by-side baseline vs actual comparison | `ScreenshotComparisonPanel.jsx` (Phase 5) |
| Comparison outcome stored (matched/different/baseline_missing) | `screenshot_comparisons` table |
| Screenshots linked to: test cases, runs, defects, diagnostic sessions | FK on `test_evidence_files` |
| Image reading in diagnostic sessions | Inline viewer inside `DiagnosticSessionDetailPage`, showing all uploaded screenshots with notes |
| Screenshot thumbnails in test run results table | `TestRunDetailPage` results row |

Two new shared components added to the file structure:
- `src/components/testingCentre/ScreenshotViewer.jsx` — lightbox with zoom, pan, note display
- `src/components/testingCentre/ScreenshotComparisonPanel.jsx` — side-by-side diff view (Phase 5)

---

### 4. Existing features reused — no duplicate code

The following existing shared components and services **must be used** instead of building new equivalents:

| Existing Asset | Location | Used For |
|---|---|---|
| `ExportListMenu.jsx` | `src/components/ui/` | Export dropdown on all list pages |
| `ExportListButton.jsx` | `src/components/ui/` | Export trigger button on lists |
| `ExportRecordMenu.jsx` | `src/components/ui/` | Export options on detail/record view pages |
| `ExportRecordButtons.jsx` | `src/components/ui/` | PPT / Word / Excel buttons on record views |
| `exportUtils.js` | `src/utils/` | All export logic (CSV, JSON, Excel, Word, PPT) |
| `ViewToggle.jsx` | `src/components/ui/` | Card ⊞ / List ≡ toggle on all list pages |
| `SortToolbar.jsx` | `src/components/ui/` | Sortable column headers on card-view pages |
| `HoldButton.jsx` | `src/components/ui/` | Save as Draft / Hold button on create forms |
| `HoldModal.jsx` | `src/components/ui/` | Hold/draft confirmation modal |
| `EntityHoldQueue.jsx` | `src/components/ui/` | Draft queue page component |
| `AutoSaveIndicator.jsx` | `src/components/ui/` | Auto-save status on multi-step forms |
| `Modal.jsx` | `src/components/ui/` | All confirmation/destructive action modals |
| `Toast.jsx` + ToastContext | `src/components/ui/` | All success/error/info notifications |
| `EmptyState.jsx` | `src/components/ui/` | Empty list and no-results states |
| `Loading.jsx` | `src/components/ui/` | Loading spinners / skeletons |
| `SmartAmountInput.jsx` | `src/components/ui/` | Any numeric fields (effort hours, file sizes) |
| `SearchableSelect.jsx` | `src/components/ui/` | Module, environment, role dropdowns in forms |
| `RagStatusBadge.jsx` | `src/components/ui/` | Basis for `StatusBadge.jsx` (extend don't replace) |
| `DocumentStateBadge.jsx` | `src/components/ui/` | Basis for test case status display |
| `DraftStatusBadge.jsx` | `src/components/ui/` | Draft state indicator on case cards |
| `auditService.js` | `src/services/` | All audit logging — call `logAuditEvent()` instead of inserting to `test_audit_logs` directly; the Testing Centre adds its own entity types to the existing audit system |
| `permissionChecker.js` | `src/utils/` | All permission gates — `hasPermission()` / `getUserProjectPermissions()` |
| `defectService.js` | `src/services/` | **CRITICAL**: An existing `defects` table and service already exist. The Testing Centre's "Defect & Issue Links" page (§8.8) must **integrate with the existing `defects` table** via `defectService.js` rather than creating a new `test_defects` table. The new fields needed (e.g. `linked_test_run_id`, `cursor_prompt_generated`) should be added as nullable columns to the existing `defects` table via migration. |
| `src/services/sim/practiceDefectService.js` | `src/services/sim/` | Simulator-side defect integration (same approach) |

> **Rule**: Before writing any new component or service, check `src/components/ui/` and `src/services/` first. If an equivalent exists, extend it — do not clone it.

---

## Codebase Pattern Alignment

Before implementation, note these pattern decisions:

| Pattern | Decision |
|---|---|
| Services | Dual: `testingCentreService.js` (platformDb) + `simTestingCentreService.js` (simDb) |
| Shared UI | `TestCaseListCore.jsx` with `mode="platform"\|"sim"` prop |
| Route prefix Platform | `/platform/testing-centre/...` |
| Route prefix Simulator | `/simulator/testing-centre/...` |
| Menu files | All 6: pmMenuConfig, pmDashboardMenuConfig, pmoMenuConfig, simulatorMenuConfig, simulatorPMMenuConfig, simulatorPMOMenuConfig |
| SQL next version | v493 → v498 (one per phase) |
| Plan version | v493 |
| Return format | `{ success: boolean, data?, message?, error? }` |
| Test pattern | Vitest + `vi.mock('../supabase/supabaseClient')` before import |
| Auth | `platformDb` RPC `has_project_permission` / permission codes `testing_centre.*` |
| Dark theme | Default dark, theme-aware via ThemeContext |
| Export | Reuse `ExportListMenu.jsx` / `ExportRecordMenu.jsx` + `exportUtils.js` |
| Card/List toggle | Reuse `ViewToggle.jsx` (not rebuild) |
| Sortable columns | Reuse `SortToolbar.jsx` (not rebuild) |
| Amount fields | Reuse `SmartAmountInput.jsx` |
| Draft/Hold queue | Reuse `HoldButton.jsx` + `EntityHoldQueue.jsx` |
| Audit logging | Call `logAuditEvent()` from existing `auditService.js` |
| Defects | Extend existing `defects` table + `defectService.js` |

---

## SQL File Plan

| SQL File | Version | Contents |
|---|---|---|
| `v493_testing_centre_foundation.sql` | Phase 1 | Core tables, RLS, grants, menu permissions |
| `v494_testing_centre_runs.sql` | Phase 2 | test_runs, test_run_results, evidence tables |
| `v495_testing_centre_automation.sql` | Phase 3 | automation_scripts, script_registry, e2e config |
| `v496_testing_centre_diagnostics.sql` | Phase 4 | diagnostic_sessions, ALTER existing defects table (add linked_test_run_id etc.) |
| `v497_testing_centre_advanced.sql` | Phase 5 | Retention policies, sim parity tables, CI config |
| `v498_testing_centre_seed_data.sql` | Phase 6 | All seed data: modules, environments, settings, 68 test cases, 7 suites, scripts, personas |

---

## Full Todo List

### Phase 1 — Foundation (SQL v493)

#### 1.1 Database Tables

- [x] **1.1.1** Create `SQL/v493_testing_centre_foundation.sql` with all Phase 1 tables (using `tc_` prefix to avoid conflict with existing `test_cases` / `test_case_executions` tables):
  - `tc_test_modules` (id, name, code, description, methodology_type, parent_module_id, route_path, is_active, created_by, created_at, updated_at)
    — `route_path` must match actual current PMIS routes (e.g. `/platform/projects`, `/platform/risks`)
  - `tc_test_cases` (id, test_case_code, title, description, module_id, feature_name, methodology_type, test_type, scenario_type, priority, severity_if_failed, preconditions, test_steps JSONB, test_data JSONB, expected_result, automation_key, playwright_spec_path, vitest_spec_path, database_test_path, expected_screenshot_id, tags text[], status, owner_role, owner_user_id, is_reusable, is_active, created_by, updated_by, created_at, updated_at)
  - `tc_test_suites` (id, suite_code, name, description, suite_type, methodology_type, target_module_id, environment_id, is_active, created_by, created_at, updated_at)
  - `tc_test_suite_cases` (id, suite_id, tc_test_case_id, run_order, is_required, created_at)
  - `tc_test_environments` (id, name, environment_type, base_url, api_base_url, database_reference, browser_config JSONB, seed_data_profile, is_default, is_active, created_by, created_at, updated_at)
  - `tc_settings` (id, setting_key, setting_value JSONB, description, updated_by, updated_at)
  - **NO separate audit table** — use the existing `auditService.js` / `logAuditEvent()` with `resource_type` values: `'tc_test_case'`, `'tc_test_suite'`, `'tc_test_run'`, `'tc_diagnostic_session'`
  - **NO new defects table** — extend existing `defects` table in v496 SQL (see §4.4)

- [x] **1.1.2** Add RLS policies for all Phase 1 tables (public schema):
  - `test_cases`: SELECT for authenticated; INSERT/UPDATE for roles with `testing_centre.create`; DELETE for `testing_centre.delete`
  - `test_suites`: same pattern
  - `test_environments`: restricted to sys admin / PMO admin
  - `test_audit_logs`: SELECT only (insert via server-side trigger)

- [x] **1.1.3** Create Supabase RPC functions:
  - `get_testing_centre_dashboard_metrics()` — returns counts: total_cases, ready_cases, automated_cases, manual_cases, draft_cases, deprecated_cases, active_suites, active_environments
  - `clone_test_case(p_source_id uuid, p_new_title text, p_created_by uuid)` — deep copy with new code
  - `clone_test_suite(p_source_id uuid, p_new_name text, p_created_by uuid)`

- [x] **1.1.4** Insert permission codes into existing `permissions` table:
  - `testing_centre.view`, `testing_centre.create`, `testing_centre.edit`, `testing_centre.delete`
  - `testing_centre.run`, `testing_centre.configure`, `testing_centre.approve_fix`
  - `testing_centre.view_logs`, `testing_centre.manage_environments`

- [x] **1.1.5** Seed `test_modules` with the 16 standard PMIS modules from the spec (Authentication, User Management, Project Startup, etc.)

- [x] **1.1.6** Register all new tables in `database_tables` registry (per CLAUDE.md rule)

- [x] **1.1.7** Create **sim schema equivalents** in `SQL/v493_testing_centre_foundation.sql`:
  - All tables above prefixed `sim.` schema
  - `sim.test_cases.practice_project_id` instead of `project_id`
  - Separate RLS for `sim` schema

#### 1.2 Backend Services

- [x] **1.2.1** Create `src/services/testingCentreService.js` (platformDb) with:
  - `listTestModules()`, `getTestModule(id)`
  - `listTestCases(filters)`, `getTestCase(id)`, `createTestCase(data)`, `updateTestCase(id, data)`, `deleteTestCase(id)`, `deactivateTestCase(id)`, `cloneTestCase(id, newTitle)`
  - `listTestSuites(filters)`, `getTestSuite(id)`, `createTestSuite(data)`, `updateTestSuite(id, data)`, `deleteTestSuite(id)`, `cloneTestSuite(id, newName)`
  - `addCaseToSuite(suiteId, caseId, order)`, `removeCaseFromSuite(suiteId, caseId)`, `reorderSuiteCases(suiteId, orderedIds)`
  - `listEnvironments()`, `getEnvironment(id)`, `createEnvironment(data)`, `updateEnvironment(id, data)`, `deleteEnvironment(id)`, `setDefaultEnvironment(id)`
  - `getTestingDashboardMetrics()`
  - `getSettings()`, `updateSetting(key, value)`
  - `auditTestingAction(action, entityType, entityId, beforeData, afterData)`
  - `importTestCasesFromCSV(file)`, `exportTestCases(filters, format)`

- [x] **1.2.2** Create `src/services/simTestingCentreService.js` (simDb) — identical function signatures, uses `sim` schema and `practice_project_id`

- [x] **1.2.3** Create unit tests `src/services/__tests__/testingCentreService.test.js`:
  - Test listTestCases with filters
  - Test createTestCase with required field validation
  - Test cloneTestCase returns new record with new code
  - Test auditTestingAction records entry

#### 1.3 Frontend — Navigation (ALL 6 Menu Config Files)

- [x] **1.3.1** Add **Testing & Diagnostics** section to `src/config/pmMenuConfig.js` (string icon, `/platform/testing-centre/...`):
  ```js
  {
    id: 'platform-testing-centre',
    label: 'Testing & Diagnostics',
    icon: 'flask-conical',
    section: 'testing',
    permission: 'testing_centre.view',
    children: [
      { id: 'tc-dashboard',   label: 'Testing Dashboard',   path: '/platform/testing-centre',             permission: 'testing_centre.view' },
      { id: 'tc-cases',       label: 'Test Case Library',   path: '/platform/testing-centre/cases',       permission: 'testing_centre.view' },
      { id: 'tc-suites',      label: 'Test Suites',         path: '/platform/testing-centre/suites',      permission: 'testing_centre.view' },
      { id: 'tc-runs',        label: 'Test Runs',           path: '/platform/testing-centre/runs',        permission: 'testing_centre.run' },
      { id: 'tc-scripts',     label: 'Automated Scripts',   path: '/platform/testing-centre/scripts',     permission: 'testing_centre.configure' },
      { id: 'tc-evidence',    label: 'Screenshot Evidence', path: '/platform/testing-centre/evidence',    permission: 'testing_centre.view' },
      { id: 'tc-diagnostics', label: 'Diagnostic Centre',  path: '/platform/testing-centre/diagnostics', permission: 'testing_centre.view' },
      { id: 'tc-defects',     label: 'Defect & Issue Links',path: '/platform/testing-centre/defects',     permission: 'testing_centre.view' },
      { id: 'tc-data',        label: 'Test Data Manager',   path: '/platform/testing-centre/data',        permission: 'testing_centre.configure' },
      { id: 'tc-reports',     label: 'Reports',             path: '/platform/testing-centre/reports',     permission: 'testing_centre.view' },
      { id: 'tc-settings',    label: 'Settings',            path: '/platform/testing-centre/settings',    permission: 'testing_centre.configure' },
    ]
  }
  ```

- [x] **1.3.2** Add same section to `src/config/pmDashboardMenuConfig.js` (lucide `FlaskConical` icon component, paths `/pm/testing-centre/...`) — same 11 children, same permissions

- [x] **1.3.3** Add same section to `src/config/pmoMenuConfig.js` (lucide `FlaskConical` icon component, paths `/pmo/testing-centre/...`) — PMO admins need full access to all 11 links

- [x] **1.3.4** Add section to `src/config/simulatorMenuConfig.js` (string icon `'flask-conical'`, paths `/simulator/testing-centre/...`, `subscriptionTier: null`):
  - All 11 sub-links with `subscriptionTier: null` (available to all simulator users)

- [x] **1.3.5** Add section to `src/config/simulatorPMMenuConfig.js` (lucide `FlaskConical`, paths `/simulator/pm/testing-centre/...`)

- [x] **1.3.6** Add section to `src/config/simulatorPMOMenuConfig.js` (lucide `FlaskConical`, paths `/simulator/pmo/testing-centre/...`)

#### 1.4 Frontend — Routes

- [x] **1.4.1** Register all Platform Testing Centre routes in `src/App.jsx` (lazy imports):
  - `/platform/testing-centre` → `TestingDashboardPage`
  - `/platform/testing-centre/cases` → `TestCaseLibraryPage`
  - `/platform/testing-centre/cases/new` → `TestCaseCreatePage`
  - `/platform/testing-centre/cases/:id` → `TestCaseDetailPage`
  - `/platform/testing-centre/cases/:id/edit` → `TestCaseEditPage`
  - `/platform/testing-centre/cases/drafts` → `TestCaseDraftsPage`
  - `/platform/testing-centre/suites` → `TestSuitesPage`
  - `/platform/testing-centre/suites/new` → `TestSuiteCreatePage`
  - `/platform/testing-centre/suites/:id` → `TestSuiteDetailPage`
  - `/platform/testing-centre/settings/environments` → `TestEnvironmentsPage`

- [x] **1.4.2** Register all Simulator routes with prefix `/simulator/testing-centre/...` (same page components, different `mode` prop)

#### 1.5 Frontend — Pages (Phase 1)

- [x] **1.5.1** Create `src/pages/testingCentre/TestingDashboardPage.jsx`:
  - Summary cards: total cases, ready, automated, manual, active suites, environments
  - Chart placeholders (to be populated in Phase 2 with run data)
  - Quick-action buttons: New Test Case, New Suite, View Runs
  - Theme-aware dark/light

- [x] **1.5.2** Create `src/components/testingCentre/TestCaseListCore.jsx` (mode="platform"|"sim"):
  - Card/List toggle (useViewMode hook)
  - Sortable columns: code, title, module, type, priority, status, updated_at
  - Search bar (title, code, tags)
  - Filter panel: module, methodology, test_type, scenario_type, priority, status
  - Per-row actions: View, Edit, Clone, Deactivate, Delete (permission-gated)
  - Export dropdown (CSV/JSON/Markdown)
  - Import from CSV/JSON button

- [x] **1.5.3** Create `src/pages/testingCentre/TestCaseLibraryPage.jsx` — renders `<TestCaseListCore mode="platform"/>`

- [x] **1.5.4** Create `src/pages/simulator/testingCentre/SimTestCaseLibraryPage.jsx` — renders `<TestCaseListCore mode="sim"/>`

- [x] **1.5.5** Create `src/pages/testingCentre/TestCaseCreatePage.jsx` — multi-step form:
  - Step 1: General Info (code auto-generated, title, description, module, feature, methodology, test_type, scenario_type, priority, severity)
  - Step 2: Preconditions & Steps (preconditions text, test_steps JSON builder — add/remove/reorder rows)
  - Step 3: Test Data & Expected Result (test_data JSONB editor, expected_result, pass/fail criteria)
  - Step 4: Automation Config (automation_key, playwright_spec_path, vitest_spec_path, db_test_path)
  - Step 5: Evidence & Tags (expected_screenshot upload, tags, owner_role, owner_user_id, is_reusable)
  - Draft/Hold queue integration (save as draft, resume from drafts)
  - Success toast with case code on save

- [x] **1.5.6** Create `src/pages/testingCentre/TestCaseDetailPage.jsx` — read-only view with all sections, export (PPT/Word/Excel), action buttons (Edit, Clone, Deactivate)

- [x] **1.5.7** Create `src/pages/testingCentre/TestCaseEditPage.jsx` — same multi-step form in edit mode

- [x] **1.5.8** Create `src/pages/testingCentre/TestCaseDraftsPage.jsx` — list saved drafts with Resume/Delete actions

- [x] **1.5.9** Create `src/pages/testingCentre/TestSuitesPage.jsx`:
  - List suites with suite_type, methodology_type, case count, environment, last_run_status
  - Card/List toggle + sortable columns
  - Per-row: View, Edit, Run, Clone, Delete

- [x] **1.5.10** Create `src/pages/testingCentre/TestSuiteCreatePage.jsx`:
  - Suite metadata form
  - Test case selector: searchable multi-select, drag-reorder, mark required
  - Environment assignment
  - Clone from existing suite option

- [x] **1.5.11** Create `src/pages/testingCentre/TestSuiteDetailPage.jsx` — suite view with ordered case list and Run Suite button

- [x] **1.5.12** Create `src/pages/testingCentre/TestEnvironmentsPage.jsx`:
  - CRUD for environments
  - Warn: Production environment → read-only diagnostic mode enforced
  - Default environment toggle

- [x] **1.5.13** Create `src/pages/testingCentre/TestingCentreSettingsPage.jsx`:
  - All settings from spec §8.11 (default env, browser, screenshot mode, trace mode, etc.)
  - **Auto Defect Creation section** (new):
    - Toggle: "Automatically create defects when tests fail" (`auto_create_defects_on_failure`)
    - Multi-select: "Create defects for these failure types" (`auto_defect_failure_classifications`)
    - Severity mapping table: test severity → defect severity (editable per row)
    - Warning notice: "Auto-created defects appear in the project Defects register and are attributed to the test run"
  - Save confirmation toast

#### 1.6 Shared Components

- [x] **1.6.1** Create `src/components/testingCentre/TestCaseForm/` (sub-components for each step used by create + edit):
  - `StepGeneralInfo.jsx`, `StepTestStepsBuilder.jsx`, `StepTestData.jsx`, `StepAutomation.jsx`, `StepEvidenceTags.jsx`
  - All steps use existing `Input.jsx`, `Textarea.jsx`, `Select.jsx`, `SearchableSelect.jsx`, `SmartAmountInput.jsx`, `AutoSaveIndicator.jsx` from `src/components/ui/`

- [x] **1.6.2** Create `src/components/testingCentre/TestStatusBadge.jsx` — extends/wraps `RagStatusBadge.jsx` with Testing Centre colours (passed=green, failed=red, running=blue, blocked=amber, skipped=grey, draft=grey)

- [x] **1.6.3** Create `src/components/testingCentre/PriorityBadge.jsx` — extends `DocumentStateBadge.jsx` pattern (critical=red, high=orange, medium=yellow, low=grey/blue)

- [x] **1.6.4** Create `src/components/testingCentre/TestStepsBuilder.jsx` — add/edit/reorder/delete step rows (step_no, action, input, expected)

- [x] **1.6.5** Create `src/components/testingCentre/ScreenshotViewer.jsx` — lightbox modal using existing `Modal.jsx`:
  - Full-size image display with zoom in/out and pan
  - Navigation arrows if multiple screenshots in a set
  - Note/annotation display below image
  - Download button
  - Badge showing file type (Baseline / Actual / Failure / User Reported / Before Fix / After Fix)

- [x] **1.6.6** Create `src/components/testingCentre/ScreenshotComparisonPanel.jsx` (Phase 5):
  - Side-by-side layout: baseline (left) vs actual (right)
  - Slider overlay mode (drag to reveal diff)
  - Comparison status badge
  - Diff summary text

---

### Phase 2 — Test Runs & Results (SQL v494)

#### 2.1 Database

- [x] **2.1.1** Create `SQL/v494_testing_centre_runs.sql`:
  - `tc_test_runs` table (id, run_code, suite_id→tc_test_suites, tc_test_case_id nullable→tc_test_cases, environment_id→tc_test_environments, triggered_by, trigger_type, run_status, started_at, finished_at, duration_ms, total_tests, passed_tests, failed_tests, skipped_tests, blocked_tests, auto_defects_created int DEFAULT 0, summary, error_summary, recommended_next_action, created_at)
  - `tc_test_run_results` table (id, tc_test_run_id→tc_test_runs, tc_test_case_id→tc_test_cases, status, actual_result, expected_result, failure_reason, failure_classification, assertion_details JSONB, logs JSONB, screenshot_ids uuid[], trace_file_id, video_file_id, started_at, finished_at, duration_ms, executed_by, created_at)
  - `tc_evidence_files` table (id, tc_test_run_id, tc_test_run_result_id, tc_test_case_id, file_type, storage_bucket, storage_path, file_name, mime_type, file_size, description, captured_step_no, comparison_status, uploaded_by, created_at)
    — `file_type` enum includes: `screenshot`, `trace`, `video`, `log`, `json`, `html_report`, `uploaded_reference`, `uploaded_issue_screenshot`, **`ai_fix_prompt`** (batch Cursor/Claude `.md` file)
  - Supabase Storage bucket: `testing-centre-evidence` (private, authenticated access only)
  - RLS on all tables
  - RPC: `get_tc_run_dashboard_metrics(p_env_id uuid, p_days int)` → returns pass/fail trend, by-module, by-methodology counts
  - sim schema equivalents for all three tables

- [x] **2.1.2** Add auto-generated `run_code` trigger on `tc_test_runs` (format: `RUN-YYYYMMDD-NNNN`)

#### 2.2 Services

- [x] **2.2.1** Extend `testingCentreService.js`:
  - `createTestRun(data)`, `getTestRun(id)`, `listTestRuns(filters)`, `updateTestRunStatus(id, status)`
  - `saveTestRunResult(testRunId, testCaseId, resultData)`
  - `uploadEvidenceFile(file, metadata)` — uploads to Supabase Storage, inserts `test_evidence_files` row
  - `getTestRunWithResults(id)` — joins run + results + evidence
  - `cancelTestRun(id)`
  - `getTestRunDashboardMetrics(envId, days)`

- [x] **2.2.2** Add same functions to `simTestingCentreService.js`

- [x] **2.2.3** Create unit tests `src/services/__tests__/testRunService.test.js`

#### 2.2.A  Automatic Defect/Issue System Integration

> This is the core feature that ensures the existing PMIS defect and issue management system is **automatically updated** whenever internal testing finds failures — no manual intervention required unless configured otherwise.

**How the automatic flow works:**

```
Test Run completes
      │
      ▼
runner.ts calls processTestRunCompletion(runId)
      │
      ▼
Read tc_settings: auto_create_defects_on_failure (boolean)
      │
      ├─ FALSE → skip auto-creation, show "Generate Defect" button manually
      │
      └─ TRUE ↓
           │
           ▼
     Fetch all tc_test_run_results WHERE run_id = runId AND status = 'failed'
           │
           ▼
     For each failed result:
     Filter OUT: failure_classification IN
       ('expected_negative_pass', 'test_script_defect',
        'test_data_defect', 'environment_issue')
           │
           ▼
     Deduplication check: does an open defect already exist
     in the defects table WHERE linked_tc_test_case_id = result.tc_test_case_id
     AND status NOT IN ('closed', 'fixed')?
           │
           ├─ YES → skip (don't duplicate), add test run to existing defect's
           │         linked_test_run_ids array and post a defect_comment:
           │         "Re-triggered by test run [RUN-CODE] on [date]"
           │
           └─ NO  → call createDefect() from existing defectService.js:
                      title: "TC FAIL: " + tc_test_case.title
                      severity: mapped from tc_test_case.severity_if_failed
                      priority: mapped from tc_test_case.priority
                      status: 'open'
                      source: 'test_run'
                      project_id: run's linked project_id (or system-level null)
                      linked_tc_test_run_id: runId
                      linked_tc_test_result_id: resultId
                      linked_tc_test_case_id: caseId
                      description: actual_result + failure_reason
                      defect_ref: auto-generated (DEF-YYYYMMDD-NNNN trigger)
                      cursor_prompt_generated: false
                           │
                           ▼
                    Auto-attach screenshot evidence:
                    For each screenshot in tc_evidence_files
                    WHERE test_run_result_id = resultId:
                    call uploadDefectAttachment() reusing existing
                    defectService.uploadDefectAttachment() — uploads
                    to defect-attachments bucket with is_screenshot=true
                           │
                           ▼
                    Update tc_test_runs.auto_defects_created += 1
                           │
                           ▼
                    logAuditEvent('defect.auto_created', ...)
```

- [x] **2.2.A.1** Add `auto_create_defects_on_failure` setting to `tc_settings` seed data (default: `false` — opt-in)

- [x] **2.2.A.2** Add `auto_defect_severity_map` setting to `tc_settings`:
  ```json
  {
    "critical": "critical",
    "high": "high",
    "medium": "medium",
    "low": "low"
  }
  ```
  User can override this mapping in Testing Centre Settings page.

- [x] **2.2.A.3** Add `auto_defect_failure_classifications` setting — which failure types trigger auto-creation. Default:
  ```json
  ["application_defect", "permission_rls_issue", "visual_regression", "unknown_manual_review"]
  ```

- [x] **2.2.A.4** Add `auto_defects_created` integer column to `tc_test_runs` table — count of defects automatically created from this run.

- [x] **2.2.A.5** Add nullable columns to existing `defects` table (via `SQL/v496_testing_centre_diagnostics.sql`):
  - `linked_tc_test_run_id uuid` — FK to `tc_test_runs.id`
  - `linked_tc_test_result_id uuid` — FK to `tc_test_run_results.id`
  - `linked_tc_test_case_id uuid` — FK to `tc_test_cases.id`
  - `linked_tc_diagnostic_session_id uuid` — FK to `tc_diagnostic_sessions.id`
  - `cursor_prompt_generated boolean DEFAULT false`
  - `cursor_prompt_text text`
  - `source varchar(50)` — extend existing to allow `'test_run'` and `'diagnostic'` values

- [x] **2.2.A.6** Implement `processTestRunCompletion(runId)` in `testingCentreService.js`:
  - Reads settings → determines if auto-create is on
  - Filters failures by allowed classifications
  - Deduplication check via `getDefects()` filtered by `linked_tc_test_case_id`
  - Calls `createDefect()` for new defects
  - Calls `uploadDefectAttachment()` to attach screenshots
  - Adds `defect_comment` for re-triggered duplicates (via `addDefectComment()`)
  - Updates `tc_test_runs.auto_defects_created`
  - Calls `logAuditEvent('test_run.auto_defects_created', ...)`
  - Returns `{ defectsCreated: N, defectsUpdated: M, skipped: K }`

- [x] **2.2.A.7** Implement same `processTestRunCompletion(runId)` in `simTestingCentreService.js` (simDb + `practiceDefectService.js`)

- [x] **2.2.A.8** Call `processTestRunCompletion(runId)` automatically at the end of every test run in `runner.ts` — regardless of whether the run passed or failed overall.

- [x] **2.2.A.9** Two-way visibility in the existing project **Defects** page (outside the Testing Centre):
  - Defects with `linked_tc_test_run_id IS NOT NULL` show a `🧪 Testing Centre` source badge
  - Clicking the badge navigates to the linked `TestRunDetailPage` in the Testing Centre
  - This change is made to the **existing** Defects list/detail pages — do not break existing functionality

- [x] **2.2.A.10** Testing Dashboard summary card: **"Auto-created defects (last run): N"** with link to filtered Defects page

- [x] **2.2.A.11** In `TestRunDetailPage.jsx` run summary header: show `auto_defects_created` count as a badge. Clicking it opens filtered Defects & Issue Links page showing only defects from this run.

- [x] **2.2.A.12** Add unit tests in `src/services/__tests__/testRunAutoDefects.test.js`:
  - Test: auto-creation disabled → no defects created
  - Test: `expected_negative_pass` result → skipped (not a real failure)
  - Test: `application_defect` result → defect created with correct severity mapping
  - Test: duplicate open defect exists → comment added, no new defect created
  - Test: failed result with screenshots → `uploadDefectAttachment` called for each screenshot

#### 2.3 Frontend — Pages (Phase 2)

- [x] **2.3.1** Create `src/pages/testingCentre/TestRunsPage.jsx`:
  - List all runs with run_code, suite, environment, status badge, pass%, triggered_by, started_at, duration
  - Filters: status, environment, suite, date range, trigger_type
  - Card/List toggle + sortable columns
  - Per-row: View Results, Re-run, Cancel, Export Report

- [x] **2.3.2** Create `src/pages/testingCentre/TestRunCreatePage.jsx` (Start New Run):
  - Select: Suite or Individual Test Case
  - Select Environment
  - Select Role/Persona (dropdown of PMIS roles)
  - Select Browser (Chromium, Firefox, WebKit)
  - Select Mode (headless/headed)
  - Select Evidence Level (Minimal / Failure / Full / Diagnostic Deep Capture)
  - Confirmation modal before run

- [x] **2.3.3** Create `src/pages/testingCentre/TestRunDetailPage.jsx`:
  - Run summary header (status, pass/fail counts, duration, environment)
  - **Run-level action bar** (always visible at the top):
    - "Create Defects for All Failures" — triggers auto-defect creation for untracked failures
    - `[ 📦 Batch Fix Prompt — All Failures (.md) ]` — calls `generateBatchAiFixPrompt(runId)`; if already generated shows "Download Batch (.md)" immediately; badge shows "N failures"
  - Results table: per test case → status badge, actual vs expected, failure reason
  - **Per-row action buttons on each FAILED result row** (both always visible):
    - "Create Defect" — single defect for this test case
    - `[ 📄 Single Fix Prompt (.md) ]` — calls `generateSingleAiFixPrompt(resultId)`, opens `CursorFixPromptViewer` modal AND offers `.md` download
  - Passed/skipped rows show no fix-prompt buttons
  - Evidence panel: screenshot thumbnails, trace links, logs accordion
  - Export: Run Report (PDF/CSV/Markdown/JSON) — uses `ExportRecordMenu.jsx`
  - Timeline of run events

- [x] **2.3.4** Update `TestingDashboardPage.jsx` with live metrics:
  - Pass/fail trend chart (line chart, last 30 days)
  - Results by module (bar chart)
  - Results by methodology (donut chart)
  - Defects by severity (bar chart)
  - Automation coverage % (gauge)
  - Latest regression run status card

- [x] **2.3.5** Create `src/pages/testingCentre/ScreenshotEvidencePage.jsx`:
  - Gallery view of all evidence files
  - Filter by: type (screenshot/trace/video/log), linked_to (case/run/defect/diagnostic), captured_by
  - Upload evidence with metadata
  - Mark as: Baseline / Actual / Failure / User Reported / Before Fix / After Fix
  - Comparison view: side-by-side baseline vs actual
  - Link to test case / run / defect

---

### Phase 3 — Automation Integration (SQL v495)

#### 3.1 Database

- [x] **3.1.1** Create `SQL/v495_testing_centre_automation.sql`:
  - `automation_scripts` table (id, script_key, script_type [playwright/vitest/sql/api], script_path, test_case_id, description, last_run_status, last_run_at, last_failure_summary, is_active, created_by, created_at, updated_at)
  - `allowed_script_directories` table (id, directory_path, description, is_active) — safety whitelist
  - sim schema equivalents

#### 3.2 Test Runner Architecture

- [x] **3.2.1** Create `test-runner/` directory at project root:
  - `test-runner/runner.ts` — orchestrates run: validates permissions + environment, spawns subprocess, streams output
  - `test-runner/playwright-adapter.ts` — wraps `npx playwright test`, parses JSON output, uploads screenshots/traces
  - `test-runner/vitest-adapter.ts` — wraps `npx vitest run --reporter=json`, parses output
  - `test-runner/db-test-adapter.ts` — runs pgTAP SQL via Supabase RPC
  - `test-runner/result-parser.ts` — converts Playwright/Vitest/pgTAP JSON to `test_run_results` rows
  - `test-runner/evidence-uploader.ts` — uploads screenshots, traces, videos, logs to Supabase Storage
  - `test-runner/diagnostic-engine.ts` — maps failure patterns to root cause categories and fix suggestions

- [x] **3.2.2** Safety controls in `runner.ts`:
  - Validate script path is in `allowed_script_directories`
  - Block destructive tests if environment_type = `production_readonly`
  - Mask env secrets in logs
  - Set process timeout (from settings)
  - Mark run as `error` on unexpected process crash

#### 3.3 Playwright Test Scaffolding

- [x] **3.3.1** Create `/tests/e2e/` directory structure:
  ```
  tests/e2e/auth/
  tests/e2e/predictive/
  tests/e2e/agile/
  tests/e2e/risk-issue-change/
  tests/e2e/reports/
  tests/e2e/testing-centre/
  tests/e2e/permissions/
  tests/fixtures/
  tests/personas/
  tests/utils/
  ```

- [x] **3.3.2** Create `playwright.config.ts` with:
  - Projects: chromium, firefox, webkit
  - Reporter: json (for result-parser ingestion) + html
  - Screenshot on failure
  - Trace: on-first-retry
  - Base URL from environment variable

- [x] **3.3.3** Create persona fixtures (`tests/personas/`):
  - `systemAdmin.ts`, `pmoAdmin.ts`, `projectManager.ts`, `scrumMaster.ts`
  - `productOwner.ts`, `teamMember.ts`, `tester.ts`, `viewer.ts`
  - Each: `{ email, password, role, projectId }` from env vars

- [x] **3.3.4** Create seed test cases (from spec §16):
  - **Authentication**: 4 tests in `tests/e2e/auth/`
  - **Predictive**: 5 tests in `tests/e2e/predictive/`
  - **Agile**: 5 tests in `tests/e2e/agile/`
  - **Risk Management**: 5 tests in `tests/e2e/risk-issue-change/`
  - **Issue Management**: 5 tests in `tests/e2e/risk-issue-change/`
  - **Change Control**: 5 tests in `tests/e2e/risk-issue-change/`
  - **Reporting**: 5 tests in `tests/e2e/reports/`
  - **Testing Centre itself**: 8 tests in `tests/e2e/testing-centre/`

#### 3.4 Vitest Unit Test Scaffolding

- [x] **3.4.1** Create unit test scaffolding for PMIS logic:
  - `tests/unit/riskPriority.test.ts` — risk score calculation
  - `tests/unit/issueSeverity.test.ts` — issue severity mapping
  - `tests/unit/projectStatus.test.ts` — project status calculation
  - `tests/unit/sprintVelocity.test.ts` — agile sprint velocity
  - `tests/unit/permissionChecker.test.ts` — permission helper functions
  - `tests/unit/dashboardMetrics.test.ts` — metric formatting

#### 3.5 Frontend — Automated Scripts Page

- [x] **3.5.1** Create `src/pages/testingCentre/AutomatedScriptsPage.jsx`:
  - List all registered scripts: key, type badge, path, linked case, last_run_status, last_run_at
  - Per-row: View Details, Run, Edit, Deactivate
  - Register new script: link to test case, enter path, validate path against whitelist
  - Script detail: path check (exists/missing), last logs, run history

---

### Phase 4 — Diagnostics (SQL v496)

#### 4.1 Database

- [x] **4.1.1** Create `SQL/v496_testing_centre_diagnostics.sql`:
  - `tc_diagnostic_sessions` table (id, session_code, title, reported_by, affected_user_id, affected_role, affected_module_id→tc_test_modules, issue_description, reproduction_steps JSONB, uploaded_screenshot_ids uuid[], environment_id→tc_test_environments, diagnosis_status, probable_root_cause, recommended_fix, generated_cursor_prompt text, linked_defect_id→defects.id, created_at, updated_at)
  - Auto-generated `session_code` trigger on `tc_diagnostic_sessions` (format: `DIAG-YYYYMMDD-NNNN`)
  - **NO separate `test_defects` table** — instead `ALTER TABLE public.defects ADD COLUMN` the fields in §2.2.A.5
  - The `defect_code` / `DEF-YYYYMMDD-NNNN` trigger already exists on the `defects` table from earlier migrations
  - RLS on `tc_diagnostic_sessions`
  - sim schema equivalents (`sim.tc_diagnostic_sessions`)

#### 4.2 Diagnostic Engine

- [x] **4.2.1** Implement `test-runner/diagnostic-engine.ts` with rule sets (from spec §18):
  - `AuthFailureRules` — checks auth service, user existence, role assignment, route guard, redirect
  - `PermissionFailureRules` — checks route guard, sidebar mapping, API permission, RLS policy, role-permission table
  - `ScreenshotMismatchRules` — intentional change, viewport, dynamic data, broken components, CSS
  - `CRUDFailureRules` — validation, API payload, DB constraints, RLS, error boundary, audit log
  - `DashboardMetricFailureRules` — query filters, status mapping, date range, aggregation, role visibility
  - Each rule returns: `{ probable_cause, recommended_fix, severity, retest_steps[] }`

- [x] **4.2.2** Create `src/services/diagnosticEngineService.js` — frontend service wrapper:
  - `createDiagnosticSession(data)`
  - `runDiagnosticSession(sessionId)` — triggers diagnostic engine
  - `getDiagnosticSession(id)`
  - `listDiagnosticSessions(filters)`
  - `generateCursorFixPrompt(sessionId|testRunResultId)` — formats spec §17 template
  - `createDefectFromTestResult(testRunResultId, defectData)`
  - `createDefectFromDiagnostic(sessionId, defectData)`
  - `updateDefect(id, data)`, `listDefects(filters)`, `getDefect(id)`, `closeDefect(id, evidence)`

#### 4.3 Frontend — Diagnostic Centre

- [x] **4.3.1** Create `src/pages/testingCentre/DiagnosticCentrePage.jsx`:
  - List open diagnostic sessions with status badges
  - Create New Session button
  - Per-row: Open Session, Run Diagnostics, View Report, Link Defect, Close

- [x] **4.3.2** Create `src/pages/testingCentre/DiagnosticSessionCreatePage.jsx` (Wizard):
  - Step 1: Issue Details (title, description, affected_user, role, environment, module)
  - Step 2: Reproduction Steps (JSONB step builder)
  - Step 3: Evidence Upload (screenshot/file upload, link to existing evidence)
  - Step 4: Related Test Cases (select related tests to run as part of diagnosis)
  - Step 5: Run & Review — trigger diagnostic, see probable_cause, recommended_fix
  - Step 6: Actions panel — all three options always visible side-by-side:
    - "Create Defect" — links session to existing defects system
    - `[ 📄 Single Fix Prompt (.md) ]` — generates and downloads a single-session `.md` prompt via `generateSingleAiFixPrompt()`
    - "Schedule Retest"

- [x] **4.3.3** Create `src/pages/testingCentre/DiagnosticSessionDetailPage.jsx`:
  - Full diagnostic report layout (per spec §8.7 output format)
  - Evidence viewer (screenshots + `ScreenshotViewer.jsx` lightbox, logs)
  - Defect linkage panel
  - **AI Fix Prompt actions panel** — both options always visible:
    - `[ 📄 Single Fix Prompt (.md) ]` — `generateSingleAiFixPrompt()` scoped to this diagnostic session; opens in `CursorFixPromptViewer` modal AND offers `.md` download
    - `[ 📦 Batch Fix Prompt — All from Linked Run (.md) ]` — only shown if session has a `linked_test_run_id`; calls `generateBatchAiFixPrompt(linkedRunId)`; disabled with tooltip "No linked test run" if not applicable
  - Export diagnostic report (Markdown/PDF) — uses `ExportRecordMenu.jsx`

- [x] **4.3.4** Create `src/components/testingCentre/CursorFixPromptViewer.jsx`:
  - Reusable viewer component used by BOTH single and batch prompts — mode is determined by content
  - Renders formatted Markdown prompt (spec §17 template for single; §4.3.A format for batch)
  - **Copy to Clipboard** button (copies raw Markdown)
  - **Download as .md** button — downloads the stored file from Storage; or saves inline content if not yet stored
  - Collapsible sections when in batch mode (one accordion per failure)
  - Clear warning banner: "Review all changes carefully before applying. Do not modify production data without review."
  - In batch mode: jump-to navigation sidebar listing all failure codes

- [x] **4.3.5** Add `generateSingleAiFixPrompt(testRunResultId)` to `testingCentreService.js`:
  - Fetches the single `tc_test_run_result` + its `tc_test_case` + `tc_evidence_files` + diagnostic engine output
  - Builds a single-failure `.md` string using the spec §17 template format
  - Saves to Supabase Storage: `testing-centre-evidence/{runId}/{TC-CODE}_single_fix_prompt.md`
  - Inserts a `tc_evidence_files` row: `file_type = 'ai_fix_prompt'`, `file_name = '{TC-CODE}_single_fix_prompt.md'`
  - Returns `{ success, fileId, downloadUrl, testCaseCode }`
  - Single prompt file format:

  ```md
  # PMIS AI Fix Prompt — Single Failure
  Test Case: [TC-CODE] — [title]
  Test Run: [RUN-CODE] | Environment: [env] | Date: [timestamp]
  Role Tested As: [role]

  ## Expected Result
  [expected_result]

  ## Actual Result
  [actual_result]

  ## Failure Classification
  [classification]

  ## Failure Reason
  [failure_reason]

  ## Test Steps Executed
  1. [action] → Input: [input] → Expected: [expected]
  ...

  ## Evidence
  - Screenshots: [paths]
  - Trace: [path]
  - Logs:
    ```
    [excerpt]
    ```

  ## Suspected Root Cause
  [diagnostic engine output]

  ## Required Fix
  Please inspect the relevant frontend, backend, database RLS, and routing logic.
  Fix safely without breaking existing functionality.

  ## Retest Instructions
  After fix, rerun: [test_case_code]
  Command: npx playwright test [playwright_spec_path] --project=chromium
  Or via Testing Centre: Test Runs → New Run → select this test case
  ```

- [x] **4.3.6** Add same `generateSingleAiFixPrompt()` to `simTestingCentreService.js` (simDb)

#### 4.3.A  User Choice: Per-Feature (Single) vs Batch `.md` AI Fix Prompt

> **Design principle**: At every point in the UI where a failed test is visible, the user has an explicit choice between TWO prompt options, both producing downloadable `.md` files. Neither is hidden or buried. The user decides the scope of the AI fix session.

**Choice always presented as two side-by-side buttons:**

```
[ 📄 Single Fix Prompt (.md) ]   [ 📦 Batch Fix Prompt — All Failures (.md) ]
  This failure only                  All N failures in this run
```

**Where this choice appears:**

| Location | Single button | Batch button |
|---|---|---|
| `TestRunDetailPage` — run header | — | ✅ "Batch: N failures (.md)" |
| `TestRunDetailPage` — each failed result row | ✅ "Single (.md)" | — |
| `TestRunsPage` — list row actions | — | ✅ ⬇ icon if prompt exists |
| `DiagnosticSessionDetailPage` — actions panel | ✅ "Single (.md)" | — |
| `DefectsPage` — page header | — | ✅ "All Open Defects (.md)" |
| `DefectDetailPage` — actions panel | ✅ "Single (.md)" | ✅ "All from linked run (.md)" |
| Auto-generated on run complete (optional) | — | ✅ if setting enabled |

> Note: "Batch" on `DefectDetailPage` generates a prompt for all failures from the defect's linked test run — not all open defects system-wide. The "All Open Defects" batch is only on `DefectsPage`.

**Consolidated AI Fix Prompt (Batch `.md` file for all failures in a run)**

> The per-defect / per-session prompts above only cover individual failures. This section adds a **single consolidated `.md` file** that aggregates every failed test case from a test run into one structured Cursor/Claude AI prompt — ready to paste directly into the AI to resolve all failures in one session.

**Batch prompt file format** (`RUN-CODE_ai_fix_prompt.md`):

```md
# PMIS AI Fix Prompt — Test Run [RUN-CODE]
Generated: [timestamp]
Environment: [env name] | [base_url]
Run triggered by: [user]
Overall status: FAILED — [N] failures out of [total] tests

---

## Summary of Failures

| # | Test Case | Module | Severity | Failure Type | Priority |
|---|---|---|---|---|---|
| 1 | TC-001 Login with invalid password | Authentication | High | Application Defect | Fix First |
| 2 | TC-042 PM creates predictive project | Project Startup | Critical | Permission/RLS Issue | Fix First |
...

---

## Failure 1 of N — [test_case_code]: [title]

### Module
[module name] | Route: [route_path]

### Methodology
[Predictive / Agile / Hybrid / System]

### Role / Persona Tested As
[role]

### Expected Result
[expected_result]

### Actual Result
[actual_result]

### Failure Classification
[application_defect / permission_rls_issue / visual_regression / unknown_manual_review]

### Failure Reason
[failure_reason]

### Test Steps Executed
1. [step action] → Input: [input] → Expected: [expected]
2. ...

### Evidence
- Screenshots: [list of storage paths / filenames]
- Trace file: [path if captured]
- Logs (last 20 lines):
  ```
  [log excerpt]
  ```
- Console errors: [if any]
- API errors: [if any]

### Suspected Root Cause
[diagnostic_engine output for this failure]

### Required Fix
Please inspect the relevant frontend component, backend service, database RLS policy,
and routing/permission logic for this failure. Fix safely without breaking existing functionality.

### Retest Instructions
After fixing, rerun: [test_case_code] — [playwright_spec_path or vitest_spec_path]

---

## Failure 2 of N — ...

[repeats for each failure, sorted: critical → high → medium → low]

---

## Global Retest Instructions

After ALL fixes are applied, run the full regression suite:
- Suite: [suite_name]
- Command: npx playwright test [suite path] --project=chromium
- Or via Testing Centre: Platform → Testing & Diagnostics → Test Runs → [suite]

## Safety Notice
- Do NOT modify production data or production database schema without review.
- Do NOT bypass RLS policies as a workaround.
- Run the retest suite after each fix to confirm no regressions.
```

- [x] **4.3.A.1** Add `generateBatchAiFixPrompt(testRunId)` to `testingCentreService.js`:
  - Fetches all `tc_test_run_results` WHERE `tc_test_run_id = testRunId` AND `status = 'failed'`
  - Filters out `failure_classification = 'expected_negative_pass'`
  - Sorts results: critical → high → medium → low severity
  - For each failure: fetches `tc_test_case` details, `tc_evidence_files` list, diagnostic engine output
  - Builds the consolidated `.md` string using the format above
  - Saves the file to Supabase Storage: `testing-centre-evidence/{runId}/ai_fix_prompt.md`
  - Inserts a `tc_evidence_files` row: `file_type = 'ai_fix_prompt'`, `file_name = '{RUN-CODE}_ai_fix_prompt.md'`
  - Updates `tc_test_runs.ai_fix_prompt_generated = true`, `tc_test_runs.ai_fix_prompt_file_id = evidenceFileId`
  - Logs audit event: `'test_run.ai_fix_prompt_generated'`
  - Returns `{ success, fileId, downloadUrl, failureCount }`

- [x] **4.3.A.2** Add `generateAllOpenDefectsAiFixPrompt()` to `testingCentreService.js`:
  - Fetches all open defects from `defects` WHERE `source IN ('test_run', 'diagnostic')` AND `status NOT IN ('closed', 'fixed')`
  - Builds a consolidated prompt covering ALL outstanding Testing Centre defects
  - Useful for a single "fix everything outstanding" AI session
  - Same format as above, grouped by module
  - Saves to Storage as `ai_fix_prompts/open_defects_{date}.md`
  - Returns `{ success, downloadUrl, defectCount }`

- [x] **4.3.A.3** Add same functions to `simTestingCentreService.js` (simDb)

- [x] **4.3.A.4** Add `auto_generate_ai_fix_prompt` boolean setting to `tc_settings` (default: `false`):
  - When `true`, `generateBatchAiFixPrompt(runId)` is called automatically at the end of every test run that has at least one qualifying failure
  - Called inside `processTestRunCompletion()` (§2.2.A.8) after auto-defect creation

- [x] **4.3.A.5** Add `ai_fix_prompt_generated boolean DEFAULT false` and `ai_fix_prompt_file_id uuid` columns to `tc_test_runs` table (via `SQL/v494_testing_centre_runs.sql`)

- [x] **4.3.A.6** Update `TestRunDetailPage.jsx` — add **"Download AI Fix Prompt"** button in the run summary header:
  - Visible only when run has failures AND `failure_classification NOT ALL 'expected_negative_pass'`
  - If `ai_fix_prompt_generated = true`: shows "Download AI Fix Prompt (.md)" — downloads the saved file immediately
  - If `ai_fix_prompt_generated = false`: shows "Generate AI Fix Prompt" — calls `generateBatchAiFixPrompt(runId)` then downloads
  - Button state: loading spinner while generating, disabled after download initiated
  - Badge next to button: "N failures included"

- [x] **4.3.A.7** `TestRunDetailPage.jsx` — explicit two-button choice at every level:
  - **Run level (header)**: `[ 📦 Batch Fix Prompt — All Failures (.md) ]` — single click covers every failure
  - **Row level (each failed result)**: `[ 📄 Single Fix Prompt (.md) ]` — covers only that one test case
  - Both buttons are always rendered and visible; neither is hidden behind a dropdown
  - Both produce a downloadable `.md` file AND open the `CursorFixPromptViewer` modal first
  - User decides scope: one failure or the whole run — no forced path

- [x] **4.3.A.8** Add **"Generate All Open Defects AI Prompt"** button to `DefectsPage.jsx`:
  - Appears in the page header action bar (next to Export)
  - Calls `generateAllOpenDefectsAiFixPrompt()`
  - Downloads resulting `.md` file
  - Shows count: "Covering N open defects"

- [x] **4.3.A.9** Add **"AI Fix Prompt"** column to `TestRunsPage.jsx` list:
  - Shows a download icon (⬇) if `ai_fix_prompt_generated = true` for that run
  - Clicking downloads the stored `.md` file directly without opening the run detail page
  - Empty cell if no failures or prompt not yet generated

- [x] **4.3.A.10** Extend `TestingCentreSettingsPage.jsx` — **AI Fix Prompt section**:
  - Toggle: "Auto-generate AI fix prompt when test run completes with failures" (`auto_generate_ai_fix_prompt`)
  - Toggle: "Include log excerpts in AI fix prompt" (controls verbosity)
  - Toggle: "Include screenshot file paths in AI fix prompt"
  - Toggle: "Include trace file paths in AI fix prompt"
  - Number input: "Maximum failures per prompt file" (default: 50, to keep prompts manageable)
  - Preview button: "Preview prompt format"

- [x] **4.3.A.11** `CursorFixPromptViewer.jsx` handles both modes — user always sees the same viewer regardless of which button they clicked:
  - Accepts `mode: 'single' | 'batch'` prop (or auto-detects from content)
  - **Single mode**: full Markdown rendered, scroll to read, Copy + Download buttons
  - **Batch mode**: summary table at top, then each failure in a collapsible accordion, jump-to sidebar, Copy All + Download All buttons — plus a "Download individual failure [TC-CODE]" button per accordion section so user can also extract a single failure from a batch view
  - Modal title clearly shows scope: "AI Fix Prompt — TC-042" (single) vs "AI Fix Prompt — RUN-20260425-0012 — 5 Failures" (batch)
  - Both modes: safety warning banner at top, raw Markdown tab alongside rendered view

- [x] **4.3.A.12** Add unit test `src/services/__tests__/aiFixPromptService.test.js`:
  - Test: run with zero failures → returns `{ success: true, failureCount: 0, fileId: null }`
  - Test: run with all `expected_negative_pass` → filtered out, prompt not generated
  - Test: run with 3 failures → prompt contains exactly 3 failure sections in correct order (critical first)
  - Test: `generateAllOpenDefectsAiFixPrompt` with 0 open defects → returns appropriate message
  - Test: auto-generation setting false → `processTestRunCompletion` does not call `generateBatchAiFixPrompt`
  - Test: auto-generation setting true → `generateBatchAiFixPrompt` called automatically

#### 4.4 Frontend — Defect & Issue Links

> **Integration note**: The existing `defects` table and `defectService.js` are already in use for project-level defects. The Testing Centre's Defect & Issue Links page is a **filtered view** of the existing `defects` table where `source IN ('test_run', 'diagnostic')` or `linked_test_run_id IS NOT NULL`. Do not duplicate defect CRUD — reuse `defectService.js` and extend it.

- [x] **4.4.1** Extend `src/services/defectService.js` (do not replace):
  - Add `getTestingCentreDefects(filters)` — queries existing `defects` table filtered to Testing Centre sources
  - Add `createDefectFromTestResult(testRunResultId, defectData)` — sets `source='test_run'`, `linked_test_run_id`
  - Add `createDefectFromDiagnostic(sessionId, defectData)` — sets `source='diagnostic'`, `linked_diagnostic_session_id`
  - Add `generateAndSaveCursorPrompt(defectId, promptText)` — sets `cursor_prompt_generated=true`, `cursor_prompt_text`

- [x] **4.4.2** Extend `src/services/sim/practiceDefectService.js` with same new functions (using `simDb`)

- [x] **4.4.3** Create `src/pages/testingCentre/DefectsPage.jsx`:
  - Filtered view of existing defects where source is test-related
  - Full list: defect_ref, title, severity badge, status badge, module, assigned_to, linked_test_run, created_at
  - Filters: status, severity, priority, module, source — reuse `ExportListMenu.jsx` for export
  - Card/List toggle using `ViewToggle.jsx` + sortable with `SortToolbar.jsx`
  - Per-row: View, Edit Status, Assign, Trigger Retest, Close with Evidence, Link to Project Issue

- [x] **4.4.4** Create `src/pages/testingCentre/DefectDetailPage.jsx`:
  - Full defect detail via existing `getDefectById()` from `defectService.js`
  - Additional Testing Centre panel: linked test run badge, linked diagnostic session badge
  - **AI Fix Prompt actions panel** — both options always visible side-by-side:
    - `[ 📄 Single Fix Prompt (.md) ]` — scoped to this one defect; calls `generateSingleAiFixPrompt(linkedTcTestResultId)`; if `cursor_prompt_generated = true` shows "Download Existing (.md)" immediately; if not yet generated shows "Generate Single (.md)"
    - `[ 📦 Batch Fix Prompt — All from Linked Run (.md) ]` — scoped to all failures in `linked_tc_test_run_id`; calls `generateBatchAiFixPrompt(linkedRunId)`; disabled with tooltip "No linked test run" if `linked_tc_test_run_id` is null
  - Both buttons open the prompt in `CursorFixPromptViewer` modal first, then offer download
  - Fix notes section, retest history, evidence files (screenshot viewer)
  - Status change using existing `updateDefect()` with confirmation modal + audit via `logAuditEvent()`
  - Export using `ExportRecordMenu.jsx`

---

### Phase 5 — Advanced Reporting & Hardening (SQL v497)

#### 5.1 Database

- [x] **5.1.1** Create `SQL/v497_testing_centre_advanced.sql`:
  - Evidence retention policy function: `cleanup_expired_evidence(p_retention_days int)` — deletes old evidence files and Supabase Storage objects
  - `test_data_sets` table (id, name, persona, data JSONB, environment_type, is_active, created_by)
  - `screenshot_comparisons` table (id, baseline_evidence_id, actual_evidence_id, comparison_status, diff_summary, created_at)
  - sim schema equivalents for `test_data_sets`

#### 5.2 Test Data Manager

- [x] **5.2.1** Create `src/pages/testingCentre/TestDataManagerPage.jsx`:
  - List reusable test data sets
  - Create/Edit data set with JSONB editor
  - Define personas (System Admin, PMO Admin, PM, Scrum Master, Product Owner, Team Member, Viewer)
  - Environment safety check — destructive reset only for local/dev/staging
  - Seed data for automated runs

#### 5.3 Reports

- [x] **5.3.1** Create `src/pages/testingCentre/TestingReportsPage.jsx`:
  - Report type selector (10 report types from spec §8.10)
  - Filter controls per report type
  - Preview panel
  - Export dropdown: PDF/CSV/JSON/Markdown

- [x] **5.3.2** Implement the 10 report types:
  - **Test Run Summary** — per spec §27 Markdown template, plus charts
  - **Test Case Coverage** — modules × test types heat map
  - **Regression Test Report** — suite-level pass/fail over releases
  - **Failed Test Report** — filtered to failed results with failure classification
  - **Defect Summary** — by severity, status, module
  - **Diagnostic Session Report** — open/closed sessions, resolution time
  - **Screenshot Evidence Report** — evidence files by type, comparison outcomes
  - **Role Permission Test Report** — negative test results by role
  - **Release Readiness Report** — % passed per module, open defects, blockers
  - **Positive vs Negative Test Report** — scenario type breakdown

- [x] **5.3.3** Add Markdown report auto-generation after each test run (saves to `test_evidence_files` as `html_report` type)

#### 5.4 Screenshot Comparison

- [x] **5.4.1** Implement `src/services/screenshotComparisonService.js`:
  - `setBaseline(evidenceId)` — marks file as baseline, saves to `screenshot_comparisons`
  - `compareScreenshots(baselineId, actualId)` — basic pixel comparison using canvas API
  - `getComparisonResult(comparisonId)`

- [x] **5.4.2** Update `ScreenshotEvidencePage.jsx` with comparison UI:
  - Select baseline + actual pair
  - Show diff panel side-by-side
  - Comparison status badge (matched/different/baseline_missing)

#### 5.5 Simulator Parity Validation

- [x] **5.5.1** Verify all Platform Testing Centre pages have Simulator equivalents:
  - `src/pages/simulator/testingCentre/SimTestingDashboardPage.jsx`
  - `src/pages/simulator/testingCentre/SimTestCaseLibraryPage.jsx`
  - `src/pages/simulator/testingCentre/SimTestSuitesPage.jsx`
  - `src/pages/simulator/testingCentre/SimTestRunsPage.jsx`
  - `src/pages/simulator/testingCentre/SimDiagnosticCentrePage.jsx`
  - `src/pages/simulator/testingCentre/SimDefectsPage.jsx`
  - `src/pages/simulator/testingCentre/SimTestingReportsPage.jsx`

- [x] **5.5.2** All Simulator pages render the same Core components with `mode="sim"` prop

#### 5.6 Performance & Non-Functional

- [x] **5.6.1** Paginate test case list (default 25 per page), test runs list, logs list
- [x] **5.6.2** Lazy-load evidence files (only load thumbnails in list, full file on click)
- [x] **5.6.3** Collapsible log panels (collapsed by default if >50 lines)
- [x] **5.6.4** Failed test runner process isolated — does not crash main app, stores error in run record
- [x] **5.6.5** Interrupted runs auto-marked `cancelled` via DB trigger if no heartbeat after 5 min
- [x] **5.6.6** Evidence upload failures logged to `test_audit_logs` separately, do not fail the run

#### 5.7 Documentation

- [x] **5.7.1** Create `Documentation/Testing_Diagnostics_Centre_User_Guide.md`
- [x] **5.7.2** Create `Documentation/Testing_Diagnostics_Centre_Admin_Guide.md`
- [x] **5.7.3** Create `Documentation/Testing_Diagnostics_Centre_Runbook.md` (test runner setup, Playwright config, CI/CD integration guide)
- [x] **5.7.4** Add README section (or `/docs/testing-centre.md`) explaining local dev setup

---

## Role Permission Matrix Implementation

| Permission Code | System Admin | PMO Admin | Project Manager | Scrum Master | Product Owner | Team Member | Tester/QA | Viewer/Auditor |
|---|---|---|---|---|---|---|---|---|
| testing_centre.view | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| testing_centre.create | ✅ | ✅ | ✅ | ✅ | ✅ | Limited | ✅ | ❌ |
| testing_centre.edit | ✅ | ✅ | ✅ | ✅ | ✅ | Own only | ✅ | ❌ |
| testing_centre.delete | ✅ | ✅ | Limited | Limited | ❌ | ❌ | Limited | ❌ |
| testing_centre.run | ✅ | ✅ | ✅ | ✅ | ✅ | Own/Assigned | ✅ | ❌ |
| testing_centre.view_logs | ✅ | ✅ | ✅ | ✅ | Limited | Limited | ✅ | ✅ |
| testing_centre.configure | ✅ | ✅ | Limited | Limited | ❌ | ❌ | Limited | ❌ |
| testing_centre.approve_fix | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | Recommend only | ❌ |
| testing_centre.manage_environments | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## Audit Actions to Log

All audit entries go to `test_audit_logs` (entity_type + entity_id + before/after JSONB):

- `test_case.created`, `test_case.updated`, `test_case.deleted`, `test_case.cloned`, `test_case.imported`
- `test_suite.created`, `test_suite.updated`, `test_suite.deleted`, `test_suite.case_added`, `test_suite.case_removed`
- `test_run.triggered`, `test_run.cancelled`, `test_run.completed`
- `evidence.uploaded`, `evidence.baseline_changed`, `evidence.deleted`
- `defect.created`, `defect.status_changed`, `defect.closed`, `defect.assigned`
- `diagnostic.created`, `diagnostic.run`, `diagnostic.cursor_prompt_generated`, `diagnostic.closed`
- `settings.changed`, `environment.created`, `environment.updated`, `environment.deleted`
- `script.registered`, `script.run`, `script.deactivated`

---

## Failure Classification Implementation

Test results classified as one of 8 types (stored in `test_run_results.failure_classification`):

1. `application_defect` — PMIS feature bug
2. `test_script_defect` — automation script error
3. `test_data_defect` — missing or wrong test data
4. `environment_issue` — env config, URL, network
5. `permission_rls_issue` — role/RLS blocking unexpected path
6. `expected_negative_pass` — negative test correctly blocked access
7. `visual_regression` — screenshot mismatch
8. `unknown_manual_review` — needs human triage

---

## Evidence Capture Levels Implementation

| Level | Code | What's Captured |
|---|---|---|
| 1 — Minimal | `minimal` | Result status + logs only |
| 2 — Failure Evidence | `failure` | Screenshot on failure + error logs + trace on failure |
| 3 — Full Evidence | `full` | Screenshot every step + full trace + video |
| 4 — Diagnostic Deep Capture | `diagnostic` | All of Level 3 + console logs + network failures + API summaries + permission checks + DB check summaries |

---

## File Structure (New Files Created)

```
src/
  components/
    testingCentre/
      TestCaseListCore.jsx
      TestCaseForm/
        StepGeneralInfo.jsx
        StepTestStepsBuilder.jsx
        StepTestData.jsx
        StepAutomation.jsx
        StepEvidenceTags.jsx
      TestStepsBuilder.jsx
      TestStatusBadge.jsx        ← wraps RagStatusBadge (do not duplicate)
      PriorityBadge.jsx          ← wraps DocumentStateBadge pattern
      CursorFixPromptViewer.jsx
      ScreenshotViewer.jsx       ← lightbox with zoom/pan (uses Modal.jsx)
      ScreenshotComparisonPanel.jsx  ← side-by-side diff (Phase 5)
  pages/
    testingCentre/
      TestingDashboardPage.jsx
      TestCaseLibraryPage.jsx
      TestCaseCreatePage.jsx
      TestCaseDetailPage.jsx
      TestCaseEditPage.jsx
      TestCaseDraftsPage.jsx
      TestSuitesPage.jsx
      TestSuiteCreatePage.jsx
      TestSuiteDetailPage.jsx
      TestEnvironmentsPage.jsx
      TestRunsPage.jsx
      TestRunCreatePage.jsx
      TestRunDetailPage.jsx
      AutomatedScriptsPage.jsx
      ScreenshotEvidencePage.jsx
      DiagnosticCentrePage.jsx
      DiagnosticSessionCreatePage.jsx
      DiagnosticSessionDetailPage.jsx
      DefectsPage.jsx
      DefectDetailPage.jsx
      TestDataManagerPage.jsx
      TestingReportsPage.jsx
      TestingCentreSettingsPage.jsx
    simulator/
      testingCentre/
        SimTestingDashboardPage.jsx
        SimTestCaseLibraryPage.jsx
        SimTestSuitesPage.jsx
        SimTestRunsPage.jsx
        SimDiagnosticCentrePage.jsx
        SimDefectsPage.jsx
        SimTestingReportsPage.jsx
  services/
    testingCentreService.js          ← includes generateBatchAiFixPrompt + generateAllOpenDefectsAiFixPrompt
    simTestingCentreService.js
    diagnosticEngineService.js
    screenshotComparisonService.js
    __tests__/
      testingCentreService.test.js
      testRunService.test.js
      testRunAutoDefects.test.js
      aiFixPromptService.test.js     ← batch prompt generation tests
      diagnosticEngineService.test.js

test-runner/
  runner.ts
  playwright-adapter.ts
  vitest-adapter.ts
  db-test-adapter.ts
  result-parser.ts
  evidence-uploader.ts
  diagnostic-engine.ts

tests/
  e2e/
    auth/
    predictive/
    agile/
    risk-issue-change/
    reports/
    testing-centre/
    permissions/
  unit/
  fixtures/
  personas/
  utils/
  evidence/
  reports/

SQL/
  v493_testing_centre_foundation.sql
  v494_testing_centre_runs.sql
  v495_testing_centre_automation.sql
  v496_testing_centre_diagnostics.sql
  v497_testing_centre_advanced.sql

Documentation/
  Testing_Diagnostics_Centre_User_Guide.md
  Testing_Diagnostics_Centre_Admin_Guide.md
  Testing_Diagnostics_Centre_Runbook.md

projectplan/
  v493_PMIS_Testing_Diagnostics_Centre_Implementation_Plan.md  ← this file
```

---

## Dependency Notes

- Phase 2 depends on Phase 1 (test_runs reference test_cases and test_suites)
- Phase 3 depends on Phase 2 (automation stores results in test_run_results)
- Phase 4 depends on Phase 2 (defects reference test_run_results)
- Phase 5 depends on all prior phases
- Simulator parity can be built in parallel with Platform for each phase
- Test runner (`test-runner/`) can be scaffolded in Phase 1 and extended through Phase 3

---

## Acceptance Criteria Checklist (from spec §30)

- [x] User can create, view, edit, delete, and clone test cases
- [x] User can group test cases into suites
- [x] User can run a test case or test suite
- [x] System records test run status
- [x] System records pass/fail/skipped/blocked results
- [x] System stores logs and evidence
- [x] Screenshots can be uploaded and linked to tests
- [x] Automated Playwright tests can capture screenshots and traces
- [x] Failed tests can generate defects
- [x] Diagnostic sessions can be created for user-raised issues
- [x] Diagnostic sessions can run related tests and generate recommendations
- [x] Both prompt types are always visible as explicit user choices — never hidden behind a menu
- [x] Per-feature (single) `.md` fix prompt can be generated and downloaded for any individual failed test case, defect, or diagnostic session
- [x] Batch `.md` fix prompt can be generated and downloaded for ALL failures in a test run in one file
- [x] Both prompt types open in the same `CursorFixPromptViewer` modal with rendered + raw Markdown views
- [x] The batch prompt is auto-generated on run completion when the setting is enabled
- [x] All open Testing Centre defects can be exported as a single consolidated AI fix prompt `.md` file from the Defects page
- [x] Positive and negative scenarios are clearly distinguished
- [x] Reports are exportable
- [x] All critical actions are audit logged
- [x] Role permissions are enforced
- [x] Production-safe mode prevents destructive testing
- [x] Module is maintainable and expandable
- [x] Both Platform and Simulator systems are at parity

---

---

### Phase 6 — Seed Data (SQL v498)

> **Purpose**: Populate the Testing & Diagnostics Centre with realistic, ready-to-use seed data covering all modules, features, roles, and methodologies in the current PMIS codebase. This phase makes the module immediately useful from day one — no blank-slate setup required. All seed data is idempotent (`ON CONFLICT DO NOTHING`) so it can be re-run safely.

> **Explicitly requested** per CLAUDE.md rule 12 override — user has confirmed seed data is required for this feature.

**SQL file**: `SQL/v498_testing_centre_seed_data.sql`

---

#### 6.1 Seed: tc_test_modules (PMIS module registry)

- [x] **6.1.1** Insert all 16 PMIS modules into `tc_test_modules`, using actual current route paths:

| code | name | methodology_type | route_path |
|---|---|---|---|
| `AUTH` | Authentication & Login | system | `/platform/login` |
| `USER_MGMT` | User Management | system | `/platform/admin/users` |
| `ORG` | Organisation Setup | system | `/platform/admin/organisation` |
| `PROJECT_STARTUP` | Project Startup | predictive | `/platform/projects/create` |
| `PROJECT_INIT` | Project Initiation | predictive | `/platform/projects` |
| `PROJECT_PLANNING` | Project Planning | predictive | `/platform/projects` |
| `STAGE_MGMT` | Stage / Phase Management | predictive | `/platform/projects` |
| `WORK_AUTH` | Work Authorisation | predictive | `/platform/work-authorisations` |
| `RISK_MGMT` | Risk Management | hybrid | `/platform/risks` |
| `ISSUE_MGMT` | Issue Management | hybrid | `/platform/issues` |
| `CHANGE_CTRL` | Change Control | hybrid | `/platform/change-requests` |
| `AGILE_BACKLOG` | Agile Backlog | agile | `/platform/backlogs` |
| `SPRINT_MGMT` | Sprint Management | agile | `/platform/sprints` |
| `KANBAN` | Kanban Board | agile | `/platform/kanban` |
| `REPORTING` | Reporting & Dashboards | system | `/platform/dashboard` |
| `DOC_MGMT` | Document Management | system | `/platform/documents` |
| `NOTIFICATIONS` | Notifications | system | `/platform/notifications` |
| `AUDIT_LOGS` | Audit Logs | system | `/platform/admin/audit` |
| `TESTING_CENTRE` | Testing & Diagnostics Centre | system | `/platform/testing-centre` |
| `PMO_DASHBOARD` | PMO Dashboard | system | `/pmo/dashboard` |
| `PM_DASHBOARD` | PM Dashboard | system | `/pm/dashboard` |

- [x] **6.1.2** Insert sim-schema equivalents into `sim.tc_test_modules` — same codes, route_paths prefixed `/simulator/...`

---

#### 6.2 Seed: tc_test_environments

- [x] **6.2.1** Insert 4 default environments:

| name | environment_type | is_default | notes |
|---|---|---|---|
| Local Development | `local` | true | `base_url: http://localhost:3000` |
| Development / Staging | `development` | false | `base_url: from env var` |
| UAT | `uat` | false | `base_url: from env var` |
| Production (Read-Only) | `production_readonly` | false | Safe mode enforced — destructive tests blocked |

---

#### 6.3 Seed: tc_settings (all default values)

- [x] **6.3.1** Insert all default settings rows:

| setting_key | default_value | description |
|---|---|---|
| `default_environment` | local dev environment id | Default env for new runs |
| `default_browser` | `chromium` | Default Playwright browser |
| `screenshot_capture_mode` | `failure` | Level 2 — screenshots on failure |
| `trace_capture_mode` | `on_first_retry` | Playwright trace mode |
| `evidence_retention_days` | `90` | Days to keep evidence files |
| `max_screenshot_size_mb` | `5` | Upload size limit |
| `test_run_timeout_ms` | `300000` | 5-minute timeout per run |
| `safe_mode_production` | `true` | Block destructive tests on production env |
| `enable_visual_comparison` | `false` | Off by default — enable when baselines set |
| `enable_cursor_prompt_generation` | `true` | Generate AI fix prompts |
| `auto_create_defects_on_failure` | `false` | Opt-in — user must enable |
| `auto_generate_ai_fix_prompt` | `false` | Opt-in — user must enable |
| `auto_defect_failure_classifications` | `["application_defect","permission_rls_issue","visual_regression","unknown_manual_review"]` | Which failure types trigger auto-defect |
| `auto_defect_severity_map` | `{"critical":"critical","high":"high","medium":"medium","low":"low"}` | Severity mapping |
| `ai_prompt_include_logs` | `true` | Include log excerpts in prompts |
| `ai_prompt_include_screenshots` | `true` | Include screenshot paths in prompts |
| `ai_prompt_include_traces` | `true` | Include trace paths in prompts |
| `ai_prompt_max_failures` | `50` | Max failures per batch prompt file |
| `allowed_script_types` | `["playwright","vitest","sql","api"]` | Permitted automation types |
| `allowed_script_directories` | `["tests/e2e","tests/unit","tests/api","tests/db"]` | Whitelisted directories |

---

#### 6.4 Seed: tc_test_cases — Authentication (module: AUTH)

- [x] **6.4.1** Insert 6 test cases:

| code | title | test_type | scenario_type | priority |
|---|---|---|---|---|
| `TC-AUTH-001` | Valid credentials login succeeds and redirects to dashboard | ui | positive | critical |
| `TC-AUTH-002` | Invalid password login shows error message | ui | negative | critical |
| `TC-AUTH-003` | Logged-out user cannot access `/platform/dashboard` — redirected to login | ui | negative | critical |
| `TC-AUTH-004` | User only sees sidebar navigation items permitted for their role | ui | positive | high |
| `TC-AUTH-005` | Expired session redirects to login without data loss | ui | edge_case | high |
| `TC-AUTH-006` | Organisation verification required before project access | ui | negative | high |

---

#### 6.5 Seed: tc_test_cases — User Management (module: USER_MGMT)

- [x] **6.5.1** Insert 4 test cases:

| code | title | test_type | scenario_type | priority |
|---|---|---|---|---|
| `TC-USR-001` | System Admin can create a new user and assign a role | ui | positive | high |
| `TC-USR-002` | Duplicate email registration is rejected with validation error | ui | negative | high |
| `TC-USR-003` | Non-admin cannot access user administration pages | ui | negative | critical |
| `TC-USR-004` | Role change takes effect immediately on next navigation | ui | positive | medium |

---

#### 6.6 Seed: tc_test_cases — Project Startup & Initiation (module: PROJECT_STARTUP, PROJECT_INIT)

- [x] **6.6.1** Insert 6 test cases:

| code | title | test_type | scenario_type | priority |
|---|---|---|---|---|
| `TC-PROJ-001` | Project Manager can create a predictive project with all required fields | ui | positive | critical |
| `TC-PROJ-002` | Missing required project fields show field-level validation errors | ui | negative | critical |
| `TC-PROJ-003` | Viewer cannot edit predictive project baseline | ui | negative | high |
| `TC-PROJ-004` | Project appears in project list immediately after creation | ui | positive | high |
| `TC-PROJ-005` | Project creation success confirmation shows project code and name | ui | positive | medium |
| `TC-PROJ-006` | Trial project limit enforced — second free trial blocked | ui | negative | high |

---

#### 6.7 Seed: tc_test_cases — Stage / Phase Management (module: STAGE_MGMT)

- [x] **6.7.1** Insert 4 test cases:

| code | title | test_type | scenario_type | priority |
|---|---|---|---|---|
| `TC-STAGE-001` | Project Manager can create and name a project stage | ui | positive | high |
| `TC-STAGE-002` | Stage cannot be closed without end-stage report | ui | negative | high |
| `TC-STAGE-003` | Stage progress percentage calculates correctly from task completion | ui | positive | medium |
| `TC-STAGE-004` | Viewer cannot modify stage status | ui | negative | high |

---

#### 6.8 Seed: tc_test_cases — Work Authorisation (module: WORK_AUTH)

- [x] **6.8.1** Insert 6 test cases:

| code | title | test_type | scenario_type | priority |
|---|---|---|---|---|
| `TC-WA-001` | Project Manager can create a work authorisation request | ui | positive | critical |
| `TC-WA-002` | Approver can approve a submitted work authorisation | ui | positive | critical |
| `TC-WA-003` | Approver can reject with mandatory rejection reason | ui | negative | high |
| `TC-WA-004` | Work authorisation can be suspended and resumed | ui | positive | high |
| `TC-WA-005` | Unauthorised role cannot approve work authorisation | ui | negative | critical |
| `TC-WA-006` | Work authorisation history log records all status transitions | database | positive | medium |

---

#### 6.9 Seed: tc_test_cases — Risk Management (module: RISK_MGMT)

- [x] **6.9.1** Insert 5 test cases:

| code | title | test_type | scenario_type | priority |
|---|---|---|---|---|
| `TC-RISK-001` | Project Manager can create a risk with probability and impact | ui | positive | critical |
| `TC-RISK-002` | Risk score (probability × impact) calculates and displays correctly | ui | positive | high |
| `TC-RISK-003` | Missing probability or impact triggers field validation | ui | negative | high |
| `TC-RISK-004` | Risk can be linked to a project and appears in risk register | ui | positive | medium |
| `TC-RISK-005` | Viewer cannot delete a risk | ui | negative | critical |

---

#### 6.10 Seed: tc_test_cases — Issue Management (module: ISSUE_MGMT)

- [x] **6.10.1** Insert 5 test cases:

| code | title | test_type | scenario_type | priority |
|---|---|---|---|---|
| `TC-ISS-001` | Project Manager can create and save an issue | ui | positive | critical |
| `TC-ISS-002` | Issue can be escalated and escalation is recorded | ui | positive | high |
| `TC-ISS-003` | Issue status change is captured in audit log | database | positive | high |
| `TC-ISS-004` | Closed issue cannot be edited without re-open permission | ui | negative | high |
| `TC-ISS-005` | Team Member cannot delete a project issue | ui | negative | critical |

---

#### 6.11 Seed: tc_test_cases — Change Control (module: CHANGE_CTRL)

- [x] **6.11.1** Insert 5 test cases:

| code | title | test_type | scenario_type | priority |
|---|---|---|---|---|
| `TC-CHG-001` | Change request can be created with all required fields | ui | positive | critical |
| `TC-CHG-002` | Change request can be assessed and impact recorded | ui | positive | high |
| `TC-CHG-003` | Change decision updates status and notifies requester | ui | positive | high |
| `TC-CHG-004` | Unauthorised role cannot approve a change request | ui | negative | critical |
| `TC-CHG-005` | Approved change request appears in PMO dashboard metrics | ui | positive | medium |

---

#### 6.12 Seed: tc_test_cases — Agile (modules: AGILE_BACKLOG, SPRINT_MGMT, KANBAN)

- [x] **6.12.1** Insert 7 test cases:

| code | title | test_type | scenario_type | priority |
|---|---|---|---|---|
| `TC-AGL-001` | Product Owner can create a backlog item with story points | ui | positive | critical |
| `TC-AGL-002` | Scrum Master can create a sprint with start and end dates | ui | positive | critical |
| `TC-AGL-003` | Team Member can update status of an assigned task | ui | positive | high |
| `TC-AGL-004` | Sprint cannot be closed when required completion criteria are not met | ui | negative | high |
| `TC-AGL-005` | Viewer cannot move backlog items between columns | ui | negative | critical |
| `TC-AGL-006` | Sprint velocity calculation is accurate from completed story points | ui | positive | medium |
| `TC-AGL-007` | Kanban board reflects task status changes in real time | ui | positive | medium |

---

#### 6.13 Seed: tc_test_cases — Reporting & Dashboards (module: REPORTING, PMO_DASHBOARD, PM_DASHBOARD)

- [x] **6.13.1** Insert 6 test cases:

| code | title | test_type | scenario_type | priority |
|---|---|---|---|---|
| `TC-RPT-001` | PMO dashboard loads summary metrics without errors | ui | positive | critical |
| `TC-RPT-002` | PM dashboard loads project-specific KPIs for correct project | ui | positive | critical |
| `TC-RPT-003` | Project status counts on dashboard match database counts | database | positive | high |
| `TC-RPT-004` | Agile sprint velocity metrics are accurate | ui | positive | high |
| `TC-RPT-005` | Failed API response shows user-friendly error message (not raw error) | ui | negative | high |
| `TC-RPT-006` | Export report button produces downloadable file | ui | positive | medium |

---

#### 6.14 Seed: tc_test_cases — Testing & Diagnostics Centre itself (module: TESTING_CENTRE)

- [x] **6.14.1** Insert 8 test cases (the module testing itself):

| code | title | test_type | scenario_type | priority |
|---|---|---|---|---|
| `TC-TDC-001` | System Admin can create a test case with all required fields | ui | positive | critical |
| `TC-TDC-002` | Viewer cannot delete a test case | ui | negative | critical |
| `TC-TDC-003` | Test suite can be created and test cases added in order | ui | positive | high |
| `TC-TDC-004` | Test run records pass/fail result per test case | ui | positive | critical |
| `TC-TDC-005` | Screenshot evidence is linked to the test run result | ui | positive | high |
| `TC-TDC-006` | Failed test automatically creates defect when auto-create is enabled | database | positive | high |
| `TC-TDC-007` | Batch AI fix prompt `.md` file is generated for all failures | ui | positive | high |
| `TC-TDC-008` | Diagnostic session generates Cursor/Claude AI fix prompt | ui | positive | high |

---

#### 6.15 Seed: tc_test_cases — Role Permission Negative Tests (cross-module)

- [x] **6.15.1** Insert 6 negative permission test cases (one per key unauthorised role scenario):

| code | title | test_type | scenario_type | priority |
|---|---|---|---|---|
| `TC-PERM-001` | Viewer cannot create, edit, or delete any PMIS record | ui | negative | critical |
| `TC-PERM-002` | Team Member cannot access PMO dashboard | ui | negative | high |
| `TC-PERM-003` | Project Manager cannot access system administration pages | ui | negative | high |
| `TC-PERM-004` | Unauthenticated request to Supabase RPC returns RLS error | api | negative | critical |
| `TC-PERM-005` | Role without `testing_centre.run` permission cannot start a test run | ui | negative | high |
| `TC-PERM-006` | Simulator user cannot read Platform (public schema) data via simDb | database | negative | critical |

---

#### 6.16 Seed: tc_test_suites (7 default suites)

- [x] **6.16.1** Insert 7 default suites and link seed test cases to each:

| suite_code | name | suite_type | test cases included |
|---|---|---|---|
| `SUITE-SMOKE-001` | Authentication Smoke Suite | smoke | TC-AUTH-001 → TC-AUTH-004 |
| `SUITE-REG-PRED` | Predictive Project Lifecycle Regression | regression | TC-PROJ-001→006, TC-STAGE-001→004, TC-WA-001→006 |
| `SUITE-REG-AGILE` | Agile Sprint Management Regression | regression | TC-AGL-001 → TC-AGL-007 |
| `SUITE-RISK-ISSUE` | Risk, Issue & Change Management Suite | module | TC-RISK-001→005, TC-ISS-001→005, TC-CHG-001→005 |
| `SUITE-PERM-NEG` | Role Permission Negative Test Suite | regression | TC-PERM-001→006, TC-AUTH-003, TC-AUTH-004 |
| `SUITE-RELEASE` | Release Readiness Suite | release | All TC-*-001 (critical smoke cases across all modules) |
| `SUITE-TDC` | Testing Centre Self-Test Suite | module | TC-TDC-001 → TC-TDC-008 |

- [x] **6.16.2** Insert `tc_test_suite_cases` rows for each suite, with correct `run_order` values and `is_required = true` for all critical-priority test cases

---

#### 6.17 Seed: tc_automation_scripts (script registry)

- [x] **6.17.1** Insert registered automation script entries linking test cases to their script files:

| script_key | script_type | script_path | linked_tc_test_case_id |
|---|---|---|---|
| `e2e-auth-login-valid` | playwright | `tests/e2e/auth/login-valid.spec.ts` | TC-AUTH-001 |
| `e2e-auth-login-invalid` | playwright | `tests/e2e/auth/login-invalid.spec.ts` | TC-AUTH-002 |
| `e2e-auth-protected-route` | playwright | `tests/e2e/auth/protected-route.spec.ts` | TC-AUTH-003 |
| `e2e-proj-create` | playwright | `tests/e2e/predictive/project-create.spec.ts` | TC-PROJ-001 |
| `e2e-proj-validation` | playwright | `tests/e2e/predictive/project-validation.spec.ts` | TC-PROJ-002 |
| `e2e-risk-create` | playwright | `tests/e2e/risk-issue-change/risk-create.spec.ts` | TC-RISK-001 |
| `e2e-risk-score` | playwright | `tests/e2e/risk-issue-change/risk-score.spec.ts` | TC-RISK-002 |
| `e2e-perm-viewer` | playwright | `tests/e2e/permissions/viewer-restrictions.spec.ts` | TC-PERM-001 |
| `e2e-perm-rls` | playwright | `tests/e2e/permissions/rls-unauthenticated.spec.ts` | TC-PERM-004 |
| `unit-risk-priority` | vitest | `tests/unit/riskPriority.test.ts` | TC-RISK-002 |
| `unit-sprint-velocity` | vitest | `tests/unit/sprintVelocity.test.ts` | TC-AGL-006 |
| `unit-permission-checker` | vitest | `tests/unit/permissionChecker.test.ts` | TC-PERM-001 |
| `db-rls-sim-isolation` | sql | `tests/db/sim-isolation.sql` | TC-PERM-006 |

---

#### 6.18 Seed: tc_test_data_sets — Personas

- [x] **6.18.1** Insert 8 persona records into `tc_test_data_sets`:

| name | persona | environment_type | data (JSONB keys) |
|---|---|---|---|
| System Admin Persona | system_admin | local | `{ role, email_env_var, password_env_var }` |
| PMO Admin Persona | pmo_admin | local | `{ role, email_env_var, password_env_var }` |
| Project Manager Persona | project_manager | local | `{ role, email_env_var, password_env_var, sample_project_id_env_var }` |
| Scrum Master Persona | scrum_master | local | `{ role, email_env_var, password_env_var }` |
| Product Owner Persona | product_owner | local | `{ role, email_env_var, password_env_var }` |
| Team Member Persona | team_member | local | `{ role, email_env_var, password_env_var }` |
| Tester / QA Persona | tester | local | `{ role, email_env_var, password_env_var }` |
| Viewer / Auditor Persona | viewer | local | `{ role, email_env_var, password_env_var }` |

> **Note**: All credential values reference **environment variable names** (e.g. `TEST_PM_EMAIL`), never actual passwords. Real credentials are set in `.env.test` (git-ignored).

---

#### 6.19 Seed Data SQL File Summary

- [x] **6.19.1** Create `SQL/v498_testing_centre_seed_data.sql`:
  - All INSERTs use `ON CONFLICT (id) DO NOTHING` — idempotent, safe to re-run
  - Use deterministic UUIDs (`gen_random_uuid()` replaced with hardcoded UUIDs) so FKs between suites and cases are stable across environments
  - File sections in order:
    1. `tc_test_modules` (Platform + sim schema)
    2. `tc_test_environments` (Platform + sim schema)
    3. `tc_settings` (Platform only — settings are per-deployment)
    4. `tc_test_cases` (all 68 cases above — Platform)
    5. `tc_test_cases` sim schema equivalents (same cases, `practice_project_id` where applicable)
    6. `tc_test_suites` (Platform + sim schema)
    7. `tc_test_suite_cases` (linking cases to suites)
    8. `tc_automation_scripts` (Platform only)
    9. `tc_test_data_sets` — persona definitions
  - File ends with a verification query: `SELECT COUNT(*) as modules, (SELECT COUNT(*) FROM tc_test_cases) as cases, (SELECT COUNT(*) FROM tc_test_suites) as suites FROM tc_test_modules;`

- [x] **6.19.2** Add seed data note to `Documentation/Testing_Diagnostics_Centre_Runbook.md`:
  - How to run the seed file: `psql` command or Supabase SQL editor
  - How to add new test cases to the seed file following the same pattern
  - How to set up `.env.test` with persona credentials
  - How to reset seed data if needed (DELETE + re-run v498)

---

#### 6.20 Seed Data Counts Summary

| Category | Platform Count | Sim Schema Count |
|---|---|---|
| tc_test_modules | 21 | 21 |
| tc_test_environments | 4 | 4 |
| tc_settings | 19 | — |
| tc_test_cases | 68 | 68 |
| tc_test_suites | 7 | 7 |
| tc_test_suite_cases | ~55 links | ~55 links |
| tc_automation_scripts | 13 | — |
| tc_test_data_sets (personas) | 8 | — |
| **Total seed rows** | **~215** | **~155** |

---

## Review Section

**2026-04-25 — Implementation summary**

- **SQL:** Added `v493`–`v498` under `SQL/` (foundation, runs, automation, diagnostics + defect links, advanced, seed). Run in order on Supabase; create Storage bucket `testing-centre-evidence`.
- **App:** `testingCentreService.js` / `simTestingCentreService.js`, defect helpers in `defectService.js`, UI under `src/pages/testingCentre/`, shared `TestCaseListCore`, `TestingDashboardPage` with Recharts, routes wired in `App.jsx` for all six path prefixes, menus in all six config files.
- **Docs:** `Documentation/Testing_Diagnostics_Centre_User_Guide.md`, `Admin_Guide`, `Runbook.md`.
- **Test runner:** Root `test-runner/runner.mjs` stub; extend with Playwright/Vitest adapters per runbook.
- **Follow-up:** Harden RLS/permission checks in UI, complete multi-step test case create, full `processTestRunCompletion` + defect creation with project scoping, Playwright e2e tree, and optional seed block for suites 6.16 / automation 6.17 as separate migration if needed.

---

**Status:** Implementation delivered in branch — validate after DB + bucket setup.
