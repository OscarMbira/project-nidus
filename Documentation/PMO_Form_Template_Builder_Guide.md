# PMO Form Template Builder Guide

## Overview

PMO Admins can author **Process Group Form** templates through a visual builder. Templates are stored in `form_templates` and `form_template_versions`. Per-organisation field visibility uses `form_template_field_overrides` (v758). Each catalog save creates a **new version** while preserving history.

Project Managers, Programme Managers, and Portfolio Managers instantiate published templates inside projects they can access via **Process Group Forms** (`/platform/projects/:projectId/forms` or PM dashboard equivalent).

## Access control

| Action | Who |
|--------|-----|
| Browse / preview active templates | All authenticated users |
| See draft (`is_active = false`) templates | PMO Admin only |
| Create / edit template catalog (shared fields) | PMO Admin only (UI + RLS) |
| Enable / disable fields for own organisation | PMO Admin with account access |
| Fill in form instances | Users with project access |

RLS is defined in `SQL/v754_form_template_admin_rls.sql` (extends `SQL/v753_form_engine_template_rls.sql`).

## Routes

### Platform

| Route | Purpose |
|-------|---------|
| `/pmo/forms` | Template gallery (read-only preview for all; edit entry for PMO Admin) |
| `/pmo/forms/new` | New template builder (PMO Admin) |
| `/pmo/forms/:templateCode/edit` | Edit existing template (PMO Admin) |
| `/platform/projects/:projectId/forms` | PM consumption — pick template and create instance |

### Simulator (parity)

| Route | Purpose |
|-------|---------|
| `/simulator/pmo/forms` | Template gallery |
| `/simulator/pmo/forms/new` | New template builder |
| `/simulator/pmo/forms/:templateCode/edit` | Edit template |
| `/simulator/pm/projects/:projectId/forms` | Practice consumption |

## Draft / hold behaviour (rule 37)

- **Draft** = `is_active = false` on `form_templates`.
- Draft templates are visible only to PMO Admins until published (Active toggle).
- No separate draft table — the builder is the hold/resume surface.

RLS: `SQL/v754_form_template_admin_rls.sql` (catalog) · `SQL/v758_form_template_field_overrides.sql` (per-org toggles).

## Builder sections (v756/v761 governance)

The edit builder has three areas:

1. **Field catalog** — add or edit fields in the shared template schema (visible to all organisations). Once a template has been saved at least once, **fields cannot be deleted** — only added or amended. Unsaved new templates may still remove fields before the first save.
2. **Field availability for your organisation** — toggle each catalog field on/off for the PMO admin's organisation only. Writes to `form_template_field_overrides`. No row means **enabled** (default-on). Other organisations are unaffected.
3. **Default content for your organisation** — enter field values that should pre-fill new form instances for the PMO admin's organisation only. Writes to `form_template_field_defaults`. Clearing a default removes the pre-fill row.

When project managers create a new form instance (`FormNew.jsx`), fields disabled for the project's organisation are filtered out before render, then enabled fields are pre-filled from the organisation defaults. Existing form instances are not changed when defaults are updated.

## Builder field types (first cut)

Supported in the builder and rendered by `DynamicFormRenderer` / `FormFieldRenderer`:

- `text`, `textarea`, `date`, `number`, `money`, `select` (with options)

Repeating-row `tables` sections are **not** in the builder yet (consumption still supports them).

The schema may store `required: true` on fields; renderer enforcement is a follow-up.

## Versioning on save

1. Upsert `form_templates` (code, name, process_group, is_active).
2. Insert new `form_template_versions` row with `version_number = max + 1`, `is_current = true`.
3. Set previous current version to `is_current = false`.

Success confirmation shows **template code** and **version number**.

## Service API

`apps/platform/src/services/formEngineService.js` (mirrored in Simulator):

- `suggestNextTemplateCode(mode)` — next `F0xx` code
- `upsertFormTemplate({ templateCode, name, processGroup, isActive }, mode)`
- `publishFormTemplateVersion(templateId, schema, mode)`
- `saveFormTemplate({ templateCode, name, processGroup, isActive, schema }, mode)` — combined save
- `getFieldOverridesForOrg(organisationId, templateId, mode)` — fetch org override rows
- `setFieldEnabledForOrg({ organisationId, templateId, sectionKey, fieldKey, isEnabled, updatedByUserId }, mode)` — upsert toggle
- `getFieldDefaultsForOrg(organisationId, templateId, mode)` — fetch org default-value rows
- `setFieldDefaultForOrg({ organisationId, templateId, sectionKey, fieldKey, defaultValue, updatedByUserId }, mode)` — upsert a pre-fill value
- `clearFieldDefaultForOrg({ organisationId, templateId, sectionKey, fieldKey }, mode)` — remove a pre-fill value
- `getProjectAccountId(projectId, mode)` — resolve org for PM consumption filtering

Shared filtering/default utilities:

- `@nidus/shared/utils/formTemplateFieldOverrides.js`
- `@nidus/shared/utils/formTemplateFieldDefaults.js`

## Sidebar

**New Template** appears under **Process Group Forms** in the PMO menu (permission `form_template.manage`). Seeded in `SQL/v754_form_template_admin_rls.sql` and menu configs (`pmoMenuConfig.js`, `simulatorPMOMenuConfig.js`, `v671PmoMenuCanonical.js`).

## SQL deployment order

1. `SQL/v502_form_engine_tables.sql` (tables)
2. `SQL/v506_form_template_seeds.sql` (optional seed templates)
3. `SQL/v753_form_engine_template_rls.sql` (read policies)
4. **`SQL/v754_form_template_admin_rls.sql`** (draft visibility + PMO write policies + sidebar seed)
5. **`SQL/v754b_form_template_builder_menu_items.sql`** (runtime `menu_items` + PMO-admin role assignments)
6. **`SQL/v755_form_template_field_seeds.sql`** (template-specific field sets)
7. **`SQL/v758_form_template_field_overrides.sql`** (per-organisation field enable/disable)
8. **`SQL/v759_form_template_field_seeds_expanded.sql`** (expanded PMBOK-aligned field sets — run after v755)
9. **`SQL/v760_form_template_f017_required_skills.sql`** (F017 Activity List: `required_skills`, `minimum_proficiency`)
10. **`SQL/v761_form_template_field_defaults.sql`** (per-organisation default pre-fill values)

## Related files

- Plan: `projectplan/v754_pmo_form_template_builder_plan.md`
- Field governance plan: `projectplan/v756_template_field_governance_plan.md`
- Builder UI: `apps/platform/src/pages/forms/FormTemplateBuilder.jsx`
- Admin gallery: `apps/platform/src/pages/forms/FormTemplateAdmin.jsx`
- Consumption: `apps/platform/src/pages/forms/FormsGallery.jsx`
