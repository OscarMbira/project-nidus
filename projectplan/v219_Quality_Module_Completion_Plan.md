# v219 – Quality Module Completion Plan
**Branch:** feature/platform-terminology
**Date:** 2026-03-12
**Goal:** Complete all 4 Quality sidebar items (Quality Register, Quality Reviews, Quality Inspections, Quality Reports) to 100% for both Platform and Simulator.

---

## Current State Analysis

### What Exists
- `QualityManagement.jsx` – Quality Register list + metrics (works, route `/platform/quality-management`)
- `QualityReviews.jsx` – List + Create/Edit (missing Delete, no route, wrong back-nav)
- `QualityInspections.jsx` – Full CRUD (no route, wrong back-nav, no export)
- `QualityReports.jsx` – Report builder wrapper (no route, wrong back-nav)
- `PracticeQualityRegister.jsx` – Simulator quality register (complete)

### What's Missing
1. Routes in App.jsx for Reviews, Inspections, Reports
2. Updated menu config to show the 4 items from the image
3. Delete on QualityReviews
4. Export dropdowns on Reviews, Inspections, Reports
5. Fixed back-navigation (currently goes to `/quality-management` not `/platform/quality-management`)
6. Simulator: PracticeQualityReviews, PracticeQualityInspections, PracticeQualityReports pages
7. Simulator SQL tables for practice_quality_reviews and practice_quality_inspections
8. Simulator routes and menu entries

---

## Todo Items

### Phase 1 – Platform Routing & Menu Fix
- [x] 1. Add lazy imports for `QualityReviews`, `QualityInspections`, `QualityReports` in `App.jsx`
- [x] 2. Add routes `/platform/quality/reviews`, `/platform/quality/inspections`, `/platform/quality/reports` in `App.jsx`
- [x] 3. Update `pmMenuConfig.js` Quality children to: Quality Register, Quality Reviews, Quality Inspections, Quality Reports

### Phase 2 – Platform Feature Completeness
- [x] 4. `QualityReviews.jsx` – Add Delete + Export dropdown + fix back-nav to `/platform/quality-management`
- [x] 5. `QualityInspections.jsx` – Add Export dropdown + fix back-nav to `/platform/quality-management`
- [x] 6. `QualityReports.jsx` – Fix back-nav to `/platform/quality-management`

### Phase 3 – Simulator SQL
- [x] 7. Create `SQL/v299_sim_practice_quality_reviews_inspections.sql` with `sim.practice_quality_reviews`, `sim.practice_quality_inspections` tables + RLS

### Phase 4 – Simulator Service Layer
- [x] 8. Add `getPracticeQualityReviews`, `createPracticeQualityReview`, `updatePracticeQualityReview`, `deletePracticeQualityReview`, `getPracticeQualityInspections`, `createPracticeQualityInspection`, `updatePracticeQualityInspection`, `deletePracticeQualityInspection` to `src/services/sim/practiceQualityService.js`

### Phase 5 – Simulator Pages
- [x] 9. Create `src/pages/simulator/PracticeQualityReviews.jsx`
- [x] 10. Create `src/pages/simulator/PracticeQualityInspections.jsx`
- [x] 11. Create `src/pages/simulator/PracticeQualityReports.jsx`

### Phase 6 – Simulator Routing & Menu
- [x] 12. Add lazy imports + routes for the 3 new simulator pages in `App.jsx`
- [x] 13. Update `simulatorMenuConfig.js` – add Quality Reviews, Inspections, Reports under "Practice Controls & Registers"

---

## Routes Summary

### Platform (new)
| Path | Component |
|------|-----------|
| `/platform/quality/reviews` | `QualityReviews` |
| `/platform/quality/inspections` | `QualityInspections` |
| `/platform/quality/reports` | `QualityReports` |

### Simulator (new)
| Path | Component |
|------|-----------|
| `/simulator/practice-quality-reviews` | `PracticeQualityReviews` |
| `/simulator/practice-quality-inspections` | `PracticeQualityInspections` |
| `/simulator/practice-quality-reports` | `PracticeQualityReports` |

---

## Review

**Completed 2026-03-12.** All phases implemented to 100%.

- **Phase 1:** Platform routes `/platform/quality/reviews`, `/platform/quality/inspections`, `/platform/quality/reports` added; `pmMenuConfig.js` Quality children set to Quality Register, Quality Reviews, Quality Inspections, Quality Reports.
- **Phase 2:** QualityReviews: Delete + Export dropdown + back-nav to `/platform/quality-management`. QualityInspections: Export dropdown + back-nav. QualityReports: back-nav.
- **Phase 3:** `SQL/v299_sim_practice_quality_reviews_inspections.sql` adds `sim.practice_quality_reviews` and `sim.practice_quality_inspections` with RLS (user-scoped).
- **Phase 4:** `practiceQualityService.js` extended with get/create/update/delete for practice quality reviews and inspections.
- **Phase 5:** Added `PracticeQualityReviews.jsx`, `PracticeQualityInspections.jsx`, `PracticeQualityReports.jsx` under `src/pages/simulator/` (project selector, list, export, delete where applicable).
- **Phase 6:** Lazy imports and routes for the 3 simulator pages in `App.jsx`; `simulatorMenuConfig.js` updated with Quality Reviews, Inspections, Reports under Practice Controls & Registers.

**Run SQL:** Execute `SQL/v299_sim_practice_quality_reviews_inspections.sql` in Supabase (sim schema) before using simulator Quality Reviews/Inspections.
