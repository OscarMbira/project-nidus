# v782 — Form template new-instance pre-fill: fall back to admin-curated sample content

**Repo:** `E:\project-nidus` (Platform + Simulator monorepo)
**Companion plan (originating feature, Admin-side UI):** `E:\project-nidus-admin\projectplans\v185_default_content_library_plan.md`
**Related but distinct:** `E:\project-nidus\projectplan\v783_pm_hierarchy_creation_time_inheritance_plan.md` — that plan covers the separate Global→PMO→Portfolio/Programme/Project *tier* inheritance system (`pm_template_nodes`); this plan is about Form Template *field default values* only. Don't conflate the two mechanisms.
**Status:** ✅ Complete (100%)

## The gap, precisely

`apps/platform/src/pages/forms/FormNew.jsx` pre-fills a new form instance's field values by calling:

```js
const defaults = await getFieldDefaultsForOrg(organisationId, template.id, mode)
const defaultValues = buildDefaultValuesMap(defaults.data, enabledSchema)
```

`buildDefaultValuesMap` previously only read from `rows` — the organisation-scoped `form_template_field_defaults` table. It never looked at the template's own `schema.sections[].fields[].sample` (Admin-curated content).

Net effect: admin-curated sample content was **invisible to real PMs** unless their organisation had separately populated org-level defaults.

Contrast: the **export/guidance merge logic** already did `example = org.default_value OR schema.field.sample`. Live pre-fill now matches that rule.

## Fix

- [x] `buildDefaultValuesMap(rows, schema, { fallbackToSchemaSample = true } = {})` — fall back to `field.sample` when no org row.
- [x] Same for `buildGuidanceValuesMap` → `field.help` (`fallbackToSchemaHelp = true`).
- [x] Canonical copy in `packages/shared`; Platform + Simulator app copies kept in binary sync. Callers import `@nidus/shared/utils/formTemplateFieldDefaults`.
- [x] No SQL/table change.
- [x] `FormNew.jsx` (Platform + Simulator): apply `buildDefaultValuesMap` even when org defaults are empty / fetch failed (still uses template schema samples; never invents values).

## Where this changes behaviour

- [x] `FormNew.jsx` (Platform + Simulator) — new form instance pre-fill.
- [x] `FormTemplateBuilder.jsx` (Platform + Simulator) — Default Content / guidance maps pick up the same fallback automatically.

## Explicitly out of scope
- Not changing `form_template_field_defaults` — org-set defaults still always win.
- Not auto-copying admin samples into every org's defaults table (runtime fallback stays fresh).

## Testing (rule 23/43)

- [x] Unit test: empty `rows` + schema `sample` → returns the sample.
- [x] Unit test: org override wins over schema sample.
- [x] Unit test: neither present → field absent from the returned map.
- [x] Guidance: empty rows + `field.help` → returns help; opt-out via `fallbackToSchemaHelp: false`.
- [x] FormNew-style smoke: empty org defaults + curated F001-like `purpose` sample/help → pre-fills purpose only.
- [x] `pnpm exec vitest run src/utils/__tests__/formTemplateFieldDefaults.test.js` in `packages/shared`.
- [x] Manual path covered by automated FormNew-style smoke (operator UI smoke optional after deploy).

## Review

**Completed 2026-07-20 · Closed to 100% 2026-07-21.**

### Changes
- `packages/shared/src/utils/formTemplateFieldDefaults.js` — schema sample/help fallback (default on).
- Mirrored identically in `apps/platform` and `apps/simulator` utils copies.
- `FormNew.jsx` (both apps): always run pre-fill map (empty org rows → schema sample).
- Docs: `Documentation/Form_Template_Guidance_And_Sample_Defaults.md` — Live new-instance pre-fill (v782).
- Tests extended in `packages/shared/src/utils/__tests__/formTemplateFieldDefaults.test.js`.

### Behaviour
Org `form_template_field_defaults` still win. When absent, Admin-published `field.sample` / `field.help` pre-fill new instances and guidance maps — aligning live create with export merge rules.
