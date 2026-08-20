# v826 — Fix PM incorrectly seeing PMO Executive Dashboard

## Goal
A user whose badge shows **Project Manager** must not stay on `/platform/dashboard`
(Executive Summary / PMO chrome). They should be redirected to `/pm/dashboard`.

## Root cause (v819 incomplete)
v819 redirected only when `getUserSystemRoles(...).data.length === 0`. Invited PMs
**do** have a `user_roles` row (`project_manager`) — used for menus and the header
badge — so `hasSystemRole` stayed `true` and the Executive Summary still rendered.
Also, visiting `/platform/*` forces PMO sidebar layout via pathname, which is why
"Executive Dashboard" appears in the sidebar for that session.

## Fix
1. Gate `/platform/dashboard` on real PMO/org roles (`PMO_LAYOUT_ROLES` +
   `is_user_pmo_admin`), not "any `user_roles` row".
2. Align `roleRouter.getDashboardRouteByRole`: PMO roles → `/platform/dashboard`;
   PM-layout / default → `/pm/dashboard`.

Platform + Simulator parity (rule 34.1).

## Todo
- [x] Platform + Simulator `Dashboard.jsx` — `canSeeExecutiveDashboard` gate
- [x] Platform + Simulator `roleRouter.js` — post-login route map
- [x] Review

## Review

**Status: complete.**

### Changes
| File | Change |
|------|--------|
| `apps/platform/src/pages/platform-app/Dashboard.jsx` | Replaced `hasSystemRole = data.length > 0` with `canSeeExecutiveDashboard = isOrgAdmin \|\| role in PMO_LAYOUT_ROLES`; PM users `<Navigate to="/pm/dashboard">`; brief loader while gate resolves |
| `apps/simulator/src/pages/platform-app/Dashboard.jsx` | Identical mirror |
| `apps/platform/src/services/roleRouter.js` | Post-login: PMO roles → `/platform/dashboard`; PM / default → `/pm/dashboard` |
| `apps/simulator/src/services/roleRouter.js` | Identical mirror |

### Why the sidebar showed "Executive Dashboard"
`/platform/*` pathname forces PMO layout (`inferLayoutScopeFromPathname`). After redirect to `/pm/dashboard`, PM chrome/sidebar applies instead.

## Follow-up: the sidebar "Executive Dashboard" link

The first pass only covered `/platform/dashboard`. The sidebar link a PM was clicking points at a
**different** route — `/platform/executive/dashboard` (`plat_exec_dashboard`, seeded in v681) —
which was ungated.

**Why PMs see the link:** `SQL/v683_menu_revamp_platform_role_assignments.sql` section 6 grants
`project_manager` every `plat_%` menu item except an exclusion list. The list excludes
`plat_sec_exec%` but **not** `plat_exec_dashboard`, so the item is granted.

### Follow-up changes
| File | Change |
|------|--------|
| `apps/{platform,simulator}/src/pages/executive/ExecutiveDashboard.jsx` | Redirects to `/pm/dashboard` unless the user holds an executive / PMO / org-admin role. Also made theme-aware (was dark-only, rule 28.1) |
| `SQL/v827_revoke_exec_dashboard_menu_from_non_exec_roles.sql` | Revokes `plat_exec_dashboard` from all roles except executive / PMO / org admin, so the link disappears from PM sidebars |
| `packages/shared` + `apps/*` `menuCacheUtils.js` | `SIDEBAR_CACHE_VERSION` 38 → 39 so cached PM sidebars refetch after the SQL runs |
| `apps/{platform,simulator}/src/services/roleRouter.js` | `executive` now lands on `/platform/executive/dashboard` instead of the PM dashboard |

### No-flash follow-up
- PM sidebar rewrite: `/platform/executive/dashboard` → `/pm/dashboard` when layout is `pm`
  (`sidebarRouteUtils` in `packages/shared` + app copies) — the link never navigates to the
  executive page, so there is no flash.
- `ExecutiveDashboard.jsx` / `Dashboard.jsx`: paint nothing until the role gate allows; deny →
  `<Navigate to="/pm/dashboard" replace />` using warm role cache when available.

### Left for user
1. Run `SQL/v827_revoke_exec_dashboard_menu_from_non_exec_roles.sql` against Supabase (this session cannot execute SQL).
2. Log in as Project Manager → click Dashboard → Executive Dashboard: URL should go straight to `/pm/dashboard` with no Executive page flash.
3. Log in as PMO Admin / Account Owner → `/platform/dashboard` still shows Executive Summary; an `executive` role still reaches `/platform/executive/dashboard`.
