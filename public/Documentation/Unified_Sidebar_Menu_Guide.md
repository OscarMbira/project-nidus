# Unified Sidebar Menu Guide

**Version:** v638  
**Date:** 2026-05-27

This guide describes how sidebar navigation works after the unified menu migration, and how to add new items correctly.

## Architecture

```
menuRegistry.js (build-time)  →  SQL seeds (menu_items)
                                      ↓
                              role_menu_items (permissions)
                                      ↓
                              useMenu.js (layout transforms)
                                      ↓
                              Sidebar.jsx (single component)
                                      ↓
                    /platform/*  /pmo/*  /pm/*
```

- **Runtime source of truth:** `menu_items` + `role_menu_items` in Supabase
- **Build-time source of truth:** `src/config/menuRegistry.js`
- **Static configs** (`pmoMenuConfig.js`, `pmDashboardMenuConfig.js`) are **deprecated** — do not use for runtime rendering

## Adding a new sidebar item

1. **Add registry entry** in `src/config/menuRegistry.js`:

```js
{
  menu_code: 'pmo_my_feature',
  menu_label: 'My Feature',
  route_path: '/pmo/my-feature',
  parent_code: 'pmo_section_...',  // or null
  menu_icon: 'file-text',
  sort_order: 1,
  domain: 'platform',
  roles: ['pmo_admin', 'system_admin'],
  category: 'pmo-cat-initiation',  // PMO grouping hint
  registry_fallback: true,           // until SQL is applied everywhere
}
```

2. **Validate routes:** `npm run validate:menus`

3. **Create SQL migration** under `SQL/vNNN_menu_<feature>.sql`:
   - `INSERT ... ON CONFLICT (menu_code) DO UPDATE` for `menu_items`
   - `INSERT ... ON CONFLICT DO NOTHING` for `role_menu_items`

4. **Register route** in `src/App.jsx` before any catch-all redirects.

5. **Layout header** (if first-class `/app/...` route): extend `isPlatformApp` in `src/components/Layout.jsx` — see `.cursor/rules/platform-app-layout-header.mdc`.

6. **Bump menu cache** in `src/hooks/useMenu.js` (`MENU_CACHE_KEY_PREFIX`) when menu structure changes materially.

7. **Hard-refresh** browser after deploy.

8. **Simulator parity:** duplicate registry row with `domain: 'simulator'` + run `v641` / `v642` SQL.

## Simulator layouts (Phase 4)

- **`SimulatorPMOLayout.jsx`** and **`SimulatorPMLayout.jsx`** use shared **`Sidebar`** with `simulatorScope="pmo"` or `"pm"`.
- Menu data flows through **`useSimMenu`** → **`applySimulatorMenuTransform`**.
- Separate cache key: **`nidus_sim_menu_v21_{scope}_{userId}`**.

## PMO category grouping

PMO Admin sidebar uses category buckets defined in `src/config/pmoSidebarCategories.js`. The `category` field on registry entries maps items into these buckets during `useMenu` transforms.

Key categories:

| Category ID | Label |
|-------------|-------|
| `pmo-cat-initiation` | Initiation & Business Justification |
| `pmo-cat-process-templates` | Process Templates |
| `pmo-cat-governance-standards` | Governance & Standards |
| `pmo-cat-project-oversight` | Project Oversight |

## Registry fallback (temporary)

Until SQL backfill is confirmed in all environments, entries with `registry_fallback: true` are injected by `menuRegistryUtils.js` when missing from the DB. In development, missing items log:

```
[menuRegistry] virtual fallback: pmo_init_business_case → pmo-cat-initiation (...)
```

Remove `registry_fallback` and client injection once SQL is applied in production.

## Tooling

| Command | Purpose |
|---------|---------|
| `npm run validate:menus` | Verify registry routes exist in App.jsx |
| `npm run audit:menus-static` | Export static config audit CSV |

## SQL versions (v638 migration)

| File | Purpose |
|------|---------|
| `SQL/v638_menu_registry_backfill_platform.sql` | Initiation, governance, oversight, PM initiation |
| `SQL/v639_menu_registry_role_menu_items.sql` | Role mappings for PMO Admin + PM |
| `SQL/v641_sim_menu_registry_backfill.sql` | Simulator PMO/PM initiation, governance, oversight |
| `SQL/v642_sim_menu_registry_role_menu_items.sql` | Simulator role mappings |

## Related docs

- [v638 Implementation Plan](../projectplan/v638_Unified_Sidebar_Menu_Implementation_Plan.md)
- [Process Templates Seed Data Guide](./Process_Templates_Seed_Data_Guide.md)
