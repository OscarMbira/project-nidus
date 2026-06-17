# CI/CD Hosting Setup (v729 Option B)

## Hosting targets (Phase 0.1)

| App | Recommended host | URL pattern | Build output |
|-----|------------------|-------------|--------------|
| **Platform** | Vercel (primary) or Cloudflare Pages | `platform.yourdomain.com` or `/` | `dist/platform/` |
| **Simulator** | Vercel (primary) or Cloudflare Pages | `simulator.yourdomain.com` | `dist/simulator/` |
| **Legacy combined** | Optional fallback | `app.yourdomain.com` | `dist/` via `npm run build:legacy` |

Alternative hosts (Netlify, Azure Static Web Apps) work with the same `dist/platform` and `dist/simulator` artifacts.

## GitHub secrets (Phase 0.6)

Configure in **Settings → Secrets and variables → Actions**:

| Secret | Used by |
|--------|---------|
| `PLATFORM_SUPABASE_URL` | platform.yml, shared.yml |
| `PLATFORM_SUPABASE_ANON_KEY` | platform.yml, shared.yml |
| `SIMULATOR_SUPABASE_URL` | simulator.yml |
| `SIMULATOR_SUPABASE_ANON_KEY` | simulator.yml |
| `PLATFORM_DATABASE_URL` | db-platform.yml |
| `SIMULATOR_DATABASE_URL` | db-simulator.yml |
| `PLATFORM_SUPABASE_PROJECT_ID` | Supabase CLI (optional, same project OK) |
| `SIMULATOR_SUPABASE_PROJECT_ID` | Supabase CLI (optional, same project OK) |
| `VERCEL_TOKEN` | platform.yml, simulator.yml |
| `VERCEL_ORG_ID` | platform.yml, simulator.yml |
| `PLATFORM_VERCEL_PROJECT_ID` | platform.yml |
| `SIMULATOR_VERCEL_PROJECT_ID` | simulator.yml |

## Workflows

| File | Trigger |
|------|---------|
| `.github/workflows/platform.yml` | Platform-only path changes |
| `.github/workflows/simulator.yml` | Simulator-only path changes |
| `.github/workflows/shared.yml` | Shared code changes → rebuild both |
| `.github/workflows/tests.yml` | Every PR — Vitest + menu validation + boundary lint |
| `.github/workflows/db-platform.yml` | Platform + shared migrations |
| `.github/workflows/db-simulator.yml` | Simulator + shared migrations |

## Local verification (Phase 0.7)

```bash
npm ci
npm run build:platform
npm run build:simulator
npm run test -- --run
npm run lint:boundaries
npm run validate:menus
node scripts/audit-v729-completion.mjs
```

Push to `main`/`master` to trigger CI. First run requires secrets for deploy steps; build/test jobs run without deploy secrets.
