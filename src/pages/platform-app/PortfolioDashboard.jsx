import { useState, useEffect } from 'react'
import { Briefcase, TrendingUp, DollarSign, Activity, RefreshCw, AlertCircle } from 'lucide-react'
import { getPortfolios } from '../../services/portfolioService'
import { getAllPortfolioProjects } from '../../services/portfolioService'
import { platformDb } from '../../services/supabase/supabaseClient'
import PmoDashboardInsightsSection from '../../components/app/dashboard/PmoDashboardInsightsSection'
import { TableRowNumberHeader, TableRowNumberCell } from '../../components/ui/Table'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'

function KpiCard({ label, value, icon: Icon, colour }) {
  return (
    <div className="bg-gray-800 dark:bg-gray-800 light:bg-white border border-gray-700 dark:border-gray-700 light:border-gray-200 rounded-lg p-5 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${colour}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-400">{label}</p>
        <p className="text-2xl font-bold text-white dark:text-white light:text-gray-900">{value}</p>
      </div>
    </div>
  )
}

function healthBadge(score) {
  if (score == null) return <span className="text-gray-500 text-xs">N/A</span>
  const pct = Math.round(score)
  const colour = pct >= 70 ? 'bg-green-600' : pct >= 40 ? 'bg-yellow-600' : 'bg-red-600'
  return (
    <span className={`${colour} text-white text-xs px-2 py-0.5 rounded-full`}>{pct}%</span>
  )
}

function statusBadge(status) {
  const map = {
    active: 'bg-green-700 text-green-100',
    inactive: 'bg-gray-600 text-gray-200',
    planning: 'bg-blue-700 text-blue-100',
    closed: 'bg-red-700 text-red-100',
  }
  const cls = map[status] || 'bg-gray-600 text-gray-200'
  return <span className={`${cls} text-xs px-2 py-0.5 rounded-full capitalize`}>{status || '—'}</span>
}

export default function PortfolioDashboard() {
  const [portfolios, setPortfolios] = useState([])
  const [projectCount, setProjectCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [organizationId, setOrganizationId] = useState(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [pf, pp] = await Promise.all([
        getPortfolios(),
        getAllPortfolioProjects({ status: 'active' }),
      ])
      setPortfolios(pf || [])
      setProjectCount((pp || []).length)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data: { user } } = await platformDb.auth.getUser()
        if (!user || cancelled) return
        const { data: userRecord } = await platformDb.from('users').select('id').eq('auth_user_id', user.id).single()
        if (!userRecord || cancelled) return
        const { data: account } = await platformDb.from('accounts').select('id').eq('owner_user_id', userRecord.id).maybeSingle()
        if (!cancelled && account?.id) setOrganizationId(account.id)
      } catch (e) {
        console.warn('[PortfolioDashboard] account resolve:', e)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const activeCount   = portfolios.filter(p => p.portfolio_status === 'active').length
  const totalBudget   = portfolios.reduce((s, p) => s + (p.total_budget || 0), 0)
  const avgHealth     = portfolios.length
    ? portfolios.reduce((s, p) => s + (p.overall_health_score || 0), 0) / portfolios.length
    : 0

  const fmt = n => n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
    ? `$${(n / 1_000).toFixed(0)}K`
    : `$${n}`

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <span>{error}</span>
        <button onClick={load} className="ml-auto text-sm underline">Retry</button>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white dark:text-white light:text-gray-900">
            Portfolio Dashboard
          </h1>
          <p className="text-gray-400 text-sm mt-1">Executive overview across all portfolios</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Portfolios"  value={portfolios.length} icon={Briefcase}   colour="bg-blue-600" />
        <KpiCard label="Active Portfolios" value={activeCount}        icon={Activity}    colour="bg-green-600" />
        <KpiCard label="Total Budget"      value={fmt(totalBudget)}   icon={DollarSign}  colour="bg-blue-600" />
        <KpiCard label="Avg Health Score"  value={`${Math.round(avgHealth)}%`} icon={TrendingUp} colour="bg-orange-600" />
      </div>

      {organizationId && (
        <PmoDashboardInsightsSection organizationId={organizationId} />
      )}

      {/* Portfolio Health Table */}
      <div className="bg-gray-800 dark:bg-gray-800 light:bg-white border border-gray-700 dark:border-gray-700 light:border-gray-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-700">
          <h2 className="text-white dark:text-white light:text-gray-900 font-semibold">Portfolio Health Overview</h2>
        </div>
        {portfolios.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No portfolios found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-750 border-b border-gray-700">
                <TableRowNumberHeader className="!normal-case" />
                  {['Name', 'Code', 'Status', 'Projects', 'Budget', 'Health', 'Owner'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-gray-400 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {portfolios.map((p, i) => (
                  <tr
                    key={p.id}
                    className={`border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-700/10'}`}
                  >
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="px-4 py-3 text-white font-medium">{p.portfolio_name}</td>
                    <td className="px-4 py-3 text-gray-300 font-mono text-xs">{p.portfolio_code}</td>
                    <td className="px-4 py-3">{statusBadge(p.portfolio_status)}</td>
                    <td className="px-4 py-3 text-gray-300">{projectCount}</td>
                    <td className="px-4 py-3 text-gray-300">{fmt(p.total_budget || 0)}</td>
                    <td className="px-4 py-3">{healthBadge(p.overall_health_score)}</td>
                    <td className="px-4 py-3 text-gray-300">{p.portfolio_owner?.full_name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
