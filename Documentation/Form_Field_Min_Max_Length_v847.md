# Form field min/max character length (v847)

## Summary

Shared form template **text** and **textarea** fields support per-tier **minimum** and
**maximum character length** overrides. Bounds tighten down the Org → Portfolio → Programme →
Project chain (raise min, lower max). Effective lengths are enforced when a form is submitted.

## Database

Apply `SQL/v847_form_template_field_min_max_length.sql` (Platform `public` + Simulator `sim`):

| Column | Meaning |
|--------|---------|
| `min_length_override` | NULL = inherit; non-null must be ≥ ancestor effective min |
| `max_length_override` | NULL = inherit; non-null must be ≤ ancestor effective max |

Row CHECK: when both are set, `max >= min`. The existing ratchet trigger
(`trg_form_template_field_overrides_ratchet`) was extended to reject loosening writes.

## App behaviour

| Layer | Behaviour |
|-------|-----------|
| Merge | `formTemplateFieldOverrides.js` — `coalesceLength`, `tightenMinLength` / `tightenMaxLength`, `getFieldLengthForOrg`, chain merge + apply |
| Service | `setFieldLengthForOrg` (Platform + Simulator `formEngineService.js`) |
| UI | **Fields** tab on Form Template Builder (master schema `minLength`/`maxLength`, PMO); **Field Behaviour** org overrides; Min/Max columns on `TierFormPolicyPanel` (Portfolio/Programme/Project); local text/textarea via `updateFieldAdditionLength` |
| Submit | `validateSchemaFields` in `FormEdit` |

## Manual check

1. Org sets max=100 on a textarea → Project can set max=50; max=200 is rejected.
2. Submit with 51 characters when max=50 → blocked with a field error.
3. Non-customise tab does not show Min/Max.
4. Same path works in Simulator.
