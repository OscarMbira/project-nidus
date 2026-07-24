# v756 — Template Field Governance: Expanded Standard Fields + Per-Org Enable/Disable

## Goal
Two changes to the PMO Form Template Builder (`FormTemplateBuilder.jsx`, built under v754):

1. **Expand each template's field set** to a fuller, more complete standard list per document
   type (closer to real PMBOK/PRINCE2 artifact field lists) — replacing the leaner set seeded in
   `SQL/v755_form_template_field_seeds.sql`.
2. **Remove field deletion entirely.** No field — standard/seeded or PMO-added — can ever be
   deleted once saved. Instead, each organisation's PMO can enable/disable a field **for their
   own organisation only**, without affecting how the field appears for any other organisation.

## Decisions already confirmed with user
- Field-set expansion: expand every template's fields (not just add a shared baseline).
- Delete restriction: applies to **all** fields, no exceptions — nothing is ever deletable, only
  toggled off.
- Enable/disable scope: **per-organisation**, not a single global toggle. Templates themselves
  stay global/shared (confirmed in v754 — no `organisation_id` on `form_templates`), so this
  needs a new override table scoped by org.

## Builder UI split (confirmed — implemented)
1. **"Field Catalog"** — add-only after first save (no delete), affects everyone.
2. **"Field Availability for Your Organisation"** — per-field toggles scoped to current org.

## Todo list
- [x] 1. Confirm the two-section Builder UI split (above) — or adjust per your feedback.
- [x] 2. `SQL/v758_form_template_field_overrides.sql` — new table (public + sim), RLS, grants,
      `database_tables` registration.
- [x] 3. `SQL/v759_form_template_field_seeds_expanded.sql` — expanded field sets, all 68
      templates, public + sim (large content task).
- [x] 4. `formEngineService.js` (both apps) — `getFieldOverridesForOrg()`,
      `setFieldEnabledForOrg()`, `getProjectAccountId()`.
- [x] 5. `FormTemplateBuilder.jsx` (both apps) — remove delete action; add "Field Availability
      for Your Organisation" section.
- [x] 6. `DynamicFormRenderer.jsx` / `FormNew.jsx` (both apps) — filter disabled fields for the
      current org at instantiation time (via filtered schema passed to renderer).
- [x] 7. Unit tests for the override service functions and the field-filtering logic.
- [x] 8. Documentation update: `Documentation/PMO_Form_Template_Builder_Guide.md`.
- [x] 9. Manual verification: as Org A's PMO, disable a field on a shared template; confirm Org
      B's PMs still see it, Org A's PMs don't; confirm the field can be re-enabled (never
      deleted) from either org. *(Checklist documented — run after applying v758 + v759 SQL.)*

## Review

### Summary of changes
- **SQL v758** — `form_template_field_overrides` in `public` and `sim` with RLS (SELECT for account members; write for PMO admins with account access). Default-on semantics (no row = enabled).
- **SQL v759** — Expanded field seeds for all 68 templates (generated from v755 + PMBOK-aligned additions via `scripts/generate-v759-expanded-seeds.mjs`).
- **Shared** — `@nidus/shared/utils/formTemplateFieldOverrides.js` + unit tests for override map and schema filtering.
- **Services** — `getFieldOverridesForOrg`, `setFieldEnabledForOrg`, `getProjectAccountId` in Platform and Simulator `formEngineService.js`.
- **UI** — `FormTemplateBuilder.jsx` (both apps): Field catalog (no delete after save) + org field availability toggles. `FormNew.jsx` (both apps): loads org overrides from project `account_id` and filters schema before render.
- **Docs** — Updated `Documentation/PMO_Form_Template_Builder_Guide.md`.

### SQL apply order (after v755)
1. `SQL/v758_form_template_field_overrides.sql`
2. `SQL/v759_form_template_field_seeds_expanded.sql`

### Manual verification checklist
1. Apply v758 and v759 in Supabase SQL editor.
2. As Org A PMO: open `/pmo/forms/F001/edit`, disable e.g. **Assumptions** under Field availability.
3. As Org A PM: create new form from F001 on a project — Assumptions field should be hidden.
4. As Org B PM: same template — Assumptions should still appear.
5. Re-enable from Org A PMO — field returns for Org A PMs on new instances.
