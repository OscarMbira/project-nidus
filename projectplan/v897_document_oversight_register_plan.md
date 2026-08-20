# v897 — Cross-Tier Read-Only Document Visibility — Implementation Plan

See `projectprd/v897_document_oversight_register_PRD.md` for the full problem statement, decisions, and user stories. This plan is the todo breakdown for building it — it covers two halves: (A) a new Document Oversight register for Portfolio/Programme/PMO looking down, and (B) extended read-only access to the existing Project Documents page for `team_lead`/`team_member` looking at their own project.

**Status: implemented, pending your SQL run + manual browser verification.**

## Part A — Document Oversight register (Portfolio / Programme / PMO looking down)

### 0. Exploration (confirm facts before writing code)
- [x] Confirmed Simulator's portfolio/programme membership + project-junction tables: `sim.practice_portfolios`/`sim.practice_programmes` (manager columns FK `auth.users(id)` directly, unlike `public`'s `users(id)`), `sim.practice_portfolio_projects`/`sim.practice_programme_projects`.
- [x] Confirmed "current user manages portfolio/programme X" via the authoritative single-manager columns already used by RLS (`portfolios.portfolio_manager_user_id` / `programmes.programme_manager_user_id`, `SQL/v764b_pm_template_hierarchy_rls.sql`) rather than the looser `portfolio_members`/`programme_members` role-tagging tables.
- [x] Confirmed the document detail route (`orgTemplateDetailPath(DETAIL_LIST_BASE, id)`) needs no project context to resolve — a document node is looked up directly by its own `template_reference`/id.

### 1. Scoping service (shared, `packages/shared/src/services/`)
- [x] `documentOversightService.js`: `resolveOversightProjectScope(db, { tier, schema })` and `listOversightDocuments(db, { accountId, projectScope, schema })`. Reuses `slotIsMandatory` from `processTemplateSignatoryService.js`; signer-name lookup always goes through `platformDb` (no `sim.users` table exists — same rule as the earlier `buildUserLabelLookup` fix, see below).
- [x] 6 unit tests (`documentOversightService.test.js`) — PMO/portfolio/programme scoping (public + sim schema identity rules), status derivation (fully/partially signed, pending, declined, current-round-only), empty-scope short-circuit.

### 2. Simulator parity service
- [x] No separate file needed — `documentOversightService.js` is schema-parameterised (`schema: 'public'|'sim'`) and consumed by both apps' pages directly.

### 3. Page — Platform
- [x] `packages/modules/pmo-module/src/pages/DocumentOversightPage.jsx` (+ three thin tier wrappers: `DocumentOversightPortfolioPage.jsx`, `...ProgrammePage.jsx`, `...PmoPage.jsx`).
- [x] Table-List default (rule 41) with Card toggle, sortable columns (rule 40), row numbers (rule 44), search + status filter.
- [x] Export menu (rule 38) via `ExportListMenu`.
- [x] Empty state per tier ("not currently the manager of any portfolio/programme…").
- [x] Theme-aware (rule 28.1) — dark: classes throughout, matching `ProjectDocumentsRegisterPage.jsx`'s existing pairs.
- [x] Row click → `orgTemplateDetailPath('/platform/documents/project', ...)`.

### 4. Page — Simulator
- [x] Mirrored in `packages/modules/sim-pmo-module/src/pages/` (`simDb`, `schema: 'sim'`, `/simulator/pm/documents/project` detail base).

### 5. Routing
- [x] Platform: 3 new sibling routes (`portfolio/document-oversight`, `programme/document-oversight`, `pmo/document-oversight`) added directly under the single global `Layout` in `platformRoutes.jsx` (this section was never part of the per-route-Layout antipattern fixed earlier — `portfolio`/`programme`/`documents/project` were already flat siblings under one `Layout` for the whole `/platform/*` tree).
- [x] Simulator: new `SimDocumentOversightFederated()` outlet in `SimPmoFederatedOutlet.jsx` (mirrors the existing well-structured `SimPmProjectDocumentsFederated` pattern, `SimulatorPMOLayout`), registered as one line in `simulatorRoutes.jsx` (`simulator/pmo/document-oversight/*`) — does not touch or expand the known `simulatorRoutes.jsx` antipattern.

### 6. Menu registration (SQL)
- [x] `SQL/v897_document_oversight_menu.sql` — 6 `menu_items` rows (3 tiers × 2 apps) + `role_menu_items` grants. Portfolio/Programme-tier items nest under `plat_grp_portfolio`/`plat_grp_programme` (and sim equivalents); PMO-tier items reuse the exact parent-resolution CTE from `v870_document_signatory_requirements_menu_reparent.sql` so they land as siblings of "Document Signatory"/"Organisational Templates".
- [x] No `database_tables` registration needed — read-only feature, no new tables.
- [ ] **You still need to run this SQL file in the Supabase SQL Editor** — not executable from this sandbox (see Further Notes).

### 7. Tests
- [x] Service unit tests (6, see step 1).
- [ ] Manual verification: log in as a Portfolio Manager / Programme Manager / PMO Admin and confirm the menu item + scoped results — **outstanding, needs you in a real browser**.

## Part B — Project Documents read-only access (Team Lead / Team Member looking at their own project)

### 8. Menu grant (SQL)
- [x] Folded into `SQL/v897_document_oversight_menu.sql` (final section): grants `team_lead`/`team_member` on the existing `plat_pm_project_documents` / `sim_pm_project_documents` menu items.

### 9. Role-aware read-only gating (shared)
- [x] New hook `useProjectDocumentAccess.js` (`packages/shared/src/hooks/`, duplicated into both apps' local `src/hooks/` per this repo's established Vite-alias-driven duplication convention) — resolves `canManage` (role tier) and `isMember` (project membership, schema-aware: `public.user_projects` vs `sim.practice_project_memberships`, whose `user_id` semantics differ — internal `users.id` vs raw `auth.uid()`).
- [x] `OrganisationalTemplateDetailPage.jsx` (both apps): `fullySigned || !canManageDocument` now drives the existing `<fieldset disabled>`, `SignatoriesPanel`, and `DocumentAttachmentsPanel` disable props — read-only tier reuses the exact same disable mechanism the fully-signed state already used, plus a new "You have read-only access" banner; Retire button hidden entirely.
- [x] `ProjectDocumentsRegisterPage.jsx` (both apps): Capture/Restore button and Edit/Retire row actions hidden for read-only tier; View + Export remain.
- [x] 5 unit tests (`useProjectDocumentAccess.test.jsx`).

### 10. Project scoping for team roles
- [x] `useProjectDocumentAccess` checks project membership (skipped entirely for `project_manager`+ roles, who are unaffected) and the list/detail pages show an access-restricted message when a read-only-tier user isn't a member of the current project.
- [x] Empty/restricted state added to both pages.

### 11. Simulator parity
- [x] Identical gating applied to the Simulator copies of both pages, using `simDb`/`schema: 'sim'`.

### 12. Tests
- [x] Hook unit tests (5, see step 9).
- [ ] Manual verification: log in as a `team_lead`/`team_member`, confirm the menu item appears, only their assigned project's documents are visible, and no write actions are reachable — **outstanding, needs you in a real browser**.

## Incidental fix made along the way

While building the signer-name lookup for the new register, found and fixed a pre-existing bug in `processTemplateSignatoryService.js`'s `buildUserLabelLookup` (added earlier this session): it queried the schema-scoped `db` param for `users`, but there is no `sim.users` table — signer names were silently blank in Simulator's document exports. Fixed to always resolve via `platformDb` (assigned_user_id always FKs to `public.users(id)`, confirmed in `SQL/v868_process_template_signatories_tables.sql`), with matching test-mock updates (`vi.mock('@nidus/supabase', ...)` via `vi.hoisted`).

## Review — what changed

**New files:**
- `packages/shared/src/services/documentOversightService.js` (+ test)
- `packages/shared/src/hooks/useProjectDocumentAccess.js` (+ test; duplicated into `apps/platform/src/hooks/` and `apps/simulator/src/hooks/`)
- `packages/modules/pmo-module/src/pages/DocumentOversightPage.jsx` + 3 tier wrapper pages
- `packages/modules/sim-pmo-module/src/pages/DocumentOversightPage.jsx` + 3 tier wrapper pages
- `SQL/v897_document_oversight_menu.sql`

**Edited files:**
- `apps/platform/src/routes/lazyImports.js`, `platformRoutes.jsx` (3 new routes)
- `apps/simulator/src/routes/SimPmoFederatedOutlet.jsx`, `simulatorRoutes.jsx` (1 new federated outlet + 1 route)
- `packages/modules/{pmo,sim-pmo}-module/src/pages/ProjectDocumentsRegisterPage.jsx` (read-only gating)
- `packages/modules/{pmo,sim-pmo}-module/src/pages/OrganisationalTemplateDetailPage.jsx` (read-only gating)
- `packages/shared/src/services/processTemplateSignatoryService.js` (+ test) — incidental sim signer-label fix

**Outstanding before this is fully live:**
1. Run `SQL/v897_document_oversight_menu.sql` in the Supabase SQL Editor (not executable from this sandbox).
2. Manual browser verification per role, listed in steps 7 and 12 above.
