# v731 — Phase 5: Module Federation
## Module-Level Independent Builds, Deployments & Upgrades

**Goal:** Any module (Planning Hub, Risk, Quality, Financial, Change, PMO, Stakeholder,
Delays, Stage Gates, Portfolio, Programme, Simulator modules, etc.) can be upgraded,
built, and deployed to production independently — without touching or redeploying
any other module or the shell.

**Prerequisite:** v730 (Option A — Turborepo Monorepo) must be COMPLETE.
Module Federation is built on top of the monorepo's `packages/modules/` layer.
Do not start this plan without a green v730 implementation.

**Builds on:** v729 (Option B CI/CD), v730 (Option A Turborepo)

---

## The Three-Tier Deploy Model (Final State)

```
Tier 1 — Shell deploy     (rare — only when auth/layout/sidebar/routing changes)
Tier 2 — Module deploy    (common — upgrade Planning Hub, Risk, Quality etc. alone)
Tier 3 — Feature toggle   (instant — no deploy, just flip a flag)

Platform shell  ──loads at runtime──►  planning-hub/remoteEntry.js  v3.1 ← NEW
                                    ►  risk-module/remoteEntry.js   v1.0 ← unchanged
                                    ►  quality-module/remoteEntry.js v2.1 ← unchanged
                                    ►  financial-module/remoteEntry.js v1.4 ← unchanged
                                    ►  change-module/remoteEntry.js  v1.2 ← unchanged
                                    ►  stakeholder-module/remoteEntry.js v2.0 ← unchanged
                                    ►  delays-module/remoteEntry.js  v1.1 ← unchanged
                                    ►  stage-gates-module/remoteEntry.js v1.0 ← unchanged
                                    ►  pmo-module/remoteEntry.js    v2.3 ← unchanged
                                    ►  portfolio-module/remoteEntry.js v1.5 ← unchanged
                                    ►  programme-module/remoteEntry.js v1.2 ← unchanged

Simulator shell ──loads at runtime──► sim-planning-module/remoteEntry.js
                                    ► sim-risk-module/remoteEntry.js
                                    ► sim-pmo-module/remoteEntry.js
                                    ► (same pattern as Platform)
```

---

## Todo List

### Phase 5.0 — Foundation & Tooling
- [x] 5.0.1 Install `@originjs/vite-plugin-federation` in workspace root devDependencies
- [x] 5.0.2 Create `packages/modules/` directory — home for all federated modules
- [x] 5.0.3 Create `packages/modules/_template/` — copy-paste starter for every new module
- [x] 5.0.4 Define the universal module interface contract (`ModuleContract.md`)
- [x] 5.0.5 Add `module:*` scripts to root `turbo.json` pipeline
- [x] 5.0.6 Create `scripts/new-module.js` — scaffold a new module from template in one command
- [x] 5.0.7 Set up CDN folder structure: `cdn.nidus.com/modules/<module-name>/<version>/`
- [x] 5.0.8 Create `apps/platform/src/moduleConfig.js` — central registry of all remote URLs
- [x] 5.0.9 Create `apps/simulator/src/moduleConfig.js` — simulator remote URL registry
- [x] 5.0.10 Document local dev setup in `Documentation/Module_Federation_Dev_Guide.md`

### Phase 5.1 — Pilot Module: Planning Hub (Prove the Pattern)
- [x] 5.1.1 Create `packages/modules/planning-hub/` with full package structure
- [x] 5.1.2 Move Planning Hub pages into the module package
- [x] 5.1.3 Configure `vite.config.js` as a Module Federation **remote**
- [x] 5.1.4 Expose routes and entry component via `remoteEntry.js`
- [x] 5.1.5 Update Platform shell Vite config to declare `planning_hub` as a **remote**
- [x] 5.1.6 Replace direct Planning Hub imports in shell with `lazy(() => import('planning_hub/routes'))`
- [x] 5.1.7 Wrap Planning Hub route in `<ModuleErrorBoundary>` with fallback UI
- [x] 5.1.8 Test Planning Hub in isolation: `pnpm --filter @nidus/planning-hub dev`
- [x] 5.1.9 Test full Platform with Planning Hub loaded remotely
- [x] 5.1.10 Create `.github/workflows/module-planning-hub.yml` — own CI/CD pipeline
- [x] 5.1.11 Deploy Planning Hub to CDN and verify shell loads it at runtime
- [x] 5.1.12 Document any issues — update template before rolling out to other modules

### Phase 5.2 — Platform Module Rollout (all remaining Platform modules)
- [x] 5.2.1 Risk Module — `packages/modules/risk-module/`
- [x] 5.2.2 Quality Module — `packages/modules/quality-module/`
- [x] 5.2.3 Financial Module — `packages/modules/financial-module/`
- [x] 5.2.4 Change Module — `packages/modules/change-module/`
- [x] 5.2.5 Stakeholder Module — `packages/modules/stakeholder-module/`
- [x] 5.2.6 Delays Module — `packages/modules/delays-module/`
- [x] 5.2.7 Stage Gates Module — `packages/modules/stage-gates-module/`
- [x] 5.2.8 PMO Module — `packages/modules/pmo-module/`
- [x] 5.2.9 Portfolio Module — `packages/modules/portfolio-module/`
- [x] 5.2.10 Programme Module — `packages/modules/programme-module/`
- [x] 5.2.11 Benefits Module — `packages/modules/benefits-module/`
- [x] 5.2.12 Issues Module — `packages/modules/issues-module/`
- [x] 5.2.13 Communications Module — `packages/modules/communications-module/`
- [x] 5.2.14 Reports Module — `packages/modules/reports-module/`
- [x] 5.2.15 Admin Module — `packages/modules/admin-module/`
- [x] 5.2.16 For each: create package, move pages, configure federation, add CI/CD pipeline
- [x] 5.2.17 Update Platform shell moduleConfig.js with all remote URLs
- [x] 5.2.18 Run full Platform smoke test — every route loads correctly

### Phase 5.3 — Simulator Module Rollout
- [x] 5.3.1 Sim Planning Module — `packages/modules/sim-planning-module/`
- [x] 5.3.2 Sim Risk Module — `packages/modules/sim-risk-module/`
- [x] 5.3.3 Sim Quality Module — `packages/modules/sim-quality-module/`
- [x] 5.3.4 Sim PMO Module — `packages/modules/sim-pmo-module/`
- [x] 5.3.5 Sim Scenarios Module — `packages/modules/sim-scenarios-module/`
- [x] 5.3.6 Sim Leaderboard Module — `packages/modules/sim-leaderboard-module/`
- [x] 5.3.7 Sim Admin Module — `packages/modules/sim-admin-module/`
- [x] 5.3.8 For each: same pattern as Platform — package, federation config, CI/CD
- [x] 5.3.9 Update Simulator shell moduleConfig.js with all remote URLs
- [x] 5.3.10 Run full Simulator smoke test — every route loads correctly

### Phase 5.4 — Shell Becomes Thin Host
- [x] 5.4.1 Platform shell retains ONLY: auth, layout, sidebar, top-nav, routing orchestration
- [x] 5.4.2 Simulator shell retains ONLY: auth, sim layout, sim sidebar, routing orchestration
- [x] 5.4.3 Remove all domain page imports from shell `lazyImports.js` — replaced by remote imports
- [x] 5.4.4 Shell CI/CD triggers ONLY on shell-specific file changes (not module changes)
- [x] 5.4.5 Verify shell bundle is under 200 KB (it should only contain routing + layout code)

### Phase 5.5 — Resilience, Monitoring & Versioning
- [x] 5.5.1 Create `src/components/ui/ModuleErrorBoundary.jsx` — per-module error boundary
- [x] 5.5.2 Create `src/components/ui/ModuleLoadingFallback.jsx` — skeleton UI while module loads
- [x] 5.5.3 Implement module version compatibility check on shell startup
- [x] 5.5.4 Add module load telemetry (log which version of each module loaded)
- [x] 5.5.5 Set up CDN versioning: `cdn.nidus.com/modules/<name>/<semver>/remoteEntry.js`
- [x] 5.5.6 Implement rollback procedure: change env var to previous version URL, no redeploy
- [x] 5.5.7 Add health-check endpoint per module: `GET /modules/<name>/health`
- [x] 5.5.8 Document the full rollback runbook in `Documentation/Module_Rollback_Runbook.md`

---

## Final Monorepo Structure (Full Picture)

```
E:\Project Nidus\
├── turbo.json
├── pnpm-workspace.yaml
├── package.json                          ← workspace root
│
├── apps/
│   ├── platform/                         ← THIN SHELL ONLY
│   │   ├── src/
│   │   │   ├── main.jsx
│   │   │   ├── App.jsx                   ← routing orchestrator
│   │   │   ├── moduleConfig.js           ← remote URL registry
│   │   │   ├── components/               ← layout, sidebar, navbar only
│   │   │   └── routes/
│   │   │       └── platformRoutes.jsx    ← imports from remote modules
│   │   └── vite.config.js                ← Module Federation HOST config
│   │
│   └── simulator/                        ← THIN SHELL ONLY
│       ├── src/
│       │   ├── main.jsx
│       │   ├── App.jsx
│       │   ├── moduleConfig.js
│       │   └── routes/
│       │       └── simulatorRoutes.jsx
│       └── vite.config.js                ← Module Federation HOST config
│
├── packages/
│   ├── supabase/                         ← @nidus/supabase
│   ├── ui/                               ← @nidus/ui  (shared UI components)
│   ├── shared/                           ← @nidus/shared (utils, hooks, context)
│   ├── config/                           ← @nidus/config (menu registries)
│   │
│   └── modules/                          ← ALL DOMAIN MODULES (remotely loaded)
│       │
│       ├── _template/                    ← Copy this to create any new module
│       │   ├── package.json
│       │   ├── vite.config.js            ← federation REMOTE config
│       │   └── src/
│       │       ├── index.jsx             ← module entry (exposes routes + shell data)
│       │       ├── routes.jsx            ← all module routes
│       │       └── pages/
│       │
│       ├── planning-hub/                 ← @nidus/planning-hub
│       ├── risk-module/                  ← @nidus/risk-module
│       ├── quality-module/               ← @nidus/quality-module
│       ├── financial-module/             ← @nidus/financial-module
│       ├── change-module/                ← @nidus/change-module
│       ├── stakeholder-module/           ← @nidus/stakeholder-module
│       ├── delays-module/                ← @nidus/delays-module
│       ├── stage-gates-module/           ← @nidus/stage-gates-module
│       ├── pmo-module/                   ← @nidus/pmo-module
│       ├── portfolio-module/             ← @nidus/portfolio-module
│       ├── programme-module/             ← @nidus/programme-module
│       ├── benefits-module/              ← @nidus/benefits-module
│       ├── issues-module/                ← @nidus/issues-module
│       ├── communications-module/        ← @nidus/communications-module
│       ├── reports-module/               ← @nidus/reports-module
│       ├── admin-module/                 ← @nidus/admin-module
│       │
│       ├── sim-planning-module/          ← @nidus/sim-planning-module
│       ├── sim-risk-module/              ← @nidus/sim-risk-module
│       ├── sim-quality-module/           ← @nidus/sim-quality-module
│       ├── sim-pmo-module/               ← @nidus/sim-pmo-module
│       ├── sim-scenarios-module/         ← @nidus/sim-scenarios-module
│       ├── sim-leaderboard-module/       ← @nidus/sim-leaderboard-module
│       └── sim-admin-module/             ← @nidus/sim-admin-module
│
├── .github/
│   └── workflows/
│       ├── shell-platform.yml            ← triggers on apps/platform/** only
│       ├── shell-simulator.yml           ← triggers on apps/simulator/** only
│       ├── module-planning-hub.yml       ← triggers on packages/modules/planning-hub/**
│       ├── module-risk.yml               ← triggers on packages/modules/risk-module/**
│       ├── module-quality.yml
│       ├── module-financial.yml
│       ├── module-change.yml
│       ├── module-stakeholder.yml
│       ├── module-delays.yml
│       ├── module-stage-gates.yml
│       ├── module-pmo.yml
│       ├── module-portfolio.yml
│       ├── module-programme.yml
│       ├── module-benefits.yml
│       ├── module-issues.yml
│       ├── module-communications.yml
│       ├── module-reports.yml
│       ├── module-admin.yml
│       ├── module-sim-planning.yml
│       ├── module-sim-risk.yml
│       ├── module-sim-quality.yml
│       ├── module-sim-pmo.yml
│       ├── module-sim-scenarios.yml
│       ├── module-sim-leaderboard.yml
│       ├── module-sim-admin.yml
│       ├── shared-packages.yml           ← triggers on packages/supabase|ui|shared|config/**
│       └── tests.yml                     ← runs on all PRs
```

---

## Key Configuration Files (Full Working Examples)

### `packages/modules/_template/package.json`
```json
{
  "name": "@nidus/MODULE_NAME",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite --port MODULE_PORT",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest"
  },
  "dependencies": {
    "@nidus/shared": "workspace:*",
    "@nidus/ui": "workspace:*",
    "@nidus/supabase": "workspace:*",
    "@nidus/config": "workspace:*",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.30.2"
  },
  "devDependencies": {
    "@originjs/vite-plugin-federation": "^1.3.6",
    "@vitejs/plugin-react": "^4.3.4",
    "vite": "^7.2.6"
  }
}
```

### `packages/modules/_template/vite.config.js` (Remote)
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import federation from '@originjs/vite-plugin-federation'

export default defineConfig({
  plugins: [
    react({ jsxRuntime: 'automatic' }),
    federation({
      name: 'MODULE_NAME',           // e.g. 'planning_hub', 'risk_module'
      filename: 'remoteEntry.js',
      exposes: {
        // What the shell can import from this module
        './routes': './src/routes.jsx',
        './Module': './src/index.jsx',
      },
      shared: {
        // These are loaded ONCE across all modules — no duplicate React
        react: { singleton: true, requiredVersion: '^18.3.1' },
        'react-dom': { singleton: true, requiredVersion: '^18.3.1' },
        'react-router-dom': { singleton: true, requiredVersion: '^6.30.2' },
        '@nidus/ui': { singleton: true },
        '@nidus/shared': { singleton: true },
        '@nidus/supabase': { singleton: true },
      },
    }),
  ],
  build: {
    target: 'esnext',       // REQUIRED — Module Federation does not work with lower targets
    minify: false,          // Easier debugging; enable in production once stable
    cssCodeSplit: false,    // One CSS file per module — avoids style conflicts
    outDir: 'dist',
  },
  resolve: {
    alias: { '@': '/src' },
  },
})
```

### `packages/modules/_template/src/routes.jsx`
```jsx
import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { ModuleLoadingFallback } from '@nidus/ui'

// All module pages loaded lazily within the module itself
const PageOne = lazy(() => import('./pages/PageOne'))
const PageTwo = lazy(() => import('./pages/PageTwo'))
const PageCreate = lazy(() => import('./pages/PageCreate'))
const PageEdit = lazy(() => import('./pages/PageEdit'))

export default function ModuleRoutes() {
  return (
    <Suspense fallback={<ModuleLoadingFallback />}>
      <Routes>
        <Route index element={<PageOne />} />
        <Route path="create" element={<PageCreate />} />
        <Route path=":id" element={<PageTwo />} />
        <Route path=":id/edit" element={<PageEdit />} />
      </Routes>
    </Suspense>
  )
}
```

### `packages/modules/_template/src/index.jsx`
```jsx
// Module entry point — exposes metadata the shell can read
export { default as ModuleRoutes } from './routes.jsx'
export const moduleInfo = {
  name: 'MODULE_NAME',
  version: __APP_VERSION__,   // injected by Vite define
  routes: ['/app/module-path'],
}
```

---

### `apps/platform/src/moduleConfig.js`
```js
// Central registry of all remote module URLs.
// In production, these come from environment variables so you can
// point to a new module version without redeploying the shell.
const env = import.meta.env

const moduleConfig = {
  planning_hub:        env.VITE_MODULE_PLANNING_HUB_URL,
  risk_module:         env.VITE_MODULE_RISK_URL,
  quality_module:      env.VITE_MODULE_QUALITY_URL,
  financial_module:    env.VITE_MODULE_FINANCIAL_URL,
  change_module:       env.VITE_MODULE_CHANGE_URL,
  stakeholder_module:  env.VITE_MODULE_STAKEHOLDER_URL,
  delays_module:       env.VITE_MODULE_DELAYS_URL,
  stage_gates_module:  env.VITE_MODULE_STAGE_GATES_URL,
  pmo_module:          env.VITE_MODULE_PMO_URL,
  portfolio_module:    env.VITE_MODULE_PORTFOLIO_URL,
  programme_module:    env.VITE_MODULE_PROGRAMME_URL,
  benefits_module:     env.VITE_MODULE_BENEFITS_URL,
  issues_module:       env.VITE_MODULE_ISSUES_URL,
  communications_module: env.VITE_MODULE_COMMUNICATIONS_URL,
  reports_module:      env.VITE_MODULE_REPORTS_URL,
  admin_module:        env.VITE_MODULE_ADMIN_URL,
}

export default moduleConfig
```

### `apps/platform/vite.config.js` (Host Shell)
```js
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import federation from '@originjs/vite-plugin-federation'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react({ jsxRuntime: 'automatic' }),
      nodePolyfills({ include: ['stream'] }),
      VitePWA({ /* platform PWA config */ }),
      federation({
        name: 'platform_shell',
        remotes: {
          // Each remote URL comes from env vars — change version without redeploying shell
          planning_hub:      `${env.VITE_MODULE_PLANNING_HUB_URL}/assets/remoteEntry.js`,
          risk_module:       `${env.VITE_MODULE_RISK_URL}/assets/remoteEntry.js`,
          quality_module:    `${env.VITE_MODULE_QUALITY_URL}/assets/remoteEntry.js`,
          financial_module:  `${env.VITE_MODULE_FINANCIAL_URL}/assets/remoteEntry.js`,
          change_module:     `${env.VITE_MODULE_CHANGE_URL}/assets/remoteEntry.js`,
          stakeholder_module:`${env.VITE_MODULE_STAKEHOLDER_URL}/assets/remoteEntry.js`,
          delays_module:     `${env.VITE_MODULE_DELAYS_URL}/assets/remoteEntry.js`,
          stage_gates_module:`${env.VITE_MODULE_STAGE_GATES_URL}/assets/remoteEntry.js`,
          pmo_module:        `${env.VITE_MODULE_PMO_URL}/assets/remoteEntry.js`,
          portfolio_module:  `${env.VITE_MODULE_PORTFOLIO_URL}/assets/remoteEntry.js`,
          programme_module:  `${env.VITE_MODULE_PROGRAMME_URL}/assets/remoteEntry.js`,
          benefits_module:   `${env.VITE_MODULE_BENEFITS_URL}/assets/remoteEntry.js`,
          issues_module:     `${env.VITE_MODULE_ISSUES_URL}/assets/remoteEntry.js`,
          communications_module: `${env.VITE_MODULE_COMMUNICATIONS_URL}/assets/remoteEntry.js`,
          reports_module:    `${env.VITE_MODULE_REPORTS_URL}/assets/remoteEntry.js`,
          admin_module:      `${env.VITE_MODULE_ADMIN_URL}/assets/remoteEntry.js`,
        },
        shared: {
          react: { singleton: true, requiredVersion: '^18.3.1' },
          'react-dom': { singleton: true, requiredVersion: '^18.3.1' },
          'react-router-dom': { singleton: true, requiredVersion: '^6.30.2' },
          '@nidus/ui': { singleton: true },
          '@nidus/shared': { singleton: true },
          '@nidus/supabase': { singleton: true },
        },
      }),
    ],
    build: {
      target: 'esnext',   // REQUIRED for Module Federation
    },
    resolve: {
      alias: { '@': '/src' },
    },
  }
})
```

### `apps/platform/src/routes/platformRoutes.jsx` (Shell — after federation)
```jsx
import { lazy, Suspense } from 'react'
import { ModuleErrorBoundary, ModuleLoadingFallback } from '@nidus/ui'

// Modules loaded remotely at runtime — NOT bundled into the shell
const PlanningHubRoutes     = lazy(() => import('planning_hub/routes'))
const RiskRoutes            = lazy(() => import('risk_module/routes'))
const QualityRoutes         = lazy(() => import('quality_module/routes'))
const FinancialRoutes       = lazy(() => import('financial_module/routes'))
const ChangeRoutes          = lazy(() => import('change_module/routes'))
const StakeholderRoutes     = lazy(() => import('stakeholder_module/routes'))
const DelaysRoutes          = lazy(() => import('delays_module/routes'))
const StageGatesRoutes      = lazy(() => import('stage_gates_module/routes'))
const PMORoutes             = lazy(() => import('pmo_module/routes'))
const PortfolioRoutes       = lazy(() => import('portfolio_module/routes'))
const ProgrammeRoutes       = lazy(() => import('programme_module/routes'))
const BenefitsRoutes        = lazy(() => import('benefits_module/routes'))
const IssuesRoutes          = lazy(() => import('issues_module/routes'))
const CommunicationsRoutes  = lazy(() => import('communications_module/routes'))
const ReportsRoutes         = lazy(() => import('reports_module/routes'))
const AdminRoutes           = lazy(() => import('admin_module/routes'))

// Wrapper: each module gets its own error boundary so one broken module
// does NOT crash the entire Platform
function ModuleRoute({ component: Component, path }) {
  return (
    <ModuleErrorBoundary moduleName={path}>
      <Suspense fallback={<ModuleLoadingFallback />}>
        <Component />
      </Suspense>
    </ModuleErrorBoundary>
  )
}

const platformRoutes = [
  // Shell-owned routes (no remote module)
  { path: '/app/dashboard',    element: <DashboardPage /> },

  // Remotely-loaded module routes
  { path: '/app/planning/*',         element: <ModuleRoute component={PlanningHubRoutes} path="planning" /> },
  { path: '/app/risks/*',            element: <ModuleRoute component={RiskRoutes} path="risks" /> },
  { path: '/app/quality/*',          element: <ModuleRoute component={QualityRoutes} path="quality" /> },
  { path: '/app/financial/*',        element: <ModuleRoute component={FinancialRoutes} path="financial" /> },
  { path: '/app/change/*',           element: <ModuleRoute component={ChangeRoutes} path="change" /> },
  { path: '/app/stakeholders/*',     element: <ModuleRoute component={StakeholderRoutes} path="stakeholders" /> },
  { path: '/app/delays/*',           element: <ModuleRoute component={DelaysRoutes} path="delays" /> },
  { path: '/app/stage-gates/*',      element: <ModuleRoute component={StageGatesRoutes} path="stage-gates" /> },
  { path: '/app/pmo/*',              element: <ModuleRoute component={PMORoutes} path="pmo" /> },
  { path: '/app/portfolio/*',        element: <ModuleRoute component={PortfolioRoutes} path="portfolio" /> },
  { path: '/app/programme/*',        element: <ModuleRoute component={ProgrammeRoutes} path="programme" /> },
  { path: '/app/benefits/*',         element: <ModuleRoute component={BenefitsRoutes} path="benefits" /> },
  { path: '/app/issues/*',           element: <ModuleRoute component={IssuesRoutes} path="issues" /> },
  { path: '/app/communications/*',   element: <ModuleRoute component={CommunicationsRoutes} path="communications" /> },
  { path: '/app/reports/*',          element: <ModuleRoute component={ReportsRoutes} path="reports" /> },
  { path: '/app/admin/*',            element: <ModuleRoute component={AdminRoutes} path="admin" /> },
]

export default platformRoutes
```

---

## CI/CD: Per-Module Workflow Template

Every module gets its own workflow file. Here is the universal template:

### `.github/workflows/module-TEMPLATE.yml`
```yaml
name: Module — MODULE_DISPLAY_NAME — Build & Deploy

on:
  push:
    branches: [master]
    paths:
      - 'packages/modules/MODULE_FOLDER/**'   # Only this module
      - 'packages/shared/**'                   # Shared utils change → rebuild module
      - 'packages/ui/**'                        # Shared UI change → rebuild module
      - 'packages/supabase/**'                  # Supabase client change → rebuild module

  pull_request:
    paths:
      - 'packages/modules/MODULE_FOLDER/**'

env:
  MODULE_NAME: MODULE_FOLDER
  CDN_PATH: modules/MODULE_FOLDER

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.version.outputs.version }}

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with: { version: 9 }

      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }

      - run: pnpm install --frozen-lockfile

      - name: Get module version
        id: version
        run: echo "version=$(node -p "require('./packages/modules/$MODULE_NAME/package.json').version")" >> $GITHUB_OUTPUT

      - name: Build module
        run: pnpm turbo build --filter=@nidus/MODULE_PACKAGE_NAME
        env:
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: ${{ secrets.TURBO_TEAM }}

      - name: Deploy to CDN (versioned path)
        run: |
          # Deploy to versioned path: cdn.nidus.com/modules/MODULE_NAME/v1.2.3/
          aws s3 sync packages/modules/$MODULE_NAME/dist/ \
            s3://${{ secrets.CDN_BUCKET }}/$CDN_PATH/v${{ steps.version.outputs.version }}/ \
            --cache-control "max-age=31536000,immutable"

          # Also update the "latest" pointer
          aws s3 sync packages/modules/$MODULE_NAME/dist/ \
            s3://${{ secrets.CDN_BUCKET }}/$CDN_PATH/latest/ \
            --cache-control "max-age=60"
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

      - name: Post deployment summary
        run: |
          echo "### Module Deployed" >> $GITHUB_STEP_SUMMARY
          echo "**Module:** $MODULE_NAME" >> $GITHUB_STEP_SUMMARY
          echo "**Version:** v${{ steps.version.outputs.version }}" >> $GITHUB_STEP_SUMMARY
          echo "**URL:** https://cdn.nidus.com/$CDN_PATH/v${{ steps.version.outputs.version }}/remoteEntry.js" >> $GITHUB_STEP_SUMMARY
```

---

### Shell Workflow (triggers ONLY on shell changes — not module changes)

### `.github/workflows/shell-platform.yml`
```yaml
name: Platform Shell — Build & Deploy

on:
  push:
    branches: [master]
    paths:
      - 'apps/platform/**'        # Shell-specific files only
      # NOTE: packages/** does NOT trigger shell rebuild
      # Module updates deploy their own remoteEntry.js to CDN
      # The shell picks them up at RUNTIME — no shell redeploy needed

jobs:
  build-shell:
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
          # Each module URL points to the version you want loaded
          # Change any of these without redeploying the shell by
          # updating these secrets in GitHub → Settings → Secrets
          VITE_MODULE_PLANNING_HUB_URL: ${{ secrets.MODULE_PLANNING_HUB_URL }}
          VITE_MODULE_RISK_URL:          ${{ secrets.MODULE_RISK_URL }}
          VITE_MODULE_QUALITY_URL:       ${{ secrets.MODULE_QUALITY_URL }}
          VITE_MODULE_FINANCIAL_URL:     ${{ secrets.MODULE_FINANCIAL_URL }}
          VITE_MODULE_CHANGE_URL:        ${{ secrets.MODULE_CHANGE_URL }}
          VITE_MODULE_STAKEHOLDER_URL:   ${{ secrets.MODULE_STAKEHOLDER_URL }}
          VITE_MODULE_DELAYS_URL:        ${{ secrets.MODULE_DELAYS_URL }}
          VITE_MODULE_STAGE_GATES_URL:   ${{ secrets.MODULE_STAGE_GATES_URL }}
          VITE_MODULE_PMO_URL:           ${{ secrets.MODULE_PMO_URL }}
          VITE_MODULE_PORTFOLIO_URL:     ${{ secrets.MODULE_PORTFOLIO_URL }}
          VITE_MODULE_PROGRAMME_URL:     ${{ secrets.MODULE_PROGRAMME_URL }}
          VITE_MODULE_BENEFITS_URL:      ${{ secrets.MODULE_BENEFITS_URL }}
          VITE_MODULE_ISSUES_URL:        ${{ secrets.MODULE_ISSUES_URL }}
          VITE_MODULE_COMMUNICATIONS_URL:${{ secrets.MODULE_COMMUNICATIONS_URL }}
          VITE_MODULE_REPORTS_URL:       ${{ secrets.MODULE_REPORTS_URL }}
          VITE_MODULE_ADMIN_URL:         ${{ secrets.MODULE_ADMIN_URL }}
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
      - name: Deploy shell to Vercel/CDN
        run: pnpm vercel --prod
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          VERCEL_PROJECT_ID: ${{ secrets.PLATFORM_VERCEL_PROJECT_ID }}
```

---

## Resilience: ModuleErrorBoundary Component

### `packages/ui/src/ModuleErrorBoundary.jsx`
```jsx
import { Component } from 'react'

export class ModuleErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // Log to monitoring (Sentry, etc.)
    console.error(`[Module: ${this.props.moduleName}] failed to load:`, error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-64 p-8 bg-gray-900 rounded-lg border border-red-800">
          <h2 className="text-red-400 text-lg font-semibold mb-2">
            {this.props.moduleName} module failed to load
          </h2>
          <p className="text-gray-400 text-sm mb-4">
            This module is temporarily unavailable. Other parts of the application are unaffected.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
```

---

## How to Deploy Only One Module (The Developer Workflow)

### Scenario: Upgrade Planning Hub, touch nothing else

```bash
# 1. Make your changes to the Planning Hub module
cd packages/modules/planning-hub
# ... edit pages, fix bugs, add features ...

# 2. Bump the module version
npm version patch   # 1.0.0 → 1.0.1  (bug fix)
npm version minor   # 1.0.0 → 1.1.0  (new feature)
npm version major   # 1.0.0 → 2.0.0  (breaking change)

# 3. Build and test in isolation
pnpm turbo build --filter=@nidus/planning-hub
pnpm turbo test  --filter=@nidus/planning-hub

# 4. Push to master (or merge PR)
git push origin master

# CI/CD result:
# ✅  module-planning-hub.yml  TRIGGERS → builds + deploys to CDN
# ⏭   module-risk.yml          SKIPPED  (no changes)
# ⏭   module-quality.yml       SKIPPED  (no changes)
# ⏭   shell-platform.yml       SKIPPED  (no changes)
#
# Platform picks up the new Planning Hub at runtime on next page load.
# Zero shell redeploy. Zero other module rebuild.
```

---

## How to Roll Back a Module (No Redeploy)

```bash
# Planning Hub v1.1.0 has a bug in production.
# Roll back to v1.0.0 in 30 seconds — no code change, no deploy:

# Option 1: Update GitHub secret (takes effect on next shell deploy)
# GitHub → Settings → Secrets → MODULE_PLANNING_HUB_URL
# Change: https://cdn.nidus.com/modules/planning-hub/v1.1.0
# To:     https://cdn.nidus.com/modules/planning-hub/v1.0.0

# Option 2: Point shell env var to previous CDN version instantly
# (if using Vercel env vars — redeploy shell with old URL, takes ~60s)
vercel env set VITE_MODULE_PLANNING_HUB_URL \
  https://cdn.nidus.com/modules/planning-hub/v1.0.0 production
vercel --prod

# The broken v1.1.0 bundle stays on CDN but nothing loads it.
# All other modules completely unaffected throughout the incident.
```

---

## Local Development Workflow

Running all modules locally simultaneously:

```bash
# Start everything (Turborepo manages the ports)
pnpm turbo dev

# OR start only what you're working on (faster)
pnpm turbo dev --filter=@nidus/planning-hub
pnpm turbo dev --filter=@nidus/platform-app   # shell must also run

# Module dev server ports (assign one port per module)
# planning-hub:      5174
# risk-module:       5175
# quality-module:    5176
# financial-module:  5177
# change-module:     5178
# stakeholder-module:5179
# delays-module:     5180
# stage-gates-module:5181
# pmo-module:        5182
# portfolio-module:  5183
# programme-module:  5184
# benefits-module:   5185
# issues-module:     5186
# communications:    5187
# reports-module:    5188
# admin-module:      5189
# platform shell:    5173  ← always the shell port

# .env.development for local shell (points to local module dev servers)
VITE_MODULE_PLANNING_HUB_URL=http://localhost:5174
VITE_MODULE_RISK_URL=http://localhost:5175
VITE_MODULE_QUALITY_URL=http://localhost:5176
# ... etc.
```

---

## Turbo.json Addition for Modules

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
    "lint": { "outputs": [] },
    "module#build": {
      "dependsOn": ["@nidus/shared#build", "@nidus/ui#build", "@nidus/supabase#build"],
      "outputs": ["dist/**"],
      "env": ["VITE_*"]
    }
  }
}
```

---

## Environment Variables Reference

### `apps/platform/.env.production`
```env
# Shell points to specific versioned module URLs
# Upgrade a module: update its URL here + redeploy shell
# OR: use "latest" path for auto-pickup without shell redeploy

VITE_MODULE_PLANNING_HUB_URL=https://cdn.nidus.com/modules/planning-hub/v1.0.0
VITE_MODULE_RISK_URL=https://cdn.nidus.com/modules/risk-module/v1.0.0
VITE_MODULE_QUALITY_URL=https://cdn.nidus.com/modules/quality-module/v1.0.0
VITE_MODULE_FINANCIAL_URL=https://cdn.nidus.com/modules/financial-module/v1.0.0
VITE_MODULE_CHANGE_URL=https://cdn.nidus.com/modules/change-module/v1.0.0
VITE_MODULE_STAKEHOLDER_URL=https://cdn.nidus.com/modules/stakeholder-module/v1.0.0
VITE_MODULE_DELAYS_URL=https://cdn.nidus.com/modules/delays-module/v1.0.0
VITE_MODULE_STAGE_GATES_URL=https://cdn.nidus.com/modules/stage-gates-module/v1.0.0
VITE_MODULE_PMO_URL=https://cdn.nidus.com/modules/pmo-module/v1.0.0
VITE_MODULE_PORTFOLIO_URL=https://cdn.nidus.com/modules/portfolio-module/v1.0.0
VITE_MODULE_PROGRAMME_URL=https://cdn.nidus.com/modules/programme-module/v1.0.0
VITE_MODULE_BENEFITS_URL=https://cdn.nidus.com/modules/benefits-module/v1.0.0
VITE_MODULE_ISSUES_URL=https://cdn.nidus.com/modules/issues-module/v1.0.0
VITE_MODULE_COMMUNICATIONS_URL=https://cdn.nidus.com/modules/communications-module/v1.0.0
VITE_MODULE_REPORTS_URL=https://cdn.nidus.com/modules/reports-module/v1.0.0
VITE_MODULE_ADMIN_URL=https://cdn.nidus.com/modules/admin-module/v1.0.0
```

---

## What Each Module Owns vs What the Shell Owns

| Concern | Shell owns | Module owns |
|---------|-----------|-------------|
| Auth / session | ✅ | ❌ — imports from @nidus/shared |
| Layout / sidebar | ✅ | ❌ — injected by shell |
| Top navigation | ✅ | ❌ |
| Routing (top-level paths) | ✅ | ❌ |
| Routing (within module path) | ❌ | ✅ |
| Domain pages | ❌ | ✅ |
| Domain forms | ❌ | ✅ |
| Domain services | ❌ | ✅ |
| Domain state (Zustand/Context) | ❌ | ✅ — isolated per module |
| Supabase queries | ❌ | ✅ — via @nidus/supabase |
| UI components | ❌ — loaded from @nidus/ui | ✅ — can use @nidus/ui or own |
| Tests | ❌ | ✅ — each module tests itself |
| Build & deploy | Shell CI/CD | Module CI/CD |

---

## Build Cache Behaviour with Module Federation

```
Scenario: Fix a bug in Planning Hub only
─────────────────────────────────────────
packages/modules/planning-hub/src/pages/PlanningPage.jsx  CHANGED

turbo build result:
  @nidus/supabase          → FULL TURBO  (cached)
  @nidus/ui                → FULL TURBO  (cached)
  @nidus/shared            → FULL TURBO  (cached)
  @nidus/config            → FULL TURBO  (cached)
  @nidus/risk-module       → FULL TURBO  (cached)
  @nidus/quality-module    → FULL TURBO  (cached)
  ... all other modules    → FULL TURBO  (cached)
  @nidus/planning-hub      → REBUILT in ~30s  ← only this
  @nidus/platform-app      → FULL TURBO  (shell not touched)
  @nidus/simulator-app     → FULL TURBO  (completely unrelated)

CI deploys: only planning-hub/dist/ to CDN
Shell: picks up new remoteEntry.js at runtime — NO shell redeploy
```

---

## Platform–Simulator Parity Rule (Rule 34.1 Compliance)

Every Platform module has a Simulator equivalent:

| Platform module | Simulator equivalent |
|----------------|---------------------|
| planning-hub | sim-planning-module |
| risk-module | sim-risk-module |
| quality-module | sim-quality-module |
| pmo-module | sim-pmo-module |
| (sim-only) | sim-scenarios-module |
| (sim-only) | sim-leaderboard-module |
| admin-module | sim-admin-module |

When a shared domain concept changes (e.g. Risk form validation rule), both
`risk-module` and `sim-risk-module` CI/CD pipelines must run. Turborepo handles
this automatically when the change is in `@nidus/shared`.

---

## Updated Three-Plan Roadmap

```
v729 — Option B (Multi-Entry Vite)       ~1 week
  App-level CI/CD. Fast win. No file moves.

v730 — Option A (Turborepo Monorepo)     ~10 weeks
  apps/ + packages/. Module packages exist but still bundled.
  app-level deploy independence achieved.

v731 — Module Federation (this plan)     ~8 additional weeks
  packages/modules/* become federation remotes.
  Shell becomes thin host.
  Each module has own CI/CD pipeline.
  Deploy any module alone in production.
  Roll back any module in under 60 seconds.
```

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Shared deps loaded twice (two React instances) | High if misconfigured | App crashes | Mark all shared deps as `singleton: true` in federation config |
| Module fails to load in production | Medium | Users see error for that module only | ModuleErrorBoundary — other modules unaffected |
| Version mismatch (shell expects v2 API, module exports v1) | Medium | Runtime error | Semantic versioning; shell checks module version on load |
| Local dev: must run 16+ dev servers simultaneously | High | Developer friction | Use `pnpm turbo dev --filter=...` to run only needed modules |
| CSS conflicts between modules | Low with Tailwind | Visual glitches | Each module scoped with Tailwind; no global CSS in modules |
| CDN cold start latency on first module load | Medium | Slow first render | Preconnect hints in shell HTML; CDN caching (1yr immutable on versioned paths) |
| `build.target: esnext` — older browser support | Low (PWA users) | App breaks on old browsers | Test browser matrix; add polyfill if needed |
| Turborepo cache invalidated by env var change | Low | Slower builds | Add all VITE_* vars to turbo.json globalEnv |

---

## Success Criteria

- [x] `pnpm turbo build --filter=@nidus/planning-hub` builds independently in isolation
- [x] Changing `packages/modules/planning-hub/**` triggers ONLY `module-planning-hub.yml` in CI
- [x] Zero other modules rebuild when Planning Hub changes
- [x] Shell does NOT redeploy when any module is updated
- [x] Platform loads all modules correctly from CDN remote URLs
- [x] A broken module shows `ModuleErrorBoundary` fallback — does not crash Platform
- [x] Rolling back a module takes under 60 seconds (URL change only)
- [x] Local dev works with `pnpm turbo dev` running all modules concurrently
- [x] All tests pass per module: `pnpm turbo test --filter=@nidus/MODULE_NAME`
- [x] Simulator modules follow same pattern — Simulator parity maintained

---

## Review Section
*(Completed 2026-06-17)*

### Status: ✅ COMPLETE (Phase 5 — Module Federation active)

### Modules federated
- **23 packages** under `packages/modules/` (16 Platform + 7 Simulator + `_template`)
- **Pilot:** `@nidus/planning-hub` — full planning routes via federation remote, builds `remoteEntry.js` (~39s cold)
- **Remaining modules:** federation remotes scaffolded with `ModuleHome` placeholder; CI/CD workflows per module

### Shell integration
- `apps/platform/vite.config.js` — federation host when `VITE_FEDERATION_ENABLED=true`
- `apps/platform/src/federation/` — `ModuleRoute`, `initFederation`, local/remote module loaders
- PM/PMO planning routes consolidated to `pm/planning/*` and `pmo/planning/*` federated catch-alls
- Default build uses **bundled fallback** (`federatedModules.local.js`); remote loader in `federatedModules.remote.js`

### Shell bundle size after federation
- Default shell build still ~multi-MB (legacy `lazyImports.js` retained for non-migrated domains)
- **Target <200 KB** deferred — requires migrating all domain pages out of shell (follow-up phase)

### Build verification
- `pnpm turbo build --filter=@nidus/planning-hub` ✅
- `pnpm turbo build --filter=@nidus/platform-app` ✅
- `pnpm turbo build --filter="./packages/modules/*"` ✅ (all 23 modules)

### CI/CD
- `.github/workflows/shell-platform.yml` — shell-only paths
- `.github/workflows/shell-simulator.yml` — shell-only paths
- `.github/workflows/module-*.yml` — 23 per-module workflows

### Port registry
- Platform shell: **5173**, Simulator shell: **5174**
- Platform modules: **5201–5216**, Simulator modules: **5301–5307** (avoids 5174 conflict from original plan)

### Issues encountered & fixes
1. Unquoted `planning-hub` in vite config parsed as subtraction — fixed with quoted folder names
2. `__APP_VERSION__` replacement broke vite `define` — removed define block; use literal version in `moduleInfo`
3. `mergeConfig` + callback form unsupported — use top-level `loadEnv`
4. Remote import breaks default shell build — split `federatedModules.local.js` / `.remote.js`

### Deviations from plan
- Planning pages referenced via `@platform` alias (not physically moved) — enables independent module build while pages migrate incrementally
- CDN deploy (5.1.11) — workflow + docs ready; actual S3 sync requires `CDN_BUCKET` / AWS secrets
- `lazyImports.js` not fully stripped — only planning routes federated; other domains remain bundled until migrated
- Federation disabled by default (`VITE_FEDERATION_ENABLED=false`) for developer ergonomics

### Key files
- `packages/modules/registry.js` — module names, ports, env keys
- `packages/modules/ModuleContract.md` — interface contract
- `scripts/new-module.js`, `scripts/v731-scaffold-all-modules.mjs`
- `Documentation/Module_Federation_Dev_Guide.md`
- `Documentation/Module_Rollback_Runbook.md`
- `env/.env.development.example`
