/**
 * v1239 — Planning Hub route table (relative paths), shared by every shell:
 *   Platform  /pm/planning/*, /pmo/planning/*  (planning-hub module + bundled fallback)
 *   Simulator /simulator/pm/planning/*         (sim-planning-module)
 *   Planner   /app/planning/*
 * The shell wraps it in a PlanningProvider (mode, basePath, ProjectBar).
 */
import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'

const PlanningHub = lazy(() => import('../screens/hub/PlanningHub.jsx'))
const PlanningIntelligenceDashboard = lazy(() => import('../screens/hub/intelligence/PlanningIntelligenceDashboard.jsx'))
const ScenarioList = lazy(() => import('../screens/hub/scenarios/ScenarioList.jsx'))
const PBSBuilder = lazy(() => import('../screens/hub/pbs/PBSBuilder.jsx'))
const PlanHealthDashboard = lazy(() => import('../screens/hub/health/PlanHealthDashboard.jsx'))
const AIPlanGenerator = lazy(() => import('../screens/hub/ai/AIPlanGenerator.jsx'))
const ExecutivePlanView = lazy(() => import('../screens/hub/executive/ExecutivePlanView.jsx'))
const PortfolioCollisionDashboard = lazy(() => import('../screens/hub/portfolio/PortfolioCollisionDashboard.jsx'))
const RecoveryPlanningView = lazy(() => import('../screens/hub/recovery/RecoveryPlanningView.jsx'))
const ConfidenceForecastView = lazy(() => import('../screens/hub/confidence/ConfidenceForecastView.jsx'))
const GovernanceGateChecklist = lazy(() => import('../screens/hub/governance/GovernanceGateChecklist.jsx'))
const MicroPlanList = lazy(() => import('../screens/hub/microplans/MicroPlanList.jsx'))
const MicroPlanDetail = lazy(() => import('../screens/hub/microplans/MicroPlanDetail.jsx'))
const MicroPlanDraftQueue = lazy(() => import('../screens/hub/microplans/MicroPlanDraftQueue.jsx'))
const IntelligenceRulesPage = lazy(() => import('../screens/hub/IntelligenceRulesPage.jsx'))
const GovernanceRulesConfigPage = lazy(() => import('../screens/hub/GovernanceRulesConfigPage.jsx'))

export default function PlanningHubRoutes({ fallback = null }) {
  return (
    <Suspense fallback={fallback}>
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
