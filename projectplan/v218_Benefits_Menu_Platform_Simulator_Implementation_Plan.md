# v218 Benefits Menu – Platform & Simulator Implementation

## Summary
Implemented the circled Benefits section for both Platform and Simulator: **All Benefits**, **Benefits Register**, **Measurements**, and **Realization**, with routes, menu entries, and pages.

## Platform

### Menu (pmMenuConfig.js)
- **Benefits** section reordered to match UI: **All Benefits** (first), **Benefits Register**, **Measurements**, **Realization**, **On Hold**.
- Paths: `/platform/benefits`, `/platform/benefits/register`, `/platform/benefits/measurements`, `/platform/benefits/realization`, `/app/benefits/on-hold`.
- Removed "Benefits Mapping" from the submenu.

### Routes (App.jsx)
- `benefits` → Platform All Benefits (existing `Benefits` from platform-app).
- `benefits/register` → Benefits Register page (pages/benefits/Benefits.jsx – register + form).
- `benefits/measurements` → BenefitMeasurementsPage (pages/benefits/BenefitMeasurements.jsx).
- `benefits/realization` → BenefitsRealizationPage (pages/benefits/BenefitsRealization.jsx).

### Service & components
- **benefitsService.js**: All `supabase` usage replaced with `platformDb`; import from `./supabase/supabaseClient`. Project embed in getBenefits/getBenefit uses `status_id` instead of `project_status`.
- **pages/benefits/BenefitMeasurements.jsx**: Removed unused `supabase` import.

## Simulator

### Menu (simulatorMenuConfig.js)
- New top-level **Benefits** section with icon `target` and children:
  - **All Benefits** → `/simulator/benefits`
  - **Benefits Register** → `/simulator/benefits/register`
  - **Measurements** → `/simulator/benefits/measurements`
  - **Realization** → `/simulator/benefits/realization`

### Routes (App.jsx)
- `simulator/benefits/register` → PracticeBenefitsRegister
- `simulator/benefits/measurements` → PracticeBenefitsMeasurements
- `simulator/benefits/realization` → PracticeBenefitsRealization
- `simulator/benefits` → PracticeBenefitsAll  
(More specific paths listed before `simulator/benefits`.)

### New pages (simulator)
- **PracticeBenefitsAll.jsx** – Lists all practice benefits review plans; search by project name; links to view BRP.
- **PracticeBenefitsRegister.jsx** – Register table of BRPs; search; links to Edit/View and “View all BRPs”.
- **PracticeBenefitsMeasurements.jsx** – Lists BRPs with “View BRP”; explains measurements are in each BRP.
- **PracticeBenefitsRealization.jsx** – Searchable programme list; on select, loads benefits via `getPracticeProgrammeBenefits` and renders `BenefitsRealizationChart`.

All simulator pages use `simDb` / `practiceBenefitsService` / `practicePortfolioService` and dark theme.

## Files changed/added
- `src/services/benefitsService.js` – platformDb only; project embed uses status_id.
- `src/config/pmMenuConfig.js` – Benefits children order and paths.
- `src/config/simulatorMenuConfig.js` – New Benefits section and children.
- `src/App.jsx` – Lazy imports and routes for Platform and Simulator benefits.
- `src/pages/benefits/BenefitMeasurements.jsx` – Removed supabase import.
- `src/pages/simulator/PracticeBenefitsAll.jsx` – New.
- `src/pages/simulator/PracticeBenefitsRegister.jsx` – New.
- `src/pages/simulator/PracticeBenefitsMeasurements.jsx` – New.
- `src/pages/simulator/PracticeBenefitsRealization.jsx` – New.

## Review
- Platform: All Benefits, Register, Measurements, Realization and On Hold are wired and use platform benefits service.
- Simulator: Same four items plus All Benefits use practice benefits review plans and programme benefits where applicable.
- No duplicate or mock data; DB-driven only.
