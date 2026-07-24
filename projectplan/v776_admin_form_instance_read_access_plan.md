# v776 — Read-only RPCs: Expose completed form_instance data to Admin

**Repo:** `E:\project-nidus` (Platform + Simulator monorepo)
**Companion plan (originating feature, cross-repo):** `E:\project-nidus-admin\projectplans\v174_form_template_export_plain_completed_plan.md`
**Status:** ✅ 100% Complete

## Background

Admin's Global Template Library (`content` module) wants to let admins export a **real, completed form submission** from an actual Platform or Simulator project (e.g. a filled-in "Project Charter") as PDF/Word/etc., for documentation/review purposes. See the companion plan for the full feature (Phase 2 there).

Today, Admin has **zero read access** into `public`/`sim` schema. The only existing cross-schema path is the opposite direction and write-only: `admin.publish_global_template` → `public.sync_global_template_node` / `sim.sync_global_template_node` (`SQL/v765_global_template_sync_rpc.sql`, `SQL/v778_sync_global_template_target.sql`). This plan adds the **read** counterpart, scoped as narrowly as the existing write exception.

## Where completed form data actually lives (confirmed by investigation)

Per `SQL/v502_form_engine_tables.sql` (Platform, `public`) and `SQL/v503_form_engine_sim.sql` (Simulator, `sim`, mirrored via `like public.X including all`):

- `form_templates(id, template_code UNIQUE, name, process_group, is_active, pm_template_node_id, ...)` — `pm_template_node_id` (added `SQL/v766_pm_template_document_links.sql`) links to the node Admin's sync created.
- `form_template_versions(id, template_id, version_number, schema JSONB, is_current)`.
- `form_instances(id, project_id, template_id, template_version_id, owner_id, status, created_at, updated_at)` — one row per filled-in form.
- `form_instance_values(id, form_instance_id, field_key TEXT, field_value JSONB, UNIQUE(form_instance_id, field_key))` — the actual per-field submitted values (confirmed via `formEngineService.js` upsert-on-conflict pattern).
- `form_instance_rows(id, form_instance_id, section_key, row_index, row_value JSONB)` — repeating-section rows.

`form_templates.template_code` is unique and matches Admin's `global_template_library.payload->>'template_code'` — this is the join key Admin will use to resolve which `form_templates` row (and therefore which `form_instances`) belong to a given Admin template, since the two `id` columns are in different databases-schemas with no shared identity.

## Scope

New SQL file: `SQL/v779_admin_form_instance_read_access.sql` — defines 4 new functions (2 per schema), all `SECURITY DEFINER`, all read-only, all scoped to exactly the columns needed for export (no unrelated project data exposed).

### Functions

```sql
-- public schema (Platform)
public.list_form_instances_for_template(p_template_code TEXT)
  RETURNS TABLE (
    form_instance_id UUID, project_id UUID, project_name TEXT,
    status TEXT, owner_name TEXT, updated_at TIMESTAMPTZ
  )

public.get_form_instance_export_data(p_form_instance_id UUID)
  RETURNS JSONB  -- { instance: {...}, values: { field_key: value }, rows: [...] }

-- sim schema (Simulator) — identical signatures, sim.* tables
sim.list_form_instances_for_template(p_template_code TEXT)
sim.get_form_instance_export_data(p_form_instance_id UUID)
```

- [x] `list_form_instances_for_template`: joins `form_templates` (by `template_code`) → `form_instances` → project name/owner lookup, filters submitted statuses (`in_review`, `approved` — form engine has no `completed` status), orders by `updated_at DESC`.
- [x] `get_form_instance_export_data`: pulls the `form_instances` row, all `form_instance_values` rows folded into a `{field_key: value}` jsonb object, and all `form_instance_rows` grouped by `section_key` into arrays — shaped to drop straight into Admin's `exportRecordTo*(sections, record, ...)` call as the `record` argument.
- [x] Both functions `SET search_path = public` (or `sim, public`) explicitly, per the existing `sync_global_template_node` precedent (`SQL/v765_global_template_sync_rpc.sql`) — no dynamic schema resolution, no SQL injection surface.
- [x] **No caller-side permission check inside these functions** — permission enforcement happens on the Admin side (`admin.check_admin_permission`) before the wrapper calls in. These functions are only reachable via the `admin.*` wrappers (Phase 2.1 of the companion plan), never exposed directly to PostgREST/anon/authenticated roles. Grant `EXECUTE` only to `service_role`; explicitly revoke from `anon` / `authenticated`.

### Explicitly out of scope
- No write path (existing `sync_global_template_node` write exception is untouched).
- No exposure of `form_comments`, `form_attachments`, `form_approvals`, `form_audit_log` — export is data-only, not a full audit trail.
- No changes to RLS policies on `form_instances`/`form_instance_values` (rule 42 — these SECURITY DEFINER functions run with elevated privilege deliberately and narrowly, the same way the existing write RPC does; RLS on the underlying tables stays intact for all other access paths).

## Governance

- [x] Once approved and implemented, update `CLAUDE.md` rule 34.5's "Narrow write exception (v765 / Admin v164)" note to also record this as a **narrow read exception (v779 / Admin v177)** — so the exception list stays accurate and this doesn't get rediscovered as an undocumented gap later.
- [x] `database_tables` registry: no new tables created by this plan (only functions), so no registry insert needed.

## Testing (rule 23/43)
- [x] SQL-level smoke: `SQL/v779b_admin_form_instance_read_access_smoke.sql` — function existence, empty/unknown code behaviour, status filter, export payload shape, missing-instance error (run in Supabase SQL editor after v779).
- [x] Unit contract tests: `apps/platform` + `apps/simulator` `__tests__/v779AdminFormInstanceReadAccess.test.js` (4 assertions each — passed).
- [x] Form-engine suite: re-run attempted; failures are pre-existing `window is not defined` (Supabase client storage in Node), not caused by v779 (no RLS/policy changes). Admin service-wrapper tests already cover the consumer path (v174).

## Review

### What shipped
| Artifact | Purpose |
|----------|---------|
| `SQL/v779_admin_form_instance_read_access.sql` | Four SECURITY DEFINER read RPCs (`public` + `sim`) |
| `SQL/v779b_admin_form_instance_read_access_smoke.sql` | SQL editor smoke harness |
| `Documentation/Admin_Form_Instance_Read_Access.md` | Operator / apply guide |
| `CLAUDE.md` | Narrow read exception (v779 / Admin v177) |
| Contract unit tests (Platform + Simulator) | Guard function names, grants, status filter, payload keys |

### Behaviour notes
- Status filter: `in_review` + `approved` (not `completed` — that value does not exist on form instances).
- Project/owner lookups join `public.projects` / `public.users` from both schemas.
- EXECUTE: `service_role` only; revoked from PUBLIC / anon / authenticated.

### Apply order
1. `SQL/v779_admin_form_instance_read_access.sql`
2. `SQL/v779b_admin_form_instance_read_access_smoke.sql` (verify)
3. Admin `SQL/v177_admin_form_instance_read_wrapper.sql`

### Companion
Admin Phase 2 UI/services already consume these RPCs via `admin.list_completed_form_instances` / `admin.get_completed_form_instance` (v174 / v177).
