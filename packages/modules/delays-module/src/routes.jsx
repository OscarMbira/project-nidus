import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import ModuleLoadingFallback from '@nidus/ui/ModuleLoadingFallback.jsx'

const ModuleHome = lazy(() => import('./pages/ModuleHome.jsx'))

export default function ModuleRoutes() {
  return (
    <Suspense fallback={<ModuleLoadingFallback label="Loading Delays…" />}>
      <Routes>
        <Route index element={<ModuleHome />} />
        <Route path="*" element={<ModuleHome />} />
      </Routes>
    </Suspense>
  )
}
