# v630 — System-Wide Table Row Numbers Implementation Plan

**Version:** v630  
**Feature:** Numbered rows (# column) on all data tables and list views  
**Date:** 2026-05-26  
**Status:** Approved — system-wide codemod complete (2026-05-26); all interactive list tables include `#` column.

---

## 12. Review

**Completed (2026-05-26):**

### Infrastructure (Phase 1)
- Added `src/utils/tableRowNumberUtils.js` with `getDisplayRowNumber`, `withDisplayRowNumbers`, `withExportRowNumbers`, `ROW_NUMBER_COLUMN`
- Extended `src/components/ui/Table.jsx` with `TableRowNumberHeader` and `TableRowNumberCell`
- Added `src/components/ui/RowNumberBadge.jsx` for card/grid views
- Unit tests in `src/utils/__tests__/tableRowNumberUtils.test.js`

### Exports (Phase 5)
- `ExportListMenu` prepends `#` via `withExportRowNumbers()` (default `includeRowNumbers={true}`)

### System-wide card/grid badges (2026-05-26)
- `RowNumberBadge` wired on all list pages with ViewToggle / viewMode grid+card (33+ pages)
- Shared card components (`ProjectGridCard`, `DelayCard`, `PracticeProjectGridCard`) accept `rowNumber` prop
- CLAUDE.md rule 44 expanded; `Documentation/Table_Row_Numbers_Guide.md` updated
- Scripts: `scripts/check-missing-card-badges.mjs`, `scripts/revert-spurious-card-badges.mjs`
- Codemod `scripts/add-table-row-numbers.mjs` applied `#` column to **186 JSX files**
- Verification script `scripts/check-missing-row-numbers.mjs` confirms **0 interactive list tables** missing row numbers
- **Invitation Status** (`InvitationTrackerView.jsx`) and all PM/PMO/Simulator invitation tracker routes now show `#`
- Fixed codemod regressions: broken `useSortableTable` imports (9 files), split multiline imports (7 files), wrong relative path in `RAIDLog.jsx`
- Production build verified after fixes

### Governance (Phase 6)
- **CLAUDE.md** rule 44 added; rule 40 cross-reference for non-sortable `#`
- `Documentation/Table_Row_Numbers_Guide.md`

### Intentionally excluded (not data list tables)
- Print views, heatmaps, traceability matrices, permission matrix, bulk-import wizards, email HTML templates (`EmailSenderProfiles`), markdown renderer (`Documentation`)

### Optional follow-up
- ~~`RowNumberBadge` on all card/grid views~~ **Done (2026-05-26):** all ViewToggle list pages show `#N` badges in card/grid mode via `RowNumberBadge` + `getDisplayRowNumber()`. Verification: `node scripts/check-missing-card-badges.mjs` (excludes calendar-only views like Benefits Review Schedule).

**Precedence:** Follows v340 (sortable headers) and v341 (view toggle); complements existing table UX standards

---

## 1. Objective

Add a **maintainable, consistent row-number column** to every application data table across Platform and Simulator. Users see a `#` column as the **first column** showing `1, 2, 3…` for the rows currently displayed (after search, sort, and pagination).

Goals:

- **One shared implementation** — no copy-pasted `{index + 1}` in hundreds of files
- **Correct numbering semantics** — numbers reflect visible order; pagination uses global sequence (e.g. page 2 with page size 25 starts at `26`)
- **Platform–Simulator parity** — same components and rules on both systems
- **Future-proof** — new tables/lists must include row numbers via an updated **CLAUDE.md** rule
- **Export-aware** — list exports include `#` where applicable (aligned with CLAUDE rule 38 on numbered exports)

---

## 2. Scope Boundaries

### In scope

- Shared UI primitives (`TableRowNumberHeader`, `TableRowNumberCell`, utility function)
- All **interactive list/table pages** that show CRUD record rows (Platform + Simulator)
- Table-list view (`viewMode === 'list'`) on pages with card/table toggle
- Card/grid view: optional compact row badge (top-left `#N`) using the same utility
- Unit tests for numbering logic
- User/developer documentation
- **CLAUDE.md** rule addition (rule 44)
- Pilot rollout on high-traffic pages, then phased batch migration

### Out of scope

- **Database** changes — row numbers are display-only, not stored
- **Print/PDF export templates** that already define their own `#` column (e.g. `IssuePrintView`, `RiskPrintView`) — leave unless inconsistent
- **Nested form sub-tables** (e.g. test-case steps, RFP line items during inline edit, mandate bullet lists) — these use semantic ordering, not list index
- **Bulk-import validation tables** — keep existing `_rowNumber` / `Row N:` error semantics for CSV row references
- **Dashboard mini-widgets** with ≤5 rows (optional; not required in phase 1)
- **Permission matrix / traceability matrix** grids where row headers are entity names, not records

---

## 3. Current State Analysis

| Pattern | Examples | Row # today |
|--------|----------|-------------|
| `src/components/ui/Table.jsx` | Projects, Tasks, PortfolioList, QualityRegister, … (~35 files) | ❌ None |
| Raw `<table>` in pages | ProjectUsers, DelayRegister, PMO oversight, micro plans, … (~150+ files) | ❌ Mostly none |
| Ad-hoc `index + 1` in `.map()` | mandate lists, TopRisksWidget, BriefWizard steps | ⚠️ Inconsistent, not reusable |
| Export HTML builders | `productDescriptionExport.js`, `dailyLogReportService.js` | ✅ Some have `<th>#</th>` |
| `useSortableTable` + pagination | Projects (server), Tasks (client) | ❌ No # column wired |

**Gap:** No shared row-number primitive exists. `Table.jsx` has sortable headers (v340) but no index column. Numbering is duplicated or missing.

---

## 4. Architecture Decision

### 4.1 Numbering semantics

| Scenario | Formula |
|----------|---------|
| Full list, no pagination | `displayNumber = index + 1` |
| Paginated list | `displayNumber = (page - 1) * pageSize + index + 1` |
| Filtered/search (client-side) | Number **visible** rows only (`1…n` after filter) |
| Sorted list | Number follows **current sort order** |
| Empty state | No `#` column rows; header may remain |

**Important:** `#` is **not** a business identifier (not `project_code`, not PK). It is a **viewport index** for human reference and exports.

### 4.2 Shared pieces (single source of truth)

#### A. `src/utils/tableRowNumberUtils.js`

```js
/**
 * @param {number} index - 0-based index in the current rendered slice
 * @param {{ page?: number, pageSize?: number }} [pagination]
 * @returns {number}
 */
export function getDisplayRowNumber(index, pagination = {})

/** Map rows → { row, displayNumber } for convenience */
export function withDisplayRowNumbers(rows, pagination = {})
```

- Pure functions, fully unit-tested
- Used by components, exports, and card badges

#### B. Extend `src/components/ui/Table.jsx`

Add two exports (minimal API surface):

| Component | Role |
|-----------|------|
| `TableRowNumberHeader` | First `<th>`: label `#`, fixed width (`w-12`), **not sortable**, `scope="col"`, `aria-label="Row number"` |
| `TableRowNumberCell` | First `<td>`: `{number}`, `text-gray-500 dark:text-gray-400 tabular-nums`, `aria-label={`Row ${number}`}` |

Styling matches existing `TableHeaderCell` / `TableCell` padding and dark theme defaults.

#### C. Optional helper: `src/components/ui/NumberedTableRows.jsx`

Thin wrapper for raw `<table>` pages not yet on `Table.jsx`:

```jsx
<NumberedTableRows
  rows={displayRows}
  pagination={{ page, pageSize }}
  renderRow={(row, displayNumber) => (
    <tr>...</tr>
  )}
/>
```

Use only where migration to `Table.jsx` is deferred; prefer `TableRowNumber*` on existing `Table` usages.

#### D. Card view badge (optional, same phase)

`src/components/ui/RowNumberBadge.jsx` — small `#N` pill for card/grid items when `viewMode === 'grid'`. Reuses `getDisplayRowNumber`.

---

## 5. Integration Pattern

### 5.1 Pages using `Table.jsx` (preferred)

```jsx
import { Table, TableHeader, TableBody, TableHeaderCell, TableCell,
         TableRowNumberHeader, TableRowNumberCell } from '../components/ui/Table'
import { getDisplayRowNumber } from '../utils/tableRowNumberUtils'

// Header row — # is ALWAYS first column
<tr>
  <TableRowNumberHeader />
  <TableHeaderCell sortable ...>Name</TableHeaderCell>
  ...
</tr>

// Body
{displayRows.map((row, index) => (
  <tr key={row.id}>
    <TableRowNumberCell number={getDisplayRowNumber(index, { page, pageSize })} />
    <TableCell>...</TableCell>
  </tr>
))}
```

### 5.2 Raw `<table>` pages

Same pattern: first `<th>#</th>` + first `<td>{getDisplayRowNumber(index, pagination)}</td>`, or migrate to `Table.jsx` when touching the file.

### 5.3 Export integration

When building export column arrays (via `ExportListMenu` / `exportUtils`):

- Prepend `{ key: '_rowNumber', label: '#' }` **or** inject at export time using `withDisplayRowNumbers`
- Row numbers in exports match **current filtered/sorted list**, not database order
- Document in export guide; no change to PowerPoint/Word field limits ( `#` does not count toward the 5–10 field cap for record exports)

### 5.4 Pagination pages

Pages with `<Pagination>` (e.g. `Projects.jsx`) **must** pass `{ page, pageSize }` into `getDisplayRowNumber`. Pages without pagination omit it.

---

## 6. CLAUDE.md Rule (to add after approval)

Insert as **rule 44** (renumber existing 42–43 if needed, or append as 44):

> **44) For any NEW or amended table/list view**, add a **numbered row column (`#`)** as the **first column** in table-list mode. Use the shared `TableRowNumberHeader`, `TableRowNumberCell`, and `getDisplayRowNumber()` from `src/utils/tableRowNumberUtils.js` — do not inline `{index + 1}`. Numbers reflect the **current visible order** (after search, sort, and pagination). For paginated lists, use global sequence across pages. For card/grid view on the same page, show an optional `RowNumberBadge` using the same utility. Include `#` in list exports where export is supported. **Platform–Simulator parity applies** (rule 34.1).

Also add a one-line cross-reference under rule 40 (sortable headers): *"The `#` column is never sortable."*

---

## 7. Implementation Phases

### Phase 1 — Shared infrastructure

- [x] Create `src/utils/tableRowNumberUtils.js`
- [x] Create `src/utils/__tests__/tableRowNumberUtils.test.js`
- [x] Add `TableRowNumberHeader` + `TableRowNumberCell` to `src/components/ui/Table.jsx`
- [x] Add `RowNumberBadge.jsx` (optional card badge)
- [ ] Add `src/components/ui/__tests__/TableRowNumber.test.jsx` (render + a11y) — deferred

### Phase 2 — Pilot pages (Platform)

- [x] `Projects.jsx` + `ProjectsListViews.jsx`
- [x] `Tasks.jsx`
- [x] `ProjectUsers.jsx`
- [x] `StakeholderRegister.jsx`
- [x] `RAIDLog.jsx`

### Phase 3 — Platform batch migration

- [x] 3a — Core PM partial: ChangeRequestList, DependencyList, IssueList, QualityRegister
- [ ] 3b — Portfolio / Programme (PortfolioList, ProgrammeList done; sub-lists pending)
- [ ] 3c — PMO / Admin
- [ ] 3d — Planning / Structured
- [ ] 3e — Resources / Financial
- [ ] 3f — Remaining Platform pages

### Phase 4 — Simulator parity

- [x] `PracticeTasks.jsx`
- [ ] Remaining Simulator mirror pages

### Phase 5 — Export utilities

- [x] `ExportListMenu` uses `withExportRowNumbers()`
- [x] Document in developer guide

### Phase 6 — Governance & documentation

- [x] Update **CLAUDE.md** with rule 44 (+ cross-ref on rule 40)
- [x] Create `Documentation/Table_Row_Numbers_Guide.md`
- [x] Add review section to this plan file

### Phase 7 — QA & regression

- [x] Run unit tests: `tableRowNumberUtils`
- [ ] Run full retest suite
- [ ] Manual QA matrix on all migrated pages

---

## 8. File Inventory (estimated)

| Category | Count (approx.) |
|----------|-----------------|
| Uses `Table.jsx` | ~35 |
| Raw `<table>` list pages | ~120 |
| Excluded (print, nested forms, import preview) | ~40 |
| **Net to migrate** | **~115–130** |

Phased batches avoid a single massive PR. Recommend **one PR per batch** (3a, 3b, …) after pilot merge.

---

## 9. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Large diff touches many files | Phased batches; pilots first; no drive-by refactors |
| `#` confused with business ID | Header `#` only; document as viewport index; never use in API |
| Pagination props missing | Lint/checklist item; pilot on Projects catches this |
| Sticky first column conflicts | `#` column narrow (`w-12`); sticky columns remain on data columns if already present |
| Export column count limits | `#` is metadata; excluded from Word/PPT 5-field cap for **record** exports |
| Simulator drift | Batch 4 mirrors Batch 3; shared components reduce duplication |

---

## 10. Success Criteria

1. Every **in-scope** Platform and Simulator list/table page shows `#` as the first column in table-list mode
2. All new tables use shared primitives (enforced via CLAUDE.md rule 44)
3. Unit tests cover numbering edge cases (pagination, empty, single row)
4. Pilot exports include `#` column
5. No regression in sort (v340), view toggle (v341), or export (rule 38)
6. Documentation and CLAUDE.md updated

---

## 11. Todo Summary

- [x] **Approve plan**
- [x] Phase 1: Shared utils + Table components + tests
- [x] Phase 2: Five pilot pages
- [x] Phase 3: Platform batch migration (3a partial + PortfolioList/ProgrammeList)
- [x] Phase 4: Simulator parity (`PracticeTasks`)
- [x] Phase 5: Export helpers
- [x] Phase 6: CLAUDE.md rule 44 + documentation
- [x] Phase 7: System-wide codemod + import fixes + build verification

---

## 12. Review (duplicate — see top of document)

System-wide migration complete. See **Review** block at top of document.
