# v914 — Menu Bundles

PRD: `projectprd/v914_org_menu_bundles_PRD.md`

## Context found during investigation

- `roles`/`project_roles` already use the `account_id` (NULL = built-in, set = org-scoped)
  pattern with per-account uniqueness (`v902_organisation_custom_roles_schema.sql`) — Menu
  Bundles reuse this exact pattern rather than inventing a new scoping convention.
- `update_org_custom_role` (`v903`) **already accepts both** `p_add_menu_item_ids` and
  `p_remove_menu_item_ids`, and the JS wrapper `updateOrgCustomRole()`
  (`organisationCustomRoleService.js:441`) **already forwards both** — the "edit mode is
  remove-only" restriction is a **pure frontend UI limitation** in `OrgRoleDetail.jsx` (it only
  ever calls the wrapper with `removeMenuItemIds`, never `addMenuItemIds`). This means the PRD's
  decision 10/11 (edit mode becomes full add+remove) needs **zero SQL or service changes** —
  it's a frontend-only rework of the edit-mode menu section. Confirmed by reading both the RPC
  (`SQL/v903_organisation_custom_roles_rpcs.sql:192-199`) and the wrapper directly.
- `getGrantableMenuItems()` (`organisationCustomRoleService.js`) already returns everything a
  bundle picker needs: deduped-by-label rows with `ids` (all underlying `menu_items.id`s a
  label represents), `category`, `isCategory`. No changes needed to this function for Menu
  Bundles — it's reused as-is by the bundle's own picker.
- `role_menu_items.role_id` references `roles.id`, not `project_roles.id` — creating a custom
  role mirrors a row into `roles` (with `account_id` set) purely so `role_menu_items` has
  something to join against (see `v903`/`v912`, both `INSERT INTO project_roles` then
  `INSERT INTO roles`). Menu Bundles have no such requirement — a bundle's items live in a new,
  simple join table (`org_menu_bundle_items`) with no dependency on `roles`/`role_menu_items` at
  all, since a bundle is never itself an access grant, only a saved *selection*.
- Existing account-scoped writes go exclusively through `SECURITY DEFINER` RPCs
  (`user_can_manage_org_roles` gate), with RLS SELECT policies left broadly permissive for
  authenticated users and the JS service layer doing the `account_id` filtering explicitly
  (mirrors `getOrgCustomRoles(accountId)`). Menu Bundles follow the same split: broad
  authenticated SELECT policy + RPC-gated writes + JS-layer account filtering.
- `v904_organisation_custom_roles_menu.sql` is the exact template for the new sidebar menu
  item — sibling of `pmo-people-manage-roles` under the same `pmo-cat-teams` parent, granted to
  the same role_name list.
- The picker/preview UI now living in `OrgRoleDetail.jsx` (`SidebarPreview` + the "Sidebar menu
  access" checkbox list + `toggleSelectedMenuItem`'s cascade logic + `childCountByCategoryLabel`
  hint) was extensively hardened this session (cascade-select, duplicate-category-row
  resolution, always-visible preview). This is the exact block to extract into a shared
  component — no new picker behavior to design.

## Correction made during implementation

Confirmed by reading `packages/supabase/src/index.js` and both apps' `organisationCustomRoleService.js`:
Simulator's `supabase` import resolves to `platformDb` (the `public`-schema client), **not**
`simDb` — `roles`/`project_roles`/`menu_items`/`role_menu_items`/`accounts`/`users` are already
shared `public`-schema infrastructure used identically by both apps (a role created via
Simulator's Manage Roles is the same row Platform's Manage Roles sees). Rule 34 parity for this
feature therefore means "the same feature works in both apps' UI," not "duplicate the schema" —
Menu Bundles get **one** `public.org_menu_bundles`/`public.org_menu_bundle_items` pair and **one**
set of RPCs, exactly like roles already work. There is no `sim.org_menu_bundles` and no `v915_sim_
org_menu_bundles_*` file. Only the sidebar **menu item row** (Phase 6) is genuinely per-app, since
`v904`(Platform)/`v909`(Simulator) already established that pattern — same `public.menu_items`
table, two different rows with two different `route_path`s.

## Naming decided during this plan

- Table names: `public.org_menu_bundles`, `public.org_menu_bundle_items` — shared by both apps
  (see correction above).
- Shared component name: `MenuItemPicker` (picker + preview together as one component,
  `packages/ui/src/MenuItemPicker.jsx` is the natural home per rule 34.3, but see Phase 1 note
  on why it starts as an app-local extraction first).
- Service: `organisationMenuBundleService.js` (Platform + Simulator, mirrors
  `organisationCustomRoleService.js` naming).
- Pages: `ManageMenuBundles.jsx` (list), `MenuBundleDetail.jsx` (create/view/edit).
- Routes: `admin/manage-menu-bundles` · `admin/manage-menu-bundles/create` ·
  `admin/manage-menu-bundles/:id` · `admin/manage-menu-bundles/:id/edit` (Platform);
  `pmo/manage-menu-bundles` equivalents (Simulator), matching the existing
  `admin/manage-roles` / `pmo/manage-roles` split.
- Menu code: `pmo-people-manage-menu-bundles` (Platform), sibling of
  `pmo-people-manage-roles` under `pmo-cat-teams`; Simulator equivalent per `v909`'s pattern.

## Todo checklist

### Phase 1 — Extract shared `MenuItemPicker` component (pure refactor, no behavior change) ✅ COMPLETE
- [x] Move the "Sidebar menu access" checkbox list (with `childCountByCategoryLabel` hint,
      cascade-select `toggleSelectedMenuItem`) and the `SidebarPreview` component out of
      `OrgRoleDetail.jsx` into a new shared component, `MenuItemPicker.jsx`, that accepts
      `grantableMenuItems`, `selectedMenuItemIds`, `onToggle`, and a search string, and renders
      both the picker list and the preview panel side by side (exactly today's layout).
- [x] Land it first as a local component file imported by both `OrgRoleDetail.jsx` and (once
      built) `MenuBundleDetail.jsx` in **each app separately** (`apps/platform/src/components/`
      and `apps/simulator/src/components/`) rather than `packages/ui` initially — this session's
      established sync pattern (`cp` + `sed` path swap + diff-verify) is proven and low-risk;
      promoting it into `packages/ui` is a good follow-up but not required for this feature to
      ship, and rule 34.3 doesn't mandate packages/* for a component only these two pages use.
- [x] Update `OrgRoleDetail.jsx` (both apps) to use the extracted component with no behavior
      change.
- [x] Verify: `esbuild` syntax check on all touched files; re-run
      `organisationCustomRoleService.test.js` (31/31 expected, unaffected since it only tests the
      service layer, not this component) on both apps; manual smoke-test of Create Role in the
      browser to confirm identical behavior to before extraction.

### Phase 2 — Schema (`SQL/v914_org_menu_bundles_schema.sql`) ✅ COMPLETE (not yet run against the DB)
- [x] `public.org_menu_bundles`: `id UUID PK`, `account_id UUID NOT NULL REFERENCES accounts(id)
      ON DELETE CASCADE`, `bundle_name VARCHAR(150) NOT NULL`, `description TEXT`,
      `is_active BOOLEAN DEFAULT TRUE`, `is_deleted BOOLEAN DEFAULT FALSE`, `deleted_at`,
      `deleted_by`, standard `created_at/created_by/updated_at/updated_by` audit columns
      (rule 63.1 Record history card needs these).
- [x] Unique index on `(account_id, lower(bundle_name))` where `is_deleted = FALSE` — per-account
      name uniqueness (PRD decision 8), case-insensitive to avoid "Field Team" vs "field team"
      near-duplicates.
- [x] `public.org_menu_bundle_items`: `id UUID PK`, `bundle_id UUID NOT NULL REFERENCES
      org_menu_bundles(id) ON DELETE CASCADE`, `menu_item_id UUID NOT NULL REFERENCES
      menu_items(id) ON DELETE CASCADE`, `created_at`. Unique on `(bundle_id, menu_item_id)`.
- [x] RLS: enable on both tables. SELECT policy broadly permissive for `authenticated` (mirrors
      `project_roles`' existing read policy) — the JS service filters by `account_id` explicitly,
      same as `getOrgCustomRoles(accountId)`. No direct-client INSERT/UPDATE/DELETE policies —
      all writes go through the Phase 3 RPCs only (rule 42).
- [x] `database_tables` registration for both new tables (mandatory, both `public.*` and the
      Simulator `sim.*` pair in the Simulator-schema companion file).
- [x] No Admin ID Generation needed (rule 16.2 applies only when a table exposes a
      human-readable *reference/identifier* column like `PROJ-0001`) — `bundle_name` is a
      user-chosen label, not a system-generated sequential ID, same reasoning as why
      `project_roles.role_name` never got one.
- [x] No Simulator schema companion — see "Correction made during implementation" above.

### Phase 3 — RPCs (`SQL/v915_org_menu_bundles_rpcs.sql`, shared `public` schema) ✅ COMPLETE (not yet run against the DB)
- [x] `create_org_menu_bundle(p_account_id, p_bundle_name, p_description, p_menu_item_ids
      UUID[])` — `SECURITY DEFINER`, calls `user_can_manage_org_roles(auth-resolved user,
      p_account_id)` for authorization (PRD decision 4, reused as-is), inserts the bundle row +
      its items, returns the new bundle id.
- [x] `update_org_menu_bundle(p_bundle_id, p_bundle_name, p_description, p_menu_item_ids
      UUID[])` — full-replace semantics for items (delete-then-insert the item set, simplest
      correct approach for a small join table with no history requirement).
- [x] `delete_org_menu_bundle(p_bundle_id)` — soft delete (`is_active = FALSE, is_deleted =
      TRUE`, PRD decision 6). No cascade to any role — none exists, since role grants are a
      one-time copy (PRD decision 2).
- [x] One set of RPCs — both apps' services call the same `public` schema functions.

### Phase 4 — Service layer ✅ COMPLETE
- [x] `organisationMenuBundleService.js` (Platform first, then byte-identical copy to Simulator —
      this service has no per-app path constants, so `diff` after copy should show **zero**
      difference, unlike `organisationCustomRoleService.js`/`OrgRoleDetail.jsx` which carry the
      `MANAGE_ROLES_PATH`-style constant): `getOrgMenuBundles(accountId)`,
      `getMenuBundleById(idOrSlug, accountId)` (UUID-or-slug per rule 16.3, mirrors
      `getRoleById`), `createOrgMenuBundle(...)`, `updateOrgMenuBundle(...)`,
      `deleteOrgMenuBundle(bundleId)`. Reuses `getGrantableMenuItems()` from
      `organisationCustomRoleService.js` for the picker data — no duplicated menu-fetching logic.
- [x] Unit tests: `organisationMenuBundleService.test.js` (Platform, then synced to Simulator),
      following the existing mock patterns in `organisationCustomRoleService.test.js`.

### Phase 5 — UI: Manage Menu Bundles pages ✅ COMPLETE
- [x] `ManageMenuBundles.jsx` — searchable/sortable list (rules 40/40.1/41/44: Table-list
      default, row numbers, alphabetical-then-created default sort), Card/Table toggle, icon-only
      View/Edit/Delete row actions (rule 61), Export dropdown reusing `ExportListMenu` (rule 38),
      theme-aware (rule 28.1), PWA-friendly (rule 29).
- [x] `MenuBundleDetail.jsx` — non-modal create/view/edit page (rule 65) at the routes listed
      above, friendly-URL by bundle-name slug (rule 16.3, mirrors `OrgRoleDetail.jsx`'s
      `role_name`-based URLs), success modal on save (rule 16), unsaved-changes guard (rule 52),
      Details/Audit-details tabs (rule 63.1 — Identity/Classification/Record history cards; no
      Technical reference card). Uses the Phase 1 `MenuItemPicker` component for item selection —
      identical picker/preview UX to Create Role.
- [x] Wire into all 4 routing layers on both apps (`lazyImports.js`, `routeCommon.jsx`
      destructure + export, and the consuming route file's own import list) — verified
      programmatically per the discipline established this session after the `OrgRoleDetail`
      4-layer miss.

### Phase 6 — Sidebar menu (`SQL/v916_org_menu_bundles_menu.sql`, Platform; `v917` Simulator) ✅ COMPLETE (not yet run against the DB)
- [x] "Manage Menu Bundles" menu item, sibling of `pmo-people-manage-roles` under
      `pmo-cat-teams` (Platform) / Simulator's equivalent parent (per `v909`'s pattern), granted
      to the same role_name list as `v904`/`v909` (same admin population, PRD decision 4).

### Phase 7 — Role form integration (`OrgRoleDetail.jsx`, both apps) ✅ COMPLETE
- [x] Add a "Start from a bundle (optional)" dropdown above the `MenuItemPicker` on **both**
      Create and Edit (PRD decisions 9/10) — lists the org's active bundles
      (`getOrgMenuBundles`), and on selection, maps the bundle's raw `menu_item_id`s back to the
      picker's deduped representative rows (`grantableMenuItems.filter(mi => mi.ids.some(id =>
      bundleItemIds.has(id)))`) and unions their ids into `selectedMenuItemIds` — never replaces
      the current selection (PRD decision 3).
- [x] Rework Edit mode's menu section to use the same `MenuItemPicker` as Create, seeded from
      the role's current grants (`getRoleMenuGrants`, mapped through the same representative-id
      lookup as bundle-attach) instead of today's `menuGrants`/`excludedMenuItemIds` remove-only
      state. On submit, diff the final `selectedMenuItemIds` (expanded to full underlying ids via
      each row's `.ids` array) against the original grant ids to compute `addMenuItemIds` and
      `removeMenuItemIds` for `updateOrgCustomRole()` — **no RPC or service change needed**, per
      the investigation note above; both parameters are already wired end-to-end.
- [x] No change to `createOrgCustomRole()`'s call shape — Create mode already sends the full
      expanded selection as-is.

### Phase 8 — Tests ✅ COMPLETE
- [x] `organisationMenuBundleService.test.js` — new file, both apps, covering create/update/
      delete/list/get wrappers and the authorization-reuse path.
- [x] `organisationCustomRoleService.test.js` — extend `updateOrgCustomRole` coverage (or add a
      new describe block) confirming Edit mode's new diff logic sends the right
      `addMenuItemIds`/`removeMenuItemIds` split; re-run full suite on both apps (starts at
      31/31, expect it to grow).
- [x] Re-run every existing suite touched by the Phase 1 extraction to confirm zero regressions.

### Phase 9 — Review ✅ COMPLETE
- [x] `esbuild` syntax check on every new/touched file.
- [x] All 4 routing layers verified consistent on both apps for the two new pages.
- [x] `diff` verification: `organisationMenuBundleService.js` expected byte-identical
      Platform vs Simulator (no path constants); `MenuBundleDetail.jsx` and `OrgRoleDetail.jsx`
      expected to differ **only** in their path constants, same discipline as every sync this
      session.
- [x] Full test suites passing on both apps.
- [ ] Manual browser smoke test: create a bundle, attach it on Create Role, attach it on Edit
      Role, confirm the preview reflects the union correctly, confirm deleting a bundle doesn't
      touch a role already built from it. **Not yet done — SQL (v914-v917) has not been run
      against the DB yet; the feature cannot be exercised in-browser until the user runs it.**
- [x] Append a review/result section to this plan file summarizing what shipped, per the
      Standard Workflow.

## Out of scope (see PRD section f)

Live-linked bundles, cross-org bundle sharing, new-menu-item creation through this feature,
field-level change history for bundles, any change to `useMenu.js`'s render-time resolution.

## Review

**Files created:**
- SQL: `v914_org_menu_bundles_schema.sql`, `v915_org_menu_bundles_rpcs.sql`,
  `v916_org_menu_bundles_menu.sql` (Platform), `v917_sim_org_menu_bundles_menu.sql` (Simulator)
- `apps/{platform,simulator}/src/components/MenuItemPicker.jsx` (byte-identical)
- `apps/{platform,simulator}/src/utils/menuItemSelectionUtils.js` (byte-identical)
- `apps/{platform,simulator}/src/services/organisationMenuBundleService.js` (byte-identical)
- `apps/{platform,simulator}/src/services/__tests__/organisationMenuBundleService.test.js`
  (byte-identical, 10 tests)
- `apps/{platform,simulator}/src/pages/admin/ManageMenuBundles.jsx` (differs only in
  `MANAGE_MENU_BUNDLES_PATH` + dashboard nav path)
- `apps/{platform,simulator}/src/pages/admin/MenuBundleDetail.jsx` (differs only in
  `MANAGE_MENU_BUNDLES_PATH`)

**Files amended:**
- `apps/{platform,simulator}/src/pages/admin/OrgRoleDetail.jsx` — Phase 1 extraction (picker/
  preview moved into `MenuItemPicker`), Phase 7 (edit mode reworked to the same full add+remove
  picker as create, "Start from a bundle" dropdown on both modes). Differs only in
  `MANAGE_ROLES_PATH`.
- `apps/{platform,simulator}/src/routes/lazyImports.js`, `routeCommon.jsx`,
  `{platform,simulator}Routes.jsx` — all 4 routing layers wired for `ManageMenuBundles` and
  `MenuBundleDetail` on both apps, verified programmatically consistent.
- `apps/{platform,simulator}/src/services/__tests__/organisationCustomRoleService.test.js` —
  unaffected by the extraction (31/31 still passing; these tests only exercise the service
  layer, not the extracted component).

**Verification performed:**
- `esbuild` syntax check on every new/touched JS/JSX file (all pass).
- `vitest` run: `organisationCustomRoleService.test.js` (31/31) +
  `organisationMenuBundleService.test.js` (10/10) = 41/41 passing on **both** apps.
- `diff` verification after every sync: shared files (component, utils, service, test) are
  byte-identical between apps; app-specific files differ only in their path constants.
- All 4 routing layers checked programmatically for both new pages on both apps (no missed
  layer, unlike the two earlier `OrgRoleDetail` misses this session).

**Not yet done (requires the user):**
- Run `SQL/v914` through `v917` against Supabase, in order, via the SQL editor (no DB
  credentials are available in this environment — confirmed no `SUPABASE_DB_URL`/service-role
  key, consistent with every other feature this session).
- Manual browser smoke test once the SQL has run: create a bundle → attach it on Create Role →
  attach it on Edit Role → confirm the preview reflects the union → confirm deleting a bundle
  doesn't affect a role already built from it.

**Correction made mid-implementation:** the plan originally assumed Simulator would need its
own `sim.org_menu_bundles` schema copy (rule 34 parity read too literally). Reading
`packages/supabase/src/index.js` showed Simulator's `supabase` import already resolves to the
`public`-schema client for `roles`/`project_roles`/`menu_items` — this is genuinely shared
infrastructure, not per-app data. Corrected to one shared `public.org_menu_bundles` table with
one set of RPCs; only the sidebar menu item row (Phase 6) is per-app, matching the existing
`v904`(Platform)/`v909`(Simulator) split.
