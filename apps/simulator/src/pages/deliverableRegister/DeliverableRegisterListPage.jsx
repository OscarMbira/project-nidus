/**
 * Deliverable Register — list with status tabs (v1024 / v1025).
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { RowActionButton } from '@nidus/ui'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import {
  listDeliverables,
  softDeleteDeliverable,
  DELIVERABLE_STATUSES,
} from '../../services/deliverableRegisterService'
import { platformDb } from '@nidus/supabase'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'

const PAGE_SIZE = 20

const STATUS_LABELS = {
  planned: 'Planned',
  submitted: 'Submitted',
  accepted: 'Accepted',
  rework: 'Rework / Rejected',
}

export default function DeliverableRegisterListPage() {
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const statusFilter = searchParams.get('status') || ''
  const { showSuccess, modal } = useSuccessModal()

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [viewMode] = useViewMode('platform-deliverable-register', 'list')

  const projectSuffix = routeKey ? `?projectId=${encodeURIComponent(routeKey)}` : ''

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const res = await listDeliverables(projectId, {
        status: DELIVERABLE_STATUSES.includes(statusFilter) ? statusFilter : undefined,
      })
      if (!cancelled) {
        if (!res.success) toast.error(res.error)
        setRows(res.data || [])
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [projectId, statusFilter])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((r) =>
      [r.title, r.display_id, r.description, r.status].some((v) => String(v || '').toLowerCase().includes(term))
    )
  }, [rows, search])

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'title', direction: 'asc' },
    storageKey: 'nidus-deliverable-register-sort',
  })

  const sorted = sortedData(filtered, {
    title: (r) => r.title || '',
    status: (r) => r.status || '',
    due_date: (r) => r.due_date || '',
    display_id: (r) => r.display_id || '',
    created_at: (r) => r.created_at || '',
  })

  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const setStatus = (status) => {
    const next = new URLSearchParams(searchParams)
    if (status) next.set('status', status)
    else next.delete('status')
    if (routeKey) next.set('projectId', routeKey)
    setSearchParams(next)
    setPage(1)
  }

  const onDelete = async (row) => {
    if (!window.confirm(`Delete "${row.title}"?`)) return
    const { data: { user } } = await platformDb.auth.getUser()
    const res = await softDeleteDeliverable(row.id, user?.id)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    showSuccess({ recordId: row.display_id || row.title, operation: 'deleted', message: 'Deliverable deleted.' })
    setRows((prev) => prev.filter((r) => r.id !== row.id))
  }

  if (!projectId) {
    return <p className="p-6 text-amber-700 dark:text-amber-300">Select a project to open the Deliverable Register.</p>
  }

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
      {modal}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Deliverable Register</h1>
          <p className="text-sm text-gray-700 dark:text-gray-200">Planned · Submitted · Accepted · Rework / Rejected</p>
        </div>
        <div className="flex gap-2">
          <ExportListMenu
            columns={[
              { key: 'display_id', label: 'ID' },
              { key: 'title', label: 'Title' },
              { key: 'status', label: 'Status' },
              { key: 'due_date', label: 'Due' },
            ]}
            rows={sorted.map((r) => ({
              display_id: r.display_id,
              title: r.title,
              status: STATUS_LABELS[r.status] || r.status,
              due_date: r.due_date || '',
            }))}
            fileBaseName="deliverable-register"
          />
          <button
            type="button"
            onClick={() => navigate(`/platform/deliverable-register/create${projectSuffix}`)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white"
          >
            <Plus className="h-4 w-4" /> Add deliverable
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button type="button" onClick={() => setStatus('')} className={`px-3 py-1.5 rounded text-sm ${!statusFilter ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'}`}>All</button>
        {DELIVERABLE_STATUSES.map((s) => (
          <button key={s} type="button" onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded text-sm ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'}`}>
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="mb-3 relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search…"
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        />
      </div>

      {loading ? (
        <p className="text-gray-700 dark:text-gray-200">Loading…</p>
      ) : viewMode === 'list' ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <TableRowNumberHeader />
                <TableHeaderCell label="ID" sortKey="display_id" sortDirection={getSortDirectionForColumn('display_id')} onSort={() => handleSort('display_id')} />
                <TableHeaderCell label="Title" sortKey="title" sortDirection={getSortDirectionForColumn('title')} onSort={() => handleSort('title')} />
                <TableHeaderCell label="Status" sortKey="status" sortDirection={getSortDirectionForColumn('status')} onSort={() => handleSort('status')} />
                <TableHeaderCell label="Due" sortKey="due_date" sortDirection={getSortDirectionForColumn('due_date')} onSort={() => handleSort('due_date')} />
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r, index) => (
                <tr key={r.id} className="border-t border-gray-200 dark:border-gray-700 group">
                  <TableRowNumberCell>{getDisplayRowNumber(index, { page, pageSize: PAGE_SIZE })}</TableRowNumberCell>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{r.display_id || '—'}</td>
                  <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{r.title}</td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{STATUS_LABELS[r.status] || r.status}</td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{r.due_date || '—'}</td>
                  <td className="px-3 py-2 flex gap-1">
                    <RowActionButton variant="view" label="View" onClick={() => navigate(`/platform/deliverable-register/${encodeURIComponent(r.display_id || r.id)}${projectSuffix}`)} />
                    <RowActionButton variant="edit" label="Edit" onClick={() => navigate(`/platform/deliverable-register/${encodeURIComponent(r.display_id || r.id)}/edit${projectSuffix}`)} />
                    <RowActionButton variant="delete" label="Delete" onClick={() => onDelete(r)} />
                  </td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-gray-700 dark:text-gray-200">No deliverables.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      {sorted.length > PAGE_SIZE && (
        <div className="mt-3 flex gap-2">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 rounded border text-sm disabled:opacity-50">Prev</button>
          <button type="button" disabled={page * PAGE_SIZE >= sorted.length} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 rounded border text-sm disabled:opacity-50">Next</button>
        </div>
      )}
    </div>
  )
}
