# v1103 — Create Task: schedule essentials

## a) Problem statement

The Create New Task form exposes fewer schedule fields than users expect when comparing to tools like MS Project. The `tasks` table already stores planned start/end, % complete, and milestone flags, but create only captures due date, estimated hours, and duration — so schedule data is under-used at first entry.

## b) Solution

Add a thin **schedule essentials** band on Create (and matching Edit if the same form is shared), without cloning MS Project. Keep advanced scheduling (predecessors, constraints, baselines, remaining work) out of Create.

## c) User stories

1. As a PM, I can set **planned start date** when creating a task.
2. As a PM, I can set **planned end / due date** (existing due date remains; planned end is filled from due when only one is set, or both when both entered — see decisions).
3. As a PM, I can mark a task as a **Milestone** on create.
4. As a PM, I can set optional **% complete** on create (default 0).
5. As a PM, I still see the existing estimate hours and duration fields.
6. As a PM, if end is before start, validation blocks save with a clear message.
7. Advanced fields (predecessors, constraints, actuals, baselines) remain unavailable on Create.

## d) Implementation decisions (locked)

| Decision | Choice |
|----------|--------|
| Scope | Create Task form (`TasksCreate.jsx`) Platform + Simulator parity |
| New create fields | `planned_start_date`, keep `due_date` (finish/due), `is_milestone` (checkbox), `percentage_complete` (optional, default 0) |
| Also set | `planned_end_date` = `due_date` when due is set (so planning views get a finish) |
| Out of create | Predecessors, constraint types, remaining/actual hours, baselines, Fixed Work/Units modes |
| Schema | No new columns — use existing `tasks` columns from v06 |
| UX | Same page; schedule fields in one row/section under assignee — no MS Project complexity |
| Success | Adopt `useSuccessModal` when touching save (rule 16) |

## e) Testing

- Unit/form: start ≤ end validation; milestone + % complete payload shape
- Manual: create with start+due; create milestone; create with %; confirm DB rows

## f) Out of scope

Gantt, dependency editor, constraint engine, auto-schedule from calendar, effort↔duration sync modes

## g) Further notes

Reference: user discussion 2026-09-20 comparing Create Task to MS Project.
