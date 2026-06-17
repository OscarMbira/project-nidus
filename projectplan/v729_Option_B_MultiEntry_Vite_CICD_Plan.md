# v729 — Option B: Multi-Entry Vite + CI/CD Foundation
## Independent Deployments Without Splitting the Repo

**Goal:** Give Platform and Simulator independent build pipelines and deployments
while keeping a single repository and zero file moves.

**Prerequisite:** None. This plan works on the current codebase as-is.

**Leads into:** v730 (Option A — Turborepo monorepo), which this plan's work feeds directly.

---

## Todo List

### Phase 0 — CI/CD Foundation
- [ ] 0.1 Choose hosting targets (Vercel / Netlify / Cloudflare Pages) for each app
- [ ] 0.2 Create `.github/workflows/platform.yml` — path-filtered build + deploy
- [ ] 0.3 Create `.github/workflows/simulator.yml` — path-filtered build + deploy
- [ ] 0.4 Create `.github/workflows/shared.yml` — triggered when shared code changes (rebuilds both)
- [ ] 0.5 Create `.github/workflows/tests.yml` — runs Vitest on every PR
- [ ] 0.6 Add environment secrets to GitHub repo (SUPABASE_URL, SUPABASE_KEY per app)
- [ ] 0.7 Verify pipeline runs green on a dry push

### Phase 1 — Decompose the Monolith Router
- [ ] 1.1 Audit App.jsx — record current size and all route groups
- [ ] 1.2 Create `src/routes/platformRoutes.jsx` — extract all `/app/*`, `/platform-app/*` routes
- [ ] 1.3 Create `src/routes/simulatorRoutes.jsx` — extract all `/simulator/*`, `/sim/*` routes
- [ ] 1.4 Create `src/routes/authRoutes.jsx` — extract all auth/onboarding routes (shared)
- [ ] 1.5 Create `src/routes/publicRoutes.jsx` — extract homepage, pricing, docs routes
- [ ] 1.6 Reduce App.jsx to a thin orchestrator that imports and composes route files
- [ ] 1.7 Verify App.jsx drops below 150 KB after extraction
- [ ] 1.8 Run full test suite — confirm no regressions

### Phase 2 — Two Vite Entry Points (Independent Builds)
- [ ] 2.1 Create `platform/index.html` — Platform app shell (links to Platform entry)
- [ ] 2.2 Create `simulator/index.html` — Simulator app shell (links to Simulator entry)
- [ ] 2.3 Create `src/platform-main.jsx` — Platform-only entry (mounts PlatformApp)
- [ ] 2.4 Create `src/simulator-main.jsx` — Simulator-only entry (mounts SimulatorApp)
- [ ] 2.5 Create `src/PlatformApp.jsx` — wraps platform routes + providers
- [ ] 2.6 Create `src/SimulatorApp.jsx` — wraps simulator routes + providers
- [ ] 2.7 Create `vite.platform.config.js` — Platform build config (entry: platform/index.html, outDir: dist/platform)
- [ ] 2.8 Create `vite.simulator.config.js` — Simulator build config (entry: simulator/index.html, outDir: dist/simulator)
- [ ] 2.9 Add PWA manifests per app (`platform/manifest.json`, `simulator/manifest.json`)
- [ ] 2.10 Update `package.json` scripts:
  - `build:platform` → vite build --config vite.platform.config.js
  - `build:simulator` → vite build --config vite.simulator.config.js
  - `build:all` → runs both in sequence
  - `dev:platform` → vite --config vite.platform.config.js
  - `dev:simulator` → vite --config vite.simulator.config.js
- [ ] 2.11 Test Platform build independently: `npm run build:platform`
- [ ] 2.12 Test Simulator build independently: `npm run build:simulator`
- [ ] 2.13 Verify both dist outputs are correct and self-contained

### Phase 3 — Kill Duplication (Boundary Enforcement)
- [ ] 3.1 Audit imports — find any Platform page importing from Simulator-only code and vice versa
- [ ] 3.2 Create `src/shared/` folder — explicitly label code that is shared
- [ ] 3.3 Move shared UI components to `src/shared/components/ui/`
- [ ] 3.4 Move shared utils to `src/shared/utils/`
- [ ] 3.5 Move shared contexts to `src/shared/context/`
- [ ] 3.6 Move shared hooks to `src/shared/hooks/`
- [ ] 3.7 Add ESLint `no-restricted-imports` rule — Platform cannot import from `pages/simulator/**`
- [ ] 3.8 Add ESLint `no-restricted-imports` rule — Simulator cannot import from `pages/platform-app/**`
- [ ] 3.9 Run `npm run lint` and fix all violations
- [ ] 3.10 Document the shared boundary in `Documentation/Architecture_Boundaries.md`

### Phase 4 — Database & Backend Deploy Independence
- [ ] 4.1 Audit Supabase Edge Functions — which serve Platform only, Simulator only, or both
- [ ] 4.2 Rename edge functions with prefix: `platform-*` or `simulator-*` or `shared-*`
- [ ] 4.3 Create `supabase/migrations/platform/` folder — Platform-specific migrations
- [ ] 4.4 Create `supabase/migrations/simulator/` folder — Simulator-specific migrations
- [ ] 4.5 Add separate deploy steps in CI/CD for Supabase migrations per domain
- [ ] 4.6 Create `.github/workflows/db-platform.yml` — applies Platform migrations on merge to main
- [ ] 4.7 Create `.github/workflows/db-simulator.yml` — applies Simulator migrations on merge to main
- [ ] 4.8 Add `SUPABASE_PROJECT_ID` as separate secret for each domain (even if same project for now)
- [ ] 4.9 Document rollback procedure for each domain in `Documentation/DB_Rollback_Guide.md`

---

## Detailed Implementation

### Phase 0 — CI/CD Workflow Files

#### `.github/workflows/platform.yml`
```yaml
name: Platform — Build & Deploy

on:
  push:
    branches: [master]
    paths:
      - 'src/pages/app/**'
      - 'src/pages/platform-app/**'
      - 'src/components/app/**'
      - 'src/modules/platform/**'
      - 'src/routes/platformRoutes.jsx'
      - 'src/PlatformApp.jsx'
      - 'platform/**'
      - 'vite.platform.config.js'

  pull_request:
    paths:
      - 'src/pages/app/**'
      - 'src/pages/platform-app/**'
      - 'src/components/app/**'

jobs:
  build-platform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run build:platform
        env:
          VITE_SUPABASE_URL: ${{ secrets.PLATFORM_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.PLATFORM_SUPABASE_ANON_KEY }}
      - name: Deploy to Vercel (Platform)
        run: npx vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_PROJECT_ID: ${{ secrets.PLATFORM_VERCEL_PROJECT_ID }}
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
```

#### `.github/workflows/simulator.yml`
```yaml
name: Simulator — Build & Deploy

on:
  push:
    branches: [master]
    paths:
      - 'src/pages/simulator/**'
      - 'src/pages/sim/**'
      - 'src/components/sim/**'
      - 'src/services/sim/**'
      - 'src/modules/sim/**'
      - 'src/routes/simulatorRoutes.jsx'
      - 'src/SimulatorApp.jsx'
      - 'simulator/**'
      - 'vite.simulator.config.js'

jobs:
  build-simulator:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run build:simulator
        env:
          VITE_SUPABASE_URL: ${{ secrets.SIMULATOR_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.SIMULATOR_SUPABASE_ANON_KEY }}
      - name: Deploy to Vercel (Simulator)
        run: npx vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_PROJECT_ID: ${{ secrets.SIMULATOR_VERCEL_PROJECT_ID }}
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
```

#### `.github/workflows/shared.yml`
```yaml
name: Shared Code Changed — Rebuild Both

on:
  push:
    branches: [master]
    paths:
      - 'src/shared/**'
      - 'src/services/supabase/**'
      - 'src/context/**'
      - 'src/hooks/**'
      - 'src/utils/**'
      - 'src/components/ui/**'

jobs:
  rebuild-all:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run build:all
```

#### `.github/workflows/tests.yml`
```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run test:coverage
```

---

### Phase 1 — Router Decomposition

#### Current state (App.jsx — 444 KB)
```
App.jsx
  └── All routes (public + platform + simulator + auth + admin)
```

#### Target state
```
App.jsx (~50 KB)
  ├── import publicRoutes     from './routes/publicRoutes'
  ├── import authRoutes       from './routes/authRoutes'
  ├── import platformRoutes   from './routes/platformRoutes'
  └── import simulatorRoutes  from './routes/simulatorRoutes'
```

#### `src/routes/platformRoutes.jsx` structure
```jsx
import * as LP from './lazyImports'

const platformRoutes = [
  { path: '/app/dashboard', element: <LP.PMDashboard /> },
  { path: '/app/projects', element: <LP.Projects /> },
  // ... all /app/* and /platform-app/* routes
]

export default platformRoutes
```

#### `src/routes/simulatorRoutes.jsx` structure
```jsx
import * as LP from './lazyImports'

const simulatorRoutes = [
  { path: '/simulator', element: <LP.SimulatorDashboard /> },
  { path: '/simulator/scenarios', element: <LP.ScenarioLibrary /> },
  // ... all /simulator/* and /sim/* routes
]

export default simulatorRoutes
```

---

### Phase 2 — Vite Configuration

#### `vite.platform.config.js`
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  root: 'platform',                    // platform/index.html is the entry
  plugins: [
    react({ jsxRuntime: 'automatic' }),
    nodePolyfills({ include: ['stream'] }),
    VitePWA({
      manifest: 'platform/manifest.json',
      workbox: { /* platform-specific caching */ }
    }),
  ],
  build: {
    outDir: '../dist/platform',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'platform-core': ['./src/pages/platform-app/ProjectsDashboard'],
          // Platform-specific chunks only
        }
      }
    }
  },
  resolve: {
    alias: { '@': '/src' }
  }
})
```

#### `vite.simulator.config.js`
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  root: 'simulator',
  plugins: [
    react({ jsxRuntime: 'automatic' }),
    nodePolyfills({ include: ['stream'] }),
    VitePWA({
      manifest: 'simulator/manifest.json',
      workbox: { /* simulator-specific caching */ }
    }),
  ],
  build: {
    outDir: '../dist/simulator',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'sim-core': ['./src/pages/simulator/SimulatorDashboard'],
          // Simulator-specific chunks only
        }
      }
    }
  },
  resolve: {
    alias: { '@': '/src' }
  }
})
```

#### Updated `package.json` scripts
```json
{
  "scripts": {
    "dev": "vite",
    "dev:platform": "vite --config vite.platform.config.js",
    "dev:simulator": "vite --config vite.simulator.config.js",
    "build": "npm run build:platform && npm run build:simulator",
    "build:platform": "npm run sync:docs && vite build --config vite.platform.config.js",
    "build:simulator": "npm run sync:docs && vite build --config vite.simulator.config.js",
    "build:all": "npm run build:platform && npm run build:simulator",
    "preview:platform": "vite preview --config vite.platform.config.js",
    "preview:simulator": "vite preview --config vite.simulator.config.js"
  }
}
```

---

### Phase 3 — Shared Boundary Enforcement

#### ESLint rules to add to `eslint.config.js`
```js
{
  files: ['src/pages/platform-app/**', 'src/pages/app/**', 'src/components/app/**'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        { group: ['*/pages/simulator/*', '*/pages/sim/*', '*/components/sim/*', '*/services/sim/*'],
          message: 'Platform code must not import Simulator-only modules.' }
      ]
    }]
  }
},
{
  files: ['src/pages/simulator/**', 'src/pages/sim/**', 'src/components/sim/**', 'src/services/sim/**'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        { group: ['*/pages/platform-app/*', '*/pages/app/*', '*/components/app/*'],
          message: 'Simulator code must not import Platform-only modules.' }
      ]
    }]
  }
}
```

---

### Phase 4 — Database Deploy Independence

#### Supabase migration folder structure
```
supabase/
  migrations/
    platform/
      v001_projects_table.sql
      v002_tasks_table.sql
      ...
    simulator/
      v001_scenarios_table.sql
      v002_simulation_runs.sql
      ...
    shared/
      v001_users_table.sql
      v002_countries_table.sql
      ...
```

#### `.github/workflows/db-platform.yml`
```yaml
name: Platform DB Migration

on:
  push:
    branches: [master]
    paths:
      - 'supabase/migrations/platform/**'
      - 'supabase/migrations/shared/**'

jobs:
  migrate-platform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: supabase db push --db-url ${{ secrets.PLATFORM_DATABASE_URL }}
```

---

## File Impact Summary

| File | Action | Risk |
|------|--------|------|
| `.github/workflows/*.yml` | CREATE (4 files) | None — new files |
| `vite.platform.config.js` | CREATE | None — new file |
| `vite.simulator.config.js` | CREATE | None — new file |
| `platform/index.html` | CREATE | None — new file |
| `simulator/index.html` | CREATE | None — new file |
| `src/platform-main.jsx` | CREATE | None — new file |
| `src/simulator-main.jsx` | CREATE | None — new file |
| `src/PlatformApp.jsx` | CREATE | None — new file |
| `src/SimulatorApp.jsx` | CREATE | None — new file |
| `src/routes/platformRoutes.jsx` | CREATE | Low — extracted from App.jsx |
| `src/routes/simulatorRoutes.jsx` | CREATE | Low — extracted from App.jsx |
| `src/routes/authRoutes.jsx` | CREATE | Low — extracted from App.jsx |
| `src/routes/publicRoutes.jsx` | CREATE | Low — extracted from App.jsx |
| `App.jsx` | MODIFY (reduce to orchestrator) | Medium — test thoroughly |
| `package.json` | MODIFY (add scripts) | Low |
| `eslint.config.js` | MODIFY (add rules) | Low |

**Total file moves: ZERO**
**Total files modified: 2 (App.jsx, package.json)**
**Total files created: ~15**

---

## Success Criteria

- [ ] `npm run build:platform` succeeds and produces `dist/platform/`
- [ ] `npm run build:simulator` succeeds and produces `dist/simulator/`
- [ ] Platform deploy does NOT trigger Simulator rebuild when only `/pages/platform-app/**` changes
- [ ] Simulator deploy does NOT trigger Platform rebuild when only `/pages/simulator/**` changes
- [ ] Shared code change triggers both rebuilds
- [ ] All existing tests pass
- [ ] App.jsx is under 150 KB
- [ ] ESLint reports zero cross-domain import violations

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| App.jsx router extraction breaks a route | Smoke-test every major route group after extraction |
| Shared context not available in one build | Ensure both app entry points wrap same providers |
| PWA service worker conflicts between apps | Separate manifest scope per app (`/platform/`, `/simulator/`) |
| Supabase env vars exposed in wrong build | Use build-time env guards; `.env.platform`, `.env.simulator` |

---

## Review Section
*(To be completed after implementation)*

- Changes made:
- Tests run:
- Issues encountered:
- Time taken:
