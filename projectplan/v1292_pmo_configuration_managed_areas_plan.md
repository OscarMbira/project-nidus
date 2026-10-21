# v1292 — PMO-managed PMO Configuration areas (implementation plan)

**PRD:** `projectprd/v1292_pmo_configuration_managed_areas_PRD.md` (decisions Q1–Q11, user stories 1–29)
**Apps:** Platform + Simulator. Admin: ID Generation rule seed only.
**Status:** Awaiting owner approval — no implementation until approved.

## Files

| Layer | Platform | Simulator |
|---|---|---|
| SQL schema + RPCs + RLS | `SQL/v1292_pmo_configuration_areas.sql` (public + sim) | (same file) |
| SQL seed (built-in rows) | `SQL/v1292_pmo_configuration_areas_seed.sql` | (same file) |
| SQL menu links | `SQL/v1292_pmo_configuration_menu_links.sql` + `_rollback.sql` | (same file) |
| SQL tests | `SQL/v1292_pmo_configuration_areas_tests.sql` | (same file) |
| Admin ID rule | `E:\project-nidus-admin\SQL\v2xx_pmo_configuration_areas_id_rule_seed.sql` (next free Admin version) | — |
| Pure helpers | `packages/shared/src/utils/pmoConfigurationAreaUtils.js` (+ tests) | shared |
| Icon key map (UI chrome) | `packages/ui/src/pmoConfigurationAreaIcons.js` | shared |
| Service | `apps/platform/src/services/pmoConfigurationAreaService.js` (+ tests) | `apps/simulator/src/services/pmoConfigurationAreaService.js` (+ tests) |
| List page | `apps/platform/src/pages/pmo-admin/PmoConfigurationHome.jsx` | `apps/simulator/src/pages/pmo-admin/PmoConfigurationHome.jsx` |
| Detail page (create/view/edit) | `apps/platform/src/pages/pmo-admin/PmoConfigurationAreaDetail.jsx` | `apps/simulator/src/pages/pmo-admin/PmoConfigurationAreaDetail.jsx` |
| Routes | `platformRoutes.jsx` (+ `lazyImports.js`) | `simulatorRoutes.jsx` (+ `lazyImports.js`, `routeCommon.jsx`) |
| Menu registry | `packages/config/src/menuRegistry.js` | (same file) |
| Sidebar cache version | `packages/shared/src/utils/menuCacheUtils.js` (`SIDEBAR_CACHE_VERSION` 133 → 134) | shared |
| Taxonomy | `Documentation/Core_PM_and_Industry_Menu_Taxonomy.md` | (same file) |
| Guide | `Documentation/PMO_Configuration_Managed_Areas_v1292_Guide.md` | — |

## Data model (both `public` and `sim`)

**`pmo_configuration_areas`**: `id`, `display_id TEXT DEFAULT ''` (Admin ID Gen, `PCA`), `area_code TEXT` (built-ins only, unique where `organisation_id IS NULL`), `organisation_id UUID NULL → public.accounts` (NULL = built-in), `is_system BOOLEAN`, `title`, `description`, `cta_label`, `icon_key` (built-ins), `route_path` (built-ins), `menu_item_id → public.menu_items` (custom), `display_order INT`, `is_active`, `is_deleted`, `deleted_at`, `deleted_by`, `created_at/by`, `updated_at/by`. CHECK: built-in has `area_code` + `route_path`; custom has `organisation_id` + `menu_item_id`.

**`pmo_configuration_area_overrides`**: `id`, `organisation_id`, `area_id → pmo_configuration_areas`, `title_override`, `description_override`, `is_hidden BOOLEAN DEFAULT FALSE`, `display_order INT NULL`, audit columns; `UNIQUE (organisation_id, area_id)`.

**RLS:** SELECT built-ins for `authenticated`; SELECT custom rows/overrides where `public.auth_user_can_access_account(organisation_id)`. No client INSERT/UPDATE/DELETE policies — writes only through SECURITY DEFINER RPCs that check `public.is_pmo_admin_or_owner_for_account(p_account_id)` (same pattern as `ai_accept_consent`, v1272).

**RPCs (both schemas):** `list_pmo_configuration_areas(p_account_id, p_include_hidden)` → effective rows + `can_manage`; `get_pmo_configuration_area(p_account_id, p_key)` (area_code / display_id / UUID); `save_pmo_configuration_area_override(…)`; `reset_pmo_configuration_area_override(…)`; `set_pmo_configuration_area_hidden(…)`; `move_pmo_configuration_area(p_account_id, p_area_id, p_direction)` (materialises the org's full order on first move, then swaps); `create_pmo_configuration_custom_area(…)` (inserts `display_id = ''`); `update_pmo_configuration_custom_area(…)`; `delete_pmo_configuration_custom_area(…)` (soft); `list_pmo_configuration_link_targets(p_app)` (menu pages the caller can view, current app only).

## Menu links (PRD stories 25–29)

1. **Simulator — new leaf** `sim_pmo_admin_configuration` "PMO Configuration" → `/simulator/pmo/configuration`, under the **same live parent as `sim_pmo_admin_ai_settings`** (confirm with a read-only query first — v1280 used `sim_pmo_admin`, the registry uses `sim_pmo_section_admin`), sort just before AI Settings, icon `layout-dashboard`, grants copied from `sim_pmo_admin_ai_settings` (v1280 helper pattern).
2. **Platform — grant** `pmo_configuration_home` to the global `account_owner` role (`roles.account_id IS NULL`), `can_view` + `can_use`.
3. **Registry** — add `sim_pmo_admin_configuration` (domain `simulator`, category `pmo-cat-admin`, `registry_fallback: true`); add `account_owner` to `pmo_configuration_home.roles`; run `npm run validate:menus`.
4. **Cache** — bump sidebar cache key so the new link appears without clearing storage.
5. **Sub-pages** — no new leaves; confirm the sidebar highlights PMO Configuration and `resolveActiveZone` returns `organisation` on `…/configuration/areas/*` (add a ZoneTabs test case).
6. **Rollback** — `v1292_pmo_configuration_menu_links_rollback.sql` deletes the sim leaf + grants and the account_owner grant.
7. **Taxonomy** — add `PMO Admin → PMO Configuration (v1292)` (Simulator) and Level 4 `Configuration areas: create / view / edit (v1292)` under PMO Configuration (both apps).

## Vertical slices (todo)

Each slice goes through SQL → service → UI → tests in both apps before the next starts.

- [x] **Slice 0 — menu links:** menu SQL + rollback, registry entries, cache key bump, taxonomy lines, ZoneTabs test for `…/configuration/areas/*`. *Done 2026-10-20: `SQL/v1292_pmo_configuration_menu_links.sql` (+ rollback); registry `sim_pmo_admin_configuration` + `account_owner` on `pmo_configuration_home`; `SIDEBAR_CACHE_VERSION` 133 → 134; taxonomy §26; tests green (config 21, menuLayoutUtils 17, ZoneTabs 15 + 15). `validate:menus` unchanged (162 pre-existing failures before and after, none for v1292 entries). Taxonomy Level 4 area pages are added in Slices 2 and 5 when those pages exist.*
- [ ] **Slice 1 — DB-driven read-only list:** schema + RLS + `database_tables` registration + planner wall re-run (v1251) + seed (each app's current 15 areas incl. AI Settings) + `list_…` RPC + service + list page reads from DB (no `CARDS` array; error state on failure) + helper/service tests. *Tracer bullet: the page looks the same, but the data comes from SQL.*
- [ ] **Slice 2 — edit/reset a built-in:** `get_…`, `save_…_override`, `reset_…` RPCs; routed View/Edit page with Audit tab, unsaved-changes guard, success modal, Reset to default; Edit icon on the list for managers; read-only for others.
- [ ] **Slice 3 — hide/show:** `set_…_hidden` RPC; Hide/Show actions; "Show hidden" filter for managers; hidden badge.
- [ ] **Slice 4 — reorder:** `move_…` RPC; Move up/down icons (disabled at edges, only when no column sort is active); default order = org order then A→Z (rule 40.1 exception).
- [ ] **Slice 5 — custom entries:** Admin ID rule seed (Admin repo); display-ID trigger; create/update/delete RPCs + `list_…_link_targets`; Create page with searchable page picker (`SelectField`); Custom badge + standard icon; soft delete with confirmation; "Page no longer available" state.
- [ ] **Slice 6 — export + polish:** export columns (title, description, type, hidden); light/dark check; mobile check; Platform/Simulator diff review.
- [ ] **Slice 7 — review:** SQL test script green; Vitest suites green in both apps; REVIEW.md checks; guide doc; review section below.

## Risks

- **Parent-code mismatch for the Simulator menu leaf.** Mitigation: resolve the parent from the live `sim_pmo_admin_ai_settings` row, not a hard-coded code.
- **Account Owner without PMO Admin seeing PMO-only pages through the new sidebar link.** The pages linked from this list keep their own access checks; the list itself is read-only unless `is_pmo_admin_or_owner_for_account`.
- **Seed drift.** Built-in seeds must reproduce today's cards exactly; Slice 1 compares the seeded rows with the current `CARDS` arrays before deleting them.

## Review

_(to be completed after implementation)_
