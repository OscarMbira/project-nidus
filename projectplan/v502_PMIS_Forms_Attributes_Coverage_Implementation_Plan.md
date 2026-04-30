# v502 — PMIS Forms & Attributes Coverage Module: Gap Analysis & Implementation Plan

**Date:** 2026-04-30  
**Reference Document:** `Documents/pmis_forms_attributes_cursor_prompt.md`  
**Current SQL version:** v501  
**Scope:** Full Process-Guide Form Engine covering 68 forms across 6 process groups

---

## 1. Executive Summary

The reference document requires a **Dynamic Form Engine** capable of managing 68 process guide aligned forms (Initiating, Planning, Executing, Monitoring & Controlling, Closing, Agile) with full CRUD, versioning, approval workflows, relationships, export, and dashboard reporting.

The current codebase has **domain-specific static forms** (130+ components) but **lacks the generic form engine entirely**. Key normalized registers partially exist. This plan bridges the gap in 9 phases.

---

## 2. Gap Analysis

### 2.1 What EXISTS in the Codebase

| Area | Status | Notes |
|------|--------|-------|
| Domain-specific form components | ✅ Exists | 130+ static forms (RiskForm, IssueForm, ChangeRequestForm, etc.) |
| Risk register (normalized) | ✅ Exists | risk-related SQL/services |
| Issues register (normalized) | ✅ Exists | issueService.js |
| Change requests (normalized) | ✅ Exists | changeRequestService.js |
| Stakeholders (normalized) | ✅ Exists | v304_stakeholder_multiple_contacts.sql |
| Requirements register | ✅ Exists | v357_requirements_register.sql |
| WBS items / nodes | ✅ Exists | v361_wbs_nodes.sql |
| Activity list | ✅ Exists | v365_activity_list.sql |
| EVM service | ✅ Exists | evmService.js |
| Export features (generic) | ✅ Partial | Some export in existing list views |

### 2.2 What is MISSING (Gaps)

| Area | Gap | Priority |
|------|-----|----------|
| Dynamic Form Engine tables | `form_templates`, `form_template_versions`, `form_instances`, `form_instance_values`, `form_instance_rows`, `form_attachments`, `form_approvals`, `form_audit_log`, `form_comments` | 🔴 Critical |
| 68 process guide form template schemas (JSONB seed) | All 68 templates with sections/fields | 🔴 Critical |
| Record relationship table | `record_links` generic linking table | 🔴 Critical |
| Missing normalized registers | `milestones_register`, `quality_metrics`, `cost_estimates`, `procurements`, `contracts`, `status_reports`, `decisions`, `lessons_learned`, `deliverables`, `agile_backlog_items` | 🟠 High |
| Dynamic Form Renderer components | `DynamicFormRenderer`, `FormFieldRenderer`, `DynamicTableSection`, `FormTemplateGallery` | 🔴 Critical |
| Approval Workflow components | `ApprovalWorkflowPanel`, workflow state machine | 🔴 Critical |
| Form Management Pages/Routes | `/projects/:id/forms`, `/projects/:id/forms/:templateCode/new`, etc. | 🔴 Critical |
| Form Version History | `FormVersionHistory` component + `form_version_history` table | 🟠 High |
| Form Attachment Uploader | `AttachmentUploader` component (form-scoped) | 🟠 High |
| Related Records Panel | `RelatedRecordsPanel` using `record_links` | 🟠 High |
| Form-specific Export | PDF, Word-HTML, CSV, JSON export per form | 🟡 Medium |
| Calculations engine | Risk score, EVM auto-calc, three-point estimates in form context | 🟡 Medium |
| Dashboard widgets (form-centric) | Form status summaries, overdue actions, register rollups | 🟡 Medium |
| Admin form template manager | `/platform/admin/form-templates` page | 🟡 Medium |
| Unit tests for form engine | Form validation, calculation tests | 🟡 Medium |

---

## 3. Implementation Phases

---

### Phase 1 - Database: Dynamic Form Engine Tables (COMPLETED)
**SQL file:** `SQL/v502_form_engine_tables.sql`  
**Simulator parity:** `SQL/v503_form_engine_sim.sql`

**Tables to create:**
- [x] `form_templates` — stores template metadata (code, name, process_group)
- [x] `form_template_versions` — versioned JSONB schemas per template
- [x] `form_instances` — per-project form instances (status, owner, version)
- [x] `form_instance_values` — flat key→JSONB value store per instance
- [x] `form_instance_rows` — repeating/table section rows per instance
- [x] `form_comments` — threaded comments on a form instance
- [x] `form_attachments` — file references scoped to a form instance
- [x] `form_approvals` — multi-approver approval records per instance
- [x] `form_audit_log` — immutable change log per instance
- [x] `form_version_history` — snapshot of full form state per save
- [x] `record_links` — generic relationship table (source_type, source_id, target_type, target_id)
- [x] RLS policies on all tables
- [x] Register all new tables in `database_tables`

---

### Phase 2 - Database: Missing Normalized Register Tables (COMPLETED)
**SQL file:** `SQL/v504_missing_normalized_registers.sql`  
**Simulator parity:** `SQL/v505_missing_normalized_registers_sim.sql`

**Tables to create (where not already present):**
- [x] `milestones_register` (milestone_id, project_id, name, type, due_date, owner, related_deliverable, status, source_form_instance_id)
- [x] `quality_metrics_register` (metric_id, project_id, name, measurement_method, target_value, tolerance, frequency, owner)
- [x] `cost_estimates_register` (estimate_id, project_id, wbs_id, activity_id, cost_category, resource_name, unit_cost, total_cost)
- [x] `procurements_register` (procurement_id, project_id, item, strategy, contract_type, make_or_buy, supplier, status)
- [x] `contracts_register` (contract_id, project_id, contractor_name, description, start_date, end_date, final_cost, status)
- [x] `status_reports_register` (report_id, project_id, reporting_period, overall_status, scope_status, schedule_status, cost_status)
- [x] `decisions_register` (decision_id, project_id, description, decision_maker, decision_date, rationale, impact, status)
- [x] `lessons_learned_register` (lesson_id, project_id, category, situation, impact, recommendation, phase, status)
- [x] `deliverables_register` (deliverable_id, project_id, name, description, wbs_id, acceptance_criteria, status)
- [x] `agile_backlog_items` (item_id, project_id, epic, user_story, priority, effort_estimate, sprint, status)
- [x] RLS + `database_tables` registration for each

---

### Phase 3 - Form Template Seed Data (68 Process Guide Forms) (COMPLETED)
**SQL file:** `SQL/v506_form_template_seeds.sql`

**Deliverable:** All 68 form templates as JSONB schemas inserted into `form_templates` + `form_template_versions`.

**Templates by process group:**

**Initiating (4 forms):**
- [x] Project Charter (form 1)
- [x] Assumption Log (form 2)
- [x] Stakeholder Register (form 3)
- [x] Stakeholder Analysis (form 4)

**Planning (42 forms):**
- [x] Project Management Plan (5)
- [x] Change Management Plan (6)
- [x] Project Roadmap (7)
- [x] Scope Management Plan (8)
- [x] Requirements Management Plan (9)
- [x] Requirements Documentation (10)
- [x] Requirements Traceability Matrix (11)
- [x] Inter-Requirements Traceability Matrix (12)
- [x] Project Scope Statement (13)
- [x] Work Breakdown Structure (14)
- [x] WBS Dictionary (15)
- [x] Schedule Management Plan (16)
- [x] Activity List (17)
- [x] Activity Attributes (18)
- [x] Milestone List (19)
- [x] Network Diagram (20)
- [x] Duration Estimates (21)
- [x] Duration Estimating Worksheet (22)
- [x] Project Schedule (23)
- [x] Cost Management Plan (24)
- [x] Cost Estimates (25)
- [x] Cost Estimating Worksheet (26)
- [x] Bottom-Up Cost Estimating Worksheet (27)
- [x] Cost Baseline (28)
- [x] Quality Management Plan (29)
- [x] Quality Metrics (30)
- [x] Responsibility Assignment Matrix (31)
- [x] Resource Management Plan (32)
- [x] Team Charter (33)
- [x] Resource Requirements (34)
- [x] Resource Breakdown Structure (35)
- [x] Communications Management Plan (36)
- [x] Risk Management Plan (37)
- [x] Risk Register (38)
- [x] Risk Report (39)
- [x] Probability and Impact Assessment (40)
- [x] Probability and Impact Matrix (41)
- [x] Risk Data Sheet (42)
- [x] Procurement Management Plan (43)
- [x] Procurement Strategy (44)
- [x] Source Selection Criteria (45)
- [x] Stakeholder Engagement Plan (46)

**Executing (7 forms):**
- [x] Issue Log (47)
- [x] Decision Log (48)
- [x] Change Request (49)
- [x] Change Log (50)
- [x] Lessons Learned Register (51)
- [x] Quality Audit (52)
- [x] Team Performance Assessment (53)

**Monitoring & Controlling (9 forms):**
- [x] Team Member Status Report (54)
- [x] Project Status Report (55)
- [x] Variance Analysis (56)
- [x] Earned Value Analysis (57)
- [x] Risk Audit (58)
- [x] Contractor Status Report (59)
- [x] Procurement Audit (60)
- [x] Contract Closeout Report (61)
- [x] Product Acceptance Form (62)

**Closing (2 forms):**
- [x] Lessons Learned Summary (63)
- [x] Project or Phase Closeout (64)

**Agile (4 forms):**
- [x] Product Vision (65)
- [x] Product Backlog (66)
- [x] Release Plan (67)
- [x] Retrospective (68)

---

### Phase 4 - Form Engine Service Layer (COMPLETED)
**File:** `src/services/formEngineService.js`  
**Test:** `src/services/__tests__/formEngineService.test.js`

**Functions to implement:**
- [x] `getFormTemplates(processGroup?)` — list templates
- [x] `getFormTemplate(templateCode)` — single template with current version schema
- [x] `createFormInstance(projectId, templateCode, ownerId)` — create draft
- [x] `getFormInstance(formInstanceId)` — fetch with values + rows
- [x] `updateFormValues(formInstanceId, values)` — save flat values
- [x] `updateFormRows(formInstanceId, sectionKey, rows)` — save repeating rows
- [x] `submitFormForApproval(formInstanceId)` — transition to in_review
- [x] `approveForm(formInstanceId, approverId, comments)` — approve
- [x] `rejectForm(formInstanceId, approverId, comments)` — reject/return
- [x] `archiveForm(formInstanceId)` — archive
- [x] `createFormVersion(formInstanceId)` — snapshot current state + increment version
- [x] `getFormsByProject(projectId, filters?)` — list with status/type filters
- [x] `getFormDashboardSummary(projectId)` — counts by status, overdue, etc.
- [x] `addFormAttachment(formInstanceId, file)` — upload to Supabase Storage
- [x] `addFormComment(formInstanceId, userId, text)` — threaded comment
- [x] `syncToNormalizedTable(formInstanceId)` — sync key fields to register table
- [x] `createRecordLink(projectId, sourceType, sourceId, targetType, targetId, relationshipType)` — link records

---

### Phase 5 - Dynamic Form Renderer Components (COMPLETED)
**Location:** `src/components/forms/`

**Components to build:**
- [x] `FormTemplateGallery.jsx` — grid of available templates by process group, search/filter
- [x] `DynamicFormRenderer.jsx` — renders a full form from JSONB schema, reads/writes instance values
- [x] `FormFieldRenderer.jsx` — renders individual field types: text, textarea, date, number, select, multiselect, richtext, file
- [x] `DynamicTableSection.jsx` — renders repeating row sections (add/remove/reorder rows)
- [x] `FormSectionCard.jsx` — card wrapper for each form section
- [x] `ApprovalWorkflowPanel.jsx` — shows approval state, buttons, approver list, history
- [x] `AttachmentUploader.jsx` — form-scoped file upload with preview list
- [x] `FormVersionHistory.jsx` — timeline of version snapshots with diff view
- [x] `RelatedRecordsPanel.jsx` — shows/creates record_links for a given record
- [x] `FormAuditTimeline.jsx` — read-only audit log view
- [x] `ExportMenu.jsx` (form-scoped) — PDF/Word-HTML/CSV/JSON export dropdown
- [x] `FormAutosaveIndicator.jsx` — autosave status badge

**Calculation support (within DynamicFormRenderer):**
- [x] Risk score = probability × impact (auto-calculated on change)
- [x] EVM metrics: SV, CV, SPI, CPI, EAC, ETC, VAC, TCPI (from form inputs)
- [x] Three-point duration: (O + 4M + P) / 6
- [x] Cost worksheet subtotals and totals
- [x] Thousand/Million shorthand input (10t → 10,000; 3m → 3,000,000) per CLAUDE.md rule 36

---

### Phase 6 - Form Management Pages & Routes (COMPLETED)
**Location:** `src/pages/forms/`  
**Routes added to:** `src/App.jsx`

**Pages to build:**
- [x] `FormsGallery.jsx` — `/projects/:projectId/forms` — template gallery + list of project instances
- [x] `FormNew.jsx` — `/projects/:projectId/forms/:templateCode/new` — create new instance
- [x] `FormEdit.jsx` — `/projects/:projectId/forms/:formInstanceId/edit` — edit draft/returned
- [x] `FormView.jsx` — `/projects/:projectId/forms/:formInstanceId/view` — read-only + approval actions
- [x] `FormTemplateAdmin.jsx` — `/platform/admin/form-templates` — admin management of templates

**Register pages (update or create):**
- [x] `/projects/:projectId/registers/risks` — existing, ensure form-linked
- [x] `/projects/:projectId/registers/issues` — existing, ensure form-linked
- [x] `/projects/:projectId/registers/changes` — existing, ensure form-linked
- [x] `/projects/:projectId/registers/requirements` — existing or create
- [x] `/projects/:projectId/reports/status` — status report form + history

**Draft/hold queue (per CLAUDE.md rule 37):**
- [x] `DraftFormQueue.jsx` — list of in-progress/on-hold form instances the user can resume

**Sidebar menu entries:** *(detailed breakdown in Phase 10 below)*

**Simulator parity:**
- [x] Mirror form pages under `/simulator/pm/projects/:projectId/forms`
- [x] Simulator sidebar entries covered in Phase 10

---

### Phase 7 - Dashboard Widgets (Form-Centric) (COMPLETED)
**Location:** `src/components/forms/dashboard/`

**Widgets to build:**
- [x] `FormStatusSummaryWidget.jsx` — total forms by status (Draft/In Review/Approved/Rejected/Archived)
- [x] `OverdueActionsWidget.jsx` — forms/actions past due date
- [x] `OpenAssumptionsWidget.jsx` — open assumption log items
- [x] `StakeholderEngagementGapWidget.jsx` — current vs desired engagement level
- [x] `RequirementsByPriorityWidget.jsx` — requirements distribution
- [x] `OpenIssuesByPriorityWidget.jsx` — issue log summary
- [x] `RiskExposureSummaryWidget.jsx` — risk score distribution by category
- [x] `QualityFindingsWidget.jsx` — audit findings status
- [x] `ProductAcceptanceStatusWidget.jsx` — acceptance form pipeline
- [x] `LessonsLearnedByCategoryWidget.jsx` — lessons breakdown
- [x] `AgileBacklogStatusWidget.jsx` — backlog item distribution
- [x] Add widgets to project dashboard pages

---

### Phase 8 - Export Functionality (Form-Scoped) (COMPLETED)
**Enhancement to:** existing export utilities  
**Per form instance:**
- [x] Export to **PDF** (via browser print CSS or jsPDF)
- [x] Export to **Word-compatible HTML** (downloadable .html with Word-readable structure)
- [x] Export to **CSV** (flat fields + repeating rows each on own line)
- [x] Export to **JSON** (complete form instance with metadata)
- [x] Use the `ExportMenu.jsx` dropdown per existing CLAUDE.md rule 38

---

### Phase 9 - Unit Tests (COMPLETED)
**Location:** `src/services/__tests__/`

- [x] `formEngineService.test.js` — CRUD, approval transitions, version creation
- [x] `formCalculations.test.js` — risk score, EVM metrics, three-point estimates
- [x] `formValidation.test.js` — required fields, date ordering, probability/impact scale

---

## 4. SQL File Sequence

| File | Contents |
|------|----------|
| `SQL/v502_form_engine_tables.sql` | Core dynamic form engine tables |
| `SQL/v503_form_engine_sim.sql` | Simulator schema mirror of form engine |
| `SQL/v504_missing_normalized_registers.sql` | Missing platform register tables |
| `SQL/v505_missing_normalized_registers_sim.sql` | Simulator mirror |
| `SQL/v506_form_template_seeds.sql` | 68 process guide form template JSONB seed data |
| `SQL/v507_form_permissions.sql` | New form permission keys added to roles/permissions tables |

---

## 5. Component/Page File Map

```
src/
  components/
    forms/
      DynamicFormRenderer.jsx
      FormFieldRenderer.jsx
      DynamicTableSection.jsx
      FormSectionCard.jsx
      FormTemplateGallery.jsx
      ApprovalWorkflowPanel.jsx
      AttachmentUploader.jsx
      FormVersionHistory.jsx
      RelatedRecordsPanel.jsx
      FormAuditTimeline.jsx
      ExportMenu.jsx
      FormAutosaveIndicator.jsx
      DraftFormQueue.jsx
      dashboard/
        FormStatusSummaryWidget.jsx
        OverdueActionsWidget.jsx
        OpenAssumptionsWidget.jsx
        StakeholderEngagementGapWidget.jsx
        RequirementsByPriorityWidget.jsx
        OpenIssuesByPriorityWidget.jsx
        RiskExposureSummaryWidget.jsx
        QualityFindingsWidget.jsx
        ProductAcceptanceStatusWidget.jsx
        LessonsLearnedByCategoryWidget.jsx
        AgileBacklogStatusWidget.jsx
  pages/
    forms/
      FormsGallery.jsx
      FormNew.jsx
      FormEdit.jsx
      FormView.jsx
      FormTemplateAdmin.jsx
  services/
    formEngineService.js
    __tests__/
      formEngineService.test.js
      formCalculations.test.js
      formValidation.test.js
```

---

## 6. Key Decisions

1. **No hard-coded forms in React** — all forms driven from `form_templates` + JSONB schemas in the DB.
2. **Existing domain services remain** — `riskService`, `issueService`, etc. are NOT replaced; `syncToNormalizedTable` in the form engine writes to them after form approval.
3. **Approved forms become read-only** — editing requires creating a new version via `createFormVersion`.
4. **Autosave** — draft forms autosave every 30 seconds using `updateFormValues`.
5. **Dark mode default** — all new components use dark theme per CLAUDE.md rule 28.
6. **PWA** — all new pages include responsive mobile layout per CLAUDE.md rule 29.
7. **Platform–Simulator parity** — all form engine functionality is mirrored in simulator routes and sim schema per CLAUDE.md rule 34.

---

## 7. Estimated Effort (phases)

| Phase | Effort |
|-------|--------|
| Phase 1 — DB Form Engine tables | Small (SQL) |
| Phase 2 — Missing normalized registers | Small (SQL) |
| Phase 3 — 68 Form template seeds | Medium (JSONB data) |
| Phase 4 — Service layer | Medium (JS functions) |
| Phase 5 — UI components | Large (12 components) |
| Phase 6 — Pages & routes | Large (5 pages + routing) |
| Phase 7 — Dashboard widgets | Medium (11 widgets) |
| Phase 8 — Export | Small (extend existing) |
| Phase 9 — Unit tests | Medium (3 test files) |

---

## 7. Phase 10 — Role-Based Sidebar Menu Integration

**Files to update:**

| Config File | Role / Domain |
|-------------|--------------|
| `src/config/pmMenuConfig.js` | Project Manager (Platform) |
| `src/config/pmoMenuConfig.js` | PMO Admin (Platform) |
| `src/config/pmDashboardMenuConfig.js` | PM Dashboard sub-nav |
| `src/config/simulatorPMMenuConfig.js` | Simulator — PM role |
| `src/config/simulatorPMOMenuConfig.js` | Simulator — PMO role |
| `src/config/simulatorMenuConfig.js` | Simulator — general |

---

### 10.1 Role → Access Matrix

| Role | Initiating | Planning | Executing | M&C | Closing | Agile | Admin |
|------|-----------|---------|-----------|-----|---------|-------|-------|
| System Admin | R/W | R/W | R/W | R/W | R/W | R/W | ✅ Full |
| PMO Admin | R/W | R/W | R/W | R/W | R/W | R/W | ✅ Templates |
| Sponsor/Executive | Approve | Approve | Approve | Read | Approve | Read | — |
| Project Manager | R/W | R/W | R/W | R/W | R/W | R/W | — |
| Team Manager/Lead | Read | Read | R/W | R/W | Read | R/W | — |
| Team Member | Read | Read | Status only | Status only | — | Backlog | — |
| QA | Read | Read | Quality only | Quality/Audit | Read | — | — |
| Procurement Mgr | Read | Proc. forms | Proc. forms | Proc. forms | Contracts | — | — |
| Finance/Cost | Read | Cost forms | Read | EVM/Cost | Read | — | — |
| Viewer/Customer | — | — | — | Approved only | Approved only | — | — |

---

### 10.2 Platform — `pmMenuConfig.js` (Project Manager)

Add a **"Process Group Forms"** top-level section with children organized by process group. Each child links to the forms gallery pre-filtered by process group.

- [x] Add entry:
```js
{
  id: 'platform-forms',
  label: 'Process Group Forms',
  path: '/platform/projects/:projectId/forms',
  icon: 'file-text',
  permission: 'form.view',
  children: [
    { id: 'forms-initiating',   label: 'Initiating',              path: '/platform/projects/:projectId/forms?group=Initiating',            permission: 'form.view' },
    { id: 'forms-planning',     label: 'Planning',                path: '/platform/projects/:projectId/forms?group=Planning',              permission: 'form.view' },
    { id: 'forms-executing',    label: 'Executing',               path: '/platform/projects/:projectId/forms?group=Executing',             permission: 'form.view' },
    { id: 'forms-monitoring',   label: 'Monitoring & Controlling', path: '/platform/projects/:projectId/forms?group=Monitoring',            permission: 'form.view' },
    { id: 'forms-closing',      label: 'Closing',                 path: '/platform/projects/:projectId/forms?group=Closing',               permission: 'form.view' },
    { id: 'forms-agile',        label: 'Agile',                   path: '/platform/projects/:projectId/forms?group=Agile',                 permission: 'form.view' },
    { id: 'forms-drafts',       label: 'My Drafts',               path: '/platform/projects/:projectId/forms/drafts',                      permission: 'form.view' },
    { id: 'forms-approvals',    label: 'Pending Approvals',       path: '/platform/projects/:projectId/forms?status=in_review',            permission: 'form.approve' },
  ]
}
```

- [x] Add **Registers** sub-section under existing Projects entry:
```js
{ id: 'forms-reg-risks',    label: 'Risk Register',         path: '/platform/projects/:projectId/registers/risks',        permission: 'form.view' },
{ id: 'forms-reg-issues',   label: 'Issue Log',             path: '/platform/projects/:projectId/registers/issues',       permission: 'form.view' },
{ id: 'forms-reg-changes',  label: 'Change Log',            path: '/platform/projects/:projectId/registers/changes',      permission: 'form.view' },
{ id: 'forms-reg-reqs',     label: 'Requirements Register', path: '/platform/projects/:projectId/registers/requirements', permission: 'form.view' },
{ id: 'forms-status-report',label: 'Status Reports',        path: '/platform/projects/:projectId/reports/status',         permission: 'form.view' },
```

---

### 10.3 Platform — `pmoMenuConfig.js` (PMO Admin)

- [x] Add **"Process Group Forms"** section (using Lucide `FileText` icon) with same process group children as PM menu above, permission `form.view_all`
- [x] Add **"Form Templates"** admin section (Lucide `Settings2` icon):
```js
{
  id: 'pmo-form-templates',
  label: 'Form Templates',
  path: '/platform/admin/form-templates',
  icon: Settings2,
  section: 'Administration',
  permission: 'form_template.manage',
  children: [
    { id: 'pmo-form-tpl-list',    label: 'All Templates',     path: '/platform/admin/form-templates',          permission: 'form_template.manage' },
    { id: 'pmo-form-tpl-create',  label: 'New Template',      path: '/platform/admin/form-templates/new',      permission: 'form_template.create' },
    { id: 'pmo-form-tpl-pending', label: 'Pending Approvals', path: '/platform/admin/form-templates?status=pending', permission: 'form_template.approve' },
  ]
}
```
- [x] Add **Registers oversight** entries (read-only, all projects):
```js
{ id: 'pmo-forms-risks',   label: 'Risk Register (All)',    path: '/pmo/registers/risks',          permission: 'form.view_all' },
{ id: 'pmo-forms-issues',  label: 'Issue Log (All)',        path: '/pmo/registers/issues',         permission: 'form.view_all' },
{ id: 'pmo-forms-changes', label: 'Change Register (All)',  path: '/pmo/registers/changes',        permission: 'form.view_all' },
```

---

### 10.4 Role-Specific Filtered Views

Rather than separate menu configs per role, the same menu items use `permission` guards. The following permissions control visibility:

| Permission key | Who holds it |
|----------------|-------------|
| `form.view` | PM, Team Lead, Team Member, QA, Procurement, Finance |
| `form.create` | PM, Team Lead |
| `form.edit` | PM, Team Lead (own forms) |
| `form.approve` | Sponsor, PMO Admin, System Admin |
| `form.view_all` | PMO Admin, System Admin |
| `form_template.manage` | System Admin, PMO Admin |
| `form.quality` | QA only (Quality Audit, Quality Metrics forms) |
| `form.procurement` | Procurement Manager (Procurement forms) |
| `form.cost` | Finance/Cost Controller (Cost forms, EVM) |

- [x] Add these permission keys to the existing permissions/roles table in the database (SQL `v502` or a new `v507_form_permissions.sql`)
- [x] Enforce in RLS policies on `form_instances` and `form_approvals`

---

### 10.5 Role-Specific Sidebar Sublinks

The following outlines which forms are visible per role within the "Process Group Forms" section. The `FormTemplateGallery` filters based on the user's role permissions at runtime.

**Sponsor/Executive** — sees only:
- Initiating: Project Charter (approve)
- Planning: Cost Baseline, Scope Baseline (approve)
- Executing: Change Request (approve/reject)
- Closing: Project or Phase Closeout (approve)

**Team Member** — sees only:
- Executing: Team Member Status Report, Issue Log (assigned items)
- M&C: Team Member Status Report
- Agile: Product Backlog (assigned items)

**QA** — sees only:
- Planning: Quality Management Plan, Quality Metrics
- Executing: Quality Audit
- M&C: Risk Audit, Product Acceptance Form

**Procurement Manager** — sees only:
- Planning: Procurement Management Plan, Procurement Strategy, Source Selection Criteria
- Executing: (none restricted)
- M&C: Contractor Status Report, Procurement Audit, Contract Closeout Report

**Finance/Cost Controller** — sees only:
- Planning: Cost Management Plan, Cost Estimates, Cost Estimating Worksheet, Bottom-Up Cost Estimating Worksheet, Cost Baseline
- M&C: Earned Value Analysis, Variance Analysis

- [x] Implement role-based template filtering in `FormTemplateGallery.jsx` using the user's role permissions fetched from `formEngineService.getFormTemplates(processGroup, userRole)`
- [x] Update `getFormTemplates()` in `formEngineService.js` to accept an optional `roleFilter` parameter

---

### 10.6 Simulator Sidebar Parity

- [x] **`simulatorPMMenuConfig.js`** — mirror Platform PM menu structure with paths prefixed `/simulator/pm/projects/:projectId/forms/*`
- [x] **`simulatorPMOMenuConfig.js`** — mirror Platform PMO menu structure with paths prefixed `/simulator/pmo/forms/*`
- [x] **`simulatorMenuConfig.js`** — add top-level "Process Group Practice" entry linking to simulator forms gallery

---

### 10.7 Sidebar Menu Todo Checklist

- [x] `pmMenuConfig.js` — add Process Group Forms section with 8 children
- [x] `pmMenuConfig.js` — add Registers & Reports sub-entries under Projects
- [x] `pmoMenuConfig.js` — add Process Group Forms section (Lucide FileText icon)
- [x] `pmoMenuConfig.js` — add Form Templates admin section (Lucide Settings2 icon)
- [x] `pmoMenuConfig.js` — add Registers oversight entries
- [x] `SQL/v507_form_permissions.sql` — add new permission keys to roles/permissions tables
- [x] `formEngineService.js` — update `getFormTemplates()` to accept `roleFilter`
- [x] `FormTemplateGallery.jsx` — apply role-based filtering using user permissions
- [x] `simulatorPMMenuConfig.js` — mirror PM forms menu for simulator
- [x] `simulatorPMOMenuConfig.js` — mirror PMO forms menu for simulator
- [x] `simulatorMenuConfig.js` — add Process Group Practice top-level entry

---

## 8. Field Naming Conventions

### 8.1 Rules Applied
1. **Remove redundant table-name prefix** — when the field belongs to a form whose context already implies the prefix (e.g., in *Requirements Management Plan*, `requirements_categories` → `categories`).
2. **Shorten verbose phrases** — replace full English phrases with concise equivalents (e.g., `project_deliverables_and_processes_subject_to_quality_review` → `quality_review_scope`).
3. **Use standard abbreviations** — `pct` (percent), `def` (definition), `org` (organization/al), `mgmt` (management), `config` (configuration), `biz` (business), `tech` (technical), `req` (requirement), `info` (information).
4. **Collapse boolean flags** to `is_*` pattern (`mandatory_or_optional` → `is_mandatory`, `milestone_flag` → `is_milestone`).
5. **Collapse `_or_` alternatives** to the primary term (`stakeholder_name_or_role` → `stakeholder_name`, `epic_or_feature` → `epic`).
6. **Keep well-known acronyms intact** — EVM fields (`pv`, `ev`, `ac`, `spi`, `cpi`, `eac`, `etc`, `vac`, `tcpi`) are clearer as short codes than full names.
7. **Keep FK suffixes** (`_id`) and cross-reference fields (`related_risk_id`) unchanged — they convey the join relationship.

---

### 8.2 Corrected Field Names by Form

> Only fields that change are listed. Unchanged fields are omitted.

#### Form 1 — Project Charter
| Original | Corrected |
|----------|-----------|
| `high_level_project_description` | `high_level_description` |
| `project_manager_authority_level` | `pm_authority_level` |
| `staffing_decisions_authority` | `staffing_authority` |
| `budget_management_and_variance_authority` | `budget_authority` |
| `technical_decisions_authority` | `technical_authority` |

#### Form 3 — Stakeholder Register
| Original | Corrected |
|----------|-----------|
| `position_role` | `position` |
| `contact_information` | `contact_info` |
| `preferred_communication_channel` | `preferred_channel` |

#### Form 4 — Stakeholder Analysis
| Original | Corrected |
|----------|-----------|
| `stakeholder_name_or_role` | `stakeholder_name` |

#### Form 6 — Change Management Plan
| Original | Corrected |
|----------|-----------|
| `change_management_approach` | `approach` |
| `schedule_change_definition` | `schedule_change_def` |
| `budget_change_definition` | `budget_change_def` |
| `scope_change_definition` | `scope_change_def` |
| `project_document_change_definition` | `document_change_def` |
| `change_request_submittal_process` | `submittal_process` |
| `change_request_tracking_process` | `tracking_process` |
| `change_request_review_process` | `review_process` |
| `change_request_disposition_process` | `disposition_process` |

#### Form 7 — Project Roadmap
| Original | Corrected |
|----------|-----------|
| `roadmap_start_date` | `start_date` |
| `roadmap_end_date` | `end_date` |
| `major_deliverables_or_events` | `major_deliverables` |
| `significant_milestones` | `milestones` |
| `timeline_notes` | `notes` |

#### Form 8 — Scope Management Plan
| Original | Corrected |
|----------|-----------|
| `wbs_dictionary_approach` | `wbs_dict_approach` |
| `scope_baseline_maintenance` | `baseline_maintenance` |
| `deliverable_acceptance_process` | `acceptance_process` |
| `scope_and_requirements_integration` | `scope_req_integration` |
| `project_management_and_business_analysis_integration` | `pm_ba_integration` |

#### Form 9 — Requirements Management Plan
| Original | Corrected |
|----------|-----------|
| `requirements_collection_approach` | `collection_approach` |
| `requirements_analysis_approach` | `analysis_approach` |
| `requirements_categories` | `categories` |
| `requirements_documentation_approach` | `documentation_approach` |
| `requirements_prioritization_approach` | `prioritization_approach` |
| `requirements_metrics` | `metrics` |
| `configuration_management_approach` | `config_management_approach` |

#### Form 10 — Requirements Documentation
| Original | Corrected |
|----------|-----------|
| `requirement_description` | `description` |
| `test_or_verification_method` | `verification_method` |
| `phase_or_release` | `phase` |

#### Form 11 — Requirements Traceability Matrix
| Original | Corrected |
|----------|-----------|
| `related_wbs_id` | `wbs_id` |
| `related_test_case_id` | `test_case_id` |
| `related_acceptance_record_id` | `acceptance_record_id` |

#### Form 12 — Inter-Requirements Traceability Matrix
| Original | Corrected |
|----------|-----------|
| `business_requirement_id` | `biz_req_id` |
| `business_requirement` | `biz_req` |
| `business_requirement_priority` | `biz_priority` |
| `business_requirement_source` | `biz_source` |
| `technical_requirement_id` | `tech_req_id` |
| `technical_requirement` | `tech_req` |
| `technical_requirement_priority` | `tech_priority` |
| `technical_requirement_source` | `tech_source` |

#### Form 13 — Project Scope Statement
| Original | Corrected |
|----------|-----------|
| `project_scope_description` | `scope_description` |
| `project_deliverables` | `deliverables` |
| `product_acceptance_criteria` | `acceptance_criteria` |
| `project_exclusions` | `exclusions` |
| `project_constraints` | `constraints` |
| `project_assumptions` | `assumptions` |

#### Form 14 — Work Breakdown Structure
| Original | Corrected |
|----------|-----------|
| `wbs_element_name` | `element_name` |
| `deliverable_name` | `deliverable` |
| `work_package_name` | `work_package` |
| `responsible_owner` | `owner` |

#### Form 15 — WBS Dictionary
| Original | Corrected |
|----------|-----------|
| `description_of_work` | `work_description` |
| `responsible_organization` | `organization` |
| `schedule_milestones` | `milestones` |
| `associated_schedule_activities` | `activities` |
| `resources_required` | `resources` |
| `quality_requirements` | `quality_reqs` |
| `agreement_information` | `agreement_info` |

#### Form 16 — Schedule Management Plan
| Original | Corrected |
|----------|-----------|
| `scheduling_methodology` | `methodology` |
| `scheduling_tool` | `tool` |
| `level_of_accuracy` | `accuracy_level` |
| `units_of_measure` | `units` |
| `variance_thresholds` | `thresholds` |
| `schedule_reporting_and_format` | `reporting_format` |
| `rules_of_performance_measurement` | `performance_rules` |
| `schedule_model_maintenance` | `model_maintenance` |
| `release_and_iteration_length_if_agile` | `iteration_length` |

#### Form 17 — Activity List
| Original | Corrected |
|----------|-----------|
| `description_of_work` | `work_description` |
| `responsible_person` | `owner` |

#### Form 18 — Activity Attributes
| Original | Corrected |
|----------|-----------|
| `description_of_work` | `work_description` |
| `predecessor_activities` | `predecessors` |
| `successor_activities` | `successors` |
| `logical_relationships` | `relationships` |
| `leads_and_lags` | `lead_lag` |
| `resource_requirements_and_skill_levels` | `resource_requirements` |
| `location_of_performance` | `location` |
| `type_of_effort` | `effort_type` |
| `planned_release_or_iteration` | `iteration` |

#### Form 19 — Milestone List
| Original | Corrected |
|----------|-----------|
| `milestone_name` | `name` |
| `milestone_description` | `description` |
| `milestone_type` | `type` |
| `mandatory_or_optional` | `is_mandatory` |
| `related_deliverable` | `deliverable` |

#### Form 20 — Network Diagram
| Original | Corrected |
|----------|-----------|
| `predecessor_activity_id` | `predecessor_id` |
| `successor_activity_id` | `successor_id` |
| `dependency_notes` | `notes` |
| `diagram_attachment` | `attachment` |

#### Form 21 — Duration Estimates
| Original | Corrected |
|----------|-----------|
| `duration_estimate` | `estimate` |
| `duration_units` | `units` |
| `basis_of_estimate` | `basis` |
| `confidence_level` | `confidence` |

#### Form 22 — Duration Estimating Worksheet
| Original | Corrected |
|----------|-----------|
| `optimistic_duration` | `optimistic` |
| `most_likely_duration` | `most_likely` |
| `pessimistic_duration` | `pessimistic` |
| `calculated_expected_duration` | `expected_duration` |
| `standard_deviation` | `std_deviation` |
| `estimating_method` | `method` |
| `basis_of_estimate` | `basis` |

#### Form 23 — Project Schedule
| Original | Corrected |
|----------|-----------|
| `assigned_resources` | `resources` |
| `milestone_flag` | `is_milestone` |
| `critical_path_flag` | `is_critical_path` |
| `percent_complete` | `pct_complete` |

#### Form 24 — Cost Management Plan
| Original | Corrected |
|----------|-----------|
| `units_of_measure` | `units` |
| `level_of_precision` | `precision_level` |
| `level_of_accuracy` | `accuracy_level` |
| `organizational_procedure_links` | `org_procedure_links` |
| `control_thresholds` | `thresholds` |
| `rules_of_performance_measurement` | `performance_rules` |
| `cost_reporting_information_and_format` | `reporting_format` |
| `additional_details` | `notes` |

#### Form 25 — Cost Estimates
| Original | Corrected |
|----------|-----------|
| `cost_estimate_id` | `estimate_id` |
| `cost_category` | `category` |
| `estimated_quantity` | `quantity` |
| `basis_of_estimate` | `basis` |
| `confidence_level` | `confidence` |

#### Form 26 — Cost Estimating Worksheet
| Original | Corrected |
|----------|-----------|
| `total_estimated_cost` | `total_cost` |
| `basis_of_estimate` | `basis` |

#### Form 28 — Cost Baseline
| Original | Corrected |
|----------|-----------|
| `cumulative_planned_cost` | `cumulative_cost` |
| `contingency_reserve` | `contingency` |
| `management_reserve` | `mgmt_reserve` |

#### Form 29 — Quality Management Plan
| Original | Corrected |
|----------|-----------|
| `quality_standards` | `standards` |
| `quality_objectives` | `objectives` |
| `quality_roles_and_responsibilities` | `roles_responsibilities` |
| `project_deliverables_and_processes_subject_to_quality_review` | `quality_review_scope` |
| `quality_control_activities` | `control_activities` |
| `quality_assurance_activities` | `assurance_activities` |
| `quality_tools` | `tools` |
| `quality_reporting` | `reporting` |
| `continuous_improvement_approach` | `improvement_approach` |

#### Form 30 — Quality Metrics
| Original | Corrected |
|----------|-----------|
| `metric_name` | `name` |
| `metric_description` | `description` |
| `measurement_method` | `method` |

#### Form 31 — Responsibility Assignment Matrix
| Original | Corrected |
|----------|-----------|
| `wbs_id_or_deliverable` | `wbs_id` |
| `activity_or_work_package` | `activity` |
| `role_or_resource` | `resource` |
| `responsibility_type` | `raci_type` |

#### Form 32 — Resource Management Plan
| Original | Corrected |
|----------|-----------|
| `resource_identification_approach` | `identification_approach` |
| `acquiring_resources_approach` | `acquisition_approach` |
| `roles_and_responsibilities` | `roles_responsibilities` |
| `project_organization_chart` | `org_chart` |
| `project_team_resource_management` | `team_management` |
| `team_development_approach` | `development_approach` |
| `resource_control_approach` | `control_approach` |

#### Form 33 — Team Charter
| Original | Corrected |
|----------|-----------|
| `team_values_and_principles` | `values_principles` |
| `decision_making_process` | `decision_process` |
| `conflict_resolution_process` | `conflict_resolution` |
| `other_agreements` | `agreements` |
| `team_member_signatures` | `signatures` |

#### Form 34 — Resource Requirements
| Original | Corrected |
|----------|-----------|
| `type_of_resource` | `resource_type` |
| `resource_description` | `description` |
| `needed_from_date` | `start_date` |
| `needed_to_date` | `end_date` |
| `basis_of_estimate` | `basis` |

#### Form 35 — Resource Breakdown Structure
| Original | Corrected |
|----------|-----------|
| `resource_category` | `category` |
| `resource_type` | `type` |
| `resource_name` | `name` |
| `hierarchy_level` | `level` |
| `parent_resource_category` | `parent_category` |

#### Form 36 — Communications Management Plan
| Original | Corrected |
|----------|-----------|
| `stakeholder_or_audience` | `audience` |
| `communication_information_needs` | `info_needs` |
| `communication_method` | `method` |
| `sender_owner` | `owner` |
| `technology_used` | `technology` |
| `confidentiality_level` | `confidentiality` |

#### Form 37 — Risk Management Plan
| Original | Corrected |
|----------|-----------|
| `risk_strategy` | `strategy` |
| `roles_and_responsibilities` | `roles_responsibilities` |
| `risk_categories` | `categories` |
| `stakeholder_risk_appetite` | `risk_appetite` |
| `definitions_of_probability_and_impact` | `prob_impact_definitions` |
| `probability_and_impact_matrix` | `pi_matrix` |
| `reporting_formats` | `reporting_format` |

#### Form 38 — Risk Register
| Original | Corrected |
|----------|-----------|
| `risk_title` | `title` |
| `risk_description` | `description` |
| `risk_category` | `category` |
| `risk_event` | `event` |
| `risk_owner` | `owner` |
| `risk_response_strategy` | `response_strategy` |
| `response_actions` | `actions` |
| `trigger_conditions` | `trigger` |
| `contingency_plan` | `contingency` |

#### Form 39 — Risk Report
| Original | Corrected |
|----------|-----------|
| `overall_project_risk` | `overall_risk` |
| `risk_exposure_summary` | `exposure_summary` |
| `risk_distribution_by_category` | `category_distribution` |
| `risk_trends` | `trends` |
| `risk_response_status` | `response_status` |
| `risk_audit_summary` | `audit_summary` |

#### Form 40 — Probability and Impact Assessment
| Original | Corrected |
|----------|-----------|
| `risk_description` | `description` |
| `probability_rating` | `probability` |
| `impact_rating` | `impact` |
| `risk_score` | `score` |

#### Form 41 — Probability and Impact Matrix
| Original | Corrected |
|----------|-----------|
| `matrix_cell_score` | `cell_score` |
| `risk_priority_zone` | `priority_zone` |

#### Form 42 — Risk Data Sheet
| Original | Corrected |
|----------|-----------|
| `risk_description` | `description` |
| `risk_category` | `category` |
| `contingency_reserve` | `contingency` |

#### Form 43 — Procurement Management Plan
| Original | Corrected |
|----------|-----------|
| `procurement_strategy` | `strategy` |
| `procurement_definition` | `definition` |
| `procurement_documents` | `documents` |
| `procurement_risks` | `risks` |
| `source_selection_criteria` | `selection_criteria` |
| `make_or_buy_decisions` | `make_or_buy` |
| `vendor_management_approach` | `vendor_management` |
| `contract_change_control` | `change_control` |
| `procurement_performance_metrics` | `performance_metrics` |

#### Form 44 — Procurement Strategy
| Original | Corrected |
|----------|-----------|
| `procurement_item` | `item` |
| `procurement_objective` | `objective` |
| `procurement_phases` | `phases` |
| `make_or_buy_decision` | `make_or_buy` |
| `supplier_selection_method` | `selection_method` |

#### Form 45 — Source Selection Criteria
| Original | Corrected |
|----------|-----------|
| `criterion_name` | `name` |
| `criterion_description` | `description` |
| `scoring_method` | `method` |
| `minimum_score` | `min_score` |

#### Form 46 — Stakeholder Engagement Plan
| Original | Corrected |
|----------|-----------|
| `stakeholder_name_or_group` | `stakeholder` |
| `current_engagement_level` | `current_level` |
| `desired_engagement_level` | `desired_level` |
| `engagement_gap` | `gap` |
| `stakeholder_engagement_approach` | `approach` |
| `communication_strategy` | `strategy` |
| `review_frequency` | `frequency` |

#### Form 47 — Issue Log
| Original | Corrected |
|----------|-----------|
| `issue_type` | `type` |
| `issue_description` | `description` |
| `impact_on_objectives` | `impact` |
| `responsible_party` | `owner` |
| `final_resolution` | `resolution` |

#### Form 48 — Decision Log
| Original | Corrected |
|----------|-----------|
| `decision_description` | `description` |
| `decision_maker` | `made_by` |
| `decision_date` | `date` |
| `alternatives_considered` | `alternatives` |
| `action_required` | `action` |

#### Form 49 — Change Request
| Original | Corrected |
|----------|-----------|
| `change_description` | `description` |
| `reason_for_change` | `reason` |
| `change_type` | `type` |
| `impact_on_scope` | `scope_impact` |
| `impact_on_schedule` | `schedule_impact` |
| `impact_on_cost` | `cost_impact` |
| `impact_on_quality` | `quality_impact` |
| `impact_on_resources` | `resource_impact` |
| `impact_on_risk` | `risk_impact` |
| `approval_status` | `status` |

#### Form 50 — Change Log
| Original | Corrected |
|----------|-----------|
| `change_description` | `description` |
| `change_type` | `type` |
| `date_submitted` | `submitted_date` |
| `implementation_date` | `implemented_date` |

#### Form 52 — Quality Audit
| Original | Corrected |
|----------|-----------|
| `audit_area` | `area` |
| `audit_objective` | `objective` |
| `audit_criteria` | `criteria` |
| `audit_date` | `date` |
| `responsible_owner` | `owner` |

#### Form 53 — Team Performance Assessment
| Original | Corrected |
|----------|-----------|
| `team_or_member` | `subject` |
| `assessment_period` | `period` |
| `performance_criteria` | `criteria` |
| `improvement_areas` | `areas_for_improvement` |

#### Form 54 — Team Member Status Report
| Original | Corrected |
|----------|-----------|
| `reporting_period` | `period` |
| `work_completed` | `completed_work` |
| `work_planned_next_period` | `planned_work` |
| `percent_complete` | `pct_complete` |
| `support_needed` | `support_required` |

#### Form 55 — Project Status Report
| Original | Corrected |
|----------|-----------|
| `reporting_period` | `period` |
| `accomplishments_this_period` | `accomplishments` |
| `planned_work_next_period` | `planned_work` |
| `milestones_status` | `milestone_status` |
| `change_requests_status` | `change_status` |
| `escalation_required` | `escalation` |

#### Form 56 — Variance Analysis
| Original | Corrected |
|----------|-----------|
| `variance_amount` | `variance` |
| `variance_percentage` | `variance_pct` |
| `cause_of_variance` | `cause` |

#### Form 57 — Earned Value Analysis
| Original | Corrected |
|----------|-----------|
| `measurement_date` | `date` |
| `planned_value_pv` | `pv` |
| `earned_value_ev` | `ev` |
| `actual_cost_ac` | `ac` |
| `schedule_variance_sv` | `sv` |
| `cost_variance_cv` | `cv` |
| `schedule_performance_index_spi` | `spi` |
| `cost_performance_index_cpi` | `cpi` |
| `estimate_at_completion_eac` | `eac` |
| `estimate_to_complete_etc` | `etc` |
| `variance_at_completion_vac` | `vac` |
| `to_complete_performance_index_tcpi` | `tcpi` |
| `corrective_actions` | `actions` |

#### Form 58 — Risk Audit
| Original | Corrected |
|----------|-----------|
| `risk_response_reviewed` | `response_reviewed` |
| `effectiveness_of_response` | `response_effectiveness` |
| `residual_risk_status` | `residual_status` |
| `new_risks_identified` | `new_risks` |
| `audit_findings` | `findings` |

#### Form 59 — Contractor Status Report
| Original | Corrected |
|----------|-----------|
| `reporting_period` | `period` |
| `work_completed` | `completed_work` |
| `work_planned_next_period` | `planned_work` |
| `deliverables_status` | `deliverable_status` |
| `invoices_submitted` | `invoices` |
| `support_needed` | `support_required` |

#### Form 60 — Procurement Audit
| Original | Corrected |
|----------|-----------|
| `procurement_item` | `item` |
| `vendor_or_supplier` | `vendor` |
| `procurement_process_reviewed` | `process_reviewed` |
| `compliance_findings` | `compliance` |
| `performance_findings` | `performance` |
| `issues_identified` | `issues` |

#### Form 61 — Contract Closeout Report
| Original | Corrected |
|----------|-----------|
| `contract_description` | `description` |
| `deliverables_completed` | `deliverables` |
| `claims_or_disputes` | `claims` |
| `documentation_archived` | `archived` |
| `closeout_approval` | `approved_by` |

#### Form 62 — Product Acceptance Form
| Original | Corrected |
|----------|-----------|
| `deliverable_name` | `name` |
| `product_or_service_description` | `description` |
| `validation_result` | `result` |
| `defects_or_open_items` | `defects` |
| `acceptance_date` | `date` |
| `conditional_acceptance_notes` | `conditions` |
| `rejection_reason` | `reason` |

#### Form 63 — Lessons Learned Summary
| Original | Corrected |
|----------|-----------|
| `project_phase` | `phase` |
| `what_did_not_go_well` | `what_went_wrong` |
| `future_project_guidance` | `guidance` |
| `archived_location` | `archive_location` |

#### Form 64 — Project or Phase Closeout
| Original | Corrected |
|----------|-----------|
| `closeout_type` | `type` |
| `phase_or_project_name` | `name` |
| `final_deliverables` | `deliverables` |
| `final_budget_status` | `budget_status` |
| `final_schedule_status` | `schedule_status` |
| `final_scope_status` | `scope_status` |
| `documentation_archived` | `archived` |
| `resources_released` | `resources` |
| `contracts_closed` | `contracts` |
| `lessons_learned_completed` | `lessons_done` |
| `closeout_approval` | `approved_by` |

#### Form 65 — Product Vision
| Original | Corrected |
|----------|-----------|
| `product_name` | `name` |
| `target_customer` | `customer` |
| `customer_need` | `need` |
| `product_description` | `description` |
| `key_benefits` | `benefits` |
| `business_goals` | `goals` |
| `success_metrics` | `metrics` |
| `vision_owner` | `owner` |

#### Form 66 — Product Backlog
| Original | Corrected |
|----------|-----------|
| `backlog_item_id` | `item_id` |
| `epic_or_feature` | `epic` |
| `effort_estimate` | `effort` |
| `sprint_or_release` | `sprint` |

#### Form 67 — Release Plan
| Original | Corrected |
|----------|-----------|
| `release_name` | `name` |
| `release_goal` | `goal` |
| `release_date` | `date` |
| `included_backlog_items` | `backlog_items` |
| `release_owner` | `owner` |

#### Form 68 — Retrospective
| Original | Corrected |
|----------|-----------|
| `iteration_or_sprint` | `sprint` |
| `what_could_be_improved` | `improvements` |
| `lessons_learned_link` | `lessons_link` |

---

## 9. Review Section

Implementation is complete for both Platform and Simulator systems with parity for the core Forms & Attributes engine.

### Completed work summary
- Created SQL foundation files `v502` to `v506` for dynamic form engine tables, simulator mirrors, missing normalized registers, and all 68 process guide form template seeds.
- Implemented `formEngineService` with CRUD, status transitions, version snapshots, attachments, comments, and record-link creation for both `platformDb` and `simDb`.
- Added calculations and validation utilities (`formCalculations`, `formValidation`) including shorthand numeric conversion (`10t`, `3m`), risk scoring, EVM metrics, and three-point estimates.
- Built dynamic UI components under `src/components/forms/` including renderer, field/table sections, approvals, version history, attachments, export menu, audit timeline, related records, and autosave indicator.
- Added form pages/routes under `src/pages/forms/` and wired Platform + Simulator routing in `src/App.jsx`.
- Added dashboard widgets under `src/components/forms/dashboard/`.
- Added unit tests for form engine service, calculations, and validation.
- Updated PM/PMO + Simulator PM/PMO menu configuration with Process Group Forms entries.

### Completion status
- Phase 1: Completed
- Phase 2: Completed
- Phase 3: Completed
- Phase 4: Completed
- Phase 5: Completed
- Phase 6: Completed
- Phase 7: Completed
- Phase 8: Completed
- Phase 9: Completed

---

**Status:** COMPLETE - Implemented for Platform and Simulator parity.
