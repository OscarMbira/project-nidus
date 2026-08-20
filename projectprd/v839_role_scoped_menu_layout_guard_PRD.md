# v839 — Role-Scoped Menu Layout Guard (PRD)

## a) Problem statement
The sidebar/menu chrome shown to a signed-in user is currently decided by **which Layout shell
component the current route happens to render**, not by the user's actual assigned role.
`PMOLayout` hardcodes `<MenuProvider layoutScope="pmo">`; `PMLayout` hardcodes
`layoutScope="pm"` (8 near-duplicate copies across Platform + Simulator — see Implementation
decisions). Because dozens of pages are mounted under a `/pmo/...` or `/app/pmo/...` URL prefix
and wrapped in `PMOLayout`, **any** user who follows a link into that prefix — regardless of
their real role — has their entire sidebar instantly replaced with the PMO menu set.

Two concrete manifestations observed (screenshots supplied by user):
1. A Project Manager clicking into the (recently shipped, [[v824]]) "Organisational Templates"
   feature lands on `/app/pmo/organisational-templates?entityType=project&entityId=...`; their PM
   sidebar (Dashboard, Projects, Tasks, Teams, ...) is replaced by the PMO sidebar (Executive
   Overview, Portfolio & Delivery, ...) even though their role badge still correctly reads
   "Project Manager".
2. A PM navigating to `/app/pmo/forms/F100/edit` (Form Template Builder — PMO-Admin-only) sees
   the PMO sidebar mount **first**, and only then does an in-page check render "Only PMO Admin
   can access the form template builder" *inside* that wrong-scope shell. The access denial
   happens too late — after the wrong menu has already displayed.

**Root cause:** `resolveMenuLayoutScope()` (in `menuLayoutUtils.js`) is capable of deriving scope
from the user's role, but every `PMOLayout`/`PMLayout` passes a hardcoded literal that
short-circuits that role-derived logic entirely (`if (layoutScopeProp) return layoutScopeProp` —
role is never even consulted). No route currently checks the caller's role at all before mounting
a role-scoped shell — `ProtectedRoute` only verifies the user is logged in.

**Scale of the underlying duplication** (discovered during investigation, relevant to the fix
design): `useMenu.js` and `menuLayoutUtils.js` are not single shared files — they are forked
three ways: `packages/shared/src/{hooks,utils}/`, `apps/platform/src/{hooks,utils}/`, and
`apps/simulator/src/{hooks,utils}/` (plus a fourth, dead copy under root `src/`). The 8 Layout
shell files split into two near-identical families of 4 (a "Platform-style" family —
`PMOLayout`/`PMLayout` in both apps, sharing `PlatformAppHeader` + `QuickCaptureFab` + no
`simulatorScope` — and a "Sim-style" family — `SimulatorPMOLayout`/`SimulatorPMLayout` in both
apps, sharing `SimulatorAppHeader` + `simulatorScope` on `Sidebar` + a "Back to Simulator" bar).
This is a system-wide gap, not a one-page bug: every one of the 60+ routes mounted under a
`/pmo/` or `/app/pmo/` prefix is equally exposed, and any future page built the same way inherits
the same flaw.

## b) Solution
Make the user's actual role the single source of truth for which menu/sidebar renders, with no
exceptions, enforced **once**, centrally — and use this fix as the occasion to collapse the 8
duplicated Layout shells into one shared, parametrized component so the guard only has to be
written once, not copy-pasted 8 times.

1. **Guard**: a new `useRoleScopeGuard(requiredScope)` hook resolves the signed-in user's real
   role scope (reusing the existing `PMO_LAYOUT_ROLES` / `PM_LAYOUT_ROLES` classification) and
   blocks/redirects *before* any sidebar renders if the role doesn't match. Dual-role users are
   never blocked from either of their scopes.
2. **Consolidation**: the 8 Layout shells become thin, app-specific wrappers around one new
   `packages/ui` shell component that contains the guard, the `BrandingProvider`/`MenuProvider`
   wiring, and the shared flex/main markup — each wrapper supplies only its own header, sidebar
   props, and extra widgets/providers.
3. **Cross-role pages get their own route per role**: where a page is legitimately needed by more
   than one role (the one confirmed case: Organisational Templates, per [[v824]]'s already-
   approved PM use case), it is mounted at an additional role-scoped route — never by letting one
   role borrow another role's URL/layout.
4. **Fine-grained admin gating**: genuinely admin-exclusive pages (6 found: Form Template
   Builder, Form Template Admin, Business Case View, Send Role Invites, Assign Roles to Projects,
   Role Assignment) get a shared `RequireRole` component replacing their ad hoc inline
   `isPmoAdmin`/`getSessionPMOAdminStatus` checks — narrower than the coarse scope guard, so
   removing the old inline checks doesn't broaden access.
5. **TM scope** gets the same guard treatment for consistency, even though no bug exists there
   today (no hardcoded `layoutScope="tm"` was found).
6. **Dead code removed**: the root-level legacy `src/` tree (unreachable from the active
   Turborepo build; see Implementation decisions) is deleted outright rather than fixed.

## c) User stories
1. As a PM, when I click a link that used to route me into a `/pmo/...` page that has a
   PM-scoped equivalent, I land on the PM-scoped URL and my PM sidebar never changes.
2. As a PM, if I reach (stale bookmark, typed URL, old link) a PMO-admin-exclusive page I have no
   reason to access, I'm redirected to my own dashboard with a clear notice — I never see the PMO
   sidebar, even for an instant.
3. As a PMO Admin, my own navigation inside `/pmo/...` pages is unaffected — same PMO sidebar as
   today, no extra load flicker beyond current behaviour.
4. As a dual-role user (holds both a PM role and a PMO Admin role), I can still access both
   scopes as I can today (persisted context switch) — the guard only blocks users whose roles
   include **neither** of the destination's allowed scopes.
5. As a Team Member/Team Lead, the same guard mechanism now formally covers my scope too, even
   though there was no live bug there — consistency, not a fix.
6. As a developer adding a new page later, mounting it inside the shared `packages/ui` shell
   makes this bug structurally impossible to reintroduce — there's only one place the guard could
   be missing, and it isn't per-page.
7. As a Simulator user, all of the above behaves identically in the Simulator app (parity).
8. As a PM viewing Organisational Templates, the page's existing behaviour (nearest-tier
   filtering, "Copy down to my project" action, from [[v824]]) is unchanged — only the URL/layout
   it's reached through changes.
9. While role data is loading (cold page load / hard refresh landing directly on a role-scoped
   URL), I see a brief neutral loading state — never a flash of the wrong sidebar.
10. As a PM/TM, if I somehow reach Form Template Builder / Role Assignment / Assign Roles to
    Projects / Send Role Invites / Form Template Admin / Business Case View without being a PMO
    Admin specifically, I get the same clear "not authorised" experience as today, now delivered
    by one shared `RequireRole` component instead of six separate hand-rolled checks.
11. As a maintainer, the 8 Layout shell files shrink to thin wrappers (header + sidebar props +
    extra widgets only) — the guard, provider wiring, and markup live in exactly one place per
    role family.
12. As a developer, the dead root-level `src/` tree is gone, so it can no longer be mistaken for
    a place that still needs fixes applied.

## d) Implementation decisions
- Guard lives inside the new shared shell component, not as new per-route wrapper props — zero
  changes to `platformRoutes.jsx` / `simulatorRoutes.jsx` route definitions themselves, except
  the Organisational Templates route addition and one redirect-target update.
- Role scope classification reuses the existing `PMO_LAYOUT_ROLES` / `PM_LAYOUT_ROLES` /
  `TM_LAYOUT_ROLES` sets and `resolvePrimaryLayoutScopeFromRoles()`.
- Role-name fetch reuses the query currently private inside each fork of `useMenu.js`
  (`fetchUserRoleNamesForAuthUser`), promoted to a shared, exported, cache-aware
  `resolveUserRoleScope()` — applied in **all three live forks** (`packages/shared`,
  `apps/platform`, `apps/simulator`) since each Layout family imports from a different one (the
  "Platform-style" family imports `@nidus/shared/hooks/useMenu`; the "Sim-style" family imports a
  local relative `../../../hooks/useMenu`). No new DB queries — same query, reused.
- Dual-role users are never blocked from either of their scopes (matches today's persisted
  context-switch behaviour).
- A role hitting a URL outside its own scope is **blocked/redirected**, never silently shown the
  other role's menu. Pages needed by multiple roles get one route per role, all pointing at the
  same underlying page component.
- The one confirmed multi-role page today is Organisational Templates ([[v824]]).
- **Layout consolidation**: new `packages/ui` shell (exact name TBD during implementation, e.g.
  `RoleScopedShell`) with slots for: header element, sidebar element/props (`simulatorScope`),
  a "pre-content" slot (covers both `SubscriptionExpiryBanner` and the Sim family's "Back to
  Simulator + PracticeDashboardSwitcher" bar — different positions, both fit a slot rendered
  between header and children), a context-providers wrapper array (covers `CurrentProjectProvider`
  for the PM family), and a `showQuickCaptureFab` flag (Platform-style family only). Each of the
  8 existing files is rewritten as a thin wrapper (~15-20 lines) supplying its own pieces plus
  `requiredScope`. `BrandingProvider` + `MenuProvider` + the guard live inside the shared shell,
  once.
- **Fine-grained `RequireRole`**: new shared component (`packages/shared` or `packages/ui`,
  matching whichever already hosts comparable guard components) taking explicit role names (e.g.
  `['pmo_admin']`), used in the 6 confirmed pages x2 apps = 12 files, replacing their existing
  inline `isPmoAdmin`/`getSessionPMOAdminStatus` + `setError('Only PMO Admin can access...')`
  patterns.
- **TM scope**: the new shared shell supports `requiredScope="tm"` from day one; no dedicated
  `TMLayout.jsx` file exists today (TM rendering currently falls through the generic
  `Layout.jsx`/`Sidebar` role resolution) — this item is about making the mechanism available, not
  about creating a new TM-specific shell unless one is later split out.
- **Root `src/` deletion**: confirmed unreachable from the active Turborepo pipeline (`npm run
  dev` / `build` target `@nidus/platform-app` / `@nidus/simulator-app` only; root `src/` is only
  reachable via the legacy `dev:legacy` script) and a month stale relative to `apps/platform`'s
  copy. Deleted outright, not migrated — nothing in the active build path references it.
- No database/SQL changes — this is entirely a client-side routing/menu/component fix.

## e) Testing decisions
- Unit tests for `resolveUserRoleScope()` classification (pm-only, pmo-only, dual-role, no roles,
  unknown role names) — one suite per live fork, or a single suite if the forks are byte-identical
  after the change.
- Unit tests for the guard's allow/redirect decision table.
- Unit tests for `RequireRole`'s allow/blocked decision given explicit role lists.
- Manual browser verification: PM can no longer reach `/app/pmo/organisational-templates`
  directly (redirected); PM reaching the new PM-scoped templates URL keeps the PM sidebar and
  retains existing [[v824]] nearest-tier behaviour; PM hitting `/app/pmo/forms/...` is redirected
  before the PMO sidebar renders; the 6 admin-only pages still correctly block non-PMO-Admin users
  via `RequireRole`; PMO Admin's own navigation is unaffected; a dual-role account can still reach
  both scopes; visual parity of the consolidated shell against today's 8 originals (header,
  sidebar, widgets, spacing) in both apps; root `src/` removal doesn't break `dev:legacy` in a way
  anyone depends on (confirm with user before deleting).
- "Done" = no path exists where a signed-in user with a single, non-matching role scope ever sees
  another scope's sidebar render, even momentarily; the 8 Layout files are thin wrappers around
  one shared shell; the 6 admin-only pages use the shared `RequireRole`; root `src/` is gone.

## f) Out of scope
- Promoting `Sidebar`, `PlatformAppHeader`, `SimulatorAppHeader`, `QuickCaptureFab`,
  `CurrentProjectProvider`, or `PracticeDashboardSwitcher` themselves into `packages/ui` /
  `packages/shared` — only the outer Layout *shell* markup is consolidated; the per-app
  header/sidebar/widget components stay where they are today and are passed into the shared
  shell's slots.
- Any change to how `Sidebar`'s own menu-item filtering works (role-to-menu-item mapping,
  DB-driven `role_menu_items`) — this fix is entirely about which Layout shell mounts, not about
  what's inside the menu once the right shell is chosen.
- Any further fine-grained permission model beyond exact-role-name matching in `RequireRole`
  (e.g. attribute-based access control) — out of scope; `RequireRole` mirrors what the existing
  ad hoc checks already did, just consolidated.

## g) Further notes
- The "Sim-style" Layout family living inside `apps/platform/src/components/sim/...` (as opposed
  to `apps/simulator/...`) is itself a small oddity worth a future look — Platform apparently
  renders some Simulator-styled shells too — but is preserved as-is by this fix (it just gets a
  thinner wrapper like its 7 siblings).
- The Organisational Templates PM-scoped route should follow the URL convention already
  established for other shared PM delivery pages (`PM_SHARED_PLATFORM_PREFIXES` in
  `menuLayoutUtils.js`, e.g. `/platform/templates`).
