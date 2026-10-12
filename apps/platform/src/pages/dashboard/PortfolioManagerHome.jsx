/**
 * Portfolio Manager Home (v982 Phase 5 follow-up — Role-Aware Home Pages)
 * Framework-composed: PORTFOLIO_MANAGER_HOME_WIDGETS, scoped to the viewer's current portfolio
 * (CurrentPortfolioProvider — mirrors CurrentProjectProvider's pattern, own provider mounted here
 * since there's no dedicated /portfolio-manager/* route tree to inherit one from).
 */
import { CurrentPortfolioProvider, useCurrentPortfolio } from '../../lib/CurrentPortfolioContext'
import DashboardFramework from '../../components/dashboard/DashboardFramework'
import { useDashboardViewerContext } from '../../components/dashboard/useDashboardViewerContext'
import { PORTFOLIO_MANAGER_HOME_WIDGETS } from '../../components/dashboard/widgetRegistry'

function PortfolioManagerHomeContent() {
  const { portfolios, portfolioId, currentPortfolio, setPortfolioId, loading: portfoliosLoading } = useCurrentPortfolio()
  const { context } = useDashboardViewerContext({ portfolioId })

  if (portfoliosLoading) {
    return <div className="flex items-center justify-center min-h-[40vh] text-gray-500 dark:text-gray-400">Loading your portfolios…</div>
  }

  if (portfolios.length === 0) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Portfolio Manager Home</h1>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            You're not an explicit member of any portfolio yet — ask a PMO Admin to grant you a Portfolio Manager role from the portfolio's Members page.
          </p>
        </div>
      </div>
    )
  }

  return (
    <DashboardFramework
      widgets={PORTFOLIO_MANAGER_HOME_WIDGETS}
      viewerContext={context}
      title="Portfolio Manager Home"
      subtitle={currentPortfolio ? `Viewing ${currentPortfolio.name}` : undefined}
      headerExtra={
        portfolios.length > 1 && (
          <select
            value={portfolioId || ''}
            onChange={(e) => setPortfolioId(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
          >
            {portfolios.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )
      }
    />
  )
}

export default function PortfolioManagerHome() {
  return (
    <CurrentPortfolioProvider>
      <PortfolioManagerHomeContent />
    </CurrentPortfolioProvider>
  )
}
