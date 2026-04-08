# Project methodologies — permission denied fix (v336)

## Symptom
Project detail (`/platform/projects/:id`) fails with **permission denied for table project_methodologies** when the query embeds `project_methodologies` (e.g. with `methodologies`).

## Root causes
1. **`authenticated` may lack table privileges** on `public.project_methodologies` (v104 granted `projects` explicitly, not all related tables).
2. **Legacy RLS** (`v09_rls_policies.sql`) used `user_projects.user_id = auth.uid()`, but `user_projects.user_id` references **`public.users.id`**, not `auth.users.id`. Policies never matched as intended.

## Fix
Run in Supabase **SQL Editor**:

`SQL/v336_project_methodologies_grants_and_rls.sql`

This script:
- `GRANT SELECT, INSERT, UPDATE, DELETE` on `project_methodologies` to **`authenticated`** (and `ALL` to **`service_role`**).
- Replaces policies with:
  - **SELECT**: row allowed if the parent **`projects`** row is visible (inner check respects **projects RLS**).
  - **INSERT / UPDATE / DELETE**: same style as v104 project management (`get_user_id_from_auth`, account owner, `user_projects` owner/admin).
  - **System Admin**: `user_roles` joined through `users.auth_user_id = auth.uid()`.

## Prerequisite
`public.get_user_id_from_auth(UUID)` must exist (from **`SQL/v104_fix_projects_rls_recursion.sql`**). v336 raises a clear error if it is missing.

## No new tables
No `database_tables` registry change.
