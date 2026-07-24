import { Suspense } from 'react'
import { ModuleErrorBoundary } from '../components/ui/ModuleErrorBoundary.jsx'
import ModuleLoadingFallback from '../components/ui/ModuleLoadingFallback.jsx'

/**
 * Wraps a federated module route component with error boundary + loading fallback.
 */
export function ModuleRoute({ component: Component, moduleName, label }) {
  return (
    <ModuleErrorBoundary moduleName={moduleName}>
      <Suspense fallback={<ModuleLoadingFallback label={label || `Loading ${moduleName}…`} />}>
        <Component />
      </Suspense>
    </ModuleErrorBoundary>
  )
}

export default ModuleRoute
