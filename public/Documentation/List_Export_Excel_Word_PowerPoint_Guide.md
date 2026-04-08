# List/Table Export: Excel, Word, PowerPoint

## Overview

All list/table pages support exporting the current filtered list to **Excel**, **Word**, and **PowerPoint**.

- **Excel:** Exports all columns (one click). Same behaviour as before.
- **Word:** Exports the list as a Word document with a **table**. User chooses which fields to include (default 5, max 10).
- **PowerPoint:** Exports the list as a PowerPoint deck with **tables** (one slide per chunk of rows). User chooses which fields to include (default 5, max 10).

## Default and maximum fields (Word / PowerPoint)

- **Default:** 5 fields (first 5 columns from the page’s column definition).
- **Maximum:** 10 fields.
- The user selects/deselects fields in a modal before exporting to Word or PowerPoint.

## Implementation

### Utilities (`src/utils/exportUtils.js`)

- **`exportToExcel(columns, rows, baseFilename)`** — unchanged; exports all columns to `.xlsx`.
- **`exportListToWord(columns, rows, baseFilename)`** — builds a Word document with a single table (header row + data rows). `columns` is the **selected** subset (e.g. 5–10 fields).
- **`exportListToPPT(columns, rows, baseFilename)`** — builds a PowerPoint with a title slide and one or more data slides. Each data slide has a table; rows are split into chunks (e.g. 18 rows per slide).
- **`DEFAULT_LIST_EXPORT_FIELDS`** = 5, **`MAX_LIST_EXPORT_FIELDS`** = 10.

### Component (`src/components/ui/ExportListMenu.jsx`)

- Replaces the previous single “Export to Excel” button with an **Export** dropdown:
  - **Excel (all fields)** — calls `exportToExcel(columns, data, baseFilename)`.
  - **Word (choose fields)** — opens the field selector modal; on confirm, calls `exportListToWord(selectedColumns, data, baseFilename)`.
  - **PowerPoint (choose fields)** — opens the same modal; on confirm, calls `exportListToPPT(selectedColumns, data, baseFilename)`.
- **Props:** `columns` (array of `{ key, label }`), `data` (array of row objects), `baseFilename` (string), `disabled` (optional boolean).
- Field selector modal: checkboxes for each column; default selection = first 5; at most 10 can be selected.

### Usage on list pages

List pages use **ExportListMenu** instead of **ExportListButton**:

```jsx
import ExportListMenu from '../../components/ui/ExportListMenu'

// In the toolbar:
<ExportListMenu
  columns={MY_COLUMNS}
  data={filteredRows}
  baseFilename="MyEntity"
  disabled={!filteredRows.length}
/>
```

All list/table pages that previously used `ExportListButton` + `exportToExcel` have been updated to use `ExportListMenu` with the same column and data source.

## Date

2026-02-23
