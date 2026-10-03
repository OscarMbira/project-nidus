import { useEffect, useState, useMemo } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Plus, Search, LayoutGrid, Table2, CalendarRange, ArrowUpDown, Download, Clock, AlertTriangle } from 'lucide-react'
import { platformDb } from '@nidus/supabase'
import { getMyTimesheets, deleteTimesheetEntry, submitTimesheetEntry, computeTimesheetExceptions } from '../../../services/timesheetService'
import { exportListToCSV, exportListToJSON, exportListToXML, exportListToPrint } from '@nidus/shared/utils/exportUtils'
import { usePlatformProjectId } from '../../../hooks/usePlatformProjectId'
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { RowActionButton } from '@nidus/ui'
import WeeklyTimesheetGrid from '../../../components/timesheets/WeeklyTimesheetGrid'
import { resolveTimesheetSettings } from '../../../services/timesheetSettingsService'
import { getCurrentUserAccountId } from '../../../utils/accountResolution'

const VIEW_KEY = 'tm-timesheets-view-v1'

const STATUS_COLORS = {
  draft:     'bg-gray-100 text-gray-700 border-gray-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600',
  submitted: 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700',
  approved:  'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700',
  rejected:  'bg-red-50 text-red-700 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700',
}

const EXPORT_COLS = [
  { key: 'entry_date',    label: 'Date' },
  { key: 'hours_worked',  label: 'Hours' },
  { key: 'work_category', label: 'Category' },
  { key: 'status',        label: 'Status' },
  { key: 'description',   label: 'Description' },
]

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[status] || STATUS_COLORS.draft}`}>
      {status}
    </span>
  )
}

function groupByWeek(entries) {
  const weeks = {}
  for (const e of entries) {
    const d = new Date(e.entry_date)
    const monday = new Date(d)
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    const key = monday.toISOString().slice(0, 10)
    if (!weeks[key]) weeks[key] = []
    weeks[key].push(e)
  }
  return Object.entries(weeks).sort((a, b) => b[0].localeCompare(a[0]))
}

function formatDate(v) {
  if (!v) return '—'
  return new Date(v).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function MyTimesheetsPage() {
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [userId, setUserId] = useState(null)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [view, setView] = useState(() => { try { return localStorage.getItem(VIEW_KEY) || 'card' } catch { return 'card' } })
  const [exportOpen, setExportOpen] = useState(false)
  const [sortKey, setSortKey] = useState('entry_date')
  const [sortDir, setSortDir] = useState('desc')
  const [tab, setTab] = useState('entries') // 'entries' | 'exceptions'
  const [timesheetSettings, setTimesheetSettings] = useState(null)
  const [weekStats, setWeekStats] = useState({ entryCount: 0, totalHours: 0 })

  useEffect(() => { try { localStorage.setItem(VIEW_KEY, view) } catch {} }, [view])

  useEffect(() => {
    if (!projectId) return
    getCurrentUserAccountId().then((accountId) => {
      if (!accountId) return
      resolveTimesheetSettings(accountId, projectId).then(setTimesheetSettings)
    })
  }, [projectId])

  useEffect(() => {
    // getSession() reads the already-persisted local session — no network round trip —
    // unlike getUser(), which always re-validates with the Auth server. ProtectedRoute
    // already does that server-side revalidation once per protected area (same rationale
    // as getCurrentUserInternalUserId() in accountResolution.js).
    platformDb.auth.getSession().then(({ data }) => setUserId(data?.session?.user?.id || null))
  }, [])

  const load = async () => {
    if (!projectId || !userId) return
    setLoading(true)
    try {
      const data = await getMyTimesheets(projectId, userId)
      setRows(data)
    } catch (e) {
      toast.error(e?.message || 'Failed to load timesheets')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [projectId, userId])

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase()
    let list = t
      ? rows.filter(r =>
          (r.description || '').toLowerCase().includes(t) ||
          (r.work_category || '').toLowerCase().includes(t) ||
          (r.status || '').toLowerCase().includes(t) ||
          (r.entry_date || '').includes(t)
        )
      : rows
    const mul = sortDir === 'asc' ? 1 : -1
    return [...list].sort((a, b) => String(a[sortKey] ?? '').localeCompare(String(b[sortKey] ?? '')) * mul)
  }, [rows, search, sortKey, sortDir])

  const exceptions = useMemo(() => computeTimesheetExceptions(rows, { settings: timesheetSettings }), [rows, timesheetSettings])
  const exceptionCount = exceptions.overtime.length + exceptions.missing.length + exceptions.rejected.length

  const cycleSort = (key) => {
    if (sortKey !== key) { setSortKey(key); setSortDir('asc') }
    else setSortDir(d => d === 'asc' ? 'desc' : 'asc')
  }

  const totalHours = useMemo(() => filtered.reduce((s, r) => s + (parseFloat(r.hours_worked) || 0), 0), [filtered])

  const handleSubmit = async (id) => {
    try {
      await submitTimesheetEntry(id)
      setRows(r => r.map(x => x.id === id ? { ...x, status: 'submitted' } : x))
      toast.success('Entry submitted for approval')
    } catch (e) {
      toast.error(e?.message || 'Submit failed')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this time entry?')) return
    try {
      await deleteTimesheetEntry(id)
      setRows(r => r.filter(x => x.id !== id))
      toast.success('Entry deleted')
    } catch (e) {
      toast.error(e?.message || 'Delete failed')
    }
  }

  const handleExport = (fmt) => {
    const name = `timesheets-${routeKey || 'project'}`
    if (fmt === 'csv') exportListToCSV(EXPORT_COLS, filtered, name)
    else if (fmt === 'json') exportListToJSON(EXPORT_COLS, filtered, name)
    else if (fmt === 'xml') exportListToXML(EXPORT_COLS, filtered, name)
    else if (fmt === 'print') exportListToPrint(EXPORT_COLS, filtered, name, null)
    setExportOpen(false)
  }

  const SortBtn = ({ k, label }) => (
    <button type="button" onClick={() => cycleSort(k)}
      className="inline-flex items-center gap-1 font-medium text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white">
      {label}
      <ArrowUpDown className="h-3.5 w-3.5 opacity-60" />
      {sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : '⇅'}
    </button>
  )

  const weeks = groupByWeek(filtered)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 px-4 py-6">
      <div className="max-w-[1800px] mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              My Timesheets &amp; Work Plan
            </h1>
            {view === 'grid' ? (
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{weekStats.entryCount} entries · {weekStats.totalHours.toFixed(1)} hours total (selected week)</p>
            ) : filtered.length > 0 && (
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{filtered.length} entries · {totalHours.toFixed(1)} hours total</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-gray-300 dark:border-slate-600 p-0.5">
              <button type="button" onClick={() => setView('card')}
                className={`px-2 py-1 rounded ${view === 'card' ? 'bg-gray-200 text-gray-900 dark:bg-slate-700 dark:text-white' : 'text-gray-500 dark:text-slate-400'}`} title="Weekly grouped">
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setView('table')}
                className={`px-2 py-1 rounded ${view === 'table' ? 'bg-gray-200 text-gray-900 dark:bg-slate-700 dark:text-white' : 'text-gray-500 dark:text-slate-400'}`} title="Table view">
                <Table2 className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setView('grid')}
                className={`px-2 py-1 rounded ${view === 'grid' ? 'bg-gray-200 text-gray-900 dark:bg-slate-700 dark:text-white' : 'text-gray-500 dark:text-slate-400'}`} title="Weekly grid">
                <CalendarRange className="h-4 w-4" />
              </button>
            </div>
            <div className="relative">
              <button type="button" onClick={() => setExportOpen(o => !o)}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-1.5 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800">
                <Download className="h-4 w-4" /> Export
              </button>
              {exportOpen && filtered.length > 0 && (
                <div className="absolute right-0 z-20 mt-1 w-36 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 py-1 shadow-lg">
                  {['csv', 'json', 'xml', 'print'].map(fmt => (
                    <button key={fmt} type="button" onClick={() => handleExport(fmt)}
                      className="block w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800">
                      {fmt.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Link to={`/platform/timesheets/team${routeKey ? `?projectId=${routeKey}` : ''}`}
              className="text-sm text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200">Team View</Link>
            {routeKey && (
              <Link to={`/platform/timesheets/new?projectId=${routeKey}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-sm font-medium text-white">
                <Plus className="h-4 w-4" /> Log Time
              </Link>
            )}
          </div>
        </div>

        {/* Entries / Exceptions tabs */}
        <div className="flex items-center gap-1 mb-4 p-1 rounded-lg bg-gray-100 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 w-fit">
          <button type="button" onClick={() => setTab('entries')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'entries' ? 'bg-white text-gray-900 shadow-sm dark:bg-slate-700 dark:text-white dark:shadow-none' : 'text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'}`}>
            Entries
          </button>
          <button type="button" onClick={() => setTab('exceptions')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'exceptions' ? 'bg-white text-gray-900 shadow-sm dark:bg-slate-700 dark:text-white dark:shadow-none' : 'text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'}`}>
            Exceptions
            {exceptionCount > 0 && (
              <span className="inline-flex items-center justify-center h-4 min-w-[1rem] px-1 rounded-full bg-amber-500 text-slate-950 text-[10px] font-bold">
                {exceptionCount}
              </span>
            )}
          </button>
        </div>

        {/* Search */}
        {tab === 'entries' && view !== 'grid' && (
          <div className="relative mb-4 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search entries…"
              className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 py-2 text-sm text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:border-blue-500 focus:outline-none" />
          </div>
        )}

        {tab === 'entries' && view === 'grid' && (
          <WeeklyTimesheetGrid projectId={projectId} userId={userId} entries={rows} onChanged={load} onWeekStatsChange={setWeekStats} />
        )}

        {tab === 'exceptions' && !loading && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-500 dark:text-amber-400" /> Overtime (last 14 days)
              </h3>
              {exceptions.overtime.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-slate-500">No overtime days or weeks in this window.</p>
              ) : (
                <ul className="space-y-1.5">
                  {exceptions.overtime.map((o) => (
                    <li key={`${o.type}-${o.date}`} className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-900/20 px-3 py-2 text-sm">
                      <span className="text-gray-700 dark:text-slate-200">{o.type === 'week' ? `Week of ${formatDate(o.date)}` : formatDate(o.date)}</span>
                      <span className="font-semibold text-amber-700 dark:text-amber-300">{o.hours.toFixed(1)}h {o.type === 'week' ? '/ week' : '/ day'}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-500 dark:text-amber-400" /> Missing entries (last 14 days)
              </h3>
              {exceptions.missing.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-slate-500">No missing weekday entries in this window.</p>
              ) : (
                <ul className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {exceptions.missing.map((m) => (
                    <li key={m.date} className="rounded-lg border border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm text-gray-700 dark:text-slate-300">
                      {formatDate(m.date)}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400" /> Rejected, not yet resubmitted
              </h3>
              {exceptions.rejected.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-slate-500">No rejected entries pending resubmission.</p>
              ) : (
                <ul className="space-y-1.5">
                  {exceptions.rejected.map((r) => (
                    <li key={r.id} className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 dark:border-red-800/50 dark:bg-red-900/20 px-3 py-2 text-sm">
                      <span className="text-gray-700 dark:text-slate-200">{formatDate(r.entry_date)} — {r.work_category}</span>
                      <Link to={`/platform/timesheets/${r.id}/edit${routeKey ? `?projectId=${routeKey}` : ''}`}
                        className="text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 text-xs font-medium">Resubmit</Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {tab === 'entries' && !loading && filtered.length === 0 && view !== 'grid' && (
          <div className="text-center py-16 text-gray-500 dark:text-slate-500">
            <Clock className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No time entries yet.</p>
            {routeKey && (
              <Link to={`/platform/timesheets/new?projectId=${routeKey}`}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-medium text-white">
                <Plus className="h-4 w-4" /> Log Time
              </Link>
            )}
          </div>
        )}

        {/* Card / Weekly grouped view */}
        {tab === 'entries' && !loading && filtered.length > 0 && view === 'card' && (
          <div className="space-y-6">
            {weeks.map(([weekStart, entries]) => {
              const weekHours = entries.reduce((s, e) => s + (parseFloat(e.hours_worked) || 0), 0)
              const weekDate = new Date(weekStart)
              const weekEnd = new Date(weekDate); weekEnd.setDate(weekDate.getDate() + 6)
              return (
                <div key={weekStart}>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-slate-400">
                      Week of {weekDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} — {weekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </h3>
                    <span className="text-xs text-gray-400 dark:text-slate-500">({weekHours.toFixed(1)}h)</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {entries.map(e => (
                      <div key={e.id} className="rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatDate(e.entry_date)}</p>
                            <p className="text-xs text-gray-500 dark:text-slate-400 capitalize">{e.work_category}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{e.hours_worked}h</span>
                            <StatusBadge status={e.status} />
                          </div>
                        </div>
                        {e.description && <p className="text-xs text-gray-500 dark:text-slate-400 mb-3 line-clamp-2">{e.description}</p>}
                        <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-slate-700">
                          <RowActionButton
                            variant="view"
                            label="View entry"
                            onClick={() => navigate(`/platform/timesheets/${e.id}${routeKey ? `?projectId=${routeKey}` : ''}`)}
                          />
                          {e.status === 'draft' && (
                            <>
                              <RowActionButton
                                variant="edit"
                                label="Edit entry"
                                onClick={() => navigate(`/platform/timesheets/${e.id}/edit${routeKey ? `?projectId=${routeKey}` : ''}`)}
                              />
                              <button type="button" onClick={() => handleSubmit(e.id)}
                                className="text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 text-xs">Submit</button>
                              <RowActionButton
                                variant="delete"
                                label="Delete entry"
                                onClick={() => handleDelete(e.id)}
                              />
                            </>
                          )}
                          {e.status === 'rejected' && (
                            <Link to={`/platform/timesheets/${e.id}/edit${routeKey ? `?projectId=${routeKey}` : ''}`}
                              className="text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 text-xs">Resubmit</Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Table view */}
        {tab === 'entries' && !loading && filtered.length > 0 && view === 'table' && (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 uppercase text-xs">
                <tr>
                <TableRowNumberHeader className="!normal-case" />
                  <th className="px-4 py-3 text-left"><SortBtn k="entry_date" label="Date" /></th>
                  <th className="px-4 py-3 text-left"><SortBtn k="hours_worked" label="Hours" /></th>
                  <th className="px-4 py-3 text-left"><SortBtn k="work_category" label="Category" /></th>
                  <th className="px-4 py-3 text-left"><SortBtn k="status" label="Status" /></th>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                {filtered.map((e, index) => (
                  <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="px-4 py-3 text-gray-700 dark:text-slate-300">{formatDate(e.entry_date)}</td>
                    <td className="px-4 py-3 font-semibold text-blue-600 dark:text-blue-400">{e.hours_worked}h</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-slate-400 capitalize">{e.work_category}</td>
                    <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                    <td className="px-4 py-3 text-gray-500 dark:text-slate-400 max-w-xs truncate">{e.description || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <RowActionButton
                          variant="view"
                          label="View entry"
                          onClick={() => navigate(`/platform/timesheets/${e.id}${routeKey ? `?projectId=${routeKey}` : ''}`)}
                        />
                        {(e.status === 'draft' || e.status === 'rejected') && (
                          <RowActionButton
                            variant="edit"
                            label="Edit entry"
                            onClick={() => navigate(`/platform/timesheets/${e.id}/edit${routeKey ? `?projectId=${routeKey}` : ''}`)}
                          />
                        )}
                        {e.status === 'draft' && (
                          <>
                            <button type="button" onClick={() => handleSubmit(e.id)}
                              className="text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 text-xs">Submit</button>
                            <RowActionButton
                              variant="delete"
                              label="Delete entry"
                              onClick={() => handleDelete(e.id)}
                            />
                          </>
                        )}
                      </div>
                    </td>
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
