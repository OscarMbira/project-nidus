# v753 — Dashboard Pop-out Windows Plan (Platform + Simulator)

**Created:** 2026-07-07
**Status:** Complete — verified end-to-end (Platform + Simulator Playwright specs both passing)
**Companion (admin):** `project-nidus-admin/projectplans/v20.0_dashboard_popout_windows_plan.md` (shipped)

---

## 0. Problem statement

During active testing/simulation, admins want to detach the current dashboard into a separate browser window for a second monitor while continuing other work in the main window. This already shipped for the Admin app (separate codebase). This plan brings the same capability to Platform (`apps/platform`) and Simulator (`apps/simulator`), applying globally to all dashboards (present and future), per Platform–Simulator parity (rule 34.1).

## 1. Design

Platform/Simulator routing is a single ~5,000-line hand-authored route file per app (not a clean config array like Admin's), so mirroring routes under a `/popout/*` prefix (Admin's approach) would mean duplicating thousands of lines — against this repo's own simplicity rule. Instead:

- `DetachButton` opens the **same URL** with `?popout=1` appended, in a new `window.open()`'d window.
- Each app's `Layout.jsx` (already does path-based conditional chrome-switching) gets one added check: if `popout=1`, skip header/sidebar/floating widgets, render only the page content. Zero new routes.
- The button is wired once into each app's shared `SystemHeader.jsx` (used by both `PlatformAppHeader` and `SimulatorAppHeader`), so it appears on every page automatically — no per-dashboard wiring, no per-page maintenance as new dashboards are added.
- Auth: both `platformDb`/`simDb` use `sessionStorage` with a shared `storageKey` (`packages/supabase/src/index.js`) — a `window.open()`'d same-origin window inherits the session automatically, same mechanism as Admin.

## 2. Implementation checklist

- [x] `packages/ui/src/DetachButton.jsx` — shared source-of-truth component (barrel-exported).
- [x] `apps/platform/src/components/ui/DetachButton.jsx` + `apps/simulator/src/components/ui/DetachButton.jsx` — local app copies (these apps alias `@nidus/ui` to a local folder, not the workspace package — see §4).
- [x] `apps/platform/src/components/Layout.jsx` + `apps/simulator/src/components/Layout.jsx` — added `isPopout` chromeless branch.
- [x] `apps/platform/src/components/headers/SystemHeader.jsx` + `apps/simulator/.../SystemHeader.jsx` — wired `<DetachButton>` into the header actions row (icon-only, `aria-label="Detach"`).
- [x] `Documentation/Dashboard_Popout_Windows_Guide.md` — user-facing guide.
- [x] `packages/ui/src/__tests__/DetachButton.test.jsx` — Vitest unit test (passing).
- [x] `project-nidus-admin/e2e/tests/platform/dashboard-popout.spec.js` + `.../simulator/dashboard-popout.spec.js` — Playwright specs, **both passing**.

## 3. SQL apply order

None — this is a frontend-only feature, no schema changes.

## 4. Pre-existing bugs found and fixed during verification (unrelated to this feature)

Booting the dev servers and driving real e2e runs to verify the feature surfaced a chain of pre-existing, unrelated issues — each fixed as a small, mechanical, low-risk change:

1. **Local package-mirror drift.** `apps/{platform,simulator}` vite configs alias `@nidus/ui` and `@nidus/shared/{utils,hooks,context,constants}` to local per-app folders (manually-synced copies), not the real workspace packages. Several files referenced by existing code were missing from these local mirrors, breaking app boot entirely:
   - `src/context/UnsavedChangesContext.jsx` + `src/utils/unsavedChangesUtils.js` — missing (rule 52's `useUnsavedChangesGuard` was non-functional in dev).
   - `src/components/ui/index.js` — no barrel file existed at all, breaking any bare `import { X } from '@nidus/ui'` (e.g. `SidebarNavTier` used by `MobileNavigation.jsx`/`Sidebar.jsx`).
   - `src/components/ui/SidebarNavTier.jsx`, `src/utils/sidebarNavUtils.js` — missing.
   - The new barrel's `Table` entry initially assumed a default export like every other component; `Table.jsx` only has named exports — fixed to `export { Table } from './Table.jsx'`.
   - **Recommend a separate cleanup pass** reconciling `apps/*/src/{context,utils,components/ui}` against `packages/shared`/`packages/ui`, or replacing the local-copy alias strategy with direct workspace package consumption.

2. **E2E session capture bug (`project-nidus-admin/e2e/global-setup.js`).** `loginViaUi` (used for Platform/Simulator test accounts) captured storage state via Playwright's native `context.storageState()`, which does not capture `sessionStorage` — and both apps' Supabase clients use `sessionStorage`. Admin's flow already had a custom `saveAdminStorageState` helper for this; Platform/Simulator's UI-login flow never got the equivalent. Fixed by adding a generic `saveFullStorageState` helper (`e2e/helpers/auth-storage.js`) and wiring it into `loginViaUi`. This was silently producing empty auth files for every Platform/Simulator e2e test account, not just this feature's.

3. **Stale e2e route catalog.** `e2e/catalogs/platform-routes.js`/`simulator-routes.js` list bare paths like `/dashboard`, `/portfolio/dashboard` — but actual registered routes are prefixed (`/platform/dashboard`, `/simulator/practice-portfolio/dashboard`). Bare paths hit App.jsx's catch-all and redirect to the public marketing homepage regardless of auth state. Existing tests using these paths don't catch this because `expectPageLoaded()`'s assertions are shallow (not-login, no permission-denied text) — the homepage satisfies both. Fixed by using the correct full paths in this feature's own two specs; did not attempt to fix the wider catalog (many other routes may have the same staleness — separate cleanup).

4. **Simulator `routeCommon.jsx` missing re-exports.** `TeamSeatClaimPage` and `TeamSeatsDashboard` are correctly exported from `lazyImports.js` and used in `simulatorRoutes.jsx`, but were never added to `routeCommon.jsx`'s destructure/re-export lists that everything else goes through — a real runtime crash on any page load. Fixed by adding both to both lists.

## 5. Manual test checklist

1. `pnpm run dev` (root) — starts Platform (5173) + Simulator (5174).
2. Platform: open any dashboard, click the header's Detach icon (next to Notifications) — confirm a chromeless popout window opens with live data, no sidebar/header.
3. Simulator: same, on a Simulator dashboard (e.g. `/simulator/practice-portfolio/dashboard`).
4. Confirm existing non-dashboard pages are unaffected (`Layout` change is purely additive, gated behind `?popout=1`).
5. `pnpm --filter @nidus/ui test` — `DetachButton.test.jsx` passes.
6. `npx playwright test --config=e2e/playwright.config.js --project=platform-pmo_admin --project=sim-portfolio e2e/tests/platform/dashboard-popout.spec.js e2e/tests/simulator/dashboard-popout.spec.js` (from `project-nidus-admin`) — both pass.

## 6. Review

| Area | Change |
|------|--------|
| `packages/ui` | Added `DetachButton.jsx` (shared source of truth) + barrel export + unit test |
| `apps/platform`, `apps/simulator` | Local `DetachButton.jsx`/`SidebarNavTier.jsx` copies, new `components/ui/index.js` barrel, `Layout.jsx` `isPopout` branch, `SystemHeader.jsx` wiring, `UnsavedChangesContext.jsx`/`unsavedChangesUtils.js`/`sidebarNavUtils.js` copies (unblocking, pre-existing gaps), `routeCommon.jsx` missing re-exports fixed |
| `Documentation/` | New `Dashboard_Popout_Windows_Guide.md` |
| `project-nidus-admin/e2e` | Two new Playwright specs, both passing; `global-setup.js`/`auth-storage.js` session-capture fix benefits all Platform/Simulator e2e tests, not just this feature |
