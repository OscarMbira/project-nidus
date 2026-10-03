# Project Functional Roles & Skills (v1084)

## Purpose

Project-scoped catalog of delivery/functional roles and their required skills,
managed under **Project Setup → Project Team → Project Roles & Skills**.

## Where

| Surface | Path |
|--------|------|
| Catalog list (Platform) | `/platform/project-roles` |
| Create Role & Skills | `/platform/project-roles/create` |
| Catalog page (Simulator) | `/simulator/practice-project-roles?practiceProjectId=…` |
| Menu | Project Team → Project Roles & Skills |
| Member role picker | Create/Edit Team → Members (required) |

## Notes

- Not the same as RBAC `project_roles` (access roles).
- Legacy `team_functional_roles` / `practice_team_functional_roles` may still exist
  in the DB after migration; the UI no longer edits them from Team Create/Edit.
- Team Create/Edit no longer has a Roles & skills tab — use the project catalog.
- Platform requires a current project in context (`usePlatformProjectId`).
