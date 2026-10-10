import { Suspense } from 'react'
import ModuleLoadingFallback from '../components/ui/ModuleLoadingFallback.jsx'
import ModuleRoute from '../federation/ModuleRoute.jsx'
import { PlanningHubRoutes } from '../federation/federatedModules.local.js'
import { ThemeProvider, ToastProvider, ProtectedRoute, Layout, PMOLayout } from './lazyImports.js'

function PlanningOutlet({ Layout: LayoutComponent, layoutProps = {} }) {
  return (
    <Suspense fallback={<ModuleLoadingFallback label="Loading Planning Hub…" />}>
      <ThemeProvider>
        <ToastProvider>
          <ProtectedRoute>
            <LayoutComponent {...layoutProps}>
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
  return <PlanningOutlet Layout={Layout} layoutProps={{ scope: 'pm' }} />
}

/** PMO planning — federated module (remote or bundled fallback). */
export function PmoPlanningFederated() {
  return <PlanningOutlet Layout={PMOLayout} />
}
