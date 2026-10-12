/**
 * Recurring Tasks (GAP-08) — list page. v963 Phase 11.
 * Replaces the read-only createGapListPage() stub with real CRUD (rule 65 — dedicated
 * routed pages, no modals).
 */
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Repeat } from 'lucide-react'
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import RowActionButton from '@nidus/ui/RowActionButton'
import RowNumberBadge from '@nidus/ui/RowNumberBadge'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId'
import { listRecurringTaskTemplates } from '../services/recurringTaskService'

const PAGE_SIZE = 20
// This page is mounted at several base paths (pm/settings/recurring-tasks,
// platform/recurring-tasks, …) as flat sibling <Route> entries, not a nested
// Outlet — so navigation must stay relative to the CURRENT pathname (no leading
// slash, no re-prefixed base segment) or it doubles up the path.

export default function RecurringTaskListPage() {
  const navigate = useNavigate()
  const { projectId } = usePlatformProjectId()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useViewMode('pmis-recurring-tasks', 'list')

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'template_name', direction: 'asc' },
    storageKey: 'pmis-recurring-tasks-sort',
  })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const result = await listRecurringTaskTemplates(projectId)
      if (!cancelled) {
        setRows(result.data || [])
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [projectId])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((r) => (r.template_name || '').toLowerCase().includes(term))
  }, [rows, search])

  const sortAccessors = useMemo(() => ({
    template_name: (r) => r.template_name || '',
    recurrence_pattern: (r) => r.recurrence_pattern || '',
    is_active: (r) => (r.is_active ? 1 : 0),
    created_at: (r) => r.created_at || '',
  }), [])

  const sorted = sortedData(filtered, sortAccessors)
  const pageStart = (page - 1) * PAGE_SIZE
  const pageRows = sorted.slice(pageStart, pageStart + PAGE_SIZE)

  const exportColumns = [
    { key: 'template_name', label: 'Template' },
    { key: 'entity_type', label: 'Entity Type' },
    { key: 'recurrence_pattern', label: 'Pattern' },
    { key: 'is_active', label: 'Active' },
  ]
  const exportRows = sorted.map((r) => ({
    template_name: r.template_name,
    entity_type: r.entity_type,
    recurrence_pattern: r.recurrence_pattern,
    is_active: r.is_active ? 'Yes' : 'No',
  }))

  if (!projectId) {
    return <div className="p-8 text-gray-500 dark:text-gray-400">Select a project to manage recurring tasks.</div>
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Repeat className="h-6 w-6 text-blue-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Recurring Tasks</h1>
        </div>
        <div className="flex items-center gap-2">
          <ExportListMenu columns={exportColumns} data={exportRows} baseFilename="recurring-tasks" disabled={exportRows.length === 0} />
          <button
            type="button"
            onClick={() => navigate('create')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            New Template
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
            placeholder="Search templates…"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
          />
        </div>
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button type="button" onClick={() => setViewMode('list')} className={`px-3 py-1.5 rounded text-sm ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-600 dark:text-gray-300'}`}>Table</button>
          <button type="button" onClick={() => setViewMode('grid')} className={`px-3 py-1.5 rounded text-sm ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-600 dark:text-gray-300'}`}>Card</button>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading…</div>
      ) : pageRows.length === 0 ? (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          No recurring task templates yet.
        </div>
      ) : viewMode === 'list' ? (
        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <TableRowNumberHeader className="!normal-case" />
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('template_name')} onSort={() => handleSort('template_name')} className="!normal-case whitespace-nowrap">Template</TableHeaderCell>
                <TableHeaderCell sortable={false} className="!normal-case whitespace-nowrap">Entity Type</TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('recurrence_pattern')} onSort={() => handleSort('recurrence_pattern')} className="!normal-case whitespace-nowrap">Pattern</TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('is_active')} onSort={() => handleSort('is_active')} className="!normal-case whitespace-nowrap">Active</TableHeaderCell>
                <TableHeaderCell sortable={false} className="!normal-case text-right sticky right-0 bg-gray-50 dark:bg-gray-700">Actions</TableHeaderCell>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {pageRows.map((row, index) => (
                <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <TableRowNumberCell number={getDisplayRowNumber(index, { page, pageSize: PAGE_SIZE })} />
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{row.template_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 capitalize">{row.entity_type}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 capitalize">{row.recurrence_pattern}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${row.is_active ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                      {row.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right sticky right-0 bg-white dark:bg-gray-800">
                    <div className="inline-flex items-center gap-3 justify-end">
                      <RowActionButton variant="view" label="View template" onClick={() => navigate(`${row.id}`)} />
                      <RowActionButton variant="edit" label="Edit template" onClick={() => navigate(`${row.id}/edit`)} />
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
                <RowNumberBadge number={getDisplayRowNumber(index, { page, pageSize: PAGE_SIZE })} />
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${row.is_active ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                  {row.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <h3 className="font-medium text-gray-900 dark:text-white">{row.template_name}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{row.entity_type} · {row.recurrence_pattern}</p>
              <div className="flex items-center gap-3 pt-2">
                <RowActionButton variant="view" label="View template" onClick={() => navigate(`${BASE_PATH}/${row.id}`)} />
                <RowActionButton variant="edit" label="Edit template" onClick={() => navigate(`${BASE_PATH}/${row.id}/edit`)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
