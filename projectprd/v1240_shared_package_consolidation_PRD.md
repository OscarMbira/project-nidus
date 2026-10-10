# v1240 — Shared package consolidation (one copy of shared UI, utils, hooks, context, constants)

Status: DRAFT — decision interview complete (2026-10-10). Awaiting approval.
Plan: `projectplan/v1240_shared_package_consolidation_plan.md`.
Prerequisite for: `projectplan/v1239_dual_mode_planning_product_plan.md` (must finish before v1239 Slice 1).

## a) Problem statement

CLAUDE.md rule 34.3 says `packages/*` is the single source of truth for shared code. In practice it isn't:

- `apps/platform/vite.config.js` and `apps/simulator/vite.config.js` (lines 34–38) alias `@nidus/ui` and
  `@nidus/shared/{utils,hooks,context,constants}` to each app's own folders.
- All 24 federated modules' `vite.config.js` alias them to the shell's `src/` too.
- So every shared button, table, modal, formatter and hook exists three times: `packages/*`, Platform and Simulator.
  A fix has to be made three times. Fixes made only in `packages/*` are silently inert (project memory: shadow copies).

Measured drift (2026-10-10):

| Group | Identical in all 3 | Apps agree, `packages` stale | Platform ≠ Simulator | App-only |
|---|---|---|---|---|
| ui | 75 | 14 | 1 | 5 |
| utils | 115 | 16 | 5 | 7 |
| hooks | 23 | 6 | 3 | 0 |
| context | 6 | 2 | 0 | 3 |
| constants | 2 | 1 | 0 | 1 |

Also:
- `.github/workflows/shared.yml` still watches monolith-era paths (`src/components/ui/**` …) that no longer exist.
- Module Federation shares only `react`, `react-dom` and `react-router-dom` as singletons. A remote running in true remote mode bundles its own copy of shared contexts.
- `apps/*/src/config/pmoMenuHierarchyUtils.js` and `apps/*/src/config/menuRegistry.js` are dead copies (memory).

## b) Solution

Make `packages/ui` and `packages/shared` the only copy:
1. Reconcile the drifted files into the packages.
2. Remove the aliases group by group from both apps and every module.
3. Delete the app copies.
4. Share the packages as federation singletons.
5. Guard against regression with a CI drift check and a lint rule.

A shared fix is then made once and shipped by one CI trigger (Turborepo's dependency graph rebuilds every consumer).

## c) User stories

1. As a maintainer, I fix a shared component in `packages/ui` once and Platform, Simulator, every module and the planner all get it.
2. As a maintainer, I cannot accidentally recreate an app-local copy of a shared file: lint and CI fail.
3. As a maintainer, a change under `packages/ui|shared` triggers rebuilds of every consumer, and nothing else needs triggering by hand.
4. As a Platform user, every page looks and behaves exactly as before the consolidation.
5. As a Simulator user, every page looks and behaves exactly as before. Simulator-specific behaviour (`/simulator/` prefixes, `sim_` menus, `simDb`) is preserved.
6. As a user of a federated module in remote mode, theme, unsaved-changes guard and other shared contexts work, because shell and remote share one instance.
7. As a maintainer, app-specific components that call app services live in the app's own `components/` folder, not in a folder pretending to be shared.
8. As a maintainer, the dead `pmoMenuHierarchyUtils.js` / `menuRegistry.js` app copies are gone.

## d) Implementation decisions (settled)

1. **Divergent files (9):** merge into one package file. Real app differences (route prefix, schema client, menu prefix) become parameters or come from a new `AppConfigProvider` (`{ app, basePath, db }`). Accidental drift keeps the better version. Each merged file is tested for both apps.
2. **App-only files (16):** files with no app-service imports move into `packages/*`. Components that import app services move out of the aliased folders into each app's `components/` folder and are imported by path.
3. **Rollout:** one slice per group, in the order constants → utils → hooks → ui → context. Each slice removes that group's alias from Platform, Simulator and all modules together, deletes the app copies, and passes both retest suites + every module build. One revertible commit per slice.
4. **Federation:** after aliases are gone, add `@nidus/ui` and `@nidus/shared` to `FEDERATION_SHARED` as singletons.
5. **Dead config copies:** delete the four dead `apps/*/src/config/{pmoMenuHierarchyUtils,menuRegistry}.js` files after confirming there are no imports.
6. **Tests:** app copies of tests move to `packages/*/src/**/__tests__`. Duplicates are removed; where app versions differ, both cases are kept as parameterised tests. Packages already have `vitest.config.js`.
7. **CI:** replace the stale `shared.yml` with a workflow on `packages/ui|shared|supabase|config/**` that runs `pnpm turbo build test --filter=...[HEAD^1]` (all dependents). Add a permanent drift/lint check.
8. **Admin is out of scope.** It is a separate repo and keeps replicating per rule 34.4 until packages are published to GitHub Packages.

## e) Testing decisions

- Package tests for every moved file, including the parameterised Platform/Simulator cases for the 9 merged files.
- Lint test: an ESLint rule fails on new files under `apps/*/src/{components/ui,utils,hooks,context,constants}` that duplicate a package path. The drift script fails on any differing duplicate.
- Each slice: Platform and Simulator full suites no worse than the Slice 0 baseline. `pnpm turbo build` of both apps and all modules succeeds.
- Federation: one module built and served as a real remote; a test page confirms that shell theme and the unsaved-changes guard reach the remote.
- Manual smoke per slice: light/dark toggle, a list page, a create form with unsaved-changes guard, a dashboard, sidebar menus, in both apps.

Done means: no `@nidus/ui` or `@nidus/shared/*` alias remains in any app or module config; the app copy folders contain no duplicates; the drift check runs in CI and is green.

## f) Out of scope

- Admin app consolidation / package publishing.
- Redesigning or renaming any shared component.
- Promoting the app-service components (decision 2) into packages.
- Any behaviour change visible to users.

## g) Further notes

- Rule 34.3 becomes true in practice. After approval, add a note to CLAUDE.md rule 34.3: "No app-local alias of `@nidus/*` is permitted; the CI drift check enforces this."
- Update the two shadow-copy memories once done.
