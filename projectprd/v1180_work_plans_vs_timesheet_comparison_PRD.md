# v1180 — Work Plans vs Timesheet Comparison

## a) Problem statement

Project teams today log *actual* hours in Timesheets (Standard + Overtime grids), but there is
no structured way to capture what someone *planned* to work on for a given week or month ahead
of time. Teams that currently do this informally use spreadsheets (see the attached sample:
"PLANNED WORK ITEMS — GENERAL PROJECT ACTIVITIES", with SN / Ref / Details / Status / % Target
Completion / Start–End Date / Resource / Role / Remark columns), which live outside the system,
aren't tied to the project record, and can't be reconciled against what was actually logged.

This matters most for **Time & Material (T&M)** engagements, where billed hours are the planned
hours' real-world outcome — a PM/PMO needs to see, per person per week, "what did you say you'd
work on" against "what did you actually log," both in hours (is the team over/under their planned
effort) and in coverage (did planned work actually happen; did unplanned work creep in). The
platform has no concept of a project's billing model at all today, and no Work Plan feature of
any kind exists.

## b) Solution

A new **Work Plan** feature, self-service per project member (mirroring how Timesheets already
work): each person captures their own weekly or monthly plan — a header record for the period
plus a list of planned work items (Details, Status, % Target Completion, Start/End Date, optional
Role, optional linked Task, optional Category, optional Estimated Hours, Remark). Plans go
through the same draft → submitted → approved/rejected lifecycle as Timesheets, with mandatory
justification on decisions, approvable by PMO Admin, Project Manager, Team Manager, or Lead.

Work Plan capture is available on **every** project. A new `billing_type` field is added to
`projects` (`time_and_material` / `fixed_price` / unset); when a project is flagged Time &
Material, a **comparison** feature activates automatically: hours variance (sum of planned
Estimated Hours vs sum of actual Timesheet hours for the period) plus item-level coverage flags
("planned but no hours logged", "hours logged with no matching plan item"), shown both inline (a
summary on the new Work Plan tab) and in a dedicated PMO/PM-facing Reports page across the whole
team and multiple periods.

A Work Plan item matches to Timesheet entries via a two-tier key: a linked Task (`task_id`) if
one exists, else a selected Category (`timesheet_work_categories`, the same list Timesheets
already use), else the item is counted toward the period total only and flagged as unmatched.

Period cadence (Weekly or Monthly) is a **project-level setting**, reusing the exact org-default +
project-override pattern already built for Timesheet Settings — not a per-plan choice.

## c) User stories

1. As a project team member, I can open a "Work Plan" tab on my Timesheets page (alongside
   Standard and Overtime), for the project I'm currently viewing.
2. As a project team member, I can select a month and a week (if the project's cadence is
   Weekly) or a month (if Monthly) using the same navigator pattern as the Timesheets grids.
3. As a project team member, I can add a planned work item to my current period's plan with:
   Details (required, free text), Status (required, from a fixed list), % Target Completion
   (optional, 0–100), Start Date / End Date (optional), Role (optional, defaults to my primary
   project role, changeable if I hold multiple roles on the project), linked Task (optional,
   searchable picker over this project's tasks), Category (optional, same list Timesheets use),
   Estimated Hours (optional), Remark (optional free text).
4. As a project team member, I can add, edit, and remove items freely while my plan is in Draft
   or Rejected status.
5. As a project team member, once I submit my plan for approval, I can no longer edit it unless
   it is rejected back to me.
6. As a project team member, I cannot submit a plan with zero items.
7. As a project team member, when I start a new period's plan, I'm offered a one-click,
   opt-in "carry forward" list of incomplete items (Status not Completed) from my immediately
   preceding plan, so I don't retype recurring/ongoing items every period.
8. As a project team member, I can only create or edit plans for the current period or the two
   preceding periods (current month + 2 prior, same window as Timesheets); older periods are
   locked/read-only.
9. As a Project Manager, PMO Admin, Team Manager, or Lead on a project, I can see a consolidated
   "Team Work Plan" view across everyone's plans for a given period (mirroring the existing Team
   Timesheets page), and approve or reject each submitted plan with a mandatory justification
   comment, matching the existing Timesheet approval UX.
10. As a Project Manager/PMO Admin, I can mark a project's billing type as Time & Material,
    Fixed Price, or leave it unset, from Project Setup.
11. As a project team member on a Time & Material project, I see an inline summary on the Work
    Plan tab for my current period: total Planned hours (sum of item Estimated Hours), total
    Actual hours (sum of my Timesheet hours that period), and the variance (amount and %).
12. As a project team member on a Time & Material project, I see which of my plan items are
    flagged "no hours logged yet" (planned, zero matching actual hours) for the current period.
13. As a Project Manager/PMO Admin on a Time & Material project, I can open a dedicated
    "Work Plan vs Timesheet Variance" report (alongside the existing EVM/Schedule Variance
    reports) showing hours variance and coverage flags across the whole team, filterable by
    period.
14. As a project team member on a project that is not flagged Time & Material, I can still use
    Work Plan capture normally; I simply don't see the comparison/variance UI.
15. As a developer verifying data integrity, every Work Plan item that matches a Timesheet entry
    via Task or Category does so through a deterministic, testable pure function (same pattern as
    `mergeMyPmProjectIds`/`computeHoursFromTimeRange` elsewhere in this codebase).
16. As a Simulator user, I have the same Work Plan tab, fields, lifecycle, and (when applicable)
    comparison feature as Platform, consistent with how Timesheets are already mirrored into the
    Simulator app today (same `public` schema tables, duplicated UI files — not `sim` schema).

## d) Implementation decisions

- **Billing type lives on `projects`**: new `billing_type` column (`time_and_material` /
  `fixed_price` / `NULL` = unset). Work Plan capture itself is NOT gated by this; only the
  comparison/variance feature is.
- **New dedicated tables**, not a `tasks` extension: `project_work_plans` (header: project_id,
  user_id, period_type snapshot, period_start_date, period_end_date, status, submitted_at,
  reviewed_by, reviewed_at, review_notes, audit fields) + `project_work_plan_items` (sn/sort
  order, details, status_code, target_completion_pct, planned_start_date, planned_end_date,
  role_code, task_id nullable FK, work_category nullable FK to `timesheet_work_categories`,
  estimated_hours nullable, remark, audit fields). Mirrors the Timesheet entry/review table
  shape and RLS pattern (including the `get_user_id_from_auth()` resolver, not raw `auth.uid()`
  comparisons — see the v1172 RLS bug class).
- **Period cadence**: `work_plan_period_type` setting (`weekly` / `monthly`) added to the same
  org-default + project-override tables/service as Timesheet Settings
  (`organisation_timesheet_settings` / `project_timesheet_settings` or sibling tables — exact
  shape decided in the implementation plan), defaulting to `weekly`.
- **Self-service ownership**: `project_work_plans.user_id` is the plan owner; RLS mirrors
  `timesheet_entries`' existing visibility pattern.
- **Approval authority**: broader than today's Timesheet approval — PMO Admin, Project Manager,
  Programme Manager, Team Manager, or Lead role on the project (extends the `user_roles` role-name
  check pattern fixed in `userCanManageProjectTimesheetSettings`, v1178, rather than reusing that
  function's narrower set as-is).
- **Status lookup**: fixed list — `Not Started`, `In Progress`, `Completed`, `Blocked`,
  `Carried Forward` — stored as a DB-driven lookup table (consistent with
  `timesheet_work_categories`/`timesheet_overtime_types`), not a hardcoded CHECK or free text.
- **Matching for comparison**: two-tier, `task_id` match preferred over `work_category` match;
  unmatched items still count toward the period's planned-hours total but are shown as
  "not linked to timesheets" rather than falsely matched.
- **Carry-forward**: opt-in, one-click per item, offered when starting a new period's plan;
  never automatic/silent.
- **Retroactive window**: identical to Timesheets — current month + 2 prior; older periods
  locked for editing (read-only).
- **Minimum to submit**: at least one item required, same validation pattern as Timesheets
  blocking an empty week's submission.
- **Navigation**: third tab on the existing My Timesheets page — `Standard | Overtime | Work Plan`
  — sharing the page's existing month/week navigator where cadence is Weekly; when a project's
  cadence is Monthly, the tab uses a month-only navigator instead.
- **Reporting**: inline summary on the Work Plan tab (own period only) + a new dedicated Reports
  page ("Work Plan vs Timesheet Variance") for PMO/PM/Team Manager/Lead, team-wide and
  multi-period, alongside the existing EVM/Schedule Variance report family.
- **Platform–Simulator parity**: mirrored exactly like the rest of the Timesheet feature family
  this session — same `public`-schema tables and service calls, UI files duplicated verbatim into
  `apps/simulator` (not a `sim`-schema rebuild), per the established precedent for
  `MyTimesheetsPage.jsx`/`WeeklyTimesheetGrid.jsx`/`OvertimeGrid.jsx`.
- **Role field**: optional per-item, defaults to the user's primary project role, overridable
  for users holding multiple roles on the project. No separate "Resource Name" field — the plan
  owner is implicit.

## e) Testing decisions

- Pure matching/merge functions (task/category matching, variance computation, carry-forward
  candidate selection) get unit tests with no DB mocking, same style as
  `computeHoursFromTimeRange`/`mergeMyPmProjectIds`.
- Service-layer functions (approve/reject, submit validation, retroactive-window enforcement)
  get mocked-Supabase unit tests, same style as `timesheetService.test.js`/
  `timesheetSettingsService.test.js`.
- No component-level (React Testing Library) tests — consistent with the rest of this
  component family, which relies on syntax-check (esbuild) + service-layer test coverage +
  manual verification, since no browser automation tool is available in this environment.
- "Done" for this feature: SQL migrations run clean; all new/changed unit tests green in both
  Platform and Simulator; esbuild syntax-check passes on every touched file in both apps; the
  full existing Timesheet test suite still passes (no regressions).

## f) Out-of-scope items

- Automatic (non-opt-in) carry-forward.
- Editing/approving Work Plans for periods outside the 3-month retroactive window.
- Changing the Timesheet approval authority itself (Work Plan's broader approver set is
  additive, scoped to Work Plan only, not a retroactive change to who approves Timesheets).
- A full Gantt/dependency view of planned items (this is a flat list per period, not a
  scheduling tool — `tasks` already covers that need for projects that want it).
- Retroactively back-filling `billing_type` for existing projects (defaults to unset; PMs opt in
  per project going forward).
- Any change to Fixed Price projects' existing reporting (EVM etc. stays as-is).

## g) Further notes

- The sample spreadsheet's informal Status values ("Ongoing", "Open", "WIP") map to the new
  fixed lookup as: Open/not started → `Not Started`; Ongoing/WIP → `In Progress`; a completed
  line → `Completed`; a blocked/waiting line → `Blocked`. `Carried Forward` is new, assigned
  automatically when an item is brought into a new period via the carry-forward feature.
- `task_id` on `project_work_plan_items` should be a real FK (unlike `timesheet_entries.task_id`,
  which today is a bare UUID column with no FK constraint — see Question/Research finding 3) —
  worth fixing as part of this work rather than repeating the same gap.
- Exact SQL table/column DDL, RPCs, RLS policies, menu wiring, and file-by-file implementation
  steps belong in the versioned implementation plan (`projectplan/v1180_*`), not this PRD.
