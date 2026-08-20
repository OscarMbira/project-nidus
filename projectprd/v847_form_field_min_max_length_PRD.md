# PRD: Form field min/max character length (tier cascade) — v847

## a) Problem statement

Project / Portfolio / Programme / PMO admins can already enable, require, relabel, and retype fields on shared form templates via the tier cascade (`form_template_field_overrides` + `TierFormPolicyPanel`). They cannot set **minimum or maximum character length** for text-like fields. Without that, SaaS orgs cannot enforce simple input limits (e.g. quality notes ≤ 500 characters) at the right tier without editing the global form master.

## b) Solution

Add **nullable min/max length overrides** on the existing tier override layer, merge them through Org → Portfolio → Programme → Project with a **tighten-only ratchet**, configure them in the **Customise** tab of `TierFormPolicyPanel` (and org-level Field Behaviour where type is already editable), and **enforce at form submit** using the effective schema.

## c) User stories

1. As a PMO admin, I can set min and/or max characters on a **text** or **textarea** field for my organisation’s form policy.
2. As a Portfolio / Programme / Project manager, I can set min/max for those field types on my tier’s Form Templates / Field Behaviour surface.
3. As a user at a child tier, I inherit ancestor min/max when I leave the inputs blank.
4. As a user at a child tier, I can only **tighten** (raise min, lower max) relative to the effective ancestor values — never loosen.
5. As a form filler, if my answer is shorter than min or longer than max (when set), submit is blocked with a clear field-level message.
6. As a manager adding a **local field** (text/textarea) at my tier, I can set min/max on that field definition.
7. As a PM on Project Form Templates **Customise** tab, I see Min / Max inputs next to Input type for text/textarea; Non-customise tab stays simple (Show / Required / Type column / Local Field).
8. Simulator has the same behaviour (`sim` schema + same UI).

## d) Implementation decisions (agreed)

| # | Decision |
|---|----------|
| 1 | Types: **text** and **textarea** only (character length). Number/money min/max *value* is out of scope. |
| 2 | Storage: `min_length_override INT NULL`, `max_length_override INT NULL` on `public` + `sim.form_template_field_overrides`. |
| 3 | Ratchet: tighten-only (raise min / lower max); extend v813-style trigger + UI disable/clamp. |
| 4 | Local additions: min/max in `field_definition` JSON for tier-added fields. |
| 5 | Enforcement: form fill/submit validation on effective schema (not UI-only). |
| 6 | UI: Customise tab — Min / Max next to Input type; blank = inherit. |
| 7 | Platform + Simulator parity. |

Additional settled details:

- `NULL` override = inherit; explicit integer ≥ 0 is an override. `max` must be ≥ `min` when both set at the same tier.
- Effective type drives visibility of Min/Max (only when effective type is text/textarea — including after a type override to those types).
- Merge lives in `formTemplateFieldOverrides.js` alongside label/type merge.
- Service helpers mirror `setFieldLabelForOrg` / `setFieldTypeForOrg` (e.g. `setFieldLengthForOrg`).

## e) Testing decisions

- Unit: merge of min/max through a multi-tier chain; ratchet reject cases; validation helper for too-short / too-long / inherit.
- Unit: UI/service mapping when type is not text/textarea (lengths ignored or cleared).
- Manual: PMO sets max=100 → Project cannot set max=200; Project can set max=50; submit enforces; Simulator smoke.

## f) Out of scope

- Min/max **numeric value** for number/money/date fields.
- Regex / pattern validation.
- Changing the shared form master schema in Admin Global Template Library as the only way to set lengths.
- Retrofitting every historical form instance (enforcement applies to new/edited submits going forward).

## g) Further notes

- Docs: extend `Documentation/Form_Template_Org_Field_Customisation_And_Tier_Cascade_Guide.md`.
- SQL version: `v847_*` (after v846).
- Keep SaaS UX: Non-customise tab unchanged; lengths only on Customise.
