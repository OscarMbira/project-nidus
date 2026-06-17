# v730 — Option A: Turborepo Monorepo Migration
## Full Architectural Separation with Shared Package Layer

**Goal:** Migrate the single-package app into a Turborepo monorepo with independent
apps (`apps/platform`, `apps/simulator`) and explicit shared packages
(`packages/shared`, `packages/ui`, `packages/supabase`).

**Prerequisite:** v729 (Option B) must be COMPLETE. Option A builds directly on the
route decomposition and CI/CD foundation from v729. Do NOT start this plan without
a green v729 implementation.

**Why monorepo and not 2 separate repos:** ~60–70% of code is shared (UI, utils,
contexts, domain forms, hooks, services). Two repos would require copy-pasting
shared code, leading to divergence and double maintenance. A monorepo keeps shared
code in one place while giving each app full deployment independence.

---

## Todo List

### Phase 0 — Monorepo Foundation (Turborepo + pnpm)
- [ ] 0.1 Install pnpm globally: `npm install -g pnpm`
- [ ] 0.2 Convert project to pnpm workspaces — create `pnpm-workspace.yaml`
- [ ] 0.3 Install Turborepo: `pnpm add -D turbo -w`
- [ ] 0.4 Create `turbo.json` — define build, dev, test, lint pipeline with caching
- [ ] 0.5 Create root `package.json` — workspace root (no app code, just tooling)
- [ ] 0.6 Create `packages/` directory structure (shared, ui, supabase, config)
- [ ] 0.7 Create `apps/` directory structure (platform, simulator)
- [ ] 0.8 Verify `pnpm install` succeeds at workspace root
- [ ] 0.9 Verify `pnpm turbo build` runs without errors (even if empty)

### Phase 1 — Extract Shared Packages
- [ ] 1.1 Create `packages/supabase/` — Supabase clients + types
- [ ] 1.2 Move `src/services/supabase/supabaseClient.js` → `packages/supabase/src/index.js`
- [ ] 1.3 Move `src/services/supabase/platformRestSelect.js` → `packages/supabase/src/`
- [ ] 1.4 Create `packages/supabase/package.json` — named `@nidus/supabase`
- [ ] 1.5 Create `packages/ui/` — shared UI component library
- [ ] 1.6 Move `src/components/ui/` → `packages/ui/src/`
- [ ] 1.7 Create `packages/ui/package.json` — named `@nidus/ui`
- [ ] 1.8 Create `packages/shared/` — utils, hooks, contexts, constants
- [ ] 1.9 Move `src/utils/` → `packages/shared/src/utils/`
- [ ] 1.10 Move `src/hooks/` → `packages/shared/src/hooks/`
- [ ] 1.11 Move `src/context/` → `packages/shared/src/context/`
- [ ] 1.12 Move `src/constants/` → `packages/shared/src/constants/`
- [ ] 1.13 Create `packages/shared/package.json` — named `@nidus/shared`
- [ ] 1.14 Create `packages/config/` — menu registries, methodology configs
- [ ] 1.15 Move `src/config/` → `packages/config/src/`
- [ ] 1.16 Create `packages/config/package.json` — named `@nidus/config`
- [ ] 1.17 Update all internal imports across the codebase to use `@nidus/*` package names
- [ ] 1.18 Run full test suite — confirm no regressions from import changes

### Phase 2 — Create Independent Apps
- [ ] 2.1 Create `apps/platform/` directory
- [ ] 2.2 Create `apps/platform/package.json` — depends on `@nidus/shared`, `@nidus/ui`, `@nidus/supabase`
- [ ] 2.3 Create `apps/platform/vite.config.js` — Platform-specific build
- [ ] 2.4 Create `apps/platform/index.html` — Platform app shell
- [ ] 2.5 Create `apps/platform/src/main.jsx` — Platform entry point
- [ ] 2.6 Create `apps/platform/src/App.jsx` — Platform router (imports platformRoutes only)
- [ ] 2.7 Move Platform pages: `src/pages/platform-app/**` → `apps/platform/src/pages/`
- [ ] 2.8 Move Platform pages: `src/pages/app/**` → `apps/platform/src/pages/app/`
- [ ] 2.9 Move Platform components: `src/components/app/**` → `apps/platform/src/components/`
- [ ] 2.10 Move Platform modules: `src/modules/platform/**` → `apps/platform/src/modules/`
- [ ] 2.11 Move Platform routes: `src/routes/platformRoutes.jsx` → `apps/platform/src/routes/`
- [ ] 2.12 Move Platform services (non-sim): `src/services/[domain]/**` → `apps/platform/src/services/`
- [ ] 2.13 Move domain components shared but Platform-primary: confirm before moving
- [ ] 2.14 Verify `pnpm --filter platform build` succeeds
- [ ] 2.15 Verify Platform app loads and all routes work in browser
- [ ] 2.16 Create `apps/simulator/` directory
- [ ] 2.17 Create `apps/simulator/package.json` — depends on `@nidus/shared`, `@nidus/ui`, `@nidus/supabase`
- [ ] 2.18 Create `apps/simulator/vite.config.js` — Simulator-specific build
- [ ] 2.19 Create `apps/simulator/index.html` — Simulator app shell
- [ ] 2.20 Create `apps/simulator/src/main.jsx` — Simulator entry point
- [ ] 2.21 Create `apps/simulator/src/App.jsx` — Simulator router (imports simulatorRoutes only)
- [ ] 2.22 Move Simulator pages: `src/pages/simulator/**` → `apps/simulator/src/pages/`
- [ ] 2.23 Move Simulator pages: `src/pages/sim/**` → `apps/simulator/src/pages/sim/`
- [ ] 2.24 Move Simulator components: `src/components/sim/**` → `apps/simulator/src/components/`
- [ ] 2.25 Move Simulator modules: `src/modules/sim/**` → `apps/simulator/src/modules/`
- [ ] 2.26 Move Simulator routes: `src/routes/simulatorRoutes.jsx` → `apps/simulator/src/routes/`
- [ ] 2.27 Move Simulator services: `src/services/sim/**` → `apps/simulator/src/services/`
- [ ] 2.28 Verify `pnpm --filter simulator build` succeeds
- [ ] 2.29 Verify Simulator app loads and all routes work in browser
- [ ] 2.30 Delete the now-empty `src/` root once both apps are fully migrated

### Phase 3 — Kill Duplication, Not Just Move It
- [ ] 3.1 Audit domain components still duplicated (RiskForm, QualityForm, etc. in both apps)
- [ ] 3.2 Move truly shared domain components → `packages/shared/src/components/domain/`
- [ ] 3.3 Audit shared services (communications, reports) — move to `packages/shared/src/services/`
- [ ] 3.4 Add `@nidus/eslint-config` package — shared ESLint rules enforcing boundary imports
- [ ] 3.5 Configure boundary rule: `apps/platform` cannot import from `apps/simulator`
- [ ] 3.6 Configure boundary rule: `apps/simulator` cannot import from `apps/platform`
- [ ] 3.7 Configure boundary rule: `packages/*` cannot import from `apps/*`
- [ ] 3.8 Run `pnpm lint` across workspace — fix all violations
- [ ] 3.9 Set up Turborepo remote cache (Vercel Remote Cache or self-hosted)
- [ ] 3.10 Verify cache hit rate: unchanged packages should show `FULL TURBO` on re-run
- [ ] 3.11 Document package ownership in `Documentation/Package_Ownership.md`

### Phase 4 — Database & Backend Deploy Independence
- [ ] 4.1 Evaluate: keep one Supabase project (two schemas) vs two Supabase projects
- [ ] 4.2 Decision gate: if traffic and billing separation needed → two Supabase projects
- [ ] 4.3 If two projects: create `supabase-platform/` and `supabase-simulator/` config dirs
- [ ] 4.4 If two projects: migrate `public` schema tables → `supabase-platform/`
- [ ] 4.5 If two projects: migrate `sim` schema tables → `supabase-simulator/`
- [ ] 4.6 Create separate Supabase Edge Functions per domain:
  - `supabase-platform/functions/` — Platform-only functions
  - `supabase-simulator/functions/` — Simulator-only functions
- [ ] 4.7 Update `packages/supabase/src/index.js` — environment-aware client factory
- [ ] 4.8 Update CI/CD pipelines:
  - Platform pipeline deploys to Platform Supabase project
  - Simulator pipeline deploys to Simulator Supabase project
- [ ] 4.9 Update `apps/platform/.env` and `apps/simulator/.env` with separate project URLs
- [ ] 4.10 Create migration scripts for any data that needs to move between schemas/projects
- [ ] 4.11 Run Supabase RLS policy audit — confirm policies still correct per app
- [ ] 4.12 Update `Documentation/DB_Rollback_Guide.md` with per-project rollback steps

---

## Monorepo Structure (Final State)

```
E:\Project Nidus\                        ← git root (single repo)
├── turbo.json                           ← Turborepo pipeline config
├── pnpm-workspace.yaml                  ← Workspace definition
├── package.json                         ← Root (tooling only, no app code)
│
├── apps/
│   ├── platform/                        ← Deployable: platform.nidus.com
│   │   ├── package.json                 ← { "name": "@nidus/platform-app" }
│   │   ├── vite.config.js
│   │   ├── index.html
│   │   ├── .env                         ← VITE_SUPABASE_URL for platform project
│   │   └── src/
│   │       ├── main.jsx
│   │       ├── App.jsx                  ← Platform router only
│   │       ├── pages/                   ← ex src/pages/platform-app/ + src/pages/app/
│   │       ├── components/              ← ex src/components/app/
│   │       ├── modules/                 ← ex src/modules/platform/
│   │       ├── routes/
│   │       │   └── platformRoutes.jsx
│   │       └── services/               ← Platform-only services
│   │
│   └── simulator/                       ← Deployable: simulator.nidus.com
│       ├── package.json                 ← { "name": "@nidus/simulator-app" }
│       ├── vite.config.js
│       ├── index.html
│       ├── .env                         ← VITE_SUPABASE_URL for simulator project
│       └── src/
│           ├── main.jsx
│           ├── App.jsx                  ← Simulator router only
│           ├── pages/                   ← ex src/pages/simulator/ + src/pages/sim/
│           ├── components/              ← ex src/components/sim/
│           ├── modules/                 ← ex src/modules/sim/
│           ├── routes/
│           │   └── simulatorRoutes.jsx
│           └── services/               ← ex src/services/sim/
│
├── packages/
│   ├── supabase/                        ← @nidus/supabase
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.js                 ← exports: platformDb, simDb
│   │       └── platformRestSelect.js
│   │
│   ├── ui/                              ← @nidus/ui
│   │   ├── package.json
│   │   └── src/                        ← ex src/components/ui/
│   │       ├── Button.jsx
│   │       ├── Modal.jsx
│   │       ├── RowNumberBadge.jsx
│   │       └── ...
│   │
│   ├── shared/                          ← @nidus/shared
│   │   ├── package.json
│   │   └── src/
│   │       ├── utils/                   ← ex src/utils/
│   │       ├── hooks/                   ← ex src/hooks/
│   │       ├── context/                 ← ex src/context/
│   │       ├── constants/               ← ex src/constants/
│   │       └── components/
│   │           └── domain/              ← RiskForm, QualityForm, etc. (used by both apps)
│   │
│   └── config/                          ← @nidus/config
│       ├── package.json
│       └── src/                         ← ex src/config/
│           ├── menuRegistry.js
│           ├── pmMenuConfig.js
│           └── ...
│
├── supabase-platform/                   ← Platform Supabase project config
│   ├── config.toml
│   ├── functions/
│   └── migrations/
│
├── supabase-simulator/                  ← Simulator Supabase project config
│   ├── config.toml
│   ├── functions/
│   └── migrations/
│
├── SQL/                                 ← Kept as-is for reference
├── Documentation/
├── projectplan/
└── .github/
    └── workflows/
        ├── platform.yml                 ← Triggers on apps/platform/** + packages/**
        ├── simulator.yml                ← Triggers on apps/simulator/** + packages/**
        ├── tests.yml                    ← Runs on all PRs
        ├── db-platform.yml
        └── db-simulator.yml
```

---

## Key Configuration Files

### `turbo.json`
```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "outputs": []
    },
    "type-check": {
      "dependsOn": ["^build"]
    }
  },
  "globalEnv": [
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_ANON_KEY"
  ]
}
```

### `pnpm-workspace.yaml`
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### Root `package.json`
```json
{
  "name": "project-nidus-workspace",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "dev:platform": "turbo dev --filter=@nidus/platform-app",
    "dev:simulator": "turbo dev --filter=@nidus/simulator-app",
    "build": "turbo build",
    "build:platform": "turbo build --filter=@nidus/platform-app",
    "build:simulator": "turbo build --filter=@nidus/simulator-app",
    "test": "turbo test",
    "lint": "turbo lint",
    "clean": "turbo clean"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  },
  "packageManager": "pnpm@9.0.0"
}
```

### `packages/supabase/package.json`
```json
{
  "name": "@nidus/supabase",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.js",
  "exports": {
    ".": "./src/index.js"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.78.0"
  }
}
```

### `packages/ui/package.json`
```json
{
  "name": "@nidus/ui",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.js",
  "exports": {
    ".": "./src/index.js",
    "./*": "./src/*.jsx"
  },
  "peerDependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  }
}
```

### `apps/platform/package.json`
```json
{
  "name": "@nidus/platform-app",
  "private": true,
  "version": "0.0.1",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest",
    "lint": "eslint src/"
  },
  "dependencies": {
    "@nidus/shared": "workspace:*",
    "@nidus/ui": "workspace:*",
    "@nidus/supabase": "workspace:*",
    "@nidus/config": "workspace:*",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.30.2"
  }
}
```

---

## Turborepo Build Cache Behaviour

```
Scenario 1: Developer fixes a Simulator-only bug
──────────────────────────────────────────────────
apps/simulator/src/pages/simulator/FixedPage.jsx  CHANGED

turbo build result:
  @nidus/supabase    → CACHED  (no change)
  @nidus/ui          → CACHED  (no change)
  @nidus/shared      → CACHED  (no change)
  @nidus/config      → CACHED  (no change)
  @nidus/platform-app → CACHED (no change)  ← Platform NOT rebuilt
  @nidus/simulator-app → REBUILT in ~45s    ← Only Simulator rebuilt


Scenario 2: Developer updates shared Button component
──────────────────────────────────────────────────────
packages/ui/src/Button.jsx  CHANGED

turbo build result:
  @nidus/supabase    → CACHED
  @nidus/ui          → REBUILT  (changed)
  @nidus/shared      → CACHED
  @nidus/config      → CACHED
  @nidus/platform-app → REBUILT (depends on @nidus/ui)
  @nidus/simulator-app → REBUILT (depends on @nidus/ui)
  ← Both apps rebuild correctly because shared code changed


Scenario 3: Developer runs same build again (nothing changed)
──────────────────────────────────────────────────────────────
turbo build result:
  ALL packages → FULL TURBO (0s build time)  ← Cache hit
```

---

## Import Convention After Migration

### Before (current monolith)
```js
import { Button } from '../../components/ui/Button'
import { formatCurrency } from '../../utils/formatCurrency'
import { platformDb } from '../../services/supabase/supabaseClient'
import { useMenu } from '../../hooks/useMenu'
```

### After (monorepo)
```js
import { Button } from '@nidus/ui'
import { formatCurrency } from '@nidus/shared/utils/formatCurrency'
import { platformDb } from '@nidus/supabase'
import { useMenu } from '@nidus/shared/hooks/useMenu'
```

Clean, explicit, enforced by ESLint package boundaries.

---

## CI/CD Pipelines (Updated for Monorepo)

### `.github/workflows/platform.yml`
```yaml
name: Platform — Build & Deploy

on:
  push:
    branches: [master]
    paths:
      - 'apps/platform/**'
      - 'packages/**'           # Shared code change rebuilds all apps

jobs:
  build-platform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo build --filter=@nidus/platform-app
        env:
          VITE_SUPABASE_URL: ${{ secrets.PLATFORM_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.PLATFORM_SUPABASE_ANON_KEY }}
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}     # Remote cache
          TURBO_TEAM: ${{ secrets.TURBO_TEAM }}
      - name: Deploy Platform to Vercel
        run: pnpm vercel --prod
        working-directory: apps/platform
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          VERCEL_PROJECT_ID: ${{ secrets.PLATFORM_VERCEL_PROJECT_ID }}
```

### `.github/workflows/simulator.yml`
```yaml
name: Simulator — Build & Deploy

on:
  push:
    branches: [master]
    paths:
      - 'apps/simulator/**'
      - 'packages/**'

jobs:
  build-simulator:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo build --filter=@nidus/simulator-app
        env:
          VITE_SUPABASE_URL: ${{ secrets.SIMULATOR_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.SIMULATOR_SUPABASE_ANON_KEY }}
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: ${{ secrets.TURBO_TEAM }}
      - name: Deploy Simulator to Vercel
        run: pnpm vercel --prod
        working-directory: apps/simulator
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          VERCEL_PROJECT_ID: ${{ secrets.SIMULATOR_VERCEL_PROJECT_ID }}
```

---

## Database Architecture Decision Matrix

| Factor | Keep Single Supabase Project | Two Supabase Projects |
|--------|------------------------------|----------------------|
| Currently in development | ✅ Simpler | ❌ Overhead |
| Shared auth (same user logs into both) | ✅ Works natively | ⚠️ Needs JWT sharing |
| Independent billing per product | ❌ Not possible | ✅ Yes |
| Independent scaling | ❌ Not possible | ✅ Yes |
| Data isolation (security) | ⚠️ Schema-level only | ✅ Full project isolation |
| **Recommendation** | **During development** | **Post-launch** |

**Decision:** Keep one Supabase project during development (two schemas: `public` + `sim`).
Plan migration to two projects as a post-launch Phase 4 task.

---

## Migration Sequence (Safe Order)

```
Week 1:  Phase 0 — Turborepo foundation, pnpm workspace, turbo.json
Week 2:  Phase 1 — Extract packages/supabase, packages/ui
Week 3:  Phase 1 — Extract packages/shared (utils, hooks, context)
Week 4:  Phase 1 — Extract packages/config; update all imports
Week 5:  Phase 2 — Create apps/platform, migrate Platform pages/components
Week 6:  Phase 2 — Create apps/simulator, migrate Simulator pages/components
Week 7:  Phase 2 — Verify both apps build independently; delete old src/
Week 8:  Phase 3 — ESLint boundaries, kill remaining duplication
Week 9:  Phase 3 — Turborepo remote cache, verify FULL TURBO behaviour
Week 10: Phase 4 — DB strategy decision, migration folder reorganisation
```

---

## File Impact Summary

| Scope | Action | Count |
|-------|--------|-------|
| Root config files | CREATE | 3 (turbo.json, pnpm-workspace.yaml, updated package.json) |
| packages/* | CREATE (new package dirs) | 4 packages |
| apps/platform/* | CREATE + MOVE from src/ | ~200 files moved |
| apps/simulator/* | CREATE + MOVE from src/ | ~450 files moved |
| Import statements | UPDATE (@ aliases → @nidus/*) | ~1000+ import lines |
| CI/CD workflows | CREATE/UPDATE | 5 workflow files |
| ESLint config | UPDATE | 1 file |
| src/ (root) | DELETE (after migration) | Entire directory |

**This is a large migration — execute in weekly increments, never all at once.**

---

## Success Criteria

- [ ] `pnpm turbo build` builds all packages and apps from clean state
- [ ] `pnpm turbo build` shows `FULL TURBO` on second run (cache works)
- [ ] `pnpm turbo build --filter=@nidus/platform-app` builds Platform only
- [ ] `pnpm turbo build --filter=@nidus/simulator-app` builds Simulator only
- [ ] Changing `apps/simulator/**` does NOT rebuild `apps/platform` in CI
- [ ] Changing `packages/ui/**` rebuilds BOTH apps in CI
- [ ] ESLint reports zero cross-boundary import violations
- [ ] All tests pass across workspace: `pnpm turbo test`
- [ ] Both apps deployed independently to their respective URLs
- [ ] No duplicated code between `apps/platform` and `apps/simulator` (only in `packages/shared`)

---

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| ~1000 import paths need updating | High | Run codemod script; verify with TypeScript/ESLint |
| Circular package dependencies | Medium | Enforce: packages never import from apps |
| Supabase auth shared between two projects | Low (deferred) | JWT sharing via JWKS; defer to post-launch |
| Developer confusion during migration | Medium | Freeze features during migration week; pair on first PR |
| pnpm hoisting breaks existing deps | Low | Use `shamefully-hoist=true` in `.npmrc` as fallback |
| PWA manifests conflict | Low | Separate scope per app in manifest.json |
| Turborepo cache stale on env var change | Low | Add env vars to `globalEnv` in turbo.json |

---

## Review Section
*(To be completed after implementation)*

- Changes made:
- Tests run:
- Issues encountered:
- Time taken:
- Remaining migration items:
