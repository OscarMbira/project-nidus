import ModuleLoadingFallback from '@nidus/ui/ModuleLoadingFallback.jsx'
import PlanningHubRoutes from '@nidus/planning/routes/PlanningHubRoutes.jsx'

/**
 * Bundled fallback — the same shared route table the planning-hub remote exposes (v1239).
 * Mode, base path and project picker come from the PlanningProvider in App.jsx (and the nested
 * PMO provider in PlanningFederatedOutlet).
 */
export default function PlanningHubFallbackRoutes() {
  return <PlanningHubRoutes fallback={<ModuleLoadingFallback label="Loading Planning Hub…" />} />
}
