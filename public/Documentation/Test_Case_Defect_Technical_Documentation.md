# Test Case & Defect Module — Technical Notes

## Architecture

| Area | Platform | Simulator |
|------|----------|-----------|
| Schema | `public` | `sim` |
| Client | `platformDb` | `simDb` |
| Routes | `/platform/testing/*` | `/simulator/practice-testing/*` |

## SQL versions (reference)

- **v338–v345:** Platform tables, RLS, triggers, `defect-attachments` storage.
- **v346:** `menu_items` + `role_menu_items` for sidebar.
- **v347–v352:** `sim.practice_test_*`, `sim.practice_defect*`, RLS, auto-defect trigger, `sim-defect-attachments`.

## Auto-defect trigger

- **Platform:** `fn_auto_create_defect_on_failure` on `test_case_executions` (BEFORE UPDATE OF status).
- **Simulator:** `sim.fn_practice_auto_create_defect_on_failure` on `sim.practice_test_case_executions`.

## Services (entry points)

- `testSuiteService.js`, `testCaseService.js`, `testRunService.js`, `defectService.js`, `testImportService.js`
- Sim: `practiceTestSuiteService.js`, `practiceTestCaseService.js`, `practiceTestRunService.js`, `practiceDefectService.js`

## UI resolution after fail

`TestRunExecute` / `SimTestRunExecute` use `updateExecution` (or sim equivalent) embed `defect:`; if missing for `failed`, refetch `getExecutionsByRun` and read `defect` from the matching execution row.

## Exports

Reuse `ExportListMenu`, `ExportRecordButtons`, and `src/utils/exportUtils.js`.
