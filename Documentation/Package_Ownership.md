# Package Ownership (v730 Turborepo)

## Workspace packages

| Package | Owner | Purpose |
|---------|-------|---------|
| `@nidus/supabase` | Platform + Simulator | Supabase clients (`platformDb`, `simDb`) |
| `@nidus/config` | Platform + Simulator | Menu registries, methodology configs |
| `@nidus/ui` | Platform + Simulator | Shared UI primitives (resolved via app aliases until service deps are lifted) |
| `@nidus/shared` | Platform + Simulator | Utils, hooks, context (canonical copies; apps alias to local `src/` during transition) |
| `@nidus/eslint-config` | Engineering | Cross-boundary ESLint rules |

## Applications

| App | Deploy target | Build |
|-----|---------------|-------|
| `@nidus/platform-app` | platform.nidus.com | `pnpm turbo build --filter=@nidus/platform-app` |
| `@nidus/simulator-app` | simulator.nidus.com | `pnpm turbo build --filter=@nidus/simulator-app` |

## Import rules

- Apps import shared code via `@nidus/*` package names.
- `apps/platform` must not import from `apps/simulator`.
- `apps/simulator` must not import from `apps/platform`.
- `packages/*` must not import from `apps/*`.

## Database (Phase 4 decision)

**Single Supabase project** during development (`public` + `sim` schemas).  
Post-launch: optional split to `supabase-platform/` and `supabase-simulator/` per v730 plan.

## Turborepo remote cache

Set in CI and locally for faster rebuilds:

- `TURBO_TOKEN` — Vercel Remote Cache token
- `TURBO_TEAM` — Vercel team slug

Unchanged packages show `FULL TURBO` on repeat builds.
