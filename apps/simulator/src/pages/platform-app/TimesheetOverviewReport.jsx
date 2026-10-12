/**
 * Timesheet Overview Report (v1173) — role-tiered: PMO Admin/Account Owner see every project in
 * the organisation aggregated; Project Manager/Team Manager see the same shape scoped to their
 * own project(s). Read-only report, not an editable grid (consistent with Team Timesheets'
 * Exceptions/Utilisation tabs).
 * Route: /platform/reports/timesheet-overview
 */
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, Clock, Building2, Home, AlertTriangle } from 'lucide-react'
import { getCurrentUserAccountId, getCurrentUserInternalUserId } from '@nidus/shared/utils/accountResolution'
import { userHasPmoOrOwner } from '../../services/timesheetSettingsService'
import { getTimesheetOverview } from '../../services/timesheetOverviewService'
import { getMyProjects } from '../../services/projectService'

function toDateOnly(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()) }
function mondayOf(d) { const c = new Date(d); c.setDate(c.getDate() - ((c.getDay() + 6) % 7)); return toDateOnly(c) }
// Local calendar date, NOT toISOString() — see WeeklyTimesheetGrid.jsx's comment for why.
function isoDate(d) { const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${day}` }

export default function TimesheetOverviewReport() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isOrgWide, setIsOrgWide] = useState(false)
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()))
  const [data, setData] = useState({ byProject: [], byPerson: [], totals: {} })

  const weekEnd = useMemo(() => { const d = new Date(weekStart); d.setDate(d.getDate() + 6); return isoDate(d) }, [weekStart])
  const weekStartIso = useMemo(() => isoDate(weekStart), [weekStart])
  const weekLabel = `${new Date(`${weekStartIso}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${new Date(`${weekEnd}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const accountId = await getCurrentUserAccountId()
    if (!accountId) { setError('Could not resolve your organisation'); setLoading(false); return }

    const orgWide = await userHasPmoOrOwner(accountId)
    setIsOrgWide(orgWide)

    let projectIds = null
    if (!orgWide) {
      const internalUserId = await getCurrentUserInternalUserId()
      const mine = await getMyProjects(internalUserId)
      projectIds = (mine?.data || []).map((p) => p.id)
      if (projectIds.length === 0) {
        setData({ byProject: [], byPerson: [], totals: {} })
        setLoading(false)
        return
      }
    }

    const result = await getTimesheetOverview(accountId, weekStartIso, weekEnd, projectIds)
    if (!result.success) { setError(result.error); setLoading(false); return }
    setData(result.data)
    setLoading(false)
  }, [weekStartIso, weekEnd])

  useEffect(() => { load() }, [load])

  const totals = data.totals || {}

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300 mb-4">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="h-7 w-7 text-blue-600 dark:text-blue-400" /> Timesheet Overview
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {isOrgWide ? 'Every project in your organisation, aggregated.' : 'Your projects, aggregated.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-6">
          <button type="button" onClick={() => setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })}
            className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium text-gray-900 dark:text-white min-w-[180px] text-center">{weekLabel}</span>
          <button type="button" onClick={() => setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })}
            className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
            <ChevronRight className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setWeekStart(mondayOf(new Date()))}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline ml-1">This week</button>
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">Total hours</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{(totals.totalHours || 0).toFixed(1)}h</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Overtime hours</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{(totals.overtimeHours || 0).toFixed(1)}h</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"><Building2 className="h-3 w-3" /> Onsite days</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totals.onsiteDays || 0}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"><Home className="h-3 w-3" /> Offshore days</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totals.offshoreDays || 0}</p>
              </div>
            </div>

            {/* By project */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">By project</h2>
              <OverviewTable rows={data.byProject} emptyLabel="No project activity this week." />
            </div>

            {/* By person */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">By person</h2>
              <OverviewTable rows={data.byPerson} emptyLabel="No activity logged this week." />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function OverviewTable({ rows, emptyLabel }) {
  if (!rows || rows.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">{emptyLabel}</p>
  }
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Hours</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Overtime</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Pending</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Onsite</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Offshore</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{r.label}</td>
                <td className="px-4 py-2 text-sm text-right font-semibold text-blue-600 dark:text-blue-400">{r.totalHours.toFixed(1)}h</td>
                <td className="px-4 py-2 text-sm text-right text-amber-600 dark:text-amber-400">{r.overtimeHours > 0 ? `${r.overtimeHours.toFixed(1)}h` : '—'}</td>
                <td className="px-4 py-2 text-sm text-right text-gray-500 dark:text-gray-400">{r.pendingCount || '—'}</td>
                <td className="px-4 py-2 text-sm text-right text-gray-500 dark:text-gray-400">{r.onsiteDays || '—'}</td>
                <td className="px-4 py-2 text-sm text-right text-gray-500 dark:text-gray-400">{r.offshoreDays || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
