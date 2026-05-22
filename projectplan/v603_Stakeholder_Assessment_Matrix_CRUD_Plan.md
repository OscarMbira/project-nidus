# v603 — Stakeholder Assessment Matrix (Full CRUD + Sidebar)

**Date:** 2026-05-21  
**Status:** Implemented  
**Scope:** Platform + Simulator parity  
**Related:** `v222_Stakeholder_Module_Audit_Enhancement_Plan.md` (GAP-03 SEAM), `v220_Stakeholder_Management_Implementation_Plan.md`

---

## Overview

The **Stakeholder Assessment Matrix** (Process Guide 6 — Stakeholder Engagement Assessment Matrix / SEAM) must appear as its own sidebar item under **Stakeholders**, with **full CRUD** on Platform. Today the matrix UI exists only as a **read-only** component fed from **Stakeholder Analysis** attitude fields; Simulator has a route but Platform does not; the PMO sidebar lists five items and omits Assessment Matrix.

This plan adds a first-class page, menu link, data model, and CRUD flows aligned with the five engagement levels: **Unaware → Resistant → Neutral → Supportive → Leading** (Current **C** and Desired **D** per stakeholder).

---

## Todo List

### Phase 0 — Approval gate
- [x] **0.1** User reviews and approves this plan (proceed instruction received).
- [x] **0.2** Uniqueness rule: one active row per stakeholder per project (upsert on save).

### Phase 1 — Database (Platform)
- [x] **SQL v603** — `public.stakeholder_assessment_matrix` + `sim.practice_stakeholder_assessment_matrix`, RLS, `database_tables`.
- [x] **SQL v603** (continued) — RPC skipped (not required for initial release).
- [x] **SQL v604** — Platform `menu_items` + role grants; sort order 3 for Assessment Matrix.
- [x] **SQL v604** (sim) — Tables in v603; sim menu via `simulatorMenuConfig.js`.

### Phase 2 — Service layer (Platform)
- [x] **`stakeholderService.js`** — get/save/delete + `pickAssessmentMatrixWritePayload`.
- [x] **`stakeholderAssessmentMatrix.test.js`**

### Phase 3 — Service layer (Simulator)
- [x] **`practiceStakeholderService.js`** — parallel CRUD.
- [x] Simulator tests covered via shared utils + platform service test patterns.

### Phase 4 — Frontend components (Platform)
- [x] **`StakeholderAssessmentMatrixForm.jsx`**
- [x] **`StakeholderSEAM.jsx`** — rows prop + onEdit.
- [x] **`StakeholderAssessmentMatrixList.jsx`**
- [x] **`CrudSuccessBanner.jsx`**

### Phase 5 — Platform pages & routing
- [x] **`StakeholderAssessmentMatrixPage.jsx`**
- [x] **`StakeholdersAssessmentMatrixOnHold.jsx`**
- [x] **`App.jsx`** routes
- [x] **`Layout.jsx`** — covered by `/platform/` prefix
- [x] **`useMenu.js`** — virtual menu + cache `v11`
- [x] **Menu cache bump**

### Phase 6 — Simulator parity
- [x] **`PracticeStakeholderAssessmentMatrixPage.jsx`**
- [x] **`PracticeStakeholderSEAM.jsx`** — re-exports shared SEAM
- [x] **`simulatorMenuConfig.js`**
- [x] **`App.jsx`** — assessment-matrix routes; `/seam` redirect
- [x] **Draft queue** — `practice_stakeholder_assessment_matrix`

### Phase 7 — Draft / hold queue
- [x] **`draftQueueConfig.js`** + **`draftQueueService.js`**
- [x] **`draftQueueStakeholder.test.js`** extended

### Phase 8 — Documentation & tests
- [x] **`Documentation/Stakeholder_Assessment_Matrix_User_Guide.md`**
- [x] **`StakeholderSEAM.test.jsx`**
- [x] **`stakeholderSEAMUtils.test.js`**

### Phase 9 — Data migration (optional)
- [x] Skipped (not requested) — no `v603b` seed from analysis.

### Phase 10 — Review
- [x] Review section completed below.

---

## Review

- **Summary:** Delivered full CRUD for Stakeholder Assessment Matrix on Platform and Simulator: new tables, services, dedicated pages (matrix + list views), sidebar/menu links, draft on-hold queues, export, sortable list, and refactored SEAM component driven by assessment data (not analysis attitudes).
- **SQL to apply:** `SQL/v603_stakeholder_assessment_matrix.sql`, `SQL/v604_stakeholder_assessment_matrix_menu.sql`
- **Routes:**
  - Platform: `/platform/stakeholders/assessment-matrix`, `/platform/stakeholders/assessment-matrix/on-hold`
  - Simulator: `/simulator/practice-stakeholders/assessment-matrix`, `/simulator/practice-stakeholders/assessment-matrix/on-hold`; `/simulator/practice-stakeholders/seam` → redirect
- **Known limitations:** Legacy `StakeholderManagement` SEAM tab is read-only with link to full CRUD page; optional RPC if RLS list performance is slow in production.

---

## Manual Test Checklist (post-build)

1. [ ] Sidebar shows **Stakeholder Assessment Matrix** under Stakeholders.
2. [ ] Select project → Add Assessment → success banner with id.
3. [ ] Matrix shows **C** / **D**; gap rows highlighted.
4. [ ] Edit updates desired level.
5. [ ] Delete soft-deletes row.
6. [ ] Save as draft → on-hold → resume.
7. [ ] Export from list/matrix.
8. [ ] Card/table toggle persists.
9. [ ] Simulator parity on practice project.
10. [ ] RLS denies unauthorised users (after SQL applied).
