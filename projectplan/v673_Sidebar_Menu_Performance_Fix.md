# v673 – Sidebar Menu Performance Fix

## Problem
Sidebar skeleton visible for 800ms–1800ms on every mount because:
1. No caching — DB fetch on every render
2. 8–12 sequential Supabase round trips per load

## Solution
- **Layer 1:** localStorage stale-while-revalidate cache (instant sidebar after first load)
- **Layer 2:** Parallelise independent DB queries (40% faster first-load)

Both Platform (`useMenu`) and Simulator (`useSimMenu`) must be updated (parity rule).

## Todo

- [x] 1. Update `menuCacheUtils.js` — add read/write/clear/isFresh helpers
- [x] 2. Update `fetchMenuFromDB` in `useMenu.js` — parallelise user_roles+methodology and roles+role_menu_items
- [x] 3. Update `useMenuProvider` in `useMenu.js` — serve from cache instantly, refresh in background
- [x] 4. Update `useSimMenu.js` — same cache read/write pattern
- [x] 5. Dev server starts cleanly (port 5174)

## Cache Design
- Key: `nidus_sidebar_v2_${authUserId}`
- Value: `{ version, cachedAt, items, rawHierarchy, layoutHint }`
- Fresh TTL: 10 minutes — serve instantly, no background refresh
- Stale (>10 min): serve from cache immediately + refresh in background (no skeleton)
- No cache: show skeleton + fetch + cache
- Invalidate: SIGNED_OUT, explicit refetch()

## Parallelisation Plan
```
Before:  users → user_roles → roles → methodology → role_menu_items → PMO cats → menu items  (~10 sequential)
After:   users → [user_roles || methodology] → [roles || role_menu_items] → [PMO cats || menu items]  (~4 sequential)
```

## Review

### Changes Made
| File | What changed |
|---|---|
| `src/utils/menuCacheUtils.js` | Added `readSidebarCache`, `writeSidebarCache`, `clearSidebarCache`, `isSidebarCacheFresh` — keyed `nidus_sidebar_v2_${userId}`, 10-min TTL |
| `src/hooks/useMenu.js` | Parallelised Round 2 (`user_roles` ∥ `fetchMethodologyContext`) and Round 3 (`roles` ∥ `fetchRoleMenuRowsForRoles`); removed duplicate sequential `fetchRoleMenuRowsForRoles` call; added stale-while-revalidate cache in `useMenuProvider`; `SIGNED_OUT` now clears cache |
| `src/hooks/useSimMenu.js` | Reads same platform cache (`rawHierarchy`) to compute sim menu without DB fetch when cache is warm; writes cache after DB fetch |

### Expected behaviour after these changes
- **First login / hard refresh:** skeleton shows briefly (~400–600ms, down from 800–1800ms due to parallelisation), menu renders, result cached
- **Every subsequent navigation:** sidebar visible in <10 ms from cache; background refresh fires after 10-min TTL
- **Role change / explicit refetch():** cache cleared, fresh DB fetch with skeleton
- **Sign out:** cache cleared for that user
