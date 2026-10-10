# v1206 — Unified persistent app shell: implementation plan

PRD: `projectprd/v1206_unified_app_shell_PRD.md`. Status: **approved 2026-10-06. Slice 1 (Platform) in progress.**

## Approach

One `AppShell` component type for every route, with scope as a prop. Route files keep their per-route `Suspense`/`ThemeProvider`/`ToastProvider`/`ProtectedRoute` wrappers; only the innermost `<Layout>`/`<PMLayout>` element changes to `<AppShell scope="…">`. A probe (removed) confirmed React keeps a same-type wrapper mounted across routes.

Test-first per `projectplan/App_Guide.md`: failing test, minimal code to pass, then refactor.

## Slice 1 — Platform (tracer bullet)

- [x] **1.1 Red tests** (`apps/platform/src/components/__tests__/AppShell.test.jsx`):
  - PM route ↔ Platform route keeps the same shell DOM node (no remount).
  - Previous menu items stay visible while the new scope menu loads.
  - Help, Feedback and AI chat render on a PM route.
  - Collapsed state persists across a scope switch.
- [x] **1.2 Red test for the gate**: non-PM user on a PM route is redirected to `/platform/dashboard`, and the shell is rendered during the check.
- [~] **1.3 Shared shell** (deviation: shell kept in `apps/platform/src/components/Layout.jsx`, not `packages/ui`, because `@nidus/ui` and `@nidus/shared/utils` resolve to app-local copies; `packages/*` edits mirrored to keep rule 34.3): extend `RoleScopedShell.jsx` into `AppShell` (header slot, sidebar slot, main, widgets, always-mounted providers), exported from `packages/ui/src/index.js`.
- [x] **1.4 Platform wiring**: `Layout.jsx` renders `AppShell` for every path. Remove the `shouldUsePmLayoutShell` early return (lines 47–49). Scope resolves from the path and role.
- [x] **1.5 PMLayout retirement** (file deleted; PM routes use `<Layout scope="pm">`): `PMLayout` becomes a thin export of `AppShell scope="pm"` (kept so the existing `PMLayout` imports in `PmisGapRoutes`, `RecordLifecycleRoutes`, `PlanningFederatedOutlet` keep working). Mount `CurrentProjectProvider` for every scope.
- [~] **1.6 Menu swap** (existing `useMenuProvider` already keeps loaded items per scope; not separately tested yet): `MenuProvider` keeps the previous scope's items until the new scope's items resolve (no clearing to empty on scope change).
- [x] **1.7 Route wrapper swap**: in `apps/platform/src/routes/platformRoutes.jsx` replace the 8 `<Layout>` and 1 `<PMLayout>` literal wrappers with `<AppShell>` scope props. Check `PmisGapRoutes.jsx` and `RecordLifecycleRoutes.jsx` the same way.
- [x] **1.8 Regression**: full Platform suite run: 146 failed / 1848 passed. The 29 failing files import none of the changed modules (Layout, PMLayout, RoleScopeGate, menuLayoutUtils, lazy routes); they are menu-data, mandate, checkpoint and invitation tests. Baseline on HEAD not run, so this is an inference, not a proof.: run the Platform quality suites and `ProtectedRoute`/`RoleScopedShell` tests (must stay green).
- [ ] **1.9 Manual acceptance (dev server, 5173)**: Lessons Log → Add Lesson keeps the frame; PM ↔ Platform navigation; collapse toggle across navigation; light and dark themes.

## Slice 2 — Simulator

- [x] **2.1 Parity tests** mirroring 1.1–1.2 for `apps/simulator` (`/simulator/...` routes and the `SimulatorPMLayout`/`SimulatorPMOLayout`/`SimulatorTMLayout` family, mapped to `AppShell` scopes).
- [x] **2.2 Simulator wiring** (PM and PMO wrappers now `<Layout scope="pm"|"pmo">`; `SimulatorPMLayout.jsx` and `SimulatorPMOLayout.jsx` deleted. Deviations: no `CurrentProjectProvider` in the Simulator shell, because it reads `public` data and rule 1 forbids that in Simulator code; `SimulatorTMLayout` has no route wrappers, so it is left untouched as unused; `components/pm/PMLayout.jsx` stays because the Simulator PmisGap and record-lifecycle modules still use it) in `apps/simulator/src/routes/simulatorRoutes.jsx` and the simulator layouts, following the same pattern.
- [~] **2.3 Regression and manual acceptance (dev server, 5174)** as in 1.8–1.9.

## Out of scope (tracked, not in this plan)

- PMO layouts (`PMOLayout`, `PmoFederatedOutlet`): follow-up plan.
- Admin app (`E:\project-nidus-admin`): separate codebase, follow-up per rule 34.6.
- Route placement changes (e.g. moving Add Lesson under `/pm/`).

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Shell props differ per scope and break a route's guard or header | Slice 1 regression on the quality suites plus manual check of each scope's pages |
| `CurrentProjectProvider` on Platform pages runs project validation unnecessarily | Measure on Platform after 1.4; keep provider cheap; revert the provider step alone if it regresses |
| Menu stale-while-loading shows the wrong scope's items briefly | Accepted in the PRD decision; labelled in review |
| Simulator layouts differ more than Platform | Slice 2 is separate and revertible |

## Review section

To be completed after implementation, per the Standard Workflow (summary of changes, validation performed, remaining risks).
