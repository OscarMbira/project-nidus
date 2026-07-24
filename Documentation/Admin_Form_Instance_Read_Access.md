# Admin Form Instance Read Access (v779 / v776)

**Plan:** `projectplan/v776_admin_form_instance_read_access_plan.md`  
**Companion Admin wrappers:** `E:\project-nidus-admin\SQL\v177_admin_form_instance_read_wrapper.sql`  
**Feature consumer:** Admin Global Template Library → Export → Completed (Real submission)

## Purpose

Narrow **read-only** RPCs so Admin can list and export submitted Platform/Simulator form instance values. This is the read counterpart to the existing write exception (`sync_global_template_node`).

## Functions

| Schema | Function | Returns |
|--------|----------|---------|
| `public` / `sim` | `list_form_instances_for_template(p_template_code TEXT)` | Rows: `form_instance_id`, `project_id`, `project_name`, `status`, `owner_name`, `updated_at` |
| `public` / `sim` | `get_form_instance_export_data(p_form_instance_id UUID)` | JSONB `{ instance, values, rows }` |

### Filters

- Join key: `form_templates.template_code` (matches Admin `global_template_library.payload->>'template_code'`).
- Listed statuses: `in_review`, `approved` (form engine has no `completed` status).
- Ordered by `updated_at DESC`.

### Grants

- `EXECUTE` → `service_role` only.
- `REVOKE` from `PUBLIC`, `anon`, and `authenticated`.
- Permission checks live on Admin wrappers (`content.global_templates.export_completed`), not inside these functions.

## Apply order

1. Monorepo `SQL/v779_admin_form_instance_read_access.sql`
2. Monorepo `SQL/v779b_admin_form_instance_read_access_smoke.sql` (verification; optional but recommended)
3. Admin `SQL/v177_admin_form_instance_read_wrapper.sql`

## Smoke checklist (SQL editor)

After applying v779, run `v779b_…_smoke.sql`. It asserts:

1. All four functions exist.
2. Empty `template_code` raises.
3. Unknown `template_code` returns zero rows.
4. When submitted data exists: list only `in_review`/`approved`; export payload has `instance` / `values` (object) / `rows` (array).
5. Unknown instance id raises.

## Governance

Documented in monorepo `CLAUDE.md` as **Narrow read exception (v779 / Admin v177)**.

## Out of scope

No writes; no `form_comments` / attachments / approvals / audit; no RLS policy changes on underlying tables.
