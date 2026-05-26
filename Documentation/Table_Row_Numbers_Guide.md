# Table Row Numbers — Developer Guide

**Version:** v630  
**Last updated:** 2026-05-26

---

## Overview

List and table views show a **`#` column** as the first column. Numbers are **display-only viewport indices** (1, 2, 3…) reflecting the current visible order after search, sort, and pagination. They are not stored in the database and are not business identifiers.

---

## Shared API

### Utilities — `src/utils/tableRowNumberUtils.js`

| Export | Purpose |
|--------|---------|
| `getDisplayRowNumber(index, pagination?)` | Compute 1-based row number |
| `withDisplayRowNumbers(rows, pagination?)` | Map rows to `{ row, displayNumber }` |
| `withExportRowNumbers(columns, rows, options?)` | Prepend `#` column for exports |
| `ROW_NUMBER_COLUMN` | `{ key: '_rowNumber', label: '#' }` |

**Pagination example:** page 2, page size 25 → first row on page is `#26`.

### UI — `src/components/ui/Table.jsx`

| Component | Usage |
|-----------|--------|
| `TableRowNumberHeader` | First `<th>` in header row |
| `TableRowNumberCell` | First `<td>`; prop `number={displayNumber}` |

### Card/grid view — `src/components/ui/RowNumberBadge.jsx`

Every page with a Card ⊞ / Table-List ≡ toggle (rule 41) must show row numbers in **both** modes using the same `getDisplayRowNumber()` values.

```jsx
import RowNumberBadge from '../components/ui/RowNumberBadge'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'

{displayRows.map((row, index) => (
  <article key={row.id} className="rounded-lg border p-4 ...">
    <div className="flex items-start gap-2">
      <RowNumberBadge number={getDisplayRowNumber(index, { page, pageSize })} className="shrink-0" />
      <h3>{row.name}</h3>
    </div>
  </article>
))}
```

For extracted card components (e.g. `ProjectGridCard`, `DelayCard`), pass `rowNumber={getDisplayRowNumber(index)}` as a prop and render `RowNumberBadge` inside the card header.

---

## Table-list pattern

```jsx
import {
  TableHeaderCell,
  TableRowNumberHeader,
  TableRowNumberCell,
} from '../components/ui/Table'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'

<thead>
  <tr>
    <TableRowNumberHeader className="!normal-case" />
    <TableHeaderCell sortable ...>Name</TableHeaderCell>
  </tr>
</thead>
<tbody>
  {displayRows.map((row, index) => (
    <tr key={row.id}>
      <TableRowNumberCell number={getDisplayRowNumber(index, { page, pageSize })} />
      <td>...</td>
    </tr>
  ))}
</tbody>
```

---

## Exports

`ExportListMenu` automatically prepends `#` via `withExportRowNumbers()` (default `includeRowNumbers={true}`).

For custom exports:

```js
import { withExportRowNumbers } from '../utils/tableRowNumberUtils'

const { columns, rows } = withExportRowNumbers(EXPORT_COLS, exportData, { page, pageSize })
exportListToCSV(columns, rows, 'MyList')
```

---

## Exclusions

Do **not** add `#` to:

- Print/PDF templates with their own numbering
- Nested form sub-tables (steps, line items while editing)
- Bulk-import validation grids (`Row N:` error references)
- Dashboard widgets with ≤5 summary rows (optional)

---

## QA checklist

- [ ] `#` is first column in table-list mode
- [ ] `RowNumberBadge` appears on each card in grid/card mode (same numbering as table)
- [ ] Sorting re-numbers rows 1…n in new order
- [ ] Search/filter re-numbers visible rows only
- [ ] Paginated pages use global sequence
- [ ] `#` column is not sortable
- [ ] Dark/light theme readable
- [ ] Export includes `#` as first column
- [ ] Platform–Simulator parity for shared list components

---

## Related

- `Documentation/Sortable_Column_Headers_Guide.md` (v340)
- `projectplan/v630_Table_Row_Numbers_Implementation_Plan.md`
