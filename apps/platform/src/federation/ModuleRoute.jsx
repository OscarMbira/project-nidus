import { Suspense } from 'react'
import { ModuleErrorBoundary } from '@nidus/ui/ModuleErrorBoundary.jsx'
import ModuleLoadingFallback from '@nidus/ui/ModuleLoadingFallback.jsx'

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
