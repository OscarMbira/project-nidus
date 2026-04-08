# Test Case & Defect Module — Implementation Summary

**Plan:** `projectplan/v338_Test_Case_Defect_Management_Implementation_Plan.md`  
**Status:** Phases 1–11 implemented for shipped scope (2026-03-27).

## Delivered

- Platform UI, services, routes, `pmMenuConfig`, DB menu SQL `v346`.
- Simulator parity: SQL `v347`–`v352`, sim services, `SimTestingPageShell`, pages, `simulatorMenuConfig`, routes.
- Exports on list and key detail pages; `papaparse` added for CSV import.
- Unit tests: `testSuiteService`, `testCaseService`, `testRunService`, `defectService`, `testImportService`.
- Integration-style contract tests: `src/test/integration/testRunAutoDefectFlow.test.js`.

## Operational notes

- Apply migrations in order through `v352` on Supabase.
- Run `v351` alone (single transaction + lock ordering) to avoid deadlocks during DDL.

## Deferred / follow-up

- **§12.7 Draft queue:** Wire test case create/edit to global draft/hold queue (`v254`) — not in phased checklist; optional product enhancement.
- **§8 advanced run report:** Full Word/Excel run report with per-case colours and extra sections can extend `exportUtils` later.
- **E2E:** Browser E2E against live Supabase when a harness is available.
