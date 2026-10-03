# v1104 — Task owner + functional role Plan

## Status

Implemented.

## Todos

- [x] SQL `v1104_tasks_functional_role_id.sql`: add `functional_role_id` to `public.tasks` (+ index); optional sim.practice_tasks mirror
- [x] Platform `TasksCreate.jsx`: hide Project; Task owner; Role select; skills read-only; save FK
- [x] Platform `TasksDetail.jsx`: same owner/role/skills; Project read-only; edit grid when editing
- [x] Simulator Create + Detail parity
- [x] Unit test: `parseSkillsLines` for role skills display
- [x] `Documentation/Task_Owner_Functional_Role_v1104_Guide.md`
- [x] Review section

## Review

- Create Task no longer shows a Project field; uses current project from `usePlatformProjectId` / navigation state.
- Assign To relabelled **Task owner**; optional **Role** from `project_functional_roles`; **Skills** read-only from the role.
- Detail view shows owner/role/skills; Edit persists `functional_role_id` and uses success modal.
- Apply SQL before relying on the new column in the live DB.

## Apply

Run `SQL/v1104_tasks_functional_role_id.sql` on Supabase.
