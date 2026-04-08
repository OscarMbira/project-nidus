# v336 — Fix `project_methodologies` permission / RLS

## Objective
Resolve **permission denied for table project_methodologies** on platform project detail.

## Todos
- [x] `SQL/v336_project_methodologies_grants_and_rls.sql` — GRANT + policy replacement
- [x] `Documentation/Project_Methodologies_RLS_v336.md`

## Review
- Aligns with **`get_user_id_from_auth`** / projects RLS from v104.
- SELECT visibility defers to **projects** RLS inside `EXISTS` (no `auth.uid()` vs `users.id` mix-up on `user_projects` for read path).
