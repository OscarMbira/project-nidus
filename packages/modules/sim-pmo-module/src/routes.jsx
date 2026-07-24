import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import ModuleLoadingFallback from '@nidus/ui/ModuleLoadingFallback.jsx'

const ModuleHome = lazy(() => import('./pages/ModuleHome.jsx'))
const PmoFieldTemplatesListPage = lazy(() => import('./pages/PmoFieldTemplatesListPage.jsx'))
const PmoFieldTemplateDetailPage = lazy(() => import('./pages/PmoFieldTemplateDetailPage.jsx'))

/**
 * Mounted at /simulator/pmo/field-templates/* in the shell,
 * so list is index and detail is :nodeId.
 * Template Library is a separate shell route (see simulatorRoutes.jsx).
 */
export default function ModuleRoutes() {
  return (
    <Suspense fallback={<ModuleLoadingFallback label="Loading Sim PMO…" />}>
      <Routes>
        <Route index element={<PmoFieldTemplatesListPage />} />
        <Route path=":nodeId" element={<PmoFieldTemplateDetailPage />} />
        <Route path="*" element={<ModuleHome />} />
      </Routes>
    </Suspense>
  )
}
