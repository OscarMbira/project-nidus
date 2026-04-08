# Highlight Report Technical Documentation

**Version**: 1.0  
**Date**: 2026-01-20  
**Module**: Structured Project Management - Controlling a Stage

## Architecture Overview

The Highlight Report module implements full CRUD for PRINCE2-style highlight reports. Layout:

- **Database**: PostgreSQL (Supabase); `highlight_reports` plus 9 child tables
- **Services**: `controllingStageService` (main CRUD) and `highlightReport*` services for child entities
- **UI**: React multi-step form, view page with tabs, export (PDF/Word)
- **Routing**: `/app/projects/:projectId/highlight-reports/*`

## Database Schema

### Main table: `highlight_reports` (v23, extended in v222)

**Existing columns** (v23): `id`, `project_id`, `stage_boundary_id`, `prepared_by_user_id`, `report_date`, `reporting_period_start` / `_end`, `report_title`, `executive_summary`, `stage_status`, `overall_status_summary`, `progress_summary`, `completed_this_period`, `planned_next_period`, budget/schedule/quality/risks/issues/changes/decisions fields, `status`, audit fields.

**Added in v222**:  
- **Version**: `version_no`, `report_reference` (unique), `frequency`, `next_report_due_date`  
- **Six variables**: `time_*`, `cost_*`, `quality_status_six` / `quality_summary` / `quality_forecast`, `scope_*`, `benefits_*`, `risk_*` (status/summary/forecast each)  
- **Tolerance**: `tolerance_breaches_summary`, `tolerance_warnings_summary`, `escalation_required`, `escalation_reason`  
- **Progress**: `progress_percentage`, `milestones_completed` / `_total`, `work_packages_completed` / `_total`  
- **Workflow**: `distribution_list` (JSONB), `approval_workflow_status`, `distributed_at`, `distribution_method`  
- **Links**: `related_checkpoint_report_ids`, `related_change_request_ids` (UUID arrays)

### Child tables (v222)

1. **highlight_report_revision_history** – Version history (revision_date, version_number, previous_version_number, summary_of_changes, changes_marked, revised_by)
2. **highlight_report_products** – Products/deliverables (product_name, period_type, completion_status, quality_status, dates, display_order)
3. **highlight_report_risks** – Key risks (risk_id optional, risk_title, risk_category, probability, impact, risk_score, etc.)
4. **highlight_report_issues** – Key issues (issue_id optional, issue_title, issue_category, priority, etc.)
5. **highlight_report_change_requests** – Change requests (change_request_id optional, change_title, change_status, change_type, impact_summary, etc.)
6. **highlight_report_tolerances** – Tolerance snapshot (tolerance_id optional, tolerance_type, current_value, baseline_value, tolerance_limit, variance, variance_percentage, status)
7. **highlight_report_decisions** – Decisions required (decision_title, priority, decision_type, status, decision_date, etc.)
8. **highlight_report_distribution** – Distribution list (recipient_id, recipient_name/email/title/role, date_distributed, version_distributed, distribution_method, distribution_status, acknowledged_at, read_at)
9. **highlight_report_lessons** – Lessons (lesson_id optional, lesson_title, lesson_type, category, display_order)

All child tables have `highlight_report_id` FK to `highlight_reports` with `ON DELETE CASCADE`.

## Database functions (v222)

- **`generate_highlight_report_reference(p_project_id, p_stage_boundary_id, p_report_date)`**  
  Returns unique reference, e.g. `HLR-PROJ001-STAGE1-001`.

- **`get_latest_highlight_report(p_project_id, p_stage_boundary_id)`**  
  Returns latest report for project (and optional stage).

- **`validate_highlight_report_completeness(p_report_id)`**  
  Returns table: `section_name`, `is_complete`, `missing_fields`, `completeness_percentage`.

- **`get_report_statistics(p_project_id, p_start_date, p_end_date)`**  
  Returns `total_reports`, `average_status`, `tolerance_breaches_count`, `escalation_count`.

- **`calculate_tolerance_status_for_report(p_report_id)`**  
  Fills `highlight_report_tolerances` from `stage_tolerances`.

- **`auto_populate_highlight_report_from_stage(p_report_id, p_stage_boundary_id)`**  
  Fills progress metrics and calls `calculate_tolerance_status_for_report`.

## Triggers (v222)

- **`trg_highlight_reports_set_reference`** (BEFORE INSERT): Sets `report_reference` and `version_no` when null.

## RLS (v223)

- **highlight_reports**: Select for project members / PMO / author; insert for project members or PMO; update for author or PMO when draft/submitted; delete for author or PMO when draft.
- **Child tables**: Policy helper `hlr_can_access_report(highlight_report_id)`; select/insert/update (and delete where applicable) based on report access.

## Service layer

### `controllingStageService.js` (highlight report methods)

- `getHighlightReports(projectId, stageBoundaryId)`
- `createHighlightReport(projectId, reportData, stageBoundaryId)`
- `updateHighlightReport(reportId, updates)`
- `deleteHighlightReport(reportId)` (soft delete)
- `getHighlightReportById(reportId)`
- `getLatestHighlightReport(projectId, stageBoundaryId)`
- `generateReportReference(projectId, stageBoundaryId, reportDate)`
- `validateReportCompleteness(reportId)`
- `autoPopulateFromStage(reportId, stageBoundaryId)`
- `calculateToleranceStatus(reportId)`
- `getReportStatistics(projectId, startDate, endDate)`

User resolution: `getCurrentUserId()` maps `auth.uid()` → `users.id`; create/update use `users.id` for `prepared_by_user_id` / `updated_by`.

### `highlightReport*` services

- **highlightReportProductService**: `getProducts`, `getProductsByPeriod`, `addProduct`, `updateProduct`, `deleteProduct`
- **highlightReportRiskService**: `getRisks`, `getKeyRisks`, `addRisk`, `updateRisk`, `deleteRisk`
- **highlightReportIssueService**: `getIssues`, `getKeyIssues`, `addIssue`, `updateIssue`, `deleteIssue`
- **highlightReportChangeService**: `getChangeRequests`, `getChangeRequestsByStatus`, `addChangeRequest`, `updateChangeRequest`, `deleteChangeRequest`
- **highlightReportToleranceService**: `getTolerances`, `getToleranceBreaches`, `addToleranceStatus`, `updateToleranceStatus`, `calculateAllTolerances`
- **highlightReportDecisionService**: `getDecisions`, `getPendingDecisions`, `addDecision`, `updateDecision`, `deleteDecision`, `markDecisionDecided`
- **highlightReportDistributionService**: `getDistributionList`, `addDistributionRecipient`, `removeDistributionRecipient`, `trackDistributionStatus`, `acknowledgeReceipt`
- **highlightReportLessonService**: `getLessons`, `getLessonsByType`, `addLesson`, `updateLesson`, `deleteLesson`
- **highlightReportRevisionService**: `getRevisionHistory`, `addRevision`

## UI components

### Page components

- **HighlightReportCreate**: Uses `HighlightReportForm` (mode `create`), redirects to view on success.
- **HighlightReportEdit**: Uses `HighlightReportForm` (mode `edit`, `reportId`), supports auto-save every 30s.
- **HighlightReportView**: Overview tab (header, completeness, sections, revision history) and Print & Export tab (`HighlightReportPrintView`).

### Form and sections (`src/components/structured/highlightReport/`)

- **HighlightReportForm**: Multi-step form; steps: Document Info, Summary & Status, Six Variables, Tolerance, Progress, Products, Risks, Issues, Changes, Decisions, Lessons, Distribution. Uses `handleChange(key, value)`, `validateStep(stepId)`, create/update via service.
- **HighlightReportDocumentInfoSection**: Version, reference, frequency, period, title, date.
- **HighlightReportSixVariablesSection**: Six variables (status/summary/forecast).
- **HighlightReportToleranceSection**: Sync from stage, tolerances table, breaches, escalation.
- **HighlightReportProductsSection**: Product list (add/update/delete).
- **HighlightReportRisksSection** / **HighlightReportIssuesSection**: Key risks/issues (add/update/delete) plus summary text.
- **HighlightReportChangesSection** / **HighlightReportDecisionsSection**: Changes and decisions (add/update/delete) plus summary fields.
- **HighlightReportLessonsSection** / **HighlightReportDistributionSection**: Lessons and distribution list.

### Supporting components

- **HighlightReportHeader**: Report metadata, status badges, optional actions.
- **HighlightReportStatusBadge**: Status display (draft, submitted, distributed, acknowledged, on_track, at_risk, etc.).
- **HighlightReportCompletenessIndicator**: Uses `validateReportCompleteness`; progress bar and per-section completion.
- **HighlightReportRevisionHistory**: Uses `getRevisionHistory`; timeline of versions.
- **HighlightReportAutoPopulateButton**: Calls `autoPopulateFromStage`.
- **HighlightReportPrintView**: Print, Export PDF, Export Word; uses `highlightReportExport` util.

### Integration widgets

- **StageDataSyncWidget**: Single “Sync all” from stage (work packages, progress, tolerances).
- **ToleranceStatusWidget**: Compact tolerance status and breach count.
- **ChangeRequestSyncWidget**: Change request summary (e.g. total, approved, pending).

## Export (`src/utils/highlightReportExport.js`)

- **`generateHighlightReportPrintHTML(report, products, risks, issues, tolerances)`**: Returns HTML string for print/export.
- **`exportHighlightReportToPDF(...)`**: Opens new window, writes HTML, triggers print.
- **`exportHighlightReportToWord(...)`**: Builds HTML, downloads as .doc.

## Routing

- `projects/:projectId/highlight-reports/create`
- `projects/:projectId/highlight-reports/:reportId`
- `projects/:projectId/highlight-reports/:reportId/edit`

## Validation

- **Document**: Report title, report date, period start/end; end ≥ start.
- **Summary**: Executive summary ≥ 50 characters; stage status required.
- **Completeness**: `validate_highlight_report_completeness` RPC; UI shows overall % and section-level completion.

## Testing

- **Unit**: `src/services/__tests__/highlightReportService.test.js` (e.g. `getHighlightReports`, `getHighlightReportById`, `createHighlightReport`, `validateReportCompleteness`).

## Dependencies

- `highlight_reports` (v23), `stage_boundaries`, `stage_tolerances`, `projects`, `users`
- `risks`, `issues`, `change_requests`, `lessons_learned` (optional FKs in child tables)
- `work_packages` (for auto-populate)
- v222 (schema), v223 (RLS)

---

**Related**: v194 Highlight Report CRUD Implementation Plan, Checkpoint Report Technical Documentation, End Stage Report Technical Documentation.
