# Module Federation Contract (v731)

Every federated module under `packages/modules/<name>/` MUST implement this interface.

## Required exports (via `remoteEntry.js`)

| Expose path | File | Purpose |
|-------------|------|---------|
| `./routes` | `src/routes.jsx` | React Router `<Routes>` for all module pages |
| `./Module` | `src/index.jsx` | Module metadata + re-export of routes |

## `routes.jsx` contract

- Default export: a React component rendering `<Routes>` with module-internal paths.
- Use `lazy()` for page components.
- Wrap with `<Suspense fallback={<ModuleLoadingFallback />}>` from `@nidus/ui`.
- Do NOT import shell layout components (Layout, PMOLayout) — the shell wraps module routes.

## `index.jsx` contract

```jsx
export { default as ModuleRoutes } from './routes.jsx'
export const moduleInfo = {
  name: 'federation_name',      // snake_case, matches vite federation `name`
  version: __APP_VERSION__,     // injected via Vite `define`
  routes: ['/app/domain-path'], // top-level paths owned by this module
}
```

## `health.json` (production)

Each module MUST ship `public/health.json`:

```json
{ "name": "planning_hub", "version": "1.0.0", "status": "ok" }
```

Served at `{MODULE_URL}/health.json` for shell version checks.

## Versioning

- Bump `package.json` version on every deploy (semver).
- CDN path: `cdn.nidus.com/modules/<folder>/v<semver>/`
- Shell loads via `VITE_MODULE_*_URL` env var — change URL to roll back without redeploying shell.

## Shared dependencies

All modules MUST mark these as `singleton: true` in federation config:

- `react`, `react-dom`, `react-router-dom`

## Build requirements

- `build.target: 'esnext'` (required)
- `cssCodeSplit: false`
- Federation `filename: 'remoteEntry.js'`

## CI/CD

Each module gets `.github/workflows/module-<folder>.yml` triggering only on:

- `packages/modules/<folder>/**`
- `packages/shared/**`, `packages/ui/**`, `packages/supabase/**`

Shell workflows MUST NOT trigger on module-only changes.
