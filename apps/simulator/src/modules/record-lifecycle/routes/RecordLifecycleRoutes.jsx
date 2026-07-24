import { useEffect, useState } from 'react'
import { Route } from 'react-router-dom'
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
      <Route path="pmo/authorisation/queue" element={wrapPmo(<LazyPage page="AuthorisationQueuePage" service={platformService} pmoView />)} />
      <Route path="pmo/authorisation/dashboard" element={wrapPmo(<LazyPage page="LifecycleDashboardPage" service={platformService} />)} />
      <Route path="pmo/authorisation/configure" element={wrapPmo(<LazyPage page="ConfigureLifecycleRulesPage" service={platformService} />)} />
      <Route path="pmo/authorisation/chains" element={wrapPmo(<LazyPage page="ApprovalChainsOverviewPage" service={platformService} />)} />
      <Route path="pmo/authorisation/archive-retention" element={wrapPmo(<LazyPage page="ArchiveRetentionRulesPage" service={platformService} />)} />
      <Route path="pmo/authorisation/archive" element={wrapPmo(<LazyPage page="ArchiveVaultPage" service={platformService} />)} />

      <Route path="pm/authorisation/queue" element={wrapPm(<LazyPage page="PendingApprovalsPage" service={platformService} />)} />
      <Route path="pm/authorisation/submitted" element={wrapPm(<LazyPage page="MySubmittedRecordsPage" service={platformService} />)} />
      <Route path="pm/authorisation/chains" element={wrapPm(<LazyPage page="ApprovalChainsOverviewPage" service={platformService} title="Approval Chains (Read-only)" />)} />
    </>
  )
}

export default RecordLifecycleRouteElements
