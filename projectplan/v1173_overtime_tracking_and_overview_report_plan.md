# v1173 — Overtime Tracking, Configurable Work-Week Settings, Overview Report

See `projectprd/v1173_overtime_tracking_and_overview_report_PRD.md` for the full problem
statement, user stories, and decisions settled via interview. Platform file paths are listed;
every slice mirrors the same change to Simulator's equivalent path in the same step (rule 34.1).

## Todo

### Slice 1 — Schema
- [x] `SQL/v1173_timesheet_overtime_and_settings.sql`: `timesheet_entries.is_overtime` (public +
  sim), `organisation_timesheet_settings` + `project_timesheet_settings` (public only, RLS
  mirroring v1060's org-default/project-override pattern exactly, including the
  `get_user_id_from_auth()` fix from v1172), `database_tables` registry.
- [x] `SQL/v1173b_organisation_timesheet_settings_seed.sql`: defaults for every existing account
  (idempotent, never overwrites an existing row).
- [x] `SQL/v1173c_timesheet_settings_menu.sql`: PMO Configuration leaf
  (`pmo-admin-timesheet-settings`) + Project Setup leaf (`plat_pm_s_timesheet_settings`, grants
  copied from Project Details, mirroring v1061).
- [x] `SQL/v1173d_timesheet_overview_report_menu.sql`: new Reports taxonomy leaf
  (`plat_pm_rep_timesheet_overview`), granted to every role already granted the Reports group
  (mirrors v1055).

### Slice 2 — Service layer
- [x] New `timesheetSettingsService.js`: `resolveTimesheetSettings`/`mergeTimesheetSettings`
  (pure merge, same shape as `resolveRegionalFormatSettings`), CRUD for both tables,
  `buildProjectTimesheetSettingsPayload`, `userHasPmoOrOwner`/
  `userCanManageProjectTimesheetSettings` access checks.
- [x] `timesheetService.js`: `computeTimesheetExceptions()` takes an optional `settings` param
  (falls back to the original 8h/40h constants when omitted — no breaking change for any
  caller that doesn't pass it). `getMyTimesheets`/`getTeamTimesheets` needed **no** change —
  they already return every entry with no category filter, so overtime rows (`is_overtime`)
  were already included; the grids split them client-side instead of adding a new query param.

### Slice 3 — My Timesheets: 5-day regular grid + 7-day Overtime grid
- [x] `WeeklyTimesheetGrid.jsx` restructured into the week-navigation + settings-resolution
  "section": resolves `resolveTimesheetSettings`, computes the working week's actual start day
  from `working_days` (handles a non-Monday start like Sun–Thu correctly), renders only the
  configured 5 columns, excludes `is_overtime` rows from its own pivot. Renders the new
  `OvertimeGrid` below it, passing the same resolved settings and a 7-day date range computed
  from the same anchor.
- [x] New `OvertimeGrid.jsx`: single row, 7 day columns, hours + description per cell, amber
  soft-warning (icon + border tint) when a day or the week total exceeds the resolved max —
  never blocks save. Writes `is_overtime: true, task_id: null, work_category: null`.
- [x] "Submit Week" verified to cover both grids with zero code change — `draftEntryCount` and
  the submit call were widened to the full 7-day range so overtime on a non-working day is
  included too.

### Slice 4 — Team Timesheets: overtime visibility
- [x] "Overtime" badge (purple pill) on `TeamTimesheetsPage.jsx`'s Entries tab and
  `TeamWeeklyTimesheetGrid.jsx`'s consolidated grid, in place of the category cell. Same
  `TimesheetReviewPanel` click-to-approve flow — no new approval UI. Exceptions tab on both
  `MyTimesheetsPage.jsx` and `TeamTimesheetsPage.jsx` now resolve and pass settings instead of
  using the hardcoded constants.

### Slice 5 — Settings admin UI
- [x] `TimesheetSettings.jsx` (org, PMO Admin/Account Owner) and `ProjectTimesheetSettings.jsx`
  (project override, Project Manager) — two separate routed pages, matching the precedent
  Regional & Format Settings already established (not one combined page). Both use
  `useSuccessModal` (rule 16) and `useUnsavedChangesGuard` (rule 52).

### Slice 6 — Overview report (new, role-tiered)
- [x] `timesheetOverviewService.js`: `getTimesheetOverview(accountId, weekStart, weekEnd,
  projectIds)` — one function serves both tiers; `projectIds: null` queries every project in the
  account, a real array restricts it. Aggregates by project and by person in one pass over the
  same fetched entries/locations (no N+1 queries).
- [x] `TimesheetOverviewReport.jsx` — resolves `userHasPmoOrOwner` once to decide org-wide vs
  `getMyProjects`-scoped, same totals/by-project/by-person shape either way. Routed under
  Reports, new taxonomy leaf.

### Slice 7 — Simulator parity
- [x] Every file mirrored. `organisation_timesheet_settings`/`project_timesheet_settings` stay
  public-only (read via `platformDb` from Simulator). `timesheet_entries.is_overtime` has a
  `sim.` copy. New Simulator routes added under `simulator/pmo/*`,
  `simulator/project-setup/*`, and a new `simulator/reports/*` namespace (didn't exist before
  this change).

### Slice 8 — Tests
- [x] `timesheetSettingsService.test.js` (merge logic + DB-backed resolve, org-only vs
  org+override), `timesheetOverviewService.test.js` (org-wide vs project-scoped query shape,
  aggregation math, empty-projects short-circuit), 4 new `computeTimesheetExceptions` cases in
  `timesheetService.test.js` (fallback constants, configurable daily/weekly thresholds). 34
  tests total across the whole `timesheet*` suite, both apps, all passing — confirmed no
  regression from the v1169/v1170 tests either.

### Slice 9 — Review
- [x] See Review section below.

## Review

**What changed:**
- Schema: `timesheet_entries.is_overtime` column (public + sim), 2 new settings tables (public
  only, org default + project override), seed data, 3 menu-wiring SQL files.
- Services: `timesheetSettingsService.js`, `timesheetOverviewService.js` (both new),
  `timesheetService.js` (`computeTimesheetExceptions` now settings-aware, backward compatible).
- UI: `OvertimeGrid.jsx` (new), `WeeklyTimesheetGrid.jsx` (restructured to own week nav +
  settings + render both grids), `TeamWeeklyTimesheetGrid.jsx` / `TeamTimesheetsPage.jsx`
  (Overtime badge + settings-aware exceptions), `TimesheetSettings.jsx` +
  `ProjectTimesheetSettings.jsx` (new admin pages), `TimesheetOverviewReport.jsx` (new report).
- Routing/menu: 3 new routes in both apps (`pmo-admin/timesheet-settings`,
  `project-setup/timesheet-settings`, `reports/timesheet-overview`), new Simulator
  `simulator/reports/*` namespace.
- Every file mirrored to Simulator; all touched files syntax-checked with esbuild; 34 tests pass
  in both apps with zero regressions.

**To deploy — run in order:**
1. `SQL/v1173_timesheet_overtime_and_settings.sql`
2. `SQL/v1173b_organisation_timesheet_settings_seed.sql`
3. `SQL/v1173c_timesheet_settings_menu.sql`
4. `SQL/v1173d_timesheet_overview_report_menu.sql`

**Remaining risk / not done:**
- Manual in-browser verification has not been run — recommend the full flow described in the
  PRD's Testing decisions (configure a Sun–Thu week + thresholds, log overtime with a
  soft-warning, submit, approve/reject from the consolidated grid, check the Overview report at
  both tiers).
- `computeUtilisation()`'s `STANDARD_WEEKLY_HOURS = 40` constant was deliberately left untouched
  — the PRD only asked to make overtime/working-week detection configurable, not utilisation
  accounting, and touching it wasn't requested.
- The Overview report's "by person" table shows a flat aggregate across whatever projects are in
  scope — it does not break a person's numbers down per-project-they're-on; that's a reasonable
  follow-up if PMO Admin needs that level of drill-down later, not attempted here to keep the
  report proportionate to what was asked.
