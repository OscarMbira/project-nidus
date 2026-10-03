/**
 * PMO Admin Overview widget (v982 Phase 5 follow-up — PMO Admin Home / Account Owner Home)
 * Extracted from pages/platform-app/Dashboard.jsx's PMO Executive Summary branch — same content,
 * same wave-1/wave-2 fetch orchestration, same components (ExecutiveSummary, AIInsightsPanel,
 * PMOExecutiveAlertsPanel, PMODashboardScopeTabs), now self-contained as one widget instead of
 * living inline in the page.
 *
 * WHY ONE WIDGET, NOT SEVERAL (documented, not silent — see the Phase 5 plan file's Review
 * section): ExecutiveSummary / AIInsightsPanel / PMOExecutiveAlertsPanel / PMODashboardScopeTabs
 * all share the SAME wave-1 (getExecutiveSummary + getKPIs) and wave-2 (getPmoExtendedMetrics)
 * fetch — a deliberate performance optimisation already in place before this extraction (rule 66:
 * don't reintroduce a waterfall/redundant-fetch that a prior pass already removed). Splitting
 * these into independently self-fetching widgets, each repeating the same org-wide queries, would
 * be exactly the "repeated fetches of data that barely changes" waste rule 66 warns against — so
 * this extraction keeps them as one cohesive widget with one shared fetch, exactly matching the
 * original's performance characteristics, rather than forcing an arbitrary split for the sake of
 * having more items in the registry.
 *
 * Same audience today's Dashboard.jsx already targets: PMO_LAYOUT_ROLES (pmo_admin, system_admin,
 * account_owner, super_admin, org_admin) — Account Owner and PMO Admin already share this exact
 * view today (account_owner is already a PMO_LAYOUT_ROLES member), so this widget is not
 * duplicated per-persona; PmoAdminHome.jsx uses one requiredRole list covering both.
 */
import { useState, useEffect, Suspense, lazy, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { platformDb } from '@nidus/supabase'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'
import { getExecutiveSummary, getKPIs, getPmoExtendedMetrics } from '../../../services/dashboardService'
import PMODashboardScopeTabs from '../../app/dashboard/PMODashboardScopeTabs'

const ExecutiveSummary = lazy(() => import('../../app/dashboard/ExecutiveSummary'))
const AIInsightsPanel = lazy(() => import('../../ai/AIInsightsPanel'))
const PMOExecutiveAlertsPanel = lazy(() => import('../../app/dashboard/PMOExecutiveAlertsPanel'))

const ComponentLoader = memo(() => (
  <div className="flex items-center justify-center p-8 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
  </div>
))
ComponentLoader.displayName = 'ComponentLoader'

export default function PmoAdminOverviewWidget() {
  const navigate = useNavigate()
  const [accountId, setAccountId] = useState(null)
  const [isOrgAdmin, setIsOrgAdmin] = useState(false)
  const [bundle, setBundle] = useState(null)
  const [status, setStatus] = useState('idle') // idle | loading | ok | error
  const [extendedLoading, setExtendedLoading] = useState(false)
  const [extendedError, setExtendedError] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [id, { data: { user } = {} }] = await Promise.all([getCurrentUserAccountId(), platformDb.auth.getUser()])
      if (cancelled) return
      setAccountId(id)
      if (user) {
        const { data, error } = await platformDb.rpc('is_user_pmo_admin', { p_auth_uuid: user.id })
        if (!cancelled && !error) setIsOrgAdmin(data === true)
      }
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!accountId) return
    let cancelled = false
    setStatus('loading')
    setExtendedError(null)
    setExtendedLoading(false)

    ;(async () => {
      const [e, k] = await Promise.all([getExecutiveSummary(accountId), getKPIs(accountId)])
      if (cancelled) return
      if (!e.success || !k.success) {
        setBundle(null)
        setStatus('error')
        return
      }
      setBundle({ executive: e.data, kpis: k.data, extended: null })
      setStatus('ok')
      setExtendedLoading(true)
      try {
        const x = await getPmoExtendedMetrics(accountId)
        if (cancelled) return
        if (x.success) {
          setBundle((prev) => (prev ? { ...prev, extended: x.data } : null))
          setExtendedError(null)
        } else {
          setExtendedError(x.error || 'Extended metrics could not be loaded.')
        }
      } catch (err) {
        if (!cancelled) setExtendedError(err?.message || 'Extended metrics could not be loaded.')
      } finally {
        if (!cancelled) setExtendedLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [accountId])

  return (
    <PMODashboardScopeTabs
      organizationId={accountId}
      analyticsBundle={status === 'ok' ? bundle : null}
      analyticsStatus={status}
      extendedAnalyticsLoading={extendedLoading}
      isOrgAdmin={isOrgAdmin}
    >
      <>
        {/* Executive Summary — header + Portfolios / Programmes / Projects / Tasks / Teams cards */}
        <div className="mb-8">
          {status === 'loading' || status === 'idle' ? (
            <ComponentLoader />
          ) : (
            <Suspense fallback={<ComponentLoader />}>
              <ExecutiveSummary organizationId={accountId} initialSummary={status === 'ok' ? bundle?.executive : null} />
            </Suspense>
          )}
        </div>

        <div className="mb-8">
          <Suspense fallback={<ComponentLoader />}>
            <AIInsightsPanel orgId={accountId} />
          </Suspense>
          {isOrgAdmin && (
            <p className="text-xs text-gray-600 dark:text-gray-500 mt-2">
              Org-wide: Manage proactive insights and AI settings in{' '}
              <button type="button" onClick={() => navigate('/platform/organization-admin')} className="text-purple-600 dark:text-purple-400 hover:underline">
                Organization Settings
              </button>
              .
            </p>
          )}
        </div>

        <div className="mb-8">
          <Suspense fallback={<ComponentLoader />}>
            <PMOExecutiveAlertsPanel
              loading={status === 'loading' || status === 'idle' || extendedLoading}
              alertsPayload={status === 'ok' ? bundle?.extended?.alerts : null}
              extendedLoadError={status === 'ok' && !extendedLoading ? extendedError : null}
            />
          </Suspense>
        </div>
      </>
    </PMODashboardScopeTabs>
  )
}
