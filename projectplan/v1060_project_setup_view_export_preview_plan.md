# v1060 — Project Setup document View + export preview

## Goal

Wire the existing **View** + format-preview pattern (`ExportRecordMenu` → `RecordPreviewModal`) onto Project Setup **document** pages so users can preview/export as PDF, Word, PowerPoint, or Excel from the document header.

## Scope

**In scope**
- Project Details (add View/Export)
- Project Mandate (already declarative — verify only)
- Project Brief (callback → declarative)
- Business Case (already declarative — verify only)
- Project Charter view (add View/Export + theme shell fix)
- PIDs detail (callback → declarative)
- Benefits Review Plans (callback → declarative)
- Simulator parity for Brief / PID / Benefits Review

**Out of scope**
- Project Team
- Governance Setup
- API changes to `ExportRecordMenu` / `RecordPreviewModal`
- Retiring `PIDExportMenu`

## Implementation checklist

- [x] Verify Mandate uses `ExportRecordMenu` with sections
- [x] Verify Business Case uses declarative `ExportRecordButtons` (sections + record)
- [x] Convert Platform Brief / PID / Benefits Review to `sections` + `record`
- [x] Add `ExportRecordMenu` to Project Details header
- [x] Add `ExportRecordMenu` to Project Charter view; fix `gray-950` page shell
- [x] Mirror Brief / PID / Benefits Review in Simulator
- [x] Leave legacy monolith `src/pages/...` copies unchanged (apps are source of truth)

## Files changed

| Area | Path |
|------|------|
| Platform Brief | `apps/platform/src/pages/brief/ProjectBriefView.jsx` |
| Platform PID | `apps/platform/src/pages/pid/PIDView.jsx` |
| Platform BRP | `apps/platform/src/pages/BenefitsReviewPlan.jsx` |
| Platform Details | `apps/platform/src/pages/projectSetup/ProjectDetailsPage.jsx` |
| Platform Charter | `apps/platform/src/pages/projectSetup/ProjectCharterView.jsx` |
| Simulator Brief | `apps/simulator/src/pages/brief/ProjectBriefView.jsx` |
| Simulator PID | `apps/simulator/src/pages/pid/PIDView.jsx` |
| Simulator BRP | `apps/simulator/src/pages/BenefitsReviewPlan.jsx` |

## Review

### What changed
- Pages that already passed `onExport*` callbacks to `ExportRecordButtons` now pass `sections` + `record` + `baseFilename`, which routes through `ExportRecordMenu` and surfaces the **View** button + `RecordPreviewModal`.
- Project Details and Project Charter gained `ExportRecordMenu` in the page header.
- Project Charter outer shell updated to Layout-matching grey (padding-only; raised surfaces use `bg-white dark:bg-gray-800`).

### Validation performed
- Code review against Mandate reference pattern (`sections` + `record`).
- Confirmed Business Case / Mandate already declarative (no code change).
- Unused `exportRecordTo*` imports removed from converted pages.

### Manual UI checks (recommended)
1. Open each in-scope document page → confirm **View** and **Export** appear.
2. Click **View** → modal offers PDF / Word / PowerPoint / Excel and preview renders.
3. Export dropdown still downloads formats.
4. Charter light/dark contrast OK on raised panels.

### Remaining risks / follow-ups
- Project Team and Governance Setup still lack View/Export (deferred by design).
- Legacy `src/pages/...` copies still use callback API if ever mounted outside the apps shells.
- PID retains separate `PIDExportMenu` for richer multi-section PID export alongside the standard View/Export control.
