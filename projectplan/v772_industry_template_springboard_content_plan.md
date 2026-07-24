# v772 — Industry Template Springboard Content & Tiered Tailoring

**Status:** COMPLETE  
**Repos touched:** `E:\project-nidus` (monorepo — this plan) + `E:\project-nidus-admin` (companion plan `v166`)  
**Follows on from:** v764–v769 (PM Template Hierarchy backbone + full-chain wiring), v575/v576 (existing Industry Plan Templates system)

## What already exists (confirmed by direct research, not assumed)

- **30 industries are already seeded** in `pmo_industry_templates` (`SQL/v576_seed/`), including `software_development` ("Software Development & IT") and `construction` — both already reasonably populated. There is no distinct "Banking" — closest is `financial_services` ("Financial Services & Transformation").
- **Activities are already decent quality**: e.g. software_development has "System architecture design — 5-7d — 30h — Tech Lead"; construction has "Site survey & soil investigation — 5-10d — 40h — Structural Eng". Real, usable, PM-plausible content.
- **Phases, deliverables, risks, milestones, and roles are effectively title-only placeholders today**: `risk_description` duplicates `risk_title` verbatim, `milestone_description` duplicates `milestone_name`, `phase_description` is a generic templated string ("Discovery phase for Software Development & IT."). Titles/names are industry-realistic; there's no narrative depth behind them.
- **A real PMO authoring UI already exists** (`IndustryTemplateForm.jsx`, 8-step wizard covering all 6 child tables) — this plan's content work can be entered through it as a working reference, but bulk enrichment across dozens of rows will ship as seed SQL (matching how the original v576 content was produced — no bulk-upload UI exists for this content, and building one is out of scope here).
- **The PM Template Hierarchy backbone already has the hook**: `SQL/v766_pm_template_document_links.sql` added a nullable `pm_template_node_id` FK on `pmo_industry_templates`. v769 already wired Project-tier copy flows (`IndustryTemplateBrowser.jsx`, both apps) to `resolveEffectiveDocumentMaster` — so **once a Portfolio/Programme-tailored `pmo_industry_templates` row + node exists, Project-level copying picks it up automatically, no further Project-tier code changes needed.**
- **The Global Template Library (Admin app) is explicitly scoped to `domain='fields'` only today** (`v159_global_template_library_plan.md`, confirmed unchanged through the latest admin SQL, `v165b`). Nothing currently lets Nidus author a Global-tier industry plan template.

## Decisions locked in with user (2026-07-16)
1. **Banking** is folded into the existing `financial_services` industry (enrich it to explicitly cover core banking systems, KYC/AML compliance, branch rollout, payment systems) rather than fragmenting the catalog with a new industry_code.
2. Scope includes **both** content enrichment **and** wiring Global → Portfolio/Programme tailoring for the `industry_plan` domain (closes the "Portfolio/Programme tailored document masters" gap flagged as a known follow-up in `v769`).

---

## Phase 0 — Catalog expansion, 30 → 50 industries (monorepo, no schema change)

**Status: COMPLETE**

Draft content confirmed via `projectplan/v772c_new_industry_content_draft.md` (industries 31–50). Generated with `node scripts/generate-v772b-industry-expansion.mjs`.

**Delivered:**
- `SQL/v772b_industry_template_catalog_expansion.sql` (pointer)
- `SQL/v772b_seed/industries/*.sql` (20 industries)
- `SQL/v772b_seed/batches/batch_01_of_05.sql` … `batch_05_of_05.sql`

---

## Phase 1 — Content enrichment (monorepo, no schema change)

**Status: COMPLETE**

**File:** `SQL/v772_industry_template_content_enrichment.sql` — narrative UPDATEs for `software_development`, `construction`, `financial_services` phases/risks/milestones/roles; banking-oriented activities/deliverables/risks/milestones appended to `financial_services`.

---

## Phase 2 — Global-tier authoring for `industry_plan` domain (cross-repo)

**Status: COMPLETE**

### Admin (`E:\project-nidus-admin`, `projectplans/v166_global_industry_template_authoring_plan.md`)
- Payload CHECK allows array **or** object
- create/update/publish RPCs allow `fields` + `industry_plan`
- Form: domain select + industry_plan JSON editor; Detail summary
- Guide + `emptyIndustryPlanPayload()` utils/tests

### Monorepo
- `SQL/v773_global_industry_template_sync.sql` — catalog upsert + per-account nodes; keeps v771 fields/guidance path

---

## Phase 3 — Portfolio/Programme tailored industry plan masters (monorepo)

**Status: COMPLETE**

- `createTierDocumentTemplateNode` + `createTierFieldTemplateNode` thin wrapper
- `forkIndustryTemplateForEntity` in `industryTemplateTierService.js`
- `ForkIndustryTemplatePanel` mounted on Platform Portfolio/Programme detail (Field Templates tab)
- Unit tests for node create + fork orchestration
- Simulator: no portfolio/programme entities (documented; not a parity gap)

---

## Phase 4 — Docs & wrap-up

**Status: COMPLETE**

- `Documentation/PM_Template_Hierarchy_Guide.md` — industry_plan Global→…→Project story + apply order
- `v769` known gaps — Industry Plan fork closed; OPA/Form Template document forks remain open

---

## Sequencing & apply order
1. Phase 1 enrichment (independent)
2. Phase 0 batches (`SQL/v772b_seed/batches/*.sql`)
3. Monorepo `v773` then Admin `v166`
4. UI ships with Platform deploy (no SQL for Phase 3)

## Todo
- [x] Phase 0: confirm final 20-industry list with user, then author content + `SQL/v772b_industry_template_catalog_expansion.sql`
- [x] Phase 1: `SQL/v772_industry_template_content_enrichment.sql`
- [x] Phase 2 (admin): companion plan `v166_global_industry_template_authoring_plan.md`, domain extension, authoring UI, publish RPC extension
- [x] Phase 2 (monorepo): `SQL/v773_global_industry_template_sync.sql`
- [x] Phase 3: generalize node-creation helper; "Fork for my Portfolio/Programme" UI action
- [x] Phase 4: guide + v769 gap-list updates

## Review

### Completed 2026-07-16

| Phase | Outcome |
|-------|---------|
| 0 | 20 new industries generated from v772c draft into `SQL/v772b_seed/` |
| 1 | Narrative enrichment + banking inserts for financial_services |
| 2 | Admin `v166` + monorepo `v773` industry_plan publish/sync |
| 3 | Portfolio/Programme fork UI + shared services/tests |
| 4 | Hierarchy guide + v769 gap update |

**Remaining (explicitly out of scope):** OPA / Form Template Portfolio–Programme document forks.

**Test note:** Phase 3 shared tests registered in `packages/shared/vitest.config.js` (`pmTemplateNodeService.test.js`, `industryTemplateTierService.test.js`).

### Follow-up gap found post-completion (2026-07-16)
Phase 2's mechanism (Admin `v166`, monorepo `v773`) was real, but **zero `industry_plan` content was ever pushed through it** — the 30+ industries live only in `public.pmo_industry_templates`, never mirrored into `admin.global_template_library`, so the Admin app's Global Template Library screen showed only the original single `fields`-domain row. Addressed in admin repo companion plan `projectplans/v167_global_template_library_industry_bulk_populate_plan.md` (bulk-populate + sidebar reorganisation, awaiting approval).
