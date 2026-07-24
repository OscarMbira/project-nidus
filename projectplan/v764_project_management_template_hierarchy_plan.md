# v764 — Project Management Template Hierarchy (Global → PMO → Portfolio → Programme → Project)

**Status:** COMPLETE (Phases 0–4 MVP)
**Repos touched:** `E:\project-nidus` (monorepo) + `E:\project-nidus-admin` (Phase 1 — `projectplans/v159_global_template_library_plan.md`)
**Decisions locked in with user (2026-07-16):**
1. Global Templates are Nidus-staff-authored, cross-tenant content, managed in the **Admin app** (`admin` schema) and published/synced into Platform + Simulator.
2. A "Template" governs **both** (a) which fields appear on Portfolio/Sub-Portfolio/Programme/Project records, and (b) the existing document-template systems — unified under one inheritance chain.

## Phasing

| Phase | Plan file | Repo | Ships | Status |
|---|---|---|---|---|
| **0 — Backbone** | this file | monorepo | `pm_template_nodes` schema + inheritance resolver | ✔ Complete |
| **1 — Global Template Library** | `v159_global_template_library_plan.md` (admin) + monorepo `SQL/v765_*` | admin + monorepo | Authoring UI + publish/sync RPC | ✔ Complete |
| **2 — Fields domain** | `v766_pm_template_fields_domain_plan.md` | monorepo | PMO Field Templates list/detail (Platform + Simulator) | ✔ Complete (MVP) |
| **3 — Documents domain** | `v767_pm_template_documents_domain_plan.md` | monorepo | Additive FKs + process hub join table | ✔ Complete (schema MVP) |
| **4 — Menus, parity, docs** | `v768_pm_template_rollout_plan.md` | monorepo | Sidebar menus both apps, docs | ✔ Complete (MVP) |
| **5 — Full-chain completion** | `v769_pm_template_full_chain_completion_plan.md` | monorepo | Document copy flows wired to resolver; Portfolio/Programme/Project field customisation UI | ✔ Complete |

## Todo (Phase 0)
- [x] `SQL/v764_pm_template_hierarchy_tables.sql`
- [x] `SQL/v764b_pm_template_hierarchy_rls.sql`
- [x] `SQL/v764c_pm_template_hierarchy_sim.sql`
- [x] `SQL/v764d_pm_template_hierarchy_seed.sql`
- [x] `packages/shared/src/services/pmTemplateInheritanceService.js` + unit tests
- [x] `Documentation/PM_Template_Hierarchy_Guide.md`
- [x] Update phase table as phases complete

## Review

### Phase 0 (2026-07-16)
Backbone tables, RLS, sim mirror, registry seed, inheritance resolver + tests.

### Phase 1 (2026-07-16)
- Monorepo: `SQL/v765_global_template_sync_rpc.sql` (`source_global_template_id` + sync RPCs).
- Admin: `v160`–`v164`, Content module pages, `globalTemplateServices.js`, docs, CLAUDE cross-schema exception.

### Phase 2 (2026-07-16)
- `pmTemplateNodeService.js`; Field Templates UI in `pmo-module` / `sim-pmo-module`; shell outlets + `/app/pmo` layout chrome.

### Phase 3 (2026-07-16)
- `SQL/v766_pm_template_document_links.sql` — FKs on form/industry/OPA masters + `process_template_node_links`.

### Phase 4 (2026-07-16)
- `SQL/v767_pm_template_field_templates_menu.sql`; guide updates; phase plans closed.

### Apply order
**Monorepo:** v764 → v764b → v764c → v764d → v765 → v766 → v767  
**Admin:** v160 → v161 → v162 → v163 → v164 (after monorepo v765)

### Known follow-ups (non-blocking MVP gaps)
- Rich LDE field-link editor + entity-form customisation panels
- Copy-wizard breadcrumbs using `resolveEffectiveDocumentMaster`
- Optional demo seed content
