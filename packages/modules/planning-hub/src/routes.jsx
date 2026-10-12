import ModuleLoadingFallback from '@nidus/ui/ModuleLoadingFallback.jsx'
import PlanningHubRoutes from '@nidus/planning/routes/PlanningHubRoutes.jsx'

/**
 * Planning Hub federated module (Platform). v1239: renders the shared @nidus/planning route table;
 * the screens no longer live in apps/platform. Mode, base path and project picker come from the
 * shell's PlanningProvider (shared as a federation singleton).
 */
export default function PlanningHubModuleRoutes() {
  return <PlanningHubRoutes fallback={<ModuleLoadingFallback label="Loading Planning Hub…" />} />
}
