# v769 — PM Template Hierarchy: Full-Chain Completion

**Status:** Complete
**Repo:** monorepo only (no admin-repo changes needed for this phase)
**Follows on from:** v764 (backbone), v766/v767 (documents domain schema), v768 (rollout) — closes the two gaps the post-implementation audit flagged as real but honestly-disclosed:
1. Phase 3's document-domain schema (`pm_template_node_id` FKs, v766) has zero consuming code — the 3 existing PM-facing copy flows still resolve masters with no tier awareness at all.
2. Phase 2 only ships PMO-facing field-template pages — Portfolio/Programme/Project managers have no UI to view/override inherited fields or add local ones, even though the resolver and schema already support it.

**Confirmed out of scope:** root-level `src/` (last touched 2026-05-27, pre-dates the v730 Option A migration; `npm run dev` filters `@nidus/platform-app`/`@nidus/simulator-app` only). All edits target `apps/platform/src/` and `apps/simulator/src/` only.

## Resolver mechanics (confirmed by reading `pmTemplateInheritanceService.js` directly)
`resolveStartNodeId` first checks `pm_template_entity_assignment` for an explicit `(entity_type, entity_id, domain)` row; if none exists, it falls back to the account's current PMO-tier default node (`tier='pmo'`, `scope_entity_id IS NULL`, `is_current`, preferring `is_system_synced` then highest `version`). **This means wiring `entityType='project'` + `accountId` into the 3 copy flows works correctly today, before any Portfolio/Programme tailored-master UI exists** — it resolves to the PMO/Global default. The chain only gets richer once Part B below lets a Portfolio/Programme fork a tailored master and an entity_assignment row is written.

---

## Part A — Wire the 3 document copy flows to the resolver

Per-flow edit points (confirmed by direct code read, not guessed):

### A1. OPA
- `apps/platform/src/services/opaService.js`: add `resolveEffectiveOpaMasterId(projectId, accountId)` calling `resolveEffectiveDocumentMaster(platformDb, 'project', projectId, 'opa', { accountId })`, returns `.domain_ref_id` (or `null` → caller keeps existing behaviour).
- `apps/platform/src/pages/app/ProjectOPACopy.jsx`: when arriving with no explicit `?from_opa=`, call the new resolver helper first and pre-select/redirect to the resolved OPA id; when `?from_opa=` IS explicit (user picked from `OPAList.jsx`'s org-wide browser), leave as-is — resolver only fills the "what's the right default" gap, doesn't remove user choice.
- Add a small "Inherited from: PMO default" / "Inherited from: Portfolio — {name}" badge on the page using the resolved node's `tier`+`scope_entity_id` (resolve display name client-side from existing portfolio/programme lookups already available in the page's context).
- Mirror in `apps/simulator/src/services/opaService.js` + `apps/simulator/src/pages/app/ProjectOPACopy.jsx` using `simDb`/`sim.` equivalents (rule 34.1 parity).

### A2. Industry Plan
- `apps/platform/src/services/industryTemplateService.js`: add `resolveEffectiveIndustryTemplateId(projectId, accountId)` wrapping the resolver for `domain='industry_plan'`.
- `apps/platform/src/pages/app/IndustryTemplateBrowser.jsx`: `projectId` is already a query param here and currently unused — call the resolver in the existing load effect (line ~20) to highlight/pre-select the recommended template instead of leaving the full org-wide catalog undifferentiated.
- Same "Inherited from" badge treatment as A1.
- Mirror in `apps/simulator/src/services/industryTemplateService.js` + `apps/simulator/src/pages/app/IndustryTemplateBrowser.jsx`.

### A3. Form Templates
- `apps/platform/src/services/formEngineService.js`: add `resolveEffectiveFormTemplateId(projectId, accountId)` for `domain='form_template'`. Note existing lookups are keyed by `template_code` (string), not `id` — the new helper additionally resolves `template_code` from the `form_templates` row at `domain_ref_id` so `FormNew.jsx` doesn't need to change its keying convention.
- `apps/platform/src/pages/forms/FormsGallery.jsx`: reuse the existing `getProjectAccountId(projectId, mode)` pattern (already used for field-override lookups) to also resolve and flag the recommended/inherited template in the gallery listing.
- Mirror in `apps/simulator/src/services/formEngineService.js` + `apps/simulator/src/pages/forms/FormsGallery.jsx`.

### A4. Shared plumbing
- New shared helper `packages/shared/src/services/pmProjectAccountContext.js` — thin, reused by all three: given `db, projectId`, resolve `accountId` (generalizes the ad hoc pattern already in `FormNew.jsx`) so A1–A3 don't each reinvent it.

---

## Part B — Tiered field customisation UI (completes the fields domain)

Currently only PMO-facing pages exist (`PmoFieldTemplatesListPage.jsx`, `PmoFieldTemplateDetailPage.jsx` in `pmo-module`/`sim-pmo-module`). Add the equivalent capability at Portfolio, Programme, and Project tiers, reusing rather than duplicating:

- New generic component `packages/ui/src/templates/TierFieldCustomisationPanel.jsx` — parametrized by `{ entityType, entityId, accountId }`. Renders:
  - Effective fields table (calls `resolveEffectiveFields`, shows inherited vs local, source tier per field) — reuses the same rendering logic already proven in `PmoFieldTemplateDetailPage.jsx`, extracted into this shared component rather than copy-pasted.
  - "Override" action per inherited field (enabled/required/default/label) → writes a `pm_template_field_links` row on a node scoped to this tier (creating the tier's own `pm_template_nodes` row + `pm_template_entity_assignment` row on first override, via `pmTemplateNodeService.js`'s existing `create`/`upsert` — no new RPC needed).
  - "Add local field" action → opens the existing v515 `CustomFieldAdminBuilder.jsx` flow scoped to this entity, then links the resulting `custom_field_definition_id` via `pm_template_field_links` with `is_local=true`.
- Mount points (thin pages, each just supplies `entityType`/`entityId` to the shared panel):
  - `packages/modules/portfolio-module/src/pages/PortfolioFieldCustomisation.jsx` (+ `sim-portfolio-module` if that package exists — confirm during implementation; if the Simulator has no portfolio-tier module yet, note it as a parity gap rather than inventing a new module out of scope)
  - `packages/modules/programme-module/src/pages/ProgrammeFieldCustomisation.jsx` (+ sim equivalent)
  - Project-tier: add a "Fields" tab/section to whatever the existing Project settings/detail page already is (not a new page) — reuse pattern already established for project-level customisation elsewhere in the codebase.
- Route + menu registration for each new page, `roles` gated to `portfolio_manager`/`programme_manager`/`project_manager` respectively, per the existing RLS in `v764b`.

## Sequencing
Part A first (bounded, directly closes the audited gap, no new schema). Part B second (larger — new UI surface, confirm actual module folder names exist before creating pages, since `portfolio-module`/`programme-module` were referenced from research but not directly confirmed to exist as federated packages — verify at implementation time and adjust mount points if the real structure differs).

## Todo
- [x] A1 OPA wiring (Platform + Simulator)
- [x] A2 Industry Plan wiring (Platform + Simulator)
- [x] A3 Form Templates wiring (Platform + Simulator)
- [x] B: confirm actual portfolio/programme module package names
- [x] B: `TierFieldCustomisationPanel.jsx` shared component
- [x] B: Portfolio/Programme mount points (Platform)
- [x] B: Project-tier fields section (Platform + Simulator)
- [x] Update `Documentation/PM_Template_Hierarchy_Guide.md`
- [x] Update v764 status table to reference this plan

## Review

### Part A — document copy flows wired to the resolver
Implemented as planned, with one simplification: no separate `pmProjectAccountContext.js` helper file was created (A4). Each service resolves its own account context inline — `projects.account_id` directly for Platform, `getCurrentUserAccountId()` for Simulator (since `sim.practice_projects` has no account column at all — confirmed by reading `v80_sim_project_mandate_tables.sql`; the existing `getProjectAccountId(projectId, 'sim')` in `formEngineService.js` was already a silent no-op for sim mode, since `sim.projects` doesn't exist either). A single shared helper would have needed two different resolution strategies per app anyway, so inlining stayed simpler (rule 6).

- **OPA**: `resolveEffectiveOpaMaster()` added to `opaService.js` (Platform), `sim/simOPAService.js` (both apps' sim-schema copy). `ProjectOPACopy.jsx` (both apps) auto-resolves and pre-fills `sourceOpaId` when arriving with no explicit `?from_opa=`, shows an "Inherited from: …" badge.
- **Industry Plan**: `resolveEffectiveIndustryTemplate()` added to `industryTemplateService.js` (both apps — catalog is Platform-owned, no sim-schema equivalent exists, confirmed via `v766`'s conditional `sim.pmo_industry_templates` guard). `IndustryTemplateBrowser.jsx` (both apps) now uses the previously-unused `projectId` query param to highlight the recommended template card.
- **Form Templates**: `resolveEffectiveFormTemplate()` added to `formEngineService.js` (both apps), resolves `domain_ref_id` → `template_code` since existing flows key by code. `FormTemplateGallery.jsx` component (both apps) gained an optional `recommendedCode`/`recommendedTier` prop (backward compatible — `FormTemplateAdmin.jsx`, the other caller, is unaffected); `FormsGallery.jsx` (both apps) passes the resolved recommendation through.

All 15 touched files verified with `esbuild` (parse-only, no bundling) — zero syntax errors.

### Part B — tiered field customisation UI
Built as a shared `packages/ui/src/TierFieldCustomisationPanel.jsx` (flat file, matching this package's existing convention — not nested under a new `templates/` folder as originally sketched), backed by a new `createTierFieldTemplateNode()` in `pmTemplateNodeService.js` (generalizes the existing PMO-only `createPmoFieldTemplateNode()` to any tier/scope). The panel shows effective fields with per-field source-tier attribution, lets the viewer override enabled/required at their own tier (creating that tier's node + entity assignment on first use), and lists unlinked published `custom_field_definitions` to add as local fields.

**Two scope changes from the original sketch, both discovered during implementation, not assumed upfront:**
1. **No new Module Federation pages.** `packages/modules/portfolio-module` and `programme-module` exist but are placeholder stubs (`ModuleHome.jsx` only, "domain pages load via the platform shell"). The real, live Portfolio/Programme UI is `apps/platform/src/pages/portfolio/PortfolioDetail.jsx` and `pages/programme/ProgrammeDetail.jsx` — each already has a working tab system. Added a new "Field Templates" tab to each rather than building pages in the empty module packages, which would not have been reachable from the app users actually navigate.
2. **Portfolio/Programme tiers are Platform-only — not a parity gap.** No `sim-portfolio-module`/`sim-programme-module` exist, and the Simulator's data model has no portfolio/programme entities at all (only `sim.practice_projects`). This isn't an oversight; Simulator genuinely has nothing to attach a Portfolio/Programme-tier template to. Project-tier customisation (the tier that does exist in both apps) got full parity: a new standalone route `.../projects/:projectId/field-templates` in both `platformRoutes.jsx` and `simulatorRoutes.jsx`.

Also discovered mid-implementation: neither `portfolios` nor (implicitly) `programmes` has an `account_id` column (confirmed by reading `v36_portfolio_management.sql` in full and grepping for any later `ALTER TABLE` that might have added one — none found). Portfolio/Programme field-template pages resolve `accountId` via `getCurrentUserAccountId()` (the viewer's own account) rather than from the entity row, consistent with how RLS already scopes portfolio/programme access.

All Part B files (new + edited) verified with `esbuild`, including the two large route files (`platformRoutes.jsx`, `simulatorRoutes.jsx`) — zero syntax errors.

### What "full chain" means now
A project's effective fields resolve project → programme/portfolio (if the manager has customised) → PMO default → Global-synced default, with each tier able to override enabled/required or add local fields via its own UI. Document masters (OPA, Industry Plan, Form Templates) resolve the same way, defaulting to the PMO/Global master today and automatically preferring a Portfolio/Programme-tailored master the day one is created via the fields-tier UI's node-creation path extended to a document domain (not built in this pass — Part B only wires the `fields` domain's node creation; a Portfolio/Programme manager forking a tailored *document* master, e.g. their own OPA template, is still a gap, since `TierFieldCustomisationPanel` only creates `domain='fields'` nodes).

### Known remaining gaps (explicitly out of scope for this pass)
- Portfolio/Programme-tier tailored **document** masters for **OPA** and **Form Templates** — still open. **Industry Plan** forks are delivered in `v772` (`ForkIndustryTemplatePanel` + `forkIndustryTemplateForEntity`).
- "Add local field" in `TierFieldCustomisationPanel` links existing published `custom_field_definitions` rather than embedding the full v515 `CustomFieldAdminBuilder` creation flow inline — creating a brand-new field still requires visiting the Local Data Extensions admin builder first, then linking it here. A deeper integration was judged lower-value than shipping the override/link flow now.
- No new sidebar/menu rows were added for the Project-tier `field-templates` route (it's reachable by URL and would naturally be linked from wherever a project's Forms/OPA/Industry Plan sub-nav lives, not chased down in this pass). Portfolio/Programme tiers are discoverable via their existing detail-page tabs, so no menu change was needed there.
