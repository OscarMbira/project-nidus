import { Suspense, lazy } from 'react'
import ModuleLoadingFallback from '../components/ui/ModuleLoadingFallback.jsx'
import ModuleRoute from '../federation/ModuleRoute.jsx'
import { ThemeProvider, ToastProvider, ProtectedRoute, PMOLayout } from './lazyImports.js'

const PmoModuleRoutes = lazy(() => import('./fallback/pmoModuleRoutes.jsx'))

/** PMO federated module (bundled fallback until remote is enabled). */
export function PmoFederated() {
  return (
    <Suspense fallback={<ModuleLoadingFallback label="Loading PMO…" />}>
      <ThemeProvider>
        <ToastProvider>
          <ProtectedRoute>
            <PMOLayout>
              <ModuleRoute
                component={PmoModuleRoutes}
                moduleName="pmo-module"
                label="Loading PMO…"
              />
            </PMOLayout>
          </ProtectedRoute>
        </ToastProvider>
      </ThemeProvider>
    </Suspense>
  )
}
