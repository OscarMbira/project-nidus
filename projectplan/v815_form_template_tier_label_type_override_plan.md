# v815 — Per-Tier Field Label & Type Overrides (Form Templates)

## Goal
Extend the existing Organisation → Portfolio → Programme → Project field-policy cascade
(built in [[v808]] — enable/disable, required) so every tier can **also** override a
**standard/master field's Label and Type** for its own scope, without touching the shared
master schema (staff-authored `form_templates`/`form_template_versions`) that every other
organisation still sees unchanged.

Triggered by: PMO Admin viewing the master "Field catalog" editor for `F070` and asking for
the same per-tier customisation already available for Required/Enabled to also cover Label
and Type.

## Research — what already exists (checked, not assumed)

1. **The exact precedent already exists — `form_template_field_overrides`** (`SQL/v758`,
   extended in `v810`/`v812`). Nullable-override pattern: no row = inherit; `is_enabled`/
   `is_required` on the row = explicit override. Scoped by `scope_entity_type` (`account` /
   `portfolio` / `programme` / `project`) + `scope_entity_id` (`v812`). **This is the table to
   extend, not a new one** — label/type are the same kind of "policy on an existing master
   field" as required/enabled, not a new field definition (that's what
   `form_template_field_additions` is for, and stays untouched).

2. **Merge/cascade logic already exists** — `formTemplateFieldOverrides.js`
   (`packages/shared/src/utils/`, byte-identical shadow copies in both apps' `src/utils/`):
   `buildFieldOverrideMap`, `applySchemaFieldOverrides` (flat, org-only — used by
   `FormTemplateBuilder.jsx`'s "Field Behaviour" tab), `mergeOverrideChain` +
   `applyTieredSchemaFieldOverrides` (chain-aware — used by `TierFormPolicyPanel.jsx` and
   `FormNew.jsx`). All four need extending to carry `label`/`type`/`options` alongside
   `enabled`/`required`.

3. **UI precedent already exists at both levels** — `FormTemplateBuilder.jsx`'s "Field
   Behaviour" tab (org-wide, `activeTab === 'availability'`, screenshot's page one tab over)
   and `TierFormPolicyPanel.jsx` (Portfolio/Programme/Project — mounted on
   `PortfolioDetail.jsx`/`ProgrammeDetail.jsx`/`ProjectFieldTemplates.jsx`) both render one row
   per catalog field with Enabled/Required controls, immediate-save-on-change. Same rows are
   where Label/Type override controls belong — no new tab or new sidebar entry needed.

4. **Org-added local fields (`form_template_field_additions`) already have free-form label/type
   — but only at creation.** `FormTemplateBuilder.jsx`'s "Add field" form and
   `TierFormPolicyPanel.jsx`'s "Add a field just for this {tier}" form both let the author pick
   any label/type up front. v808 explicitly scoped "editing an added field after creation" as
   **out of scope** ("v1 is add/delete only"). This plan does not reopen that — it targets
   **standard/master fields only**, where today there is no per-tier customisation of
   label/type at all (the actual gap).

5. **Rendering already reads whatever schema it's handed — no renderer change needed.**
   `DynamicFormRenderer.jsx` calls `resolveFieldLabel(field, translationIndex, section.key)`
   (translation wins if set for the active language, otherwise falls back to `field.label` —
   unchanged by this plan, since overrides only change the *base* label going into that same
   fallback). `FormFieldRenderer.jsx` switches on `field.type` (`textarea`/`date`/`number`/
   `select`/`money`, default `text`) to pick the input control — already type-agnostic to
   *where* `field.type` came from. Since overrides are applied to the schema **before** either
   renderer sees it (`applySchemaFieldOverrides`/`applyTieredSchemaFieldOverrides`, called by
   `FormTemplateBuilder.jsx`'s catalog view, `TierFormPolicyPanel.jsx`, and `FormNew.jsx`), no
   change is needed in either renderer file.

6. **Gap found, out of scope for this plan, flagged not fixed:** `FormEdit.jsx` (the actual
   form-editing/submit surface after a `form_instances` row exists) does not import
   `applySchemaFieldOverrides`/`applyTieredSchemaFieldOverrides`/`resolveEntityPolicyChain` —
   only `FormNew.jsx` (initial creation) does. This is a **pre-existing gap from v808**, not
   something this plan introduces or is scoped to fix — flagging it here so it isn't mistaken
   for new-feature scope creep if noticed during testing. Worth its own follow-up plan.

## Design decisions

1. **Schema: extend `form_template_field_overrides` with three nullable columns** —
   `label_override TEXT NULL`, `field_type_override TEXT NULL`,
   `options_override JSONB NULL` (only meaningful when `field_type_override = 'select'`).
   `NULL` = inherit whatever the chain resolved so far (ultimately the master schema's own
   `field.label`/`field.type`/`field.options`). Same table as `is_enabled`/`is_required` — one
   row per (org, template, section, field, scope) already carries all policy for that field at
   that tier; no new table.

2. **No one-way ratchet for label/type — closest tier always wins, simple override.** Unlike
   `is_required` (a policy that can only tighten, [[v808]] decision 11), a label or type is a
   presentation/customisation choice, not a governance control. A downstream tier can freely
   relabel or retype a field an ancestor already relabeled/retyped, and can also revert to the
   master's own label/type by clearing its own override (setting the column back to `NULL`).
   `mergeOverrideChain` change: for `label`/`type`/`options`, iterate root→leaf and overwrite
   whenever a tier's entry has a non-null value (leaf-most non-null wins) — no comparison
   against previous state needed, unlike the required ratchet.

3. **Type-change safety: warn, don't block, and reuse the existing usage check.** Changing
   `field_type_override` on a field that already has submitted data
   (`getFormTemplateFieldUsage`, same function `deleteFieldAdditionForOrg` already reuses) does
   not corrupt anything — the underlying stored value in `form_instance_values` is untouched;
   only the *input control* used to display/edit it going forward changes. UI shows a short
   inline warning ("N existing submissions have data in this field — changing its type only
   affects how it's edited going forward, past values are unchanged") when usage exists, but
   the save action itself is never blocked. Matches the existing "visible, explained state, not
   a silent no-op" philosophy from v808 decision 7, applied to a warning instead of a hard gate
   since there's no actual data-loss risk here.

4. **Switching `field_type_override` to `'select'` requires `options_override` to be set in the
   same save.** An override that produces a `select` field with no options renders a useless
   empty dropdown. UI: when the Type-override dropdown is changed to "Select", the existing
   `SelectOptionsEditor` component (already used by both apps' "Add field" forms) appears
   inline and must have at least one non-empty option before the save button is enabled.
   Switching away from `'select'` clears `options_override` back to `NULL` (no orphaned data).

5. **Scope: standard/master fields only, not org-added local fields (`form_template_field_additions`).**
   Per finding #4 — local fields already get free-form label/type at creation; editing them
   post-creation is a distinct, still-out-of-scope feature from v808, not reopened here. The
   Label/Type override controls this plan adds are shown only for catalog rows where
   `item.isLocal` is false (or, in the flat org-only `FormTemplateBuilder.jsx` view, for every
   row — that view never lists local-field rows separately from the catalog to begin with,
   confirmed by re-reading its `catalogFields` derivation, which is sourced from the un-merged
   master schema, not `effectiveSchema`).

6. **Tiered UI: extend `TierFormPolicyPanel.jsx`'s existing per-field row**, not a new
   component. Add a text input ("Label override" — placeholder shows the inherited label,
   e.g. `Impediment ID`) and a select ("Type override" — first option "(inherit — Text)" etc.,
   reflecting whatever the chain has resolved to so far) next to the existing Enabled/Required
   checkboxes. Same immediate-save-on-change UX (no batch Save button), same `busy`/error
   handling pattern already used by `toggleEnabled`/`toggleRequired`.

7. **Org-level UI: extend `FormTemplateBuilder.jsx`'s "Field Behaviour" tab** the same way,
   writing to the `account`-scoped row (`scopeEntityType: null` → defaults to `'account'`,
   matching the existing `handleFieldAvailabilityToggle`/`handleFieldRequiredToggle` call
   shape). Tab heading text updated to mention Label/Type alongside Enabled/Required.

8. **Service layer: two new functions mirroring `setFieldRequiredForOrg`'s shape** —
   `setFieldLabelForOrg({ organisationId, templateId, sectionKey, fieldKey, label, updatedByUserId, scopeEntityType, scopeEntityId })`
   (`label = null` clears the override) and
   `setFieldTypeForOrg({ ..., fieldType, options, ... })` (`fieldType = null` clears both
   `field_type_override` and `options_override` together — an override without a type doesn't
   make sense to keep half-set). Same one-concern-per-call convention already established
   (`setFieldEnabledForOrg`, `setFieldRequiredForOrg` are already separate functions on the same
   table) — not collapsed into one combined call.
   `getFieldOverridesForOrg`'s `select()` extended to also fetch the three new columns.

9. **Translation interaction: unchanged precedence, no new work needed** (finding #5) — a
   translated label for the active language still wins over both the master label and any
   `label_override`; `label_override` only changes what shows when no translation exists for
   that language. Documented, not re-implemented.

## Scope

### Phase 1 — Schema
- `SQL/v815_form_template_field_label_type_override.sql`: add the three columns (Platform +
  Simulator) to `form_template_field_overrides`. No RLS change — same table, same existing
  scope-aware policies from `v812` already gate write access correctly per tier.

### Phase 2 — Service layer
- `formEngineService.js` (Platform, Simulator, and the legacy `src/services/` copy if still
  live — confirm which are actually imported before touching all three): extend
  `getFieldOverridesForOrg`'s select list; add `setFieldLabelForOrg`, `setFieldTypeForOrg`.

### Phase 3 — Merge/filter utils
- `formTemplateFieldOverrides.js` (`packages/shared` + both app-local shadow copies, kept
  byte-identical per existing convention): extend `FieldOverrideEntry` shape to
  `{ enabled, required, label, type, options }`; `buildFieldOverrideMap` reads the three new
  columns; `applySchemaFieldOverrides` applies `field.label = entry.label ?? field.label`,
  `field.type = entry.type ?? field.type`, `field.options = entry.type === 'select' ? (entry.options ?? field.options) : field.options`;
  `mergeOverrideChain` overwrites label/type/options leaf-wins (decision 2, no ratchet);
  `applyTieredSchemaFieldOverrides` picks up the same merged values.
- Unit tests extended: label/type override present/absent/null at a single scope; leaf-wins
  precedence across a 3-tier chain; switching type away from `select` doesn't leak stale
  `options_override` into the merged field.

### Phase 4 — Org-level Builder UI
- `FormTemplateBuilder.jsx` (Platform + Simulator): Label-override input + Type-override select
  (+ conditional `SelectOptionsEditor`) added to each row in the "Field Behaviour" tab, wired to
  the new service functions, immediate save, usage-based warning (decision 3) via the already-
  fetched `fieldKeysInUse` set.

### Phase 5 — Tiered UI
- `TierFormPolicyPanel.jsx` (`packages/ui` shared copy + both app-local shadow copies): same
  controls added to its per-field row, scoped to the current tier, read-only display of what
  ancestor tiers already set (mirroring how `ancestorMergedMap`/`ancestorRequired` already
  surface ancestor state for Required today) — an inherited label/type override from an
  ancestor tier shows as the pre-filled placeholder, not an editable ancestor value.

### Phase 6 — Parity + docs
- Ships to Platform + Simulator together (rule 34.1).
- Extend `Documentation/Form_Template_Org_Field_Customisation_And_Tier_Cascade_Guide.md`
  (already covers the required/enabled/additions/examples cascade end-to-end) with a Label/Type
  override section, rather than a new standalone doc.

## Explicitly out of scope
- Editing label/type on an org-added local field (`form_template_field_additions`) after its
  initial creation — still v1-scoped as add/delete only, per v808, not reopened here.
- Fixing the `FormEdit.jsx` override-application gap found in Research #6 — flagged as a
  separate pre-existing issue, not part of this plan's goal.
- Any change to the Admin app — this is Platform/Simulator `form_template` domain only, same
  boundary v808 already drew.

## Todo
- [x] Confirm design decisions #1–9 with the user before building
- [x] Phase 1: SQL migration (`v815`, both schemas)
- [x] Phase 2: service layer (`setFieldLabelForOrg`, `setFieldTypeForOrg`, extended select)
- [x] Phase 3: merge/filter utils + tests (shared + both shadow copies)
- [x] Phase 4: org-level Builder UI (`FormTemplateBuilder.jsx`, both apps)
- [x] Phase 5: tiered UI (`TierFormPolicyPanel.jsx`, shared + both shadow copies)
- [x] Phase 6: parity check + documentation update
- [x] Extra (raised mid-build by user, in scope): lock the Field Key input in the master
      **Fields** tab (`SortableFieldCard`) once a field is standard/published — Label and Type
      stay editable there, only the key (the cross-table join key) is frozen.

## Review

**Status: complete.**

Implemented exactly as designed decisions 1–9 describe, plus one additional fix raised mid-build:
the master **Fields** tab (`FormTemplateBuilder.jsx`'s `SortableFieldCard`) let staff edit a
standard/published field's Key freely — risky, since `field_key` is the join key used by
overrides, additions, translations, and submitted-data usage tracking everywhere else in the
system. Now disabled via the same `!field.isNew` flag already used to gate the Delete button;
Label and Type remain editable there as before. This wasn't part of the original v815 scope but
was a directly-requested fix during implementation, not scope creep.

**What shipped:**
- `SQL/v815_form_template_field_label_type_override.sql` — `label_override`, `field_type_override`,
  `options_override` on `form_template_field_overrides` (Platform + Simulator). **Not yet applied
  to Supabase — run this migration before testing.**
- `setFieldLabelForOrg`/`setFieldTypeForOrg` in both apps' `formEngineService.js`, with the
  select-to-empty-options guard rejected server-side, not just in the UI.
- `getFieldLabelForOrg`/`getFieldTypeForOrg` added to `formTemplateFieldOverrides.js`
  (byte-identical across `packages/shared` + both app shadow copies); `mergeOverrideChain`,
  `applySchemaFieldOverrides`, and `applyTieredSchemaFieldOverrides` all extended to carry
  label/type/options — leaf-wins, no ratchet, confirmed by 12 new unit tests (31 total, all pass).
- Org-level UI in `FormTemplateBuilder.jsx`'s Field Behaviour tab and tier-level UI in
  `TierFormPolicyPanel.jsx` (byte-identical across `packages/ui` + both app shadow copies) —
  Label input (save on blur), Type dropdown (save on change, inline options editor + Apply/Cancel
  when overriding to Select), usage warning banner when the field already has submitted data.
- 10 new service-layer unit tests (5 per app, all pass) plus the 12 merge-util tests above.
- `Documentation/Form_Template_Org_Field_Customisation_And_Tier_Cascade_Guide.md` extended with
  a "Label & Type overrides (v815)" section and an updated code-location table.

**Verified, not assumed:** all edited files pass an esbuild syntax check; `diff` confirms every
byte-identical shadow-copy set stayed identical after edits (only the pre-existing, unrelated
`sim`-schema table-naming difference in `resolveEntityPolicyChain` and `FormTemplateBuilder.jsx`'s
pre-existing auth-block divergence remain — both predate this plan and were left untouched per
CLAUDE.md rule 32); all four affected test suites pass with zero regressions.

**Left for the user:** apply `SQL/v815_form_template_field_label_type_override.sql` to Supabase
(Platform + Simulator schemas), then exercise the new controls in the browser — this session had
no DB/browser access to do that verification itself.
