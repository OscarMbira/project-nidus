# v849 — Project Documents Register (process_template): Explicit Capture, List, Retire-with-Archive

PRD: `projectprd/v849_project_actual_data_register_PRD.md`

## Goal
Give the PM a single, dedicated register listing every process document (Project Charter, PID,
etc.) the tier cascade makes available to their project — Captured vs. Not-yet-captured — with a
one-click Capture action and a Retire action that properly archives the underlying data instead
of orphaning it. Built entirely on the existing, correct cascade-resolution service; no new
resolution or copy logic invented.

## Reused building blocks (confirmed by code research — do not reinvent)
- `packages/shared/src/services/pmTemplateInheritanceService.js`:
  - `resolveProjectTierAncestry(db, projectId, { schema })` — project's real Programme/Portfolio
    parentage.
  - `resolveOrgTemplatesForProject(rows, { projectId, programmeId, portfolioId })` — the
    "not yet captured" candidate set (nearest-tier fork per family, excludes rows already
    copied to this project).
  - `filterProjectOwnTemplateNodes(rows, projectId)` — the "captured" set.
- `packages/shared/src/services/pmTemplateCopyService.js`: `copyTemplateNodeForAccount(...)` —
  the Capture action calls this exactly as Project Templates already does (`scopeEntityType:
  'project'`), forking from the nearest-tier row `resolveOrgTemplatesForProject` returned.
- `packages/shared/src/services/pmTemplateNodeService.js`: `archiveTemplateNode` — still used for
  the node side of Retire; extended (see Todo 2) to also archive the linked catalog row.
- `packages/shared/src/services/pmTemplateContentService.js`: `findProcessTemplateTable` /
  `PROCESS_TEMPLATE_TABLES` — reused to resolve which of the 24 tables a given row's data lives
  in.

## Todo

### 1. SQL: archive flag on the 24 catalog tables
- [x] `SQL/v849_process_template_tables_is_deleted.sql`: for each table in
  `PROCESS_TEMPLATE_TABLES` (`project_charters`, `assumption_logs`, ... 24 total, `public`
  schema) add `is_deleted BOOLEAN NOT NULL DEFAULT FALSE`. Companion block for the `sim` schema
  equivalents (practice_ prefixed tables, per rule 34.1 parity — confirm exact sim table names
  first, don't assume identical names to public).
  Update the existing RLS SELECT policies on these 24 tables to exclude `is_deleted = TRUE`
  (mirror the `is_deleted = FALSE` pattern already used on `risk_management_strategies` etc.,
  per v835).
- [x] No `database_tables` registry changes needed — these are existing tables, not new ones
  (CLAUDE.md registration rule only applies to newly created tables).

### 2. Extend Retire to archive the linked data row
- [x] `pmTemplateNodeService.js`: add `archiveProcessTemplateContent(db, table, id)` — sets
  `is_deleted = true` on the given catalog row.
- [x] `OrganisationalTemplateDetailPage.jsx` (`handleDelete`, both Platform pmo-module and
  Simulator sim-pmo-module): when `contentInfo.kind === 'process_template' && contentInfo.table`,
  call the new archive function alongside the existing `archiveTemplateNode` call, in the same
  try block (both must succeed or the user sees a clear partial-failure error — don't silently
  leave one archived and not the other).
  Also wired on list Retire (`OrganisationalTemplatesPage`) via
  `archiveProcessTemplateNodeAndContent`.

### 3. Handle re-Capture of a retired document
- [x] In `resolveOrgTemplatesForProject` usage (or a thin wrapper used only by the new register),
  after computing "not yet captured" candidates, check whether a `PROCESS_TEMPLATE_TABLES` row
  already exists for `(project_id, ...)` with `is_deleted = true` matching this template family
  (via `process_template_node_links` history or the catalog row's own lineage — confirm exact
  lookup during implementation; the join table only tracks the *current* node, so this may need
  a query against the catalog table directly, filtered by `project_id` and `is_deleted = true`).
- [x] If found: Capture button shows a **"Restore"** label instead, which flips `is_deleted`
  back to `false` on the existing row (and re-creates the `pm_template_nodes` copy + link if the
  node itself was also archived) rather than calling `duplicateProcessTemplateRow` again. If not
  found: normal Capture (new row) as today.
  Implemented via archived `pm_template_nodes` (`is_current=false`) family match +
  `restoreArchivedProjectProcessTemplate` in `projectDocumentsRegisterService.js`.

### 4. New "Project Documents" page — Platform
- [x] `packages/modules/pmo-module/src/pages/ProjectDocumentsRegisterPage.jsx`: new component.
  Loads account templates via existing `listTemplateLibraryNodes(..., { isSystemSynced: false,
  domain: 'process_template' })`, resolves ancestry via `resolveProjectTierAncestry`, splits into
  Captured (`filterProjectOwnTemplateNodes`) and Not-yet-captured
  (`resolveOrgTemplatesForProject`) sets. Table-list view (default per rule 41) with sortable
  columns (rule 40), row numbers (rule 44), search bar, Card/Table toggle
  (`useViewMode('project-documents-register', 'list')`), theme-aware (rule 28.1). Row actions:
  Captured → View/Edit (icon-only `RowActionButton`, links to existing
  `OrganisationalTemplateDetailPage` route) + Retire; Not-yet-captured → Capture/Restore button.
  Export menu (rule 38) for the combined list.
- [x] `apps/platform/src/pages/documents/ProjectDocumentsEntry.jsx`: thin wrapper mirroring
  `ProjectTemplatesEntry.jsx` exactly (`usePlatformProjectId()`, entityType/entityId query-param
  resolution, "select a project first" fallback), rendering
  `@nidus/pmo-module/pages/ProjectDocumentsRegisterPage.jsx`.
- [x] Register route `/platform/documents/project` in `apps/platform/src/routes/platformRoutes.jsx`
  (mirror how `/platform/templates/project` is registered).

### 5. New "Project Documents" page — Simulator
- [x] Same three pieces mirrored into `sim-pmo-module` /
  `apps/simulator/src/pages/documents/ProjectDocumentsEntry.jsx`, route
  `/simulator/pm/documents/project`.

### 6. Sidebar menu
- [x] `SQL/v849_pm_project_documents_menu.sql`: new top-level menu item `plat_pm_project_documents`
  ("Project Documents"), positioned adjacent to `plat_pm_project_templates` — mirror v844's
  pattern exactly (insert into `menu_items` under the same parent section, grants copied from
  `plat_pm_project_templates` the same way v845 fixed grants for that leaf, so this doesn't repeat
  the same orphaned-grant bug). Include the Simulator equivalent
  (`sim_pm_project_documents` → `/simulator/pm/documents/project`) in the same file or a
  clearly-labelled companion block.
  Sidebar category mapping updated in `packages/config` + Platform + Simulator
  `pmoSidebarCategories.js` / `pmoMenuHierarchyUtils.js`.

### 7. Verification
- [ ] Browser: register shows correct Captured/Not-yet-captured split; Capture lands on fill-in
  form and creates exactly one row; Retire archives both node and data row (`is_deleted=true`
  confirmed in DB); re-Capture on a retired document shows Restore, not a duplicate row.
- [ ] Browser: Programme-level template fork correctly appears as the capture candidate for a
  project under that Programme (not the raw Global version).
- [ ] Browser: Simulator parity pass.
- [ ] Sidebar: confirm "Project Documents" renders for `project_manager` role without needing a
  hard-refresh workaround (checks the grant-copy step in Todo 6 actually worked).

## Explicitly out of scope
- Removing or changing the v822 one-copy-per-scope cap.
- Any change to `form_template` — see `v850_form_instances_gallery_fix_plan.md`.
- Hard-deleting any row.
- Reconciling historical Process Templates Hub orphans (flagged separately in [[v848]]).

## Review

### Summary
v849 delivers a dedicated **Project Documents** register for `process_template` only, reusing the
existing cascade helpers (`resolveOrgTemplatesForProject`, `filterProjectOwnTemplateNodes`,
`copyTemplateNodeForAccount`) with no new resolution logic.

### Delivered
1. **SQL** — `v849_process_template_tables_is_deleted.sql` (idempotent `is_deleted` + SELECT RLS
   hide archived) for public + sim; `v849_pm_project_documents_menu.sql` (menu + grant copy).
2. **Retire-with-archive** — `archiveProcessTemplateNodeAndContent` archives node
   (`is_current=false`) and catalog (`is_deleted=true`); wired on detail + list Retire for
   process_template rows (Platform + Simulator).
3. **Restore** — register detects archived project copies by parent-family match; Capture button
   becomes Restore and un-archives catalog + node instead of duplicating.
4. **UI** — `ProjectDocumentsRegisterPage` + Entry routes for Platform
   (`/platform/documents/project`) and Simulator (`/simulator/pm/documents/project`); View/Edit
   deep-link to existing Project Templates detail.
5. **Sidebar** — category defs + hierarchy mapping for `plat_pm_project_documents` (order 27).
6. **Tests** — unit coverage for archive helpers and capture/restore modes in
   `@nidus/shared`.
7. **Docs** — `Documentation/Project_Documents_Register_v849.md`.

### Apply SQL
Run in order on Supabase:
1. `SQL/v849_process_template_tables_is_deleted.sql`
2. `SQL/v849_pm_project_documents_menu.sql`

### Browser verification (Todo 7)
Left for manual QA after SQL apply — Captured/Capture/Retire/Restore paths and sidebar grant
visibility for `project_manager`.

### Independent verification (post-implementation code review) — found and fixed one regression

Traced every RLS policy this migration touches back to its currently-authoritative prior
migration, not just the diff:

- **Public schema SELECT policy** — verified word-for-word against
  `SQL/v804_process_template_account_level_rls.sql` (the latest prior authority, superseding
  v629/v708). Matches exactly (`is_master` OR `auth_user_can_access_project` OR account-level
  PMO shape), with `is_deleted` exclusion correctly layered on top. No issue.
- **Sim schema SELECT policy — regression found and fixed.** The original implementation
  recreated the **v632** owner-only shape (`practice_project_id IN (SELECT id FROM
  practice_projects WHERE user_id = auth.uid())`), not the actually-current **v842** shape.
  v842 exists specifically because v632's shape was broken — its own header comment documents
  that it "blocks Simulator 'Copy down to my project' ... for anyone who is not the
  practice_projects.user_id owner" and omits master/account-level rows entirely (no
  `is_master`/account clause at all). Silently reverting to v632 would have broken, for the sim
  schema across all 24 tables: any non-owner team member's read access, all master/global rows,
  and all PMO account-level customisations. **Fixed** by replacing the SELECT policy body in
  `SQL/v849_process_template_tables_is_deleted.sql` with v842's actual logic
  (`is_master` OR `sim.auth_user_can_access_practice_project(practice_project_id)` OR
  account-level shape) plus the `is_deleted` exclusion — same fix shape as the public schema.
  **Not yet applied to any database** (this SQL hadn't been run) — the fix is in the file only;
  no live data or access was ever actually affected.
- **`is_deleted` column premise** — confirmed accurate: the column has existed on all 24 tables
  since `v629_process_templates_new_tables.sql`, but no SELECT policy on these tables' own row
  ever checked it (v629's policy checked `user_projects.is_deleted`, a different column on a
  join table) — so wiring it into the table's own SELECT policy here is genuinely new, not
  redundant.
- **Archive/Restore service logic** (`pmTemplateNodeService.js`:
  `archiveProcessTemplateNodeAndContent`, `findArchivedProjectProcessTemplateCopy`,
  `restoreArchivedProjectProcessTemplate`) — read in full; matches the plan's Todo 2/3 intent,
  throws a clear partial-failure error if node archives but content-archive fails, restore
  correctly un-archives both sides.
- **Menu grants** — confirmed `SQL/v849_pm_project_documents_menu.sql` copies
  `role_menu_items` grants from `plat_pm_project_templates` / `sim_pm_project_templates` for the
  new leaf, rather than only inserting the `menu_items` row — the exact fix-shape v845 needed
  for the previous menu addition, correctly repeated here rather than the bug it fixed.
- **Form delete gating** (v850, shared PRD) — `formInstanceRegisterUtils.js`'s
  `canArchiveFormInstance` correctly allows draft/in_review(submitted)/rejected and excludes
  approved, matching the plan decision.

**Action taken:** fixed the sim RLS regression directly in the SQL file (safe — unapplied to any
database). Everything else reviewed matches the plan with no changes needed.
