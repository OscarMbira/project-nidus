# v821 — Card/Table View Toggle for PM Dashboard Drill-Down Pages

## Goal
The PM Dashboard's 6 stat cards (Active Work Packages, Open Risks, Open Issues, Quality
Activities, Pending Reports, Lessons Logged) each drill into a list page. Per rule 41 (mandatory
Card ⊞ / Table-List ≡ toggle on every table/list page), those 6 destination pages should have
the toggle. User confirmed via screenshot that Lessons Log is missing it, and asked for all six
to get it — scope confirmed as "all 6 pages, Platform + Simulator" in this pass.

## Destination pages (Platform paths; Simulator has byte-identical structure under
`apps/simulator/src/...`)
| Stat card | Route | Wrapper | View component | List component | Current state |
|---|---|---|---|---|---|
| Active Work Packages | `/pm/delivery/work-packages` | `PMDeliveryWorkPackages.jsx` | `pages/workpackage/WorkPackageView.jsx` | TBD | No toggle found |
| Open Risks | `/pm/controls/risk-register` | `PMControlsRiskRegister.jsx` | `pages/RiskRegisterView.jsx` | `components/risks/RisksList.jsx` | Single stacked `RiskCard` list, no toggle |
| Open Issues | `/pm/controls/issue-register` | `PMControlsIssueRegister.jsx` | `pages/IssueRegisterView.jsx` | `components/IssueList.jsx` | **`IssueList` already supports `viewMode='grid'\|'list'`** (sortable-table branch exists) — just never wired to a `<ViewToggle>` in the page |
| Quality Activities | `/pm/controls/quality-register` | `PMControlsQualityRegister.jsx` | `components/quality/QualityRegister.jsx` | inline | No toggle found |
| Pending Reports | `/pm/reporting/checkpoint-reports` | `PMReportingCheckpoint.jsx` | `pages/structured/CheckpointReportList.jsx` | inline | No toggle found |
| Lessons Logged | `/pm/controls/lessons-log` | `PMControlsLessonsLog.jsx` | `pages/LessonsLogView.jsx` | `components/lessonsLog/LessonsList.jsx` | Single stacked `LessonCard` list, no toggle |

## Design (reusing existing shared infrastructure — no new packages)
Every other list page in the app that already has this toggle (`Issues.jsx`, `Projects.jsx`,
`Tasks.jsx`, ...) follows the same pattern, which this plan replicates exactly:
- `useViewMode(pageId, 'grid')` from `@nidus/shared/hooks/useViewMode` — `[viewMode, setViewMode]`
  persisted to `localStorage` under `nidus-view-mode-{pageId}`.
- `<ViewToggle value={viewMode} onChange={setViewMode} />` from `@nidus/ui/ViewToggle`, placed in
  the page header next to the existing Export/Add buttons (the empty space circled in the
  Lessons Log screenshot).
- The list component takes a `viewMode` prop:
  - `'grid'` (default): existing card rendering, unchanged, plus a `RowNumberBadge` per rule 44.
  - `'list'`: a `<table>` using `TableHeaderCell` / `TableRowNumberHeader` / `TableRowNumberCell`
    / `getDisplayRowNumber` from `@nidus/shared/utils/tableRowNumberUtils` (rules 40 + 44) — one
    row per record, key fields as columns, row actions (Edit/Delete/View) in a sticky-right cell.
- `ExportListMenu` (rule 38) stays as-is — already present on every one of these pages.
- Each page's existing search bar (rule 41 requires one in both views) is kept; the columns
  chosen per register mirror what its card view already surfaces so no data is newly exposed
  that wasn't already visible.

## Platform ↔ Simulator parity (rule 34.1)
Confirmed via [[v819]]'s investigation: this `/pm/*` area is genuinely shared, non-simulation
code — Simulator's `services/supabaseClient.js` exports `supabase = platformDb`, so its copies of
these same files query the same `public` schema tables, not `sim`-schema `practice_*` tables.
Every file touched in Platform gets the identical edit mirrored into its Simulator counterpart
(`apps/simulator/src/...`), verified byte-identical via `diff -B -w` before moving to the next
page, same as the last several rounds of PM-area fixes this session.

## Explicitly out of scope
- Any change to the underlying data queries, filters, or business logic of these 6 registers —
  this is a presentation-layer addition only.
- `PMControlsQualityRegister.jsx` mounting `QualityRegister` with no props ([[v817]]'s
  previously-noted pre-existing gap) — only touched if it blocks wiring the toggle in; otherwise
  left as its own pre-existing issue.
- Any other list page in the app beyond these 6 — this plan is scoped to the PM Dashboard's
  drill-down targets only.

## Todo
- [x] Lessons Log: table view in `LessonsList.jsx` + `ViewToggle` wired in `LessonsLogView.jsx`
      (Platform), mirrored to Simulator
- [x] Issue Register: wire existing `IssueList` grid/list support into `IssueRegisterView.jsx`
      (Platform), mirrored to Simulator
- [x] Risk Register: table view in `RisksList.jsx` + `ViewToggle` wired in `RiskRegisterView.jsx`
      (Platform), mirrored to Simulator
- [x] Quality Register: toggle + table view in `QualityRegister.jsx` (Platform), mirrored to
      Simulator
- [x] Checkpoint Reports: toggle + table view in `CheckpointReportList.jsx` (Platform), mirrored
      to Simulator
- [x] Work Packages: toggle + table view (Platform), mirrored to Simulator
- [x] Syntax-check every touched file (esbuild compile) — all 24 files pass
- [ ] Manual verification in browser (left for user): toggle appears and persists per page,
      switching modes shows the same records, dark/light mode both readable

## Review

**Status: code complete across all 6 pages, both apps (24 files touched), pending browser
verification.**

**What shipped, per page:**
- **Lessons Log** — `LessonsList.jsx` gained a `viewMode` prop and a full `<table>` branch
  (Reference/Title/Category/Effect/Priority/Status/Date + row numbers); `LessonCard.jsx` gained
  a `rowNumber` prop for the grid view. `LessonsLogView.jsx` wired `useViewMode('pm-lessons-log')`
  + `<ViewToggle>` into the header.
- **Issue Register** — no new list-rendering code needed: `IssueList.jsx` already fully supported
  `viewMode='grid'|'list'` (table branch, row numbers, the works) — it just had never been wired
  to a `<ViewToggle>`. Added `useViewMode('pm-issue-register')` + the toggle in
  `IssueRegisterView.jsx`, taking care to name it `issueListLayout` (not `viewMode`) since that
  page already used `viewMode` for its List/Analytics/Settings tab switcher — reusing the name
  would have collided two unrelated concepts under one variable.
- **Risk Register** — same shape as Lessons Log: `RisksList.jsx` gained a table branch and
  `RiskCard.jsx` gained `rowNumber`. `RiskRegisterView.jsx` already had its own tab-switcher
  `viewMode` too (`'list'|'matrix'|'analytics'|'reviews'|'settings'`), so the new state is
  `riskListLayout`, shown only while the List tab is active.
- **Quality Register** — found `QualityRegister.jsx` already had a **complete, sortable** table
  view (`useSortableTable`) and a grid view gated behind a `registerViewMode` prop — but (a) the
  grid branch referenced `RowNumberBadge` with **no import**, a latent crash-on-use bug that had
  never fired because nothing ever set `registerViewMode='grid'`, and (b) its parent,
  `PMControlsQualityRegister.jsx`, mounted `<QualityRegister />` with **zero props** — no `items`,
  no `projectId` — so the register never showed any data at all, regardless of view mode. Fixed
  the missing import, then rebuilt `PMControlsQualityRegister.jsx` to resolve the current project
  (`usePlatformProjectId`), fetch its register items (`getQualityRegister({ project_id })`), and
  wire `useViewMode('pm-quality-register')` + `<ViewToggle>`. Did **not** wire create/edit
  (`QualityRegisterForm`) — out of scope for a presentation-layer toggle fix; Add/Edit affordances
  on this page remain a follow-up, same gap [[v819]] already flagged.
- **Checkpoint Reports** — `CheckpointReportList.jsx` had a single stacked-card list; added a
  table branch, row numbers on both views, and `useViewMode('pm-checkpoint-reports')` +
  `<ViewToggle>`. Discovered along the way that Simulator's copy of this file had silently drifted
  out of parity from an **earlier, uncommitted** Platform fix in this same working tree (Platform's
  file already queried project-wide via `getCheckpointReportsByProject`; Simulator's still called
  the older, work-package-only `getCheckpointReportsByWorkPackage`, which returns nothing when
  reached via the project-wide PM Dashboard drill-down with no `workPackageId` in the URL). Applied
  Platform's already-fixed version to Simulator to restore parity, then added the toggle on top.
- **Work Packages** — the biggest gap: `PMDeliveryWorkPackages.jsx` mounted `WorkPackageView.jsx`,
  which is the **single-work-package detail page** and requires a `:wpId` route param — but
  `/pm/delivery/work-packages` never has one. The page rendered "Work Package Not Found" 100% of
  the time; there was no work-packages *list* anywhere in the app to begin with. Built a new
  `WorkPackagesListView.jsx` (search, status filter, `ExportListMenu`, `useViewMode` +
  `ViewToggle`, row numbers, card/table views linking to the existing, untouched `WorkPackageView`
  detail route) and pointed `PMDeliveryWorkPackages.jsx` at it instead. `WorkPackageView.jsx`
  itself was left completely alone — it's still the correct component for its own
  `/app/projects/:projectId/work-packages/:wpId` route.

**Scope note:** three of the six pages (Quality Register, Checkpoint Reports' Simulator copy,
Work Packages) turned out to need more than "just add a toggle" because the toggle had nothing
real to toggle between — each had a latent, pre-existing bug (missing import, stale service call,
or entirely wrong component) that meant the page showed no data at all before this pass. Fixed
each exactly as far as was needed to make the toggle meaningful; did not expand further into
unrelated functionality (e.g. Quality Register create/edit) per the plan's declared scope.

**Left for the user:** the manual verification step above, across all 6 pages in both apps — this
session could not drive a browser to confirm visually.

## Follow-up: new CLAUDE.md rule — default to table, not card
User asked to codify the toggle's default view in both repos' `CLAUDE.md` (rule 41 in
`E:\project-nidus\CLAUDE.md`; a new point 12 in `E:\project-nidus-admin\CLAUDE.md`, referencing
rule 41): **default to Table-List ≡, not Card ⊞, where applicable** — `useViewMode(pageId, 'list')`
instead of `'grid'` unless a page is genuinely card-first (visual/media-heavy). The user's
last-chosen view still overrides via `localStorage` on return visits.

Since this directly contradicted the 6 pages just shipped above (all defaulted to `'grid'`), user
confirmed updating them immediately rather than leaving them as the first exception to the new
rule. Flipped all 12 `useViewMode(...)` call sites (6 pages × 2 apps) from `'grid'` to `'list'`;
re-verified with an esbuild syntax pass (all 12 pass). No other logic changed — `viewMode ===
'list'` branches, card/table rendering, and row-number wiring are untouched, only the initial
default differs (and only for a first-time visitor with no saved `localStorage` preference yet).
