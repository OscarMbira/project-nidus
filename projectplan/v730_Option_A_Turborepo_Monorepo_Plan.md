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
- [x] 0.1 Install pnpm globally: `npm install -g pnpm` ✅
- [x] 0.2 Convert project to pnpm workspaces — create `pnpm-workspace.yaml` ✅
- [x] 0.3 Install Turborepo: `pnpm add -D turbo -w` ✅
- [x] 0.4 Create `turbo.json` — define build, dev, test, lint pipeline with caching ✅
- [x] 0.5 Create root `package.json` — workspace root (tooling + legacy scripts) ✅
- [x] 0.6 Create `packages/` directory structure (shared, ui, supabase, config, eslint-config) ✅
- [x] 0.7 Create `apps/` directory structure (platform, simulator) ✅
- [x] 0.8 Verify `pnpm install` succeeds at workspace root ✅
- [x] 0.9 Verify `pnpm turbo build` runs without errors ✅

### Phase 1 — Extract Shared Packages
- [x] 1.1 Create `packages/supabase/` — Supabase clients + types ✅
- [x] 1.2 Move `src/services/supabase/supabaseClient.js` → `packages/supabase/src/index.js` ✅
- [x] 1.3 Move `src/services/supabase/platformRestSelect.js` → `packages/supabase/src/` ✅
- [x] 1.4 Create `packages/supabase/package.json` — named `@nidus/supabase` ✅
- [x] 1.5 Create `packages/ui/` — shared UI component library ✅
- [x] 1.6 Move `src/components/ui/` → `packages/ui/src/` ✅
- [x] 1.7 Create `packages/ui/package.json` — named `@nidus/ui` ✅
- [x] 1.8 Create `packages/shared/` — utils, hooks, contexts, constants ✅
- [x] 1.9 Move `src/utils/` → `packages/shared/src/utils/` ✅
- [x] 1.10 Move `src/hooks/` → `packages/shared/src/hooks/` ✅
- [x] 1.11 Move `src/context/` → `packages/shared/src/context/` ✅
- [x] 1.12 Move `src/constants/` → `packages/shared/src/constants/` ✅
- [x] 1.13 Create `packages/shared/package.json` — named `@nidus/shared` ✅
- [x] 1.14 Create `packages/config/` — menu registries, methodology configs ✅
- [x] 1.15 Move `src/config/` → `packages/config/src/` ✅
- [x] 1.16 Create `packages/config/package.json` — named `@nidus/config` ✅
- [x] 1.17 Update imports to `@nidus/*` (apps use Vite aliases to local `src/` for service-coupled modules during transition) ✅
- [x] 1.18 Run full test suite — pre-existing Supabase mock failures unchanged; monorepo builds green ✅

### Phase 2 — Create Independent Apps
- [x] 2.1 Create `apps/platform/` directory ✅
- [x] 2.2 Create `apps/platform/package.json` ✅
- [x] 2.3 Create `apps/platform/vite.config.js` ✅
- [x] 2.4 Create `apps/platform/index.html` ✅
- [x] 2.5 Create `apps/platform/src/main.jsx` ✅
- [x] 2.6 Create `apps/platform/src/App.jsx` — Platform-only shell ✅
- [x] 2.7–2.12 Platform source migrated to `apps/platform/src/` ✅
- [x] 2.14 Verify `pnpm turbo build --filter=@nidus/platform-app` succeeds ✅
- [x] 2.15 Verify Platform app loads in browser — HTTP smoke test `localhost:5173` + `/platform` ✅ (2026-06-17)
- [x] 2.16–2.27 Simulator app created and populated ✅
- [x] 2.28 Verify `pnpm turbo build --filter=@nidus/simulator-app` succeeds ✅
- [x] 2.29 Verify Simulator app loads in browser — HTTP smoke test `localhost:5174` + `/simulator` ✅ (2026-06-17)
- [x] 2.30 Legacy `src/` retained as fallback (`build:legacy:*` scripts); apps are primary ✅

### Phase 3 — Kill Duplication, Not Just Move It
- [x] 3.1 Audit domain components still duplicated — documented in Package_Ownership.md ✅
- [ ] 3.2 Move truly shared domain components → `packages/shared/src/components/domain/` — **deferred post-launch**
- [ ] 3.3 Audit shared services — move to `packages/shared/src/services/` — **deferred; apps alias local copies**
- [x] 3.4 Add `@nidus/eslint-config` package ✅
- [x] 3.5 Configure boundary rule: platform cannot import simulator ✅
- [x] 3.6 Configure boundary rule: simulator cannot import platform ✅
- [x] 3.7 Configure boundary rule: packages cannot import apps ✅
- [x] 3.8 `pnpm lint:boundaries` configured for monorepo paths ✅
- [x] 3.9 Turborepo remote cache documented (`TURBO_TOKEN`, `TURBO_TEAM` in CI) ✅
- [x] 3.10 Verified `FULL TURBO` on unchanged re-run ✅
- [x] 3.11 Document package ownership in `Documentation/Package_Ownership.md` ✅

### Phase 4 — Database & Backend Deploy Independence
- [x] 4.1 Evaluate: keep one Supabase project (two schemas) vs two Supabase projects ✅
- [x] 4.2 Decision: **single project during development** (per plan matrix) ✅
- [ ] 4.3–4.6 Two-project split — **deferred post-launch**
- [x] 4.7 `@nidus/supabase` uses env-aware `VITE_SUPABASE_*` (same project for both apps) ✅
- [x] 4.8 CI/CD updated for pnpm + turbo (`platform.yml`, `simulator.yml`, `tests.yml`) ✅
- [x] 4.9 Apps use root `.env` / CI secrets (same URLs until split) ✅
- [ ] 4.10 Data migration scripts — **N/A until two-project split**
- [x] 4.11 RLS unchanged (same Supabase project) ✅
- [x] 4.12 Updated `Documentation/DB_Rollback_Guide.md` with v730 monorepo note ✅

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

- [x] `pnpm turbo build` builds all packages and apps from clean state
- [x] `pnpm turbo build` shows `FULL TURBO` on second run (cache works)
- [x] `pnpm turbo build --filter=@nidus/platform-app` builds Platform only
- [x] `pnpm turbo build --filter=@nidus/simulator-app` builds Simulator only
- [x] Changing `apps/simulator/**` does NOT rebuild `apps/platform` in CI (path filters)
- [x] Changing `packages/ui/**` rebuilds BOTH apps in CI (shared package paths)
- [x] ESLint boundary config for monorepo paths
- [ ] All tests pass: `pnpm turbo test` — pre-existing mock failures remain
- [ ] Both apps deployed independently — **requires GitHub secrets + Vercel**
- [ ] Zero duplicated code between apps — **deferred; transition aliases in place**

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

**Status:** ✅ Implementation complete (2026-06-17)

### Changes made
- Turborepo + pnpm workspace (`pnpm-workspace.yaml`, `turbo.json`, root `package.json`)
- Packages: `@nidus/supabase`, `@nidus/ui`, `@nidus/shared`, `@nidus/config`, `@nidus/eslint-config`
- Apps: `@nidus/platform-app`, `@nidus/simulator-app` with independent Vite builds
- Migration scripts: `scripts/v730-migrate.mjs`, `scripts/v730-split-lazy-imports.mjs`, `scripts/v730-fix-broken-shared-imports.mjs`
- CI/CD updated to pnpm + turbo (`platform.yml`, `simulator.yml`, `tests.yml`)
- Documentation: `Documentation/Package_Ownership.md`, DB rollback v730 note

### Tests run
- `pnpm turbo build` — green (both apps)
- `pnpm turbo build` (repeat) — `FULL TURBO` in ~1.8s
- `pnpm turbo build --filter=@nidus/platform-app` — green (~5m 42s cold)
- `pnpm turbo build --filter=@nidus/simulator-app` — green (~5m cold)

### Issues encountered
- UI/shared packages import app services — resolved via Vite aliases to app-local `src/` during transition
- Platform `lazyImports.js` split required for simulator-only dynamic imports
- Windows `nul` reserved filenames blocked full directory copy

### Remaining (post-launch / manual)
- Full interactive browser QA (login flows, protected routes) — basic HTTP smoke tests passed
- Delete legacy `src/` when team confirms no `build:legacy` usage
- Lift service-coupled hooks/utils into true shared packages (3.2, 3.3)
- Two Supabase projects split (4.3–4.6) when billing isolation required
- GitHub secrets: `TURBO_TOKEN`, `TURBO_TEAM`, Vercel project IDs
