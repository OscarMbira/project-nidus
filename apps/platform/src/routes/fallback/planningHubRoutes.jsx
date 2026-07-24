import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import ModuleLoadingFallback from '../../components/ui/ModuleLoadingFallback.jsx'
import * as LP from '../lazyImports.js'

const {
  PlanningHub,
  PlanningIntelligenceDashboard,
  ScenarioList,
  PBSBuilder,
  PlanHealthDashboard,
  AIPlanGenerator,
  ExecutivePlanView,
  PortfolioCollisionDashboard,
  RecoveryPlanningView,
  ConfidenceForecastView,
  GovernanceGateChecklist,
  MicroPlanList,
  MicroPlanDetail,
  MicroPlanDraftQueue,
  IntelligenceRulesPage,
  GovernanceRulesConfigPage,
} = LP

/** Bundled fallback — same routes as planning-hub remote exposes. */
export default function PlanningHubFallbackRoutes() {
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
