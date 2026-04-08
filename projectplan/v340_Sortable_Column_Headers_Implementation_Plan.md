# v340 — System-Wide Sortable Column Headers Implementation Plan

## Overview
Add clickable, sortable column headers to every table and list view across the Platform and Simulator systems. Clicking a column heading cycles through: **unsorted → ascending → descending → unsorted**. Visual indicators (↑ ↓ ⇅) show the current sort state. This applies consistently to both HTML `<table>` pages and card/list-view pages (via a sort toolbar).

---

## Current State Analysis

| Pattern | Pages | Sorting Today |
|---|---|---|
| HTML `<table>` | Tasks, Projects (list view), StakeholderRegister, QualityRegister, WorkPackageList, EndStageReportList, KanbanBoards, ChangeRequests, etc. | Fixed server-side `.order()` — not user-controllable |
| Card/div list | Risks, Issues, RAIDLog, Benefits, Dependencies, ChangeManagement, etc. | Fixed server-side `.order()` — not user-controllable |
| `src/components/ui/Table.jsx` | Exists with sort props (`sortable`, `sortDirection`, `onSort`) | **Built but unused** across all pages |

**Key opportunity:** The `Table.jsx` UI component already supports sort props. The gap is that no page wires up sort state or passes it back to the Supabase query.

---

## Architecture Decision

### Sort Strategy — Two modes

1. **Server-side sort (preferred)** — Used when a page already fetches from Supabase with pagination. Changing the sort column re-triggers the data fetch with a new `.order()` clause. No data is re-loaded beyond the current page size.

2. **Client-side sort** — Used for small in-memory datasets (< 200 rows, no pagination). Sorting is applied to the already-fetched array without a new network call.

Pages that use `<Pagination>` with `.range()` → server-side.
Pages that load all records at once → client-side.

---

## Implementation Plan

### Phase 1 — Shared Hook `useSortableTable`

**File:** `src/hooks/useSortableTable.js`

Create a single reusable hook that:
- Manages `{ column: string, direction: 'asc' | 'desc' | null }` state
- Provides a `handleSort(column)` toggle function (cycles null → asc → desc → null)
- Exposes `sortedData(data)` helper for client-side sorting (handles strings, numbers, dates)
- Exposes `supabaseOrder` object `{ column, ascending }` for server-side queries
- Accepts `defaultSort` option (e.g. `{ column: 'created_at', direction: 'desc' }`)

This hook is the **only** new shared piece of logic. All pages use it the same way.

---

### Phase 2 — Verify/Update `src/components/ui/Table.jsx`

The existing `TableHeaderCell` already accepts `sortable`, `sortDirection`, and `onSort` props. Verify:
- Visual indicators render correctly (↑ for asc, ↓ for desc, ⇅ for unsorted)
- Cursor changes to `pointer` on sortable headers
- ARIA `aria-sort` attribute is set correctly (`ascending`, `descending`, `none`)
- Keyboard navigation works (Enter/Space triggers sort)
- Mobile: touch targets are at least 44px tall

Minor updates only — no structural changes.

---

### Phase 3 — Apply to HTML Table Pages (Platform)

For each page that renders an HTML `<table>`, wire up `useSortableTable` and replace raw `<th>` elements with `<TableHeaderCell sortable sortDirection={...} onSort={...}>`.

**Target pages (Platform):**

| Page | Table Columns to Sort | Sort Mode |
|---|---|---|
| `src/pages/Tasks.jsx` (list view) | Task Name, Status, Priority, Due Date, Progress | client-side |
| `src/pages/Projects.jsx` (list view) | Project Name, Status, Start Date, End Date | server-side |
| `src/components/stakeholders/StakeholderRegister.jsx` | Name, Type, Status, Influence, Interest | server-side |
| `src/components/quality/QualityRegister.jsx` | Title, Type, Status, Date | server-side |
| `src/components/structured/WorkPackageList.jsx` | Title, Status, Start Date, End Date | server-side |
| `src/components/structured/boundaries/EndStageReportList.jsx` | Title, Stage, Status, Date | server-side |
| `src/pages/kanban/KanbanBoards.jsx` | Board Name, Project, Created Date | client-side |
| `src/pages/change/ChangeRequests.jsx` | Title, Status, Priority, Date | server-side |
| `src/pages/Dependencies.jsx` | Dependency, Source, Target, Status | server-side |
| `src/pages/portfolio/Portfolio.jsx` | Name, Status, Budget, Start Date | server-side |
| `src/pages/programme/Programme.jsx` | Name, Status, Start Date, End Date | server-side |
| `src/pages/RAIDLog.jsx` | ID, Type, Title, Status, Priority | server-side |

---

### Phase 4 — Apply to Card/List Pages (Platform)

For pages using card/div layouts, add a **sort toolbar** row above the cards. This is a compact row of sortable column-label buttons that replace any existing "sort by" dropdown. Clicking a label sorts the card list.

**Target pages:**

| Page | Sortable Fields | Sort Mode |
|---|---|---|
| `src/pages/Risks.jsx` | Risk Score, Status, Level, Created Date | server-side |
| `src/pages/Issues.jsx` | Priority, Status, Type, Created Date | server-side |
| `src/pages/Benefits/BenefitMeasurements.jsx` | Name, Status, Due Date | client-side |
| `src/pages/change/ChangeManagement.jsx` | Title, Status, Priority | server-side |
| `src/pages/DependencyImpacts.jsx` | Title, Impact Level, Status | client-side |

The sort toolbar uses the same `useSortableTable` hook — just a different UI layer (pill buttons with arrows vs `<th>` cells).

---

### Phase 5 — Apply to Simulator Counterparts

Apply the same changes to every Simulator page that mirrors a Platform page:

- `src/pages/sim/` equivalents of all Phase 3 and 4 pages
- Use the same `useSortableTable` hook (schema-agnostic)
- Simulator Supabase queries use `simDb` — the `.order()` call is the only difference

---

### Phase 6 — Persist Sort Preference (Optional UX Enhancement)

Store the last-used sort column and direction in `localStorage` per table (keyed by a table identifier). On revisit the table opens with the user's last sort applied. This is a small addition to `useSortableTable` — a `storageKey` option that reads/writes to localStorage.

This is **opt-in** at the page level and adds no complexity to the core hook.

---

## File Changes Summary

| File | Change Type | Notes |
|---|---|---|
| `src/hooks/useSortableTable.js` | **NEW** | Core hook — manages sort state, client-side sort, supabaseOrder helper |
| `src/components/ui/Table.jsx` | **MINOR UPDATE** | Verify/fix visual indicators and ARIA; no structural change |
| `src/pages/Tasks.jsx` | **UPDATE** | Wire sort hook, replace `<th>` with `<TableHeaderCell>` |
| `src/pages/Projects.jsx` | **UPDATE** | Wire sort hook, pass `supabaseOrder` to service |
| `src/components/stakeholders/StakeholderRegister.jsx` | **UPDATE** | Wire sort hook |
| `src/components/quality/QualityRegister.jsx` | **UPDATE** | Wire sort hook |
| `src/components/structured/WorkPackageList.jsx` | **UPDATE** | Wire sort hook |
| `src/components/structured/boundaries/EndStageReportList.jsx` | **UPDATE** | Wire sort hook |
| `src/pages/kanban/KanbanBoards.jsx` | **UPDATE** | Wire sort hook (client-side) |
| `src/pages/change/ChangeRequests.jsx` | **UPDATE** | Wire sort hook |
| `src/pages/Dependencies.jsx` | **UPDATE** | Wire sort hook |
| `src/pages/portfolio/Portfolio.jsx` | **UPDATE** | Wire sort hook |
| `src/pages/programme/Programme.jsx` | **UPDATE** | Wire sort hook |
| `src/pages/RAIDLog.jsx` | **UPDATE** | Wire sort hook |
| `src/pages/Risks.jsx` | **UPDATE** | Add sort toolbar, wire hook |
| `src/pages/Issues.jsx` | **UPDATE** | Add sort toolbar, wire hook |
| *(other card-list pages)* | **UPDATE** | Add sort toolbar, wire hook |
| Simulator mirror pages | **UPDATE** | Same as above, using simDb |

No new SQL files required. No new database tables. No schema changes.

---

## Behaviour Specification (Best Practice)

| Interaction | Behaviour |
|---|---|
| First click on unsorted column | Sort **ascending** (A→Z, 0→9, oldest first) |
| Second click on same column | Sort **descending** (Z→A, 9→0, newest first) |
| Third click on same column | **Clear sort** — return to default order |
| Click on different column | Sort new column **ascending**, clear previous |
| Default sort when table loads | Defined per page (e.g. `created_at desc`) |
| Visual indicator — unsorted | ⇅ (light grey) |
| Visual indicator — ascending | ↑ (white/primary colour) |
| Visual indicator — descending | ↓ (white/primary colour) |
| Keyboard accessibility | Enter / Space activates sort on focused header |
| Mobile touch target | Minimum 44 × 44 px on header cell |
| Screen reader | `aria-sort="ascending"` / `"descending"` / `"none"` on `<th>` |

---

## Todo Checklist

### Phase 1 — Hook
- [x] Create `src/hooks/useSortableTable.js` with state, toggle, client-side sorter, supabaseOrder
- [x] Write unit test `src/hooks/__tests__/useSortableTable.test.js`

### Phase 2 — Table Component
- [x] Read and verify `src/components/ui/Table.jsx` sort indicator rendering
- [x] Fix any gaps in visual indicators, ARIA, keyboard, mobile touch size
- [x] Confirm no breaking changes to existing usages

### Phase 3 — HTML Table Pages (Platform)
- [x] `Tasks.jsx` — client-side sort wired up
- [x] `Projects.jsx` — server-side sort wired up (`getAllProjects` `sortColumn` / `sortAscending`)
- [x] `StakeholderRegister.jsx` — client-side sort on loaded rows
- [x] `QualityRegister.jsx` — client-side sort (register tab)
- [x] `WorkPackageList.jsx` — sort toolbar + client sort
- [x] `EndStageReportList.jsx` — sort toolbar + client sort
- [x] `KanbanBoards.jsx` — sort toolbar + client sort
- [x] `ChangeRequests.jsx` — via `ChangeRequestList` sort toolbar + client sort
- [x] `Dependencies.jsx` — via `DependencyList` sortable headers + client sort
- [x] `Portfolio.jsx` — via `PortfolioList` sort toolbar + client sort
- [x] `Programme.jsx` — via `ProgrammeList` sort toolbar + client sort
- [x] `RAIDLog.jsx` — sort toolbar + client sort on unified list

### Phase 4 — Card-List Pages (Platform)
- [x] `Risks.jsx` — sort toolbar + server-side sort
- [x] `Issues.jsx` — sort toolbar + server-side sort
- [x] `BenefitMeasurements.jsx` — sort toolbar + client-side sort
- [x] `ChangeManagement.jsx` — uses `ChangeRequestList` (sorted)
- [x] `DependencyImpacts.jsx` — sort toolbar + client-side sort

### Phase 5 — Simulator Parity
- [x] Identify and list all Simulator mirror pages
- [x] Apply same sort changes to each Simulator page (e.g. `PracticeTasks.jsx`; shared components inherit behaviour)

### Phase 6 — localStorage Persistence
- [x] Add `storageKey` option to `useSortableTable`
- [x] Enable on key tables (Projects, Tasks, Stakeholders, Risks, and other wired screens)

### Wrap-up
- [x] Smoke-test all updated pages (sort, clear, pagination interaction)
- [x] Verify dark/light mode renders correctly on sort indicators
- [x] Confirm PWA mobile touch targets pass 44px minimum
- [x] Document in `Documentation/Sortable_Column_Headers_Guide.md`

---

## Review

**Completed (2026-03-29):**

- Added `useSortableTable` with `storageKey`, `sortedData`, `supabaseOrder`, `handleSort`, `getSortDirectionForColumn`.
- Updated `TableHeaderCell` to invoke `onSort()` with no args (parent owns cycle); added `min-h-[44px]` on sortable headers.
- Added `SortToolbar` for card/grid layouts.
- Extended `getAllProjects` with optional `sortColumn` / `sortAscending`.
- Platform: Tasks, Projects, Stakeholder register, Quality register, Work packages, End stage reports, Kanban boards, Change request list, Dependency list, Portfolio/Programme lists, RAID log, Risks, Issues, Benefit measurements, Dependency impacts.
- Simulator: `PracticeTasks.jsx` aligned with Platform task list sorting.
- Unit tests for the hook; user guide under `Documentation/Sortable_Column_Headers_Guide.md`.

**Note:** Stakeholder RPC path still returns a limited list; sorting is applied client-side on the returned set. `ChangeManagement` reuses `ChangeRequestList`, which now includes sorting.
