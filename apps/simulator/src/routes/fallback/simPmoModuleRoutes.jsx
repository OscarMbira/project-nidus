import { lazy, Suspense } from 'react'
import ModuleLoadingFallback from '../../components/ui/ModuleLoadingFallback.jsx'

const ModuleRoutes = lazy(() => import('@nidus/sim-pmo-module/routes'))

export default function SimPmoModuleFallbackRoutes() {
  return (
    <Suspense fallback={<ModuleLoadingFallback label="Loading Sim PMO…" />}>
      <ModuleRoutes />
    </Suspense>
  )
}
