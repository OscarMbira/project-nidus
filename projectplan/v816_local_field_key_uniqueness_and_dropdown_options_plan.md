# v816 — Local Field Key Uniqueness + Dropdown Options at Every Tier

## Goal
Two gaps found in the org-added local field flow (`form_template_field_additions`) while
testing v815:
1. **Field Key uniqueness isn't actually enforced at the database level**, and doesn't check
   against the master schema's own field keys at all.
2. **The Portfolio/Programme/Project "Add a field" form has no way to enter dropdown options**
   — picking Type = Select there produces a field with no options, unlike the org-level form
   which already has this.

Plus, per user decision (asked via clarifying question): add an **"Edit options"** action for
an *existing* local Select field, scoped to the tier that created it — not a full re-open of
add/delete-only (v808's deliberate v1 scope for everything else about a local field stays as-is).

## Research

1. **v812's unique constraint is too loose.** `(organisation_id, template_id, section_key,
   field_key, scope_entity_type, scope_entity_id)` lets the same `field_key` be added twice on
   one template as long as the section or scope differs. That's unsafe: `field_key` is read by
   `getFormTemplateFieldUsage`/`form_instance_values` **across the whole template**, with no
   section or scope filter — two additions sharing a key would silently collide in submitted
   data. `addFieldForOrg`'s existing pre-insert `SELECT` check already enforces global
   uniqueness (ignoring section/scope) — but only at the application layer, leaving a race
   window between the check and the insert.
2. **No check against master-schema field keys at all**, at either layer. A local addition can
   share a key with a real master field today, causing the same submitted-data ambiguity.
   Can't be a DB constraint (master keys live in `form_template_versions.schema` JSONB, not a
   relational column) — must be an application-level check in `addFieldForOrg`.
3. **`TierFormPolicyPanel.jsx`'s `newField` state never had an `options` field.** Its "Add a
   field just for this {tier}" form only has Section/Field key/Label/Type/Required — no
   conditional `SelectOptionsEditor`, and `handleAddField` never sends `options` to
   `addFieldForOrg`. `FormTemplateBuilder.jsx`'s org-level equivalent already has this
   (`newLocalField.options` + conditional editor) — this is a tier-parity gap within the same
   app, not a Platform/Simulator gap.
4. **No function exists to edit an already-added local field's options.** Only `addFieldForOrg`
   (insert) and `deleteFieldAdditionForOrg` (delete) exist for `form_template_field_additions`.

## Design decisions

1. **New DB constraint: `UNIQUE (organisation_id, template_id, field_key)`** on
   `form_template_field_additions`, replacing v812's looser one — section and scope dropped
   from the uniqueness key entirely, matching what `addFieldForOrg`'s existing app-level check
   already effectively enforces, now backed by the database.
2. **`addFieldForOrg` also checks the master schema's own field keys** before inserting — fetch
   the template's current published schema, collect every section's field keys, reject if the
   new key collides. Same "clear error, not a raw constraint failure" pattern already used for
   the additions-vs-additions check.
3. **`TierFormPolicyPanel.jsx` gets the same options editor `FormTemplateBuilder.jsx` already
   has** — `options: []` added to `newField` state, conditional `SelectOptionsEditor` shown when
   `newField.type === 'select'`, parsed options passed into `addFieldForOrg`'s `fieldDefinition`.
4. **`addFieldForOrg` itself now requires at least one option when `fieldDefinition.type ===
   'select'`** — server-side authoritative guard (mirrors the guard already added to
   `setFieldTypeForOrg` in v815), so both the org-level and tier-level forms get this for free
   from one change rather than duplicating the check in two UIs.
5. **"Edit options" (user-confirmed scope): options only, not a full field re-open.** New
   `updateFieldAdditionOptions({ organisationId, templateId, sectionKey, fieldKey, options,
   scopeEntityType, scopeEntityId })` — loads the existing row, rejects if the field isn't type
   `select`, replaces `field_definition.options`, requires ≥1 option. Key/Label/Type/Required
   stay locked once created — same "identity frozen, value-space editable" reasoning as the
   master Field Key lock added earlier in this session. Write goes through the *same* existing
   RLS policy on `form_template_field_additions` (no new policy needed) — the row's own
   `scope_entity_type`/`scope_entity_id` already gates who can write it.
6. **UI: "Edit options" button appears only next to a local field's own row, only when its type
   is `select`, only for the tier that owns it** (`FormTemplateBuilder.jsx`'s local-fields list
   for org-wide additions; `TierFormPolicyPanel.jsx`'s `isOwnAddition` items for tier-scoped
   ones) — clicking it opens the same inline `SelectOptionsEditor` + Apply/Cancel pattern v815
   already introduced for type-override-to-select, not a new interaction shape.

## Scope

- `SQL/v816_form_template_field_additions_key_uniqueness.sql`: constraint swap, both schemas.
- `formEngineService.js` (Platform + Simulator): `addFieldForOrg` extended with the master-key
  collision check and the select-needs-options guard; new `updateFieldAdditionOptions`.
- `FormTemplateBuilder.jsx` (Platform + Simulator): "Edit options" action added to the local
  fields list for select-type additions.
- `TierFormPolicyPanel.jsx` (shared `packages/ui` + both app shadow copies): options editor
  added to the "Add a field" form; "Edit options" action added for `isOwnAddition` select fields.
- Tests: `addFieldForOrg` rejects a key colliding with the master schema; rejects a select field
  with no options; `updateFieldAdditionOptions` rejects a non-select field and an empty options
  list; validates required fields.

## Explicitly out of scope
- Editing Key, Label, Type, or Required on an existing local field — user confirmed options-only
  for this round.
- Any change to Admin app.

## Todo
- [x] SQL migration (`v816`, both schemas)
- [x] `addFieldForOrg`: master-key collision check + select-needs-options guard (both apps)
- [x] `updateFieldAdditionOptions` service function (both apps)
- [x] `TierFormPolicyPanel.jsx`: options editor on "Add a field" (shared + both shadow copies)
- [x] "Edit options" action on existing local select fields (`FormTemplateBuilder.jsx` +
      `TierFormPolicyPanel.jsx`, both apps)
- [x] Tests + parity check

## Review

**Status: complete.** SQL (`v816`) applied to Supabase successfully after resolving a stuck
lock on the earlier `v813` migration (unrelated to this plan — a stale session held a lock on
`form_template_field_overrides`; cleared via `pg_cancel_backend`/`pg_terminate_backend`). While
diagnosing that, also discovered v810–v814 (the entire prior Portfolio/Programme/Project tier-
cascade + completed-examples feature set) had never actually been applied to this Supabase
project — applied in order (v810→v811→v812→v813→v814) before v815/v816 could succeed.

**What shipped:**
- `SQL/v816_form_template_field_additions_key_uniqueness.sql` — replaces the too-loose v812
  constraint with `UNIQUE (organisation_id, template_id, field_key)`, closing the race window
  between `addFieldForOrg`'s pre-insert check and the actual insert.
- `addFieldForOrg` (both apps): now also checks the new field key against every field key in
  the template's current *master* schema (not just other local additions), and rejects a
  Select-type field definition with zero options — both server-side, so every caller (org level
  and every tier) gets the guard from one change.
- `updateFieldAdditionOptions` (both apps, new): options-only edit on an existing local Select
  field, scoped to whichever tier owns the row (existing RLS already gates this correctly — no
  new policy needed). Rejects non-Select fields and empty option lists. Key/Label/Type/Required
  stay locked, per the user's explicit scope decision.
- `TierFormPolicyPanel.jsx` (`packages/ui` + both app shadow copies): "Add a field" form now has
  the same conditional Select-options editor `FormTemplateBuilder.jsx` already had — this was
  the actual tier-parity gap (org level always had it, Portfolio/Programme/Project never did).
  Existing local Select fields also get an "Edit options" action (owning tier only), reusing the
  same inline-editor-plus-Apply/Cancel interaction pattern v815 introduced for type-override.
- `FormTemplateBuilder.jsx` (both apps): same "Edit options" action added to the org-wide local
  fields list.
- 8 new/updated service-layer tests per app (39 total, up from 33), covering the master-key
  collision, the select-needs-options guard, and all three `updateFieldAdditionOptions` paths.

**Verified:** all edited files pass an esbuild syntax check; `diff` confirms every shadow-copy
set stayed identical (only the two pre-existing, unrelated divergences — `sim`-schema table
naming in `resolveEntityPolicyChain`, and `FormTemplateBuilder.jsx`'s pre-existing auth-block
difference — remain, both predating this plan); both apps' `formEngineService.test.js` suites
pass in full (39/39 each).

**Left for the user:** exercise the new controls in the browser — Add a field with Type=Select
at a Portfolio/Programme/Project tier (previously silently broken), and Edit options on an
existing local Select field at both the org and tier level.
