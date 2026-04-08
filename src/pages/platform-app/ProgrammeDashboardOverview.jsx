import { useState, useEffect, useMemo, useRef } from 'react'
import { BarChart3, Layers, Target, TrendingUp, CheckCircle, Activity, GitBranch, DollarSign } from 'lucide-react'
import { platformDb } from '../../services/supabase/supabaseClient'
import { getProgrammeRollupsForDashboard } from '../../services/programmeService'

function MetricCard({ title, value, subtitle, icon: Icon, iconBg, iconColor }) {
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 hover:border-blue-500/50 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
      <p className="text-sm font-medium text-gray-400 mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-100">{value}</p>
      {subtitle != null && subtitle !== '' && (
        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
      )}
    </div>
  )
}

export default function ProgrammeDashboardOverview() {
  const [accountId, setAccountId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [rollups, setRollups] = useState([])
  const cancelledRef = useRef(false)

  useEffect(() => {
    cancelledRef.current = false
    setError(null)
    setLoading(true)

    const rollupsPromise = getProgrammeRollupsForDashboard().then((res) => {
      if (!cancelledRef.current && res.success) setRollups(res.data || [])
      if (!cancelledRef.current && !res.success) setError(res.error || 'Failed to load dashboard')
      if (!cancelledRef.current) setLoading(false)
      return res
    }).catch((err) => {
      if (!cancelledRef.current) {
        setError(err.message || 'Failed to load programme dashboard')
        setRollups([])
        setLoading(false)
      }
    })

    ;(async () => {
      try {
        const { data: { user } } = await platformDb.auth.getUser()
        if (!user || cancelledRef.current) return
        const { data: userRecord } = await platformDb.from('users').select('id').eq('auth_user_id', user.id).single()
        if (!userRecord || cancelledRef.current) return
        const { data: account } = await platformDb.from('accounts').select('id').eq('owner_user_id', userRecord.id).maybeSingle()
        if (!cancelledRef.current && account?.id) setAccountId(account.id)
      } catch (err) {
        if (!cancelledRef.current) console.error('Error loading account for programme dashboard:', err)
      }
    })()

    return () => { cancelledRef.current = true }
  }, [])

  const metrics = useMemo(() => {
    const list = rollups || []
    const totalProgrammes = list.length
    const totalProjects = list.reduce((s, r) => s + (Number(r.total_projects) || 0), 0)
    const activeProjects = list.reduce((s, r) => s + (Number(r.active_projects) || 0), 0)
    const completedProjects = list.reduce((s, r) => s + (Number(r.completed_projects) || 0), 0)
    const totalRealised = list.reduce((s, r) => s + (Number(r.total_realised_benefits) || 0), 0)
    const totalPlanned = list.reduce((s, r) => s + (Number(r.total_planned_benefits) || 0), 0)
    const progressPct = list.length
      ? list.reduce((s, r) => s + (Number(r.average_progress_percentage ?? r.progress_percentage) || 0), 0) / list.length
      : 0
    const benefitsPct = totalPlanned > 0 ? Math.min(100, (totalRealised / totalPlanned) * 100) : 0
    const healthPct = list.length
      ? list.reduce((s, r) => {
          const score = Number(r.overall_health_score)
          if (Number.isFinite(score)) return s + score
          const total = Number(r.total_projects) || 0
          const green = Number(r.green_projects) || 0
          return s + (total > 0 ? (green / total) * 100 : 0)
        }, 0) / list.length
      : 0
    const totalBudget = list.reduce((s, r) => s + (Number(r.total_budget) || 0), 0)
    const totalSpent = list.reduce((s, r) => s + (Number(r.total_spent) || 0), 0)

    return {
      totalProgrammes,
      totalProjects,
      activeProjects,
      completedProjects,
      totalRealisedBenefits: totalRealised,
      totalPlannedBenefits: totalPlanned,
      benefitsRealizationPct: benefitsPct,
      avgProgressPct: progressPct,
      avgHealthPct: healthPct,
      totalBudget,
      totalSpent,
    }
  }, [rollups])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4" />
          <p className="text-gray-400">Loading programme dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="h-8 w-8 text-purple-400" />
            <h1 className="text-3xl font-bold text-gray-100">Programme Dashboard</h1>
          </div>
          <p className="text-gray-400">
            Portfolio-level overview of programme health, progress, and benefits realization.
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-900/30 border border-red-700 text-red-200 rounded-lg p-4 text-sm">
            {error}
          </div>
        )}

        {/* Always-visible portfolio-level metrics (0 when no data) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-8">
          <MetricCard
            title="Total Programmes"
            value={metrics.totalProgrammes}
            subtitle={`${metrics.activeProjects} active projects across programmes`}
            icon={Layers}
            iconBg="bg-blue-900/40"
            iconColor="text-purple-400"
          />
          <MetricCard
            title="Total Projects"
            value={metrics.totalProjects}
            subtitle={`${metrics.activeProjects} active • ${metrics.completedProjects} completed`}
            icon={Target}
            iconBg="bg-blue-900/40"
            iconColor="text-blue-400"
          />
          <MetricCard
            title="Avg. Progress"
            value={`${Math.round(metrics.avgProgressPct)}%`}
            subtitle="Across all programmes"
            icon={TrendingUp}
            iconBg="bg-green-900/40"
            iconColor="text-green-400"
          />
          <MetricCard
            title="Benefits Realized"
            value={metrics.totalPlannedBenefits > 0 ? `${Math.round(metrics.benefitsRealizationPct)}%` : '0%'}
            subtitle={metrics.totalPlannedBenefits > 0 ? `${metrics.totalRealisedBenefits.toLocaleString()} of ${metrics.totalPlannedBenefits.toLocaleString()} planned` : 'No benefits planned yet'}
            icon={CheckCircle}
            iconBg="bg-emerald-900/40"
            iconColor="text-emerald-400"
          />
          <MetricCard
            title="Avg. Health Score"
            value={`${Math.round(metrics.avgHealthPct)}%`}
            subtitle="Programme health"
            icon={Activity}
            iconBg="bg-amber-900/40"
            iconColor="text-amber-400"
          />
          <MetricCard
            title="Budget (Spent)"
            value={metrics.totalBudget > 0 ? `${Number(metrics.totalSpent).toLocaleString()} / ${Number(metrics.totalBudget).toLocaleString()}` : '0'}
            subtitle={metrics.totalBudget > 0 ? 'Spent vs total budget' : 'No budget data'}
            icon={DollarSign}
            iconBg="bg-gray-700"
            iconColor="text-gray-300"
          />
        </div>

        {/* Loading state for rollups only */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4" />
            <p className="text-gray-400">Loading programme breakdown...</p>
          </div>
        ) : rollups.length === 0 ? (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 text-center">
            <Layers className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-300 mb-1">No Programmes Yet</h3>
            <p className="text-gray-500 text-sm">
              Create programmes and link projects to see per-programme breakdown and aggregated insights here.
            </p>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-purple-400" />
              By Programme
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rollups.map((row) => (
                <div
                  key={row.programme_id}
                  className="bg-gray-800 rounded-lg border border-gray-700 p-6 hover:border-blue-500 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-100">
                      {row.programme_name || 'Unnamed Programme'}
                    </h3>
                    {row.programme_code && (
                      <span className="text-xs px-2 py-1 rounded bg-blue-900/40 text-blue-200">
                        {row.programme_code}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mb-4">
                    {row.total_projects || 0} projects • {row.active_projects || 0} active
                  </p>
                  <div className="space-y-2 text-sm text-gray-300">
                    <div className="flex items-center justify-between">
                      <span>Progress</span>
                      <span className="font-semibold">
                        {Math.round(row.average_progress_percentage ?? row.progress_percentage ?? 0)}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-2 bg-green-500 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(0, row.average_progress_percentage ?? row.progress_percentage ?? 0))}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span>Benefits realization</span>
                      <span className="font-semibold">
                        {row.total_planned_benefits > 0
                          ? Math.round((row.total_realised_benefits ?? 0) / (row.total_planned_benefits || 1) * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1 text-xs text-gray-400">
                      <span>Health score</span>
                      <span>{Math.round(Number(row.overall_health_score) || (row.total_projects > 0 ? ((row.green_projects ?? 0) / row.total_projects) * 100 : 0))}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

