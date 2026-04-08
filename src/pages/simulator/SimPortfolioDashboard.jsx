import { useState, useEffect } from 'react'
import { Briefcase, TrendingUp, DollarSign, Activity, RefreshCw, AlertCircle } from 'lucide-react'
import { getSimPortfolios, getAllSimPortfolioProjects } from '../../services/simPortfolioService'

function KpiCard({ label, value, icon: Icon, colour }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-5 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${colour}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-400">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
  )
}

function healthBadge(score) {
  if (score == null) return <span className="text-gray-500 text-xs">N/A</span>
  const pct = Math.round(score)
  const colour = pct >= 70 ? 'bg-green-600' : pct >= 40 ? 'bg-yellow-600' : 'bg-red-600'
  return <span className={`${colour} text-white text-xs px-2 py-0.5 rounded-full`}>{pct}%</span>
}

function statusBadge(s) {
  const map = {
    active:    'bg-green-700 text-green-100',
    planning:  'bg-blue-700 text-blue-100',
    completed: 'bg-gray-600 text-gray-200',
    cancelled: 'bg-red-700 text-red-100',
    'on-hold': 'bg-yellow-700 text-yellow-100',
  }
  return <span className={`${map[s] || 'bg-gray-600 text-gray-200'} text-xs px-2 py-0.5 rounded-full capitalize`}>{s || '—'}</span>
}

export default function SimPortfolioDashboard() {
  const [portfolios, setPortfolios] = useState([])
  const [projectCount, setProjectCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function load() {
    setLoading(true); setError(null)
    try {
      const [pf, pp] = await Promise.all([
        getSimPortfolios(),
        getAllSimPortfolioProjects({ status: 'active' }),
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

  const activeCount = portfolios.filter(p => p.portfolio_status === 'active').length
  const totalBudget = portfolios.reduce((s, p) => s + (p.total_budget || 0), 0)
  const avgHealth   = portfolios.length
    ? portfolios.reduce((s, p) => s + (p.overall_health_score || 0), 0) / portfolios.length
    : 0

  const fmt = n => n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000 ? `$${(n / 1_000).toFixed(0)}K` : `$${n}`

  if (loading) {
    return <div className="flex items-center justify-center h-64"><RefreshCw className="w-8 h-8 animate-spin text-blue-400" /></div>
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300 m-6">
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
          <h1 className="text-2xl font-bold text-white">Practice Portfolio Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">Executive overview across all practice portfolios</p>
        </div>
        <button onClick={load}
          className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors">
          <RefreshCw className="w-4 h-4" />Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Portfolios"  value={portfolios.length} icon={Briefcase}   colour="bg-blue-600" />
        <KpiCard label="Active Portfolios" value={activeCount}        icon={Activity}    colour="bg-green-600" />
        <KpiCard label="Total Budget"      value={fmt(totalBudget)}   icon={DollarSign}  colour="bg-blue-600" />
        <KpiCard label="Avg Health Score"  value={`${Math.round(avgHealth)}%`} icon={TrendingUp} colour="bg-orange-600" />
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-700">
          <h2 className="text-white font-semibold">Practice Portfolio Health Overview</h2>
        </div>
        {portfolios.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No practice portfolios found. Create one to get started.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-gray-400">
                  {['Name', 'Code', 'Status', 'Budget', 'Health', 'Start', 'End'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {portfolios.map((p, i) => (
                  <tr key={p.id} className={`border-b border-gray-700/50 hover:bg-gray-700/30 ${i % 2 ? 'bg-gray-700/10' : ''}`}>
                    <td className="px-4 py-3 text-white font-medium">{p.portfolio_name}</td>
                    <td className="px-4 py-3 text-gray-300 font-mono text-xs">{p.portfolio_code || '—'}</td>
                    <td className="px-4 py-3">{statusBadge(p.portfolio_status)}</td>
                    <td className="px-4 py-3 text-gray-300">{fmt(p.total_budget || 0)}</td>
                    <td className="px-4 py-3">{healthBadge(p.overall_health_score)}</td>
                    <td className="px-4 py-3 text-gray-300">{p.portfolio_start_date || '—'}</td>
                    <td className="px-4 py-3 text-gray-300">{p.portfolio_end_date || '—'}</td>
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
