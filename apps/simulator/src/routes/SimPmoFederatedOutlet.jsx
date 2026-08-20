import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import ModuleLoadingFallback from '../components/ui/ModuleLoadingFallback.jsx'
import { ThemeProvider, ToastProvider, ProtectedRoute, SimulatorPMOLayout, SimulatorPMLayout } from './lazyImports.js'

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
const SignatoryRequirementsPage = lazy(() =>
  import('@nidus/sim-pmo-module/pages/SignatoryRequirementsPage.jsx'),
)
const ProjectDocumentsEntry = lazy(() =>
  import('../pages/documents/ProjectDocumentsEntry.jsx'),
)
const SimPmProjectTemplatesEntry = lazy(() =>
  import('../pages/templates/SimPmProjectTemplatesEntry.jsx'),
)
const SimPmOrganisationalTemplatesEntry = lazy(() =>
  import('../pages/templates/SimPmOrganisationalTemplatesEntry.jsx'),
)
const DocumentOversightPortfolioPage = lazy(() =>
  import('@nidus/sim-pmo-module/pages/DocumentOversightPortfolioPage.jsx'),
)
const DocumentOversightProgrammePage = lazy(() =>
  import('@nidus/sim-pmo-module/pages/DocumentOversightProgrammePage.jsx'),
)
const DocumentOversightPmoPage = lazy(() =>
  import('@nidus/sim-pmo-module/pages/DocumentOversightPmoPage.jsx'),
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
 * Organisational Templates, PM-scoped mount (v839 / v864).
 */
export function SimPmOrganisationalTemplatesFederated() {
  return (
    <Suspense fallback={<ModuleLoadingFallback label="Loading Organisational Templates…" />}>
      <ThemeProvider>
        <ToastProvider>
          <ProtectedRoute requiredPlatform="simulator">
            <SimulatorPMLayout>
              <Suspense fallback={<ModuleLoadingFallback label="Loading Organisational Templates…" />}>
                <Routes>
                  <Route index element={<SimPmOrganisationalTemplatesEntry />} />
                  <Route path=":projectId/:nodeId" element={<OrganisationalTemplateDetailPage />} />
                  <Route path=":projectId" element={<SimPmOrganisationalTemplatesEntry />} />
                </Routes>
              </Suspense>
            </SimulatorPMLayout>
          </ProtectedRoute>
        </ToastProvider>
      </ThemeProvider>
    </Suspense>
  )
}

/** Project Templates — PM-scoped project-own copies (v844 / v864). */
export function SimPmProjectTemplatesFederated() {
  return (
    <Suspense fallback={<ModuleLoadingFallback label="Loading Project Templates…" />}>
      <ThemeProvider>
        <ToastProvider>
          <ProtectedRoute requiredPlatform="simulator">
            <SimulatorPMLayout>
              <Suspense fallback={<ModuleLoadingFallback label="Loading Project Templates…" />}>
                <Routes>
                  <Route index element={<SimPmProjectTemplatesEntry />} />
                  <Route path=":projectId/:nodeId" element={<OrganisationalTemplateDetailPage />} />
                  <Route path=":projectId" element={<SimPmProjectTemplatesEntry />} />
                </Routes>
              </Suspense>
            </SimulatorPMLayout>
          </ProtectedRoute>
        </ToastProvider>
      </ThemeProvider>
    </Suspense>
  )
}

/** Project Documents register — process_template Captured / Capture / Restore (v849). */
export function SimPmProjectDocumentsFederated() {
  return (
    <Suspense fallback={<ModuleLoadingFallback label="Loading Project Documents…" />}>
      <ThemeProvider>
        <ToastProvider>
          <ProtectedRoute requiredPlatform="simulator">
            <SimulatorPMLayout>
              <Suspense fallback={<ModuleLoadingFallback label="Loading Project Documents…" />}>
                <Routes>
                  <Route index element={<ProjectDocumentsEntry />} />
                  <Route path=":nodeId" element={<OrganisationalTemplateDetailPage />} />
                </Routes>
              </Suspense>
            </SimulatorPMLayout>
          </ProtectedRoute>
        </ToastProvider>
      </ThemeProvider>
    </Suspense>
  )
}

/**
 * Document Oversight (v897) — read-only cross-project register for Portfolio/Programme/PMO
 * roles, scoped to their own branch of the hierarchy (parity with Platform's
 * portfolio/document-oversight, programme/document-oversight, pmo/document-oversight).
 */
export function SimDocumentOversightFederated() {
  return (
    <Suspense fallback={<ModuleLoadingFallback label="Loading Document Oversight…" />}>
      <ThemeProvider>
        <ToastProvider>
          <ProtectedRoute requiredPlatform="simulator">
            <SimulatorPMOLayout>
              <Suspense fallback={<ModuleLoadingFallback label="Loading Document Oversight…" />}>
                <Routes>
                  <Route path="portfolio" element={<DocumentOversightPortfolioPage />} />
                  <Route path="programme" element={<DocumentOversightProgrammePage />} />
                  <Route path="pmo" element={<DocumentOversightPmoPage />} />
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
                  <Route path="signatory-requirements" element={<SignatoryRequirementsPage />} />
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
