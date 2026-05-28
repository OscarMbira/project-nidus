import { useEffect, useState } from 'react'
import { Route } from 'react-router-dom'
import { Suspense } from 'react'
import ProtectedRoute from '../../../components/ProtectedRoute'
import { ThemeProvider } from '../../../context/ThemeContext'
import { ToastProvider } from '../../../context/ToastContext'
import PMLayout from '../../../components/pm/PMLayout'
import PMOLayout from '../../../components/pmo/PMOLayout'
import SimulatorPMOLayout from '../../../components/sim/pmo/SimulatorPMOLayout'
import SimulatorPMLayout from '../../../components/sim/pm/SimulatorPMLayout'
import Layout from '../../../components/Layout'
import * as platformService from '../../../services/recordLifecycleService'
import * as simService from '../../../services/sim/simRecordLifecycleService'

const Loading = () => (
  <div className="min-h-[40vh] flex items-center justify-center">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
  </div>
)

function withProviders(el, { simulator = false } = {}) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ProtectedRoute requiredPlatform={simulator ? 'simulator' : 'platform'}>{el}</ProtectedRoute>
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

function wrapSimPmo(el) {
  return (
    <Suspense fallback={<Loading />}>
      {withProviders(<SimulatorPMOLayout>{el}</SimulatorPMOLayout>, { simulator: true })}
    </Suspense>
  )
}

function wrapSimPm(el) {
  return (
    <Suspense fallback={<Loading />}>
      {withProviders(<SimulatorPMLayout>{el}</SimulatorPMLayout>, { simulator: true })}
    </Suspense>
  )
}

function wrapSimTm(el) {
  return (
    <Suspense fallback={<Loading />}>
      {withProviders(<Layout>{el}</Layout>, { simulator: true })}
    </Suspense>
  )
}

function LazyPage({ page, service, ...rest }) {
  const [Comp, setComp] = useState(null)

  useEffect(() => {
    import('../pages/LifecyclePages.jsx').then((mod) => setComp(() => mod[page]))
  }, [page])

  if (!Comp) return <Loading />
  return <Comp service={service} {...rest} />
}

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

      <Route path="simulator/pmo/authorisation/queue" element={wrapSimPmo(<LazyPage page="AuthorisationQueuePage" service={simService} pmoView title="Practice Authorisation Queue" />)} />
      <Route path="simulator/pmo/authorisation/dashboard" element={wrapSimPmo(<LazyPage page="LifecycleDashboardPage" service={simService} title="Practice Lifecycle Dashboard" />)} />
      <Route path="simulator/pmo/authorisation/configure" element={wrapSimPmo(<LazyPage page="ConfigureLifecycleRulesPage" service={simService} title="Configure Practice Lifecycle Rules" />)} />
      <Route path="simulator/pmo/authorisation/chains" element={wrapSimPmo(<LazyPage page="ApprovalChainsOverviewPage" service={simService} title="Practice Approval Chains" />)} />
      <Route path="simulator/pmo/authorisation/archive-retention" element={wrapSimPmo(<LazyPage page="ArchiveRetentionRulesPage" service={simService} title="Practice Archive Retention Rules" />)} />
      <Route path="simulator/pmo/authorisation/archive" element={wrapSimPmo(<LazyPage page="ArchiveVaultPage" service={simService} title="Practice Archive Vault" />)} />

      <Route path="simulator/pm/authorisation/queue" element={wrapSimPm(<LazyPage page="PendingApprovalsPage" service={simService} title="Practice Pending Approvals" />)} />
      <Route path="simulator/pm/authorisation/submitted" element={wrapSimPm(<LazyPage page="MySubmittedRecordsPage" service={simService} title="My Practice Submitted Records" />)} />
      <Route path="simulator/pm/authorisation/chains" element={wrapSimPm(<LazyPage page="ApprovalChainsOverviewPage" service={simService} title="Practice Approval Chains" />)} />

      <Route path="simulator/tm/authorisation/submitted" element={wrapSimTm(<LazyPage page="MySubmittedRecordsPage" service={simService} title="My Submitted Records" />)} />
    </>
  )
}

export default RecordLifecycleRouteElements
