# Plan v1348 — Project Setup Custom Fields tab (LDE)

PRD: `projectprd/v1347_project_setup_custom_fields_tab_PRD.md`  
**Status:** implemented (Platform + Simulator)

## Todos

- [x] **SQL screens:** `SQL/v1544_project_setup_custom_field_screens.sql` (public + sim)
- [x] **Shared `RecordCustomFields`:** `alwaysShow` empty states (Platform + Simulator)
- [x] **Export helper:** `screenCode` override + new `ENTITY_SCREEN_CODES`; `useLdeExportParts` hooks
- [x] **Wire tabs — Platform:** Project Details, Mandate, Brief/Charter, Business Case, PID, BRP, Team Charter, Governance Setup
- [x] **Wire tabs — Simulator:** Mandate, Brief/Charter, Business Case, PID, BRP, Team Charter (no Governance Setup twin)
- [x] **Export / View wiring:** `useLdeExportParts` on surfaces that already export (e.g. Project Details, Team Charter view)
- [x] **Tests:** `RecordCustomFields.test.jsx` (4) + `exportMerge.screenCode.test.js` (3) — all passed
- [x] **Review section:** filled

## Implementation notes

- Pattern: Pattern B (LDE) + tab chrome (`custom-fields` immediately before Audit).
- Brief vs Charter: `documentMode` → `brief_detail` / `charter_detail`; same `entityType` `project_brief`.
- Business Case: org tab `business_case_detail` kept separate from `InheritedBusinessCaseFields`.
- Theme: Layout grey inheritance; empty panels `bg-white dark:bg-gray-800`.

## Review

### What shipped

1. **SQL v1544** — eight LDE screens in `public` and `sim` (`mandate_detail` … `governance_structure_detail`).
2. **`RecordCustomFields`** — opt-in `alwaysShow` with unsaved / no-fields empty states; default behaviour unchanged for Risks/Assumptions.
3. **Export** — `buildCustomFieldExportParts(..., { screenCode })`; section title **Custom Fields**; constants for new entity types.
4. **Tabs wired** on agreed Project Setup record forms (Platform + Simulator twins where they exist). Governance Setup is Platform-only.

### Remaining / follow-ups

- Apply `SQL/v1544_project_setup_custom_field_screens.sql` on the target Supabase project before mapping fields in Local Data Extensions.
- Opportunistic: merge LDE export on every Mandate/Brief/PID Export button that still uses static sections only.
