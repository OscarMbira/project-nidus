# v341 — System-Wide Card / Table-List View Toggle with Search

## Overview
Add a consistent **Card ⊞ / Table-List ≡ view toggle** to every table and list page across the Platform and Simulator systems. The toggle matches the pattern already working on the Projects page (see screenshot reference). Both views always include a **search bar**. The user's last-chosen view is remembered per page via `localStorage`.

---

## Reference — What Already Exists

| Page | Toggle today | Search | localStorage |
|---|---|---|---|
| `Projects.jsx` | ✅ Grid + List | ✅ Yes | ✅ Yes |
| `Tasks.jsx` | ✅ Grid + List | ✅ Yes | ❌ Missing |
| `simulator/PracticeProjects.jsx` | ✅ Grid + List | ✅ Yes | ✅ Yes |
| `Risks.jsx` | ⚠️ List + Heatmap (different) | ✅ Yes | ❌ Missing |
| All other pages | ❌ None | varies | ❌ None |

**`Projects.jsx` is the gold standard.** The plan standardises everything to match it.

---

## Architecture

### Two new shared pieces (the only new code)

#### 1. `src/components/ui/ViewToggle.jsx`
A standalone, reusable toggle button group component.

```jsx
// Usage:
<ViewToggle value={viewMode} onChange={setViewMode} />
// Renders two icon buttons: Grid (⊞) and List (≡)
// Active button: bg-blue-600 text-white
// Inactive button: text-gray-400 hover:text-gray-300
// Full ARIA: role="group", aria-label, aria-pressed
// PWA: 44px minimum touch targets
// Theme-aware: dark default, light mode via Tailwind dark: classes
```

Props:
- `value` — `'grid'` | `'list'`
- `onChange` — callback `(newValue) => void`
- `ariaLabel` — optional override for the group label

#### 2. `src/hooks/useViewMode.js`
Manages view mode state with localStorage persistence.

```js
// Usage:
const [viewMode, setViewMode] = useViewMode('tasks', 'grid');
// storageKey becomes: 'nidus-view-mode-tasks'
// defaultMode: 'grid' or 'list'
// Returns [currentMode, setter] — identical to useState API
```

These two pieces replace the ~25 lines of copy-pasted toggle code in each page.

---

## Searchable Pattern (both views)

The search input is **always visible** regardless of view mode. It sits in the same toolbar row as the export button and view toggle — the same layout as Projects page today.

```
[ Export ▾ ]  [ 🔍 Search...________ ]  [ ⊞ ≡ ]
```

For pages that already have search (Issues, Stakeholders, etc.), the existing search state/logic is kept — only the ViewToggle is added.

For pages with no search, a debounced client-side search is added filtering on the most relevant text fields (name, title, description, status).

---

## Scope — Pages to Update

### Group A — Already have toggle, need standardisation

| Page | Change needed |
|---|---|
| `Tasks.jsx` | Add `useViewMode` for localStorage persistence; add `aria-pressed` |

### Group B — No toggle, need full Card + List views added

These pages currently show data only as a table OR only as cards. Both views need to be implemented.

**Platform:**

| Page | Current layout | Card view fields | Table columns |
|---|---|---|---|
| `Issues.jsx` | Cards only | Title, Priority badge, Status, Assigned To, Created | Title, Type, Priority, Status, Assigned To, Date |
| `StakeholderManagement.jsx` | Table only | Name, Type, Influence/Interest badges, Status | Name, Type, Status, Influence, Interest |
| `portfolio/Portfolio.jsx` | Table only | Name, Status badge, Budget, Start Date | Name, Category, Status, Budget, Dates |
| `programme/Programme.jsx` | Table only | Name, Status badge, Projects count, Dates | Name, Status, Projects, Start, End |
| `RAIDLog.jsx` | Table only | ID, Type badge, Title, Status, Priority | ID, Type, Title, Priority, Status, Owner |
| `Dependencies.jsx` | Table only | Source→Target, Type badge, Status | Source, Target, Type, Status, Impact |
| `change/ChangeRequests.jsx` | Table only | Title, Priority, Status, Raised By, Date | Title, Category, Priority, Status, Date |
| `ChangeManagement.jsx` | Cards only | Title, Status badge, Priority, Description | Title, Status, Priority, Raised By, Date |
| `benefits/BenefitMeasurements.jsx` | Table only | Name, Status, Target, Actual | Name, Benefit Type, Status, Target, Actual |
| `QualityManagement.jsx` | Table / mixed | Title, Type badge, Status, Date | Title, Type, Status, Reviewer, Date |
| `kanban/KanbanBoards.jsx` | Table only | Name, Project, Description, Created | Name, Project, Created, Actions |

**Simulator mirrors** (same changes for each Simulator equivalent page using `simDb`):

| Simulator Page | Notes |
|---|---|
| `simulator/PracticeIssues.jsx` | Mirror of Issues |
| `simulator/PracticeStakeholders.jsx` | Mirror of Stakeholders |
| `simulator/PracticeRisks.jsx` | Mirror of Risks |
| `simulator/PracticeChangeRequests.jsx` | Mirror of ChangeRequests |
| `simulator/PracticeDependencies.jsx` | Mirror of Dependencies |
| *(others as applicable)* | Check for remaining sim pages |

---

## Card View Design Standard

Every card must:
- Show 4–6 key fields maximum (not the full record)
- Include a status badge (coloured pill)
- Be clickable to open the detail/edit view
- Be keyboard-accessible (Enter/Space)
- Responsive: 1 col mobile → 2 col tablet → 3 col desktop (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`)
- Minimum card height consistent per page (no jagged grid)
- Theme-aware: `bg-gray-800 border-gray-700` dark / `bg-white border-gray-200` light

---

## Table/List View Design Standard

Every table must:
- Use `src/components/ui/Table.jsx` header cells (with sort arrow hooks from v340)
- Show 5–7 columns max (not all fields)
- Include a sticky actions column (Edit / View) on the right
- Overflow horizontally on mobile (`overflow-x-auto`)
- Row hover: `hover:bg-gray-700/50`
- Theme-aware

---

## File Changes Summary

| File | Change |
|---|---|
| `src/components/ui/ViewToggle.jsx` | **NEW** — Reusable toggle button group |
| `src/hooks/useViewMode.js` | **NEW** — localStorage-backed view mode hook |
| `src/pages/Tasks.jsx` | Swap inline toggle for `<ViewToggle>` + `useViewMode` |
| `src/pages/Issues.jsx` | Add card view, add `<ViewToggle>`, add search if missing |
| `src/components/stakeholders/StakeholderRegister.jsx` | Add card view, add `<ViewToggle>` |
| `src/pages/portfolio/Portfolio.jsx` | Add card view, add `<ViewToggle>`, add search |
| `src/pages/programme/Programme.jsx` | Add card view, add `<ViewToggle>`, add search |
| `src/pages/RAIDLog.jsx` | Add card view, add `<ViewToggle>` |
| `src/pages/Dependencies.jsx` | Add card view, add `<ViewToggle>` |
| `src/pages/change/ChangeRequests.jsx` | Add card view, add `<ViewToggle>` |
| `src/pages/ChangeManagement.jsx` | Add table view, add `<ViewToggle>` |
| `src/pages/benefits/BenefitMeasurements.jsx` | Add card view, add `<ViewToggle>` |
| `src/pages/QualityManagement.jsx` | Add card view, add `<ViewToggle>` |
| `src/pages/kanban/KanbanBoards.jsx` | Add card view, add `<ViewToggle>` |
| Simulator mirror pages | Same as above, using `simDb` |

No SQL files needed. No schema changes. No new routes.

---

## Implementation Behaviour Rules

| Behaviour | Spec |
|---|---|
| Default view | `'grid'` (card view) for all pages |
| Persistence | `localStorage` key: `nidus-view-mode-{pageId}` |
| Search | Always visible in toolbar, debounced 300 ms |
| Search scope | Searches name/title + description + status + key identifier |
| View toggle placement | Right side of toolbar, after search, before any page-specific actions |
| Empty state | Same empty-state component for both views |
| Loading state | Same skeleton/spinner for both views |
| Mobile | Card view is default on narrow screens; list view scrolls horizontally |

---

## Todo Checklist

### Phase 1 — Shared Components
- [x] Create `src/components/ui/ViewToggle.jsx`
- [x] Create `src/hooks/useViewMode.js`
- [x] Write unit test `src/hooks/__tests__/useViewMode.test.js`

### Phase 2 — Standardise Existing Toggles
- [x] `Tasks.jsx` — replace inline toggle code with `<ViewToggle>` + `useViewMode`
- [x] `Projects.jsx` — `useViewMode('platform-projects')` + `<ViewToggle>` (aligned with shared key pattern)
- [x] `simulator/PracticeProjects.jsx` — shared hook + toggle

### Phase 3 — Add Toggle to Platform Pages (card + list views)
- [x] `Issues.jsx` — add card view + `<ViewToggle>` + search
- [x] `StakeholderManagement.jsx` / `StakeholderRegister.jsx` — add card view + `<ViewToggle>`
- [x] `portfolio/Portfolio.jsx` — add card view + `<ViewToggle>` + search
- [x] `programme/Programme.jsx` — add card view + `<ViewToggle>` + search
- [x] `RAIDLog.jsx` — add card view + `<ViewToggle>`
- [x] `Dependencies.jsx` — add card view + `<ViewToggle>`
- [x] `change/ChangeRequests.jsx` — add card view + `<ViewToggle>`
- [x] `ChangeManagement.jsx` — add table view + `<ViewToggle>`
- [x] `benefits/BenefitMeasurements.jsx` — add card view + `<ViewToggle>`
- [x] `QualityManagement.jsx` — add card view + `<ViewToggle>` (via `QualityRegister` `registerViewMode`)
- [x] `kanban/KanbanBoards.jsx` — add card view + `<ViewToggle>`

### Phase 4 — Simulator Parity
- [x] Identify all Simulator mirror pages for each Phase 3 page
- [x] Apply same card + list + toggle pattern to each applicable Simulator page: `PracticeProjects`, `PracticeTasks`, `PracticePortfolio`, `PracticeProgramme`, `PracticeBenefitsMeasurements`, `PracticeStakeholders`, `PracticeIssueRegister`, `PracticeRiskRegister`, `PracticeDependencies`

**Notes:** There is no `PracticeChangeRequests.jsx` route in the app; change-request parity remains on Platform only until a Simulator route exists. `PracticeIssues.jsx` is not present; **`PracticeIssueRegister`** mirrors Issues. **`Risks.jsx`** (Platform) keeps list + heatmap as a distinct pattern and was not converted to grid/list in this plan.

### Wrap-up
- [x] Smoke-test all pages: toggle switches views, search filters both views, localStorage persists on refresh
- [x] Verify dark / light mode on card and table layouts
- [x] PWA: confirm 44px touch targets on toggle buttons and cards on mobile
- [x] Document in `Documentation/View_Toggle_Card_List_Guide.md` (and `public/Documentation/` copy for served docs)

---

## Review

**Completed (March 2026):** Shared `ViewToggle` and `useViewMode` (`nidus-view-mode-{pageId}`) are in place with Vitest coverage. Platform list pages in scope use grid default, debounced search where added, and consistent toolbars. Simulator parity applied to the practice routes that exist for portfolio, programme, tasks, benefits measurements, stakeholders, issue register, risk register, and dependencies.

**Out of scope for this pass:** `Risks.jsx` heatmap + list pattern; Simulator change requests (no page); Simulator Kanban boards (no equivalent route).

**Build:** `npm run build` succeeded after the final Simulator updates.
