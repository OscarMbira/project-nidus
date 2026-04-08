# Sortable column headers (v340)

## Overview

Interactive sorting is implemented via `src/hooks/useSortableTable.js`:

- Click cycles the **active column**: ascending → descending → cleared (falls back to `defaultSort`).
- Switching column starts at **ascending** for the new column.
- Optional **`storageKey`**: persists last sort in `localStorage` as JSON `{ column, direction }`.

## UI

- **HTML tables:** `TableHeaderCell` from `src/components/ui/Table.jsx` (indicators ↑ ↓ ⇅, `aria-sort`, keyboard, min height 44px).
- **Card / grid lists:** `SortToolbar` from `src/components/ui/SortToolbar.jsx` (pill buttons with the same cycle).

## Server vs client

- **Server:** Pass `supabaseOrder` into Supabase `.order(column, { ascending })` (see `Projects` “All projects”, `Risks`, `Issues`).
- **Client:** Call `sortedData(rows, accessors)` where each accessor key matches the logical sort column id.

## Files

| Piece | Path |
|-------|------|
| Hook | `src/hooks/useSortableTable.js` |
| Tests | `src/hooks/__tests__/useSortableTable.test.js` |
| Table header cell | `src/components/ui/Table.jsx` |
| Card toolbar | `src/components/ui/SortToolbar.jsx` |

## Simulator parity

Where a Simulator screen mirrors Platform behaviour (e.g. `PracticeTasks.jsx`), the same hook and UI patterns are applied with `sim`-scoped data and routes.
