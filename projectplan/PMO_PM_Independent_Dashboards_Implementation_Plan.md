# Implementation Plan: PMO & PM Independent Dashboards
## PRD Reference: `Documents/PMO_PM_Independent_Dashboards_PRD.md`

---

## Overview

Implement two independent dashboards (PMO and PM) with static sidebar menus, role-separated routing (`/pmo/*` and `/pm/*`), and document governance enforcement as defined in the PRD.

---

## Current State Analysis

| Aspect | Current State | Target State |
|--------|---------------|--------------|
| Route prefix | `/platform/*` (unified) | `/pmo/*` and `/pm/*` (separated) |
| Sidebar | Single dynamic sidebar (`Sidebar.jsx`) loading from DB | Two static sidebars (PMO + PM) |
| Dashboard | One platform dashboard | Two independent dashboards |
| Menu config | `pmMenuConfig.js` (monolithic) | `pmoMenuConfig.js` + `pmDashboardMenuConfig.js` |
| Layout | Single `Layout.jsx` | Shared layout with dashboard-aware sidebar selection |
| Document governance | Basic CRUD per document type | Governance-aware permissions (baseline, tailored, lifecycle) |

---

## Phase 1: Static Menu Configurations

### Task 1.1 - Create PMO Sidebar Menu Config
- [x] Create `src/config/pmoMenuConfig.js`
- Sections (per PRD Section 4):
  1. **PMO Governance** (Baselines)
     - Project Mandate Template → `/pmo/governance/mandate-template`
     - Communication Management Strategy → `/pmo/governance/communication-strategy`
     - Configuration Management Strategy → `/pmo/governance/configuration-strategy`
     - Quality Management Strategy → `/pmo/governance/quality-strategy`
     - Risk Management Strategy → `/pmo/governance/risk-strategy`
  2. **Initiation & Business Justification**
     - Business Case → `/pmo/initiation/business-case`
     - Project Brief → `/pmo/initiation/project-brief`
     - Benefits Review Plan → `/pmo/initiation/benefits-review-plan`
  3. **Project Oversight** (Read-Only)
     - Risk Register → `/pmo/oversight/risk-register`
     - Issue Register → `/pmo/oversight/issue-register`
     - Quality Register → `/pmo/oversight/quality-register`
     - Lessons Log → `/pmo/oversight/lessons-log`
  4. **Reporting & Assurance**
     - Highlight Reports → `/pmo/reporting/highlight-reports`
     - Exception Reports → `/pmo/reporting/exception-reports`
     - End Stage Reports → `/pmo/reporting/end-stage-reports`
     - End Project Reports → `/pmo/reporting/end-project-reports`

### Task 1.2 - Create PM Sidebar Menu Config
- [x] Create `src/config/pmDashboardMenuConfig.js`
- Sections (per PRD Section 5):
  1. **Governance Reference** (& Tailoring)
     - Project Mandate Template → `/pm/governance/mandate-template`
     - Communication Management Strategy → `/pm/governance/communication-strategy`
     - Configuration Management Strategy → `/pm/governance/configuration-strategy`
     - Quality Management Strategy → `/pm/governance/quality-strategy`
     - Risk Management Strategy → `/pm/governance/risk-strategy`
  2. **Initiation & Business Justification**
     - Business Case → `/pm/initiation/business-case`
     - Project Brief → `/pm/initiation/project-brief`
     - Project Initiation Document (PID) → `/pm/initiation/pid`
     - Benefits Review Plan → `/pm/initiation/benefits-review-plan`
  3. **Delivery Management**
     - Work Packages → `/pm/delivery/work-packages`
     - Product Description → `/pm/delivery/product-description`
     - Project Product Description → `/pm/delivery/project-product-description`
     - Product Status Account → `/pm/delivery/product-status-account`
     - Daily Log → `/pm/delivery/daily-log`
  4. **Controls & Registers**
     - Risk Register → `/pm/controls/risk-register`
     - Issue Register → `/pm/controls/issue-register`
     - Quality Register → `/pm/controls/quality-register`
     - Configuration Item Records → `/pm/controls/configuration-items`
     - Lessons Log → `/pm/controls/lessons-log`
  5. **Reporting**
     - Checkpoint Reports → `/pm/reporting/checkpoint-reports`
     - Highlight Reports → `/pm/reporting/highlight-reports`
     - Issue Reports → `/pm/reporting/issue-reports`
     - Exception Reports → `/pm/reporting/exception-reports`
     - End Stage Report → `/pm/reporting/end-stage-reports`
  6. **Project Closure**
     - Lessons Report → `/pm/closure/lessons-report`
     - End Project Report → `/pm/closure/end-project-report`

---

## Phase 2: Sidebar Components

### Task 2.1 - Create PMO Sidebar Component
- [x] Create `src/components/pmo/PMOSidebar.jsx`
- Static menu rendered from `pmoMenuConfig.js`
- No dynamic role switching
- Theme-aware (dark/light)
- Active route highlighting
- Collapsible sections with icons
- Mobile-responsive
- "PMO Dashboard" title/branding at top
- Dashboard link at top of sidebar

### Task 2.2 - Create PM Sidebar Component
- [x] Create `src/components/pm/PMSidebar.jsx`
- Static menu rendered from `pmDashboardMenuConfig.js`
- Same structure/styling as PMO sidebar but different menu items
- Project selector dropdown at top (PM works within project context)
- "Project Manager Dashboard" title/branding at top
- Dashboard link at top of sidebar

---

## Phase 3: Layout & Routing

### Task 3.1 - Create PMO Layout Wrapper
- [x] Create `src/components/pmo/PMOLayout.jsx`
- Uses PMOSidebar
- Uses existing header infrastructure (PlatformAppHeader)
- Main content area with proper spacing

### Task 3.2 - Create PM Layout Wrapper
- [ ] Create `src/components/pm/PMLayout.jsx`
- Uses PMSidebar
- Uses existing header infrastructure (PlatformAppHeader)
- Main content area with proper spacing

### Task 3.3 - Create PMO Dashboard Page
- [x] Create `src/pages/pmo/PMODashboard.jsx`
- Landing page for `/pmo/dashboard`
- Summary widgets: governance compliance, pending reviews, project overview
- Theme-aware

### Task 3.4 - Create PM Dashboard Page
- [x] Create `src/pages/pm/PMDashboard.jsx`
- Landing page for `/pm/dashboard`
- Summary widgets: project status, pending tasks, upcoming milestones
- Theme-aware

### Task 3.5 - Register Routes in App.jsx
- [x] Add `/pmo/*` route namespace with PMOLayout wrapper
- [x] Add `/pm/*` route namespace with PMLayout wrapper
- [x] Map all PMO sidebar paths to existing page components (reuse existing)
- [x] Map all PM sidebar paths to existing page components (reuse existing)
- [x] Keep existing `/platform/*` routes intact for backward compatibility
- [x] Remove the legacy `/pm` → `/platform` redirect (conflicts with new `/pm/*`)

Route structure in App.jsx:
```jsx
{/* PMO Dashboard routes */}
<Route path="pmo/*" element={<PMOLayout><Routes>...</Routes></PMOLayout>}>

{/* PM Dashboard routes */}
<Route path="pm/*" element={<PMLayout><Routes>...</Routes></PMLayout>}>
```

---

## Phase 4: Document Governance Context

### Task 4.1 - Create Document Governance Context
- [x] Create `src/context/DocumentGovernanceContext.jsx`
- Provides current user's dashboard context (PMO or PM)
- Determines permission level for each document type
- Exposes helper functions:
  - `canEdit(documentType)` → boolean
  - `canApprove(documentType)` → boolean
  - `canTailor(documentType)` → boolean
  - `getPermissionLevel(documentType)` → 'read' | 'write' | 'approve'
  - `getDocumentState(document)` → 'baseline' | 'tailored' | 'read-only' | 'editable' | 'under-review'

### Task 4.2 - Create Document State Badge Component
- [x] Create `src/components/ui/DocumentStateBadge.jsx`
- Visual indicators for document states:
  - **Baseline** → Blue badge with lock icon
  - **Tailored for Project** → Orange badge with fork icon
  - **Read-Only** → Grey badge with eye icon
  - **Editable** → Green badge with edit icon
  - **Under PMO Review** → Purple badge with clock icon

---

## Phase 5: Page Wrappers for Governance Enforcement

### Task 5.1 - Create PMO Page Wrappers
For each document type accessible in PMO dashboard, create thin wrapper pages that:
- Set the governance context to "PMO"
- Pass appropriate permissions to existing components
- Show document state badges

Pages to create under `src/pages/pmo/`:
- [x] `PMOGovernanceMandateTemplate.jsx` - wraps mandate list/form with PMO write permissions
- [x] `PMOGovernanceCMS.jsx` - wraps CMS list with PMO write permissions
- [x] `PMOGovernanceConfigMS.jsx` - wraps Config MS list with PMO write permissions
- [x] `PMOGovernanceQMS.jsx` - wraps QMS list with PMO write permissions
- [x] `PMOGovernanceRMS.jsx` - wraps RMS list with PMO write permissions
- [x] `PMOInitiationBusinessCase.jsx` - wraps business case with PMO create-v0/approve
- [x] `PMOInitiationProjectBrief.jsx` - wraps brief with PMO create-v0/approve
- [x] `PMOInitiationBenefitsReviewPlan.jsx` - wraps BRP with PMO create-v0/approve
- [x] `PMOOversightRiskRegister.jsx` - wraps risk register with read-only
- [x] `PMOOversightIssueRegister.jsx` - wraps issue register with read-only
- [x] `PMOOversightQualityRegister.jsx` - wraps quality register with read-only
- [x] `PMOOversightLessonsLog.jsx` - wraps lessons log with read-only
- [x] `PMOReportingHighlight.jsx` - wraps highlight reports with read-only
- [x] `PMOReportingException.jsx` - wraps exception reports with read-only
- [x] `PMOReportingEndStage.jsx` - wraps end stage reports with read-only
- [x] `PMOReportingEndProject.jsx` - wraps end project reports with read-only (validate)

### Task 5.2 - Create PM Page Wrappers
For each document type accessible in PM dashboard, create thin wrapper pages that:
- Set the governance context to "PM"
- Pass appropriate permissions
- Show document state badges
- Add "Tailor for Project" button where applicable

Pages to create under `src/pages/pm/`:
- [x] `PMGovernanceMandateTemplate.jsx` - wraps mandate template with read/tailor
- [x] `PMGovernanceCMS.jsx` - wraps CMS with read/tailor
- [x] `PMGovernanceConfigMS.jsx` - wraps Config MS with read/tailor
- [x] `PMGovernanceQMS.jsx` - wraps QMS with read/tailor
- [x] `PMGovernanceRMS.jsx` - wraps RMS with read/tailor
- [x] `PMInitiationBusinessCase.jsx` - wraps business case with PM refine
- [x] `PMInitiationProjectBrief.jsx` - wraps brief with PM refine
- [x] `PMInitiationPID.jsx` - wraps PID with PM write
- [x] `PMInitiationBenefitsReviewPlan.jsx` - wraps BRP with PM refine
- [x] `PMDeliveryWorkPackages.jsx` - wraps work packages with PM write
- [x] `PMDeliveryProductDescription.jsx` - wraps PD with PM write
- [x] `PMDeliveryProjectProductDescription.jsx` - wraps PPD with PM write
- [x] `PMDeliveryProductStatusAccount.jsx` - wraps PSA with PM write
- [x] `PMDeliveryDailyLog.jsx` - wraps daily log with PM write
- [x] `PMControlsRiskRegister.jsx` - wraps risk register with PM write
- [x] `PMControlsIssueRegister.jsx` - wraps issue register with PM write
- [x] `PMControlsQualityRegister.jsx` - wraps quality register with PM write
- [x] `PMControlsConfigItems.jsx` - wraps config items with PM write
- [x] `PMControlsLessonsLog.jsx` - wraps lessons log with PM write
- [x] `PMReportingCheckpoint.jsx` - wraps checkpoint reports with PM write
- [x] `PMReportingHighlight.jsx` - wraps highlight reports with PM write
- [x] `PMReportingIssueReports.jsx` - wraps issue reports with PM write
- [x] `PMReportingException.jsx` - wraps exception reports with PM write
- [x] `PMReportingEndStage.jsx` - wraps end stage reports with PM write
- [x] `PMClosureLessonsReport.jsx` - wraps lessons report with PM write
- [x] `PMClosureEndProjectReport.jsx` - wraps end project report with PM write

---

## Phase 6: Tailoring Feature

### Task 6.1 - Create Tailoring Service
- [x] Create `src/services/documentTailoringService.js`
- Functions:
  - `createTailoredCopy(baselineDocumentId, projectId, justification)` → creates project-specific copy
  - `getTailoredVersions(baselineDocumentId)` → list all tailored copies
  - `getBaselineDocument(tailoredDocumentId)` → get the original baseline
  - `submitForPMOReview(tailoredDocumentId)` → change lifecycle to 'under_review'
  - `approveTailoredVersion(tailoredDocumentId)` → PMO approves

### Task 6.2 - Create Tailor Document Modal
- [x] Create `src/components/ui/TailorDocumentModal.jsx`
- Shows baseline document summary
- Project selector (which project to tailor for)
- Justification text field (why tailoring is needed)
- Confirm button → calls tailoring service
- Theme-aware

---

## Phase 7: Database Schema (SQL)

### Task 7.1 - Document Governance Fields Migration
- [ ] Create `SQL/v224_document_governance_fields.sql`
- Adds governance columns to existing document tables that need them:
  ```sql
  ALTER TABLE [document_table] ADD COLUMN IF NOT EXISTS
    initiated_by_role TEXT CHECK (initiated_by_role IN ('PMO', 'PM')),
    primary_author_role TEXT CHECK (primary_author_role IN ('PMO', 'PM')),
    governance_owner TEXT CHECK (governance_owner IN ('PMO', 'PM')),
    is_baseline BOOLEAN DEFAULT FALSE,
    baseline_document_id UUID REFERENCES [document_table](id),
    is_tailored BOOLEAN DEFAULT FALSE,
    tailoring_justification TEXT,
    lifecycle_stage TEXT DEFAULT 'draft' CHECK (lifecycle_stage IN ('draft', 'refined', 'approved', 'under_review', 'archived')),
    pm_permission TEXT DEFAULT 'read' CHECK (pm_permission IN ('read', 'write', 'tailor')),
    pmo_permission TEXT DEFAULT 'read' CHECK (pmo_permission IN ('read', 'write', 'approve'));
  ```
- Tables to alter:
  - `communication_management_strategies`
  - `configuration_management_strategies`
  - `quality_management_strategies`
  - `risk_management_strategies`
  - `project_mandates`
  - `project_briefs`
  - `benefits_review_plans`

### Task 7.2 - Sidebar Config Table
- [x] Create `SQL/v225_sidebar_config_table.sql`
- Create `sidebar_config` table:
  ```sql
  CREATE TABLE sidebar_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_type TEXT NOT NULL CHECK (dashboard_type IN ('PMO', 'PM')),
    section_name TEXT NOT NULL,
    document_type TEXT NOT NULL,
    display_order INTEGER NOT NULL,
    route_path TEXT NOT NULL,
    icon_name TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- Seed with all menu items from PRD sections 4 & 5

### Task 7.3 - RLS Policies for Document Governance
- [x] Create `SQL/v226_document_governance_rls.sql`
- Policies:
  - PMO users can write to documents where `pmo_permission = 'write'` or `pmo_permission = 'approve'`
  - PM users can write to documents where `pm_permission = 'write'`
  - PM users can read documents where `pm_permission IN ('read', 'write', 'tailor')`
  - PMO users can read all documents
  - PM users cannot modify documents where `is_baseline = true`
  - Only PMO users can set `is_baseline = true`
  - Tailored copies can only be created by PM users

---

## Phase 8: Post-Login Router Update

### Task 8.1 - Update Post-Login Routing
- [ ] Update `src/services/postLoginRouter.js`
- After login, detect user role:
  - If user has PMO Admin role → redirect to `/pmo/dashboard`
  - If user has PM role → redirect to `/pm/dashboard`
  - If user has both → show role selector or default to most recent
- Keep existing `/platform/dashboard` route for backward compatibility

---

## Phase 9: Navigation Between Dashboards

### Task 9.1 - Dashboard Switcher Component
- [x] Create `src/components/ui/DashboardSwitcher.jsx`
- Small toggle/dropdown in the header area
- Shows "PMO Dashboard" or "PM Dashboard" based on current context
- Users with both roles can switch between dashboards
- Navigates to the other dashboard's home page on switch

---

## Implementation Order & Dependencies

```
Phase 1 (Menu Configs)         → No dependencies
Phase 2 (Sidebar Components)   → Depends on Phase 1
Phase 3 (Layout & Routing)     → Depends on Phase 2
Phase 4 (Governance Context)   → No dependencies (can parallel with 1-3)
Phase 5 (Page Wrappers)        → Depends on Phase 3 + Phase 4
Phase 6 (Tailoring Feature)    → Depends on Phase 4 + Phase 7
Phase 7 (Database Schema)      → No dependencies (can parallel with 1-4)
Phase 8 (Post-Login Router)    → Depends on Phase 3
Phase 9 (Dashboard Switcher)   → Depends on Phase 3
```

**Recommended execution order**: 1 → 2 → 3 → 7 → 4 → 5 → 6 → 8 → 9

---

## Key Design Decisions

1. **Reuse existing page components** - PMO/PM wrappers inject governance context and permissions into existing components. No duplication of page logic.

2. **Static sidebars** - Menu configs are hardcoded JS arrays (not fetched from DB). The `sidebar_config` DB table is for reference/admin but the frontend sidebars are static per PRD requirement.

3. **Same document record** - Both dashboards reference the same DB record. The wrapper determines view/edit mode based on `DocumentGovernanceContext`.

4. **Backward compatibility** - Existing `/platform/*` routes remain functional. The new `/pmo/*` and `/pm/*` routes are additive.

5. **No `/pm` homepage conflict** - The existing `<Route path="/pm" element={<Navigate to="/platform" replace />} />` redirect must be removed since `/pm/*` is now the PM dashboard namespace.

---

## Files to Create (Summary)

| File | Purpose |
|------|---------|
| `src/config/pmoMenuConfig.js` | PMO sidebar menu definition |
| `src/config/pmDashboardMenuConfig.js` | PM sidebar menu definition |
| `src/components/pmo/PMOSidebar.jsx` | PMO sidebar component |
| `src/components/pm/PMSidebar.jsx` | PM sidebar component |
| `src/components/pmo/PMOLayout.jsx` | PMO layout wrapper |
| `src/components/pm/PMLayout.jsx` | PM layout wrapper |
| `src/pages/pmo/PMODashboard.jsx` | PMO landing dashboard |
| `src/pages/pm/PMDashboard.jsx` | PM landing dashboard |
| `src/pages/pmo/*.jsx` | ~16 PMO page wrappers |
| `src/pages/pm/*.jsx` | ~26 PM page wrappers |
| `src/context/DocumentGovernanceContext.jsx` | Governance permission context |
| `src/components/ui/DocumentStateBadge.jsx` | State indicator badges |
| `src/components/ui/TailorDocumentModal.jsx` | Tailoring modal |
| `src/components/ui/DashboardSwitcher.jsx` | Dashboard toggle |
| `src/services/documentTailoringService.js` | Tailoring CRUD service |
| `SQL/v224_document_governance_fields.sql` | Governance columns |
| `SQL/v225_sidebar_config_table.sql` | Sidebar config table |
| `SQL/v226_document_governance_rls.sql` | RLS policies |

## Files to Modify (Summary)

| File | Change |
|------|--------|
| `src/App.jsx` | Add `/pmo/*` and `/pm/*` route namespaces, remove `/pm` redirect |
| `src/components/Layout.jsx` | Detect `/pmo/` and `/pm/` prefixes for layout selection |
| `src/services/postLoginRouter.js` | Route PMO/PM roles to correct dashboard |

---

## Acceptance Criteria Checklist

- [ ] Two independent dashboards load at `/pmo/dashboard` and `/pm/dashboard`
- [ ] PMO sidebar matches PRD Section 4 exactly (4 sections, correct items)
- [ ] PM sidebar matches PRD Section 5 exactly (6 sections, correct items)
- [ ] PM can view PMO baselines as read-only
- [ ] PM can tailor (clone) PMO baselines for a specific project
- [ ] PMO can create v0 of Business Case, Project Brief, Benefits Review Plan
- [ ] PM can refine PMO-initiated documents
- [ ] PMO cannot edit PM delivery documents
- [ ] PM cannot edit PMO baselines directly
- [ ] Document state badges display correctly
- [ ] All permissions enforced at RLS level
- [ ] No document record duplication across dashboards
- [ ] Existing `/platform/*` routes still work

---

## Review Section
*(To be completed after implementation)*

---
