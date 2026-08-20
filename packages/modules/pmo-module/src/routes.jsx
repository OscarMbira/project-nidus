import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import ModuleLoadingFallback from '@nidus/ui/ModuleLoadingFallback.jsx'

const ModuleHome = lazy(() => import('./pages/ModuleHome.jsx'))
const PmoFieldTemplatesListPage = lazy(() => import('./pages/PmoFieldTemplatesListPage.jsx'))
const PmoFieldTemplateDetailPage = lazy(() => import('./pages/PmoFieldTemplateDetailPage.jsx'))
const TemplateLibraryPage = lazy(() => import('./pages/TemplateLibraryPage.jsx'))
const TemplatePreviewPage = lazy(() => import('./pages/TemplatePreviewPage.jsx'))
const OrganisationalTemplatesPage = lazy(() => import('./pages/OrganisationalTemplatesPage.jsx'))
const OrganisationalTemplateDetailPage = lazy(() => import('./pages/OrganisationalTemplateDetailPage.jsx'))
const SignatoryRequirementsPage = lazy(() => import('./pages/SignatoryRequirementsPage.jsx'))

export default function ModuleRoutes() {
  return (
    <Suspense fallback={<ModuleLoadingFallback label="Loading PMO…" />}>
      <Routes>
        <Route index element={<ModuleHome />} />
        <Route path="template-library" element={<TemplateLibraryPage />} />
        <Route path="template-library/preview/:nodeId" element={<TemplatePreviewPage />} />
        <Route path="organisational-templates" element={<OrganisationalTemplatesPage />} />
        <Route path="signatory-requirements" element={<SignatoryRequirementsPage />} />
        <Route path="organisational-templates/:nodeId" element={<OrganisationalTemplateDetailPage />} />
        <Route path="field-templates" element={<PmoFieldTemplatesListPage />} />
        <Route path="field-templates/:nodeId" element={<PmoFieldTemplateDetailPage />} />
        <Route path="*" element={<ModuleHome />} />
      </Routes>
    </Suspense>
  )
}
