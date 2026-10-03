# v1170 — Weekly Timesheet Grid (Entry + Team Consolidated View)

## a) Problem statement

The user shared a spreadsheet-based weekly timesheet (external tool) showing a fundamentally
different entry shape than today's Project Nidus timesheets: one row per **activity** (e.g.
"Standup Meetings", "Mantis - 26514,26487,27555,27557", "Smart Loan Solution Modification"),
columns for each **day of the week**, a category per activity (Governance, Data Migration,
Defect fixing, Travel/Leave/PH — none of which exist in Project Nidus today), and a weekly
summary row per person (total hours, total days, **Onsite Days**, **Offshore Days**).

Project Nidus's current timesheet flow (`MyTimesheetsPage.jsx` / `TimesheetEntryForm.jsx`) is
one-entry-at-a-time: pick a date, enter hours, pick a category from a fixed 10-value list, save.
There is no weekly grid, no onsite/offshore tracking, and `work_category` is a hardcoded DB CHECK
constraint that doesn't cover the categories in the spreadsheet.

## b) Solution

Add a **weekly grid** as a new, additive entry/view mode — nothing existing is removed:

- **My Timesheets** gets a third view mode (Card / Table / **Grid**, same `useViewMode` pattern
  as the existing toggle). The grid shows one row per activity for the selected week, one column
  per day (Mon–Sun), each cell editable inline; a running weekly total column; and a **Submit
  Week** button that bulk-submits every draft entry in that week in one action.
- Each grid row's **Activity** is a hybrid field — pick an existing project Task
  (`timesheet_entries.task_id`, already in the schema but unused) or type free text. Both are
  supported because the spreadsheet mixes formal work items with informal ones (standups, ticket
  references, admin time).
- **`work_category`** stops being a hardcoded CHECK constraint and becomes a DB-backed,
  admin-manageable lookup table (new `timesheet_work_categories`), seeded with the existing 10
  categories plus the 4 new ones from the spreadsheet (Governance, Data Migration, Defect Fixing,
  Travel/Leave/PH) so no existing data breaks.
- **Onsite/Offshore** is captured once per day (not per activity, not per week as a manually-typed
  number) via a new lightweight `timesheet_day_locations` table (one row per project+user+date).
  The weekly Onsite Days / Offshore Days shown in the grid's summary row are auto-summed from it.
- **Team Timesheets** gets a new consolidated grid — the screenshot's actual layout (multiple
  team members' weekly grids stacked). It is **fully interactive**: a PM can click a submitted
  cell directly in the consolidated grid to open the same Approve/Reject + mandatory-reason +
  notes panel already shipped in v1169, without leaving the grid.
- Individual entries (`timesheet_entries` rows) remain the system of record — the grid is a
  pivoted view/editor over the same rows, not a new data model. A "row" in the grid is simply the
  set of entries sharing the same (project, user, task_id-or-description) within the visible week.

## c) User stories

1. As a team member, I can switch My Timesheets to Grid view and see the current week as rows
   (activities) × columns (days), with a weekly total.
2. As a team member, I can add a new activity row, either by picking an existing project Task or
   typing a free-text label, and enter hours directly into day cells.
3. As a team member, I can mark each day I worked as Onsite or Offshore, and see the week's
   Onsite Days / Offshore Days totals update automatically.
4. As a team member, I can click "Submit Week" once to submit every draft entry for that week,
   instead of submitting each cell individually.
5. As a PMO Admin, I can manage the list of work categories (add/rename/retire) from a dedicated
   admin page, the same way I already manage Timesheet Review Reasons.
6. As a Project Manager, I can open Team Timesheets' new Weekly Grid tab and see every team
   member's week in one consolidated view, matching the spreadsheet's layout.
7. As a Project Manager, I can click a submitted cell in the consolidated grid and
   approve/reject it right there, with the same mandatory-reason/notes requirement as the
   existing Entries tab.
8. As a team member or PM, I can still use the existing Card/Table views and the one-at-a-time
   Log Time form exactly as before — the grid is additive, not a replacement.
9. As a PMO Admin / Project Manager / Team Manager, Platform and Simulator behave identically for
   all of the above (rule 34.1 parity).

## d) Implementation decisions

- **Both personal entry grid and team consolidated view** (interview Q1) — not one or the other.
- **Activity is hybrid**: pick a Task (`task_id`) or free text (interview Q2). No new catalog of
  reusable activity names — each row's label is ad-hoc per week, matching the spreadsheet.
- **`work_category` becomes a DB-backed lookup table**, not an extended hardcoded list
  (interview Q3) — `timesheet_work_categories` (code/name/description/sort_order/is_active +
  audit fields + RLS), same shape as `timesheet_entry_approve_reasons`/`assignment_roles`. Seed:
  existing 10 + Governance, Data Migration, Defect Fixing, Travel/Leave/PH (14 total).
  `timesheet_entries.work_category` changes from a CHECK-constrained `text` column to a free
  `text` column validated against the lookup table at the application layer (same pattern already
  used for `currency_code`/`role_in_assignment` elsewhere — a lookup table without a literal FK
  constraint, since existing rows must stay valid through the migration).
- **Onsite/Offshore is a per-day flag**, not per-row or a manually-typed weekly number
  (interview Q4) — new `timesheet_day_locations` table: `(project_id, user_id, entry_date,
  work_location)` unique per day, `work_location` CHECK IN ('onsite','offshore'). Weekly totals
  are a `COUNT()` over this table for the visible week, not a stored/duplicated number.
- **Grid is additive**, not a replacement (interview Q5) — `useViewMode(pageId, 'list')` extended
  to a 3-way Card/Table/Grid toggle; existing Log Time form and flat list are untouched.
- **Bulk "Submit Week", per-entry Approve/Reject** (interview Q6) — a new
  `submitTimesheetEntriesForWeek(projectId, userId, weekStart)` service function bulk-updates every
  `draft` entry in that week to `submitted`. Approve/Reject stay exactly as v1169 shipped them
  (per-entry, mandatory reasons) — no change to that function signature or behaviour.
- **Team consolidated grid is interactive** (interview Q7) — clicking a submitted cell opens the
  same reason-selection review panel already built for `TeamTimesheetsPage.jsx`'s Entries tab,
  anchored to that cell (reused as a shared component, not rebuilt).
- **No new "grid row" table** — a grid row is a client-side pivot of existing `timesheet_entries`
  rows grouped by (project_id, user_id, task_id ?? description) within the visible week. Each cell
  write is a normal `createTimesheetEntry`/`updateTimesheetEntry` call on one entry.
- **`task_id`** references the existing `public.tasks`/`sim.tasks` table, scoped to the same
  project as the timesheet entry (task picker filtered by `project_id`).
- **Week boundary**: Monday–Sunday, consistent with the existing `mondayOf()` week-grouping logic
  already used by `computeTimesheetExceptions()`. Weekend columns are visually distinguished
  (shaded) but not specially restricted — a weekday public holiday is just logged as an entry
  under the Travel/Leave/PH category, exactly as in the spreadsheet.
- **Platform–Simulator parity** (rule 34.1) — every file mirrored to Simulator in the same change.
  `timesheet_work_categories` and `timesheet_day_locations` follow the same "public-only, shared
  reference/record data read via `platformDb` from Simulator too" precedent as
  `timesheet_entry_*_reasons` — **except** `timesheet_day_locations`, which is a per-user business
  record (not reference data) and therefore needs both a `public.` and `sim.` copy, mirroring
  `timesheet_entries` itself.

## e) Testing decisions

- Unit tests for new service functions: `submitTimesheetEntriesForWeek`, the
  `timesheet_work_categories` CRUD service, and the day-location get/set functions.
- Manual verification: enter a week via the grid (mixed Task-linked and free-text rows, mixed
  categories, onsite/offshore toggled per day), Submit Week, confirm all draft entries move to
  submitted in one action; open Team Timesheets' Weekly Grid tab, approve one cell and reject
  another with reasons, confirm both decisions and the week's Onsite/Offshore totals display
  correctly; confirm the existing Card/Table/Log Time flow is unaffected.
- "Done" = all 9 user stories above are demonstrably true in the running app, Platform and
  Simulator.

## f) Out-of-scope items

- No change to the v1169 approval-justification/history/notification mechanics themselves — the
  grid is a new way to create/submit/review the same `timesheet_entries` rows, not a new approval
  model.
- No multi-project grid (a single grid is scoped to one project, same as today's My
  Timesheets/Team Timesheets).
- No reusable/named activity catalog — activity labels are ad-hoc free text or a Task link, not a
  new lookup table of "activity names."
- No change to the weekly/period-level approval system (`timesheetPeriodService.js`) — still
  untouched, as decided in v1169.

## g) Further notes

- `work_category`'s migration from CHECK constraint to lookup-table-validated free text needs a
  companion data check: confirm no existing `timesheet_entries.work_category` value falls outside
  the 14-row seed before dropping the CHECK constraint (a `SELECT DISTINCT` guard in the migration
  script, not a silent drop).
