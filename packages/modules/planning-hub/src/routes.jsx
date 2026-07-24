import { lazy, Suspense } from 'react'
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
