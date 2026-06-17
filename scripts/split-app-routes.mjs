/**
 * One-time script: splits src/App.jsx route JSX into domain route files.
 * Run: node scripts/split-app-routes.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const appPath = path.join(root, 'src', 'App.jsx')

const content = fs.readFileSync(appPath, 'utf8')
const lines = content.split('\n')

// Line numbers are 1-based in editor; convert to 0-based slices
const SLICE = {
  destructuring: [53, 249], // const { ... } = LP
  helpers: [14, 274], // LoadingFallbackWithTimeout through LoginPageSkeleton
  public: [307, 500],
  platform: [501, 5277], // platform/* + app redirect + auth start through PM routes
  auth: [3427, 3470],
  platformOnly: [501, 3423],
  platformPm: [3471, 5277],
  appRedirect: [3424, 3426],
  simulator: [5278, 10187],
  onboarding: [10188, 10277],
}

function sliceLines(start, end) {
  return lines.slice(start - 1, end).join('\n')
}

const destructuring = sliceLines(...SLICE.destructuring)
const helpersBlock = sliceLines(14, 43) + '\n' + sliceLines(45, 51) + '\n' + sliceLines(251, 274)

const lpNames = destructuring
  .match(/const \{([\s\S]*)\} = LP/)[1]
  .split(',')
  .map((s) => s.trim().split(/\s+/)[0])
  .filter(Boolean)

const exportNames = [
  'LoadingFallbackWithTimeout',
  'LoadingFallback',
  'LoginPageSkeleton',
  'RedirectProjectsTemplatesToLibrary',
  ...lpNames,
]

const routeCommon = `import { Navigate, useParams, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import * as LP from './lazyImports'

${helpersBlock}

${destructuring}

export {
  ${exportNames.join(',\n  ')}
}
`

const routeImports = `/** ROUTE_MODULE */
import { Route, Navigate } from 'react-router-dom'
import { Suspense } from 'react'
import AppToPlatformRedirect from '../components/AppToPlatformRedirect'
import { PmisGapRouteElements } from '../modules/pmis-gaps/routes/PmisGapRoutes.jsx'
import { RecordLifecycleRouteElements } from '../modules/record-lifecycle/routes/RecordLifecycleRoutes.jsx'
import {
  LoadingFallback,
  LoadingFallbackWithTimeout,
  LoginPageSkeleton,
  RedirectProjectsTemplatesToLibrary,
  ${lpNames.join(',\n  ')}
} from './routeCommon'
`

function buildRouteModule(name, exportName, slices) {
  const body = slices.map(([s, e]) => sliceLines(s, e)).join('\n\n')
  return `${routeImports.replace('/** ROUTE_MODULE */', `/** ${name} — extracted from App.jsx (v729 Option B) */`)}

export function ${exportName}() {
  return (
    <>
${body.split('\n').map(l => l ? '      ' + l : l).join('\n')}
    </>
  )
}
`
}

const publicRoutes = buildRouteModule('Public routes', 'PublicRouteElements', [[307, 500]])
const authRoutes = buildRouteModule('Auth routes', 'AuthRouteElements', [
  [3427, 3470],
  [10188, 10277],
])
const platformRoutes = buildRouteModule('Platform routes', 'PlatformRouteElements', [
  [501, 3423],
  [3424, 3426],
  [3471, 5277],
])
const simulatorRoutes = buildRouteModule('Simulator routes', 'SimulatorRouteElements', [[5278, 10187]])

const thinApp = `import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense } from 'react'
import { Toaster } from 'react-hot-toast'
import ErrorBoundary from './components/ErrorBoundary'
import OfflineIndicator from './components/pwa/OfflineIndicator'
import PWAUpdatePrompt from './components/pwa/PWAUpdatePrompt'
import { PublicRouteElements } from './routes/publicRoutes'
import { AuthRouteElements } from './routes/authRoutes'
import { PlatformRouteElements } from './routes/platformRoutes'
import { SimulatorRouteElements } from './routes/simulatorRoutes'
import * as RC from './routes/routeCommon'

const { PWAInstallPrompt } = RC

function App() {
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
        <OfflineIndicator />
        <PWAUpdatePrompt />
        <Routes>
          <PublicRouteElements />
          <PlatformRouteElements />
          <AuthRouteElements />
          <SimulatorRouteElements />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Suspense fallback={null}>
          <PWAInstallPrompt />
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
`

fs.writeFileSync(path.join(root, 'src', 'routes', 'routeCommon.jsx'), routeCommon)
fs.writeFileSync(path.join(root, 'src', 'routes', 'publicRoutes.jsx'), publicRoutes)
fs.writeFileSync(path.join(root, 'src', 'routes', 'authRoutes.jsx'), authRoutes)
fs.writeFileSync(path.join(root, 'src', 'routes', 'platformRoutes.jsx'), platformRoutes)
fs.writeFileSync(path.join(root, 'src', 'routes', 'simulatorRoutes.jsx'), simulatorRoutes)

// Backup original App.jsx
fs.writeFileSync(path.join(root, 'src', 'App.jsx.backup-v729'), content)
fs.writeFileSync(path.join(root, 'src', 'App.jsx'), thinApp)

console.log('Split complete:')
console.log('  routeCommon.jsx')
console.log('  publicRoutes.jsx, authRoutes.jsx, platformRoutes.jsx, simulatorRoutes.jsx')
console.log('  App.jsx (thin orchestrator)')
console.log('  App.jsx.backup-v729 (original backup)')
