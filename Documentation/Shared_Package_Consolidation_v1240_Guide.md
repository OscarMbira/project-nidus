# Shared package consolidation (v1240) — developer guide

Plan: `projectplan/v1240_shared_package_consolidation_plan.md` · PRD: `projectprd/v1240_shared_package_consolidation_PRD.md`

## What changed

Before v1240, `@nidus/ui` and `@nidus/shared/{utils,hooks,context,constants}` did not resolve to
`packages/*` in Platform, Simulator or any federated module: each `vite.config.js` aliased them to
the app's own `src/components/ui`, `src/utils`, `src/hooks`, `src/context` and `src/constants`.
Every shared file existed three times, and fixes made in `packages/*` never ran.

Now:

- `@nidus/*` resolves to `packages/*` everywhere. The five app-local folders are gone.
- A fix to a shared component, util, hook, context or constant is made **once** in `packages/*`.
- `.github/workflows/shared.yml` rebuilds and retests every app and module that depends on the
  changed package (Turborepo `--filter="...[HEAD^1]"`).
- Shared React contexts are Module Federation singletons
  (`packages/shared/src/federation/federationShared.js`), so a remote loaded at runtime sees the
  shell's providers.

## Where code goes now

| Kind of code | Location | Import as |
|---|---|---|
| Shared UI component | `packages/ui/src/` | `@nidus/ui/Name` (or the `@nidus/ui` barrel) |
| Shared util / hook / context / constant | `packages/shared/src/{utils,hooks,context,constants}/` | `@nidus/shared/utils/name` … |
| Hook / context / util that calls an app service | `apps/<app>/src/lib/` | relative path inside the app |
| UI component that calls an app service | `apps/<app>/src/components/shared-app/` | relative path inside the app |
| Module code that needs an app-side file | — | `@shell/lib/…` or `@shell/components/shared-app/…` |

"Calls an app service" means it imports from `apps/<app>/src/services/` — those services bind to
the app's schema (`platformDb` → `public`, `simDb` → `sim`). Where possible, split the pure part into
the package and keep only the service-bound part in the app:

- `useCurrentProject` / `CurrentProjectContext` object → `@nidus/shared/hooks/useCurrentProject`;
  `CurrentProjectProvider` (role lookups) → `apps/<app>/src/lib/CurrentProjectContext.jsx`.
- `useBranding` / `BrandingContext` object → `@nidus/shared/hooks/useBranding`; defaults →
  `@nidus/shared/utils/brandingDefaults`; `BrandingProvider` → `apps/<app>/src/lib/BrandingContext.jsx`.
- `applySimulatorMenuTransform` (pure) → `@nidus/shared/utils/simulatorMenuTransform`;
  `useMenu` / `useSimMenu` (DB + services) stay in `apps/<app>/src/lib/`.

## Telling shared code which app it runs in

`AppConfigProvider` (mounted once in each `App.jsx`) exposes `{ app, basePath, db }` through
`useAppConfig()` from `@nidus/shared/context/AppConfigContext`:

| App | `app` | `basePath` | `db` |
|---|---|---|---|
| Platform | `platform` | `''` | `platformDb` |
| Simulator | `simulator` | `/simulator` | `simDb` |
| Planner (v1239) | `planner` | `/app` | `platformDb` |

Use it instead of checking `location.pathname` for `/simulator/`.

## Guards

- `node scripts/check-shared-drift.mjs` — report (identical / shim / stale / divergent / app-only
  per group, alias overrides, files left in the old folders). `--enforce` fails on any alias
  override or any file in the old folders. Tests: `node --test scripts/__tests__/check-shared-drift.test.mjs`.
- `eslint.config.js` and `packages/eslint-config/boundaries.js` — `no-restricted-imports` rejects a
  relative import into `packages/*/src/**` from app code.

## Tests

- `packages/shared` and `packages/ui` now run their tests in the same environment the apps used
  (jsdom, `src/test/setup.js`, globals, placeholder Supabase env), by folder glob.
- App-side tests live next to their code: `apps/<app>/src/lib/__tests__/`,
  `apps/<app>/src/components/shared-app/__tests__/`.

## Fixes that went live because of v1240

The shadow copies had hidden real defects and unshipped fixes. Each file was merged on its merits
(details per file in the plan):

- Checkpoint Report links built `/app/projects/…` (no such route) — now `/platform/projects/<code>/…`.
- `ViewToggle` used dark-only text colours — now light/dark aware (rule 28.1).
- The `@nidus/ui` barrel exported `Table` as a default export that does not exist.
- The PMO sidebar's v1000 "Dissolve Executive Overview", v982 PMO Configuration registry entries,
  the Local Registers lifecycle entry and the "fill missing sort order only" rule (rule 25.1) were
  only in dead copies of `packages/config` files.
- Pre-existing build breaks fixed: Platform `intakeFormService.listProjectOptions`, nine missing
  Simulator `routeCommon` exports, and the deleted `pmo-module/index.html`.

Rejected from the package side (they would have been regressions): an `initAppErrorReporting` that
wrote to the `admin` schema (rule 34.5), a hardcoded currency list (rule 25.1), a duplicated-key
bug in `stakeholderSEAMUtils`, and an unwired "pending changes" panel in `AuthorisationRequestModal`.

## Admin app

Out of scope. `E:\project-nidus-admin` remains a separate repository and keeps replicating shared
patterns (rule 34.4) until `@nidus/*` packages are published.
