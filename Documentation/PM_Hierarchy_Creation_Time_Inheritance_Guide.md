# PM Hierarchy — Creation-time Field Template Inheritance (v783 / SQL v784)

## Summary

When creating a **Portfolio**, **Programme**, or **Project** on Platform, an optional checkbox **Apply inherited field template** (default **off**) wires the new record into the existing `pm_template_nodes` / `pm_template_entity_assignment` chain and can copy resolved field defaults onto the record.

This is separate from Industry Plan forking (phases/activities) and from Form Template sample defaults (v782).

Simulator has no Portfolio/Programme entities — Platform-only exception to parity (rule 34.1).

## Opt-in behaviour

| Create surface | Flag |
|----------------|------|
| Portfolio form | Checkbox → `savePortfolio(..., { applyFieldTemplateInheritance: true })` |
| Programme create page | Checkbox → `saveProgramme(..., { applyFieldTemplateInheritance: true })` |
| Project create | Checkbox → calls `applyFieldTemplateInheritanceOnCreate` after portfolio/programme links |
| `createProject` API | `options.applyFieldTemplateInheritance` (default false) |

Unchecked creates behave exactly as before (blank template attachment).

## Parent resolution

`pickCreateParentLink` prefers **Programme → Portfolio → parent Portfolio → none (PMO)**.

`resolveTierForCreate` maps a Portfolio with a parent portfolio to tier `sub_portfolio`.

Shared helper: `@nidus/shared/services/pmTemplateCreateInheritance.js`

## Default value storage

| Entity | Storage |
|--------|---------|
| Project | `custom_field_values` rows |
| Portfolio | `portfolios.custom_fields` JSONB (by `field_code`) |
| Programme | `programmes.custom_fields` JSONB (added in SQL v784) |

## Instance-local fields (Part B)

SQL v784 adds `scope_entity_type` / `scope_entity_id` on `custom_field_definitions`.

- **NULL scope** = account-wide LDE catalog (existing behaviour).
- **Set scope** = field exists only for that Portfolio / Programme / Project instance; still linked via `pm_template_field_links`.

Field Templates tab (`TierFieldCustomisationPanel`):

1. **Add from existing fields (LDE catalog)** — published account-wide defs only.
2. **Create a new field just for this [entity]** — instance-local definition + link.

## SQL to apply

Run in Supabase (Platform `public` schema):

1. `SQL/v784_pm_hierarchy_create_time_inheritance.sql`
2. `SQL/v846_custom_field_definitions_instance_local_rls.sql` — tier managers may write instance-local defs (PMO-only RLS blocked PM creates)

(Domain whitelist for portfolio/programme *document* templates remains `SQL/v783_portfolio_programme_template_domains.sql` from Admin v187.)

## Related

- Plan: `projectplan/v783_pm_hierarchy_creation_time_inheritance_plan.md`
- Guide: `Documentation/PM_Template_Hierarchy_Guide.md`
