/**
 * Project Calendar — exceptions list (Simulator, v963 PMIS Core Gap Closure — Phase 4). Mirrors
 * apps/platform/src/pages/schedule/ProjectCalendarExceptionsList.jsx against the sim schema.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Plus, Search, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { RowActionButton } from '@nidus/ui'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import ViewToggle from '@nidus/ui/ViewToggle'
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { useSimPracticeOwner } from '../../../hooks/useSimPracticeOwner'
import { listCalendarExceptions, deleteCalendarException } from '../../../services/projectCalendarService'

const EXPORT_COLS = [
  { key: 'exception_date', label: 'Date' },
  { key: 'exception_type', label: 'Type' },
  { key: 'is_working_day', label: 'Working day?' },
  { key: 'description', label: 'Description' },
]

export default function ProjectCalendarExceptionsList() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { canEdit } = useSimPracticeOwner(projectId)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useViewMode('sim-project-calendar-exceptions', 'list')

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'exception_date', direction: 'asc' },
    storageKey: 'nidus-sim-project-calendar-exceptions-sort',
  })

  const load = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    const res = await listCalendarExceptions(projectId)
    if (res.success) setRows(res.data)
    setLoading(false)
  }, [projectId])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase()
    if (!t) return rows
    return rows.filter(
      (r) => (r.description || '').toLowerCase().includes(t) || (r.exception_type || '').toLowerCase().includes(t)
    )
  }, [rows, search])

  const accessors = useMemo(
    () => ({
      exception_date: (r) => r.exception_date || '',
      exception_type: (r) => r.exception_type || '',
      description: (r) => r.description || '',
    }),
    []
  )

  const displayRows = useMemo(() => sortedData(filtered, accessors), [filtered, sortedData, accessors])

  async function handleDelete(row) {
    if (!window.confirm('Delete this calendar exception?')) return
    const res = await deleteCalendarException(row.id)
    if (!res.success) {
      toast.error(res.error || 'Delete failed')
      return
    }
    toast.success('Calendar exception deleted')
    load()
  }

  if (!projectId) return <p className="p-6 text-gray-500 dark:text-gray-400">Missing practice project.</p>

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
      <Link
        to={`/simulator/practice-projects/${projectId}/schedule/calendar`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Working Days
      </Link>

      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Public Holidays & Exceptions</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Public holidays and other non-standard working/non-working days for this practice project.</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <ExportListMenu columns={EXPORT_COLS} data={displayRows} baseFilename="Practice_Project_Calendar_Exceptions" disabled={!displayRows.length} />
          <ViewToggle value={viewMode} onChange={setViewMode} />
          {canEdit && (
            <button
              type="button"
              onClick={() => navigate(`/simulator/practice-projects/${projectId}/schedule/calendar/exceptions/create`)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium min-h-[44px]"
            >
              <Plus className="h-4 w-4" /> Add exception
            </button>
          )}
        </div>
      </div>

      <div className="mb-4 max-w-sm">
        <div className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2">
          <Search className="h-4 w-4 text-gray-500" />
          <input
            className="flex-1 bg-transparent outline-none text-gray-900 dark:text-gray-100 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search description, type…"
          />
        </div>
      </div>

      {loading && <p className="text-gray-500 dark:text-gray-400">Loading…</p>}

      {!loading && displayRows.length === 0 && (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          No calendar exceptions yet.
        </div>
      )}

      {!loading && displayRows.length > 0 && viewMode === 'list' && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <table className="min-w-full text-sm text-left text-gray-900 dark:text-gray-100">
            <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-500 dark:text-gray-300">
              <tr>
                <TableRowNumberHeader className="!normal-case" />
                <th className="px-3 py-2 whitespace-nowrap">
                  <button type="button" className="inline-flex items-center gap-1" onClick={() => handleSort('exception_date')}>
                    Date <span className="text-[10px]">{getSortDirectionForColumn('exception_date')}</span>
                  </button>
                </th>
                <th className="px-3 py-2 whitespace-nowrap">
                  <button type="button" className="inline-flex items-center gap-1" onClick={() => handleSort('exception_type')}>
                    Type <span className="text-[10px]">{getSortDirectionForColumn('exception_type')}</span>
                  </button>
                </th>
                <th className="px-3 py-2 whitespace-nowrap">Working day?</th>
                <th className="px-3 py-2">
                  <button type="button" className="inline-flex items-center gap-1" onClick={() => handleSort('description')}>
                    Description <span className="text-[10px]">{getSortDirectionForColumn('description')}</span>
                  </button>
                </th>
                <th className="px-3 py-2 text-right sticky right-0 bg-gray-50 dark:bg-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row, index) => (
                <tr key={row.id} className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 group">
                  <TableRowNumberCell number={getDisplayRowNumber(index)} />
                  <td className="px-3 py-2 whitespace-nowrap">{row.exception_date}</td>
                  <td className="px-3 py-2 capitalize">{row.exception_type}</td>
                  <td className="px-3 py-2">{row.is_working_day ? 'Yes' : 'No'}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{row.description || '—'}</td>
                  <td className="px-3 py-2 text-right sticky right-0 bg-white dark:bg-gray-800 group-hover:bg-gray-50 dark:group-hover:bg-gray-700/50">
                    <div className="inline-flex items-center justify-end gap-1">
                      <RowActionButton
                        variant="view"
                        label="View exception"
                        onClick={() => navigate(`/simulator/practice-projects/${projectId}/schedule/calendar/exceptions/${row.id}`)}
                      />
                      {canEdit && (
                        <>
                          <RowActionButton
                            variant="edit"
                            label="Edit exception"
                            onClick={() => navigate(`/simulator/practice-projects/${projectId}/schedule/calendar/exceptions/${row.id}/edit`)}
                          />
                          <RowActionButton variant="delete" label="Delete exception" onClick={() => handleDelete(row)} />
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

      {!loading && displayRows.length > 0 && viewMode === 'card' && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {displayRows.map((row, index) => (
            <div key={row.id} className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2">
              <div className="flex items-start justify-between">
                <span className="text-xs text-gray-400">#{getDisplayRowNumber(index)}</span>
                <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 capitalize">
                  {row.exception_type}
                </span>
              </div>
              <h3 className="font-medium text-gray-900 dark:text-white">{row.exception_date}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">{row.description || '—'}</p>
              <div className="flex items-center gap-3 pt-2">
                <RowActionButton
                  variant="view"
                  label="View exception"
                  onClick={() => navigate(`/simulator/practice-projects/${projectId}/schedule/calendar/exceptions/${row.id}`)}
                />
                {canEdit && (
                  <>
                    <RowActionButton
                      variant="edit"
                      label="Edit exception"
                      onClick={() => navigate(`/simulator/practice-projects/${projectId}/schedule/calendar/exceptions/${row.id}/edit`)}
                    />
                    <RowActionButton variant="delete" label="Delete exception" onClick={() => handleDelete(row)} />
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
