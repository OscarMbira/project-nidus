import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import ModuleLoadingFallback from '../components/ui/ModuleLoadingFallback.jsx'
import { ThemeProvider, ToastProvider, ProtectedRoute, SimulatorPMOLayout } from './lazyImports.js'

const SimPmoModuleRoutes = lazy(() => import('./fallback/simPmoModuleRoutes.jsx'))
const TemplateLibraryPage = lazy(() =>
  import('@nidus/sim-pmo-module/pages/TemplateLibraryPage.jsx'),
)
const TemplatePreviewPage = lazy(() =>
  import('@nidus/sim-pmo-module/pages/TemplatePreviewPage.jsx'),
)
const OrganisationalTemplatesPage = lazy(() =>
  import('@nidus/sim-pmo-module/pages/OrganisationalTemplatesPage.jsx'),
)
const OrganisationalTemplateDetailPage = lazy(() =>
  import('@nidus/sim-pmo-module/pages/OrganisationalTemplateDetailPage.jsx'),
)

/** Simulator PMO field-templates module (bundled). */
export function SimPmoFederated() {
  return (
    <Suspense fallback={<ModuleLoadingFallback label="Loading Sim PMO…" />}>
      <ThemeProvider>
        <ToastProvider>
          <ProtectedRoute requiredPlatform="simulator">
            <SimulatorPMOLayout>
              <Suspense fallback={<ModuleLoadingFallback label="Loading Sim PMO…" />}>
                <SimPmoModuleRoutes />
              </Suspense>
            </SimulatorPMOLayout>
          </ProtectedRoute>
        </ToastProvider>
      </ThemeProvider>
    </Suspense>
  )
}

/**
 * Template Library browse + read-only preview page (parity with Platform
 * /app/pmo/template-library, /app/pmo/template-library/preview/:nodeId).
 */
export function SimPmoTemplateLibraryFederated() {
  return (
    <Suspense fallback={<ModuleLoadingFallback label="Loading Template Library…" />}>
      <ThemeProvider>
        <ToastProvider>
          <ProtectedRoute requiredPlatform="simulator">
            <SimulatorPMOLayout>
              <Suspense fallback={<ModuleLoadingFallback label="Loading Template Library…" />}>
                <Routes>
                  <Route index element={<TemplateLibraryPage />} />
                  <Route path="preview/:nodeId" element={<TemplatePreviewPage />} />
                </Routes>
              </Suspense>
            </SimulatorPMOLayout>
          </ProtectedRoute>
        </ToastProvider>
      </ThemeProvider>
    </Suspense>
  )
}

/**
 * Organisational Templates — list + detail (parity with Platform
 * /app/pmo/organisational-templates, /app/pmo/organisational-templates/:nodeId).
 */
export function SimPmoOrganisationalTemplatesFederated() {
  return (
    <Suspense fallback={<ModuleLoadingFallback label="Loading Organisational Templates…" />}>
      <ThemeProvider>
        <ToastProvider>
          <ProtectedRoute requiredPlatform="simulator">
            <SimulatorPMOLayout>
              <Suspense fallback={<ModuleLoadingFallback label="Loading Organisational Templates…" />}>
                <Routes>
                  <Route index element={<OrganisationalTemplatesPage />} />
                  <Route path=":nodeId" element={<OrganisationalTemplateDetailPage />} />
                </Routes>
              </Suspense>
            </SimulatorPMOLayout>
          </ProtectedRoute>
        </ToastProvider>
      </ThemeProvider>
    </Suspense>
  )
}
