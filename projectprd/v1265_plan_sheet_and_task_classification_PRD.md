# v1265 — Plan sheet (desktop-style plan view) and task classification fields — PRD

**Status:** decisions agreed with the owner 2026-10-12 (interview Q1–Q15); awaiting plan approval.
**Apps:** Platform, Simulator and Planner, via the shared planning package `packages/planning` (rule 34.1 parity is automatic for UI; SQL is needed in both `public` and `sim`).
**Builds on:** v1239 schedule screens (Tasks, Gantt, Baselines, Variance, Import / export) and the v1264-session task-form changes (planned / actual / baseline dates).

## a) Problem statement

Many Project Nidus users have planned in a desktop scheduling tool for years. Their working view is a table of indented tasks with outline numbers, summary rows that roll up, desktop-style columns and Gantt bars beside the rows. The Nidus schedule doesn't offer that today:

- **The Tasks tab is a flat list:** no hierarchy, no outline numbers, no summary rows, and sorted by start date.
- **The Gantt tab is a separate chart** with no task table beside it.
- **Import drops the outline.** A 350-row migrated plan arrives as one flat list. Its baseline is also lost, so progress against the plan can't be shown.
- **The progress columns these users track can't be shown:** Planned % complete vs Actual % complete, and % Deviation.
- **The task form can't record classification data PMs need:**
  - an external reference
  - the project stage / phase
  - an accountable owner, as distinct from the person doing the work
  - status and deadline
  - tags
  - links to the risks and issues that affect the task

## b) Solution

1. **Plan sheet.** The Gantt tab becomes a split view: a task table on the left and Gantt bars on the right, with rows lined up.
   - The table has an outline: indent, outline numbers (1.1.2.1), summary rows that roll up, and an optional project summary row.
   - It shows the desktop-style columns, Planned % / Actual % / % Deviation, and a column chooser.
   - Users can edit directly in the table, with keyboard shortcuts.
2. **Import that keeps the plan.** XML import keeps the outline, order, WBS codes, durations, modes, links, progress, actual dates and the baseline.
3. **Task classification fields:**
   - External reference, Stage / phase, Owner, Status, Due date and Tags, on the task form and as Plan sheet columns.
   - Many-to-many links between tasks and risks / issues, on the task's Links tab.

The name "Plan sheet" avoids naming another vendor's product (CLAUDE.md rules 26–27).

## c) User stories

**Outline and numbering**
1. As a PM, I see tasks in plan order with child tasks indented under their parents.
2. As a PM, each task shows an outline number (1, 1.1, 1.1.2, 1.1.2.1) worked out from its position. Numbers update automatically when tasks are moved, indented, outdented, inserted or deleted.
3. As a PM, I can show or hide outline numbers with a "Show outline number" toggle. My choice is remembered.
4. As a PM, I can enter an optional **WBS code** per task (e.g. a client's own code). It's separate from the outline number, doesn't renumber, and has its own column.
5. As a PM, I can expand and collapse a summary task to hide or show its sub-tasks, or expand / collapse all.
6. As a PM, I can show or hide a **project summary row** (row 0) that rolls up the whole project.

**Summary tasks**
7. As a PM, any task with sub-tasks is a summary automatically, shown in bold with a summary bar.
8. As a PM, a summary's Start is its earliest sub-task start and its Finish the latest sub-task finish. Its Duration is the working days between them, and none of these can be typed.
9. As a PM, a summary's % complete is the duration-weighted average of its sub-tasks (90-day task at 100% + 10-day task at 0% = 90%).
10. As a PM, a link on a summary task applies to the whole group.

**Columns**
11. As a PM, the default columns are:
    - ID (row number)
    - Indicators: ✓ done, 📝 notes, ⚠ late / blocked / past due date, linked risks
    - Mode: manual / automatic icon
    - Task name, with outline number and indent
    - Duration: "5 days", with "?" for estimates
    - Start, Finish
    - Predecessors and Successors, in "10SS+2d" notation
    - Resource names
    - Planned % complete, Actual % complete, % Deviation
12. As a PM, a column chooser lets me add, remove and reorder columns. My layout is remembered per user. Extra columns available:
    - WBS code, task ID code (TSK-…)
    - Baseline start / finish, Actual start / finish
    - Float, Critical, Priority
    - the v1265 classification fields
13. As a PM, dates use my organisation's regional format (rule 68), e.g. "Mon 08 08 22".

**Progress against baseline**
14. As a PM, **Planned % complete** is worked out from the **active** baseline (story 37): working days of the baseline that have passed by the status date ÷ baseline duration.
    - 0% before the baseline start, 100% after the baseline finish.
    - Summaries roll up weighted by duration.
    - A task with no baseline shows "—".
15. As a PM, **Actual % complete** is the task's % done.
16. As a PM, **% Deviation** = Actual % − Planned %, shown red when behind and green when ahead (theme-aware).
17. As a PM, the status date defaults to today. I can set a project **status date** (e.g. the reporting cut-off), and it's shown above the sheet.
18. As a PM, making a new baseline active (re-baselining) resets Planned % and % Deviation against it. Earlier baselines stay available (stories 36–42).

**Multiple baselines** (Q13–Q14)
36. As a PM, every saved baseline is kept and numbered in order: **B0** (original), B1, B2 …, with no fixed limit. Each has a name, date and who saved it.
37. As a PM, exactly one baseline is **active**. It drives Planned %, % Deviation, the Variance tab, the baseline bars and the baseline dates on the task form. New projects make B0 active.
38. As a PM, every re-baseline from B1 onwards needs a **reason**, and may reference a change request (e.g. CR-0012). B0 needs no reason.
39. As a PM, I can mark a baseline **approved**. Approving requires a justification note (rule 53) and records the approver and date. An unapproved baseline is saved, but can't be made active until it's approved, so reported progress always uses an approved plan.
40. As a PM, the Baselines tab lists every baseline with its number, name, date, reason, change request, approval and an Active badge. I can make an approved baseline active, with a confirmation.
41. As a PM, the column chooser offers **Baseline N start / finish / duration** for any saved baseline, plus **Slip since original** (active baseline finish − B0 finish, in working days).
42. As a PM, the Gantt shows the active baseline's bars, and optionally a second baseline chosen for comparison.

**Gantt bars**
19. As a PM, bars sit beside the rows:
    - task bars show % complete inside
    - summary bars, and diamonds for milestones
    - critical tasks in red, link arrows between tasks
    - optional baseline bars
    - zoom: days / weeks / months
20. As a PM, I can drag the divider between the table and the bars, or hide the bars to see the table only.

**Editing in the sheet (Phase B)**
21. As a PM, I can click a cell to edit:
    - Task name
    - Duration ("5d", "2w", "3d?")
    - Start, Finish
    - Predecessors ("12SS+2d, 10")
    - % complete
    - Resource names
    - WBS code
22. As a PM, Enter saves the cell, the schedule recalculates, and any error shows on that cell without losing what I typed. A save conflict (Slice 3.4) shows the reload prompt.
23. As a PM, each row has actions: Insert task above, Insert sub-task, Indent, Outdent, Move up, Move down, Open task, Delete. Delete asks for confirmation.
24. As a keyboard user, these work:
    - arrows / Enter / Tab / Esc to move and edit
    - Alt+Shift+→ / ← to indent / outdent
    - Insert to add a task
    - Delete to remove one (with confirmation)
25. As a PM, the full task form stays one click away (Open task) for everything else.

**Import / export**
26. As a PM, importing a desktop-scheduler XML file into a new or empty plan brings across:
    - outline, order and WBS codes
    - durations, including "?" estimates
    - manual / automatic mode
    - links with lags
    - % complete and actual dates
    - the saved baselines: Baseline and Baseline1–10 become B0, B1, … The last one in the file becomes active and is marked approved ("imported").
27. As a PM, resource names in the file are matched to project team members by name. Names that don't match are listed for me to resolve, not silently dropped.
28. As a PM, the Plan sheet has the shared **View** and **Export ▾** buttons (Q15):
    - **View** opens a print-style preview of the sheet as shown: my columns, outline numbers, indent and collapsed branches, with the status date and active baseline in the header.
    - **Export** offers Excel, CSV, XML, JSON, Word, PowerPoint, Print and PDF (rule 38):
      - Excel keeps indent, outline numbers and bold summaries
      - XML uses the desktop-scheduler format, so it re-imports
      - CSV / JSON are flat, with outline number and parent
      - Word / PowerPoint let me choose up to 10 columns (default 5)
      - Print / PDF offer **Include Gantt bars** (landscape, fitted to page width, header rows repeated) and **Only expanded rows**
28a. As a PM, the task page has the same **View** and **Export ▾** buttons (`ExportRecordMenu`: Excel, Word, PowerPoint, CSV, XML, JSON, Print, PDF) for a single task, including its links, linked risks / issues and baseline dates.

**Task classification fields (last slice)**
29. As a PM, a task has:
    - **External reference**: optional, up to 100 characters, searchable
    - **Owner**: a project team member, defaulting to the person assigned
    - **Status**: from the task statuses list. Choosing Blocked asks for a reason.
    - **Due date**: a deadline. ⚠ and a warning appear when the planned finish passes it.
    - **Tags**: free tags, with suggestions from the project's existing tags
30. As a PM, a task's **Stage / phase** comes from the project's own phases list (Platform `project_phases`, Simulator `practice_project_stages`).
    - Sub-tasks inherit their summary's phase unless changed.
    - If the project has no phases yet, the field says so and links to where phases are set up.
31. As a PM, these fields sit in a **Classification** group on the task form and are optional Plan sheet columns.
32. As a PM, the task's **Links** tab lists linked **Risks & issues**, with **Link existing**, **Unlink**, **Raise new risk** and **Raise new issue**. Raise opens the register's create page with the task already linked.
33. As a PM, one task can link to many risks / issues and one risk / issue to many tasks. Existing single links (`risks.task_id`, `issues.linked_task_ids`) are shown too.
34. As a PM, the Plan sheet shows a ⚠ indicator for tasks with open linked risks, and an optional "Open risks" count column.

**Phones** (rules 29 / 39)
35. As a phone user, the Plan sheet shows ID, Task name (indented), Duration and % complete, with the bars hidden by default. Tapping a row opens the task.

## d) Implementation decisions

| # | Decision |
|---|---|
| D1 | Task order is stored as a position among a task's siblings, per parent (new `outline_position`). Outline numbers are calculated, never stored. The optional user WBS code is a separate column (`wbs_code`). (Q1) |
| D2 | The Plan sheet replaces the Gantt tab's content (tab label stays "Gantt"). No new tab or sidebar item. The Tasks tab stays a simple list. (Q2) |
| D3 | Summary tasks are automatic and roll up dates, duration and % complete. They can't be typed. Optional project summary row. (Q3) |
| D4 | Summary % complete is weighted by duration. (Q4) |
| D5 | Default columns follow story 11. A column chooser is remembered per user. (Q5) |
| D6 | Planned % = active-baseline working days passed by the status date ÷ baseline duration, using the project calendar. Deviation = Actual − Planned. The status date defaults to today, and a per-project status date can be set. (Q6, Q13) |
| D7 | Import is for new or empty plans and brings the full plan, including the baseline. Unmatched resources are listed. Re-importing into an existing plan is out of scope. (Q7) |
| D8 | In-sheet editing covers the fields in story 21 plus row actions and keyboard shortcuts. Each change saves and recalculates (Phase B). (Q8) |
| D9 | The classification fields are in this PRD as the last slice, and appear on the form and as columns. (Q9) |
| D10 | Stage / phase comes from the project's phases list. Children inherit. Import doesn't auto-map. (Q10) |
| D11 | Risks and issues link many-to-many through new link tables. The old single links are still shown. The registers stay the only place risks and issues are edited. (Q11) |
| D12 | Field details follow story 29. Status uses the existing `task_statuses` lookup, which `sim.tasks.status_id` already references. Blocked uses the existing `is_blocked` / `blocked_reason`. Due date uses the existing `due_date`. Tags use the existing `tags`. (Q12) |
| D13 | New columns are added to both `public.tasks` and `sim.tasks`. New link tables are in both schemas:<br>• Platform: `task_risk_links` → `risks`, `task_issue_links` → `issues`<br>• Simulator: the same names in `sim`, pointing to `sim.practice_risks` / `sim.practice_issues`<br>All have RLS through the existing project-access functions (no RLS bypass, rule 42). Registered in `database_tables`, and v1251 (planner table wall) re-run. |
| D14 | The status date is stored per project. Column layout and toggles are stored per user, per page in `localStorage`, as a convenience only. |
| D16 | Multiple baselines (Q13): extend the existing `project_baselines` (it already keeps every snapshot). Add `baseline_number`, `reason`, `change_request_ref` and `is_active` (one active per project, enforced by a partial unique index), and use the existing `approved_by` / `approval_date`. Making a baseline active copies its dates into `tasks.baseline_*`, so Variance, bars and the form keep reading one place. Existing baselines are numbered by date; the latest becomes active and is treated as approved. Both schemas. |
| D17 | Re-baseline control (Q14): a reason is required from B1 onwards. Approval is optional to save but required to make a baseline active. Approval needs a justification note (rule 53). Approve / activate are done by users who can edit the project schedule. |
| D19 | Export (Q15): the task page reuses `ExportRecordMenu` as it is. The Plan sheet uses the list export, extended with a **View** preview and **PDF**; this is added to the shared `ExportListMenu` (opt-in props), so other lists can use it later. Outline-aware formatting and the Gantt-bars option live in a Plan sheet export adapter in `packages/planning`. `ExportListMenu` has no Admin copy in the monorepo; per rule 34.3, note in the commit if Admin should mirror it. |
| D18 | Baselines are always whole-project snapshots. Partial (selected-tasks) re-baselining is out of scope. |
| D15 | The sheet is a new shared component in `packages/planning`. It reuses `ScheduleGanttChart` bar maths where possible. Long plans (350+ rows) must stay responsive: collapsed branches aren't rendered, and rows are windowed if needed. |

## e) Testing decisions

**Pure unit tests** (`packages/planning`):
- outline numbering, including after move / indent / outdent / insert / delete
- summary roll-up (dates, duration, duration-weighted %)
- Planned % against calendar fixtures (before, during and after the baseline; no baseline)
- deviation
- duration / predecessor text parsing ("3d?", "2w", "12SS+2d, 10")
- XML import mapping (OutlineLevel → parent and position, baseline, mode, estimates)

**Screen tests:**
- the Plan sheet renders hierarchy, collapse, the outline toggle and the default columns
- cell edits save and recalculate
- a save conflict shows the reload prompt
- keyboard indent / outdent
- the column chooser is remembered
- task form Classification group and the Risks & issues links

**SQL tests:**
- new columns and link tables in both schemas
- RLS: members can read and write, others can't
- link uniqueness

**Done means:** all tests pass; Platform, Simulator and Planner builds pass; the drift check and Planner allow-list are clean; and the owner's sample plan (screenshot structure) imports and shows correctly.

## f) Out of scope

- Re-importing into an existing plan to update matching tasks.
- A ribbon toolbar, or copying another product's look closely.
- Resource levelling, multiple-project views and resource usage sheets.
- Native .mpp files (XML only).
- Field-level change history.
- Changes to how the Risk / Issue registers themselves work.
- Re-baselining selected tasks only; cost and work baselines; user-defined custom number fields (e.g. "Number9").

## g) Further notes

- The current import ignores `OutlineLevel`. Fixing it (story 26) is the main blocker for users migrating plans.
- The Simulator's risks, issues and stages are separate tables (`practice_*`). The link tables point there, and the UI uses the same shared screens.
- Planned % depends on a saved baseline. The sheet prompts "Save a baseline to see planned progress" when there isn't one.
