/**
 * v1239 Slice 5 — Nidus Project Planner app (planner.<domain>, D10).
 *   Public: /, /pricing, /login, /signup, /verify, /reset-password
 *   Signed in: /app/* = the shared @nidus/planning routes (schedule + Planning Hub, D17) plus
 *   Home, Projects, Members, Settings, Billing, Upgrade and the invite page. Sections the user's
 *   menu does not grant redirect to /app (routeGuard.js).
 */
import { lazy, Suspense, useMemo } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { platformDb } from '@nidus/supabase'
import { AppConfigProvider } from '@nidus/shared/context/AppConfigContext'
import { ThemeProvider, useTheme } from '@nidus/shared/context/ThemeContext'
import { UnsavedChangesProvider } from '@nidus/shared/context/UnsavedChangesContext'
import { PlanningProvider } from '@nidus/planning/context/PlanningContext.jsx'
import PlannerShell from '@nidus/ui/PlannerShell'
import { AuthProvider, useAuth } from './lib/auth.jsx'
import { WorkspaceProvider, useWorkspace } from './lib/workspace.jsx'
import { isRouteAllowed, flattenMenu } from './lib/routeGuard.js'
import PlannerProjectBar from './components/PlannerProjectBar.jsx'
import { inviteTokenFromPath, readPendingInvite, rememberPendingInvite } from './lib/pendingInvite.js'
import { readPendingPlan } from './lib/pendingPlan.js'
import LandingPage from './pages/public/LandingPage.jsx'
import { LoginPage, SignupPage, VerifyPage, ResetPasswordPage } from './pages/public/AuthPages.jsx'

const PricingPage = lazy(() => import('./pages/public/PricingPage.jsx'))
const HomePage = lazy(() => import('./pages/app/HomePage.jsx'))
const ProjectsListPage = lazy(() => import('./pages/app/ProjectsPages.jsx').then((m) => ({ default: m.ProjectsListPage })))
const ProjectCreatePage = lazy(() => import('./pages/app/ProjectsPages.jsx').then((m) => ({ default: m.ProjectCreatePage })))
const SettingsPage = lazy(() => import('./pages/app/SettingsPage.jsx'))
const MembersPage = lazy(() => import('./pages/app/MembersPage.jsx'))
const InviteAcceptPage = lazy(() => import('./pages/app/InviteAcceptPage.jsx'))
const UpgradePage = lazy(() => import('./pages/app/UpgradePage.jsx'))
const BillingPage = lazy(() => import('./pages/app/BillingPage.jsx'))
const ScheduleRoutes = lazy(() => import('@nidus/planning/routes/ScheduleRoutes.jsx'))
const PlanningHubRoutes = lazy(() => import('@nidus/planning/routes/PlanningHubRoutes.jsx'))

const Spinner = ({ text = 'Loading…' }) => <div className="p-6 text-sm text-gray-600 dark:text-gray-300">{text}</div>

function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Spinner />
  if (!user) {
    const token = inviteTokenFromPath(location.pathname)
    if (token) rememberPendingInvite(token)
    return <Navigate to={token ? '/signup?invited=1' : '/login'} replace state={{ from: `${location.pathname}${location.search}` }} />
  }
  return (
    <WorkspaceProvider>
      <AppLayout />
    </WorkspaceProvider>
  )
}

function AppLayout() {
  const { signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const ws = useWorkspace()
  const { pathname } = useLocation()
  const rows = useMemo(() => flattenMenu(ws.menu), [ws.menu])

  if (ws.loading) return <Spinner text="Opening your workspace…" />
  if (ws.error) {
    return (
      <div className="max-w-lg mx-auto p-8 text-center">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">{ws.error}</p>
        <button type="button" onClick={ws.reload} className="mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm">Try again</button>
      </div>
    )
  }
  const pending = readPendingInvite()
  if (pending && !inviteTokenFromPath(pathname)) return <Navigate to={`/app/invite/${pending}`} replace />
  const pendingPlan = !pending && readPendingPlan()
  if (pendingPlan && pathname !== '/app/upgrade') return <Navigate to={`/app/upgrade?plan=${encodeURIComponent(pendingPlan)}`} replace />
  if (!isRouteAllowed(pathname, rows)) return <Navigate to="/app" replace />

  const ctx = ws.context || {}
  return (
    <PlannerShell
      menu={ws.menu}
      workspace={{ name: ctx.account_name, userName: ctx.full_name, email: ctx.email }}
      status={ctx.status}
      upgradePath="/app/upgrade"
      onSignOut={signOut}
      theme={theme}
      onToggleTheme={toggleTheme}
    >
      <Suspense fallback={<Spinner />}>
        <Outlet />
      </Suspense>
    </PlannerShell>
  )
}

export function PlannerRoutes() {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/verify" element={<VerifyPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/app" element={<RequireAuth />}>
          <Route index element={<HomePage />} />
          <Route path="projects" element={<ProjectsListPage />} />
          <Route path="projects/new" element={<ProjectCreatePage />} />
          <Route path="schedule/*" element={<ScheduleRoutes fallback={<Spinner />} />} />
          <Route path="planning/*" element={<PlanningHubRoutes fallback={<Spinner />} />} />
          <Route path="members" element={<MembersPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="billing" element={<BillingPage />} />
          <Route path="upgrade" element={<UpgradePage />} />
          <Route path="invite/:token" element={<InviteAcceptPage />} />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <UnsavedChangesProvider>
        <ThemeProvider>
          <AppConfigProvider app="planner" basePath="/app" db={platformDb}>
            <PlanningProvider mode="planner" basePath="/app/planning" ProjectBar={PlannerProjectBar}>
              <AuthProvider>
                <PlannerRoutes />
                <Toaster position="top-right" />
              </AuthProvider>
            </PlanningProvider>
          </AppConfigProvider>
        </ThemeProvider>
      </UnsavedChangesProvider>
    </BrowserRouter>
  )
}
