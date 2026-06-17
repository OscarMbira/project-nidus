# v674 – Sidebar Menu Cache & Rationalisation Fix

## Problem
After adding caching (v673), PMO sidebar shows only bottom sections (Workflows, Knowledge,
Audit, Email, Admin). Executive Overview, Project Delivery, methodology tracks [S][P][A],
Process Templates, and Reporting are all missing.

## Root Causes

### RC-1: linter changed `applyRoleSidebarRevamp` when useMenu.js was edited
The linter added `nestExecutiveOverviewSections` and the `trackAnchor` parameter to the function.
This changes behaviour: if `pmo-cat-exec` / `pmo-cat-project-delivery` DB rows are absent,
the function can produce an incomplete tree that only shows the lower-order categories.

### RC-2: `useSimMenu` pollutes the platform cache `items` field
`useSimMenu` writes `items: transformed` (simulator-scoped items) to the same
`nidus_sidebar_v2_${userId}` key. If `buildSidebarPresentation(rawHierarchy)` fails later,
`useMenuProvider` falls back to `cached.items` which are simulator items — wrong for platform.

### RC-3: Missing DB rows (v675/v676/v677 SQL not applied)
`pmo-cat-exec`, `pmo-cat-project-delivery`, `pmo-cat-process-templates`, and methodology-track
category rows (`pmo-cat-initiation`, `pmo-cat-governance-standards`, `pmo-cat-pmbok`,
`pmo-cat-agile-lean`) must exist in `menu_items` table. Without them, `fetchPmoCategoryRowIds`
returns no IDs for them and `reorganizeMenuRoots` has no category shells to build, so those
sections disappear from the sidebar.

## Fixes

### Code fixes (this plan)
- [ ] **F1** Bump `SIDEBAR_CACHE_VERSION` from 2 → 3 in `menuCacheUtils.js` — forces immediate
  re-fetch for all users, clears any poisoned v2 caches
- [ ] **F2** `useSimMenu` must NOT write to the platform cache — it should only READ rawHierarchy
  from the platform cache; only `useMenuProvider.applyFetchResult` may write the platform cache
- [ ] **F3** `useMenuProvider`: if `buildSidebarPresentation(rawHierarchy)` returns empty but
  `rawHierarchy` is non-empty, treat as cache miss and fetch fresh from DB (never fall back to
  `cached.items`)

### DB fix (user must run SQL)
- [ ] **F4** User must run in order on Supabase: v675 → v676 → v677 SQL files
- [ ] **F5** Restart dev server after SQL applied, then hard-refresh browser

## Todo
- [x] Write plan
- [x] F1 – bump cache version 2→3 in menuCacheUtils.js
- [x] F2 – fix useSimMenu to only read platform cache, never write it
- [x] F3 – fix useMenuProvider: empty presentation → DB fetch, never cached.items fallback
- [ ] F4/F5 – user action (run SQL + restart)

## Review
*(To be filled after implementation)*
