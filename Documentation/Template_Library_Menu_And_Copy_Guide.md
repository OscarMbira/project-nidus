# Template Library — Menu Rationalisation & Copy-to-Customise

**Plan:** `projectplan/v798_template_library_menu_rationalisation_and_copy_plan.md`  
**SQL:** `v799` (delivery methodology on Portfolio/Programme) · `v800` (menu) · `v801` (seed) · `v802` (menu re-parent + PMO grants) · `v803` (track label simplification, unrelated follow-up) · `v804` (process_template account-level RLS shape)

## What shipped

1. **Templates section** in the Platform/Simulator sidebar (`plat_sec_templates` / `sim_sec_templates`), parented under Portfolio & Delivery (`pmo-cat-project-delivery` / `sim_pmo_cat_project_delivery` — `v800`'s original parent guess didn't exist; `v802` corrected it), with **Template Library** (`/app/pmo/template-library`, `/simulator/pmo/template-library`). Classic Field Templates remain available as a child.
2. **Copy to customise** — system-synced `pm_template_nodes` can be forked into account-owned rows via `copyTemplateNodeForAccount`, per-domain, each with a genuinely different RLS ownership model (traced by hitting real RLS errors, not assumed):
   - **`fields`** — works generically (field-links are the only content, no separate catalog table).
   - **`opa`** — works; `organisational_process_assets` RLS requires `created_by = auth.uid()` and `organisation_id` = an account the caller can access, plus the `opa.create` permission. The copy explicitly sets both to the *copying* user/account — inheriting them from the source master (the original approach) always failed RLS.
   - **`process_template`** — works two ways. **Default (primary path): account-level PMO customisation** — `is_master=false`, `project_id NULL`, `account_id` = the copying org, mirroring the existing "PMO Templates ← Global Templates" pattern already used for `fields` (`createPmoFieldTemplateNode`). This required a real RLS change: `SQL/v708` originally only recognised a global master (`is_master=true`, `project_id IS NULL`, PMO-admin-only) or a project-scoped instance (`is_master=false`, `project_id IS NOT NULL`) — no account-level shape existed. `SQL/v804` adds it (SELECT/INSERT/UPDATE/DELETE, 24 tables, `public` schema). **Secondary path: project-scoped** — pass `scopeEntityType: 'project'` + a real `scopeEntityId` to instead set `project_id` on the copy. Content lives across the 24 tables, not one dedicated catalog; the polymorphic `process_template_node_links(document_table, document_id, node_id)` join table (`SQL/v766`) finds the source's table and links the copy back (these tables have no `pm_template_node_id` column of their own).
     **Known gap, not fixed here:** `sim`'s mirror tables (`sim.project_charters` etc.) have RLS *enabled* (`SQL/v629`) but **no policies defined anywhere** — a separate, pre-existing issue (nobody could read/write them under RLS before this either). Simulator parity for process_template copy needs its own follow-up migration, plus a sim-schema equivalent of `auth_user_can_access_project()` (the current one only checks `public.projects`/`project_memberships`) if project-scoped copy is wanted there too.
   - **`form_template` — now supported (`SQL/v809`, see below).** Originally unsupported for the reason described at the time: no ownership column existed on `form_templates` at all. Fixed by adding the same account-copy shape OPA/process_template already had.
3. **Methodology-scoped hide** — Library rows whose track isn't in the effective visible tracks are **hidden**, not greyed (changed from the original "disable in place" design after seeing it in practice — too much visual clutter at scale, e.g. 154/401 rows greyed). `methodology IS NULL` (common) always stays visible regardless of focus. The count line shows how many were hidden. Effective tracks re-resolve on the `nidus-methodology-pref-changed` event `MethodologySwitcher` dispatches (the sidebar's "Methodology Focus" control) — the page previously only listened for cross-tab `storage` events, which never fire for a same-tab dropdown change.
4. **Delivery methodology on Portfolio & Programme** — `delivery_methodology_track` column (same values as Project). Chain resolver: Project → Programme → Portfolio (nearest non-null, non-hybrid wins).
5. **Filters are deep-linkable** (`?q=`, `?tierFilter=`, `?domain=`, distinct from the pre-existing `?tier=`/`?entityType=`/`?entityId=` context params used for copy scoping) and the visible count updates live.

## Apply order

1. `SQL/v799_portfolio_programme_delivery_methodology.sql`
2. `SQL/v800_template_library_menu.sql`
3. `SQL/v801_template_library_seed_data.sql` (optional demo rows)
4. `SQL/v802_template_library_pmo_menu_placement.sql` — **required**, not optional; corrects `v800`'s wrong parent guess and re-issues PMO-tier role grants.
5. `SQL/v804_process_template_account_level_rls.sql` — **required** for process_template copy to work at all (public schema only — see the Simulator gap noted above).

Hard-refresh after menu SQL. If the Templates section still doesn't appear after a hard refresh, the sidebar caches its tree in `localStorage` (`nidus_sidebar_v7_*` keys) independently of the HTTP cache — clear those keys manually (DevTools → Application → Local Storage) and refresh again.

## Smoke

- Open Template Library; switch Methodology Focus — non-matching rows disappear (not just grey out); Common rows stay visible throughout; the count line reflects how many are hidden.
- Copy a system-synced Fields, OPA, or process_template template from the generic (no project context) Library view; confirm a new account-owned node appears (process_template lands with `project_id NULL`, `account_id` = your org).
- Open the Library from within a real project (`?entityType=project&entityId=…`) and copy a `process_template` row; confirm it lands as a project-scoped row (`project_id` set) instead.
- Confirm copying a `form_template` row fails with the explicit "not supported" message, not a raw RLS error.
- Set a Programme to Agile, leave child Project unset — Library opened with `?entityType=project&entityId=…` should resolve Agile from the Programme.

## v805 — Global vs Organisational split, bulk copy, full CRUD, downstream inheritance

**Plan:** `projectplan/v805_global_vs_organisational_template_libraries_plan.md`
**SQL:** `v805_organisational_templates_menu.sql`

### What shipped
1. **Two separate pages/menu entries**, not one mixed list. `TemplateLibraryPage.jsx` now only shows `is_system_synced=true` (Global) rows — title changed to "Global Template Library". New **`OrganisationalTemplatesPage.jsx`** (+ Simulator mirror) shows the account's own rows (`is_system_synced=false`), with a link back and forth between the two. New menu leaves `plat_tpl_organisational` / `sim_tpl_organisational`, siblings of `plat_tpl_library` / `sim_tpl_library` under the same Templates section.
2. **Bulk select + bulk copy** on the Global Template Library — checkbox column, "select all (current filter)", and a bulk toolbar that copies all selected rows **sequentially** (not `Promise.all`) with a results summary ("18 copied, 2 skipped (not supported), 1 failed") — some domains (`form_template`) fail by design, so an aborted parallel batch would be worse than a clean per-row report.
3. **Full CRUD on Organisational Templates** — previously only Create (via Copy) existed:
   - **Read/Update**: new `OrganisationalTemplateDetailPage.jsx` (+ Simulator mirror) — edits the node's own `name`/`description`/`category` (`updateTemplateNode`, new in `pmTemplateNodeService.js`) plus, per domain: `opa` → title/description in place (`updateOpaContent`) with a link to the full `OPAEdit.jsx` editor for richer fields; `process_template` → title/description/raw JSON `document_data` (`updateProcessTemplateContent`) via the new `pmTemplateContentService.js` (which locates the row's actual table through `process_template_node_links`, same lookup as the copy service); `fields` → links out to the existing `PmoFieldTemplateDetailPage.jsx`. **Portfolio/Programme/Project-level templates have no additional content to edit** — confirmed by re-checking `pm_template_nodes`' actual columns and `SQL/v785`'s sync function: no payload column exists and `domain_ref_id` is set to `NULL` for these three domains, so the node's own name/description/category is genuinely the entire editable surface, not a corner cut for this pass.
   - **Delete**: `archiveTemplateNode()` — `pm_template_nodes` has no `is_deleted` column, only `is_current` (used elsewhere for version supersession), so "delete" sets `is_current=false`, which every existing read query already filters on.
4. **Downstream tiers inherit the org's version, not the raw Global one** — the actual mechanism, since simply copying doesn't do this on its own (see the Phase-0 finding below):
   - New `resolveAccountTemplateOverride()` (`pmTemplateOverrideService.js`) — looks up whether the account already has a current node with `parent_node_id` = a given Global node's id. Deliberately **not** a `resolveStartNodeId` tiebreak flip — that resolver is built for "one governing document per domain" (Fields/Industry-Plan/OPA) and flipping it would silently change default behaviour for every account in those domains; `process_template` represents many independently-named documents per domain, so the correct key is `parent_node_id` (set by `copyTemplateNodeForAccount`), not domain/category.
   - Global Template Library rows now show a **"you have a custom version →"** link when an override exists, linking to Organisational Templates.
   - When the Library is opened scoped to a downstream tier (`?entityType=portfolio|programme|project&entityId=…`) and the PMO copies a row that already has an org override, the copy now **forks from the override**, not the raw Global row — carrying the org's customisation forward into the narrower scope. This required relaxing `copyTemplateNodeForAccount`'s "must be system-synced" guard to also allow forking your *own* existing organisational template (`account_id` matches the caller) — previously that always threw.

### Research finding that reshaped this plan
Before building, confirmed (not assumed) that `resolveStartNodeId`'s fallback query in `pmTemplateInheritanceService.js` explicitly does `.order('is_system_synced', { ascending: false })` — sorting the **global** master before the org's own copy as its tiebreak. So prior to this work, copying a template did **not** make downstream tiers prefer it in any way. That resolver is untouched by this plan (see decision above) — the new override mechanism is deliberately separate.

### Apply order (adds to the v798 list above)
6. `SQL/v805_organisational_templates_menu.sql` — required for the Organisational Templates sidebar entry to appear (same "wrong parent guess" risk as `v800`/`v802` — verify the menu row's `parent_menu_id` actually resolved if it doesn't show up after a hard refresh).

### Smoke
- Global Template Library: select several rows (checkbox + "select all"), bulk-copy, confirm the results summary and that they now appear in Organisational Templates.
- Organisational Templates: open a copied row's detail page, edit its name and (for `opa`/`process_template`) its content, save, confirm it persists; retire it and confirm it disappears from the list.
- Copy a Global row once (creating an override), then revisit Global Template Library and confirm the "you have a custom version →" link appears on that row.
- Open the Library scoped to a real project (`?entityType=project&entityId=…`) for a Global row that already has an org override, copy it, and confirm (via the Organisational Templates list) that the new project-scoped node's content matches the *org's* customised version, not the vanilla Global one.

## v807 — Methodology-grouped sidebar, real downstream inheritance, OPA provenance

**Plan:** `projectplan/v807_organisational_template_methodology_sidebar_and_downstream_inheritance_plan.md`
**SQL:** `v807_organisational_templates_methodology_sidebar.sql` (menu) · `v807_organisational_template_seed.sql` (seed)

### What shipped
1. **Methodology-grouped sidebar** under the existing "Organisational Templates" leaf — mirrors the Admin app's Global Templates nav grouping (`defaultAdminNav.js`): 3 non-navigable tier-group headers (**Portfolio / Programme / Project**), each with 3 methodology leaves (**Structured / Standards-Based / Agile**), all linking to the *same* `OrganisationalTemplatesPage` with different `?tier=&domain=&methodology=` query params — no new pages. Scoped deliberately to the three tier-template domains only (`portfolio_template`/`programme_template`/`project_template`), not Admin's Forms/Content Coverage/Process Docs subsections, since those are Admin-only content-authoring concerns with no organisational-copy equivalent here.
2. **`pmbok`/`standards_based` identifier history, corrected.** `pm_template_nodes.methodology` originally stored `'pmbok'` (`SQL/v785`); `SQL/v797` renamed only the *display label* to "Standards-Based"; `SQL/v798` later renamed the **stored identifier itself** too — the live CHECK constraints and `sync_global_template_node`'s own validation now require `'standards_based'` and reject `'pmbok'` outright (confirmed the hard way: an early draft of this work's seed file hit `Invalid methodology: pmbok` against the live DB, which is what surfaced that v798 existed and had been missed during initial research). The new "Standards-Based" sidebar leaf's URL correctly uses `?methodology=standards_based`. Also fixed a **pre-existing display bug**: `methodologyLabel()` in both `TemplateLibraryPage.jsx` and `OrganisationalTemplatesPage.jsx` (+ Simulator mirrors) had no normalisation step at all, so any row still carrying a legacy `pmbok` value would display the literal string `"pmbok"` instead of a label — fixed by reusing the existing `normalizeProjectDeliveryTrack()` helper (already in `methodologyMenuUtils.js`, already handled `pmbok`/`waterfall-pmbok`) rather than adding a new duplicate function.
3. **Query-param filtering wired into both template pages** — `OrganisationalTemplatesPage.jsx` (previously pure local state, no URL sync at all) and `TemplateLibraryPage.jsx` (already read `domain`/`tierFilter`, not `methodology`) now both read/sync `tier`/`domain`/`methodology` via `useSearchParams`, so the new sidebar leaves land pre-filtered and the state stays correct when navigating between sibling leaves without a full remount.
4. **Real downstream inheritance fix** — v805 explicitly left `resolveStartNodeId`'s fallback tiebreak untouched (`.order('is_system_synced', { ascending: false })`, Global-first) to avoid changing behaviour for Fields/Industry-Plan/OPA. Confirmed this same fallback also governs `portfolio_template`/`programme_template` (and now `project_template`, previously **missing entirely** from `PM_TEMPLATE_DOMAINS`) — meaning a Portfolio/Programme/Project manager with no explicit entity assignment still defaulted to the Global master even after their PMO customised the org's own copy. Fixed by branching the tiebreak: `ACCOUNT_PREFERRED_DOMAINS` (the three tier-template domains) now sorts `is_system_synced ASC` (org copy wins); every other domain is untouched.
5. **OPA provenance badge** — `OPAList.jsx`/`OPADetail.jsx` (+ Simulator `SimOPAList.jsx`/`SimOPADetail.jsx`) now show a "from Global: {name}" link (batched lookup, not N+1) when an OPA's `pm_template_node_id` traces back to a Global source node via `parent_node_id` — new `resolveTemplateProvenanceBatch()` in `pmTemplateOverrideService.js`. Previously this provenance was only visible from the Organisational Templates / Template Library side, never from the native Process Assets screens themselves.
6. **Seed data** (rule 18.2) — `SQL/v807_organisational_template_seed.sql` calls the existing `sync_global_template_node(..., p_target := 'both')` RPC 9 times (3 tiers × 3 methodologies, fixed hex UUIDs, idempotent) so the new sidebar leaves aren't empty out of the box. Seeds the **Global** side only (fanned out per-account by the existing sync function, same as all other Global content) — deliberately does not fabricate fake per-account "customised" rows, since that would misrepresent what an account has actually chosen to override.

### Apply order (adds to the v798/v805 lists above)
7. `SQL/v807_organisational_templates_methodology_sidebar.sql` — required for the grouped sidebar leaves to appear (same wrong-parent-guess risk as `v800`/`v802`/`v805` — run the smoke-test SELECT at the end of the file and verify every row's `parent_menu_id` resolves).
8. `SQL/v807_organisational_template_seed.sql` — optional but recommended; without it the 9 new leaves render empty until a PMO bulk-copies matching rows themselves.

### Smoke
- Sidebar: `Organisational Templates` now expands into Portfolio/Programme/Project, each expanding into Structured/Standards-Based/Agile; clicking "Standards-Based" under any tier shows only that tier's Standards-Based-tagged rows (verify the URL carries `methodology=standards_based`).
- Confirm a Standards-Based row's methodology column reads "Standards-Based", not a raw legacy value (both Global Template Library and Organisational Templates pages).
- Copy a Global Portfolio/Programme/Project template, confirm it lands in Organisational Templates; open a Portfolio/Programme/Project entity with no explicit template assignment and confirm the org's customised copy is now what resolves as the default (not the Global master).
- Open an OPA record that was copied from a Global OPA template (via Template Library bulk copy) — confirm both `OPAList`/`SimOPAList` (row) and `OPADetail`/`SimOPADetail` (detail page) show a "from Global" link, and that it navigates to the correct Global node's preview.

## v809 — form_template copy support

**SQL:** `v809_form_template_account_level_copy.sql`

### What shipped
Copying a `form_template`-domain row from the Global Template Library previously threw `Copy not supported for domain: form_template` — `form_templates` had no ownership column at all, only a blanket `is_user_pmo_admin()` write gate (`SQL/v754`). Fixed the same way `v804` fixed the identical gap for `process_template`:

1. **New columns**: `account_id` (nullable — `NULL` = global master, set = an account's own customised copy) and `created_by`, added to both `public.form_templates` and `sim.form_templates`.
2. **RLS split into per-action policies** on `form_templates` (previously one combined `FOR ALL` policy) recognising three shapes: global master (`account_id IS NULL`, PMO-admin-only), and an account-level PMO customisation (`account_id` set, the copying user or a PMO admin with account access). `form_template_versions`' write policy gained the same shape, checked via the parent `form_templates` row (versions carry no `account_id` of their own) — its SELECT policy was already fully open and needed no change.
3. **`duplicateFormTemplateRow()`** (`pmTemplateCopyService.js`) — mirrors `duplicateOpaRow`'s pattern: clones the source row, generates a fresh `template_code` (unique constraint — can't reuse the source's F0xx code), sets `account_id`/`created_by` to the copying account/user, and clones the **current published `form_template_versions` schema** too (otherwise the copy would open as an empty form with no fields). Back-links via `pm_template_node_id`, same as OPA/process_template.
4. `form_template` removed from `COPYABLE_DOMAINS`'s exclusion — copy now works identically to every other domain from the Template Library UI (single-row and bulk).

### Apply order
9. `SQL/v809_form_template_account_level_copy.sql` — required before any `form_template` copy will succeed; run after `v754`.

### Smoke
- Copy a `form_template`-domain row (e.g. "Benefits Review Plan") from the Global Template Library — confirm no error, and the new row appears in Organisational Templates with a new `F0xx` code, not the source's.
- Open the copy's detail page and confirm its fields/sections match the source (not empty) — this proves the version-schema clone worked, not just the metadata row.
- Confirm the *original* Global row is untouched (still has its original `template_code`, `account_id IS NULL`).
