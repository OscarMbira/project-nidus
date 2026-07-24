import { lazy, Suspense } from 'react'
import ModuleLoadingFallback from '../../components/ui/ModuleLoadingFallback.jsx'

/** Bundled fallback — same routes as pmo_module remote exposes. */
const ModuleRoutes = lazy(() => import('@nidus/pmo-module/routes'))

export default function PmoModuleFallbackRoutes() {
  return (
    <Suspense fallback={<ModuleLoadingFallback label="Loading PMO…" />}>
      <ModuleRoutes />
    </Suspense>
  )
}
