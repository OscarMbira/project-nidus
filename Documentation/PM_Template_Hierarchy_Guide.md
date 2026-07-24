# PM Template Hierarchy — Architecture Guide

**Version:** v764–v784 (includes industry_plan springboard, portfolio/programme domains, creation-time inheritance)  
**Plan:** `projectplan/v764_…`, `v769_…`, `v772_industry_template_springboard_content_plan.md`, `v783_pm_hierarchy_creation_time_inheritance_plan.md`  
**Last updated:** 2026-07-20

---

## Purpose

Nidus already has several template subsystems (PMO form templates, industry plan templates, OPA, process templates hub, local data extensions, etc.). Each used a flat **master → one copy** pattern. None modelled more than two tiers, and none shared an inheritance engine.

Phase 0 adds a **generic hierarchy backbone** so later phases can attach existing systems without rebuilding them:

```
Global (Admin-synced) → PMO → Portfolio → Sub-Portfolio → Programme → Project
```

Global rows are authored in the Admin app and synced into Platform/Simulator as `tier='pmo'`, `is_system_synced=true`, `scope_entity_id=NULL` (org-wide default until PMO overrides).

**Creation-time wiring (v783 / SQL v784):** Platform create forms can opt in to attach a tier node under the parent (or PMO) and copy resolved field defaults. See `Documentation/PM_Hierarchy_Creation_Time_Inheritance_Guide.md`. Default remains off so creates stay unchanged unless the user checks the box.
---

## Tables

| Table | Schema | Role |
|-------|--------|------|
| `pm_template_nodes` | `public` + `sim` | Inheritance tree node (tier, domain, parent, scope, version, status) |
| `pm_template_field_links` | `public` + `sim` | Field-domain attachments to `custom_field_definitions` + overrides |
| `pm_template_entity_assignment` | `public` + `sim` | Entity → node (or NULL = walk nearest ancestor default) |
| `pm_template_change_notifications` | `public` + `sim` | Parent published → descendant should review |

### Domains

`fields` | `form_template` | `industry_plan` | `opa` | `process_template` | `legacy_document` | `structured_list`

See also `Documentation/Legacy_Template_Upload_Guide.md` (Tracks A/B/C).

For `domain='fields'`, `domain_ref_id` is NULL — the node itself is the anchor. For document domains, `domain_ref_id` points at the existing master row (`form_templates.id`, etc.).

### Additive columns (Phase 3 — not in Phase 0)

Existing masters gain a nullable `pm_template_node_id` (or a join table for Process Templates Hub). Phase 0 does **not** alter those tables.

---

## SQL apply order

1. `SQL/v764_pm_template_hierarchy_tables.sql` — public DDL  
2. `SQL/v764b_pm_template_hierarchy_rls.sql` — public RLS + `can_manage_pm_template_node`  
3. `SQL/v764c_pm_template_hierarchy_sim.sql` — sim DDL + RLS  
4. `SQL/v764d_pm_template_hierarchy_seed.sql` — `database_tables` registry only  
5. `SQL/v765_global_template_sync_rpc.sql` — Global → Platform/Simulator sync (Admin Phase 1)  
6. `SQL/v766_pm_template_document_links.sql` — document master FKs + process hub join  
7. `SQL/v767_pm_template_field_templates_menu.sql` — sidebar menus  
8. `SQL/v771_pm_template_field_links_guidance.sql` — guidance on field links + sync  
9. `SQL/v772_industry_template_content_enrichment.sql` — enrich priority industries  
10. `SQL/v772b_seed/batches/*.sql` — catalog 30 → 50 industries  
11. `SQL/v773_global_industry_template_sync.sql` — Global publish for `industry_plan`  
12. `SQL/v774_pm_template_nodes_multi_document_current_scope.sql` — unique current scope includes `domain_ref_id` (many industry_plan/OPA/form masters per account)

**Admin (after monorepo v765/v773/v774):** `v160` → `v166` → `v167` → `v168` in `E:\project-nidus-admin\SQL\`

---

## UI entry points

| App | Route | Module |
|-----|-------|--------|
| Platform | `/app/pmo/field-templates` | `@nidus/pmo-module` |
| Simulator | `/simulator/pmo/field-templates` | `@nidus/sim-pmo-module` |
| Admin | `/content/global-template-library` | `@nidus-admin/content` |
| Platform | Portfolio detail → "Field Templates" tab (+ Industry Plan fork) | `apps/platform/src/pages/portfolio/PortfolioDetail.jsx` |
| Platform | Programme detail → "Field Templates" tab (+ Industry Plan fork) | `apps/platform/src/pages/programme/ProgrammeDetail.jsx` |
| Platform | `/platform/projects/:projectId/field-templates` | `apps/platform/src/pages/app/ProjectFieldTemplates.jsx` |
| Simulator | `/simulator/pm/projects/:projectId/field-templates` | `apps/simulator/src/pages/app/ProjectFieldTemplates.jsx` |
| Admin | Global Template Library (`fields` **and** `industry_plan`) | `/content/global-template-library` |

Portfolio/Programme tiers are Platform-only — Simulator has no portfolio/programme entities (only `sim.practice_projects`), so there is nothing to attach a Portfolio/Programme-tier node to. This is not a parity gap.

---

## Inheritance resolver

Shared package: `@nidus/shared/services/pmTemplateInheritanceService.js`

| API | Behaviour |
|-----|-----------|
| `resolveEffectiveFields(db, entityType, entityId, options?)` | Assignment → node chain → merge `pm_template_field_links` root→leaf |
| `resolveEffectiveDocumentMaster(db, entityType, entityId, domain, options?)` | Same chain; nearest published node with `domain_ref_id` |
| `mergeFieldLinksByChain(linksByTier)` | Pure merge (child overrides parent for enable/required/default/label/order) |
| `pickNearestPublishedDocumentMaster(chain)` | Pure document-master picker |

Pass `platformDb` or `simDb` as `db`. Both schemas expose the same table names, so one resolver serves Platform and Simulator (rule 34.1).

### Merge rules (fields)

- Walk **root → leaf**.
- For each `custom_field_definition_id`, later tiers override earlier ones when the override column is non-null.
- `enabled=false` at a child tier disables the field in the effective set.
- `listEnabledEffectiveFields` returns only enabled fields, sorted by `display_order`.

---

## RLS summary

- **Read:** any authenticated user with `user_has_access_to_account(account_id)`.
- **Write nodes/links:** `can_manage_pm_template_node(...)` — PMO admin for account-wide/PMO nodes; portfolio/programme/project managers for their scoped nodes. **`is_system_synced=true` is never writable** by Platform/Simulator roles (service_role / Admin sync only).
- **Assignments:** PMO admin or the manager of that entity.
- **Notifications:** select by account; acknowledge via update; insert by PMO admin / node manager.

---

## How existing systems attach (later phases)

| Phase | Plan | Attachment |
|-------|------|------------|
| 1 | Admin `v160` | Global Template Library + publish/sync into `pm_template_nodes` |
| 2 | `v765` | Fields UI wrapping Local Data Extensions + field links |
| 3 | `v766` | Nullable `pm_template_node_id` on form/industry/OPA (+ process hub strategy) |
| 4 | `v767` | Menus, seeds, user guide, parity pass |
| 5 | `v769` | Document copy flows (OPA/Industry Plan/Form Templates) call `resolveEffectiveDocumentMaster`; field-tier customisation UI |
| 6 | `v772`/`v773` + Admin `v166` | **`industry_plan` full chain:** Global authoring/publish → shared `pmo_industry_templates` catalog → Portfolio/Programme **Fork industry template** → Project copy browser prefers nearest tailored master |

### `industry_plan` domain story (v772)

1. **Global (Admin):** author `domain=industry_plan` payload (JSON: `industry_code`, phases/activities/…); publish via `admin.publish_global_template` → `public.sync_global_template_node` (`SQL/v773`).
2. **Catalog:** one shared `public.pmo_industry_templates` row (+ children); per-account `pm_template_nodes` with `domain_ref_id` → template id.
3. **Portfolio/Programme:** `ForkIndustryTemplatePanel` deep-copies the effective master (`duplicateTemplate`) and creates a tier node + entity assignment (`forkIndustryTemplateForEntity`).
4. **Project:** `IndustryTemplateBrowser` already resolves via `resolveEffectiveDocumentMaster` / `resolveEffectiveIndustryTemplate` — no extra Project UI required.

OPA and Form Template document forks below PMO remain open (out of v772 scope).

---

## Naming

No trademarked methodology names appear in schema, UI, or code. Prefer “structured/traditional practice” and “international best practice”.

---

## Tests

```bash
pnpm --filter @nidus/shared test
```

Covers pure merge/chain/document-master helpers in `packages/shared/src/services/__tests__/pmTemplateInheritanceService.test.js`.
