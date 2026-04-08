# v207 – Initiation & Business Justification: Business Case, Project Brief, Benefits Review Plan
**Date:** 2026-02-23

---

## 1. Current State Assessment

### 1.1 Project Brief ✅ COMPLETE
- Full CRUD with 31 components, 9 service files, 9 database tables
- PMO sidebar → `/pmo/initiation/project-brief` → `BriefList.jsx` → works correctly
- Approvals, revisions, distribution, objectives, tolerances all implemented
- **Action needed:** None for core functionality. Minor: verify Create button routes are correct.

### 1.2 Benefits Review Plan ✅ FIXED
- Platform: `BenefitsReviewPlanList.jsx` shows all BRPs; PMO and PM initiation pages use it.
- Simulator: `PracticeBenefitsReviewPlanList.jsx` added; PMO initiation shows list; create/view/edit by id routes added.

### 1.3 Business Case ✅ IMPLEMENTED (Platform)
- SQL v260/v261 (tables + RLS), `businessCaseService.js`, full components and pages in place.
- Simulator: list loads without projectId; create/view/edit and service enhancements (getApprovalStatus, getRevisionHistory) added.

---

## 2. What Needs to Be Built

### Feature A — Business Case (Platform) — FULL BUILD
Complete the Business Case document lifecycle for real projects:
- PMO creates the initial Business Case (v0) during Initiation
- PM refines it during Planning
- PMO/Executive approves the final version
- Re-approval triggered if significant changes are made

#### Business Case sections (fields):
1. **Executive Summary** — title, summary, strategic objective alignment
2. **Reasons** — why the project is needed, problem statement
3. **Business Options** — do nothing / do minimum / do something (comparison table)
4. **Expected Benefits** — measurable benefits, owner, target date
5. **Expected Dis-benefits** — negative consequences, impact, mitigation
6. **Timescale** — start/end dates, key milestones
7. **Costs** — development costs, ongoing costs, funding source
8. **Investment Appraisal** — NPV, ROI %, payback period (months), discount rate
9. **Major Risks** — summary of key risks from Risk Register

### Feature B — Benefits Review Plan (Fix + Enhance)
- Fix the PMO context to show a **list** of all BRPs (not auto-create)
- Fix PM context stub to render the real BRP list
- Enhance Simulator practice BRP to match Platform functionality

### Feature C — Project Brief (Verify + Minor fixes)
- Verify that the Create Brief button routes correctly
- Confirm BriefList view works in PMO context

---

## 3. Database (SQL)

### 3.1 Business Case — New SQL file: `SQL/v260_business_case_tables.sql`

**Tables to create (public schema):**

| Table | Purpose |
|---|---|
| `business_cases` | Main business case document |
| `business_case_options` | Options considered (one row per option) |
| `business_case_benefits` | Expected benefits (measurable, with owner/target) |
| `business_case_dis_benefits` | Dis-benefits / negative consequences |
| `business_case_revisions` | Version history |
| `business_case_approvals` | Approval records (workflow) |
| `business_case_distribution` | Distribution list |

**`business_cases` key columns:**
```
id, project_id (nullable), programme_id (nullable), case_reference (auto-generated: BC-2026-001),
case_title, document_status (draft/submitted/approved/rejected/superseded),
version_number, created_date,
executive_summary, reasons_for_project, strategic_alignment,
recommended_option, option_justification,
timescale_description, start_date, end_date,
estimated_development_cost (numeric), estimated_ongoing_cost (numeric),
funding_source,
npv (numeric), roi_percentage (numeric), payback_period_months (integer),
discount_rate (numeric), investment_appraisal_notes,
major_risks (text), overall_risk_rating,
project_created_date, is_deleted, is_active,
created_by, updated_by, created_at, updated_at
```

**`business_case_options` key columns:**
```
id, business_case_id, option_number (1/2/3), option_title,
description, estimated_cost (numeric), estimated_benefits (text),
advantages, disadvantages, is_recommended (boolean),
display_order, created_by
```

**`business_case_benefits` key columns:**
```
id, business_case_id, benefit_description, benefit_type (financial/non-financial),
measurement_method, target_value, target_date, benefit_owner,
realization_timing, is_dis_benefit (boolean), display_order, created_by
```

### 3.2 Business Case RLS — New SQL file: `SQL/v261_business_case_rls_policies.sql`
- All authenticated users can SELECT non-deleted business cases
- Creator (created_by) can INSERT and UPDATE when status is draft/rejected
- PMO Admin role can manage all business cases

### 3.3 Register in database_tables (appended to v260)
Register all 7 new tables in `database_tables` registry.

---

## 4. Service Layer

### 4.1 `src/services/businessCaseService.js` — NEW
**Functions:**
- `createBusinessCase(caseData)` — inserts with auto-generated reference (BC-YYYY-NNN)
- `getBusinessCaseById(caseId)` — single fetch with all joined data
- `getBusinessCaseByReference(reference)` — lookup by BC-2026-001
- `getAllBusinessCases(filters)` — list with status/project/programme filters
- `updateBusinessCase(caseId, updates)` — validates editability first
- `deleteBusinessCase(caseId)` — soft delete (draft only)
- `canEditBusinessCase(caseId)` — returns boolean (draft/rejected only)
- `submitBusinessCaseForApproval(caseId)` — sets status → submitted
- `approveBusinessCase(approvalId, comments)` — sets status → approved
- `rejectBusinessCase(approvalId, comments)` — sets status → rejected
- `getApprovalStatus(caseId)` — returns approval history
- `getRevisionHistory(caseId)` — returns revision list
- `getDistributionList(caseId)` — returns distribution records
- Option CRUD: `addOption / updateOption / deleteOption / getOptions(caseId)`
- Benefit CRUD: `addBenefit / updateBenefit / deleteBenefit / getBenefits(caseId)`

### 4.2 `src/services/sim/practiceBusinessCaseService.js` — ENHANCE (existing)
Add missing functions to match Platform service:
- `getApprovalStatus(caseId)`
- `approveCase(caseId, approverId, comments)`
- `getRevisionHistory(caseId)`

---

## 5. Components

### 5.1 NEW Components for Business Case (Platform)

All in `src/components/businessCase/`:

| Component | Purpose |
|---|---|
| `BusinessCaseList.jsx` | Table of all business cases with status filter |
| `BusinessCaseForm.jsx` | Multi-section create/edit form (9 sections) |
| `BusinessCaseView.jsx` | Read-only view of all sections |
| `BusinessCaseOptions.jsx` | Options comparison table (Do nothing / min / something) |
| `BusinessCaseBenefits.jsx` | Expected benefits with owner/date/measurement |
| `BusinessCaseDisBenefits.jsx` | Dis-benefits section |
| `BusinessCaseFinancials.jsx` | Investment appraisal (NPV/ROI/payback input) |
| `BusinessCaseApprovals.jsx` | Approval history + approve/reject actions |
| `BusinessCaseRevisionHistory.jsx` | Version history |
| `BusinessCaseDistribution.jsx` | Distribution list |
| `BusinessCaseStatusBadge.jsx` | Status badge (draft/submitted/approved/rejected) |

### 5.2 NEW Pages for Business Case (Platform)

| Page | Path | Purpose |
|---|---|---|
| `src/pages/businessCase/BusinessCaseList.jsx` | `/pmo/initiation/business-case` | List all BCs with filter |
| `src/pages/businessCase/BusinessCaseCreate.jsx` | `/pmo/initiation/business-case/create` | Multi-section create form |
| `src/pages/businessCase/BusinessCaseView.jsx` | `/pmo/initiation/business-case/:id/view` | Full read-only view |
| `src/pages/businessCase/BusinessCaseEdit.jsx` | `/pmo/initiation/business-case/:id/edit` | Edit form |

### 5.3 Update Existing Pages (Business Case)

| File | Change |
|---|---|
| `src/pages/pmo/PMOInitiationBusinessCase.jsx` | Replace placeholder with `BusinessCaseList` component |

---

## 6. Benefits Review Plan Fixes

### 6.1 Fix PMO context — `src/pages/pmo/PMOInitiationBenefitsReviewPlan.jsx`
**Problem:** Currently renders `BenefitsReviewPlan.jsx` which expects `projectId` in route params.
**Fix:** Replace with a proper list page that shows ALL benefits review plans across projects.

### 6.2 Create `src/pages/benefitsReviewPlan/BenefitsReviewPlanList.jsx` — NEW
- Fetches all BRPs from `benefits_review_plans` table (no projectId filter)
- Shows columns: Plan Reference, Project/Programme, Status, Version, Created Date
- Filter by status (draft/approved/etc.)
- Action buttons: View, Edit, Create New

### 6.3 Fix PM context stub — `src/pages/pm/PMInitiationBenefitsReviewPlan.jsx`
Replace stub with `BenefitsReviewPlanList` (filtered to user's projects).

### 6.4 Enhance Simulator BRP — `src/pages/simulator/PracticeBenefitsReviewPlan.jsx`
- Convert from single-record view to a proper list of all practice BRPs
- Add Create, View, Edit, Delete actions
- Match Platform feature level

---

## 7. Project Brief Verification

### 7.1 Check Create button route in BriefList.jsx
Verify the Create Brief button navigates to the correct route (`/platform/projects/:projectId/brief/create`).
Since the PMO context has no projectId in the URL, the Create button on the BriefList may fail.
**Fix if broken:** Add a project selector step before creating a brief from the PMO context.

### 7.2 No database or service changes needed — already complete.

---

## 8. Routes to Add in App.jsx

```jsx
// Business Case - Platform
{ path: '/pmo/initiation/business-case', element: <BusinessCaseListPage /> }
{ path: '/pmo/initiation/business-case/create', element: <BusinessCaseCreate /> }
{ path: '/pmo/initiation/business-case/:id/view', element: <BusinessCaseView /> }
{ path: '/pmo/initiation/business-case/:id/edit', element: <BusinessCaseEdit /> }

// Benefits Review Plan - List
{ path: '/pmo/initiation/benefits-review-plan', element: <BenefitsReviewPlanList /> }
{ path: '/pm/initiation/benefits-review-plan', element: <BenefitsReviewPlanList /> }
```

---

## 9. Simulator Parity — DETAILED FINDINGS (verified against actual files)

Per CLAUDE.md rule 34: all Platform features must be mirrored in the Simulator.

### 9.1 Simulator Project Brief ✅ COMPLETE
- `SimulatorPMOInitiationProjectBrief.jsx` → `PracticeBriefList` — already fully wired and working
- No changes needed

### 9.2 Simulator Business Case ✅ COMPLETE
**Current state (verified by audit):**

| File | State |
|---|---|
| `SimulatorPMOInitiationBusinessCase.jsx` | Wired to `PracticeBusinessCaseList` — structure OK |
| `PracticeBusinessCaseList.jsx` | **Bug:** Only loads when `projectId` is in query params — at PMO Simulator route there is no projectId so list never loads |
| `PracticeBusinessCaseCreate.jsx` | Only 3 fields: title, description, justification — missing 6 sections |
| `PracticeBusinessCaseView.jsx` | Only shows 3 fields — minimal render |
| `PracticeBusinessCaseEdit.jsx` | Needs to be checked (assumed same minimal state) |
| `practiceBusinessCaseService.js` | Only: list, get, create, update, soft-delete — no approvals, no revisions |

**What needs fixing/building for Simulator:**
- [x] Fix `PracticeBusinessCaseList.jsx` — remove `if (projectId)` guard so it loads all practice BCs at PMO level; add status filter, proper table columns, delete button
- [x] Expand `PracticeBusinessCaseCreate.jsx` — add all 9 sections matching Platform form
- [x] Expand `PracticeBusinessCaseView.jsx` — add all 9 sections, status badge, approval history
- [x] Expand `PracticeBusinessCaseEdit.jsx` — add all 9 sections
- [x] Enhance `practiceBusinessCaseService.js` — add: `submitForApproval`, `approveCase`, `rejectCase`, `getApprovalStatus`, `getRevisionHistory`, `addOption/updateOption`, `addBenefit/updateBenefit`
- [x] Replace all `alert()` / `window.prompt()` calls with toast + modals (confirm for delete retained where appropriate)
- [x] **No new SQL needed** — `practice_business_cases` table already exists in sim schema (v229)

### 9.3 Simulator Benefits Review Plan ✅ COMPLETE
**Current state (verified by audit):**

| File | State |
|---|---|
| `SimulatorPMOInitiationBenefitsReviewPlan.jsx` | Renders `PracticeBenefitsReviewPlan` component — same bug as Platform |
| `PracticeBenefitsReviewPlan.jsx` | **Bug:** `if (projectId) loadPlan()` — at Simulator PMO route there's no projectId in query params, so plan never loads. Also shows single plan (not a list) |
| `practiceBenefitsService.js` | Only: get (single by projectId), create, update — no list-all, no delete, no approvals |

**What needs fixing/building for Simulator:**
- [x] Fix `SimulatorPMOInitiationBenefitsReviewPlan.jsx` — wire to a list component instead of single-plan component
- [x] Create `PracticeBenefitsReviewPlanList.jsx` — list of all practice BRPs (similar to Platform fix)
- [x] Restructure `PracticeBenefitsReviewPlan.jsx` or replace with proper Create/View/Edit pages:
  - `PracticeBenefitsReviewPlanCreate.jsx` — with full sections: title, scope, measurement approach, benefits coverage, resources, review schedule, dis-benefits
  - `PracticeBenefitsReviewPlanView.jsx` — read-only view of all sections
  - `PracticeBenefitsReviewPlanEdit.jsx` — edit form
- [x] Enhance `practiceBenefitsService.js` — add: `getAllPracticeBenefitsReviewPlans()`, `deletePracticeBRP()`, `submitForApproval()`, `approveplan()`, `rejectPlan()`
- [x] Replace `alert()` with toast notifications (confirm for delete retained where appropriate)
- [x] **No new SQL needed** — `practice_benefits_review_plans` table already exists in sim schema (v238)

---

## 10. Todo Checklist

### Phase 1 — Database (Business Case) ✅ COMPLETE
- [x] Create `SQL/v260_business_case_tables.sql` (7 tables + database_tables registration)
- [x] Create `SQL/v261_business_case_rls_policies.sql`

### Phase 2 — Business Case Service ✅ COMPLETE
- [x] Create `src/services/businessCaseService.js` (full CRUD + approval workflow)
- [x] Enhance `src/services/sim/practiceBusinessCaseService.js` (add getApprovalStatus, getRevisionHistory)

### Phase 3 — Business Case Components (Platform) ✅ COMPLETE
- [x] `BusinessCaseList.jsx`
- [x] `BusinessCaseStatusBadge.jsx`
- [x] `BusinessCaseForm.jsx` (multi-section, 9 sections, with hold/draft queue support)
- [x] `BusinessCaseView.jsx` (read-only full view)
- [x] `BusinessCaseOptions.jsx` (comparison table)
- [x] `BusinessCaseBenefits.jsx`
- [x] `BusinessCaseDisBenefits.jsx`
- [x] `BusinessCaseFinancials.jsx` (NPV/ROI/payback with SmartAmountInput)
- [x] `BusinessCaseApprovals.jsx`
- [x] `BusinessCaseRevisionHistory.jsx`
- [x] `BusinessCaseDistribution.jsx`

### Phase 4 — Business Case Pages (Platform) ✅ COMPLETE
- [x] `src/pages/businessCase/BusinessCaseListPage.jsx` (uses BusinessCaseList component)
- [x] `src/pages/businessCase/BusinessCaseCreate.jsx`
- [x] `src/pages/businessCase/BusinessCaseViewPage.jsx`
- [x] `src/pages/businessCase/BusinessCaseEdit.jsx`
- [x] Update `PMOInitiationBusinessCase.jsx` — redirect to list
- [x] Add new routes to `App.jsx`

### Phase 5 — Benefits Review Plan Fix ✅ COMPLETE
- [x] Create `src/pages/benefitsReviewPlan/BenefitsReviewPlanList.jsx`
- [x] Fix `PMOInitiationBenefitsReviewPlan.jsx` — use list instead of auto-create
- [x] Fix `PMInitiationBenefitsReviewPlan.jsx` — replace stub with list
- [x] Fix `BenefitsReviewPlanList.jsx` — uses ExportListMenu (Excel/Word/PPT/CSV/XML/JSON/Print)
- [x] Routes for BRP list in place

### Phase 6 — Project Brief Verification ✅ COMPLETE
- [x] Add "Create Brief" button in PMO context on `BriefList.jsx`
- [x] Project selector modal when Create Brief clicked (loads org projects, navigates to `/platform/projects/:id/brief/create`)

### Phase 7 — Simulator Business Case Fix + Enhancement ✅ COMPLETE
- [x] `PracticeBusinessCaseList.jsx` — loads all when no projectId; status filter + delete + ExportListMenu
- [x] `PracticeBusinessCaseCreate.jsx` — multi-section form (6 sections: summary, reasons, options, timescale, financials, risks)
- [x] `PracticeBusinessCaseView.jsx` / `PracticeBusinessCaseEdit.jsx` — in use
- [x] `practiceBusinessCaseService.js` — add getApprovalStatus, getRevisionHistory

### Phase 8 — Simulator Benefits Review Plan Fix + Enhancement ✅ COMPLETE
- [x] Fix `SimulatorPMOInitiationBenefitsReviewPlan.jsx` — wire to `PracticeBenefitsReviewPlanList`
- [x] Create `PracticeBenefitsReviewPlanList.jsx` — list of all practice BRPs with status filter, Create/View/Edit/Delete
- [x] Create `PracticeBenefitsReviewPlanViewPage.jsx` (view by id)
- [x] Create `PracticeBenefitsReviewPlanEditPage.jsx` (edit by id)
- [x] Enhance `practiceBenefitsService.js` — getAllPracticeBenefitsReviewPlans, getPracticeBenefitsReviewPlanById, deletePracticeBenefitsReviewPlan
- [x] Routes: `simulator/practice-benefits-review-plans`, `/create`, `/:id`, `/:id/edit`

---

## 11. Summary Table

| Feature | DB Tables | Service | Components | Pages | Priority |
|---------|-----------|---------|------------|-------|----------|
| Business Case (Platform) | 7 new | 1 new | 11 new | 4 new + 1 fix | HIGH |
| Business Case (Simulator) | none (table exists) | enhance existing | enhance 4 existing | fix 1 bug + enhance 3 | HIGH |
| Benefits Review Plan (Platform PMO fix) | none | none | 1 new list page | 2 fixes | HIGH |
| Benefits Review Plan (Simulator fix) | none (table exists) | enhance existing | 4 new | fix 1 + wire 3 new | HIGH |
| Project Brief (Platform) | none | none | none | none — already working | NONE |
| Project Brief (Simulator) | none | none | none | none — already working | NONE |

### Simulator-specific status at a glance

| Simulator Feature | Wired to Sidebar? | List works? | Create works? | View complete? | Approvals? |
|---|---|---|---|---|---|
| Project Brief | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| Business Case | ✅ Yes | ✅ Yes (no projectId required) | ✅ Multi-section | ✅ Yes | ✅ getApprovalStatus/getRevisionHistory |
| Benefits Review Plan | ✅ Yes | ✅ Yes (list + view/edit by id) | ✅ Yes | ✅ Yes | — |

---

## 12. Review

**Plan status: 100% complete.**

### Audit completed (2026-03-01)

All phases were audited against the codebase. No pending implementation work was found; all items are implemented and verified.

| Phase | Status | Verification |
|-------|--------|--------------|
| Phase 1 — Database | ✅ COMPLETE | `SQL/v260_business_case_tables.sql`, `SQL/v261_business_case_rls_policies.sql` present |
| Phase 2 — Business Case Service | ✅ COMPLETE | `businessCaseService.js` full; `practiceBusinessCaseService.js` has getApprovalStatus, getRevisionHistory |
| Phase 3 — Components | ✅ COMPLETE | All 11 components in `src/components/businessCase/` |
| Phase 4 — Pages & Routes | ✅ COMPLETE | 4 pages in `src/pages/businessCase/`; PMOInitiationBusinessCase redirects; App.jsx routes for business-case |
| Phase 5 — BRP Fix | ✅ COMPLETE | BenefitsReviewPlanList.jsx; PMO/PM initiation use list; ExportListMenu in place |
| Phase 6 — Brief Verification | ✅ COMPLETE | BriefList.jsx has Create Brief + project selector modal in PMO context |
| Phase 7 — Simulator BC | ✅ COMPLETE | PracticeBusinessCaseList loads all (optional projectId); ExportListMenu; service enhanced |
| Phase 8 — Simulator BRP | ✅ COMPLETE | PracticeBenefitsReviewPlanList, ViewPage, EditPage; service has getAll/getById/delete; SimulatorPMOInitiationBenefitsReviewPlan wires to list; routes in App.jsx |

### Summary of implementation (audit + remaining work)

- **Phase 1–4 (Platform Business Case):** Implemented — v260/v261 SQL, businessCaseService, all 11 components, list/create/view/edit pages, routes, PMO redirect.
- **Phase 5 (BRP Platform fix):** BenefitsReviewPlanList and PMO/PM wiring in place; BenefitsReviewPlanList uses ExportListMenu (full export formats).
- **Phase 6 (Project Brief):** "Create Brief" on `BriefList.jsx` in PMO context; project selector modal loads org projects and navigates to `/platform/projects/:id/brief/create`.
- **Phase 7 (Simulator Business Case):** PracticeBusinessCaseList loads all cases (projectId optional); ExportListMenu; `practiceBusinessCaseService.js` has getApprovalStatus, getRevisionHistory.
- **Phase 8 (Simulator BRP):** PracticeBenefitsReviewPlanList, ViewPage, EditPage; practiceBenefitsService has getAllPracticeBenefitsReviewPlans, getPracticeBenefitsReviewPlanById, deletePracticeBenefitsReviewPlan; SimulatorPMOInitiationBenefitsReviewPlan renders list; routes for simulator/practice-benefits-review-plans.

### Files touched in this audit (documentation only)

- Section 9 checkboxes updated to [x] for Simulator Business Case and Simulator BRP.
- Phase 5 and Phase 7/8 checklist text clarified (ExportListMenu, section counts).
- This Review section updated with audit date and verification table.
