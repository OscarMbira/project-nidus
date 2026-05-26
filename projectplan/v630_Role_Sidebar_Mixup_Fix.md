# v630 — System-Wide Fix: Role Sidebar Mixup

**Version:** v630
**Type:** Bug Fix (Critical)
**Date:** 2026-05-26
**Status:** Implemented

---

## 1. Bug Description

A logged-in Project Manager (PM) was being shown the full **PMO category sidebar** (Reporting & Intelligence, Workflows & Approvals, Teams, Stakeholders, PMO Administration, etc.) instead of the PM delivery sidebar.

Screenshot evidence: `Developer Images/PM Menu Mixup v1.png`

---

## 2. Root Cause

In `src/hooks/useMenu.js`, the function `applyRoleSidebarRevamp()` determined which sidebar layout to show by scanning menu item **signals** (code + label + route) for heuristic patterns:

```javascript
const hasPMOContext = baseline.some((n) => {
    const s = signal(n)
    return (
      s.includes('/pmo/') ||
      s.includes('pmo') ||        // ← too broad
      s.includes('oversight') ||  // ← too broad
      s.includes('portfolio') ||  // ← too broad
      (s.includes('programme') && ...)
    )
})
```

Any PM whose assigned menu items happened to contain `pmo`, `oversight`, or `portfolio` anywhere in a menu code, label, or route path would be silently routed to the full PMO layout. This affects:

- PMs who have read-only visibility of PMO oversight pages
- PMs with `portfolio` in any menu item signal (e.g. Portfolio EVM, Portfolio dependencies)
- Any role where a DB admin assigned menu items whose strings match the patterns

The heuristic is fragile by design — it was never a safe way to determine role layout.

---

## 3. Fix

**File changed:** `src/hooks/useMenu.js`

### 3.1 `resolveLayoutType(roleNames)` — new function

Maps the user's actual DB role names to a layout type. This is authoritative.

```javascript
const PMO_LAYOUT_ROLES = new Set(['pmo_admin', 'system_admin', 'account_owner'])
const TM_LEAD_ROLES   = new Set(['team_lead'])
const TM_LAYOUT_ROLES = new Set(['team_member', 'team_lead'])

function resolveLayoutType(roleNames = []) {
  if (roleNames.some(r => PMO_LAYOUT_ROLES.has(r))) return { layout: 'pmo', isLead: false }
  if (roleNames.some(r => TM_LEAD_ROLES.has(r)))   return { layout: 'tm',  isLead: true  }
  if (roleNames.some(r => TM_LAYOUT_ROLES.has(r))) return { layout: 'tm',  isLead: false }
  return { layout: 'pm', isLead: false }
}
```

### 3.2 `fetchMenuFromDB` — fetch role names, resolve layout

After fetching `roleIds` from `user_roles`, one additional query fetches role names:

```javascript
const { data: roleDetails } = await platformDb
  .from('roles').select('role_name').in('id', roleIds)
const roleNames = (roleDetails || []).map(r => r.role_name).filter(Boolean)
const layoutHint = resolveLayoutType(roleNames)
```

`layoutHint` is passed to `applyRoleSidebarRevamp` and returned from `fetchMenuFromDB`.

### 3.3 `applyRoleSidebarRevamp(menuItems, layoutHint)` — explicit routing first

A new early-return block before the heuristics:

```javascript
if (layoutHint) {
  const { layout, isLead } = layoutHint
  if (layout === 'tm') return ensureTeamMemberMenus(baseline, isLead)
  if (layout === 'pm') return ensurePmInvitationTrackerMenu(...)
  // layout === 'pmo' falls through to PMO categorisation
}
// Heuristic fallback for old cache entries without layoutHint
const hasPMOContext = baseline.some(...)
```

### 3.4 Cache stores `layoutHint`

`writeCache(userId, items, layoutHint)` now stores `layoutHint` in the cache payload. `readCache` and `readStaleCache` return `{ items, layoutHint }`. `sanitizeMenuItems` in `loadMenu` passes `layoutHint` to `applyRoleSidebarRevamp` on every cache hit.

---

## 4. Affected Roles (all fixed)

| Role | Before fix | After fix |
|---|---|---|
| PMO Admin | PMO layout ✅ | PMO layout ✅ |
| Project Manager | PMO layout ❌ | PM layout ✅ |
| Portfolio Manager | PMO layout ❌ | PM layout ✅ |
| Programme Manager | PMO layout ❌ | PM layout ✅ |
| Project Sponsor | PMO layout ❌ | PM layout ✅ |
| Team Lead | TM layout ✅ (lucky) | TM layout ✅ |
| Team Member | TM layout ✅ (lucky) | TM layout ✅ |
| system_admin / account_owner | PMO layout ✅ | PMO layout ✅ |

---

## 5. Backward Compatibility

- Old cache entries (pre-fix) have no `layoutHint` field → `layoutHint` is `null` → signal heuristics run as before (may still show wrong layout until cache expires in 5 minutes)
- After the 5-minute TTL, fresh fetches write `layoutHint` to cache → correct layout guaranteed
- Users can force immediate fix by clearing the browser cache / refreshing

---

## 6. Scope

- One file changed: `src/hooks/useMenu.js`
- No DB schema changes
- No component changes
- Simulator sidebars unaffected (they use static config files, not `useMenu`)
- PMOSidebar and PMSidebar (static config components) unaffected

---

## 7. Review

- [x] `resolveLayoutType` added with correct role sets
- [x] `fetchMenuFromDB` fetches role names and resolves layout
- [x] `applyRoleSidebarRevamp` accepts and uses `layoutHint` before heuristics
- [x] `readCache` / `readStaleCache` return `{ items, layoutHint }`
- [x] `writeCache` persists `layoutHint`
- [x] `loadMenu` threads `layoutHint` through all paths (fresh fetch, cache hit, stale fallback, error catch)
- [x] `initial` truthy check fixed to `.length > 0` (was `if (initial)` which is always truthy for `[]`)
