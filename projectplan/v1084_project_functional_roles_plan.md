# v1084 — Project Functional Roles (implementation plan)

## Todos

- [x] PRD + this plan + guide + taxonomy
- [x] SQL schema, migrate, menu, grants (+ sim)
- [x] Page + service + routes
- [x] Remove team Roles tab; member role from catalog; sync + tests

## Review

### Completed

- `SQL/v1084_project_functional_roles.sql` — `public.project_functional_roles` + `sim.practice_project_functional_roles`, migrate from team/practice-team roles, Platform + Simulator menu leaves. Sim RLS uses `pp.user_id` only (no `created_by`).
- Platform page `/platform/project-roles` + `listProjectFunctionalRoles` / `replaceProjectFunctionalRoles`.
- Team Create/Detail: Roles & skills tab removed; member Role * from project catalog; “Manage project roles” link.
- Simulator: `/simulator/practice-project-roles`, SimMyTeam / add/edit member modals use practice-project catalog.
- Unit test: `teamService.projectFunctionalRoles.test.js`.

### Remaining risks

- Re-run v1084 SQL fully after the `created_by` fix if a partial apply left objects mid-migration.
- Soft-deleted `team_functional_roles` / `practice_team_functional_roles` rows remain for safety (not dropped).
