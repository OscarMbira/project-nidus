# v1098 — Governance chart gallery Plan

## Status

Implemented.

## Todos

- [x] SQL bucket + `project_governance_charts` + RLS
- [x] Shared `governanceChartService`
- [x] Overview gallery UI (browse / drag / paste / caption / hard delete)
- [x] PRD / guide / taxonomy / unit tests

## Files

- `SQL/v1098_governance_charts_storage.sql`
- `packages/shared/src/services/governanceChartService.js`
- `packages/shared/src/services/__tests__/governanceChartService.test.js`
- `apps/platform/src/pages/governanceHub/GovernanceChartsGallery.jsx`
- `apps/platform/src/pages/governanceHub/GovernanceStructurePage.jsx`

## Apply

Run `SQL/v1098_governance_charts_storage.sql` on Supabase before using the gallery.

## Review

Gallery lives under Overview. Upload is immediate; Delete confirms then removes storage object and DB row. Paste is for images; PDF via Browse or drag-and-drop.
