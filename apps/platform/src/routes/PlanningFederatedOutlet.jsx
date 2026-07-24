import { Suspense } from 'react'
import ModuleLoadingFallback from '../components/ui/ModuleLoadingFallback.jsx'
import ModuleRoute from '../federation/ModuleRoute.jsx'
import { PlanningHubRoutes } from '../federation/federatedModules.local.js'
import { ThemeProvider, ToastProvider, ProtectedRoute, PMLayout, PMOLayout } from './lazyImports.js'

function PlanningOutlet({ Layout: LayoutComponent }) {
  return (
    <Suspense fallback={<ModuleLoadingFallback label="Loading Planning Hub…" />}>
      <ThemeProvider>
        <ToastProvider>
          <ProtectedRoute>
            <LayoutComponent>
              <ModuleRoute
                component={PlanningHubRoutes}
                moduleName="planning-hub"
                label="Loading Planning Hub…"
              />
            </LayoutComponent>
          </ProtectedRoute>
        </ToastProvider>
      </ThemeProvider>
    </Suspense>
  )
}

/** PM planning — federated module (remote or bundled fallback). */
export function PmPlanningFederated() {
  return <PlanningOutlet Layout={PMLayout} />
}

/** PMO planning — federated module (remote or bundled fallback). */
export function PmoPlanningFederated() {
  return <PlanningOutlet Layout={PMOLayout} />
}
