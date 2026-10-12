/**
 * Public Intake Forms (GAP-06) — list page. v963 Phase 9 (Simulator port).
 * Simulator mirror of apps/platform/src/modules/pmis-gaps/pages/IntakeFormListPage.jsx.
 * Always sim schema (simDb) via ../../../services/intakeFormService — this app must never
 * read/write the public schema. sim.intake_forms links via `practice_project_id`, not
 * `project_id` (SQL/v963g_intake_forms_sim_schema_mirror.sql).
 */
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, FileInput } from 'lucide-react'
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import RowActionButton from '@nidus/ui/RowActionButton'
import RowNumberBadge from '@nidus/ui/RowNumberBadge'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { listFormsWithSubmissionCounts, listProjectOptions } from '../../../services/intakeFormService'

const PAGE_SIZE = 20

export default function IntakeFormListPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [projectMap, setProjectMap] = useState({})
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useViewMode('pmis-intake-forms-sim', 'list')

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'form_name', direction: 'asc' },
    storageKey: 'pmis-intake-forms-sim-sort',
  })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const [forms, projects] = await Promise.all([
        listFormsWithSubmissionCounts(),
        listProjectOptions().catch(() => []),
      ])
      if (!cancelled) {
        setRows(forms || [])
        setProjectMap(Object.fromEntries((projects || []).map((p) => [p.id, p.project_name])))
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((r) => (r.form_name || '').toLowerCase().includes(term) || (r.form_code || '').toLowerCase().includes(term))
  }, [rows, search])

  const sortAccessors = useMemo(() => ({
    form_name: (r) => r.form_name || '',
    target_entity_type: (r) => r.target_entity_type || '',
    is_active: (r) => (r.is_active ? 1 : 0),
    submission_count: (r) => r.submission_count || 0,
    created_at: (r) => r.created_at || '',
  }), [])

  const sorted = sortedData(filtered, sortAccessors)
  const pageStart = (page - 1) * PAGE_SIZE
  const pageRows = sorted.slice(pageStart, pageStart + PAGE_SIZE)

  const projectLabel = (row) => (row.practice_project_id ? projectMap[row.practice_project_id] || '—' : 'Account-wide')

  const exportColumns = [
    { key: 'form_name', label: 'Form' },
    { key: 'target_entity_type', label: 'Creates' },
    { key: 'project_label', label: 'Project' },
    { key: 'is_active', label: 'Active' },
    { key: 'submission_count', label: 'Submissions' },
  ]
  const exportRows = sorted.map((r) => ({
    form_name: r.form_name,
    target_entity_type: r.target_entity_type,
    project_label: projectLabel(r),
    is_active: r.is_active ? 'Yes' : 'No',
    submission_count: r.submission_count,
  }))

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileInput className="h-6 w-6 text-blue-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Public Intake Forms</h1>
        </div>
        <div className="flex items-center gap-2">
          <ExportListMenu columns={exportColumns} data={exportRows} baseFilename="intake-forms" disabled={exportRows.length === 0} />
          <button type="button" onClick={() => navigate('create')} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
            <Plus className="h-4 w-4" />
            New Form
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="Search forms…" className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm" />
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
          No intake forms yet.
        </div>
      ) : viewMode === 'list' ? (
        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <TableRowNumberHeader className="!normal-case" />
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('form_name')} onSort={() => handleSort('form_name')} className="!normal-case whitespace-nowrap">Form</TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('target_entity_type')} onSort={() => handleSort('target_entity_type')} className="!normal-case whitespace-nowrap">Creates</TableHeaderCell>
                <TableHeaderCell sortable={false} className="!normal-case whitespace-nowrap">Project</TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('is_active')} onSort={() => handleSort('is_active')} className="!normal-case whitespace-nowrap">Active</TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('submission_count')} onSort={() => handleSort('submission_count')} className="!normal-case whitespace-nowrap">Submissions</TableHeaderCell>
                <TableHeaderCell sortable={false} className="!normal-case text-right sticky right-0 bg-gray-50 dark:bg-gray-700">Actions</TableHeaderCell>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {pageRows.map((row, index) => (
                <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <TableRowNumberCell number={getDisplayRowNumber(index, { page, pageSize: PAGE_SIZE })} />
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{row.form_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 capitalize">{row.target_entity_type}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{projectLabel(row)}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${row.is_active ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                      {row.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    <button type="button" onClick={() => navigate(`${row.id}/submissions`)} className="hover:underline text-blue-600 dark:text-sky-300">{row.submission_count}</button>
                  </td>
                  <td className="px-4 py-3 text-right sticky right-0 bg-white dark:bg-gray-800">
                    <div className="inline-flex items-center gap-3 justify-end">
                      <RowActionButton variant="view" label="View form" onClick={() => navigate(`${row.id}`)} />
                      <RowActionButton variant="edit" label="Edit form" onClick={() => navigate(`${row.id}/edit`)} />
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
              <h3 className="font-medium text-gray-900 dark:text-white">{row.form_name}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{row.target_entity_type} · {projectLabel(row)} · {row.submission_count} submission{row.submission_count === 1 ? '' : 's'}</p>
              <div className="flex items-center gap-3 pt-2">
                <RowActionButton variant="view" label="View form" onClick={() => navigate(`${row.id}`)} />
                <RowActionButton variant="edit" label="Edit form" onClick={() => navigate(`${row.id}/edit`)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
