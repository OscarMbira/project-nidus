import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Plus, Search, LayoutGrid, Table2, ArrowUpDown, Download, Gavel } from 'lucide-react'
import { getDecisions, deleteDecision } from '../../services/decisionLogService'
import { exportListToCSV, exportListToJSON, exportListToXML, exportListToPrint } from '@nidus/shared/utils/exportUtils'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { RowActionButton, DashboardRegisterTabBar, RegisterOpenItemsWidget, DashboardStatCard } from '@nidus/ui'

const VIEW_KEY = 'tm-decision-log-view-v1'

const STATUS_COLORS = {
  proposed:   'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700',
  approved:   'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700',
  rejected:   'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700',
  deferred:   'bg-gray-100 text-gray-700 border-gray-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600',
  superseded: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700',
}

const PRIORITY_COLORS = {
  low:      'text-gray-600 dark:text-gray-300',
  medium:   'text-amber-700 dark:text-amber-300',
  high:     'text-orange-700 dark:text-orange-300',
  critical: 'text-red-700 dark:text-red-300',
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
  const navigate = useNavigate()
  const { projectId, loading: projectLoading } = usePlatformProjectId()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [sortKey, setSortKey] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')
  const [view, setView] = useState(() => { try { return localStorage.getItem(VIEW_KEY) || 'table' } catch { return 'table' } })
  const [exportOpen, setExportOpen] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [pageTab, setPageTab] = useState('dashboard') // 'dashboard' | 'register'

  useEffect(() => { try { localStorage.setItem(VIEW_KEY, view) } catch {} }, [view])

  const load = async () => {
    if (!projectId) {
      setRows([])
      return
    }
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
    if (statusFilter) list = list.filter(r => r.status === statusFilter)
    if (priorityFilter) list = list.filter(r => r.priority === priorityFilter)
    return sortRows(list, sortKey, sortDir)
  }, [rows, search, statusFilter, priorityFilter, sortKey, sortDir])

  const clearFiltersAndShowRegister = (next = {}) => {
    setSearch('')
    setStatusFilter(next.status || '')
    setPriorityFilter(next.priority || '')
    setPageTab('register')
  }

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

  const stats = useMemo(() => ({
    total: rows.length,
    proposed: rows.filter(r => r.status === 'proposed').length,
    approved: rows.filter(r => r.status === 'approved').length,
    rejected: rows.filter(r => r.status === 'rejected').length,
    deferred: rows.filter(r => r.status === 'deferred').length,
    critical: rows.filter(r => r.priority === 'critical').length,
  }), [rows])

  const pendingDecisions = useMemo(
    () =>
      [...rows]
        .filter((r) => r.status === 'proposed' || r.status === 'deferred')
        .sort((a, b) => new Date(b.decision_date || 0) - new Date(a.decision_date || 0))
        .slice(0, 5),
    [rows]
  )

  const SortBtn = ({ k, label }) => (
    <button type="button" onClick={() => cycleSort(k)}
      className="inline-flex items-center gap-1 text-left font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
      {label}
      <ArrowUpDown className="h-3.5 w-3.5 opacity-60" />
      {sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : '⇅'}
    </button>
  )

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
        {!projectLoading && !projectId && (
          <p className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700/50 dark:bg-amber-900/30 dark:text-amber-200">
            Select a project in the header (e.g. SEED334-PRJ-08 Velocity Freight) to load the Decision Log.
          </p>
        )}

        <div className="mb-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Gavel className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Decision Log
          </h1>
          <DashboardRegisterTabBar
            value={pageTab}
            onChange={setPageTab}
            registerLabel="Log"
            ariaLabel="Decision Log sections"
          />
        </div>

        {pageTab === 'dashboard' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4" role="tabpanel" aria-label="Decision dashboard">
            {[
              { label: 'Total', value: stats.total, accent: 'text-gray-900 dark:text-white', onClick: () => clearFiltersAndShowRegister() },
              { label: 'Proposed', value: stats.proposed, accent: 'text-amber-700 dark:text-amber-300', onClick: () => clearFiltersAndShowRegister({ status: 'proposed' }) },
              { label: 'Approved', value: stats.approved, accent: 'text-emerald-700 dark:text-emerald-300', onClick: () => clearFiltersAndShowRegister({ status: 'approved' }) },
              { label: 'Rejected', value: stats.rejected, accent: 'text-red-700 dark:text-red-300', onClick: () => clearFiltersAndShowRegister({ status: 'rejected' }) },
              { label: 'Deferred', value: stats.deferred, accent: 'text-gray-700 dark:text-gray-300', onClick: () => clearFiltersAndShowRegister({ status: 'deferred' }) },
              { label: 'Critical priority', value: stats.critical, accent: 'text-red-700 dark:text-red-300', onClick: () => clearFiltersAndShowRegister({ priority: 'critical' }) },
            ].map((card) => (
              <DashboardStatCard
                key={card.label}
                label={card.label}
                value={(loading || projectLoading) ? '—' : card.value}
                accentClassName={card.accent}
                onClick={card.onClick}
              />
            ))}
          </div>
        )}

        {pageTab === 'dashboard' && (
          <RegisterOpenItemsWidget
            title="Pending Decisions"
            icon={Gavel}
            rows={pendingDecisions}
            totalCount={stats.proposed + stats.deferred}
            columns={[
              { key: 'decision_reference', label: 'Reference', className: 'font-mono text-xs text-gray-700 dark:text-gray-200 whitespace-nowrap' },
              { key: 'decision_title', label: 'Title', className: 'font-medium text-gray-900 dark:text-white' },
              { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
              {
                key: 'priority',
                label: 'Priority',
                render: (r) => <span className={`capitalize text-sm ${PRIORITY_COLORS[r.priority] || ''}`}>{r.priority}</span>,
              },
              { key: 'decision_date', label: 'Date', className: 'text-gray-700 dark:text-gray-200 text-xs whitespace-nowrap' },
            ]}
            rowKey={(r) => r.id}
            searchFields={['decision_title', 'decision_reference']}
            onRowClick={(row) => navigate(`/simulator/governance/decisions/${row.id}`)}
            onViewAll={() => setPageTab('register')}
            viewAllLabel="Open full Decision Log"
            emptyMessage="No pending decisions"
          />
        )}

        {pageTab === 'register' && (
        <div role="tabpanel" aria-label="Decision log">
        <div className="flex flex-wrap items-center justify-end gap-2 mb-4">
            <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 p-0.5">
              <button type="button" onClick={() => setView('card')}
                className={`px-2 py-1 rounded ${view === 'card' ? 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`} title="Card view">
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setView('table')}
                className={`px-2 py-1 rounded ${view === 'table' ? 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`} title="Table view">
                <Table2 className="h-4 w-4" />
              </button>
            </div>
            <div className="relative">
              <button type="button" onClick={() => setExportOpen(o => !o)}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                <Download className="h-4 w-4" /> Export
              </button>
              {exportOpen && filtered.length > 0 && (
                <div className="absolute right-0 z-20 mt-1 w-36 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 py-1 shadow-lg">
                  {['csv', 'json', 'xml', 'print'].map(fmt => (
                    <button key={fmt} type="button" onClick={() => handleExport(fmt)}
                      className="block w-full px-3 py-2 text-left text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                      {fmt.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {projectId && (
              <Link to={`/simulator/governance/decisions/new?projectId=${projectId}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-sm font-medium text-white">
                <Plus className="h-4 w-4" /> New Decision
              </Link>
            )}
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search decisions…"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 pl-9 pr-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
            aria-label="Filter by status">
            <option value="">All statuses</option>
            <option value="proposed">Proposed</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="deferred">Deferred</option>
            <option value="superseded">Superseded</option>
          </select>
          <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
            aria-label="Filter by priority">
            <option value="">All priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          {(search || statusFilter || priorityFilter) && (
            <button type="button" onClick={() => { setSearch(''); setStatusFilter(''); setPriorityFilter(''); }}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              Clear filters
            </button>
          )}
        </div>

        {(loading || projectLoading) && (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && !projectLoading && !projectId && (
          <div className="text-center py-16 text-amber-800 dark:text-amber-200">
            <p>Select a project in the header to load the Decision Log.</p>
          </div>
        )}

        {!loading && !projectLoading && projectId && filtered.length === 0 && (
          <div className="text-center py-16 text-gray-600 dark:text-gray-300">
            <Gavel className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No decisions recorded yet.</p>
            {projectId && (
              <Link to={`/simulator/governance/decisions/new?projectId=${projectId}`}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-medium text-white">
                <Plus className="h-4 w-4" /> Record First Decision
              </Link>
            )}
          </div>
        )}

        {!loading && !projectLoading && filtered.length > 0 && view === 'table' && (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <table className="min-w-[64rem] w-full text-sm">
              <thead className="bg-gray-50 text-gray-700 uppercase text-xs dark:bg-gray-700 dark:text-gray-300">
                <tr>
                <TableRowNumberHeader className="!normal-case" />
                  <th className="px-4 py-3 text-left"><SortBtn k="decision_reference" label="Record ID" /></th>
                  <th className="px-4 py-3 text-left"><SortBtn k="decision_title" label="Title" /></th>
                  <th className="px-4 py-3 text-left"><SortBtn k="status" label="Status" /></th>
                  <th className="px-4 py-3 text-left"><SortBtn k="priority" label="Priority" /></th>
                  <th className="px-4 py-3 text-left"><SortBtn k="decision_date" label="Date" /></th>
                  <th className="px-4 py-3 text-right sticky right-0 min-w-[8.5rem] bg-gray-50 dark:bg-gray-700 z-[2] shadow-[-8px_0_12px_-8px_rgba(0,0,0,0.12)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                {filtered.map((row, index) => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 group">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-200 whitespace-nowrap">{row.decision_reference || '—'}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white min-w-[14rem]">{row.decision_title}</td>
                    <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                    <td className={`px-4 py-3 capitalize text-sm ${PRIORITY_COLORS[row.priority] || ''}`}>{row.priority}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-200 text-xs whitespace-nowrap">{row.decision_date || '—'}</td>
                    <td className="px-3 py-3 text-right sticky right-0 min-w-[8.5rem] whitespace-nowrap bg-white dark:bg-gray-800 group-hover:bg-gray-50 dark:group-hover:bg-gray-700/50 z-[2] shadow-[-8px_0_12px_-8px_rgba(0,0,0,0.12)]">
                      <div className="inline-flex items-center justify-end gap-1">
                        <RowActionButton variant="view" label="View decision" onClick={() => navigate(`/simulator/governance/decisions/${row.id}`)} />
                        <RowActionButton variant="edit" label="Edit decision" onClick={() => navigate(`/simulator/governance/decisions/${row.id}/edit?projectId=${projectId}`)} />
                        <RowActionButton variant="delete" label="Delete decision" onClick={() => handleDelete(row.id)} disabled={deleting === row.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !projectLoading && filtered.length > 0 && view === 'card' && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(row => (
              <div key={row.id} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 flex flex-col gap-3 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-xs text-gray-600 dark:text-gray-300">{row.decision_reference}</p>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm leading-snug">{row.decision_title}</p>
                  </div>
                  <StatusBadge status={row.status} />
                </div>
                {row.description && (
                  <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">{row.description}</p>
                )}
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className={`text-xs capitalize ${PRIORITY_COLORS[row.priority] || ''}`}>{row.priority} priority</span>
                  <div className="flex gap-2">
                    <RowActionButton variant="view" label="View decision" onClick={() => navigate(`/simulator/governance/decisions/${row.id}`)} />
                    <RowActionButton variant="edit" label="Edit decision" onClick={() => navigate(`/simulator/governance/decisions/${row.id}/edit?projectId=${projectId}`)} />
                    <RowActionButton variant="delete" label="Delete decision" onClick={() => handleDelete(row.id)} disabled={deleting === row.id} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
        )}
    </div>
  )
}
