import { lazy } from 'react'

/** Bundled fallback — used when VITE_FEDERATION_ENABLED is not true at build time. */
export const PlanningHubRoutes = lazy(() => import('../routes/fallback/planningHubRoutes.jsx'))

export const federatedModules = {
  planning_hub: PlanningHubRoutes,
}
