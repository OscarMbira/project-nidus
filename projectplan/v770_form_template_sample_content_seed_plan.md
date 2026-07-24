# v770 — Form Template Sample Content Seed (copy-and-customise)

**Status:** DRAFT — awaiting approval  
**Repo:** `E:\project-nidus` (Platform + Simulator)  
**Follows:** `SQL/v768_form_template_default_content_seed.sql` (instructional text — wrong content type)  
**Depends on:** `v761` (defaults table), `v759` (template schemas)

## Problem

Default Content currently shows **instructions** (“Summarise why…”, “List measurable objectives…”).  
What is needed is **starter project text** — realistic sample wording a PM can keep, edit, or replace.

## Recommended approach (simple)

### One canonical sample project

Use a single fictional, industry-neutral scenario for all process-group forms so content stays consistent across F001 → Closing:

| Attribute | Value |
|-----------|--------|
| Project name | **NidusWorks Digital Operations Platform** |
| Type | Enterprise platform rollout (process + systems + change) |
| Tone | Professional PM language, ready to edit |
| Personalisation | Short tokens only where needed: `[Organisation]`, `[Sponsor Name]`, `[Go-Live Date]` |

**Why one scenario (not many packs yet):** smallest change, consistent story across templates, easy to review, no new tables/UI. Industry packs can come later if needed.

### Content rules

1. Write **filled sample answers**, not field help text.  
2. Prefer concrete bullets/numbers over “how to write” language.  
3. Keep register-style forms (F002, F003, F010, F038…) as **one realistic sample row** of defaults (e.g. one assumption, one stakeholder, one risk).  
4. Leave dates empty or use relative wording in text fields; avoid hard-coding past calendar dates that age badly.  
5. Money: use a plausible figure (e.g. `2500000`) not `0` / instructional text.  
6. Selects: keep sensible defaults (`medium`, `open`, etc.).  
7. **Do not** auto-generate “Provide X for Y…” strings for remaining fields — either curated sample text or leave blank.

### Delivery mechanism

| Option | Decision |
|--------|----------|
| New table / content packs UI | **No** (overkill for now) |
| New SQL file | **Yes** — `SQL/v770_form_template_sample_content_seed.sql` |
| Update v768 in place | **No** — leave v768 as historical; v770 **overwrites** those defaults with `ON CONFLICT DO UPDATE` (always refresh sample pack) |
| Platform + Simulator | **Yes** (rule 34.1) |
| Scope of templates | **Phased** — see below |

### Phasing (keep scope sane)

| Phase | Scope | Effort |
|-------|--------|--------|
| **A (MVP)** | All **Initiating** templates with curated sample content (F001–F004 and any other initiating codes) | Small |
| **B** | **Planning** management-plan style templates (F005–F016 area — plans + scope/schedule/cost plans) | Medium |
| **C** | Remaining Planning + Executing + Monitoring & Controlling + Closing | Medium–Large |

**Recommendation:** Approve **Phase A + F001 full charter first**, then B/C in the same SQL file or a follow-up `v770b` if A is large enough to review alone.

### Example tone (F001 — illustration only)

Not instructions — sample answers:

- **Purpose:** “This project will replace fragmented operational tooling with a single NidusWorks Digital Operations Platform so `[Organisation]` can plan, track, and report delivery in one place…”  
- **Objectives:** numbered SMART outcomes tied to that platform  
- **Sponsor:** `[Sponsor Name], Chief Operating Officer`  
- **High-Level Requirements:** must-haves for the platform (SSO, portfolio/programme/project hierarchy, audit trail, etc.)

### What we will not do in v770

- Seed Drafts / Approvals / New Template (UI routes)  
- Build a multi-industry pack picker in the UI  
- Put help text back into `form_template_versions.schema` placeholders (keep field labels; sample lives in `form_template_field_defaults`)

## Todo (after approval)

- [ ] Agree Phase A-only vs A+B+C in one file  
- [ ] Draft curated sample copy for F001 (all General fields)  
- [ ] Draft sample defaults for remaining Initiating templates  
- [ ] (If approved) Planning / Executing / M&C / Closing curated samples  
- [ ] Write `SQL/v770_form_template_sample_content_seed.sql` (public + sim)  
- [ ] Document in `Documentation/` (short guide: purpose of sample pack + how to customise)  
- [ ] Note in plan Review: apply order `v761` → optional `v768` → **`v770`** (v770 wins)

## Open questions for you

1. **Scenario OK?** “NidusWorks Digital Operations Platform” — or prefer another industry (construction, healthcare, public sector)?  
2. **Scope?** Phase A (Initiating only) first, or all five process groups in one go?  
3. **Overwrite?** Should v770 always replace existing org defaults for these keys, or skip rows that users already edited?  
   - Suggested default: **overwrite rows that still match v768 instructional text**; leave truly custom org edits alone (detect by prefix/pattern or only overwrite when value equals known v768 strings). Simpler alternative: always overwrite (PMO can re-edit).

## Review

_(filled after implementation)_
