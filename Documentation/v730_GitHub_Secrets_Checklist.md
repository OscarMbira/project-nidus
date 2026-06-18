# v730 Monorepo — GitHub Actions Secrets Checklist

Configure at: **GitHub → Repository → Settings → Secrets and variables → Actions**

## Required for CI builds

| Secret | Used by | Notes |
|--------|---------|-------|
| `PLATFORM_SUPABASE_URL` | platform.yml | Same URL as local `.env` during single-project phase |
| `PLATFORM_SUPABASE_ANON_KEY` | platform.yml | Supabase anon key |
| `SIMULATOR_SUPABASE_URL` | simulator.yml | Same as platform until DB split |
| `SIMULATOR_SUPABASE_ANON_KEY` | simulator.yml | Same as platform until DB split |

## Required for Vercel deploy (push to main/master)

| Secret | Used by |
|--------|---------|
| `VERCEL_TOKEN` | platform.yml, simulator.yml |
| `VERCEL_ORG_ID` | platform.yml, simulator.yml |
| `PLATFORM_VERCEL_PROJECT_ID` | platform.yml |
| `SIMULATOR_VERCEL_PROJECT_ID` | simulator.yml |

## Optional — Turborepo remote cache (faster CI)

| Secret | Used by |
|--------|---------|
| `TURBO_TOKEN` | platform.yml, simulator.yml |
| `TURBO_TEAM` | platform.yml, simulator.yml |

Create token at [vercel.com/account/tokens](https://vercel.com/account/tokens) (Turborepo remote cache uses Vercel).

## Database workflows (existing)

| Secret | Used by |
|--------|---------|
| `PLATFORM_DATABASE_URL` | db-platform.yml |
| `SIMULATOR_DATABASE_URL` | db-simulator.yml |

## Verify locally before pushing

```bash
pnpm install
pnpm turbo build --filter=@nidus/platform-app
pnpm turbo build --filter=@nidus/simulator-app
pnpm dev:platform    # http://localhost:5173
pnpm dev:simulator   # http://localhost:5174
```

## Install GitHub CLI (optional)

```bash
winget install GitHub.cli
gh auth login
gh secret list
```

Do **not** commit secret values to the repository.
