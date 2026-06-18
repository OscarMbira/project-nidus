# Module Rollback Runbook (v731)

## When to roll back

- A module deploy introduced a runtime error (white screen, ModuleErrorBoundary shown)
- Version compatibility check fails on shell startup
- CDN asset corruption or bad build artifact

## Rollback procedure (< 60 seconds)

### Option 1 — GitHub secret (recommended for production)

1. Open **GitHub → Settings → Secrets → Actions**
2. Find the module secret, e.g. `MODULE_PLANNING_HUB_URL`
3. Change value from current version to previous:
   - From: `https://cdn.nidus.com/modules/planning-hub/v1.1.0`
   - To: `https://cdn.nidus.com/modules/planning-hub/v1.0.0`
4. Redeploy shell **or** use runtime env injection if configured

### Option 2 — Vercel env var (instant)

```bash
vercel env set VITE_MODULE_PLANNING_HUB_URL https://cdn.nidus.com/modules/planning-hub/v1.0.0 production
vercel --prod
```

### Option 3 — Local / staging

Update `.env.production.local`:

```env
VITE_MODULE_PLANNING_HUB_URL=https://cdn.nidus.com/modules/planning-hub/v1.0.0
```

Restart dev server or rebuild shell.

## Verification

1. Open browser DevTools → Network → filter `remoteEntry.js`
2. Confirm URL points to rolled-back version path
3. Navigate to module routes (e.g. `/platform/pm/planning`)
4. Check `sessionStorage` key `nidus_module_load_telemetry` for load source

## What is NOT affected

- Other modules continue loading their own `remoteEntry.js` URLs
- Shell code unchanged (no redeploy required if using runtime URL config)
- Database and Supabase data unchanged

## Post-incident

1. Fix bug in module package under `packages/modules/<name>/`
2. Bump semver in `package.json`
3. Push to `master` — module CI deploys new version to CDN
4. Update secret to new version when verified

## Module version secrets reference

| Secret | Env var |
|--------|---------|
| MODULE_PLANNING_HUB_URL | VITE_MODULE_PLANNING_HUB_URL |
| MODULE_RISK_URL | VITE_MODULE_RISK_URL |
| MODULE_QUALITY_URL | VITE_MODULE_QUALITY_URL |
| (see Module_Federation_Dev_Guide.md for full list) | |

See also: `cdn/modules/README.md`, `Documentation/v730_GitHub_Secrets_Checklist.md`
