import ModuleLoadingFallback from '@nidus/ui/ModuleLoadingFallback.jsx'
import PlanningHubRoutes from '@nidus/planning/routes/PlanningHubRoutes.jsx'

/**
 * Simulator practice planning module. v1239 D6: renders the same shared planning screens as the
 * Platform (no second UI); the Simulator shell's PlanningProvider sets mode="simulator", so the
 * screens read and write `sim` rows.
 */
export default function SimPlanningModuleRoutes() {
  return <PlanningHubRoutes fallback={<ModuleLoadingFallback label="Loading practice planning…" />} />
}
