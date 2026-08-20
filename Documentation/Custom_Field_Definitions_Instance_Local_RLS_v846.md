# Custom Field Definitions — Instance-Local RLS (v846)

## Symptom

On **Project → Field Templates** (also reached from Project Templates → **Manage form fields →**), a Project Manager sees:

`new row violates row-level security policy for table "custom_field_definitions"`

(HTTP 403 on `POST .../custom_field_definitions?select=*`), typically when creating an **instance-local** field via **Create a new field just for this project**.

## Cause

- **v784** added `scope_entity_type` / `scope_entity_id` so tier managers can add fields local to one Portfolio / Programme / Project.
- **v516** / **v520** RLS still required `is_pmo_admin_user()` for every INSERT/UPDATE/DELETE on `custom_field_definitions`.

So the UI offered the action, but PostgREST rejected the insert for non–PMO-admin PMs.

## Fix

`SQL/v846_custom_field_definitions_instance_local_rls.sql`:

| Scope | Who may write |
|-------|----------------|
| Account-wide LDE (`scope_entity_id` NULL) | PMO admin only (unchanged) |
| Instance-local (`scope_entity_*` set) | Users who pass `can_manage_pm_template_node` for that entity (includes project members via v840 `auth_user_can_access_project`) |

Simulator: same policies on `sim.custom_field_definitions`, plus the v784 scope columns/indexes if missing.

## Apply

Run in Supabase SQL editor (after v516, v520, v784, v840):

`SQL/v846_custom_field_definitions_instance_local_rls.sql`

## Related

- `Documentation/PM_Hierarchy_Creation_Time_Inheritance_Guide.md` (Part B — instance-local fields)
- `packages/shared/src/services/pmTemplateCreateInheritance.js` → `createInstanceLocalField`
- `packages/ui/src/TierFieldCustomisationPanel.jsx`
