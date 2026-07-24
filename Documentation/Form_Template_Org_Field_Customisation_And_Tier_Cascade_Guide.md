# Form Template: Organisation & Tier Field Customisation (v808)

Covers the full policy-layering flow on top of a staff-authored form template's master
schema: PMO-admin org-wide customisation, Portfolio/Programme/Project tier cascading, and
"completed example" authoring/copying. Applies identically to Platform and Simulator.

## The problem this solves

A form template's master schema (authored by staff in **Form Template Builder**) is shared
by every organisation. Without a customisation layer, every org would see exactly the same
fields, with the same fields required, and no way to add anything specific to their own way
of working. This feature lets an organisation — and, further down, a specific Portfolio,
Programme, or Project inside that organisation — layer policy on top of the shared master
without ever touching it, so other organisations are unaffected.

## The five capabilities

1. **Require a field.** Flag any master-schema field as required for your organisation (or a
   specific tier within it), even if the master schema itself doesn't mark it required.
2. **Disable a field.** Hide a field you don't need — already existed before this plan.
3. **Add a field.** Add a field that only your organisation (or a specific tier) sees, on top
   of the master schema, without needing a new master-schema publish.
4. **Delete an added field.** Only ever your own locally-added fields — never a master field —
   and only while no submitted record has data in it yet.
5. **Author a completed example.** A fully filled-in reference form (not a blank schema) that
   downstream tiers can copy as their own starting point instead of starting blank.

## Required-field enforcement (prerequisite)

Before any override could mean anything, `required` had to actually do something at the base
level:
- `DynamicFormRenderer.jsx` renders an asterisk next to a required field's label.
- `FormEdit.jsx` (the page with the real submit action — `FormNew.jsx` only creates a blank
  draft) validates every enabled required field has a value before allowing submission, via
  `validateRequiredSchemaFields()` (`packages/shared/src/utils/formValidation.js`), and shows
  inline per-field errors instead of a generic toast.
- The *effective* required flag driving both is whatever the tier cascade below resolves to
  for that field on that entity — never just the master schema's own flag in isolation.

## Layer 1 — organisation-wide customisation (PMO Admin)

In **Form Template Builder → Field Behaviour** tab (`FormTemplateBuilder.jsx`), a PMO admin
gets, per field:
- **Enabled / Disabled** checkbox.
- **Required** checkbox, disabled while the field itself is disabled (a hidden field's
  required-ness is irrelevant — no validation ever runs against a field that isn't rendered).

Below the field list, **"Add a field just for your organisation"** creates a field that exists
only in your org's copy of the schema — never touching the master. It renders appended to the
end of its section (no reordering against master fields in this pass). A field you added
yourself gets a **Delete** button; every master field and every field added by a different
tier only ever gets the disable toggle — deletion rights belong solely to the tier that added
the field. Delete is disabled (with an explanatory tooltip), not hidden, once any submitted
record has data in that field.

**Completed Examples** tab (same page): author a fully filled-in reference instance for the
whole organisation, reusing `DynamicFormRenderer` in a mode that saves into
`form_instance_templates` instead of a real project's `form_instances` row.

### Schema
- `form_template_field_overrides` gained `is_required BOOLEAN NULL` — `NULL` = inherit the
  master schema's own `field.required`, `TRUE`/`FALSE` = explicit override
  (`SQL/v810_form_template_field_required_override.sql`).
- New table `form_template_field_additions` (`organisation_id, template_id, section_key,
  field_key, field_definition JSONB, scope_entity_type, scope_entity_id, ...`) — a full field
  definition (same shape a master field already has), not a value or a flag, which is why it's
  its own table rather than folded into `form_template_field_overrides` (same migration file).

## Layer 2 — Portfolio / Programme / Project cascading

Any tier below the organisation can layer its **own** policy on top, via the same
`TierFormPolicyPanel` component (`packages/ui/src/TierFormPolicyPanel.jsx`, one component
reused at every tier — not rebuilt per tier), mounted on each tier's own existing settings
surface:
- `PortfolioDetail.jsx` (Portfolio's own "Field Templates"/settings area)
- `ProgrammeDetail.jsx`
- `ProjectFieldTemplates.jsx`

No new sidebar entries were needed — each tier already had a settings surface to host this on.

### Ancestor chain — resolved, not assumed

A Portfolio → Programme → Project nested chain is **not** guaranteed in this system (confirmed
via `dashboardService.js`): a project's link to a portfolio and its link to a programme are two
independent join tables (`portfolio_projects`, `programme_projects`), and a programme can have
no portfolio at all (`programmes.is_orphan`). `resolveEntityPolicyChain(entityType, entityId)`
(`formEngineService.js`) resolves whatever links actually exist for that specific entity —
never walking an assumed hierarchy:
- Project linked to both → chain is **Org → Portfolio → Programme → Project** (Portfolio before
  Programme even though neither is nested under the other).
- Project linked to only one, or neither → chain is shorter, org-default always present.
- Orphan programme → chain is just **Org → Programme**.

### One-way ratchet — tighten only, never loosen

A downstream tier can only make policy *stricter*, never weaker, than what an ancestor set:
- A tier can disable a field only while the **effective** (already-inherited) required state
  is false. If the org (or any ancestor) already marked a field required, the disable
  checkbox is disabled in the UI with a "Required upstream — cannot disable here" tooltip.
- A tier can mark an *additional* field required, but can never flip an ancestor's `required`
  back to optional.

This is enforced **twice** — once in the UI (`TierFormPolicyPanel.jsx` disables the checkbox),
and again at the database layer via a `BEFORE INSERT/UPDATE` trigger
(`trg_form_template_field_overrides_ratchet`, `SQL/v813_form_template_field_ratchet_enforcement.sql`)
that walks the real ancestor scopes and rejects the write outright if a descendant tries to
loosen a policy an ancestor already tightened. The UI gate is a courtesy; the trigger is what
actually guarantees the rule can't be bypassed by a direct API call.

### Field ownership and delete rights

Every field entering the effective schema carries which tier actually added it
(`scope_entity_type`/`scope_entity_id` on its `form_template_field_additions` row, or "master"
for schema-native fields). A tier's panel compares "whose field is this" against "which tier am
I" to decide delete-vs-disable-only — a Project can delete a field it added itself, but only
ever disable a field its Programme, Portfolio, or the Org added.

### Schema
- `SQL/v812_form_template_field_tier_scope.sql`: `scope_entity_type TEXT NULL`,
  `scope_entity_id UUID NULL` added to both `form_template_field_overrides` and
  `form_template_field_additions` — `NULL`+`NULL` (well, `scope_entity_type = 'account'` as the
  org-wide sentinel) is the org-wide default; a real value is that tier's own layer. RLS
  extended so a portfolio/programme/project manager (`can_manage_pm_template_node`, mirroring
  the existing tiered `fields`-domain access model) can write only their own tier's rows.
- Field-key collision guard: `addFieldForOrg` checks a field key isn't already used by
  *another* tier's addition on the same template before inserting — field keys must be unique
  per template across every scope, since the deletion-usage check
  (`getFormTemplateFieldUsage`) reads usage by field key across the whole template, not scoped
  per tier.

## Completed examples — authored anywhere in the chain, copied by descendants

Any tier (Org, Portfolio, Programme, Project) can publish its own completed example via the
same `CompletedExampleManager` component, embedded both in Form Template Builder (org-wide)
and inside `TierFormPolicyPanel` (tier-scoped). When starting a new form
(`FormNew.jsx` → **"Start from a completed example"**), every example published anywhere in
that entity's resolved ancestor chain is listed, labelled by its source tier ("Organisation
example", "Portfolio example", …). Picking one seeds the new instance's values from the
example — a one-time copy, not an ongoing link, so editing the copy or later deleting the
example never affects the other.

### Schema
- New table `form_instance_templates` (`SQL/v814_form_instance_templates.sql`):
  `template_id, account_id, scope_entity_type NULL, scope_entity_id NULL, name, description,
  values JSONB, rows JSONB, ...`. `values`/`rows` hold the same shape
  `form_instance_values`/`form_instance_rows` already use, so copying is a straight duplication,
  not a format conversion. No usage-gate on deletion — once copied, a new instance's data is
  independent of the example it came from.

## Organisational Template display IDs

Unrelated to the field-policy work above but shipped in the same plan: `pm_template_nodes`
(the table behind the Organisational Templates / Template Library pages) now has a
`template_reference` display column (`TPL-0001` for Platform, `STPL-0001` for Simulator),
generated via Admin's ID Generation system, per CLAUDE.md rule 16.1. Detail/preview page
loaders (`OrganisationalTemplateDetailPage.jsx`, `TemplatePreviewPage.jsx`) accept either the
reference or the raw UUID and normalise the URL to the reference once resolved
(`SQL/v811_pm_template_nodes_display_id.sql`, Admin repo's companion rule seed at
`E:\project-nidus-admin\SQL\v197_pm_template_nodes_id_generation_seed.sql`).

## End-to-end flow

1. **Staff** authors the master schema in Form Template Builder → **Fields** tab, publishes a
   version.
2. **PMO Admin** (per organisation) opens the same template in **Field Behaviour**, enables/
   disables fields, marks org-specific fields required, adds org-only fields, and authors one
   or more org-wide completed examples in **Completed Examples**.
3. **Portfolio / Programme / Project managers** (optional) open their own tier's settings and
   further tighten required/enabled state, add their own tier-only fields, and author their
   own completed examples — never able to loosen anything an ancestor already locked down.
4. A **PM** starting a new form via `FormNew.jsx` sees the fully cascaded effective schema
   (master + org layer + whichever ancestor tiers actually apply to their project) and can pick
   any example published anywhere in that chain as a starting point instead of a blank form.

## Where the code lives

| Concern | Platform | Simulator | Shared |
|---|---|---|---|
| Required-field rendering/validation | `apps/platform/src/components/forms/DynamicFormRenderer.jsx`, `apps/platform/src/pages/forms/FormEdit.jsx` | mirrors, `apps/simulator/...` | `packages/shared/src/utils/formValidation.js` |
| Org/tier override + addition service functions | `apps/platform/src/services/formEngineService.js` | mirrors | — (per-app, not shared, due to `platformDb`/`simDb` split) |
| Merge/filter utils (`applySchemaFieldOverrides`, `applyTieredSchemaFieldOverrides`, `mergeOverrideChain`) | `apps/platform/src/utils/formTemplateFieldOverrides.js` | mirrors | `packages/shared/src/utils/formTemplateFieldOverrides.js` (aliased per-app via each `vite.config.js`) |
| Org-wide builder UI | `apps/platform/src/pages/forms/FormTemplateBuilder.jsx` | mirrors | — |
| Tier cascade panel | `apps/platform/src/components/ui/TierFormPolicyPanel.jsx` | mirrors | — |
| Completed-example authoring | `apps/platform/src/components/ui/CompletedExampleManager.jsx` | mirrors | — |
| "Start from example" picker | `apps/platform/src/pages/forms/FormNew.jsx` | mirrors | — |
| SQL | `SQL/v810`–`v814`, `v811` (display IDs) | same files, `sim.*` mirror tables in the same migration | — |
