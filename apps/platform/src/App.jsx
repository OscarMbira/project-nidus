import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense } from 'react'
import { Toaster } from 'react-hot-toast'
import { UnsavedChangesProvider } from '@nidus/shared/context/UnsavedChangesContext'
import { LanguageProvider } from '@nidus/shared/context/LanguageContext'
import ErrorBoundary from './components/ErrorBoundary'
import OfflineIndicator from './components/pwa/OfflineIndicator'
import PWAUpdatePrompt from './components/pwa/PWAUpdatePrompt'
import { PublicRouteElements } from './routes/publicRoutes'
import { AuthRouteElements } from './routes/authRoutes'
import { PlatformRouteElements } from './routes/platformRoutes'
import * as RC from './routes/routeCommon'

const { PWAInstallPrompt } = RC

/** Platform-only SPA shell (v730 monorepo). */
export default function App() {
  return (
    <ErrorBoundary>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { background: '#363636', color: '#fff' },
          success: { duration: 3000, iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error: { duration: 4000, iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <LanguageProvider>
          <UnsavedChangesProvider>
            <OfflineIndicator />
            <PWAUpdatePrompt />
            <Routes>
              {PublicRouteElements()}
              {PlatformRouteElements()}
              {AuthRouteElements()}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <Suspense fallback={null}>
              <PWAInstallPrompt />
            </Suspense>
          </UnsavedChangesProvider>
        </LanguageProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
