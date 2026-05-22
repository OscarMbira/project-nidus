import { useEffect, useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Plus, Search, LayoutGrid, Table2, ArrowUpDown, Download, Clock } from 'lucide-react'
import { platformDb } from '../../../services/supabase/supabaseClient'
import { getMyTimesheets, deleteTimesheetEntry, submitTimesheetEntry } from '../../../services/timesheetService'
import { exportListToCSV, exportListToJSON, exportListToXML, exportListToPrint } from '../../../utils/exportUtils'
import PlanningProjectBar, { usePlanningProjectId } from '../../../components/planning/PlanningProjectBar'

const VIEW_KEY = 'tm-timesheets-view-v1'

const STATUS_COLORS = {
  draft:     'bg-slate-700 text-slate-300 border-slate-600',
  submitted: 'bg-amber-900/40 text-amber-300 border-amber-700',
  approved:  'bg-emerald-900/40 text-emerald-300 border-emerald-700',
  rejected:  'bg-red-900/40 text-red-300 border-red-700',
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
  const projectId = usePlanningProjectId()
  const [userId, setUserId] = useState(null)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [view, setView] = useState(() => { try { return localStorage.getItem(VIEW_KEY) || 'card' } catch { return 'card' } })
  const [exportOpen, setExportOpen] = useState(false)
  const [sortKey, setSortKey] = useState('entry_date')
  const [sortDir, setSortDir] = useState('desc')

  useEffect(() => { try { localStorage.setItem(VIEW_KEY, view) } catch {} }, [view])

  useEffect(() => {
    platformDb.auth.getUser().then(({ data }) => setUserId(data?.user?.id || null))
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
    const name = `timesheets-${projectId || 'project'}`
    if (fmt === 'csv') exportListToCSV(EXPORT_COLS, filtered, name)
    else if (fmt === 'json') exportListToJSON(EXPORT_COLS, filtered, name)
    else if (fmt === 'xml') exportListToXML(EXPORT_COLS, filtered, name)
    else if (fmt === 'print') exportListToPrint(EXPORT_COLS, filtered, name, null)
    setExportOpen(false)
  }

  const SortBtn = ({ k, label }) => (
    <button type="button" onClick={() => cycleSort(k)}
      className="inline-flex items-center gap-1 font-medium text-slate-400 hover:text-white">
      {label}
      <ArrowUpDown className="h-3.5 w-3.5 opacity-60" />
      {sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : '⇅'}
    </button>
  )

  const weeks = groupByWeek(filtered)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6">
      <div className="max-w-5xl mx-auto">
        <PlanningProjectBar />

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 mt-4">
          <div>
            <h1 className="text-xl font-semibold text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-400" />
              My Timesheets
            </h1>
            {filtered.length > 0 && (
              <p className="text-xs text-slate-400 mt-0.5">{filtered.length} entries · {totalHours.toFixed(1)} hours total</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-slate-600 p-0.5">
              <button type="button" onClick={() => setView('card')}
                className={`px-2 py-1 rounded ${view === 'card' ? 'bg-slate-700 text-white' : 'text-slate-400'}`} title="Weekly grouped">
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setView('table')}
                className={`px-2 py-1 rounded ${view === 'table' ? 'bg-slate-700 text-white' : 'text-slate-400'}`} title="Table view">
                <Table2 className="h-4 w-4" />
              </button>
            </div>
            <div className="relative">
              <button type="button" onClick={() => setExportOpen(o => !o)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800">
                <Download className="h-4 w-4" /> Export
              </button>
              {exportOpen && filtered.length > 0 && (
                <div className="absolute right-0 z-20 mt-1 w-36 rounded-lg border border-slate-600 bg-slate-900 py-1 shadow-lg">
                  {['csv', 'json', 'xml', 'print'].map(fmt => (
                    <button key={fmt} type="button" onClick={() => handleExport(fmt)}
                      className="block w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800">
                      {fmt.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Link to={`/platform/timesheets/team${projectId ? `?projectId=${projectId}` : ''}`}
              className="text-sm text-slate-400 hover:text-slate-200">Team View</Link>
            {projectId && (
              <Link to={`/platform/timesheets/new?projectId=${projectId}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-sm font-medium text-white">
                <Plus className="h-4 w-4" /> Log Time
              </Link>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search entries…"
            className="w-full rounded-lg border border-slate-700 bg-slate-800 pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none" />
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            <Clock className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No time entries yet.</p>
            {projectId && (
              <Link to={`/platform/timesheets/new?projectId=${projectId}`}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-medium text-white">
                <Plus className="h-4 w-4" /> Log Time
              </Link>
            )}
          </div>
        )}

        {/* Card / Weekly grouped view */}
        {!loading && filtered.length > 0 && view === 'card' && (
          <div className="space-y-6">
            {weeks.map(([weekStart, entries]) => {
              const weekHours = entries.reduce((s, e) => s + (parseFloat(e.hours_worked) || 0), 0)
              const weekDate = new Date(weekStart)
              const weekEnd = new Date(weekDate); weekEnd.setDate(weekDate.getDate() + 6)
              return (
                <div key={weekStart}>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-slate-400">
                      Week of {weekDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} — {weekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </h3>
                    <span className="text-xs text-slate-500">({weekHours.toFixed(1)}h)</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {entries.map(e => (
                      <div key={e.id} className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <p className="text-sm font-semibold text-white">{formatDate(e.entry_date)}</p>
                            <p className="text-xs text-slate-400 capitalize">{e.work_category}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-blue-400">{e.hours_worked}h</span>
                            <StatusBadge status={e.status} />
                          </div>
                        </div>
                        {e.description && <p className="text-xs text-slate-400 mb-3 line-clamp-2">{e.description}</p>}
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-700">
                          <Link to={`/platform/timesheets/${e.id}${projectId ? `?projectId=${projectId}` : ''}`}
                            className="text-blue-400 hover:text-blue-300 text-xs">View</Link>
                          {e.status === 'draft' && (
                            <>
                              <Link to={`/platform/timesheets/${e.id}/edit${projectId ? `?projectId=${projectId}` : ''}`}
                                className="text-slate-400 hover:text-slate-200 text-xs">Edit</Link>
                              <button type="button" onClick={() => handleSubmit(e.id)}
                                className="text-amber-400 hover:text-amber-300 text-xs">Submit</button>
                              <button type="button" onClick={() => handleDelete(e.id)}
                                className="text-red-400 hover:text-red-300 text-xs">Delete</button>
                            </>
                          )}
                          {e.status === 'rejected' && (
                            <Link to={`/platform/timesheets/${e.id}/edit${projectId ? `?projectId=${projectId}` : ''}`}
                              className="text-amber-400 hover:text-amber-300 text-xs">Resubmit</Link>
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
        {!loading && filtered.length > 0 && view === 'table' && (
          <div className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-800 text-slate-400 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left"><SortBtn k="entry_date" label="Date" /></th>
                  <th className="px-4 py-3 text-left"><SortBtn k="hours_worked" label="Hours" /></th>
                  <th className="px-4 py-3 text-left"><SortBtn k="work_category" label="Category" /></th>
                  <th className="px-4 py-3 text-left"><SortBtn k="status" label="Status" /></th>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map(e => (
                  <tr key={e.id} className="hover:bg-slate-800/50">
                    <td className="px-4 py-3 text-slate-300">{formatDate(e.entry_date)}</td>
                    <td className="px-4 py-3 font-semibold text-blue-400">{e.hours_worked}h</td>
                    <td className="px-4 py-3 text-slate-400 capitalize">{e.work_category}</td>
                    <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                    <td className="px-4 py-3 text-slate-400 max-w-xs truncate">{e.description || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/platform/timesheets/${e.id}${projectId ? `?projectId=${projectId}` : ''}`}
                          className="text-blue-400 hover:text-blue-300 text-xs">View</Link>
                        {(e.status === 'draft' || e.status === 'rejected') && (
                          <Link to={`/platform/timesheets/${e.id}/edit${projectId ? `?projectId=${projectId}` : ''}`}
                            className="text-slate-400 hover:text-slate-200 text-xs">Edit</Link>
                        )}
                        {e.status === 'draft' && (
                          <>
                            <button type="button" onClick={() => handleSubmit(e.id)}
                              className="text-amber-400 hover:text-amber-300 text-xs">Submit</button>
                            <button type="button" onClick={() => handleDelete(e.id)}
                              className="text-red-400 hover:text-red-300 text-xs">Delete</button>
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
