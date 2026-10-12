import { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Search, Download, Users, Clock, AlertTriangle, Gauge, CalendarRange } from 'lucide-react'
import { platformDb } from '@nidus/supabase'
import { getTeamTimesheets, approveTimesheetEntry, rejectTimesheetEntry, computeTimesheetExceptions, computeUtilisation } from '../../../services/timesheetService'
import { getReviewReasons } from '../../../services/timesheetReasonCatalogService'
import { resolveTimesheetSettings } from '../../../services/timesheetSettingsService'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'
import { exportListToCSV } from '@nidus/shared/utils/exportUtils'
import PlanningProjectBar from '../../../components/planning/PlanningProjectBar'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId'
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import TimesheetReviewPanel from '../../../components/timesheets/TimesheetReviewPanel'
import TeamWeeklyTimesheetGrid from '../../../components/timesheets/TeamWeeklyTimesheetGrid'
import TeamWorkPlanGrid from '../../../components/timesheets/TeamWorkPlanGrid'

const STATUS_COLORS = {
  draft:     'bg-gray-100 text-gray-700 border-gray-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600',
  submitted: 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700',
  approved:  'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700',
  rejected:  'bg-red-50 text-red-700 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700',
}

const EXPORT_COLS = [
  { key: 'entry_date', label: 'Date' },
  { key: 'user_id', label: 'User ID' },
  { key: 'hours_worked', label: 'Hours' },
  { key: 'work_category', label: 'Category' },
  { key: 'status', label: 'Status' },
  { key: 'description', label: 'Description' },
]

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[status] || STATUS_COLORS.draft}`}>
      {status}
    </span>
  )
}

function formatDate(v) {
  if (!v) return '—'
  return new Date(v).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function TeamTimesheetsPage() {
  const { projectId, routeKey } = usePlatformProjectId()
  const [reviewerId, setReviewerId] = useState(null)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('submitted')
  const [tab, setTab] = useState('entries') // 'entries' | 'exceptions' | 'utilisation' | 'grid'
  const [allRows, setAllRows] = useState([])
  const [allLoading, setAllLoading] = useState(false)

  // v1169 — decision-scoped reason catalogs
  const [approveReasons, setApproveReasons] = useState([])
  const [rejectReasons, setRejectReasons] = useState([])
  const [reviewingId, setReviewingId] = useState(null)
  const [processing, setProcessing] = useState(null)

  // v1173 — resolved org/project overtime thresholds, for the Exceptions tab
  const [timesheetSettings, setTimesheetSettings] = useState(null)

  useEffect(() => {
    if (!projectId) return
    getCurrentUserAccountId().then((accountId) => {
      if (!accountId) return
      resolveTimesheetSettings(accountId, projectId).then(setTimesheetSettings)
    })
  }, [projectId])

  useEffect(() => {
    // getSession() reads the already-persisted local session — no network round trip —
    // unlike getUser(), which always re-validates with the Auth server.
    platformDb.auth.getSession().then(({ data }) => setReviewerId(data?.session?.user?.id || null))
  }, [])

  useEffect(() => {
    getReviewReasons('approved').then((r) => setApproveReasons(r.data || []))
    getReviewReasons('rejected').then((r) => setRejectReasons(r.data || []))
  }, [])

  const load = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const data = await getTeamTimesheets(projectId, { status: statusFilter || undefined })
      setRows(data)
    } catch (e) {
      toast.error(e?.message || 'Failed to load team timesheets')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [projectId, statusFilter])

  // Exceptions/Utilisation need the full, unfiltered entry set (not just statusFilter's slice)
  useEffect(() => {
    if (!projectId || tab === 'entries') return
    let cancelled = false
    setAllLoading(true)
    getTeamTimesheets(projectId, {})
      .then(data => { if (!cancelled) setAllRows(data) })
      .catch(e => toast.error(e?.message || 'Failed to load team timesheets'))
      .finally(() => { if (!cancelled) setAllLoading(false) })
    return () => { cancelled = true }
  }, [projectId, tab])

  const byUser = useMemo(() => {
    const map = new Map()
    for (const r of allRows) {
      if (!r.user_id) continue
      if (!map.has(r.user_id)) map.set(r.user_id, [])
      map.get(r.user_id).push(r)
    }
    return map
  }, [allRows])

  const teamExceptions = useMemo(() => {
    const list = []
    for (const [userId, entries] of byUser) {
      const ex = computeTimesheetExceptions(entries, { settings: timesheetSettings })
      const count = ex.overtime.length + ex.missing.length + ex.rejected.length
      if (count > 0) list.push({ userId, ...ex, count })
    }
    return list.sort((a, b) => b.count - a.count)
  }, [byUser, timesheetSettings])

  const teamExceptionCount = useMemo(() => teamExceptions.reduce((s, u) => s + u.count, 0), [teamExceptions])

  const utilisationPeriod = useMemo(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    return { periodStart: start.toISOString().slice(0, 10), periodEnd: now.toISOString().slice(0, 10) }
  }, [])

  const teamUtilisation = useMemo(() => {
    const list = []
    for (const [userId, entries] of byUser) {
      list.push({ userId, ...computeUtilisation(entries, utilisationPeriod) })
    }
    return list.sort((a, b) => b.utilisationPct - a.utilisationPct)
  }, [byUser, utilisationPeriod])

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase()
    return t
      ? rows.filter(r =>
          (r.description || '').toLowerCase().includes(t) ||
          (r.work_category || '').toLowerCase().includes(t) ||
          (r.user_id || '').toLowerCase().includes(t)
        )
      : rows
  }, [rows, search])

  const totalHours = useMemo(() => filtered.reduce((s, r) => s + (parseFloat(r.hours_worked) || 0), 0), [filtered])
  const pendingCount = useMemo(() => filtered.filter(r => r.status === 'submitted').length, [filtered])

  const startReview = (id) => {
    setReviewingId(id)
  }

  const resetReview = () => {
    setReviewingId(null)
  }

  /** Shared by the Entries tab's inline row and the Weekly Grid tab's cell popover. */
  const handleConfirmDecision = async (id, decision, reasonIds, notes) => {
    setProcessing(id)
    try {
      const fn = decision === 'approved' ? approveTimesheetEntry : rejectTimesheetEntry
      await fn(id, reviewerId, reasonIds, notes)
      setRows(r => r.map(x => x.id === id ? { ...x, status: decision, review_notes: notes } : x))
      setAllRows(r => r.map(x => x.id === id ? { ...x, status: decision, review_notes: notes } : x))
      toast.success(`Entry ${decision}`)
      resetReview()
    } catch (e) {
      toast.error(e?.message || 'Decision failed')
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 px-4 py-6">
      <div className="max-w-6xl mx-auto">
        <PlanningProjectBar autoSelectSingle />

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 mt-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Team Timesheets
            </h1>
            {filtered.length > 0 && (
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                {filtered.length} entries · {totalHours.toFixed(1)}h total
                {pendingCount > 0 && ` · ${pendingCount} awaiting approval`}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => exportListToCSV(EXPORT_COLS, filtered, `team-timesheets-${routeKey}`)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-1.5 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800">
              <Download className="h-4 w-4" /> Export CSV
            </button>
          </div>
        </div>

        {/* Entries / Exceptions / Utilisation tabs */}
        <div className="flex items-center gap-1 mb-4 p-1 rounded-lg bg-gray-100 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 w-fit">
          <button type="button" onClick={() => setTab('entries')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'entries' ? 'bg-white text-gray-900 shadow-sm dark:bg-slate-700 dark:text-white dark:shadow-none' : 'text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'}`}>
            Entries
          </button>
          <button type="button" onClick={() => setTab('exceptions')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'exceptions' ? 'bg-white text-gray-900 shadow-sm dark:bg-slate-700 dark:text-white dark:shadow-none' : 'text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'}`}>
            Exceptions
            {teamExceptionCount > 0 && (
              <span className="inline-flex items-center justify-center h-4 min-w-[1rem] px-1 rounded-full bg-amber-500 text-slate-950 text-[10px] font-bold">
                {teamExceptionCount}
              </span>
            )}
          </button>
          <button type="button" onClick={() => setTab('utilisation')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'utilisation' ? 'bg-white text-gray-900 shadow-sm dark:bg-slate-700 dark:text-white dark:shadow-none' : 'text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'}`}>
            Utilisation
          </button>
          <button type="button" onClick={() => setTab('grid')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'grid' ? 'bg-white text-gray-900 shadow-sm dark:bg-slate-700 dark:text-white dark:shadow-none' : 'text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'}`}>
            <CalendarRange className="h-3.5 w-3.5" /> Weekly Grid
          </button>
          <button type="button" onClick={() => setTab('work_plan')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'work_plan' ? 'bg-white text-gray-900 shadow-sm dark:bg-slate-700 dark:text-white dark:shadow-none' : 'text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'}`}>
            Work Plan
          </button>
        </div>

        {/* Filters */}
        {tab === 'entries' && (
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search…"
                className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 py-2 text-sm text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:border-blue-500 focus:outline-none" />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none">
              <option value="">All statuses</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        )}

        {tab === 'exceptions' && (
          <div>
            {allLoading && (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {!allLoading && teamExceptions.length === 0 && (
              <div className="text-center py-16 text-gray-500 dark:text-slate-500">
                <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>No exceptions for this team right now.</p>
              </div>
            )}
            {!allLoading && teamExceptions.length > 0 && (
              <div className="space-y-4">
                {teamExceptions.map(u => (
                  <div key={u.userId} className="rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono text-xs text-gray-500 dark:text-slate-400">{u.userId?.slice(0, 8)}…</span>
                      <span className="inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1.5 rounded-full bg-amber-500 text-slate-950 text-xs font-bold">
                        {u.count}
                      </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3 text-xs">
                      <div>
                        <p className="text-gray-500 dark:text-slate-500 mb-1">Overtime</p>
                        {u.overtime.length === 0
                          ? <p className="text-gray-400 dark:text-slate-600">None</p>
                          : u.overtime.map(o => (
                              <p key={`${o.type}-${o.date}`} className="text-amber-700 dark:text-amber-300">
                                {o.type === 'week' ? `Week of ${formatDate(o.date)}` : formatDate(o.date)} — {o.hours.toFixed(1)}h
                              </p>
                            ))}
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-slate-500 mb-1">Missing entries</p>
                        {u.missing.length === 0
                          ? <p className="text-gray-400 dark:text-slate-600">None</p>
                          : <p className="text-gray-700 dark:text-slate-300">{u.missing.length} day(s) in last 14 days</p>}
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-slate-500 mb-1">Rejected</p>
                        {u.rejected.length === 0
                          ? <p className="text-gray-400 dark:text-slate-600">None</p>
                          : u.rejected.map(r => (
                              <p key={r.id} className="text-red-700 dark:text-red-300">{formatDate(r.entry_date)} — {r.work_category}</p>
                            ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'utilisation' && (
          <div>
            {allLoading && (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {!allLoading && teamUtilisation.length === 0 && (
              <div className="text-center py-16 text-gray-500 dark:text-slate-500">
                <Gauge className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>No logged hours this month yet.</p>
              </div>
            )}
            {!allLoading && teamUtilisation.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3 text-left">Member</th>
                      <th className="px-4 py-3 text-left">Hours logged</th>
                      <th className="px-4 py-3 text-left">Standard hours</th>
                      <th className="px-4 py-3 text-left">Utilisation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                    {teamUtilisation.map(u => (
                      <tr key={u.userId} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3 text-gray-500 dark:text-slate-400 font-mono text-xs">{u.userId?.slice(0, 8)}…</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-slate-300">{u.hoursLogged.toFixed(1)}h</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-slate-400">{u.standardHours.toFixed(1)}h</td>
                        <td className="px-4 py-3">
                          <span className={`font-semibold ${u.utilisationPct >= 90 ? 'text-emerald-600 dark:text-emerald-400' : u.utilisationPct >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                            {u.utilisationPct}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'entries' && loading && (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {tab === 'entries' && !loading && filtered.length === 0 && (
          <div className="text-center py-16 text-gray-500 dark:text-slate-500">
            <Clock className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No timesheet entries found.</p>
          </div>
        )}

        {tab === 'entries' && !loading && filtered.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 uppercase text-xs">
                <tr>
                <TableRowNumberHeader className="!normal-case" />
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Member</th>
                  <th className="px-4 py-3 text-left">Hours</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                {filtered.map((e, index) => (
                  <>
                    <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                      <td className="px-4 py-3 text-gray-700 dark:text-slate-300">{formatDate(e.entry_date)}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-slate-400 font-mono text-xs">{e.user_id?.slice(0, 8)}…</td>
                      <td className="px-4 py-3 font-semibold text-blue-600 dark:text-blue-400">{e.hours_worked}h</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-slate-400 capitalize">
                        {e.is_overtime ? (
                          <span className="inline-flex items-center rounded-full border border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-700 dark:bg-purple-900/30 dark:text-purple-300 px-2 py-0.5 text-xs font-medium">Overtime</span>
                        ) : e.work_category}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-slate-400 max-w-xs truncate">{e.description || '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                      <td className="px-4 py-3 text-right">
                        {e.status === 'submitted' && reviewingId !== e.id && (
                          <button type="button" onClick={() => startReview(e.id)}
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-xs">Review</button>
                        )}
                      </td>
                    </tr>
                    {reviewingId === e.id && (
                      <tr key={`${e.id}-review`} className="bg-gray-50 dark:bg-slate-800/70">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                        <td colSpan={7} className="px-4 py-3">
                          <TimesheetReviewPanel
                            approveReasons={approveReasons}
                            rejectReasons={rejectReasons}
                            processing={processing}
                            onConfirm={(decision, reasonIds, notes) => handleConfirmDecision(e.id, decision, reasonIds, notes)}
                            onCancel={resetReview}
                          />
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'grid' && (
          <TeamWeeklyTimesheetGrid
            projectId={projectId}
            entries={allRows}
            loading={allLoading}
            approveReasons={approveReasons}
            rejectReasons={rejectReasons}
            processing={processing}
            onConfirmDecision={handleConfirmDecision}
          />
        )}

        {tab === 'work_plan' && (
          <TeamWorkPlanGrid projectId={projectId} />
        )}
      </div>
    </div>
  )
}
