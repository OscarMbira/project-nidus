# v217 — Parent Portfolio Searchable Dropdown

## Objective
Add a **Parent Portfolio ID** searchable dropdown field directly below the Category field on the Portfolio creation/edit form (both Platform and Simulator). This replaces the existing basic `<select>` that is currently buried inside the "Governance & Hierarchy" sub-section.

---

## Current State

| Item | Status |
|---|---|
| `parent_portfolio_id` column in `portfolios` DB table | ✅ Already exists |
| `parent_portfolio_id` in `formData` state (Platform form) | ✅ Already exists |
| `parent_portfolio_id` in `formData` state (Simulator form) | ✅ Already exists |
| Both forms fetch portfolios list | ✅ Already fetched |
| Both forms submit `parent_portfolio_id` correctly | ✅ Already handled |
| `SearchableSelect` reusable component | ✅ Exists at `src/components/ui/SearchableSelect.jsx` |
| Field position | ❌ Hidden in Governance section, basic `<select>`, conditional on `portfolios.length > 0` |

**No SQL migration required.** The column already exists.

---

## Changes Required

### 1. `src/components/portfolio/PortfolioForm.jsx` (Platform)
- [x] Import `SearchableSelect` from `../../components/ui/SearchableSelect`
- [x] Add `Parent Portfolio` searchable dropdown **immediately after** the Category field block, using `md:col-span-2 md:max-w-md` layout (same width as Category)
- [x] Options format: `{ value: p.id, label: \`${p.portfolio_name} (${p.portfolio_code})\` }`
- [x] Remove the old `parent_portfolio_id` `<select>` from the Governance & Hierarchy section
- [x] Remove the `portfolios.length > 0` conditional so the field always renders

### 2. `src/components/sim/PracticePortfolioForm.jsx` (Simulator)
- [x] Import `SearchableSelect` from `../../components/ui/SearchableSelect`
- [x] Add same `Parent Portfolio` searchable dropdown **immediately after** the Category field block, using `md:col-span-2 md:max-w-md` layout
- [x] Same options format as above
- [x] Remove the old `parent_portfolio_id` `<select>` from the Governance section
- [x] Remove the `portfolios.length > 0` conditional

---

## Field Specification

| Attribute | Value |
|---|---|
| Label | `Parent Portfolio (optional)` |
| Position | Below Category field, before Governance & Hierarchy section |
| Layout | `md:col-span-2 md:max-w-md` (matches Category field width) |
| Component | `SearchableSelect` |
| Placeholder | `None (Top Level)` |
| Search placeholder | `Search portfolios...` |
| Options source | `portfolios` state (already fetched in `fetchLookupData`) |
| Value | `p.id` (UUID) |
| Display label | `${p.portfolio_name} (${p.portfolio_code})` |
| On clear | Sets `parent_portfolio_id` to `''` → saved as `null` |
| Helper text | `Assign this as a sub-portfolio under another portfolio.` |

---

## What Does NOT Change
- No SQL migration needed
- No service changes needed (`getPortfolioList` already exists, portfolios already fetched)
- No routing changes
- No other components affected

---

## Review Section

### Changes Made
- **2 files modified**, no SQL migration needed.
- **`PortfolioForm.jsx`** (Platform): Added `SearchableSelect` import; inserted `Parent Portfolio` searchable dropdown directly below the `Category` field using the same `md:col-span-2 md:max-w-md` width; removed old basic `<select>` from Governance & Hierarchy section (including the `portfolios.length > 0` guard).
- **`PracticePortfolioForm.jsx`** (Simulator): Identical changes mirrored — searchable dropdown below Category, old select removed from Governance section.

### Behaviour
- Field always renders regardless of whether other portfolios exist (shows "None (Top Level)" placeholder when empty).
- Typing in the search box filters portfolios by name or code in real-time.
- Selecting a value stores the portfolio UUID in `parent_portfolio_id`; clearing it stores `null` (handled in existing submit logic).
- Uses the existing, memoised `SearchableSelect` component — no new dependencies introduced.
