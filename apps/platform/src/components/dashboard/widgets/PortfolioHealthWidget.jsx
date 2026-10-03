/**
 * Portfolio Health widget (v982 Phase 5 follow-up — Portfolio Manager Home)
 * Roll-up health across the portfolio's child programmes/projects — reads the portfolio's own
 * pre-computed rollup columns (SQL/v36_portfolio_management.sql: overall_health_score,
 * total_projects_count, active/completed/on_hold/cancelled_projects_count, total_risks_count,
 * high_risks_count, risk_exposure_score) via the existing getPortfolio() rather than building a
 * new aggregation query — these columns already exist specifically for this purpose.
 * requiredScope: ['portfolioId'] — mounted only on Portfolio Manager Home.
 */
import { useState, useEffect } from 'react'
import { getPortfolio } from '../../../services/portfolioService'
import { useCurrentPortfolio } from '../../../context/CurrentPortfolioContext'
import { Activity, AlertTriangle } from 'lucide-react'

function healthColour(score) {
  if (score == null) return 'text-gray-500 dark:text-gray-400'
  if (score >= 70) return 'text-green-600 dark:text-green-400'
  if (score >= 40) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

export default function PortfolioHealthWidget() {
  const { portfolioId } = useCurrentPortfolio()
  const [portfolio, setPortfolio] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!portfolioId) { setLoading(false); return }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const data = await getPortfolio(portfolioId)
        if (!cancelled) setPortfolio(data)
      } catch {
        if (!cancelled) setPortfolio(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [portfolioId])

  if (loading) return <div className="animate-pulse h-40 bg-gray-100 dark:bg-gray-800 rounded-lg" />
  if (!portfolio) return null

  const cards = [
    { label: 'Active', value: portfolio.active_projects_count ?? 0, colour: 'text-green-600 dark:text-green-400' },
    { label: 'Completed', value: portfolio.completed_projects_count ?? 0, colour: 'text-blue-600 dark:text-blue-400' },
    { label: 'On Hold', value: portfolio.on_hold_projects_count ?? 0, colour: 'text-amber-600 dark:text-amber-400' },
    { label: 'Cancelled', value: portfolio.cancelled_projects_count ?? 0, colour: 'text-red-600 dark:text-red-400' },
  ]

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          Portfolio Health — {portfolio.portfolio_name}
        </h2>
        <span className={`text-2xl font-bold ${healthColour(portfolio.overall_health_score)}`}>
          {portfolio.overall_health_score != null ? `${Math.round(portfolio.overall_health_score)}%` : 'N/A'}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg bg-gray-50 dark:bg-gray-700/50 p-3 text-center">
            <p className={`text-xl font-bold ${c.colour}`}>{c.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{c.label}</p>
          </div>
        ))}
      </div>
      {(portfolio.total_risks_count ?? 0) > 0 && (
        <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4" />
          {portfolio.total_risks_count} risk{portfolio.total_risks_count === 1 ? '' : 's'} logged
          {(portfolio.high_risks_count ?? 0) > 0 && ` (${portfolio.high_risks_count} high)`}
        </div>
      )}
    </div>
  )
}
