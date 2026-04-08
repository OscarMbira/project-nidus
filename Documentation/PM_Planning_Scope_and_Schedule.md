# PM planning — scope and schedule (Platform + Simulator)

**Date:** 2026-03-31  
**Plan:** `projectplan/v342_PM_Planning_Process_Group_Implementation_Plan.md`

## Platform routes

All under `/platform/projects/:projectId/...`:

| Path | Page |
|------|------|
| `scope/management-plan` | Scope management plan |
| `scope/statement` | Scope statement |
| `scope/requirements` | Requirements register |
| `scope/requirements/new`, `scope/requirements/:reqId` | Requirement detail |
| `scope/traceability` | Traceability matrix |
| `scope/wbs` | WBS builder |
| `schedule/management-plan` | Schedule management plan |
| `schedule/activities` | Activity list |
| `schedule/activities/new`, `schedule/activities/:actId` | Activity detail (PERT fields) |
| `schedule/dependencies` | Activity sequencing |
| `schedule/gantt` | Gantt timeline |

## Simulator routes

Under `/simulator/practice-projects/:projectId/...` (same path suffixes as above). Owner of the practice project gets edit rights (`useSimPracticeOwner`).

## Menus

- Platform: `SQL/v381_scope_schedule_sidebar_menus.sql` — uses `__PROJECT__` in `route_path`; resolved in `Sidebar.jsx` / `MobileNavigation.jsx`.
- Simulator: `SQL/v383_sim_scope_schedule_sidebar_menus.sql` — uses `__PRACTICE__`.

## PMO oversight

- `/pmo/oversight/scope` — lists scope plans and scope statements across projects (RLS applies).
- `/pmo/oversight/schedules` — lists schedule management plans and activity counts (sample cap on activities query).

## Regeneration of sim pages

After editing Platform pages, refresh Simulator copies:

```bash
node scripts/gen-sim-planning-pages.mjs
```

Then re-apply manual fixes documented in the plan Review (imports and stakeholder loader for `RequirementDetail`).

## SQL apply order

`v355`–`v368`, `v381`, `v369`–`v370`, `v383` (ensure `roles` and optional `pmo_admin_section` exist for menu inserts).
