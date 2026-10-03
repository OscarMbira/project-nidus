/**
 * Work Plan vs Timesheet Variance Report (v1180, taxonomy §3, Reports > Work Plan Variance).
 * Team-wide, period-filterable Planned (Work Plan Estimated Hours) vs Actual (Timesheet hours)
 * comparison for PMO/PM/Team Lead/Team Manager, alongside the existing Cost/Schedule variance
 * reports. Only meaningful for Time & Material projects — shown as an empty state otherwise,
 * not a hard block (a PM might flip billing_type mid-stream and want to check history).
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Scale, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import DashboardStatCard from '../../components/ui/DashboardStatCard'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { getCurrentUserAccountId } from '../../utils/accountResolution'
import { getTeamTimesheets } from '../../services/timesheetService'
import { resolveTimesheetSettings } from '../../services/timesheetSettingsService'
import {
  getProjectBillingType,
  listProjectWorkPlansForPeriod,
  computeWorkPlanVariance,
} from '../../services/projectWorkPlanService'
import { platformDb } from '@nidus/supabase'

function toDateOnly(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()) }
function mondayOf(d) { const c = new Date(d); c.setDate(c.getDate() - ((c.getDay() + 6) % 7)); return toDateOnly(c) }
function isoDate(d) { const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${day}` }

const REPORT_COLUMNS = [
  { key: 'member', label: 'Team Member' },
  { key: 'planned', label: 'Planned Hours' },
  { key: 'actual', label: 'Actual Hours' },
  { key: 'variance', label: 'Variance' },
  { key: 'unplanned', label: 'Unplanned Hours' },
]

export default function WorkPlanVarianceReport() {
  const navigate = useNavigate()
  const { projectId } = usePlatformProjectId()
  const [billingType, setBillingType] = useState(null)
  const [periodType, setPeriodType] = useState('weekly')
  const [periodAnchor, setPeriodAnchor] = useState(() => mondayOf(new Date()))
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const periodStart = useMemo(() => {
    if (periodType === 'monthly') return isoDate(new Date(periodAnchor.getFullYear(), periodAnchor.getMonth(), 1))
    return isoDate(periodAnchor)
  }, [periodType, periodAnchor])
  const periodEnd = useMemo(() => {
    if (periodType === 'monthly') return isoDate(new Date(periodAnchor.getFullYear(), periodAnchor.getMonth() + 1, 0))
    const d = new Date(periodAnchor)
    d.setDate(d.getDate() + 6)
    return isoDate(d)
  }, [periodType, periodAnchor])
  const periodLabel = periodType === 'monthly'
    ? new Date(`${periodStart}T00:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : `${new Date(`${periodStart}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${new Date(`${periodEnd}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`

  useEffect(() => {
    if (!projectId || projectId === 'null') return
    getCurrentUserAccountId().then((accountId) => {
      if (!accountId) return
      resolveTimesheetSettings(accountId, projectId).then((s) => setPeriodType(s.work_plan_period_type || 'weekly'))
    })
    getProjectBillingType(projectId).then(setBillingType).catch(() => setBillingType(null))
  }, [projectId])

  const load = useCallback(async () => {
    if (!projectId || projectId === 'null') { setLoading(false); return }
    setLoading(true)
    try {
      const [plans, entries] = await Promise.all([
        listProjectWorkPlansForPeriod(projectId, periodStart),
        getTeamTimesheets(projectId, { from: periodStart, to: periodEnd }),
      ])
      const userIds = [...new Set(plans.map((p) => p.user_id))]
      let names = {}
      if (userIds.length > 0) {
        const { data } = await platformDb.from('users').select('auth_user_id, full_name, email').in('auth_user_id', userIds)
        names = Object.fromEntries((data || []).map((u) => [u.auth_user_id, u.full_name || u.email || 'Unknown member']))
      }
      const computed = plans.map((plan) => {
        const memberEntries = entries.filter((e) => e.user_id === plan.user_id)
        const variance = computeWorkPlanVariance(plan.items, memberEntries)
        return { plan, member: names[plan.user_id] || 'Unknown member', variance }
      }).sort((a, b) => a.member.localeCompare(b.member))
      setRows(computed)
    } catch (e) {
      toast.error(e?.message || 'Failed to load variance report')
    } finally {
      setLoading(false)
    }
  }, [projectId, periodStart, periodEnd])

  useEffect(() => { load() }, [load])

  const handleStep = (dir) => {
    setPeriodAnchor((d) => {
      const n = new Date(d)
      if (periodType === 'monthly') n.setMonth(n.getMonth() + dir)
      else n.setDate(n.getDate() + dir * 7)
      return n
    })
  }

  const totals = useMemo(() => rows.reduce((acc, r) => ({
    planned: acc.planned + r.variance.plannedHours,
    actual: acc.actual + r.variance.actualHours,
    unplanned: acc.unplanned + r.variance.unplannedHours,
  }), { planned: 0, actual: 0, unplanned: 0 }), [rows])
  const totalVariance = totals.actual - totals.planned
  const totalVariancePct = totals.planned > 0 ? (totalVariance / totals.planned) * 100 : null

  const exportRows = useMemo(() => rows.map((r) => ({
    member: r.member,
    planned: r.variance.plannedHours.toFixed(1),
    actual: r.variance.actualHours.toFixed(1),
    variance: `${r.variance.varianceHours >= 0 ? '+' : ''}${r.variance.varianceHours.toFixed(1)}`,
    unplanned: r.variance.unplannedHours.toFixed(1),
  })), [rows])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-2 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Scale className="h-5 w-5 text-blue-600 dark:text-blue-400" /> Work Plan vs Timesheet Variance
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Planned Estimated Hours vs actual logged hours, per team member</p>
          </div>
          <ExportListMenu columns={REPORT_COLUMNS} data={exportRows} baseFilename="Work_Plan_Variance" disabled={exportRows.length === 0} />
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={() => handleStep(-1)}
            className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium min-w-[180px] text-center">{periodLabel}</span>
          <button type="button" onClick={() => handleStep(1)}
            className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {billingType !== 'time_and_material' && !loading && (
          <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4 text-sm text-amber-800 dark:text-amber-200">
            This project isn't flagged Time &amp; Material, so Work Plan items may not have Estimated Hours set. Set the billing type on Project Details to get full variance tracking.
          </div>
        )}

        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Loading…</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <DashboardStatCard label="Planned Hours" value={totals.planned.toFixed(1)} />
              <DashboardStatCard label="Actual Hours" value={totals.actual.toFixed(1)} />
              <DashboardStatCard label="Variance" value={`${totalVariance >= 0 ? '+' : ''}${totalVariance.toFixed(1)}${totalVariancePct != null ? ` (${totalVariancePct >= 0 ? '+' : ''}${totalVariancePct.toFixed(0)}%)` : ''}`}
                accentClassName={totalVariance < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'} />
              <DashboardStatCard label="Unplanned Hours" value={totals.unplanned.toFixed(1)} accentClassName={totals.unplanned > 0 ? 'text-amber-600 dark:text-amber-400' : undefined} />
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-2 text-left">Team Member</th>
                    <th className="px-4 py-2 text-right">Planned</th>
                    <th className="px-4 py-2 text-right">Actual</th>
                    <th className="px-4 py-2 text-right">Variance</th>
                    <th className="px-4 py-2 text-right">Unplanned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {rows.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">No work plans submitted by the team this period.</td></tr>
                  ) : rows.map((r) => (
                    <tr key={r.plan.id}>
                      <td className="px-4 py-2">{r.member}</td>
                      <td className="px-4 py-2 text-right">{r.variance.plannedHours.toFixed(1)}</td>
                      <td className="px-4 py-2 text-right">{r.variance.actualHours.toFixed(1)}</td>
                      <td className={`px-4 py-2 text-right font-medium ${r.variance.varianceHours < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {r.variance.varianceHours >= 0 ? '+' : ''}{r.variance.varianceHours.toFixed(1)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {r.variance.unplannedHours > 0 ? (
                          <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300">
                            <AlertTriangle className="h-3.5 w-3.5" /> {r.variance.unplannedHours.toFixed(1)}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
