/**
 * OKR Objectives — list page (GAP-03, v963 Phase 8). Simulator mirror of
 * apps/platform/src/pages/okr/OkrObjectiveListPage.jsx.
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, LayoutGrid, List as ListIcon, ListChecks } from 'lucide-react'
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { RowActionButton } from '@nidus/ui'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { listObjectivesWithCycleNames } from '../../services/okrService'

const PAGE_SIZE = 20
const BASE = '/simulator/pm/okr/objectives'

const HEALTH_CLASS = {
  on_track: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300',
  at_risk: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
  behind: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300',
  completed: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
}

export default function OkrObjectiveListPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useViewMode('okr-objectives-sim', 'list')

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'objective_title', direction: 'asc' },
    storageKey: 'okr-objectives-sim-sort',
  })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const data = await listObjectivesWithCycleNames()
      if (!cancelled) {
        setRows(data)
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((r) => (r.objective_title || '').toLowerCase().includes(term))
  }, [rows, search])

  const sortAccessors = useMemo(() => ({
    objective_title: (r) => r.objective_title || '',
    cycle_name: (r) => r.cycle_name || '',
    health_status: (r) => r.health_status || '',
    progress_pct: (r) => r.progress_pct ?? 0,
    created_at: (r) => r.created_at || '',
  }), [])

  const sorted = sortedData(filtered, sortAccessors)
  const pageStart = (page - 1) * PAGE_SIZE
  const pageRows = sorted.slice(pageStart, pageStart + PAGE_SIZE)

  const exportColumns = [
    { key: 'objective_title', label: 'Objective' },
    { key: 'cycle_name', label: 'Cycle' },
    { key: 'scope_level', label: 'Scope' },
    { key: 'health_status', label: 'Health' },
    { key: 'progress_pct', label: 'Progress %' },
  ]

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <ListChecks className="h-6 w-6 text-blue-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Objectives & Key Results</h1>
        </div>
        <div className="flex items-center gap-2">
          <ExportListMenu columns={exportColumns} data={sorted} baseFilename="okr-objectives" disabled={!sorted.length} />
          <button
            type="button"
            onClick={() => navigate(`${BASE}/create`)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            New Objective
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search objectives…"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
          />
        </div>
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button type="button" onClick={() => setViewMode('list')} className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`} aria-label="Table view">
            <ListIcon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          </button>
          <button type="button" onClick={() => setViewMode('grid')} className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`} aria-label="Card view">
            <LayoutGrid className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-gray-500 dark:text-gray-400">Loading…</div>
      ) : pageRows.length === 0 ? (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          No objectives yet.
        </div>
      ) : viewMode === 'list' ? (
        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <TableRowNumberHeader className="!normal-case" />
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('objective_title')} onSort={() => handleSort('objective_title')} className="!normal-case whitespace-nowrap">Objective</TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('cycle_name')} onSort={() => handleSort('cycle_name')} className="!normal-case whitespace-nowrap">Cycle</TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('health_status')} onSort={() => handleSort('health_status')} className="!normal-case whitespace-nowrap">Health</TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('progress_pct')} onSort={() => handleSort('progress_pct')} className="!normal-case whitespace-nowrap">Progress</TableHeaderCell>
                <TableHeaderCell sortable={false} className="!normal-case text-right sticky right-0 bg-gray-50 dark:bg-gray-700">Actions</TableHeaderCell>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {pageRows.map((row, index) => (
                <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <TableRowNumberCell number={getDisplayRowNumber(index, { page, pageSize: PAGE_SIZE })} />
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{row.objective_title}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.cycle_name}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${HEALTH_CLASS[row.health_status] || HEALTH_CLASS.on_track}`}>{(row.health_status || '').replace('_', ' ')}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{Number(row.progress_pct || 0).toFixed(0)}%</td>
                  <td className="px-4 py-3 text-right sticky right-0 bg-white dark:bg-gray-800">
                    <div className="inline-flex items-center gap-3 justify-end">
                      <RowActionButton variant="view" label="View objective" onClick={() => navigate(`${BASE}/${row.id}`)} />
                      <RowActionButton variant="edit" label="Edit objective" onClick={() => navigate(`${BASE}/${row.id}/edit`)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pageRows.map((row, index) => (
            <div key={row.id} className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2">
              <div className="flex items-start justify-between">
                <span className="text-xs text-gray-400">#{getDisplayRowNumber(index, { page, pageSize: PAGE_SIZE })}</span>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${HEALTH_CLASS[row.health_status] || HEALTH_CLASS.on_track}`}>{(row.health_status || '').replace('_', ' ')}</span>
              </div>
              <h3 className="font-medium text-gray-900 dark:text-white">{row.objective_title}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{row.cycle_name} · {Number(row.progress_pct || 0).toFixed(0)}%</p>
              <div className="flex items-center gap-3 pt-2">
                <RowActionButton variant="view" label="View objective" onClick={() => navigate(`${BASE}/${row.id}`)} />
                <RowActionButton variant="edit" label="Edit objective" onClick={() => navigate(`${BASE}/${row.id}/edit`)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
