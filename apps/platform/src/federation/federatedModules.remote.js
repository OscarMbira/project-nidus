import { lazy } from 'react'
import { logModuleLoad } from '@nidus/shared/federation/moduleTelemetry.js'

/** Remote federation imports — used when VITE_FEDERATION_ENABLED=true at build time. */
export const PlanningHubRoutes = lazy(async () => {
  const mod = await import('planning_hub/routes')
  logModuleLoad({ name: 'planning_hub', version: 'remote', source: 'remote' })
  return mod
})

export const federatedModules = {
  planning_hub: PlanningHubRoutes,
}
