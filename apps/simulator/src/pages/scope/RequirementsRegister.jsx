import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { Plus, LayoutGrid, Table2 } from 'lucide-react'
import { useProjectRole } from '@nidus/shared/hooks/useProjectRole'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { listRequirements, saveRequirement } from '../../services/requirementsRegisterService'
import { platformDb } from '@nidus/supabase'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import RowNumberBadge from '@nidus/ui/RowNumberBadge'
import { RowActionButton, DashboardRegisterTabBar, RegisterOpenItemsWidget, DashboardStatCard } from '@nidus/ui'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'

const EXPORT_COLS = [
  { key: 'requirement_code', label: 'Record ID' },
  { key: 'name', label: 'Name' },
  { key: 'category', label: 'Category' },
  { key: 'priority', label: 'Priority' },
  { key: 'status', label: 'Status' },
  { key: 'version', label: 'Version' },
]

function SortTh({ label, col, sortCol, sortDir, onSort }) {
  const cycle = () => {
    if (sortCol !== col) onSort(col, 'asc')
    else if (sortDir === 'asc') onSort(col, 'desc')
    else if (sortDir === 'desc') onSort(col, null)
    else onSort(col, 'asc')
  }
  let icon = '⇅'
  if (sortCol === col && sortDir === 'asc') icon = '↑'
  if (sortCol === col && sortDir === 'desc') icon = '↓'
  return (
    <button type="button" onClick={cycle} className="flex items-center gap-1 text-left text-gray-700 hover:text-blue-600 dark:text-gray-200">
      {label} <span className="text-xs">{icon}</span>
    </button>
  )
}

export default function RequirementsRegister() {
  const navigate = useNavigate()
  const { projectId: routeProjectId } = useParams()
  const { projectId: contextProjectId, loading: projectLoading } = usePlatformProjectId()
  const projectId = routeProjectId || contextProjectId
  const { canEdit } = useProjectRole(projectId)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortCol, setSortCol] = useState('requirement_code')
  const [sortDir, setSortDir] = useState('asc')
  const viewKey = projectId ? `planning-req-view-${projectId}` : 'planning-req-view'
  const [view, setView] = useState(() => (typeof localStorage !== 'undefined' ? localStorage.getItem(viewKey) || 'table' : 'table'))
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [bulkMsg, setBulkMsg] = useState(null)
  const [pageTab, setPageTab] = useState('dashboard') // 'dashboard' | 'register'

  const setSort = (col, dir) => {
    setSortCol(col)
    setSortDir(dir)
  }

  const persistView = (v) => {
    setView(v)
    try {
      localStorage.setItem(viewKey, v)
    } catch {
      /* ignore */
    }
  }

  const load = useCallback(async () => {
    if (!projectId) {
      setRows([])
      setLoading(false)
      return
    }
    setLoading(true)
    const res = await listRequirements(projectId)
    if (res.success) setRows(res.data || [])
    else setRows([])
    setLoading(false)
  }, [projectId])

  useEffect(() => {
    if (projectLoading && !routeProjectId) return
    load()
  }, [load, projectLoading, routeProjectId])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = rows.filter((r) => {
      if (statusFilter && (r.status || 'unknown') !== statusFilter) return false
      if (!q) return true
      return (
        (r.name || '').toLowerCase().includes(q) ||
        (r.requirement_code || '').toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q)
      )
    })
    if (sortCol && sortDir) {
      list = [...list].sort((a, b) => {
        const va = (a[sortCol] ?? '').toString().toLowerCase()
        const vb = (b[sortCol] ?? '').toString().toLowerCase()
        if (va < vb) return sortDir === 'asc' ? -1 : 1
        if (va > vb) return sortDir === 'asc' ? 1 : -1
        return 0
      })
    }
    return list
  }, [rows, search, statusFilter, sortCol, sortDir])

  const dashboardStats = useMemo(() => {
    const byStatus = {}
    for (const r of rows) {
      const k = r.status || 'unknown'
      byStatus[k] = (byStatus[k] || 0) + 1
    }
    return {
      total: rows.length,
      byStatus,
      topStatuses: Object.entries(byStatus).sort((a, b) => b[1] - a[1]).slice(0, 4),
    }
  }, [rows])

  const pendingRequirements = useMemo(
    () => rows.filter((r) => (r.status || '').toLowerCase() !== 'approved').slice(0, 5),
    [rows]
  )

  const showRegisterFiltered = (status) => {
    setStatusFilter(status)
    setPageTab('register')
  }

  const runBulk = async () => {
    if (!projectId || !canEdit) return
    setBulkMsg(null)
    const lines = bulkText.split(/\r?\n/).filter(Boolean)
    if (!lines.length) {
      setBulkMsg('No rows.')
      return
    }
    const { data: { user } } = await platformDb.auth.getUser()
    if (!user) {
      setBulkMsg('Not signed in.')
      return
    }
    let header = true
    let ok = 0
    for (const line of lines) {
      const parts = line.split(',').map((s) => s.trim().replace(/^"|"$/g, ''))
      if (header && parts[0]?.toLowerCase() === 'requirement_code') {
        header = false
        continue
      }
      header = false
      const [code, name, category, priority] = parts
      if (!name) continue
      const res = await saveRequirement(
        projectId,
        {
          requirement_code: code || null,
          name,
          category: category || null,
          priority: priority || null,
          status: 'draft',
        },
        user.id
      )
      if (res.success) ok += 1
    }
    setBulkMsg(`Imported ${ok} requirement(s).`)
    setBulkOpen(false)
    setBulkText('')
    load()
  }

  if (projectLoading && !routeProjectId) {
    return <p className="p-6 text-gray-500 dark:text-gray-400">Loading project…</p>
  }

  if (!projectId) {
    return (
      <p className="p-6 text-gray-500 dark:text-gray-400">
        Select a project in the header to view the Requirements Register.
      </p>
    )
  }

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
      <nav className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        <Link to={`/simulator/projects/${projectId}`} className="hover:underline">
          Project
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700 dark:text-gray-300">Requirements</span>
      </nav>
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Requirements register</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Collect requirements (Process Guide 5.3).</p>
          </div>
          <DashboardRegisterTabBar
            value={pageTab}
            onChange={setPageTab}
            registerLabel="Register"
            ariaLabel="Requirements register sections"
          />
        </div>
        {pageTab === 'register' && (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <ExportListMenu columns={EXPORT_COLS} data={filtered} baseFilename={`Requirements_${projectId}`} />
            <div className="flex overflow-hidden rounded-lg border border-gray-300 dark:border-gray-600">
              <button
                type="button"
                onClick={() => persistView('table')}
                className={`p-2 text-gray-600 dark:text-gray-300 ${view === 'table' ? 'bg-gray-100 dark:bg-gray-700' : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                title="Table"
              >
                <Table2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => persistView('card')}
                className={`p-2 text-gray-600 dark:text-gray-300 ${view === 'card' ? 'bg-gray-100 dark:bg-gray-700' : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                title="Cards"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
            {canEdit && (
              <>
                <button
                  type="button"
                  onClick={() => setBulkOpen(true)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  Bulk CSV
                </button>
                <Link
                  to={`/simulator/projects/${projectId}/scope/requirements/new`}
                  className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" /> New
                </Link>
              </>
            )}
          </div>
        )}
      </div>

      {pageTab === 'dashboard' && (
        <div className="space-y-6" role="tabpanel" aria-label="Requirements dashboard">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <DashboardStatCard
              label="Total"
              value={loading ? '—' : dashboardStats.total}
              onClick={() => showRegisterFiltered('')}
            />
            {dashboardStats.topStatuses.map(([status, count]) => (
              <DashboardStatCard
                key={status}
                label={status.replace(/_/g, ' ')}
                value={loading ? '—' : count}
                className="capitalize"
                onClick={() => showRegisterFiltered(status)}
              />
            ))}
          </div>
          <RegisterOpenItemsWidget
            title="Pending Requirements"
            icon={Table2}
            rows={pendingRequirements}
            totalCount={rows.filter((r) => (r.status || '').toLowerCase() !== 'approved').length}
            loading={loading}
            columns={[
              { key: 'requirement_code', label: 'Record ID', className: 'font-mono text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap' },
              { key: 'name', label: 'Name', className: 'font-medium text-gray-900 dark:text-gray-100' },
              { key: 'category', label: 'Category', render: (r) => (r.category || '—').replace(/_/g, ' '), className: 'capitalize text-gray-600 dark:text-gray-300 whitespace-nowrap' },
              { key: 'status', label: 'Status', className: 'capitalize text-gray-600 dark:text-gray-300 whitespace-nowrap' },
            ]}
            rowKey={(r) => r.id}
            searchFields={['name', 'requirement_code']}
            onRowClick={(r) => navigate(`/simulator/projects/${projectId}/scope/requirements/${r.id}`)}
            onViewAll={() => setPageTab('register')}
            viewAllLabel="Open full Requirements Register"
            emptyMessage="No pending requirements"
          />
        </div>
      )}

      {pageTab === 'register' && (
      <div role="tabpanel" aria-label="Requirements register">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search…"
        className="mb-4 w-full max-w-md rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
      />

      {statusFilter && (
        <div className="mb-4 flex items-center gap-2 text-sm">
          <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 capitalize">
            {statusFilter.replace(/_/g, ' ')} only
          </span>
          <button type="button" onClick={() => setStatusFilter('')} className="text-blue-600 dark:text-blue-400 hover:underline">
            Clear
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">Loading…</p>
      ) : view === 'table' ? (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <table className="min-w-[64rem] w-full text-sm text-gray-900 dark:text-gray-100">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <TableRowNumberHeader className="!normal-case" />
                <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <SortTh label="Record ID" col="requirement_code" sortCol={sortCol} sortDir={sortDir} onSort={setSort} />
                </th>
                <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <SortTh label="Name" col="name" sortCol={sortCol} sortDir={sortDir} onSort={setSort} />
                </th>
                <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <SortTh label="Category" col="category" sortCol={sortCol} sortDir={sortDir} onSort={setSort} />
                </th>
                <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <SortTh label="Priority" col="priority" sortCol={sortCol} sortDir={sortDir} onSort={setSort} />
                </th>
                <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <SortTh label="Status" col="status" sortCol={sortCol} sortDir={sortDir} onSort={setSort} />
                </th>
                <th className="p-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 sticky right-0 min-w-[8.5rem] bg-gray-50 dark:bg-gray-900/50 z-[2] shadow-[-8px_0_12px_-8px_rgba(0,0,0,0.15)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map((r, index) => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 group">
                  <TableRowNumberCell number={getDisplayRowNumber(index)} />
                  <td className="p-3 font-mono text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">{r.requirement_code || '—'}</td>
                  <td className="p-3 font-medium text-gray-900 dark:text-gray-100">{r.name}</td>
                  <td className="p-3 capitalize text-gray-600 dark:text-gray-300 whitespace-nowrap">{(r.category || '—').replace(/_/g, ' ')}</td>
                  <td className="p-3 capitalize text-gray-600 dark:text-gray-300 whitespace-nowrap">{r.priority || '—'}</td>
                  <td className="p-3 capitalize text-gray-600 dark:text-gray-300 whitespace-nowrap">{r.status || '—'}</td>
                  <td
                    className="p-3 text-right sticky right-0 min-w-[8.5rem] whitespace-nowrap bg-white dark:bg-gray-800 group-hover:bg-gray-50 dark:group-hover:bg-gray-700/50 z-[2] shadow-[-8px_0_12px_-8px_rgba(0,0,0,0.12)]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="inline-flex items-center gap-1 justify-end">
                      <RowActionButton
                        variant="view"
                        label="View requirement"
                        onClick={() => navigate(`/simulator/projects/${projectId}/scope/requirements/${r.id}`)}
                      />
                      <RowActionButton
                        variant="edit"
                        label="Edit requirement"
                        onClick={() => navigate(`/simulator/projects/${projectId}/scope/requirements/${r.id}`)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r, index) => (
            <Link
              key={r.id}
              to={`/simulator/projects/${projectId}/scope/requirements/${r.id}`}
              className="relative rounded-xl border border-gray-200 bg-white p-4 hover:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-500"
            >
              <RowNumberBadge number={getDisplayRowNumber(index)} className="absolute top-3 right-3" />
              <div className="font-mono text-xs text-gray-500 dark:text-gray-400 pr-10">{r.requirement_code || '—'}</div>
              <div className="mt-1 font-medium text-gray-900 dark:text-gray-100">{r.name}</div>
              <div className="mt-2 text-xs capitalize text-gray-500 dark:text-gray-400">
                {(r.category || '—').replace(/_/g, ' ')} · {r.priority || '—'} · {r.status || '—'}
              </div>
            </Link>
          ))}
        </div>
      )}

      {bulkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Bulk CSV</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              First line optional header: requirement_code,name,category,priority — then one row per line.
            </p>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              rows={10}
              className="mt-4 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
            {bulkMsg && <p className="mt-2 text-sm text-blue-600 dark:text-blue-400">{bulkMsg}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setBulkOpen(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button type="button" onClick={runBulk} className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
                Import
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
      )}
    </div>
  )
}
