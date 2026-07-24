# v761 — PMO Form Template Org Default Content (Pre-population)

## Goal
After a PMO admin defines a template’s **field catalog** (v754) and optionally toggles **field availability** per organisation (v756), they need a third step: **pre-populate default field values for their organisation** so that when a PM creates a new form instance from that template, most fields are already filled with the PMO’s standard content.

Applies to **all 68 Process Group Form templates** (F001–F068), Platform + Simulator parity.

## Current state (confirmed)

| Capability | Exists? | Notes |
|------------|---------|-------|
| Define field catalog (sections/fields/types) | ✅ | `form_templates` + `form_template_versions.schema` — Form Template Builder |
| Per-org enable/disable fields | ✅ | `form_template_field_overrides` (v758) |
| Per-org **default field values** for form templates | ✅ | Implemented in v761 via `form_template_field_defaults` and builder default-content editor |
| PM instantiates template → org defaults | ✅ | `FormNew.jsx` pre-fills enabled fields from the project's organisation defaults |
| Separate Process Templates Hub masters (v629) | ✅ | **Different system** — 24 master records in process-template tables, “Copy to project”. Not wired to F001–F068 dynamic form engine |
| Pre-populate from another artifact (e.g. Mandate → Brief) | ✅ | Brief only; not generalised to form templates |

**Conclusion:** Pre-population for **Form Template Builder templates** is implemented by this plan.

## Design principles

1. **Catalog vs content stay separate** (same pattern as v756):
   - **Field catalog** → global `form_template_versions.schema` (all orgs).
   - **Field availability** → per-org override rows (enable/disable).
   - **Default content** → per-org default value rows (this plan).

2. **Defaults are per-organisation**, not global — each PMO can standardise “how we fill in F017 Activity List” without affecting other tenants.

3. **No default row = empty field** when a PM creates an instance (same default-on semantics as overrides, inverted: absence means “no pre-fill”).

4. **Only enabled fields** receive defaults at instantiation (respect v756 overrides).

5. **Defaults are not deletable field metadata** — they are content only; clearing a default removes the row or sets value to empty, never removes the field from the catalog.

## Data model

### New table — `public.form_template_field_defaults` (+ `sim.` counterpart)

```sql
CREATE TABLE public.form_template_field_defaults (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES public.form_templates(id) ON DELETE CASCADE,
    section_key TEXT NOT NULL,
    field_key TEXT NOT NULL,
    default_value JSONB NOT NULL DEFAULT 'null'::jsonb,
    updated_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organisation_id, template_id, section_key, field_key)
);
```

- `default_value` stores the same shape as `form_instance_values.field_value` (string, number, boolean, null, etc.).
- Index: `(organisation_id, template_id)`.
- Register in `database_tables`.
- **No row** → PM sees empty field on new instance.

### RLS (mirror v758)

| Operation | Who |
|-----------|-----|
| SELECT | Authenticated users with `user_has_access_to_account(organisation_id)` |
| INSERT/UPDATE/DELETE | PMO admin + account access (`is_user_pmo_admin` + `user_has_access_to_account`) |

## UI — third builder section

Extend `FormTemplateBuilder.jsx` (Platform + Simulator) with a third panel below **Field availability for your organisation**:

### **“Default content for your organisation”**

- Renders a **preview form** using `DynamicFormRenderer` / `FormFieldRenderer` for all **enabled** catalog fields only.
- Pre-filled from org default rows; PMO edits values inline.
- **Save defaults** → upsert/delete rows in `form_template_field_defaults` (empty value = delete row or store null — pick one convention in implementation; recommend **delete row** when cleared).
- Helper text: *“These values pre-fill new form instances for your organisation. Project managers can change them after creation.”*
- Dark theme default (rule 28), mobile-friendly (rule 29).

**Optional follow-up:** dedicated route `/pmo/forms/:templateCode/defaults` if the inline section feels cramped for large templates (e.g. F005 PMP).

## Service API (`formEngineService.js`)

- `getFieldDefaultsForOrg(organisationId, templateId, mode)` → array or map `{ section_key, field_key, default_value }`
- `setFieldDefaultForOrg({ organisationId, templateId, sectionKey, fieldKey, defaultValue, updatedByUserId }, mode)` → upsert
- `clearFieldDefaultForOrg(...)` → delete row
- `buildDefaultValuesMap(defaultRows, enabledFieldKeys)` → `{ [field_key]: value }` for renderer

Shared util: `@nidus/shared/utils/formTemplateFieldDefaults.js` (merge defaults + filter by overrides).

## Consumption — when PM creates a form

Update **`FormNew.jsx`** and/or **`createFormInstance` flow**:

1. Resolve project `account_id` (already done for overrides).
2. Load org overrides + org defaults for `template_id`.
3. Build filtered schema (existing).
4. Build initial `values` from defaults for enabled fields only.
5. On save, persist instance values as today.

Existing instances are **unchanged** — defaults apply only at **create** time (unless we add “Reset to org defaults” on edit later).

## Bulk pre-population (PMO efficiency)

For “most templates” and many fields, a single-form UI is not enough long term. Phase in:

| Phase | Feature |
|-------|---------|
| **MVP** | Per-template inline default editor in builder |
| **v761b** | **Export defaults** (JSON/CSV) for current org + template |
| **v761c** | **Import defaults** from JSON/CSV with validation against catalog field keys |
| **v761d** | **Org defaults dashboard** — list all 68 templates with “% fields pre-filled” indicator |

Import rules:

- Unknown field keys → reject with row-level errors (catalog is source of truth).
- Disabled fields → skip or warn.
- No sample/dummy data in SQL seeds (rule 12); PMO fills via UI or their own import file.

## Relationship to Process Templates Hub (v629)

- **Keep separate** for v761. Process Templates Hub uses different tables and copy-to-project flow.
- **Future link (optional):** when PM copies a process master into a project, could also seed a linked `form_instance` from org defaults — out of scope for v761 MVP.

## SQL files (planned)

| File | Purpose |
|------|---------|
| `SQL/v761_form_template_field_defaults.sql` | Tables (public + sim), RLS, grants, `database_tables` |
| `SQL/v761b_form_template_defaults_menu.sql` | Optional sidebar link “Template default content” under Process Group Forms |

No seed SQL for default **content** (PMO-authored only).

## Frontend / backend files (planned)

| Area | Files |
|------|-------|
| SQL | `v761_*` above |
| Shared | `packages/shared/src/utils/formTemplateFieldDefaults.js` + tests |
| Service | `apps/platform/src/services/formEngineService.js` (+ Simulator mirror) |
| Builder UI | `FormTemplateBuilder.jsx` (+ Simulator) — third section |
| Consumption | `FormNew.jsx`, optionally `createFormInstance` helper |
| Docs | `Documentation/PMO_Form_Template_Builder_Guide.md` |
| Menu | PMO sidebar entry if not only inline in builder |

## Todo list

- [x] 1. Confirm UI placement: third section in builder vs separate `/defaults` route (implemented as third section).
- [x] 2. `SQL/v761_form_template_field_defaults.sql` — table, RLS, registry (public + sim).
- [x] 3. Shared util + `formEngineService` get/set/clear defaults + merge helper.
- [x] 4. `FormTemplateBuilder` — “Default content for your organisation” preview form + save.
- [x] 5. `FormNew` — initialise `values` from org defaults (respect field overrides).
- [x] 6. Unit tests: merge logic, service validation, “disabled field skips default”.
- [x] 7. Documentation update + manual test checklist (Org A defaults on F017 → PM creates instance → fields pre-filled; Org B unchanged).
- [x] 8. **v761b** (follow-up): export/import defaults JSON/CSV for bulk PMO setup across templates. *(Recorded as follow-up, not MVP scope.)*
- [x] 9. **v761d** (follow-up): org-wide defaults coverage dashboard for all 68 templates. *(Recorded as follow-up, not MVP scope.)*

## Manual verification checklist (post-MVP)

1. Apply v761 SQL.
2. As Org A PMO: open F017 edit → set default for `required_skills` and `description`.
3. As Org A PM: create new F017 form in a project → fields show org defaults.
4. As Org B PM: same template → fields empty (no Org A defaults).
5. Disable a field for Org A → default not applied even if row exists.
6. PM edits pre-filled values and saves → instance stores PM values, not live-linked to defaults.

## Review

### Implemented
- Added `SQL/v761_form_template_field_defaults.sql` with `public.form_template_field_defaults` and `sim.form_template_field_defaults`, RLS, grants, indexes, and `database_tables` registration.
- Added shared helpers in `packages/shared/src/utils/formTemplateFieldDefaults.js` and local Platform/Simulator utility copies to satisfy the current Vite alias setup.
- Added `getFieldDefaultsForOrg()`, `setFieldDefaultForOrg()`, and `clearFieldDefaultForOrg()` to both Platform and Simulator `formEngineService.js`.
- Added the **Default content for your organisation** section to both Platform and Simulator `FormTemplateBuilder.jsx`.
- Updated both `FormNew.jsx` pages to load org defaults and pre-fill enabled fields only, after field-availability overrides are applied.
- Updated `Documentation/PMO_Form_Template_Builder_Guide.md` with the third builder section, service APIs, and v761 SQL deployment order.
- Updated `packages/shared/vitest.config.js` so the form-template utility tests are included.

### Verification
- `pnpm test` in `packages/shared`: **6 files / 23 tests passed**.
- Platform `formEngineService` focused tests: **9 tests passed**.
- Simulator `formEngineService` focused tests: **9 tests passed**.
- `ReadLints` on edited Platform/Simulator form files and services: **no diagnostics**.

### Build Notes
- `pnpm turbo build --filter=@nidus/platform-app` reached an unrelated existing build blocker: missing `RecordLifecycleFieldLock` import target from `ProjectsEdit.jsx`.
- `pnpm turbo build --filter=@nidus/simulator-app` reached an unrelated existing build blocker: bad relative import to `services/supabase/supabaseClient` from `SubscriptionAccessGate.jsx`.
- Neither build failure was introduced by v761; focused v761 tests and lints passed.

### SQL Apply Order
1. `SQL/v758_form_template_field_overrides.sql`
2. `SQL/v759_form_template_field_seeds_expanded.sql`
3. `SQL/v760_form_template_f017_required_skills.sql`
4. `SQL/v761_form_template_field_defaults.sql`
