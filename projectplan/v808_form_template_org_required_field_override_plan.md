# v808 — PMO Admin: Per-Organisation Field Customisation for Forms

## Goal
Let a PMO Admin, per organisation, layer policy on top of a staff-authored **form_template** master schema without touching the master itself (other organisations unaffected):
1. Flag which fields are **required**.
2. **Disable** fields they don't need (already exists — confirmed below).
3. **Add new fields** local to their organisation only.
4. **Delete** — but only ever their own locally-added fields, and only while no submitted record has data in that field. Standard/Global (master-schema) fields can never be deleted by an org, only disabled.
5. **Author "completed" example instances** — a fully filled-in reference form, not a blank schema — that downstream tiers can copy as their own starting point and then customise, instead of starting from an empty form every time.

## Research — what already exists (checked, not assumed)

### 1. Admin app — no analogous feature found
Searched `E:\project-nidus-admin` for `form_template_field_overrides`, `required_override`, `is_required` — only doc/plan mentions turned up, no actual implementation. The "already implemented" system the request is thinking of is almost certainly **inside this same Platform/Simulator codebase**, not Admin — see #2 and #3 below.

### 2. The *exact* precedent already exists, one domain over — `pm_template_field_links`
For the `fields` domain (Field Templates, not Form Templates), `pm_template_field_links` already has this precise shape (`SQL/v764_pm_template_hierarchy_tables.sql`):
```sql
enabled BOOLEAN NOT NULL DEFAULT TRUE,
required_override BOOLEAN NULL,       -- NULL = inherit, TRUE/FALSE = explicit override
default_value_override JSONB NULL,
label_override TEXT NULL,
```
merged tier-by-tier (child overrides parent) in `mergeFieldLinksByChain()` (`pmTemplateInheritanceService.js`). **This is the pattern to mirror** — nullable override column, "no row / NULL = inherit the base," not a bespoke new design.

### 3. Forms already have a *flatter* version of the same idea — one tier short of `required`
`form_template_field_overrides` (organisation_id, template_id, section_key, field_key, **is_enabled**) and `form_template_field_defaults` (…, default_value, guidance_text) already exist and are already wired end-to-end:
- Service layer: `getFieldOverridesForOrg` / `setFieldEnabledForOrg` / `getFieldDefaultsForOrg` / `setFieldDefaultForOrg` (`formEngineService.js`)
- Merge/filter utils: `buildFieldOverrideMap`, `applySchemaFieldOverrides`, `isFieldEnabledForOrg` (`formTemplateFieldOverrides.js`)
- PMO-admin UI: `FormTemplateBuilder.jsx` → **"Field availability"** tab (per-field enable/disable checkbox, saves immediately on toggle) and **"Defaults"** tab (default value + guidance text, batch-saved)
- Applied when a PM starts a new form instance: `FormNew.jsx` fetches both override sets, calls `applySchemaFieldOverrides` before rendering.

**There is no `is_required` (or equivalent) column anywhere in this pair of tables.** That's the actual gap — "disabled" already works exactly as wanted; "required" doesn't exist at the org-override layer at all.

### 4. Add/delete precedent already exists too — for staff authoring the master, not orgs customising their copy
`FormTemplateBuilder.jsx` already has `addField()` / `removeField()` for the schema editor, with exactly the deletion rule requested, just scoped one level up (staff editing the shared master, not a PMO admin customising their org's view of it):
```js
const isStandard = !field.isNew   // published/standard field vs. not-yet-saved-this-session
const removeField = (sectionIndex, fieldIndex) => {
  const field = form.sections[sectionIndex].fields[fieldIndex]
  if (!field.isNew || isFieldKeyInUse(field.key)) return   // can't delete standard or in-use fields
  ...
}
```
And the usage-check already exists as a **reusable, general-purpose function** — not something to build from scratch:
```js
/** Which fields/sections of a template have at least one submitted record's data — used to gate safe deletion in the builder. */
export async function getFormTemplateFieldUsage(templateId, mode = 'platform') { ... }
```
(`formEngineService.js`) — queries `form_instance_values`/`form_instance_rows` joined to `form_instances` by `template_id`, returns the set of `field_key`s with real captured data. This is exactly the "no record has data in this field" check the request needs — it just needs to be applied to the new org-additions data model too, not re-invented.

### 5. A bigger prerequisite gap found while checking: `required` isn't enforced *anywhere*, even at the base schema level
`FormTemplateBuilder.jsx` lets staff tick a field `required: true` when authoring the master schema, and `normalizeTemplateSchema` does persist that flag. But `DynamicFormRenderer.jsx` and `FormFieldRenderer.jsx` (the actual rendering/validation components used by `FormNew.jsx`) **never read `field.required` at all** — no asterisk, no visual required-marker, and no submit-time validation blocking an empty required field. Confirmed via direct search — zero matches for `required` in either renderer file.

**This means an org-level required-override would be built on top of a base feature that's currently decorative.** Before layering an org override on it, `required` needs to actually do something. Flagging this now rather than silently discovering it mid-implementation.

### 6. Confirmed: the Portfolio/Programme/Project chain is genuinely partial, not a guaranteed 3-level hierarchy
Checked rather than assumed, since decision 10 (below) depends on it:
- `programmes.is_orphan` is a **generated column**: `portfolio_id IS NULL` (`SQL/v145`) — a programme with no parent portfolio is an explicitly-modelled, first-class state, not an edge case.
- A project's link to a portfolio and its link to a programme are **two entirely separate join tables** — `portfolio_projects` (project_id, portfolio_id) and `programme_projects` (project_id, programme_id) — confirmed in `dashboardService.js`, which already computes exactly this breakdown: "Distinct org projects with ≥1 `portfolio_projects` row", "`programme_projects` only (no `portfolio_projects` row)", "`portfolio_projects` only (no `programme_projects` row)", "no row in either". **A project's portfolio link and programme link are independent — not nested.** A project can be linked to a portfolio and a programme that itself has no relation to that portfolio at all.
- Your own Platform Dashboard (the first screenshot in this session) shows all four shapes present in the live data right now: 9 programme-link-only, 9 portfolio-link-only, 4 linked to both, 12 linked to neither.

This directly breaks decision 10 as originally drafted ("walk Org → Portfolio → Programme → Project" assumes a strict nested chain that provably doesn't always exist) — revised below.

### 7. Checked — no "completed example instance to copy from" mechanism exists anywhere
Searched for `duplicateFormInstance`/`cloneFormInstance`/`is_template`/"Duplicate"/"Use as template"/"Clone" across the Forms module — nothing. `createFormInstance(projectId, templateCode, ownerId, mode)` always creates a **blank** instance tied to one real `project_id` (not nullable in practice — every instance belongs to exactly one real project, with a real workflow `status` like `'draft'`). There's no concept of a reusable, project-less "example" instance today. This is a genuinely new capability, not something to extend from an existing feature the way decisions 1–13 could.

**Why `form_instances` itself isn't the right place to store this:** an "example to copy from" has no real project, no real owner, no real submission workflow — trying to represent it as a `form_instances` row would mean a fake/placeholder project and a status value that doesn't mean what `status` means everywhere else. Same reasoning v808 already used for decision 6 (new table for added fields, not repurposing an existing one with different semantics) — applies here too.

### 8. Organisational Template URLs show the raw UUID, not a display ID — CLAUDE.md rule already covers this, it just wasn't applied yet
CLAUDE.md rule 16.1 ("Display ID in URLs") already mandates this exact behaviour for any table with a `display_id`-style column — **no new rule is needed**, this is an implementation gap on `pm_template_nodes`, not a missing policy. Confirmed by checking:
- `pm_template_nodes` (the table behind `OrganisationalTemplateDetailPage.jsx` and every Organisational Templates / Template Library page) is **not** in the ~30-table list already registered in `SQL/v756b_id_generation_migration_public.sql`, and has no `display_id`-equivalent column today — it's the raw `id` UUID in the URL, which is exactly what rule 16.1 forbids for tables with ID Generation applied.
- The precedent to mirror is `SQL/v756d_form_instances_display_id.sql` (adds a display column + unique partial index + `AFTER INSERT` trigger calling the existing `public.trg_apply_admin_display_id()` / `sim.trg_apply_admin_display_id()` helpers from `v756_id_generation_migration_helpers.sql` — no new trigger-helper code needed, they're already generic) and `v193`/`v193b` in the Admin repo (same pattern, plus the rule-seed + backfill script).
- Confirmed the repo split from `v756b`'s own header ("Prerequisites: v756 helpers + **admin v156 rules seed**"): the **column + trigger + backfill** lives in **this repo's** `SQL/` (it touches `public.pm_template_nodes`/`sim.pm_template_nodes`), while the **`id_generation_rules` row that defines the abbreviation/format** lives in the **Admin repo's** `SQL/` (that table and `admin.create_id_generation_rule()` only exist in the `admin` schema) — per CLAUDE.md's repo-scoped SQL rule, these stay as two linked files in their own repos, not merged.
- `apps/platform/src/utils/inputValidation.js` has `isValidUUID()` but **no existing display_id-vs-UUID loader-resolution helper** anywhere in Platform — this will be new code, not a reuse of an existing utility (unlike most of the rest of this plan).

## Design decisions — flagging for approval before building

1. **Schema change: add `is_required BOOLEAN NULL` to the existing `form_template_field_overrides` table** (not a new table) — `NULL` = inherit the master schema's own `field.required`; `TRUE`/`FALSE` = explicit per-org override. Mirrors `pm_template_field_links.required_override` exactly. Enable/disable and required are both simple per-field behaviour flags — belong in the same table together, separate from the *content* overrides (`form_template_field_defaults`).

2. **Confirmed: plain asterisk + block-on-submit, no existing convention to match.** Required enforcement built first (Phase 0), not skipped: (a) a visual required-marker (asterisk next to the label) in `DynamicFormRenderer.jsx`, (b) submit-time validation in `FormNew.jsx` blocking save when a required field is empty, with an inline per-field error message. The *effective* required flag driving both is whatever the tier cascade (decisions 9–11) resolves to for that field on that entity — never just the master schema's own flag in isolation.

3. **UI: extend the existing "Field availability" tab, don't add a new tab.** Add a second checkbox ("Required") next to the existing "Enabled" one in `FormTemplateBuilder.jsx`'s per-field list, same immediate-save-on-toggle UX (not a batch Save button like the Defaults tab). Rename the tab/heading to something like "Field behaviour for your organisation" since it's no longer availability-only.

4. **Disabled + required interaction: disabled wins, silently.** If a field is both disabled (hidden from the form entirely) and has `is_required = true` stored, the required flag is simply irrelevant while disabled — no validation runs against a field that isn't rendered. No special-case error needed; `applySchemaFieldOverrides` already filters disabled fields out before required-merging would ever see them.

5. **Scope: form_template domain only, this plan.** Not touching `pm_template_field_links`'s existing tiered fields-domain system (already works, different domain, not what was asked).

6. **Confirmed — new table for added fields: `form_template_field_additions`** (`organisation_id, template_id, section_key, field_key, field_definition JSONB, created_by, created_at, updated_at`, plus `scope_entity_type`/`scope_entity_id` per decision 9 below — any tier can own a row, not only the org) — `field_definition` holds the same shape a master-schema field already has (`{ key, label, type, required, options }`), so it merges into the rendered schema without a parallel field-shape system. Unique on `(organisation_id, template_id, section_key, field_key, scope_entity_type, scope_entity_id)`. A brand new table rather than repurposing `form_template_field_overrides`/`form_template_field_defaults` — those two both describe *policy on an existing master field*; this describes *a field that doesn't exist in the master at all*, structurally different content (a full field definition, not a value/flag).

7. **Confirmed — deletion gating reuses `getFormTemplateFieldUsage` as-is, don't rebuild it.** A field added at any tier can only ever have data from instances actually created under that tier's own scope (nothing outside that scope even sees the field, since it only enters the merged schema when resolving that specific entity's policy chain) — so the existing template-scoped usage query stays correctly scoped as long as `field_key` values are generated uniquely per addition (no collision risk across tiers/orgs; enforce this in the add-field service function, not just hope for it). Delete button calls this first; disabled (not hidden — visible-but-blocked, matching `removeField`'s existing pattern) when the field_key appears in `fieldKeysInUse`. **Standard/master-schema fields never get a delete action at all, anywhere** — only the existing disable toggle.

8. **Org-added fields render appended to their section, after the master's own fields** — simplest ordering rule, consistent with how `display_order` already works (new fields get the next available order value). No drag-reordering against master fields in this pass — that's an ordering-refinement, not core to what was asked.

9. **Downstream tiers (Portfolio/Programme/Project): scope the override tables, don't fork a node per tier.** The `fields` domain's tiered inheritance forks a whole `pm_template_nodes` row per tier (via `pm_template_entity_assignment` + `createTierDocumentTemplateNode`) — heavy, because `fields` genuinely needs a separate governing document per tier. `form_template` doesn't — it's one shared template with several policy layers on top. Lighter fit: add nullable `scope_entity_type TEXT`, `scope_entity_id UUID` to `form_template_field_overrides` and `form_template_field_additions` (same two column names `pm_template_nodes` already uses for this exact concept — consistent naming, not a new vocabulary). `NULL`+`NULL` = the org-wide default (today's behaviour, unchanged); a value = that specific portfolio/programme/project's own layer on top.

10. **Cascade merge, same "child overrides parent" philosophy as `mergeFieldLinksByChain` — but built from direct links only, not an assumed nested chain (see finding #6).** For a target entity, the merge array is **Org, always present**, then **whichever of {that project's linked Portfolio, that project's linked Programme} actually have a row** (via `portfolio_projects`/`programme_projects` respectively — checked independently, not by walking through the other), then the entity's own layer last. A programme with `is_orphan = true` simply contributes no Portfolio layer for anything under it. A project linked to neither resolves as Org → Project directly. Nothing errors on a missing tier — it's just absent from the array, exactly like `mergeFieldLinksByChain` already tolerates a shorter chain.
    - **Precedence when a project is linked to both independently** (the "linked to both" case — 4 in your own dashboard's stats right now): **confirmed — Org → Portfolio → Programme → Project.** Portfolio's layer applies before Programme's even though neither is nested under the other in this data shape.
    - A **Programme itself** (not one of its projects) resolves as Org → Portfolio (if linked) → Programme — same "skip what's absent" rule, one tier shallower.

11. **One-way ratchet: downstream tiers can only tighten, never loosen, per your own framing ("enable/disable *non-mandatory* fields", "*additionally* define mandatory fields").** Concretely: (a) a downstream tier can disable a field only while the *effective* (already-inherited) required flag is false — if the org or any ancestor tier already marked it required, disable is not offered; (b) a downstream tier can mark an additional field required, but cannot un-require a field an ancestor already made required. This needs enforcing in both the UI (don't offer the blocked action) and the write path (reject it server-side too, not just hide the button) — otherwise it's a policy that's trivially bypassed.

12. **Confirmed — downstream tiers can add their own local fields too**, not just toggle required/enabled on existing ones. Portfolio/Programme/Project each get the same "Add field" capability as the org (Phase 3b's UI, reused rather than rebuilt per tier — see Phase 5), writing to `form_template_field_additions` with their own `scope_entity_type`/`scope_entity_id`.

13. **Deletion rights on an added field belong only to the tier that added it — a descendant tier can disable a field an ancestor added, but never delete it.** Same one-way-ratchet philosophy as decision 11, extended to additions: a Project can delete a field *it* added (subject to the usage check, decision 7), but a field added by its Programme, Portfolio, or the Org shows only a disable toggle at the Project level, never a delete action — mirroring exactly how standard/master fields are already treated at every tier. Matching this in the merge output: each field entering the schema carries which tier actually owns it (`scope_entity_type`/`scope_entity_id` from its `form_template_field_additions` row, or "master" for schema-native fields), so the UI at any given tier can compare "whose field is this" against "which tier am I" to decide delete-vs-disable-only.

14. **New table for completed example instances: `form_instance_templates`** (`id, template_id, account_id, scope_entity_type NULL, scope_entity_id NULL, name, description, values JSONB, rows JSONB, created_by, created_at, updated_at`) — `values`/`rows` hold the same shape `form_instance_values`/`form_instance_rows` already do, so "copy" is a straight duplication into a real new instance, not a format conversion. `scope_entity_type`/`scope_entity_id` reuses the same nullable-scoping convention as decisions 6 and 9 (`NULL` = org-wide, from the PMO).

15. **Confirmed — Portfolio/Programme/Project can each publish their own completed examples for their own descendants**, not PMO-only. Same `scope_entity_type`/`scope_entity_id` on `form_instance_templates` (decision 14) that already lets any tier author fields (decision 12) now also lets any tier author examples. Write access mirrors the *existing* tier-manager RLS pattern already used for `pm_template_nodes` (`can_manage_pm_template_node` — `portfolio_manager_user_id`/`programme_manager_user_id`/`project_manager_user_id` matching `auth.uid()`, `SQL/v764b`), not a new access model. Project is a leaf tier with no descendants of its own, but keeps the same authoring capability for consistency — it just has no downstream audience to publish to, which needs no special-casing.

16. **Copy mechanism: a new "Start from a completed example" step before/alongside "Start blank" when creating a form instance**, not a silent auto-fill. `FormNew.jsx` (+ Simulator mirror) resolves the *same* ancestor chain as decision 10 (Org, plus whichever of Portfolio/Programme actually link, per finding #6 — never assumed) and lists every example published anywhere in that chain, labelled with its source tier ("Organisation example", "Portfolio example", etc.) so a manager knows whose example they're starting from. Picking one (or "start blank") seeds the new real `form_instances` row's `form_instance_values`/`form_instance_rows` from the chosen example — fully editable afterward, no ongoing link back to the example (a one-time copy, same "fork, don't reference" pattern used everywhere else in this session's copy-to-customise work).

17. **No usage-gating needed on deleting a completed example**, unlike decision 7's field-deletion gate. Once copied, a new instance's data is independent of the example it came from — deleting the example later doesn't touch anything already copied from it. Any PMO admin (or whichever tier authored it, per decision 15) can delete their own examples freely; the usage check that matters is specific to *fields* with *live captured data*, not to examples themselves.

18. **`pm_template_nodes` display column: `template_reference`** (matches the `instance_reference` naming already used for `form_instances` in `v756d`), `TEXT`, unique partial index, backfilled for existing rows. Abbreviation **`TPL`** for `public.pm_template_nodes` (→ `TPL-0001`), **`STPL`** for `sim.pm_template_nodes` (→ `STPL-0001`) — kept distinct so a reference number alone tells you Platform vs Simulator, matching the existing convention of Simulator-side tables/prefixes being distinguishable from their Platform counterparts elsewhere in the system.

19. **URL + loader: `display_id`-or-UUID, backward compatible, per rule 16.1 itself — not a new pattern to invent.** `OrganisationalTemplateDetailPage.jsx` (+ Simulator mirror) and `TemplatePreviewPage.jsx` (+ mirror) switch their route param from the raw `id` to accept either `template_reference` or the UUID (`isValidUUID()` from `inputValidation.js` decides which lookup to run — no column ever holds both formats, so this is a two-branch loader, not a format-sniffing hack). Mutations (copy, edit-save) keep using the row's real UUID once loaded, exactly as rule 16.1 already specifies. Success toasts (e.g. the existing "Copied as ... ({copied.id})" in `TemplatePreviewPage.jsx`) switch to showing `copied.template_reference` in place of `copied.id`.

## Scope

### Phase 0 — Make `required` actually do something (prerequisite)
- `DynamicFormRenderer.jsx` (+ Simulator mirror): render an asterisk/required marker next to the field label when `field.required` is true.
- `FormNew.jsx` (+ Simulator mirror): on submit, validate all rendered (i.e. already-enabled-filtered) required fields have a non-empty value; block submission and show inline errors if not.
- Unit tests for the validation function in isolation.

### Phase 1 — Required-override schema + service layer
- `SQL/v810_form_template_field_required_override.sql`: `ALTER TABLE public.form_template_field_overrides ADD COLUMN IF NOT EXISTS is_required BOOLEAN NULL` (+ `sim` mirror). No RLS change needed — same table, same existing policies already gate write access appropriately.
- `formEngineService.js` (+ Simulator mirror): extend `getFieldOverridesForOrg`'s `select()` to include `is_required`; extend `setFieldEnabledForOrg` (or add a sibling `setFieldRequiredForOrg`, matching the existing one-flag-per-call convention) to upsert it.

### Phase 1b — Org-added-field schema + service layer
- `SQL/v810_form_template_field_required_override.sql` (same file as Phase 1, one migration): `CREATE TABLE public.form_template_field_additions (...)` + `sim` mirror, RLS mirroring `form_template_field_overrides`' existing organisation-scoped policy shape (PMO admin of that org can read/write their own org's rows only).
- `formEngineService.js` (+ Simulator mirror): `listFieldAdditionsForOrg(organisationId, templateId)`, `addFieldForOrg({ organisationId, templateId, sectionKey, fieldDefinition, updatedByUserId })`, `deleteFieldAdditionForOrg({ organisationId, templateId, sectionKey, fieldKey })` — the delete function calls the existing `getFormTemplateFieldUsage` first and refuses (clear error, not a raw DB constraint failure) if the field_key has any captured data.

### Phase 2 — Merge/filter utils
- `formTemplateFieldOverrides.js` (+ both app-local shadow copies, since `utils/` is aliased in both `vite.config.js`s — same pattern as every other `utils/` fix this session): `buildFieldOverrideMap` carries `{ enabled, required }` per key instead of a flat boolean; `applySchemaFieldOverrides` merges `required` onto each surviving field (`field.required = override.required ?? field.required`) **and** appends each org's `form_template_field_additions` rows to their section's `fields` array, tagged `is_local: true` so the builder/renderer can tell org-added apart from master fields at a glance (mirrors `pm_template_field_links.is_local` naming); new `isFieldRequiredForOrg` helper alongside the existing `isFieldEnabledForOrg`.
- Unit tests extended for the new merge behaviour (required override present/absent/null; added fields appended correctly; added field respects its own required/enabled state).

### Phase 3 — Builder UI: required toggle
- `FormTemplateBuilder.jsx` (+ Simulator mirror): second checkbox in the field-behaviour list, wired to the new required-toggle handler, immediate save per decision 3.

### Phase 3b — Builder UI: add/delete local fields (built once, reused at every tier)
- One "Add field" component: creates a row in `form_template_field_additions` scoped to whichever tier is using it (reusing the same field-editor sub-form the master schema editor already has for shape consistency — label/type/required/options). Built org-facing first in `FormTemplateBuilder.jsx`, but written so Phase 5 mounts the identical component scoped to a Portfolio/Programme/Project instead of rebuilding it per tier.
- A field's owner tier (from its `scope_entity_type`/`scope_entity_id`, or "master" if it's schema-native) decides delete-vs-disable-only at the current viewing tier (decision 13): your own tier's own additions get a Delete action (gated by the usage check, decision 7); everything else — master fields and any ancestor tier's additions — shows disable-only. Delete button disabled-with-tooltip (not hidden) when usage exists, matching `removeField`'s existing pattern but surfaced as a visible, explained state rather than a silent no-op.
- **Sidebar (rule 13):** this reuses the existing `FormTemplateBuilder.jsx` entry point (already in the PMO sidebar section) — no new menu item needed at this phase.

### Phase 5 — Downstream tier (Portfolio/Programme/Project) policy layering
- `SQL/v810_...sql` (same migration): add `scope_entity_type TEXT NULL`, `scope_entity_id UUID NULL` to both `form_template_field_overrides` and `form_template_field_additions`; unique constraints extended to include them (so org-default and each entity's own row coexist).
- New merge function (`formTemplateFieldOverrides.js`), same file as the existing merge utils: `resolveEffectiveFieldPolicy(overridesRootToLeaf)` — takes whatever tiers actually resolved (per decision 10 — Org always, Portfolio/Programme only if directly linked, never assumed), merges required/enabled per field **and concatenates each tier's own `form_template_field_additions` fields into the schema, tagged with their owning tier** (decision 13), child overrides parent for policy, **except** the one-way ratchet from decision 11 (a child's `is_enabled=false` is only honoured when the merged-so-far required state is false; a child's `is_required=true` always wins forward, a child can never set `is_required=false` over an ancestor's `true`).
- `formEngineService.js`: extend `getFieldOverridesForOrg`/`setFieldEnabledForOrg`/etc. (and the new field-addition functions from Phase 1b) with optional `scopeEntityType`/`scopeEntityId` params (`null` = today's org-default behaviour, unchanged call sites keep working); new `resolveEntityPolicyChain(entityType, entityId)` queries `portfolio_projects`/`programme_projects` (for a project) or the programme's own `portfolio_id` (for a programme) directly — **no assumption that a link exists**, building whatever partial chain decision 10 describes.
- UI: same "Field availability" tab **and** the Phase 3b add/delete component, both surfaced on the Portfolio/Programme/Project dashboards (wherever their own settings already live) rather than only in the PMO-level `FormTemplateBuilder.jsx` — reads/writes with that tier's `scopeEntityType`/`scopeEntityId` instead of `null`. Fields blocked by the ratchet (decision 11) show as read-only with a short "required by [organisation/portfolio/programme] policy" note, not just hidden — a manager should be able to see *why* they can't change something.
- **Sidebar (rule 13):** check first whether each of Portfolio/Programme/Project already has a "Settings" sidebar entry for that tier's dashboard — if yes, this UI is a new tab inside it (no new sidebar row). If any tier has no dedicated settings surface yet, add one dedicated sub-link under that tier's existing sidebar section (Platform + Simulator, rule 34.1) rather than bolting the UI onto an unrelated page.
- Tests: cascade resolution for **every linkage shape that actually exists in this data** (per finding #6) — org-only project (no portfolio, no programme); portfolio-linked-only; programme-linked-only; linked to both independently (precedence per decision 10); orphan programme (no portfolio) customising its own policy; org sets required and portfolio can't unset it; portfolio adds a new required field and project inherits it (and project can disable it — decision 13 — but not delete it); project can disable an org-optional field but not an org-required one.

### Phase 7 — Completed example instances (any tier authors, its descendants copy)
- `SQL/v810_...sql` (same migration): `CREATE TABLE public.form_instance_templates (...)` + `sim` mirror, per decision 14. RLS mirrors the existing `can_manage_pm_template_node` shape (`SQL/v764b`) rather than a new access model: PMO admin for org-wide (`scope_entity_type IS NULL`) rows, or the matching `portfolio_manager_user_id`/`programme_manager_user_id`/`project_manager_user_id` for that tier's own scoped rows. Read is open to anyone with access to the account (same as `form_template_field_overrides` today).
- `formEngineService.js` (+ Simulator mirror): `listInstanceTemplatesForChain(templateId, entityChain)` — same ancestor-chain resolution as decision 10/16, returns every example published anywhere in that chain tagged with its source tier; `createInstanceTemplate({ templateId, name, description, values, rows, scopeEntityType, scopeEntityId, updatedByUserId })`; `deleteInstanceTemplate(id)` (no usage-gate, per decision 17, but still checks the caller actually owns that tier's scope before deleting).
- Authoring UI: **one component, reused at every tier** (same "build once" approach as Phase 3b) — reuses `DynamicFormRenderer` in a mode that saves to `form_instance_templates` instead of a real `form_instances` row. Surfaced in `FormTemplateBuilder.jsx` for the org-wide case and on the Portfolio/Programme/Project dashboards (alongside Phase 5's field-policy UI) for tier-scoped examples.
- `FormNew.jsx` (+ Simulator mirror): "Start from a completed example" picker per decision 16 — lists every example resolved from the chain, labelled by source tier, seeds the new instance's values/rows on selection, otherwise starts blank exactly as today.
- Tests: creating an example doesn't touch real `form_instances`; copying seeds values/rows correctly and independently (editing the copy never touches the example); a Project sees examples published by its Org, linked Portfolio, and linked Programme (whichever actually exist, per decision 10's chain rules) plus its own; a Programme/Project cannot author an example under a scope it doesn't manage; example respects the effective schema (decisions 1–13) — e.g. an example can't be missing a value for a field the current policy chain marks required, or at minimum surfaces that gap when copied.
- **Sidebar (rule 13):** authoring UI reuses the same PMO `FormTemplateBuilder.jsx` entry (org-wide case) and the Phase 5 tier-settings surfaces (tier-scoped case) — no standalone new menu item. The "Start from a completed example" picker lives inside the existing `FormNew.jsx` flow, already reached from each tier's existing "New form" entry point — nothing new to register there either.

### Phase 8 — Parity + docs
- Every phase ships to Platform + Simulator together (rule 34.1).
- New/updated `Documentation/` guide covering the full flow: staff authors base schema → PMO admin customises enabled/required/adds org fields/authors completed examples → Portfolio/Programme/Project further tighten, add their own fields, and copy an example as their starting point → PM sees the fully cascaded form.

### Phase 9 — Organisational Template display IDs (URL), per CLAUDE.md rule 16.1
- **This repo's SQL** (`SQL/v811_pm_template_nodes_display_id.sql`): `ALTER TABLE public.pm_template_nodes ADD COLUMN IF NOT EXISTS template_reference TEXT` + unique partial index (+ `sim` mirror), `AFTER INSERT` triggers on both tables calling the existing `public.trg_apply_admin_display_id('public.pm_template_nodes', 'template_reference')` / `sim.trg_apply_admin_display_id('sim.pm_template_nodes', 'template_reference')` (no new trigger-helper code — `v756_id_generation_migration_helpers.sql` already covers this generically), a backfill loop for existing rows (same shape as `v193b`'s, calling `admin.generate_display_id()` directly — already proven cross-schema-callable via the trigger helper's own `SECURITY DEFINER`/`search_path` grant), and the `database_tables` upsert (rule already in place, `pm_template_nodes` likely already registered from its original creation — this just refreshes the description).
- **Admin repo's SQL** (`E:\project-nidus-admin\SQL\vNNN_pm_template_nodes_id_generation_seed.sql`, next free version there): two `admin.create_id_generation_rule(...)` calls (or `update_id_generation_rule` if a stale rule exists) — `public.pm_template_nodes` → abbreviation `TPL`, `sim.pm_template_nodes` → abbreviation `STPL`, both sequential/4-digit, matching `v193b`'s call shape exactly.
- `OrganisationalTemplateDetailPage.jsx` + `TemplatePreviewPage.jsx` (+ Simulator mirrors): loader resolves by `template_reference` first, falls back to UUID via `isValidUUID()` (new small helper, no existing one to reuse per finding #8); URL updated to use `template_reference` once resolved (`history.replace`, not a hard redirect that loses scroll/query state); mutation calls keep using the row's real `id`; success toasts show `template_reference` in place of the raw `id` (e.g. `TemplatePreviewPage.jsx`'s existing `Copied as "${copied.name}" (${copied.id})"` → `copied.template_reference`).
- Every other page that currently links to these detail/preview routes (`OrganisationalTemplatesPage.jsx`, `TemplateLibraryPage.jsx`, and their Simulator mirrors) updated to build the link from `template_reference` when present, UUID otherwise (same backward-compatible pattern, not a breaking change to in-flight bookmarks).
- Tests: loader resolves correctly by `template_reference`, by UUID, and 404s cleanly on neither; backfill script is idempotent (`WHERE template_reference IS NULL`, safe to re-run).
- No new CLAUDE.md rule needed — rule 16.1 already covers this; this phase is closing an implementation gap on `pm_template_nodes` specifically, not adding new policy.

## Explicitly out of scope
- Editing or reordering an added field after creation, or dragging it relative to master fields — v1 is add/delete only, appended at the end of its section.
- Any change to Admin app — confirmed nothing there needs updating for this.

## Todo
- [x] Confirm design decisions #1–13 — all resolved: #2 (plain asterisk + block-on-submit), #6 (new field-additions table shape), #7 (reuse `getFormTemplateFieldUsage`), #9–11 (tiered cascade + ratchet, Portfolio-before-Programme precedence), #12 (downstream tiers can add their own fields), #13 (delete rights scoped to the adding tier only)
- [x] Confirm decisions #14–17 (completed example instances) — all resolved, including #15: Portfolio/Programme/Project can each publish their own examples for their own descendants, not PMO-only
- [x] Phase 0: required enforcement in rendering + validation (both apps) — asterisk in `DynamicFormRenderer.jsx`; block-on-submit lives in `FormEdit.jsx` (the actual submit surface — `FormNew.jsx` only creates a blank draft), not a gap
- [x] Phase 1: required-override SQL column + service layer (both apps) — `v810`, `setFieldRequiredForOrg`
- [x] Phase 1b: field-additions SQL table + service layer (both apps) — `v810`, `listFieldAdditionsForOrg`/`addFieldForOrg`/`deleteFieldAdditionForOrg`; field-key collision guard added to `addFieldForOrg` (checks uniqueness across all scopes/tiers before insert, closing the gap decision 7 flagged)
- [x] Phase 2: merge/filter utils + tests (both apps + shadow copies) — `formTemplateFieldOverrides.js`, byte-identical across `packages/shared` + both app-local copies, full test coverage incl. ratchet matrix
- [x] Phase 3: Builder UI required toggle (both apps) — "Field Behaviour" tab, `FormTemplateBuilder.jsx`
- [x] Phase 3b: Builder UI add/delete local fields (both apps) — built inline in `FormTemplateBuilder.jsx`; `TierFormPolicyPanel.jsx` has its own parallel add/delete UI rather than importing one shared component (functional deviation from "build once" — both call the same service functions, no behavioural gap)
- [x] Phase 5: downstream tier cascade — schema, merge, UI, tests (both apps) — `v812` (scope columns), `v813` (server-side ratchet trigger), `resolveEntityPolicyChain`, `TierFormPolicyPanel.jsx` mounted on `PortfolioDetail.jsx`/`ProgrammeDetail.jsx`/`ProjectFieldTemplates.jsx`, full chain-shape test coverage
- [x] Phase 7: completed example instances — schema, service, authoring UI, "start from example" picker, tests (both apps) — `v814`, `CompletedExampleManager.jsx` (genuinely one reused component), picker in `FormNew.jsx`
- [x] Phase 8: parity check, docs — code parity verified byte-identical across both apps for every phase; documentation written: `Documentation/Form_Template_Org_Field_Customisation_And_Tier_Cascade_Guide.md`
- [x] Confirm decision #18–19 (Organisational Template `display_id`/URL fix) — resolved: `template_reference` column, `TPL`/`STPL` abbreviations, backward-compatible loader
- [x] Phase 9: `pm_template_nodes` display IDs — this repo's SQL (`v811`), Admin repo's SQL (`v197_pm_template_nodes_id_generation_seed.sql`), loader + link updates (both apps), loader tests in `pmTemplateNodeService.test.js`
- [x] Sidebar check (rule 13, cuts across Phases 3b/5/7): Portfolio/Programme/Project already had their own settings surfaces — `TierFormPolicyPanel` mounted there directly, no new sidebar entries needed anywhere in this plan

## Review

**Status: 100% complete.**

Most of this plan (Phases 0–3b, 5, 7, 9, and design decisions 1–19) was already implemented in
a prior session but the plan's own checklist was never updated to reflect it — an audit against
the actual code (not the stale checkboxes) confirmed full, byte-identical Platform/Simulator
parity for every phase, server-side (not just UI) enforcement of the one-way ratchet (decision
11), and correct handling of the non-nested Portfolio/Programme/Project linkage shapes
(decision 10/finding #6).

Closed in this session:
1. **Decision 7's flagged collision risk** — `addFieldForOrg` (both apps) now checks a field
   key isn't already used by *any* other tier's addition on the same template before inserting,
   since `getFormTemplateFieldUsage`'s deletion-usage gate reads by field key across the whole
   template rather than per-scope. Without this, two tiers independently adding a field with
   the same key could have corrupted each other's delete-safety check.
2. **Test coverage gaps** — added unit tests for `setFieldRequiredForOrg`, `addFieldForOrg`
   (including the new collision guard, both the reject and the happy-insert path), and
   `deleteFieldAdditionForOrg` to both apps' `formEngineService.test.js`. Phase 9's loader
   tests turned out to already exist (`pmTemplateNodeService.test.js`) — the earlier audit
   missed them by not checking `packages/shared/src/services/__tests__/`.
3. **Phase 8 documentation** — genuinely missing; written as
   `Documentation/Form_Template_Org_Field_Customisation_And_Tier_Cascade_Guide.md`, covering the
   full staff → PMO org → tier cascade → completed-example → PM-consumption flow with a
   file-location table for future maintenance.

Left as-is (evaluated, not overlooked):
- `packages/ui/src/TierFormPolicyPanel.jsx` and `CompletedExampleManager.jsx` have a relative
  import (`../../services/formEngineService`) that doesn't resolve if that copy were ever
  loaded directly — harmless today because `@nidus/ui` is aliased in both apps' `vite.config.js`
  straight to each app's own `src/components/ui/` shadow copy. Left unfixed because it's a
  pre-existing, repo-wide convention (4 other unrelated `packages/ui` components have the
  identical pattern) — fixing 2 of 6 in isolation wouldn't change anything functionally and
  would be refactoring unrelated code (CLAUDE.md rule 32).
- `TierFormPolicyPanel.jsx` building its own inline add/delete-field UI rather than importing
  Phase 3b's builder UI as one literal shared component — functionally equivalent (same service
  calls, same rules), not worth a mid-flight extraction now that both are shipped and tested.
