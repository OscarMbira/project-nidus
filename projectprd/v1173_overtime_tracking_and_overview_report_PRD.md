# v1173 — Overtime Tracking, Configurable Work-Week Settings, Overview Report

## a) Problem statement

v1170's weekly grid always shows a fixed Mon–Sun week with no distinction between standard and
overtime hours, and the existing overtime detection (`computeTimesheetExceptions()`) uses
hardcoded thresholds (8h/day, 40h/week) that can't be configured per organisation or project. The
user wants: (1) overtime captured on its own 7-day grid, separate from the standard working-week
grid; (2) the organisation/PMO/PM able to configure what "standard" and "overtime" actually mean
(standard daily hours, max overtime per day/week, and which 5 days count as the working week —
some regional calendars run Sun–Thu, not Mon–Fri); (3) a role-tiered overview report so PMO can
see overtime/hours patterns across the whole organisation, not just one project at a time.

## b) Solution

- **Configurable settings**, org default + optional project override — same pattern as Regional &
  Format Settings (v1060/v1062): `organisation_timesheet_settings` (standard_daily_hours,
  max_overtime_per_day, max_overtime_per_week, working_days — which 5 of 7 weekdays are standard)
  and `project_timesheet_settings` (same columns, all nullable = inherit from org default).
- **Overtime reuses `timesheet_entries`**, not a parallel table. A new `is_overtime boolean
  DEFAULT false` column distinguishes an overtime row (date + hours + description, no task/
  category) from a regular activity row. This means overtime automatically gets the exact same
  draft → submit → approve/reject workflow, mandatory-reasons justification, append-only
  `timesheet_entry_reviews` history, notifications, and field-lock that v1169 already built — zero
  new approval plumbing needed. `submitTimesheetEntriesForWeek()` already bulk-submits every draft
  entry in a date range regardless of `is_overtime`, so "Submit Week" covers both without any
  change to that function.
- **My Timesheets Grid view** gets two stacked grids sharing one week navigator: the existing
  weekly grid now shows only the configured **5 standard working days** (resolved org default,
  project override if set) instead of a hardcoded Mon–Sun; a new **Overtime grid** below it always
  shows all **7 days** (so overtime on a weekend or on the organisation's non-standard days can
  still be logged), one row, each day cell capturing hours + a short description. Logging overtime
  beyond the configured max-per-day/week shows a visual warning (soft — never blocks saving or
  submitting).
- **Team Timesheets** — overtime rows show up in the existing Entries tab and Weekly Grid tab
  (same approve/reject panel, same cell-click interaction) with a small "Overtime" badge so a
  reviewer can tell them apart from regular activity rows at a glance. No new approval surface.
- **New org-wide Timesheet Overview report** — a dedicated page, role-tiered: PMO Admin/Account
  Owner see every project in the organisation aggregated (total hours, overtime hours,
  onsite/offshore days, exceptions, per project and per person); Project Manager/Team Manager see
  the same shape pre-scoped to their own project(s). Not a tab on the existing per-project Team
  Timesheets page, since that page has no mechanism to span multiple projects at once.
- **Exceptions tab's overtime detection** switches from the hardcoded 8h/40h constants to the
  resolved settings (org default + project override), so it stays meaningful once the thresholds
  are configurable.

## c) User stories

1. As a PMO Admin, I can set the organisation's standard daily hours, max overtime per day, max
   overtime per week, and which 5 weekdays count as the standard work week (e.g. Mon–Fri or
   Sun–Thu).
2. As a Project Manager, I can override any of those settings for just my project, leaving
   anything I don't override inheriting the organisation default.
3. As a team member, My Timesheets' Grid view shows my configured 5-day working week for regular
   activities, and a separate 7-day Overtime grid below it where I enter overtime hours + a reason
   per day, including weekends.
4. As a team member, if I log more overtime than the configured daily or weekly maximum, I see a
   clear visual warning, but I can still save and submit it.
5. As a team member, clicking "Submit Week" submits both my regular and overtime draft entries for
   that week in one action.
6. As a Project Manager, I review and approve/reject overtime entries exactly the same way I
   review regular entries — same mandatory-reason panel — and can tell overtime rows apart by
   their badge.
7. As a PMO Admin, I can open one Overview report and see hours/overtime/onsite-offshore patterns
   across every project in the organisation, not just one at a time.
8. As a Project Manager or Team Manager, the same Overview report shows me the same shape of data,
   pre-scoped to my own project(s) only.
9. As a PMO Admin / Project Manager / Team Manager, Platform and Simulator behave identically for
   all of the above (rule 34.1 parity).

## d) Implementation decisions

- **Overtime capture model**: a separate 7-day grid, manual entry (not derived from regular
  entries) — interview Q1.
- **Overtime goes through the same approve/reject workflow** as regular entries — interview Q2.
- **Overtime cells capture hours + a short description** — interview Q3.
- **Working-week configuration is org default + optional project override**, mirroring Regional &
  Format Settings exactly — interview Q4.
- **Max overtime per day/week is a soft warning, never a hard cap** — interview Q5.
- **Overview report is a new, dedicated, role-tiered page** — not a tab on the existing per-project
  Team Timesheets page — interview Q6.
- **Overtime reuses `timesheet_entries`** via a new `is_overtime` boolean column rather than a
  parallel table — my own architectural call, not asked as a separate question, because it avoids
  duplicating the entire v1169 approval/history/notification stack for no real benefit. An
  overtime row has `task_id = NULL`, `work_category = NULL` (or a fixed sentinel if display needs
  one), `is_overtime = TRUE`; `hours_worked` and `description` carry the day's overtime hours and
  reason.
- **Settings editors**: PMO Admin/Account Owner at the organisation level, Project Manager at the
  project-override level — same convention as rule 68's Regional & Format Settings.
- **Platform–Simulator parity** (rule 34.1) — every file mirrored in the same change.

## e) Testing decisions

- Unit tests for the new settings-resolution service (org default + project override merge,
  same shape as `resolveRegionalFormatSettings`), and for the overview-report query functions
  (org-wide vs project-scoped).
- Manual verification: configure a Sun–Thu work week with standard_daily_hours=7 and
  max_overtime_per_day=3 for a test project; confirm the regular grid shows Sun–Thu only; log 4h
  overtime on a Saturday with a reason, confirm the soft-warning shows (exceeds the 3h max) but
  still saves; Submit Week; confirm the overtime row appears in Team Timesheets with an Overtime
  badge and can be approved/rejected with reasons; open the Overview report as PMO Admin and
  confirm it aggregates across more than one project, then open it as the Project Manager of just
  one of those projects and confirm it's scoped down.
- "Done" = all 9 user stories demonstrably true, Platform and Simulator.

## f) Out-of-scope items

- No change to how `timesheet_day_locations` (onsite/offshore) works — it already exists per v1170
  and is unaffected by this change.
- No per-user work-week override (org + project only, per interview Q4) — if a genuinely mixed
  team on one project needs different calendars per person, that's a separate future ask.
- No hard-cap enforcement on overtime — soft warning only, per interview Q5.
- The Overview report shows aggregated numbers and exceptions, not a full editable grid for other
  people's time — it's a read-only report, consistent with how Team Timesheets' Exceptions/
  Utilisation tabs already work.

## g) Further notes

- Because overtime rows live in the same `timesheet_entries` table, every existing consumer of
  that table (exports, `getMyTimesheets`, `getTeamTimesheets`, exception computation) needs to
  either explicitly filter `is_overtime` or explicitly include it — each call site touched in this
  change will be checked for that, rather than assuming the default behaviour is correct.
