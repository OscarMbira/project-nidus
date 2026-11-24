/**
 * v1355 — quantitative risk analysis routes, mounted under schedule/risk-analysis
 * and, for the Simulator menu, at /simulator/risk-analysis.
 */
import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'

const QraLayout = lazy(() => import('../screens/qra/QraLayout.jsx'))
const QraInputsScreen = lazy(() => import('../screens/qra/QraInputsScreen.jsx'))
const QraRunScreen = lazy(() => import('../screens/qra/QraRunScreen.jsx'))
const QraResultsScreen = lazy(() => import('../screens/qra/QraResultsScreen.jsx'))
const QraRunsScreen = lazy(() => import('../screens/qra/QraRunsScreen.jsx'))
const QraExposureScreen = lazy(() => import('../screens/qra/QraExposureScreen.jsx'))

export default function QraRoutes({ embedded = false, fallback = null }) {
  return (
    <Suspense fallback={fallback}>
      <Routes>
        <Route element={<QraLayout embedded={embedded} />}>
          <Route index element={<QraInputsScreen />} />
          <Route path="run" element={<QraRunScreen />} />
          <Route path="results/:runId" element={<QraResultsScreen />} />
          <Route path="runs" element={<QraRunsScreen />} />
          <Route path="exposure" element={<QraExposureScreen />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
