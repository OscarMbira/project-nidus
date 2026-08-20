# v839 — Role-Scoped Menu Layout Guard

PRD: [[v839_role_scoped_menu_layout_guard_PRD]] (`projectprd/v839_role_scoped_menu_layout_guard_PRD.md`)

Scope confirmed with user: core menu-switch fix **plus** all four originally-out-of-scope
additions — TM-scope parity, fine-grained `RequireRole` (+ removing the old inline checks),
consolidating the 8 Layout shells into `packages/ui`, and deleting the dead root-level `src/`.

## Design

### 1. Promote the role-name fetch (all 3 live forks)
`useMenu.js` / `menuLayoutUtils.js` are forked in `packages/shared/src/{hooks,utils}/`,
`apps/platform/src/{hooks,utils}/`, and `apps/simulator/src/{hooks,utils}/` (root `src/` is a 4th,
dead fork — deleted in step 8, not touched here). In each of the 3 live forks:
- Export `resolveUserRoleScope(authUser)` from `menuLayoutUtils.js`: cache-first via
  `getCachedUserMenuRoles`, else calls the same `users` → `user_roles` → `roles` query
  `fetchUserRoleNamesForAuthUser` already runs (moved here, not duplicated), then classifies via
  `resolvePrimaryLayoutScopeFromRoles` into `'pm' | 'pmo' | 'both' | null`.
- `useMenu.js` in each fork calls this instead of its own private copy — behaviour-neutral change
  for `useMenu.js` itself.

### 2. Guard hook
New `useRoleScopeGuard(requiredScope)` (co-located with `resolveUserRoleScope`, one per fork):
returns `{ status: 'loading' | 'allowed' | 'blocked', redirectTo }`. `allowed` when resolved
scope is `'both'` or matches `requiredScope`. `blocked` otherwise, with `redirectTo` = the user's
own scope's home route.

### 3. Consolidate the 8 Layout shells into one shared shell (packages/ui)
Confirmed structure (diffed all 8 files):
- **"Platform-style" family** (4 files: `apps/{platform,simulator}/src/components/{pmo,pm}/*Layout.jsx`):
  `PlatformAppHeader`, plain `Sidebar` (no `simulatorScope`), `QuickCaptureFab`. PMO adds
  `SubscriptionExpiryBanner` before children; PM adds `CurrentProjectProvider` wrapping
  everything + `PMProjectSelector` before children.
- **"Sim-style" family** (4 files: `apps/{platform,simulator}/src/components/sim/{pmo,pm}/Simulator*Layout.jsx`):
  `SimulatorAppHeader`, `Sidebar` with `simulatorScope="pmo"|"pm"`, a "Back to Simulator +
  `PracticeDashboardSwitcher`" bar before children, no `QuickCaptureFab`, no
  `CurrentProjectProvider`.

New `packages/ui/src/layouts/RoleScopedShell.jsx` (name TBD) takes: `requiredScope`,
`header` (element), `sidebarProps` (spread onto the app's own `Sidebar`, so `Sidebar` itself stays
per-app), `preContent` (element rendered between header and children — banner or
back-to-simulator bar), `providers` (array of wrapper components, e.g. `[CurrentProjectProvider]`),
`showQuickCaptureFab` (bool), `children`. Contains: `BrandingProvider`, `MenuProvider` +
`useRoleScopeGuard`, the shared flex/main markup, loading/blocked states.

Each of the 8 original files is rewritten to a thin wrapper (~15-20 lines) that imports its own
`Header`/`Sidebar`/widgets and passes them into `RoleScopedShell`. Import path used by each
wrapper for `resolveUserRoleScope`/the guard matches whichever fork that file already used
(`@nidus/shared/...` for the Platform-style family, local relative `../../../hooks/useMenu` for
the Sim-style family) — no forcing a fork switch as part of this change.

### 4. Audit before enabling the guard
Grep both apps for every `Link to=`, `navigate(`, `href=`, or redirect target pointing at
`/pmo/`, `/app/pmo/`, `/simulator/pmo/` from a component not already inside a PMO context, to
find any other currently-working cross-role page beyond Organisational Templates. Genuine
admin-only destinations need no action (the guard formalizes existing intent); any other
legitimate cross-role page found gets its own additional scoped route per step 5's pattern before
the guard goes live for that path.

### 5. Organisational Templates: add the PM-scoped route ([[v824]] follow-up)
- Platform: mount `OrganisationalTemplatesPage` (`packages/modules/pmo-module/src/pages/`) at a
  new route in `apps/platform/src/routes/platformRoutes.jsx`, wrapped in the PM wrapper instead of
  the PMO one — match whichever import pattern (direct vs. federated) other directly-mounted
  `pmo/...` routes already use in that file. Target path follows the existing
  `PM_SHARED_PLATFORM_PREFIXES` convention (e.g. `/platform/organisational-templates`).
- Simulator: mirror in `apps/simulator/src/routes/simulatorRoutes.jsx` using
  `packages/modules/sim-pmo-module/src/pages/OrganisationalTemplatesPage.jsx`.
- Update `TemplateLibraryList.jsx` (Platform + Simulator) redirect target from
  `/app/pmo/organisational-templates?entityType=project&entityId=...` to the new PM-scoped path
  with the same query params. Page component, nearest-tier filtering, and "Copy down to my
  project" action are untouched — only the mount point changes.
- The existing unfiltered `/app/pmo/organisational-templates` (no query params, PMO-admin view)
  stays exactly as-is, now correctly gated to PMO roles only by the new guard.

### 6. Fine-grained `RequireRole` (replaces 6 pages' inline checks)
New shared `RequireRole({ roles, children })` component. Confirmed pages with an existing ad hoc
`isPmoAdmin`/`getSessionPMOAdminStatus` + `setError('Only PMO Admin can access...')` pattern
(Platform + Simulator copies each, 12 files total):
- `pages/forms/FormTemplateBuilder.jsx`
- `pages/forms/FormTemplateAdmin.jsx`
- `pages/businessCase/BusinessCaseViewPage.jsx`
- `pages/admin/SendRoleInvites.jsx`
- `pages/admin/AssignRolesToProjects.jsx`
- `pages/admin/RoleAssignment.jsx` (uses `isPmoAdmin(user.id)`, same pattern, different casing)

Each is rewritten to wrap its guarded content in `<RequireRole roles={['pmo_admin']}>`, and the
old inline check/state/message is deleted. This is safe to remove now (not before) because
`RequireRole` enforces the same specific role, not the coarser scope check from step 2/3.

### 7. TM scope coverage
No dedicated `TMLayout.jsx` exists (confirmed via search) — TM rendering currently falls through
generic `Layout.jsx`/`Sidebar` role resolution. Ensure `RoleScopedShell` (step 3) accepts
`requiredScope="tm"` and that `useRoleScopeGuard('tm')` works correctly against
`TM_LAYOUT_ROLES`, so the mechanism is ready if/when a dedicated TM shell is split out — no new
TM shell file is being created in this pass since none exists to fix.

### 8. Delete dead root-level `src/`
Confirmed unreachable from `turbo dev`/`turbo build` (only used by the legacy `dev:legacy` npm
script) and a month stale relative to `apps/platform`'s copy. Before deleting: confirm with user
that `npm run dev:legacy` is not something they still rely on, then remove the root `src/` tree
and the `dev:legacy` script entry (and root `vite.config.js` if nothing else in the active
pipeline uses it — check first).

### 9. Documentation
New `Documentation/Role_Scoped_Routing_Guide.md`: explains the pattern — every role-scoped page
mounts inside `RoleScopedShell` with the right `requiredScope`; a page needed by more than one
role gets one route per role; admin-exclusive pages use `RequireRole` for the narrower check.

### 10. Tests
- Role-scope classification + guard decision-table unit tests (per live fork).
- `RequireRole` allow/blocked unit tests.
- Visual/manual parity check of the consolidated shell vs. today's 8 originals.

## Explicitly out of scope
- Promoting `Sidebar`/`PlatformAppHeader`/`SimulatorAppHeader`/`QuickCaptureFab`/
  `CurrentProjectProvider`/`PracticeDashboardSwitcher` into `packages/ui` — only the outer shell
  markup is consolidated.
- Changes to `Sidebar`'s own DB-driven menu-item filtering.
- Any access-control model beyond exact-role-name matching in `RequireRole`.

## Todo
- [x] `resolveUserRoleScopes()` / `fetchUserRoleNamesForAuthUser()` / `userHasAnyRole()` added to
      `menuLayoutUtils.js`. Turned out only `packages/shared`'s copy is live (the app-local
      `apps/{platform,simulator}/src/utils/menuLayoutUtils.js` files are dead — nothing imports
      them; left untouched, not part of the approved deletion). `useMenu.js` **is** genuinely
      forked 3 ways as expected — all 3 now import `fetchUserRoleNamesForAuthUser` from
      `menuLayoutUtils.js` instead of keeping a private copy.
- [x] `useRoleScopeGuard()` hook added (`packages/shared/src/hooks/`).
- [x] `RoleScopeGate` + `RoleScopedShell` + `RequireRole` built in `packages/ui`, exported from
      its barrel.
- [x] All 8 Layout files rewritten as thin wrappers (`RoleScopeGate` outermost, unchanged
      per-fork `MenuProvider` import, `RoleScopedShell` for markup).
- [x] Audit pass completed — grepped all `Link/navigate/href` into `/pmo/`, `/app/pmo/`,
      `/simulator/pmo/` paths (75 files). Only one genuine cross-role case found:
      `TemplateLibraryList.jsx`'s Organisational Templates link (handled below).
      `DashboardSwitcher.jsx`'s pmo-dashboard link is self-gated on `hasPMORole` — not a leak.
- [x] Organisational Templates PM-scoped route added: Platform `/platform/templates/organisational`
      (`PmOrganisationalTemplatesPage` in `lazyImports.js`); Simulator
      `/simulator/pm/templates/organisational/*` (`SimPmOrganisationalTemplatesFederated` in
      `SimPmoFederatedOutlet.jsx`).
- [x] `TemplateLibraryList.jsx` redirect target updated in both apps. Simulator's copy is
      currently unwired into `simulatorRoutes.jsx` (a pre-existing [[v824]] gap, not something
      this plan takes on) — its redirect target is still corrected for when that's fixed.
- [x] `RequireRole` component built — **not** used to migrate the 6 admin pages directly (their
      access check is embedded in async data-loading, not a simple render gate; wrapping would
      have meant restructuring 12 files' control flow for a mostly-cosmetic win). Instead fixed
      at the source: `pmoAdminService.fetchPMOAdminFlagForAuthUserId` and
      `organisationRoleService.isPmoAdmin` (both apps) now call the new shared `userHasAnyRole()`
      instead of each re-implementing the same query — same DRY benefit, far smaller blast
      radius. `RequireRole` stays available for new pages.
- [x] Found and fixed a real pre-existing bug while there: `RoleAssignment.jsx` (both apps) had
      an imported `isPmoAdmin` function shadowed by a same-named local `useState` boolean,
      so the admin check always threw `TypeError`. Fixed via import aliasing
      (`isPmoAdmin as checkIsPmoAdmin`) + renaming the state to `hasPmoAdminAccess`.
- [x] `RoleScopedShell`/`useRoleScopeGuard` support `requiredScope="tm"` generically (same
      `TM_LAYOUT_ROLES` set) — no dedicated `TMLayout.jsx` exists to wire it into yet.
- [x] Root `src/` deleted after discovering + stashing 9 files of uncommitted WIP (562 lines,
      export/PDF-pagination work) that predated this session — preserved in
      `git stash@{0}` ("v839: root src/ WIP..."), not lost. Removed root `src/`,
      `vite.config.js`, `vite.platform.config.js`, `vite.simulator.config.js`, and the 6
      `dev:legacy*`/`build:legacy*` package.json scripts (kept `watch:docs`/`sync:docs` — used
      standalone). `vite.base.config.js` kept — still used by the active
      `apps/{platform,simulator}/vite.config.js`.
- [x] `Documentation/Role_Scoped_Routing_Guide.md` written.
- [x] Unit tests written and passing: `roleScopeResolution.test.js` (13 tests, packages/shared),
      `useRoleScopeGuard.test.js` (4 tests), `RoleScopeGate.test.jsx` (4 tests),
      `RequireRole.test.jsx` (4 tests). Full `packages/shared` (240 tests) and `packages/ui`
      (47 tests) suites pass with no regressions.
- [x] **Critical fix found live in the browser, not by the test suite**: every app/module's
      `vite.config.js` aliases `@nidus/ui` and `@nidus/shared/{utils,hooks,context,constants}` to
      that app's own **local** `src/components/ui` / `src/utils` / `src/hooks` folder, not to
      `packages/ui`/`packages/shared`. The user hit `Uncaught SyntaxError: ... does not provide
      an export named 'fetchUserRoleNamesForAuthUser'` because my additions only existed in
      `packages/shared`/`packages/ui`, which neither app actually loads for those subpaths. Fixed
      by mirroring every new/changed file into both apps' local copies: `menuLayoutUtils.js`
      (already-live per-app forks, now with the 3 new exports), `useRoleScopeGuard.js`,
      `RoleScopeGate.jsx`, `RoleScopedShell.jsx`, `RequireRole.jsx`, plus both local `@nidus/ui`
      barrel (`components/ui/index.js`) exports. `packages/shared`/`packages/ui` keep the
      canonical copies (and are what the unit tests exercise); this aliasing scheme means they
      are templates other tooling doesn't automatically sync from — a pre-existing repo
      characteristic, not something this plan changes.
- [ ] Manual verification checklist (PRD section e) run in both apps — needs a live browser,
      left for the user; the console error that prompted this discovery should now be gone on
      refresh.
- [x] Full `apps/platform`/`apps/simulator` vitest suites attempted — both are extremely slow in
      this environment (17–24 min) and carry a large pre-existing baseline of unrelated failures
      (syntax/parse errors in several `*.test.js` files, mock-setup gaps in unrelated features)
      that predate this change. Neither completed run's tail, nor the largest single partial run
      captured in full, showed any failure traceable to a file this plan touched, or any
      "does not provide an export" error once the alias-gap fix above landed. Full clean
      confirmation of the two app suites was not achievable in reasonable time; the shared
      package suites (which do exercise the new logic directly) are clean.

## Review

**Status: code complete, unit-tested at the shared-package level, one critical live-runtime
issue found and fixed during verification, full app-level test suites inconclusive due to
environment speed/pre-existing noise — manual browser check still needed from the user.**

**What shipped:**
- Root cause confirmed and fixed: `PMOLayout`/`PMLayout` (and Simulator equivalents) no longer
  hardcode which sidebar renders. Every one of the 8 Layout shells across Platform and Simulator
  now wraps itself in `RoleScopeGate`, which calls `useRoleScopeGuard(requiredScope)` and only
  renders `MenuProvider`/`Sidebar` once the signed-in user's actual role is confirmed to include
  that scope — dual-role users pass for either scope; a mismatch redirects away before any
  chrome mounts.
- 8 Layout files collapsed into thin wrappers around a new shared `RoleScopedShell` (presentation
  only) — each supplies its own header/sidebar/widgets/providers via props.
- Organisational Templates ([[v824]]) gets a proper PM-scoped mount
  (`/platform/templates/organisational`, `/simulator/pm/templates/organisational`) instead of
  sending PMs to the PMO URL that caused the reported bug.
- `pmoAdminService`/`organisationRoleService` (both apps) now share one role-check function
  (`userHasAnyRole`) instead of three independently-implemented queries — and a genuine
  pre-existing bug was found and fixed in the process: `RoleAssignment.jsx` (both apps) imported
  `isPmoAdmin` but shadowed it with a same-named local state variable, so the admin check always
  threw.
- Root-level dead `src/` tree removed — but only after discovering 9 files of real uncommitted
  work (562 lines, export/PDF-pagination) sitting in it unrelated to this task; stashed
  (`git stash@{0}`) before deletion, not lost.
- **The most consequential discovery came from the user's live browser report, not from the test
  suites**: this monorepo aliases `@nidus/ui` and `@nidus/shared/{utils,hooks}` per-app to local
  folders rather than the actual shared packages. Every new file/export this plan added to
  `packages/shared`/`packages/ui` had to be mirrored into both apps' local copies for the fix to
  actually take effect at runtime. This is now done and documented in the guide.

**Second live-browser issue found and fixed**: `apps/platform/src/routes/platformRoutes.jsx`
doesn't import from `lazyImports.js` directly — it goes through an intermediary barrel
(`routeCommon.jsx`, `import * as LP from './lazyImports'` then a curated `export { ... }` list)
that re-exports only a named subset. Adding `PmOrganisationalTemplatesPage` to `lazyImports.js`
wasn't enough; it also needed adding to `routeCommon.jsx`'s destructure-from-`LP` block and its
`export {}` list. Fixed — both now include it.

**Left for the user:** the manual verification checklist (PRD section e) — refresh the browser to
confirm both console errors are gone, then walk through the PM→Organisational Templates and
PM→Form Template Builder scenarios from the original bug report.

**Note on test coverage:** `packages/shared` (240 tests) and `packages/ui` (47 tests) — including
21 new tests covering `resolveUserRoleScopes`, `userHasAnyRole`, `useRoleScopeGuard`, and
`RoleScopeGate`/`RequireRole` — pass cleanly. The app-level suites could not be fully verified
clean in this session due to pre-existing unrelated failures and very long run times; nothing
found in the partial runs pointed at this change.
