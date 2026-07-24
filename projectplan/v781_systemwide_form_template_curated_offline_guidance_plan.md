# v781 — System-wide curated offline completion instructions (Platform + Simulator)

**Repo:** `E:\project-nidus`  
**Companion (Admin):** `E:\project-nidus-admin\projectplans\v179_systemwide_form_template_curated_offline_guidance_plan.md`  
**Related:** Admin `v178` (generics), monorepo `v770`/`v770b`, `v780` (export merge)  
**Status:** ✅ Complete — curated content for **all** F001–F068 (555 fields)

## Problem

Export layout worked; non-F001 content was generic boilerplate (Admin v178 + monorepo v770b). F004/F050 PDFs showed label-echo instructions only.

## Goal

Field-specific completion instructions + examples on every form template field, Admin + Platform + Simulator, editable via existing Admin `help`/`sample` and org Default Content.

## Decisions (approved)

1. Apply to **all** templates (not wave-by-wave delivery).
2. Overwrite **boilerplate** org guidance only; preserve custom text.
3. Curate Examples for fields (text/textarea/select/date/number).
4. Admin seed + monorepo schema/org upsert; Publish recommended after Admin seed.

## What shipped

| Artifact | Purpose |
|----------|---------|
| `scripts/v781_build_curated_guidance_seeds.mjs` | Regenerates Admin + monorepo seeds from v759 field inventory + curated overrides |
| `SQL/v781_form_template_curated_offline_guidance_seed.sql` | Patch `public`/`sim` schema help/sample; upsert org defaults |
| `SQL/v781b_curated_guidance_boilerplate_smoke.sql` | Expect 0 leftover boilerplate rows |
| Admin `SQL/v179_…` + `v179b_…` | Global library payload help/sample for all form_templates |
| Tests | `v781CuratedGuidanceSamples.test.js` (F004/F050 + anti-boilerplate) |
| Docs | `Documentation/Form_Template_Guidance_And_Sample_Defaults.md` |

Hand-curated overrides included for **F001**, **F004**, **F050**; remaining fields use semantic key/label/type rules (never the banned one-liners).

## Apply order

1. Admin: `SQL/v179_global_form_template_curated_guidance_seed.sql`
2. Admin: `SQL/v179b_curated_guidance_boilerplate_smoke.sql` (expect 0)
3. Admin: Publish form templates (if orgs sync from Global Library)
4. Monorepo: `SQL/v781_form_template_curated_offline_guidance_seed.sql`
5. Monorepo: `SQL/v781b_curated_guidance_boilerplate_smoke.sql` (expect 0)
6. Re-export F004 / F050 Plain Template (Admin + Platform) and confirm instructions are field-specific

## Review

System-wide curated offline guidance content is in place for all 68 templates (555 fields) across Admin Global Library and Platform/Simulator schema + org defaults. Export plumbing unchanged (v178/v780); this delivery replaces the content gap.
