# Form Template Guidance and Sample Defaults

## Overview
Per-organisation **Default Content** supports two concerns:

| Concept | Column | Purpose |
|---------|--------|---------|
| **Guidance** | `guidance_text` | Instructions for on-screen help **and** offline template exports |
| **Sample default** | `default_value` | Pre-fills new form instances; Plain export shows `Example: …` |

## Apply order
1. `SQL/v761_form_template_field_defaults.sql` (table)
2. `SQL/v770_form_template_field_defaults_guidance.sql` (adds `guidance_text`)
3. `SQL/v770b_form_template_sample_content_seed.sql` (migrates instructions + seeds samples — **generics superseded**)
4. **`SQL/v781_form_template_curated_offline_guidance_seed.sql`** — curated help/sample for **all** F001–F068 (schema + org defaults, public + sim)
5. `SQL/v781b_curated_guidance_boilerplate_smoke.sql` — expect 0 leftover boilerplate rows

Admin companion (apply on Admin DB, then Publish form templates if you rely on sync):

1. `E:\project-nidus-admin\SQL\v179_global_form_template_curated_guidance_seed.sql`
2. `E:\project-nidus-admin\SQL\v179b_curated_guidance_boilerplate_smoke.sql`

Generator (regenerate seeds after schema field changes): `scripts/v781_build_curated_guidance_seeds.mjs`

## Quality bar
Guidance must be field-specific and actionable. **Rejected** patterns (must not appear after v781/v179):

- `Briefly complete "…". Be specific and factual so the form can be understood offline…`
- `Complete … for … (F0xx). Align with organisational standards…`

## UI
- **Default Content** tab: edit Guidance and Sample default per field, then **Save defaults**.
- **New form** instances: sample values pre-fill inputs; guidance appears as help text under the field label.
- **Export** (Form Template Builder header): **Plain Template** (blank + guidance + examples) or **Completed (Sample)** across PDF / Word / Excel / PPT / CSV / XML / JSON / Print.

## Offline export merge rule
```
description = org.guidance_text (if non-empty) OR schema.field.help OR ''
example (Plain only) = org.default_value OR schema.field.sample
```

Helpers: `@nidus/shared/utils/formTemplateExportUtils`. Rendering: `@nidus/shared/utils/exportUtils`.

## Live new-instance pre-fill (v782)
Same merge order as export for values/guidance maps:

```
default value = org.default_value OR schema.field.sample
guidance      = org.guidance_text OR schema.field.help
```

Implemented in `buildDefaultValuesMap` / `buildGuidanceValuesMap` (`@nidus/shared/utils/formTemplateFieldDefaults`). Org rows always win; schema fallback is on by default.

Admin authoring / coverage dashboard: see Admin `Documentation/Default_Content_Library_Guide.md` (v185).

## Behaviour notes
- Clearing **both** guidance and sample, then saving, deletes the defaults row.
- Clearing only the sample stops pre-fill while keeping instructions.
- v781 org upsert **overwrites boilerplate** guidance only; custom org text is preserved.
- Platform (`public`) and Simulator (`sim`) stay at parity.

## Related Admin Global Templates
See Admin `Global_Template_Export_Guide.md` and plans `v179` / monorepo `v781`.
