#!/usr/bin/env node
/**
 * Scaffold all v731 modules from registry + generate CI workflows.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import { ALL_MODULES } from '../packages/modules/registry.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const workflowsDir = path.join(repoRoot, '.github/workflows')

for (const mod of ALL_MODULES) {
  const targetDir = path.join(repoRoot, 'packages/modules', mod.folder)
  if (!fs.existsSync(targetDir)) {
    console.log(`Scaffolding ${mod.folder}…`)
    execSync(`node scripts/new-module.js ${mod.folder}`, { cwd: repoRoot, stdio: 'inherit' })
  } else {
    console.log(`Skip existing ${mod.folder}`)
  }

  const workflowName = `module-${mod.folder}.yml`
  const workflowPath = path.join(workflowsDir, workflowName)

  if (!fs.existsSync(workflowPath)) {
    fs.writeFileSync(workflowPath, generateWorkflow(mod), 'utf8')
    console.log(`  Created workflow ${workflowName}`)
  }
}

const planningRoutes = path.join(repoRoot, 'packages/modules/planning-hub/src/routes.jsx')
if (fs.existsSync(path.dirname(planningRoutes))) {
  fs.writeFileSync(planningRoutes, PLANNING_HUB_ROUTES, 'utf8')
  console.log('Updated planning-hub routes.jsx')
}

console.log('v731 scaffold complete.')

function generateWorkflow(mod) {
  return `name: Module — ${mod.displayName} — Build & Deploy

on:
  push:
    branches: [master, main]
    paths:
      - 'packages/modules/${mod.folder}/**'
      - 'packages/shared/**'
      - 'packages/ui/**'
      - 'packages/supabase/**'
      - 'pnpm-lock.yaml'

  pull_request:
    paths:
      - 'packages/modules/${mod.folder}/**'

env:
  MODULE_NAME: ${mod.folder}
  CDN_PATH: modules/${mod.folder}

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      version: \${{ steps.version.outputs.version }}

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Get module version
        id: version
        run: echo "version=\$(node -p "require('./packages/modules/$MODULE_NAME/package.json').version")" >> \$GITHUB_OUTPUT

      - name: Build module
        run: pnpm turbo build --filter=${mod.packageName}
        env:
          TURBO_TOKEN: \${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: \${{ secrets.TURBO_TEAM }}

      - name: Upload module build artifact
        uses: actions/upload-artifact@v4
        with:
          name: \${{ env.MODULE_NAME }}-dist
          path: packages/modules/\${{ env.MODULE_NAME }}/dist

      - name: Deploy to CDN (versioned path)
        if: github.event_name == 'push' && (github.ref == 'refs/heads/master' || github.ref == 'refs/heads/main')
        run: |
          echo "Deploy packages/modules/$MODULE_NAME/dist to CDN path $CDN_PATH/v\${{ steps.version.outputs.version }}/"
        env:
          AWS_ACCESS_KEY_ID: \${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: \${{ secrets.AWS_SECRET_ACCESS_KEY }}
`
}

const PLANNING_HUB_ROUTES = `import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import ModuleLoadingFallback from '@nidus/ui/ModuleLoadingFallback.jsx'

const PlanningHub = lazy(() => import('@platform/pages/planning/PlanningHub'))
const PlanningIntelligenceDashboard = lazy(() => import('@platform/pages/planning/intelligence/PlanningIntelligenceDashboard'))
const ScenarioList = lazy(() => import('@platform/pages/planning/scenarios/ScenarioList'))
const PBSBuilder = lazy(() => import('@platform/pages/planning/pbs/PBSBuilder'))
const PlanHealthDashboard = lazy(() => import('@platform/pages/planning/health/PlanHealthDashboard'))
const AIPlanGenerator = lazy(() => import('@platform/pages/planning/ai/AIPlanGenerator'))
const ExecutivePlanView = lazy(() => import('@platform/pages/planning/executive/ExecutivePlanView'))
const PortfolioCollisionDashboard = lazy(() => import('@platform/pages/planning/portfolio/PortfolioCollisionDashboard'))
const RecoveryPlanningView = lazy(() => import('@platform/pages/planning/recovery/RecoveryPlanningView'))
const ConfidenceForecastView = lazy(() => import('@platform/pages/planning/confidence/ConfidenceForecastView'))
const GovernanceGateChecklist = lazy(() => import('@platform/pages/planning/governance/GovernanceGateChecklist'))
const MicroPlanList = lazy(() => import('@platform/pages/planning/microplans/MicroPlanList'))
const MicroPlanDetail = lazy(() => import('@platform/pages/planning/microplans/MicroPlanDetail'))
const MicroPlanDraftQueue = lazy(() => import('@platform/pages/planning/microplans/MicroPlanDraftQueue'))
const IntelligenceRulesPage = lazy(() => import('@platform/pages/planning/IntelligenceRulesPage'))
const GovernanceRulesConfigPage = lazy(() => import('@platform/pages/planning/GovernanceRulesConfigPage'))

export default function PlanningHubRoutes() {
  return (
    <Suspense fallback={<ModuleLoadingFallback label="Loading Planning Hub…" />}>
      <Routes>
        <Route index element={<PlanningHub />} />
        <Route path="intelligence" element={<PlanningIntelligenceDashboard />} />
        <Route path="scenarios" element={<ScenarioList />} />
        <Route path="pbs" element={<PBSBuilder />} />
        <Route path="health" element={<PlanHealthDashboard />} />
        <Route path="ai" element={<AIPlanGenerator />} />
        <Route path="executive" element={<ExecutivePlanView />} />
        <Route path="collisions" element={<PortfolioCollisionDashboard />} />
        <Route path="recovery" element={<RecoveryPlanningView />} />
        <Route path="confidence" element={<ConfidenceForecastView />} />
        <Route path="governance" element={<GovernanceGateChecklist />} />
        <Route path="governance-config" element={<GovernanceGateChecklist />} />
        <Route path="intelligence-rules" element={<IntelligenceRulesPage />} />
        <Route path="governance-rules" element={<GovernanceRulesConfigPage />} />
        <Route path="microplans" element={<MicroPlanList />} />
        <Route path="microplans/drafts" element={<MicroPlanDraftQueue />} />
        <Route path="microplans/:microPlanId" element={<MicroPlanDetail />} />
      </Routes>
    </Suspense>
  )
}
`
