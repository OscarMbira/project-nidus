# v910 — System Role Catalog Management (system_admin editing of built-in roles)

PRD: `projectprd/v910_system_role_catalog_management_PRD.md`

## Context found during investigation

- Platform's real System Administration category parent (used today by Authentication Settings,
  PWA Settings, Platform Settings — `SQL/v681_menu_revamp_platform_hierarchy.sql`) is
  `plat_sec_system_admin`, not the newer canonical `pmo-cat-system-admin` code (that one is a
  category-inference *target* the transform pipeline flattens legacy sections into, not what's
  actually seeded as the parent row). Mirroring the proven, already-working pattern.
- Simulator's equivalent is `sim_pmo_cat_system_admin` (`SIM_PMO_CATEGORY_DEFS` in
  `packages/config/src/pmoMenuHierarchyUtils.js`).
- `system_admin`/`super_admin` role_name checks already have precedent in `v903`'s
  `user_can_manage_org_roles` — same string matching style
  (`lower(replace(r.role_name, ' ', '_'))`), reused here but *without* the `pmo_admin`/`org_admin`
  additions that function includes (this feature is system-tier only).

## Todo checklist

### Phase 1 — RPC ✅ COMPLETE (not yet run against the DB)
- [x] `SQL/v910_system_role_catalog_rpc.sql`: `public.is_system_admin_user(p_user_id)` +
      `public.update_builtin_role(p_project_role_id uuid, p_display_name text, p_description
      text, p_role_level int, p_industry_category_id uuid, p_is_governance_only bool,
      p_add_menu_item_ids uuid[] DEFAULT '{}', p_remove_menu_item_ids uuid[] DEFAULT '{}')` — as
      planned: SECURITY DEFINER, rejects non-system_admin callers and non-built-in targets,
      updates `project_roles` + mirrored `roles` row for every field except `role_name`, applies
      add/remove against `role_menu_items`. **Needs to be run in the Supabase SQL editor.**

### Phase 2 — Service layer ✅ COMPLETE
- [x] `organisationCustomRoleService.js` (Platform + Simulator, verified byte-identical after
      sync): `updateBuiltinRole(...)` and `isSystemAdmin()` added exactly as planned.

### Phase 3 — UI ✅ COMPLETE
- [x] `SystemRoleCatalog.jsx` — list of all built-in roles, search/sort/industry-filter, Edit
      action per row, no Create button, client-side `isSystemAdmin()` gate with an explicit
      "Access denied" screen (not a silent redirect) for anyone else.
- [x] `SystemRoleEditPage.jsx` — same field set as planned, `role_name` shown disabled with an
      explanatory note, no clone-source section, same "Access denied" gate, plus an inline amber
      warning banner on the form itself ("this affects every organisation on the platform").
      Route: `admin/system-roles/:id/edit` (Platform) /
      `simulator/pmo/system-roles/:id/edit` (Simulator). Non-modal per rule 65.
- [x] Wired into `lazyImports.js` → `routeCommon.jsx` (destructure **and** export) → **and the
      app route file's own top-of-file import list** — verified programmatically for all 4 layers
      on both apps this time (the 3-layer check used earlier missed this exact 4th layer twice in
      a row for `OrgRoleDetail`, caught live by the user both times).

### Phase 4 — Menu ✅ COMPLETE (not yet run against the DB)
- [x] `SQL/v911_system_role_catalog_menu.sql`: menu item under `plat_sec_system_admin` (Platform,
      the real seeded System Administration parent — not the newer canonical `pmo-cat-system-admin`
      inference target) and `sim_pmo_cat_system_admin` (Simulator), granted **only** to
      `system_admin`/`super_admin`. **Needs to be run in the Supabase SQL editor.**

### Phase 5 — Tests ✅ COMPLETE
- [x] `isSystemAdmin`/`updateBuiltinRole` unit tests added to `organisationCustomRoleService.test.js`
      on both apps — 23/23 passing (was 18, +5 new). Covers: RPC-true/false paths, no-session
      short-circuit, full field mapping (confirms `role_name` never sent), and the
      not-a-system-admin RPC-rejection path surfacing correctly.

### Phase 6 — Review ✅ COMPLETE
- [x] All 12 touched/new JS/JSX files pass `esbuild` syntax validation.
- [x] All 4 routing layers (`lazyImports.js`, `routeCommon.jsx` destructure, `routeCommon.jsx`
      export, and the consuming route file's own import list) verified programmatically
      consistent on both apps.
- [x] Full test suite for this service file passing 23/23 on both apps.
- [ ] Not yet live-verified in browser (SQL not run yet — see Phases 1 & 4).
