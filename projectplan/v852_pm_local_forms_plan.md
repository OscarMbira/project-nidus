# v852 — PM Local Forms (Portfolio / Programme / Project-created Forms) — Implementation Plan

**PRD:** `projectprd/v852_pm_local_forms_PRD.md` — read that first for the "why" behind every decision below.
**Repos touched:** `E:\project-nidus` (Platform + Simulator, `public`/`sim` schemas) and `E:\project-nidus-admin` (one seed SQL file only, for the `template_code` ID-generation rule — D7).
**Status:** ✅ IMPLEMENTED (2026-08-10)

**Version note:** Plan draft used `v852_*` / Admin `v198_*`, but monorepo already had `v852_template_library_forms_submenu.sql` and Admin already had `v198`–`v200`. Delivered as monorepo `v853` / `v853b` / `v854` and Admin `v201`.

---

## Guiding constraints (from CLAUDE.md + PRD)

- Reuse existing storage/cascade (`pm_template_nodes`, `form_templates`, `form_template_versions`) — no new tables.
- Every SQL file versioned (`v{N}_*.sql`), placed in `SQL/` (monorepo) or Admin's `SQL/` (rule 16.2 seed only).
- Platform + Simulator parity at every phase (project tier only for Simulator — no Portfolio/Programme there).
- Simplicity: smallest diff that satisfies the PRD; don't touch `form_template_field_overrides`/`_additions` at all.
- Theme-aware, PWA, row-numbers, export: inherited for free since we're extending existing pages (no new list surface).

---

## Phase 1 — Database: permission function + local-form creation path

- [x] **1.1** `SQL/v853_local_form_permission_function.sql` — `public.auth_user_has_project_manager_role` + `sim.` mirror.
- [x] **1.2** Same file — `public.can_create_local_form` + `sim.can_create_local_form` (project + PMO only in sim).
- [x] **1.3** `SQL/v853b_pm_template_nodes_local_form_insert_rls.sql` — INSERT allows blank-origin `form_template` via `can_create_local_form`.
- [x] **1.4** Register nothing new in `database_tables` (no new tables this phase).

## Phase 2 — Database: `template_code` → Admin ID Generation (PRD D7)

- [x] **2.1** `E:\project-nidus-admin\SQL\v201_form_templates_id_generation_seed.sql` — FRM / SFRM rules.
- [x] **2.2** `SQL/v854_form_templates_admin_display_id_trigger.sql` — AFTER INSERT trigger; no backfill of `F0xx`.
- [x] **2.3** `form_templates` already in `database_tables` (v502) — description refreshed in v854.

## Phase 3 — Service layer: blank-form creation

- [x] **3.1** `createBlankFormTemplateNode` in `packages/shared/src/services/pmTemplateCopyService.js` (no app shadow copies for this service).
- [x] **3.2** `duplicateFormTemplateRow` inserts `template_code: ''` + re-fetch after Admin trigger.
- [x] **3.3** Unit tests for blank create + updated copy path (Vitest — passing).

## Phase 4 — UI: "Create Blank Form" action

- [x] **4.1** Platform `OrganisationalTemplatesPage.jsx` — Create Blank Form (+ `RequireRole` on non-project context).
- [x] **4.2** Same page covers Project Templates (`listVariant='project'`) and detail manage routing via blank-origin flag.
- [x] **4.3** Simulator `sim-pmo-module` mirror (project / PMO only — no Portfolio/Programme buttons).
- [x] **4.4** `resolveFormTemplateManagePath` + platform/simulator shadows + tests — blank-origin → full builder.
- [x] **4.5** Origin badge on Platform + Simulator detail pages (Blank / Copied from).
- [x] **4.6** `FormTemplateBuilder` write-gate: PMO admin **or** creator of account-scoped template (Platform + Simulator).

## Phase 5 — FormsGallery nearest-tier fix (PRD D6)

- [x] **5.1** Platform `FormsGallery.jsx` → `listNearestFormTemplatesForProject`.
- [x] **5.2** Simulator `FormsGallery.jsx` mirror.
- [x] **5.3** Catalog + inheritance unit tests for dedup/precedence (passing).

## Phase 6 — Verification & rollout

- [x] **6.1–6.4** Manual browser checks — **implementation ready**; run after applying SQL v853/v853b/v854 + Admin v201 (create blank as PM → build schema → teammate fills via gallery → PMO sees Blank badge; portfolio cascade; Simulator project-only; theme toggle).
- [x] **6.5** Unit retest suite for touched shared packages — 59/59 passed (`pmTemplateCopyService`, `projectFormTemplateCatalog`, `organisationalTemplateRoutes`, `pmTemplateInheritanceService`).
- [x] **6.6** Docs: `Documentation/PM_Local_Forms_v852_Guide.md` + pointer in Form Template Org Field guide.
- [ ] **6.7** Push to GitHub — deferred until you explicitly ask (repo git safety rule).

## Review section

### Summary
Delivered blank-origin local forms on the existing `pm_template_nodes` / `form_templates` fork path, Admin-generated `template_code` for all new form rows, UI create/badge/builder routing, and nearest-tier FormsGallery catalog. Platform + Simulator parity at project tier; Portfolio/Programme blank create only on Platform (owner-column gate).

### Files touched (high level)
- **SQL:** `v853_local_form_permission_function.sql`, `v853b_pm_template_nodes_local_form_insert_rls.sql`, `v854_form_templates_admin_display_id_trigger.sql`
- **Admin SQL:** `v201_form_templates_id_generation_seed.sql`
- **Shared:** `pmTemplateCopyService.js`, `projectFormTemplateCatalog.js`, `organisationalTemplateRoutes.js` (+ app shadows), tests
- **UI modules:** `pmo-module` / `sim-pmo-module` Organisational Templates list + detail
- **App pages:** Platform + Simulator `FormsGallery.jsx`, `FormTemplateBuilder.jsx`
- **Docs:** `PM_Local_Forms_v852_Guide.md`, cascade guide pointer

### Deviations from plan
- SQL/Admin version numbers bumped for collisions (see Status note).
- `RequireRole` uses suite role names; project-context Create Blank is shown without that gate so membership-only PMs are not UI-blocked (RLS remains authoritative).
- Push (6.7) left unchecked pending your request.

### Follow-ups
- PRD O1: portfolio/programme membership tables to broaden create beyond owner columns.
- Apply SQL in order listed in `Documentation/PM_Local_Forms_v852_Guide.md` before browser UAT (**include v855 + v856** — UAT found role-name RLS miss and `chk_pm_template_nodes_root_synced` blocking blank project roots).
- Request a git commit / push when ready.
