# Form Instances RLS (v858)

## Problem
`public.form_instances` / `sim.form_instances` (and child value/history tables) had **RLS enabled** (v502/v503) but **no authenticated policies**. Project Managers hitting Bulk upload / Form New saw:

`POST .../form_instances?select=* 403 (Forbidden)`

## Fix (apply in order)

1. `SQL/v858_form_instances_project_member_rls.sql` — table policies for project members  
2. `SQL/v859_create_draft_form_instance_rpc.sql` — **required if 403 persists** — drops/recreates policies + `create_draft_form_instance` RPC

Policies grant SELECT/INSERT/UPDATE/DELETE to `authenticated` when:

- **Platform:** `public.auth_user_can_access_project(project_id)` (v841)
- **Simulator:** `sim.auth_user_can_access_practice_project(project_id)`

Child tables (`form_instance_values`, `form_instance_rows`, `form_version_history`, etc.) allow access when the parent instance’s project is accessible.

`form_templates` / `form_template_versions` are SELECT-open to authenticated users (catalog).

## Client
`createFormInstance` calls `create_draft_form_instance` (v859) first, then falls back to a direct insert. It also resolves `owner_id` from `public.users`.

## Verify
1. Apply **v858 then v859** in the Supabase SQL editor (reload schema / wait a few seconds).
2. Hard-refresh the app.
3. As a project member, Project Forms → Bulk upload → **Create N drafts**.
4. Confirm drafts appear (no 403 on `form_instances` or `rpc/create_draft_form_instance`).

## If still 403
Run in SQL editor (as the same user is harder — check membership instead):

```sql
SELECT public.auth_user_can_access_project('YOUR-PROJECT-UUID'::uuid);
-- Should be true for the PM. If false, fix project_memberships / user_projects / PM column.
```
