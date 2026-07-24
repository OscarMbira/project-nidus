# v770 — Form Template Defaults: Guidance + Sample Content

**Status:** In progress  
**Repo:** monorepo (`E:\project-nidus`)  
**Depends on:** `v761` (defaults table), `v768` (instructional seed already applied)

## Problem
`v768` seeded **instruction text** into `default_value`. That text now pre-fills the Default Content tab (and new form instances). Users still need those instructions as guidance, but also need **realistic sample content** they can copy and customise.

## Approach (both coexist)
| Concern | Storage | Used when |
|---------|---------|-----------|
| **Guidance** — how to complete the field | `guidance_text` (new column) | Default Content tab + help text on new form instances |
| **Sample default** — copy-ready content | `default_value` (existing) | Pre-fills new form instances; editable on Default Content tab |

Canonical demo project for samples: **"Nidus Digital Workplace Platform"** (cross-industry, easy to customise).

## Deliverables
- [x] Plan (this file)
- [x] SQL `v770_form_template_field_defaults_guidance.sql` — add `guidance_text`
- [x] SQL `v770b_form_template_sample_content_seed.sql` — move instructional text → guidance; seed sample defaults (Platform + Simulator)
- [x] Shared helpers + unit tests
- [x] `formEngineService` read/write (Platform + Simulator)
- [x] Default Content UI: edit Guidance + Sample (Platform + Simulator)
- [x] Form renderers: show `field.help` / guidance under labels
- [x] FormNew: load guidance onto schema; keep sample in values
- [x] Documentation + review

## Out of scope
- Industry-specific multi-pack picker (future)
- Changing template field schemas themselves

## Review
**Status:** COMPLETE

### What changed
1. Added `guidance_text` on `public`/`sim.form_template_field_defaults`.
2. Seeded dual content: instructions in guidance; **Digital Workplace Platform** samples in `default_value` (rich F001 + generated samples for other process-group templates).
3. Default Content tab now edits **Guidance** and **Sample default** separately.
4. New form instances pre-fill from samples and show guidance as help under labels.
5. Docs: `Documentation/Form_Template_Guidance_And_Sample_Defaults.md`.

### Apply
`v770` → `v770b` in Supabase (after `v761`). Refresh Default Content on F001.
