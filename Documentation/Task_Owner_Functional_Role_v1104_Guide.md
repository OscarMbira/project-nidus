# Task Owner & Functional Role (v1104)

## Summary

Create / Edit Task links work to an optional **delivery role** from Project Functional Roles (v1084). **Skills** are shown read-only from that role. **Task owner** is the existing assignee (`assigned_to_user_id`), renamed in the UI. **Project** is not editable on Create — the current project context is used.

## Schema

- `public.tasks.functional_role_id` → `project_functional_roles(id)` ON DELETE SET NULL
- Skills are **not** stored on the task

Apply: `SQL/v1104_tasks_functional_role_id.sql`

## UX

| Field | Behaviour |
|-------|-----------|
| Project | Hidden on Create when context resolves; read-only on Edit |
| Task owner | Optional person picker |
| Role | Optional select from active project functional roles |
| Skills | Read-only list from selected role’s `required_skills` |

## Out of scope (later)

Filtering owners by people who hold the selected role on a team.
