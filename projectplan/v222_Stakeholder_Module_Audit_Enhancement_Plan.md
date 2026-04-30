# v222 – Stakeholder Module Audit & Enhancement Plan

**Date:** 2026-03-13
**Branch:** feature/platform-terminology
**Scope:** Platform + Simulator (parity required)

---

## Audit Summary

The audit compared the current Stakeholder module against Process Guide 6th Edition standards
(images PMO Stakeholder v2 / v3) and industry best practice.  The current module is well-
structured but has **15 identified gaps** ranging from missing mandatory process guide fields to
missing UI integration of existing but hidden components.

---

## Audit Findings – Gap Analysis

### GAP-01 · CRITICAL · Missing "Expectations" Field
**Standard:** The process guide explicitly requires a *"List of stakeholder's expectations"* as a distinct
field in the Stakeholder Register (separate from requirements).
**Current state:** Only `special_requirements` and `notes` exist. No dedicated Expectations
field.
**Impact:** Non-compliant with process guide Stakeholder Register definition.

---

### GAP-02 · HIGH · Communication Plans & Monitoring Dashboard Not Surfaced in Main Page
**Standard:** Communication planning and monitoring are core process guide processes.
**Current state:** `CommunicationPlan.jsx`, `CommunicationPlanForm.jsx`,
`CommunicationLog.jsx`, and `StakeholderMonitoringDashboard.jsx` components exist but
`StakeholderManagement.jsx` only has 3 tabs (Register / Matrix / Engagement).
**Impact:** Features are built but unreachable through the UI.

---

### GAP-03 · HIGH · Stakeholder Engagement Assessment Matrix (SEAM) Missing
**Standard:** Process Guide 6 Chapter 13 requires a Stakeholder Engagement Assessment Matrix showing
**C** (Current) and **D** (Desired) engagement levels for each stakeholder on the 5-point
scale: Unaware → Resistant → Neutral → Supportive → Leading.
**Current state:** Attitude tracking (champion/supporter/neutral/critic/blocker) exists but
the standardised SEAM table format is absent.
**Impact:** No clear gap analysis between where stakeholders are vs where they need to be;
no visual SEAM report.

---

### GAP-04 · HIGH · Per-Stakeholder Engagement Action Plan Missing
**Standard:** Best practice requires action items per stakeholder with owner, due date, and
status to move them from current to desired engagement level.
**Current state:** Engagement notes and strategy text fields exist but no structured action
items (actionable tasks with owners/due dates/completion).
**Impact:** No accountability or tracking of what actions will close the engagement gap.

---

### GAP-05 · MEDIUM · Communication Log Lacks Effectiveness Tracking
**Standard:** Communications management plans should include feedback and effectiveness
measures.
**Current state:** Log captures Subject, Type, Date, Status only.  Missing: feedback /
response received, effectiveness rating (1–5), and next action required.
**Impact:** No way to assess whether communications are achieving the intended outcome.

---

### GAP-06 · MEDIUM · Export Is Incomplete (Only 3 Fields)
**Standard:** Stakeholder Register export should include all register fields.
**Current state:** `STAKEHOLDER_COLUMNS` in `StakeholderManagement.jsx` exports only
`stakeholder_name`, `stakeholder_type`, `stakeholder_status`.
**Impact:** Export is almost useless for reporting; stakeholder report should be a full
printable/exportable register.

---

### GAP-07 · MEDIUM · Stakeholder Identification Source Missing
**Standard:** The process guide states the register "receives information from" the project charter and
procurement documents.
**Current state:** No field indicating how/when/from which document the stakeholder was
identified.
**Impact:** No traceability to source documents; useful for audits and onboarding.

---

### GAP-08 · MEDIUM · Inter-Stakeholder Relationship Types Limited
**Standard:** Stakeholder networks commonly include *influences*, *conflicts with*, and
*collaborates with* relationships beyond simple hierarchy.
**Current state:** Only `reports_to_stakeholder_id` (one-directional hierarchy) exists.
**Impact:** Cannot model stakeholder dynamics or influence chains.

---

### GAP-09 · MEDIUM · Stakeholder Detail Profile View Page Missing
**Standard:** A read-only consolidated view of all stakeholder information is standard in PM
tools (one page showing basic info, analysis, engagement history, communications).
**Current state:** All interaction is via a multi-tab edit modal only; no dedicated profile
/ view-only page.
**Impact:** Difficult to share or review a stakeholder's full picture without entering edit mode.

---

### GAP-10 · MEDIUM · Power/Interest Matrix – Non-Interactive
**Standard:** Best practice matrices allow drill-down to stakeholder detail and allow direct
editing of power/interest scores.
**Current state:** SVG matrix shows stakeholder dots but clicking them does nothing.
**Impact:** Matrix is read-only; users must go back to register to update analysis scores.

---

### GAP-11 · MEDIUM · Salience Model Analysis Missing
**Standard:** The Salience Model (Power + Legitimacy + Urgency) is a process guide acknowledged
advanced stakeholder classification tool producing 7 stakeholder categories.
**Current state:** Only Power/Interest analysis exists.
**Impact:** No support for Salience-based prioritisation.

---

### GAP-12 · LOW · Bulk Import (CSV/Excel) Missing
**Standard:** CLAUDE.md rule #26 requires bulk record upload capability for all modules.
**Current state:** Single-record form only.
**Impact:** Onboarding large existing stakeholder lists is manual and tedious.

---

### GAP-13 · LOW · Stakeholder Record Completeness Indicator Missing
**Standard:** Best practice tools show a "profile completeness %" to guide data quality.
**Current state:** No indicator of how complete each stakeholder record is.
**Impact:** No prompt for users to fill in missing information.

---

### GAP-14 · LOW · Draft/Hold Queue Not Implemented for Stakeholder Form
**Standard:** CLAUDE.md rule #37 requires draft/hold queue for all record capture forms.
**Current state:** No hold/draft queue for in-progress stakeholder records.
**Impact:** If user navigates away mid-form, data is lost.

---

### GAP-15 · LOW · Simulator Parity Gaps
**Standard:** CLAUDE.md rule #34 requires Platform–Simulator parity for all features.
**Current state:** All enhancements in this plan (SEAM, engagement actions, communication
effectiveness, profile view, expanded export, bulk import) must be mirrored in the Simulator
`sim` schema and routes.
**Impact:** Simulator falls behind Platform once enhancements are applied.

---

## Implementation Plan

Gaps are grouped into **4 phases** ordered by priority.

---

### PHASE 1 – Critical & High Priority Fixes (Core process guide Compliance)

#### TODO-1.1 · Add "Expectations" field to Stakeholder Register
- [x] Create `SQL/v315_stakeholder_expectations_field.sql`
  - Add `expectations TEXT` column to `public.stakeholders`
  - Add `expectations TEXT` column to `sim.practice_stakeholder_register`
- [x] Update `StakeholderForm.jsx` – add Expectations textarea to "Notes & Requirements" tab
  - Position between Requirements and Notes
- [x] Update `stakeholderService.js` – include `expectations` in select and upsert
- [x] Update `StakeholderRegister.jsx` – show expectations in detail/tooltip view

#### TODO-1.2 · Surface hidden tabs in StakeholderManagement.jsx
- [x] Add tabs to `StakeholderManagement.jsx`:
  - **Communication Plans** tab → renders `CommunicationPlan.jsx`
  - **Monitoring** tab → renders `StakeholderMonitoringDashboard.jsx`
- [x] Wire up existing components (no new code needed – just integrate)
- [x] Verify Communication Log is accessible from the Communication Plans tab

#### TODO-1.3 · Stakeholder Engagement Assessment Matrix (SEAM) Component
- [x] Create `src/components/stakeholders/StakeholderSEAM.jsx`
  - Table with one row per analysed stakeholder
  - Columns: Stakeholder Name | Unaware | Resistant | Neutral | Supportive | Leading
  - Mark **C** (current) and **D** (desired) from analysis records
  - Highlight gap rows (C ≠ D) in amber/red
  - Export support
- [x] Add **SEAM** tab to `StakeholderManagement.jsx`
- [x] Apply same component for Simulator under `/simulator/practice-stakeholders` SEAM tab

#### TODO-1.4 · Per-Stakeholder Engagement Action Plan
- [x] Create `SQL/v316_stakeholder_engagement_actions.sql` (version v316 used to avoid overwriting existing sequences)
  - Table `public.stakeholder_engagement_actions`: id, project_id, stakeholder_id, action_description, owner_user_id, due_date, status, action_type, priority, completion_date, outcome_notes, created_at, updated_at, created_by, updated_by, is_deleted
  - Mirror table `sim.practice_engagement_actions` (same columns)
  - RLS policies for both; registered in database_tables
- [x] Create `src/components/stakeholders/EngagementActions.jsx`
  - Per-stakeholder action items with add/edit/delete; status tracking with completion/outcome notes; owner dropdown (users); due date with overdue highlighting
- [x] Engagement Actions section: available as **Engagement Actions** tab in Stakeholder Management; will be embedded in Stakeholder detail profile view when TODO-2.5 (StakeholderProfile) is implemented
- [x] stakeholderService.js: getEngagementActions, saveEngagementAction, deleteEngagementAction added
- [x] Simulator parity: `sim.practice_engagement_actions` table, practiceStakeholderService get/save/delete engagement actions, `PracticeEngagementActions.jsx`, route `/simulator/practice-stakeholders/engagement-actions`, sidebar menu link

---

### PHASE 2 – Medium Priority Enhancements

#### TODO-2.1 · Expand Export to Full Stakeholder Register
- [x] Update `STAKEHOLDER_COLUMNS` in `StakeholderManagement.jsx` to include all fields:
  - stakeholder_reference, stakeholder_name, stakeholder_title, stakeholder_organization,
    stakeholder_department, stakeholder_type, stakeholder_category, project_role,
    email, phone, organization_level, is_decision_maker, is_influencer,
    stakeholder_status, notes, special_requirements, expectations
- [x] Word/PowerPoint: ExportListMenu already uses default 5 fields, user-selectable up to 10 (DEFAULT_LIST_EXPORT_FIELDS / MAX_LIST_EXPORT_FIELDS in exportUtils)

#### TODO-2.2 · Communication Log – Add Effectiveness Fields
- [x] Create `SQL/v317_communication_log_effectiveness.sql`
  - Added response_notes, effectiveness_rating (smallint 1–5), next_action, next_action_due_date to `public.stakeholder_communications` (response_received already existed)
  - Same fields + response_received to `sim.practice_communication_log`
- [x] Update `CommunicationLog.jsx`: effectiveness rating (stars), response/next-action columns; edit modal for response_received, response_notes, effectiveness_rating, next_action, next_action_due_date
- [x] stakeholderService.js: saveStakeholderCommunication already passes through full logData (new fields included)

#### TODO-2.3 · Stakeholder Identification Source Field
- [x] Create `SQL/v318_stakeholder_identification_source.sql`
  - identification_source (TEXT with CHECK), identification_date (DATE) on `public.stakeholders` and `sim.practice_stakeholder_register`
- [x] Update `StakeholderForm.jsx` – Tab 0 (Assign & Basic Information): Identification source dropdown, Identification date; payload includes both (null when empty)
- [x] stakeholderService.js: saveStakeholder uses full payload (select * / spread), so new fields are persisted

#### TODO-2.4 · Inter-Stakeholder Relationship Types
- [x] Create `SQL/v319_stakeholder_relationships_table.sql`
  - Table `public.stakeholder_relationships`: id, project_id, from_stakeholder_id, to_stakeholder_id, relationship_type, relationship_strength (1–5), notes, created_at, updated_at, created_by, is_deleted; UNIQUE(project_id, from_stakeholder_id, to_stakeholder_id, relationship_type)
  - Mirror table `sim.practice_stakeholder_relationships`; RLS for both; registered in database_tables
- [x] Create `src/components/stakeholders/StakeholderRelationships.jsx`: list with CRUD, card-style rows (From → To, type, strength, notes); add/edit form with stakeholder dropdowns
- [x] Relationships section in StakeholderProfile; **Relationships** tab added to StakeholderManagement.jsx

#### TODO-2.5 · Stakeholder Detail Profile View Page
- [x] Create `src/components/stakeholders/StakeholderProfile.jsx`
  - Read-only profile: (1) Basic Info, (2) Contact, (3) Project Role & Characteristics, (4) Requirements & Expectations, (5) Analysis Summary, (6) Engagement Actions, (7) Communication History (last 5), (8) Relationships
  - Export dropdown: Word, Excel, PowerPoint, Print/PDF
  - "Edit" button → navigates to edit form
- [x] Route `stakeholders/register/view/:stakeholderId` → StakeholderProfilePage (loads stakeholder, renders StakeholderProfile)
- [x] View button: StakeholderRegisterPage and StakeholderManagement both navigate to profile view (`/platform/stakeholders/register/view/:id`)

#### TODO-2.6 · Power/Interest Matrix – Make Interactive
- [x] Update `PowerInterestMatrix.jsx`
  - Click on stakeholder dot → calls `onStakeholderClick(stakeholderId)` (parent navigates to profile)
  - Stakeholder name tooltip on hover via SVG `<title>`
  - "Edit Analysis" button (Edit2 icon) in each quadrant list item; calls `onEditAnalysis({ projectId, stakeholderId, analysisRecord })`
- [x] StakeholderManagement: passes `onStakeholderClick` (navigate to view/:id) and `onEditAnalysis` (navigate to analysis page with state)
- [x] StakeholderAnalysisPage: passes same to matrix; deep link from state (projectId, stakeholderId) opens form after analysis loads; "Edit Analysis" on matrix opens form for that stakeholder on the same page
- [x] Allow drag to reposition: PowerInterestMatrix accepts optional `onReposition(item, { power_level, interest_level, matrix_quadrant })`; dots are draggable when `onReposition` is provided; drop converts SVG coords to P/I and saves via parent; StakeholderAnalysisPage and StakeholderManagement pass `onReposition` that call `saveStakeholderAnalysis` and refresh.

#### TODO-2.7 · Salience Model Analysis
- [x] Create `SQL/v320_stakeholder_salience_fields.sql`
  - legitimacy_level, urgency_level (smallint 1–5), salience_class (TEXT CHECK) on `public.stakeholder_analysis` and `sim.practice_stakeholder_analysis` (classes: dormant, discretionary, demanding, dominant, dangerous, dependent, definitive, latent)
- [x] Update `StakeholderAnalysisForm.jsx`: Legitimacy (1–5) and Urgency (1–5) sliders; salience_class auto-computed from Power/Legitimacy/Urgency (high = ≥4) via salienceClassFromPLU()
- [x] Create `src/components/stakeholders/SalienceModel.jsx`: grid of 8 salience-class cards with stakeholder names; latest analysis per stakeholder; export list
- [x] Add **Salience** tab to StakeholderManagement.jsx

---

### PHASE 3 – Lower Priority (Quality of Life)

#### TODO-3.1 · Bulk Import for Stakeholders
- [x] Bulk import: `stakeholderService.importStakeholders(rows, { projectId })` added; Import button in StakeholderManagement.jsx header opens existing `StakeholderImportModal` (template download, CSV upload, error report). Modal allows optional projectId (unassigned import).

#### TODO-3.2 · Stakeholder Record Completeness Indicator
- [x] `src/utils/stakeholderCompleteness.js`: `getCompletenessPercent(stakeholder)` scores 0–100 from optional fields (expectations, special_requirements, type, category, contact, identification_source, project_role, notes).
- [x] Completeness badge shown in `StakeholderRegister.jsx` table row (next to name).
- [x] Completeness bar shown in `StakeholderProfile.jsx` (progress bar + percentage).

#### TODO-3.3 · Draft/Hold Queue for Stakeholder Form
- [x] Integrated draft queue: `stakeholder` added to `draftQueueConfig.js` and `draftQueueService.js` (getRequiredFields, extractTitle). `StakeholderForm.jsx` uses `useDraftQueue('stakeholder', ...)` with "Save as Draft" button (when `formRoute` provided), restore/dismiss existing-draft banner, and hydration from `initialDraftData` when resuming. `StakeholderFormPage` passes `initialDraftData`/`draftId`/`formRoute` from `location.state`. `StakeholdersOnHold.jsx` page uses `EntityHoldQueue`; route `/platform/stakeholders/on-hold`; "Draft queue" link added to Stakeholder Management header.

---

### PHASE 4 – Simulator Parity

All Phase 1–3 changes must be mirrored in the Simulator system:

#### TODO-4.1 · SQL Parity
- [x] v315–v320 (and prior) include `sim` schema equivalents where applicable.

#### TODO-4.2 · Component/Service Parity
- [x] Simulator has PracticeStakeholderSEAM, PracticeEngagementActions, PracticeSalienceModel (new). Platform StakeholderProfile/Relationships/BulkImport are platform-only; simulator register/analysis flows remain separate.

#### TODO-4.3 · Routes and Menus
- [x] Simulator sidebar already had SEAM and Engagement Actions. Added "Salience Model" menu item and route `simulator/practice-stakeholders/salience`; `PracticeSaliencePage.jsx` and `PracticeSalienceModel.jsx` (sim) added.

---

## Summary of SQL Files to Create

| File | Purpose |
|------|---------|
| `SQL/v305_stakeholder_expectations_field.sql` | Add `expectations` column to both schemas |
| `SQL/v306_stakeholder_engagement_actions.sql` | New engagement actions table (Platform + Sim) |
| `SQL/v307_communication_log_effectiveness.sql` | Add effectiveness columns to comm log |
| `SQL/v308_stakeholder_identification_source.sql` | Add source/date columns to stakeholders |
| `SQL/v309_stakeholder_relationships_table.sql` | New stakeholder relationships table |
| `SQL/v310_stakeholder_salience_fields.sql` | Add legitimacy/urgency/salience columns |

---

## Summary of New/Modified Components

| Component | Type | Action |
|-----------|------|--------|
| `StakeholderForm.jsx` | Modified | Add expectations, identification source fields |
| `StakeholderManagement.jsx` | Modified | Add Communication Plans, Monitoring, SEAM, Salience tabs |
| `StakeholderSEAM.jsx` | New | Engagement Assessment Matrix table |
| `EngagementActions.jsx` | New | Per-stakeholder action items CRUD |
| `StakeholderProfile.jsx` | New | Consolidated read-only profile view |
| `StakeholderRelationships.jsx` | New | Relationship mapping CRUD |
| `SalienceModel.jsx` | New | Salience Model visualisation |
| `StakeholderBulkImport.jsx` | New | CSV/Excel bulk import |
| `CommunicationLog.jsx` | Modified | Add effectiveness fields |
| `PowerInterestMatrix.jsx` | Modified | Make stakeholder dots clickable |
| `StakeholderAnalysisForm.jsx` | Modified | Add legitimacy/urgency fields |

---

## Review Section

- **Phase 3.1 (Bulk Import):** Added `importStakeholders(rows, { projectId })` to `stakeholderService.js`; added Import button to Stakeholder Management header that opens `StakeholderImportModal`; modal allows import with or without project (optional projectId).
- **Phase 3.2 (Completeness):** Added `src/utils/stakeholderCompleteness.js` with `getCompletenessPercent(stakeholder)` (8 optional fields); completeness badge in Stakeholder Register table row; completeness progress bar in Stakeholder Profile.
- **Phase 3.3 (Draft/Hold):** Stakeholder draft queue: config + service (stakeholder entity), StakeholderForm "Save as Draft" + restore banner + initialDraftData, StakeholdersOnHold page, route and "Draft queue" link on Management.
- **Phase 4 (Simulator parity):** PracticeSalienceModel + PracticeSaliencePage, Salience menu item and route; SEAM and Engagement Actions already present.
- **TODO-2.6 stretch (drag-to-reposition):** PowerInterestMatrix supports optional `onReposition`; pointer drag on dots converts drop position to power/interest/quadrant and saves via `saveStakeholderAnalysis`; wired on StakeholderAnalysisPage and StakeholderManagement; click-after-drag does not open profile (justRepositionedRef guard).

---

## Completion Status

**100% complete (2026-03-13).** All Phase 1–4 tasks and the optional stretch goal (drag-to-reposition in the Power/Interest matrix, TODO-2.6) are implemented.

**Optional follow-ups (completed):**
- **Unit tests:** `stakeholderService.test.js` (importStakeholders, including null projectId for unassigned import), `stakeholderCompleteness.test.js`, `draftQueueStakeholder.test.js` (getRequiredFields, extractTitle, calculateCompletion for stakeholder and practice_stakeholder; getEntityConfig and getHoldQueueRoute for both). All 31 tests passing.
- **Simulator draft queue:** `practice_stakeholder` in config and draftQueueService; `PracticeStakeholdersOnHold` page and route `/simulator/practice-stakeholders/on-hold`; "Draft queue" link on Practice Stakeholder Register; "New Practice Stakeholder" on on-hold page links to `/simulator/practice-stakeholders/create`; `PracticeStakeholderCreatePage` uses useDraftQueue, Save as Draft, and resume-from-draft.
