import { useEffect, useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Plus, Search, LayoutGrid, Table2, ArrowUpDown, Download, Gavel } from 'lucide-react'
import { getDecisions, deleteDecision } from '../../services/decisionLogService'
import { exportListToCSV, exportListToJSON, exportListToXML, exportListToPrint } from '../../utils/exportUtils'
import PlanningProjectBar, { usePlanningProjectId } from '../../components/planning/PlanningProjectBar'
import { TableRowNumberHeader, TableRowNumberCell } from '../../components/ui/Table'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'

const VIEW_KEY = 'tm-decision-log-view-v1'

const STATUS_COLORS = {
  proposed:   'bg-amber-900/40 text-amber-300 border-amber-700',
  approved:   'bg-emerald-900/40 text-emerald-300 border-emerald-700',
  rejected:   'bg-red-900/40 text-red-300 border-red-700',
  deferred:   'bg-slate-700 text-slate-300 border-slate-600',
  superseded: 'bg-purple-900/40 text-purple-300 border-purple-700',
}

const PRIORITY_COLORS = {
  low:      'text-slate-400',
  medium:   'text-amber-400',
  high:     'text-orange-400',
  critical: 'text-red-400',
}

const EXPORT_COLS = [
  { key: 'decision_reference', label: 'Reference' },
  { key: 'decision_title',     label: 'Title' },
  { key: 'status',             label: 'Status' },
  { key: 'priority',           label: 'Priority' },
  { key: 'decision_date',      label: 'Date' },
  { key: 'decided_by_name',    label: 'Decided By' },
]

function sortRows(rows, key, dir) {
  const mul = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => String(a[key] ?? '').localeCompare(String(b[key] ?? '')) * mul)
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[status] || STATUS_COLORS.proposed}`}>
      {status}
    </span>
  )
}

export default function DecisionLogPage() {
  const projectId = usePlanningProjectId()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')
  const [view, setView] = useState(() => { try { return localStorage.getItem(VIEW_KEY) || 'table' } catch { return 'table' } })
  const [exportOpen, setExportOpen] = useState(false)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => { try { localStorage.setItem(VIEW_KEY, view) } catch {} }, [view])

  const load = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const data = await getDecisions(projectId)
      setRows(data)
    } catch (e) {
      toast.error(e?.message || 'Failed to load decisions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [projectId])

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase()
    let list = t
      ? rows.filter(r =>
          (r.decision_title || '').toLowerCase().includes(t) ||
          (r.decision_reference || '').toLowerCase().includes(t) ||
          (r.status || '').toLowerCase().includes(t) ||
          (r.category || '').toLowerCase().includes(t)
        )
      : rows
    return sortRows(list, sortKey, sortDir)
  }, [rows, search, sortKey, sortDir])

  const cycleSort = (key) => {
    if (sortKey !== key) { setSortKey(key); setSortDir('asc') }
    else setSortDir(d => d === 'asc' ? 'desc' : 'asc')
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this decision?')) return
    setDeleting(id)
    try {
      await deleteDecision(id)
      setRows(r => r.filter(x => x.id !== id))
      toast.success('Decision deleted')
    } catch (e) {
      toast.error(e?.message || 'Delete failed')
    } finally {
      setDeleting(null)
    }
  }

  const handleExport = (fmt) => {
    const name = `decision-log-${projectId || 'project'}`
    if (fmt === 'csv') exportListToCSV(EXPORT_COLS, filtered, name)
    else if (fmt === 'json') exportListToJSON(EXPORT_COLS, filtered, name)
    else if (fmt === 'xml') exportListToXML(EXPORT_COLS, filtered, name)
    else if (fmt === 'print') exportListToPrint(EXPORT_COLS, filtered, name, null)
    setExportOpen(false)
  }

  const SortBtn = ({ k, label }) => (
    <button type="button" onClick={() => cycleSort(k)}
      className="inline-flex items-center gap-1 text-left font-medium text-slate-400 hover:text-white">
      {label}
      <ArrowUpDown className="h-3.5 w-3.5 opacity-60" />
      {sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : '⇅'}
    </button>
  )

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6">
      <div className="max-w-6xl mx-auto">
        <PlanningProjectBar />

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 mt-4">
          <h1 className="text-xl font-semibold text-white flex items-center gap-2">
            <Gavel className="h-5 w-5 text-blue-400" />
            Decision Log
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            {/* View toggle */}
            <div className="flex rounded-lg border border-slate-600 p-0.5">
              <button type="button" onClick={() => setView('card')}
                className={`px-2 py-1 rounded ${view === 'card' ? 'bg-slate-700 text-white' : 'text-slate-400'}`} title="Card view">
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setView('table')}
                className={`px-2 py-1 rounded ${view === 'table' ? 'bg-slate-700 text-white' : 'text-slate-400'}`} title="Table view">
                <Table2 className="h-4 w-4" />
              </button>
            </div>
            {/* Export */}
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
            {/* New */}
            {projectId && (
              <Link to={`/platform/governance/decisions/new?projectId=${projectId}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-sm font-medium text-white">
                <Plus className="h-4 w-4" /> New Decision
              </Link>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search decisions…"
            className="w-full rounded-lg border border-slate-700 bg-slate-800 pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none" />
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            <Gavel className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No decisions recorded yet.</p>
            {projectId && (
              <Link to={`/platform/governance/decisions/new?projectId=${projectId}`}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-medium text-white">
                <Plus className="h-4 w-4" /> Record First Decision
              </Link>
            )}
          </div>
        )}

        {/* Table view */}
        {!loading && filtered.length > 0 && view === 'table' && (
          <div className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-800 text-slate-400 uppercase text-xs">
                <tr>
                <TableRowNumberHeader className="!normal-case" />
                  <th className="px-4 py-3 text-left"><SortBtn k="decision_reference" label="Reference" /></th>
                  <th className="px-4 py-3 text-left"><SortBtn k="decision_title" label="Title" /></th>
                  <th className="px-4 py-3 text-left"><SortBtn k="status" label="Status" /></th>
                  <th className="px-4 py-3 text-left"><SortBtn k="priority" label="Priority" /></th>
                  <th className="px-4 py-3 text-left"><SortBtn k="decision_date" label="Date" /></th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map(row => (
                  <tr key={row.id} className="hover:bg-slate-800/50">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{row.decision_reference || '—'}</td>
                    <td className="px-4 py-3 font-medium text-slate-100 max-w-xs truncate">{row.decision_title}</td>
                    <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                    <td className={`px-4 py-3 capitalize text-sm ${PRIORITY_COLORS[row.priority] || ''}`}>{row.priority}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{row.decision_date || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/platform/governance/decisions/${row.id}`}
                          className="text-blue-400 hover:text-blue-300 text-xs">View</Link>
                        <Link to={`/platform/governance/decisions/${row.id}/edit?projectId=${projectId}`}
                          className="text-slate-400 hover:text-slate-200 text-xs">Edit</Link>
                        <button type="button" onClick={() => handleDelete(row.id)}
                          disabled={deleting === row.id}
                          className="text-red-400 hover:text-red-300 text-xs disabled:opacity-50">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Card view */}
        {!loading && filtered.length > 0 && view === 'card' && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(row => (
              <div key={row.id} className="rounded-xl border border-slate-700 bg-slate-800 p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-xs text-slate-500">{row.decision_reference}</p>
                    <p className="font-semibold text-slate-100 text-sm leading-snug">{row.decision_title}</p>
                  </div>
                  <StatusBadge status={row.status} />
                </div>
                {row.description && (
                  <p className="text-xs text-slate-400 line-clamp-2">{row.description}</p>
                )}
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-700">
                  <span className={`text-xs capitalize ${PRIORITY_COLORS[row.priority] || ''}`}>{row.priority} priority</span>
                  <div className="flex gap-2">
                    <Link to={`/platform/governance/decisions/${row.id}`}
                      className="text-blue-400 hover:text-blue-300 text-xs">View</Link>
                    <Link to={`/platform/governance/decisions/${row.id}/edit?projectId=${projectId}`}
                      className="text-slate-400 hover:text-slate-200 text-xs">Edit</Link>
                    <button type="button" onClick={() => handleDelete(row.id)}
                      disabled={deleting === row.id}
                      className="text-red-400 hover:text-red-300 text-xs disabled:opacity-50">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
