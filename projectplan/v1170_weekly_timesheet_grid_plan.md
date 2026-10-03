# v1170 — Weekly Timesheet Grid (Entry + Team Consolidated View)

See `projectprd/v1170_weekly_timesheet_grid_PRD.md` for the full problem statement, user stories,
and decisions settled via interview. This plan breaks that PRD into vertical slices. Platform file
paths are listed; every slice mirrors the same change to Simulator's equivalent path in the same
step (rule 34.1), unless noted otherwise.

## Todo

### Slice 1 — Schema
- [x] `SQL/v1170_weekly_timesheet_grid.sql`: `timesheet_work_categories` (public only),
  `timesheet_entries.work_category` CHECK constraint dropped (guarded by a pre-check that no
  existing value falls outside the known 10), `timesheet_day_locations` (public + sim), RLS,
  `database_tables` registry.
- [x] `SQL/v1170b_timesheet_work_categories_seed.sql`: 14 rows (existing 10 + Governance, Data
  Migration, Defect Fixing, Travel/Leave/PH).
- [x] `SQL/v1170c_timesheet_work_categories_menu.sql`: sidebar menu + role grants, Platform
  (`pmo-admin-timesheet-work-categories`) and Simulator (`sim-pmo-timesheet-work-categories`),
  PMO-admin-only tier.

### Slice 2 — Service layer
- [x] New `timesheetWorkCategoryService.js`: CRUD, mirrors `timesheetReasonCatalogService.js`.
- [x] New `timesheetDayLocationService.js`: `getDayLocations`, `setDayLocation`,
  `getDayLocationsForProject` (team-wide, one query instead of one per member). Platform points
  at `platformDb`; Simulator's copy is a *separate* variant pointing at `simDb` (not a straight
  mirror, since this table is per-user business data, not shared reference data).
- [x] `timesheetService.js`: new `submitTimesheetEntriesForWeek(projectId, userId, weekStart,
  weekEnd)` — bulk-updates every `draft` entry in range to `submitted`.
  `approveTimesheetEntry`/`rejectTimesheetEntry` unchanged from v1169.

### Slice 3 — My Timesheets grid (entry UX)
- [x] New `WeeklyTimesheetGrid.jsx`: rows pivoted from existing `timesheet_entries` by
  task_id-or-description, Mon–Sun columns, inline-editable cells (save on blur, locked while
  `submitted`/`approved`), per-day Onsite/Offshore toggle, weekly summary row, "Add Row" (Task
  picker via `getTasksByProject` or free text + category), "Submit Week" button
  (`submitTimesheetEntriesForWeek`). `MyTimesheetsPage.jsx` got a third Card/Table/**Grid** view
  button — existing Card/Table/Log Time flow untouched.

### Slice 4 — Team Timesheets consolidated grid (interactive)
- [x] Extracted `TimesheetReviewPanel.jsx` (decision choice → reason multi-select → notes →
  Confirm, disabled until ≥1 reason) out of the Entries tab's inline markup so it's shared, not
  duplicated. New `TeamWeeklyTimesheetGrid.jsx`: every team member's week stacked (name header +
  mini grid + per-member Onsite/Offshore/hours/days summary), resolves member names via `users`,
  reuses the already-fetched `allRows`/`getDayLocationsForProject` (no per-member query). Clicking
  a submitted cell opens `TimesheetReviewPanel` in a modal, calling the same
  `handleConfirmDecision` the Entries tab uses — one decision path, not two. New "Weekly Grid" tab
  added to `TeamTimesheetsPage.jsx` alongside Entries/Exceptions/Utilisation.

### Slice 5 — Category admin page
- [x] New `TimesheetWorkCategories.jsx` — same CRUD/Audit-tab/row-action shape as
  `TimesheetReviewReasons.jsx`. Routed at `/platform/pmo-admin/timesheet-work-categories` and
  `/simulator/pmo/timesheet-work-categories`, linked from both PMO Configuration Home pages.

### Slice 6 — Simulator parity
- [x] Every file mirrored. `timesheet_work_categories` stays public-only (read via `platformDb`
  from Simulator, same precedent as `assignment_roles`/review reasons).
  `timesheet_day_locations` has its own `sim.` table + a Simulator-specific service variant using
  `simDb` (not a straight file copy, per the PRD's explicit exception for per-user business data).

### Slice 7 — Tests
- [x] `timesheetWorkCategoryService.test.js`, `timesheetDayLocationService.test.js` (Simulator's
  copy mocks `simDb`, not `platformDb`), `submitTimesheetEntriesForWeek` test added to the
  existing `timesheetService.test.js`. 21 tests total, both apps, all passing.

### Slice 8 — Review
- [x] See Review section below.

## Review

**What changed:**
- Schema: `timesheet_work_categories` (replaces the old hardcoded CHECK constraint on
  `timesheet_entries.work_category`), `timesheet_day_locations` (public + sim), 14-row category
  seed, sidebar menu entries. `timesheet_entries` itself otherwise untouched.
- Services: `timesheetWorkCategoryService.js`, `timesheetDayLocationService.js` (two variants —
  Platform/`platformDb`, Simulator/`simDb`), `timesheetService.js` gained
  `submitTimesheetEntriesForWeek`.
- UI: `WeeklyTimesheetGrid.jsx` (My Timesheets' new Grid view), `TeamWeeklyTimesheetGrid.jsx` +
  `TimesheetReviewPanel.jsx` (Team Timesheets' new interactive Weekly Grid tab),
  `TimesheetWorkCategories.jsx` (catalog admin page). `MyTimesheetsPage.jsx` and
  `TeamTimesheetsPage.jsx` updated to wire these in; nothing existing was removed.
- Routing/menu: new routes + lazy imports + sidebar entries in both apps.
- Every file mirrored to Simulator (with the one deliberate exception noted above); all touched
  files syntax-checked with esbuild; all 21 tests pass in both apps.

**To deploy — run in order:**
1. `SQL/v1170_weekly_timesheet_grid.sql`
2. `SQL/v1170b_timesheet_work_categories_seed.sql`
3. `SQL/v1170c_timesheet_work_categories_menu.sql`

**Remaining risk / not done:**
- Manual in-browser verification has not been run — recommend: enter a mixed week via the grid
  (Task-linked + free-text rows, multiple categories, onsite/offshore toggled), Submit Week,
  confirm all drafts move to submitted in one action; open Team Timesheets' Weekly Grid tab,
  approve one member's cell and reject another's with reasons, confirm totals and the Entries tab
  stay in sync; confirm Card/Table/Log Time are unaffected.
- `work_category` is no longer DB-constrained to the lookup table's values (deliberate — see PRD,
  "validated at the application layer, same pattern as `currency_code`") — a direct API call could
  still write an arbitrary string. Consistent with the existing `currency_code`/`role_in_assignment`
  precedent, not a new gap introduced by this change.
- No backfill of `timesheet_day_locations` for weeks logged before this ships — onsite/offshore
  totals for past weeks will show 0/0 until someone fills them in retroactively (not attempted,
  consistent with rule 12 — no synthetic data).
