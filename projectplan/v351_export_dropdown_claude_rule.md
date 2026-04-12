# v351 — Export dropdown (CLAUDE.md rule 38) — incremental coverage

## Goal

Extend the existing shared `ExportListMenu` (`Excel / Word / PowerPoint / CSV / XML / JSON / Print`) to Simulator financial list views that lacked it, align default Word/PPT field count with rule 38, and fix a missing icon import on Product Status Account list.

## Definition of done (this increment)

- [x] `DEFAULT_LIST_EXPORT_FIELDS` in `exportUtils.js` set to **5** (max remains **10**); matches rule 38 and modal copy.
- [x] Simulator pages with real list/table data: `ExportListMenu` added — cost, EVM, portfolio EVM rollup, profitability (revenue table + export), my expenses.
- [x] `ProductStatusAccountList`: `Package` icon import fixed (runtime reference error in empty state).
- [x] Unit test: `src/utils/__tests__/exportListFieldLimits.test.js` (default ≤ max, values 5 / 10).

## Out of scope (honest)

- **Not** every route under `src/pages` (hundreds of screens). Further waves can attach `ExportListMenu` wherever a filtered row set is rendered.
- Stub pages (`SimExpenseApproval`, `SimExpenseApprovalThresholds`, `SimProjectBudgetBaseline`, programme EVM stubs) remain placeholders until they load list data from the DB.

## Review (2026-04-09)

- **exportUtils.js:** `DEFAULT_LIST_EXPORT_FIELDS` corrected from 15 to 5 (was inconsistent with `MAX_LIST_EXPORT_FIELDS` 10).
- **Simulator:** `SimProjectCostManagement`, `SimProjectEVMPage`, `SimPortfolioEVMPage`, `SimProjectProfitability`, `SimMyExpenses` — export toolbar using the same utilities as Platform.
- **ProductStatusAccountList.jsx:** added `Package` to `lucide-react` imports.
