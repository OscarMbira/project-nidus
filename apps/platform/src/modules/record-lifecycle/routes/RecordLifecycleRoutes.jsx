import { useEffect, useState } from 'react'
import { Route, Outlet } from 'react-router-dom'
import { Suspense } from 'react'
import ProtectedRoute from '../../../components/ProtectedRoute'
import { ThemeProvider } from '@nidus/shared/context/ThemeContext'
import { ToastProvider } from '@nidus/shared/context/ToastContext'
import PMLayout from '../../../components/pm/PMLayout'
import PMOLayout from '../../../components/pmo/PMOLayout'
import * as platformService from '../../../services/recordLifecycleService'

const Loading = () => (
  <div className="min-h-[40vh] flex items-center justify-center">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
  </div>
)

function withProviders(el) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ProtectedRoute requiredPlatform="platform">{el}</ProtectedRoute>
      </ToastProvider>
    </ThemeProvider>
  )
}

function wrapPmo(el) {
  return <Suspense fallback={<Loading />}>{withProviders(<PMOLayout>{el}</PMOLayout>)}</Suspense>
}

function wrapPm(el) {
  return <Suspense fallback={<Loading />}>{withProviders(<PMLayout>{el}</PMLayout>)}</Suspense>
}

function wrapPmoOutlet() {
  return <Suspense fallback={<Loading />}>{withProviders(<PMOLayout><Outlet /></PMOLayout>)}</Suspense>
}

function wrapPmOutlet() {
  return <Suspense fallback={<Loading />}>{withProviders(<PMLayout><Outlet /></PMLayout>)}</Suspense>
}

function LazyPage({ page, service, ...rest }) {
  const [Comp, setComp] = useState(null)

  useEffect(() => {
    import('../pages/LifecyclePages.jsx').then((mod) => setComp(() => mod[page]))
  }, [page])

  if (!Comp) return <Loading />
  return <Comp service={service} {...rest} />
}

/** Platform-only record lifecycle routes (v730 — simulator routes live in apps/simulator). */
export function RecordLifecycleRouteElements() {
  return (
    <>
      <Route element={wrapPmoOutlet()}>
        <Route path="pmo/authorisation/queue" element={<LazyPage page="AuthorisationQueuePage" service={platformService} pmoView />} />
        <Route path="pmo/authorisation/dashboard" element={<LazyPage page="LifecycleDashboardPage" service={platformService} />} />
        <Route path="pmo/authorisation/configure" element={<LazyPage page="ConfigureLifecycleRulesPage" service={platformService} />} />
        <Route path="pmo/authorisation/chains" element={<LazyPage page="ApprovalChainsOverviewPage" service={platformService} />} />
        <Route path="pmo/authorisation/archive-retention" element={<LazyPage page="ArchiveRetentionRulesPage" service={platformService} />} />
        <Route path="pmo/authorisation/archive" element={<LazyPage page="ArchiveVaultPage" service={platformService} />} />
      </Route>

      <Route element={wrapPmOutlet()}>
        <Route path="pm/authorisation/queue" element={<LazyPage page="PendingApprovalsPage" service={platformService} />} />
        <Route path="pm/authorisation/submitted" element={<LazyPage page="MySubmittedRecordsPage" service={platformService} />} />
        <Route path="pm/authorisation/chains" element={<LazyPage page="ApprovalChainsOverviewPage" service={platformService} title="Approval Chains (Read-only)" />} />
      </Route>
    </>
  )
}

export default RecordLifecycleRouteElements
