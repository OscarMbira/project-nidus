/**
 * PMO scope tabs: Overview | Portfolio | Programmes | Projects
 * Syncs with ?tab= on /platform/dashboard (shareable links).
 * Non-overview tabs show dashboard metrics (not entity record tables), then risk / resources / activity.
 */
import { startTransition, lazy, Suspense } from 'react'
import { useSearchParams } from 'react-router-dom'
import { LayoutGrid, Briefcase, Layers, FolderKanban, Bell, Scale } from 'lucide-react'
import { normalizeDashboardTab } from '../../../utils/pmoDashboardTabs'
import PMOScopeQuickActions from './PMOScopeQuickActions'

const PMOScopeOverviewMetrics = lazy(() => import('./PMOScopeOverviewMetrics'))
const PmoDashboardInsightsSection = lazy(() => import('./PmoDashboardInsightsSection'))
const PMOAlertsTab = lazy(() => import('./PMOAlertsTab'))
const PMOGovernanceTab = lazy(() => import('./PMOGovernanceTab'))

const ScopeTabFallback = () => (
  <div className="flex items-center justify-center p-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
    <div
      className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"
      aria-hidden
    />
  </div>
)

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'portfolio', label: 'Portfolio', icon: Briefcase },
  { id: 'programmes', label: 'Programmes', icon: Layers },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'alerts', label: 'Alerts', icon: Bell },
  { id: 'governance', label: 'Governance', icon: Scale },
]

export default function PMODashboardScopeTabs({
  organizationId,
  children,
  analyticsBundle = null,
  analyticsStatus = 'idle',
  /** True while getPmoExtendedMetrics is still running (Overview can already show exec + KPIs). */
  extendedAnalyticsLoading = false,
  isOrgAdmin = false,
}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = normalizeDashboardTab(searchParams.get('tab'))

  const setTab = (id) => {
    startTransition(() => {
      setSearchParams(
        (prev) => {
          const n = new URLSearchParams(prev)
          if (id === 'overview') n.delete('tab')
          else n.set('tab', id)
          return n
        },
        { replace: true }
      )
    })
  }

  return (
    <>
      <nav
        className="flex flex-wrap gap-1 mb-8 border-b border-gray-200 dark:border-gray-700"
        aria-label="PMO dashboard scope"
      >
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition-colors border-b-2 -mb-px ${
                active
                  ? 'bg-gray-100 dark:bg-gray-800/80 text-gray-900 dark:text-white border-blue-500'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 border-transparent hover:bg-gray-100 dark:hover:bg-gray-800/40'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              {label}
            </button>
          )
        })}
      </nav>

      {tab === 'overview' ? (
        children
      ) : tab === 'alerts' || tab === 'governance' ? (
        <section className="mb-8" aria-labelledby={`pmo-tab-${tab}-heading`}>
          <h2 id={`pmo-tab-${tab}-heading`} className="sr-only">
            {TABS.find((t) => t.id === tab)?.label || tab}
          </h2>
          <Suspense fallback={<ScopeTabFallback />}>
            {tab === 'alerts' ? (
              <PMOAlertsTab
                organizationId={organizationId}
                analyticsBundle={analyticsBundle}
                analyticsStatus={analyticsStatus}
                extendedAnalyticsLoading={extendedAnalyticsLoading}
              />
            ) : (
              <PMOGovernanceTab
                organizationId={organizationId}
                analyticsBundle={analyticsBundle}
                analyticsStatus={analyticsStatus}
              />
            )}
          </Suspense>
        </section>
      ) : (
        <section className="mb-8" aria-labelledby={`pmo-tab-${tab}-heading`}>
          <h2 id={`pmo-tab-${tab}-heading`} className="sr-only">
            {TABS.find((t) => t.id === tab)?.label || tab}
          </h2>
          <PMOScopeQuickActions scope={tab} isOrgAdmin={isOrgAdmin} />
          <Suspense fallback={<ScopeTabFallback />}>
            <PMOScopeOverviewMetrics
              organizationId={organizationId}
              analyticsBundle={analyticsBundle}
              analyticsStatus={analyticsStatus}
              scope={tab}
            />
          </Suspense>
          <div className="mt-8">
            <Suspense fallback={<ScopeTabFallback />}>
              <PmoDashboardInsightsSection organizationId={organizationId} />
            </Suspense>
          </div>
        </section>
      )}
    </>
  )
}
