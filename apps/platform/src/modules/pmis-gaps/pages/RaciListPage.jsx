/**
 * RACI Matrix (GAP-10) — list page. v963 Phase 12.
 * Full CRUD: Create (New Matrix), View / Edit (matrix editor), Delete (soft).
 */
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Plus, Search, Table2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import RowActionButton from '@nidus/ui/RowActionButton'
import RowNumberBadge from '@nidus/ui/RowNumberBadge'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId'
import { listRaciMatrices, deleteRaciMatrix } from '../services/raciService'

const PAGE_SIZE = 20
const STATUS_LABEL = { draft: 'Draft', active: 'Active', archived: 'Archived' }
const STATUS_CLASS = {
  draft: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  active: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300',
  archived: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
}

function useRaciBasePath() {
  const { pathname } = useLocation()
  return pathname.startsWith('/pmo/') ? '/pmo/resources/raci' : '/pm/resources/raci'
}

export default function RaciListPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const basePath = useRaciBasePath()
  const { projectId, routeKey } = usePlatformProjectId()
  const { showSuccess, modal } = useSuccessModal()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useViewMode('pmis-raci-matrices', 'list')
  const [deletingId, setDeletingId] = useState(null)

  const withProjectQuery = useCallback(
    (path) => {
      const qs = new URLSearchParams(location.search)
      if (routeKey && !qs.get('projectId')) qs.set('projectId', routeKey)
      const q = qs.toString()
      return q ? `${path}?${q}` : path
    },
    [location.search, routeKey],
  )

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'matrix_name', direction: 'asc' },
    storageKey: 'pmis-raci-matrices-sort',
  })

  const load = useCallback(async () => {
    if (!projectId) {
      setRows([])
      setLoading(false)
      return
    }
    setLoading(true)
    const result = await listRaciMatrices(projectId)
    setRows(result.data || [])
    if (!result.success && result.error) toast.error(result.error)
    setLoading(false)
  }, [projectId])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!projectId) {
        if (!cancelled) {
          setRows([])
          setLoading(false)
        }
        return
      }
      setLoading(true)
      const result = await listRaciMatrices(projectId)
      if (!cancelled) {
        setRows(result.data || [])
        if (!result.success && result.error) toast.error(result.error)
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [projectId])

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete RACI matrix “${row.matrix_name}”? This cannot be undone from the list.`)) return
    setDeletingId(row.id)
    const result = await deleteRaciMatrix(row.id)
    setDeletingId(null)
    if (!result.success) {
      toast.error(result.error || 'Failed to delete matrix')
      return
    }
    showSuccess({
      recordId: row.matrix_name,
      operation: 'deleted',
      message: `RACI matrix “${row.matrix_name}” was deleted.`,
    })
    await load()
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((r) => (r.matrix_name || '').toLowerCase().includes(term))
  }, [rows, search])

  const sortAccessors = useMemo(
    () => ({
      matrix_name: (r) => r.matrix_name || '',
      status: (r) => r.status || '',
      updated_at: (r) => r.updated_at || '',
    }),
    [],
  )

  const sorted = sortedData(filtered, sortAccessors)
  const pageStart = (page - 1) * PAGE_SIZE
  const pageRows = sorted.slice(pageStart, pageStart + PAGE_SIZE)

  const exportColumns = [
    { key: 'matrix_name', label: 'Matrix' },
    { key: 'status', label: 'Status' },
    { key: 'matrix_version', label: 'Version' },
  ]
  const exportRows = sorted.map((r) => ({
    matrix_name: r.matrix_name,
    status: r.status,
    matrix_version: r.matrix_version,
  }))

  const rowActions = (row) => (
    <div className="inline-flex items-center gap-2 justify-end">
      <RowActionButton
        variant="view"
        label="View matrix"
        onClick={() => navigate(withProjectQuery(`${basePath}/${row.id}`))}
      />
      <RowActionButton
        variant="edit"
        label="Edit matrix"
        onClick={() => navigate(withProjectQuery(`${basePath}/${row.id}`))}
      />
      <RowActionButton
        variant="delete"
        label="Delete matrix"
        disabled={deletingId === row.id}
        onClick={() => handleDelete(row)}
      />
    </div>
  )

  if (!projectId) {
    return (
      <div className="p-8 text-gray-500 dark:text-gray-400">Select a project to manage RACI matrices.</div>
    )
  }

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Table2 className="h-6 w-6 text-blue-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">RACI Matrix</h1>
        </div>
        <div className="flex items-center gap-2">
          <ExportListMenu
            columns={exportColumns}
            data={exportRows}
            baseFilename="raci-matrices"
            disabled={exportRows.length === 0}
          />
          <button
            type="button"
            onClick={() => navigate(withProjectQuery(`${basePath}/create`))}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            New Matrix
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Search matrices…"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
          />
        </div>
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded text-sm ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-600 dark:text-gray-300'}`}
          >
            Table
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 rounded text-sm ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-600 dark:text-gray-300'}`}
          >
            Card
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading…</div>
      ) : pageRows.length === 0 ? (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          No RACI matrices yet.
        </div>
      ) : viewMode === 'list' ? (
        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <TableRowNumberHeader className="!normal-case" />
                <TableHeaderCell
                  sortable
                  sortDirection={getSortDirectionForColumn('matrix_name')}
                  onSort={() => handleSort('matrix_name')}
                  className="!normal-case whitespace-nowrap"
                >
                  Matrix
                </TableHeaderCell>
                <TableHeaderCell
                  sortable
                  sortDirection={getSortDirectionForColumn('status')}
                  onSort={() => handleSort('status')}
                  className="!normal-case whitespace-nowrap"
                >
                  Status
                </TableHeaderCell>
                <TableHeaderCell
                  sortable
                  sortDirection={getSortDirectionForColumn('updated_at')}
                  onSort={() => handleSort('updated_at')}
                  className="!normal-case whitespace-nowrap"
                >
                  Updated
                </TableHeaderCell>
                <TableHeaderCell
                  sortable={false}
                  className="!normal-case text-right sticky right-0 bg-gray-50 dark:bg-gray-700"
                >
                  Actions
                </TableHeaderCell>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {pageRows.map((row, index) => (
                <tr key={row.id} className="group hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <TableRowNumberCell number={getDisplayRowNumber(index, { page, pageSize: PAGE_SIZE })} />
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                    <button
                      type="button"
                      onClick={() => navigate(withProjectQuery(`${basePath}/${row.id}`))}
                      className="text-left font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {row.matrix_name}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${STATUS_CLASS[row.status] || STATUS_CLASS.draft}`}
                    >
                      {STATUS_LABEL[row.status] || row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                    {row.updated_at ? new Date(row.updated_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-right sticky right-0 bg-white dark:bg-gray-800 group-hover:bg-gray-50 dark:group-hover:bg-gray-700/50">
                    {rowActions(row)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pageRows.map((row, index) => (
            <div
              key={row.id}
              className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2"
            >
              <div className="flex items-start justify-between">
                <RowNumberBadge number={getDisplayRowNumber(index, { page, pageSize: PAGE_SIZE })} />
                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASS[row.status] || STATUS_CLASS.draft}`}
                >
                  {STATUS_LABEL[row.status] || row.status}
                </span>
              </div>
              <h3 className="font-medium text-gray-900 dark:text-white">{row.matrix_name}</h3>
              <div className="flex items-center gap-2 pt-2">{rowActions(row)}</div>
            </div>
          ))}
        </div>
      )}
      {modal}
    </div>
  )
}
