# Plan: Form field min/max character length (tier cascade) — v847

**PRD:** `projectprd/v847_form_field_min_max_length_PRD.md`  
**Status:** Implemented

## Goal

Allow text/textarea fields on shared form templates to carry **min/max character length** overrides at Org / Portfolio / Programme / Project, with tighten-only cascade and submit-time enforcement. Platform + Simulator.

## Todos

- [x] **SQL v847** — Add `min_length_override` / `max_length_override` (nullable INT) to `public` + `sim.form_template_field_overrides`; comments; CHECK (`max IS NULL OR min IS NULL OR max >= min`) at row level when both non-null.
- [x] **Ratchet trigger** — Extend `trg_form_template_field_overrides_ratchet` (public + sim) so descendants cannot lower min or raise max vs ancestor effective lengths.
- [x] **Merge utils** — Update `formTemplateFieldOverrides.js` (`buildFieldOverrideMap` / `mergeOverrideChain` / `applyTieredSchemaFieldOverrides`) to resolve effective `minLength` / `maxLength` on fields.
- [x] **Services** — Add `setFieldLengthForOrg` (platform + simulator `formEngineService`); wire reads already covered by override fetch.
- [x] **Local additions** — Support `minLength` / `maxLength` on `field_definition` when adding local text/textarea fields in `TierFormPolicyPanel` / builder paths.
- [x] **UI Customise tab** — Min / Max number inputs next to Input type when effective type is text/textarea; blank = inherit; show ancestor effective as placeholder; client tighten checks.
- [x] **Org builder** — Same Min/Max controls on Form Template Builder Field Behaviour (org layer) for parity with label/type.
- [x] **Validation** — Extend `formValidation.js` (and FormEdit submit path) to enforce effective min/max on text/textarea values.
- [x] **Tests** — Unit tests for merge, length helpers, and length validation; update override equality expectations.
- [x] **Docs** — Update `Documentation/Form_Template_Org_Field_Customisation_And_Tier_Cascade_Guide.md` + short `Documentation/Form_Field_Min_Max_Length_v847.md`.
- [x] **Review section** — Filled below.

## Modules touched

| Area | Files |
|------|-------|
| SQL | `SQL/v847_form_template_field_min_max_length.sql` |
| Merge | `packages/shared/src/utils/formTemplateFieldOverrides.js` (+ app copies) |
| Validate | `packages/shared/src/utils/formValidation.js` (+ app copies), `FormEdit.jsx` |
| Service | `apps/platform` + `apps/simulator` `formEngineService.js` |
| UI | `packages/ui` + app `TierFormPolicyPanel.jsx`, `FormTemplateBuilder.jsx` |
| Docs | Guide + v847 note |

## Manual check

1. Org sets max=100 on a textarea → Portfolio sees placeholder 100 → Project sets max=50 OK, max=200 rejected.
2. Fill form: 51 chars when max=50 → blocked with message.
3. Non-customise tab: no Min/Max clutter.
4. Simulator equivalent path.

## Review

Implemented end-to-end for Platform and Simulator:

1. **SQL v847** adds nullable `min_length_override` / `max_length_override`, row CHECK, and extends the existing ratchet trigger so descendants cannot loosen ancestor bounds.
2. **Merge** resolves tighten-only effective lengths onto schema fields (including master base lengths and local addition `field_definition`).
3. **`setFieldLengthForOrg`** upserts both bounds; blank clears inherit.
4. **UI** Min/Max on Customise (tier panel) and Field Behaviour (org builder); local text/textarea create includes optional lengths.
5. **Submit** uses `validateSchemaFields` (required + length) in `FormEdit`.
6. **Tests** cover merge tighten behaviour and length validation messages.

**Apply** `SQL/v847_form_template_field_min_max_length.sql` in Supabase before using the new columns in production.
