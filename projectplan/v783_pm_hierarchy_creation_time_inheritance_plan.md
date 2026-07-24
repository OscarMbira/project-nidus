# v783 — Wire template inheritance into Portfolio/Programme/Project creation (+ per-instance local fields)

**Repo:** `E:\project-nidus` (Platform only — Simulator has no Portfolio/Programme entities, confirmed via `Documentation/PM_Template_Hierarchy_Guide.md`)
**Related plans:** `E:\project-nidus-admin\projectplans\v185_default_content_library_plan.md`, `E:\project-nidus\projectplan\v782_form_template_sample_fallback_plan.md` — **related but distinct.** Those two are about Form Template field *default values* flowing into a new form instance within a project. This plan is about the Global → PMO → Portfolio → {Sub-Portfolio, Programme, Project} tier hierarchy itself, and only wires up automatically at record-creation time, not touched by v185/v782 at all.
**Status:** ✅ Complete (100%)

**Prerequisite done (v187):** Admin + monorepo domain whitelists now include `portfolio_template` / `programme_template` (`SQL/v783_portfolio_programme_template_domains.sql` + Admin `SQL/v184_portfolio_programme_templates.sql`). Sync still lands at `tier='pmo'` — this plan still owns creation-time tier wiring.

## What you asked to confirm

Your hierarchy diagram (Global Templates → PMO Templates → Portfolio/Programme/Project, each tier inheriting + customising + able to add local fields) is **not** covered by v185/v782 — confirmed by tracing the actual code, not by inference. Full findings below; this plan is the gap.

## What already exists (more than expected — reuse, don't rebuild)

- `pm_template_nodes.tier` already has a check constraint for exactly your tiers: `'pmo', 'portfolio', 'sub_portfolio', 'programme', 'project'` (`SQL/v764_pm_template_hierarchy_tables.sql:33`).
- Global templates sync in as `tier='pmo'`, org-wide default (`is_system_synced=true, scope_entity_id=NULL`).
- A PMO Admin can already create an account-level override node — `createPmoFieldTemplateNode` (`packages/shared/src/services/pmTemplateNodeService.js:54`). This **is** your "PMO Templates ← Global Templates, PMO Admin customises per business policy" box, already real.
- `resolveEffectiveFields` / `resolveEffectiveDocumentMaster` (`packages/shared/src/services/pmTemplateInheritanceService.js`) already compute the cascaded/inherited field set down through the tier chain.
- Portfolios already self-nest (`portfolios.parent_portfolio_id`, `SQL/v36_portfolio_management.sql:73`) — Sub-Portfolio exists at schema level, and `pm_template_nodes.tier` already anticipates `'sub_portfolio'`.
- Per-tier field *overrides* (enable/required/default/label/order) already exist via `pm_template_field_links` linking an LDE `custom_field_definitions` row to a specific `pm_template_nodes` row.

## The actual gap

**Creation never calls any of it.** Checked the real insert code directly:
- `createProject` (`apps/platform/src/services/projectService.js:244`) — plain `.from('projects').insert({...})`.
- `savePortfolio` (`apps/platform/src/services/portfolioService.js:109-133`) — plain insert.
- `saveProgramme` (`apps/platform/src/services/programmeService.js:93-125`) — plain insert.

None reference `pm_template_nodes`, `resolveEffectiveFields`, or LDE. The resolver only runs from a **separate, manual "Field Templates" tab** on `PortfolioDetail.jsx`/`ProgrammeDetail.jsx`, visited *after* the record already exists — not automatic inheritance at creation ("a copy of record") the way your diagram describes.

**Local Data Extensions (LDE) are account-wide, not per-instance.** `custom_field_definitions` is scoped by `account_id` only — a field applies to every record of that entity type across the whole organisation. There's no existing way for one Programme Manager creating one specific Programme to add a field that exists *only* on that one record. Your answer confirmed: fields should be able to exist "in LDE or not, on all levels" — i.e., a field added at any tier may optionally be promoted into the account-wide LDE catalog (reusable everywhere), or stay purely local to that one instance. Neither the "purely local to one instance" half, nor the "add at Portfolio/Programme/Project tier" half, exists today.

## Scope of work

### A. Creation-time resolution (the core ask)
- [x] `createProject`, `savePortfolio`, `saveProgramme`: after the base insert (when opted in), call `applyFieldTemplateInheritanceOnCreate` → node + assignment + `resolveEffectiveFields` + default value write.
- [x] Parent resolution walks **actual** hierarchy: Programme preferred over Portfolio for projects; standalone → PMO; nested Portfolio → `sub_portfolio` tier.
- [x] Sub-Portfolio: Portfolio with `parent_portfolio_id` uses `tier='sub_portfolio'` and parents the node under the parent portfolio’s start node (or PMO).

### B. Per-instance local fields (the "add new local fields" half)
- [x] `SQL/v784_pm_hierarchy_create_time_inheritance.sql` — `scope_entity_type` / `scope_entity_id` on `custom_field_definitions` + partial unique indexes; `programmes.custom_fields` JSONB.
- [x] UI: Field Templates tab — “Add from existing fields (LDE)” vs “Create a new field just for this [entity]”.
- [x] Instance-local fields use the same `pm_template_field_links` mechanism (`createInstanceLocalField`).

### C. Rollout safety (important — this changes live creation behaviour)
- [x] **Opt-in checkbox** “Apply inherited field template” on Portfolio / Programme / Project create forms — **default off**. No silent behaviour change for existing callers.
- [x] Industry Plan forking remains a separate post-create Field Templates flow; checkbox copy clarifies it is unchanged.

## Cross-repo prerequisite (shared with Admin v187)

Done in v187 / monorepo `SQL/v783_portfolio_programme_template_domains.sql`.

## Explicitly out of scope
- Simulator — no Portfolio/Programme entities exist there; this is a Platform-only feature, documented exception to the parity rule (34.1), not an oversight.
- Not rebuilding `resolveEffectiveFields`/`pm_template_field_links`/LDE from scratch — extending what's already there.
- Not part of v185/v782's Form Template sample-content work — unrelated mechanism, unrelated tables.
- Promoting an instance-local field into the shared LDE catalog (future enhancement).

## Testing
- [x] Unit tests: parent-chain shapes in `pmTemplateInheritanceService.test.js`; create helpers in `pmTemplateCreateInheritance.test.js`.
- [x] Opt-in wiring: inheritance only runs when `applyFieldTemplateInheritance === true` (default false for all existing callers).
- [x] Local field scoping: instance defs set `scope_entity_*`; LDE picker filters `scope_entity_id IS NULL`.
- [x] Regression: create paths without the checkbox behave as before.

## Review

### What shipped
1. **`packages/shared/src/services/pmTemplateCreateInheritance.js`** — `applyFieldTemplateInheritanceOnCreate`, `pickCreateParentLink`, `resolveTierForCreate`, `applyResolvedFieldDefaults`, `createInstanceLocalField`.
2. **SQL `v784_pm_hierarchy_create_time_inheritance.sql`** — instance-local field scope columns + programme `custom_fields`.
3. **Services** — opt-in third-arg / options on `savePortfolio`, `saveProgramme`, `createProject`; ProjectsCreate UI path after parent links.
4. **UI** — create-form checkboxes (default off); TierFieldCustomisationPanel dual add paths.
5. **Docs** — `Documentation/PM_Hierarchy_Creation_Time_Inheritance_Guide.md`.
6. **Tests** — create-inheritance helpers + parent-chain shape coverage.

### Apply in Supabase
Run `SQL/v784_pm_hierarchy_create_time_inheritance.sql` before using instance-local fields or programme default JSON bags.

### Notes
- Document-master inheritance (`resolveEffectiveDocumentMaster`) is not auto-applied at create; Field Templates tab / industry fork panels remain the document path.
- Inheritance failures are **non-fatal** (logged) so a create never fails solely because template wiring failed.
