# v1103 — Create Task schedule essentials Plan

## Status

Implemented.

## Todos

- [x] Platform `TasksCreate.jsx`: planned start, due/finish, milestone, % complete; validate dates; payload maps to existing columns
- [x] Simulator `TasksCreate.jsx` parity
- [x] Success modal + theme polish on create form
- [x] Light schedule helper tests
- [x] Review section

## Review

Create Task now includes a Schedule section: planned start, due/finish (also writes `planned_end_date`), estimated hours/duration, % complete, milestone checkbox. Finish-before-start is blocked. No SQL. Predecessors/constraints remain out of scope.

## Files (expected)

- `apps/platform/src/pages/TasksCreate.jsx`
- `apps/simulator/src/pages/TasksCreate.jsx`
- Possibly shared insert mapper if extracted

## Payload mapping

| UI | DB |
|----|-----|
| Planned start | `planned_start_date` |
| Due date | `due_date` + `planned_end_date` (same value when due set) |
| Milestone | `is_milestone` (+ `task_type` = `milestone` when checked) |
| % complete | `percentage_complete` |
| Estimated hours / Duration | existing |

## Apply

No SQL required.

## Approval gate

Do not implement until user confirms Approve on this plan.
