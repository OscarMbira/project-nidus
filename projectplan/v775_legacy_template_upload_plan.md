# v775 — Legacy Template Upload (Schedules, Charters, BRDs)

**Status:** COMPLETE (100%)  
**Date completed:** 2026-07-16  
**Repos touched:** `E:\project-nidus` (monorepo) + `E:\project-nidus-admin` (companion `projectplans/v173_legacy_template_upload_admin_plan.md`)  
**Goal:** System Admin and PMO Admin can upload existing legacy files (project schedules, charters, BRDs, and similar) and have them become reusable templates in the PM Template Hierarchy, instead of everything being hand-authored through wizards.

> **Versioning note:** Plan id remains **v775**, but monorepo SQL ships as **`v776*`** because `SQL/v775_ict_industry_template_seed.sql` already occupied v775. Admin companion is **`v173`** (Admin `v170` was already used for catalog sync).

## What already exists (confirmed by direct research, not assumed)

- **No generic reusable "bulk upload wizard" component exists yet** — every domain built its own. The most mature is `TestBulkUploadWizard.jsx` / `testImportService.js` — generalized into `LegacyTemplateUploadWizard.jsx`.
- **File-storage primitive:** `documentStorageService.js` pattern + new `legacy-templates` bucket (`v776c`).
- **Parsing:** `xlsx` / `papaparse` (Track A/C); `officeparser` (Track B); MSPDI via `DOMParser`; `.mpp` = local `mppjs` conversion note only.

## Scoping decision: two upload tracks, not one

**Track A — Structured schedule upload** → `pmo_industry_templates` children  
**Track B — Reference document upload** → `pmo_legacy_document_templates` + storage  
**Track C — Structured list upload** → `pmo_legacy_structured_lists`  
**MS Project:** MSPDI XML in Track A; raw `.mpp` documented conversion path only

---

## Phase 1 — Schema & storage foundation (monorepo) — DONE

- [x] `SQL/v776_legacy_document_templates_tables.sql` — tables + domain CHECK (`legacy_document`, `structured_list`) public+sim
- [x] `SQL/v776b_legacy_document_templates_rls.sql`
- [x] `SQL/v776c_legacy_templates_storage.sql` — bucket `legacy-templates`
- [x] `SQL/v776d_legacy_templates_database_tables_seed.sql` — `database_tables` registry
- [x] `SQL/v776f_legacy_structured_lists.sql` — Track C table + RLS
- [x] `SQL/v776e_legacy_document_global_sync.sql` — sync RPC extension

## Phase 2 — PMO Admin upload UI (Platform) — DONE

- [x] `apps/platform/src/components/templates/LegacyTemplateUploadWizard.jsx` — schedule / document / structured_list, single+bulk
- [x] Parse helpers: `packages/shared/src/utils/legacyTemplateParse.js`, `legacyTemplateFileParseService.js`, `legacyTemplateExtractService.js`
- [x] Services: `packages/shared/src/services/legacyTemplateService.js`
- [x] Pages + routes: `/pmo/legacy-templates/upload`, `/pmo/legacy-templates`
- [x] Entry points on Industry Templates list
- [x] `officeparser` dependency on `@nidus/platform-app`

## Phase 3 — System Admin + Global tier — DONE

- [x] Admin `SQL/v173_global_legacy_template_domains.sql`
- [x] Monorepo sync extension `v776e`
- [x] Admin UI `LegacyGlobalTemplateUpload.jsx` + Library **Upload legacy** link
- [x] Admin companion plan `projectplans/v173_legacy_template_upload_admin_plan.md`

## Phase 4 — Portfolio/Programme/Project consumption — DONE

- [x] `forkLegacyTemplateForEntity` + `ForkLegacyTemplatePanel` on Portfolio & Programme detail
- [x] Project browse link from `IndustryTemplateBrowser` → reference templates
- [x] Optional Charter→F001 Sample Default: **deferred by design** (documented; not MVP)

## Phase 5 — Docs & tests — DONE

- [x] `Documentation/Legacy_Template_Upload_Guide.md` (includes Converting an `.mpp` file)
- [x] `Documentation/PM_Template_Hierarchy_Guide.md` domain table updated
- [x] Unit tests: `packages/shared/src/utils/__tests__/legacyTemplateParse.test.js`

## Sequencing & apply order

1. Monorepo: `v776` → `v776b` → `v776c` → `v776f` → `v776d` → `v776e`
2. Admin: `v173`
3. Platform: Upload / Publish as needed

## New dependencies

- **`officeparser`** on `@nidus/platform-app`
- `@byteink/mppjs` is **not** bundled (local conversion only)

## Todo

- [x] Phase 1: schema/storage/registry
- [x] Phase 2: PMO upload wizard + entry points
- [x] Phase 3: Admin domains + sync + Admin upload UI
- [x] Phase 4: fork + project browse (optional Charter bridge deferred)
- [x] Phase 5: docs + tests

## Review

### Completed 2026-07-16

All three tracks are implemented end-to-end for PMO (Platform) and Global (Admin publish → sync). Schema/RLS/storage/registry and Global sync domains are in place. Portfolio/Programme can fork `legacy_document` and `structured_list` masters. Tests cover column-mapping / schedule bundle / structured-list validation / RAID sheet naming. Field-level Charter→F001 extraction remains intentionally out of MVP scope (documented).
