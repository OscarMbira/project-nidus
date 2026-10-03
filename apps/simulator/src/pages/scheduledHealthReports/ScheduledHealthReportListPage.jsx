/**
 * Scheduled Health Reports — list (v963 Phase 20, GAP-23, Simulator port). Simulator mirror of
 * apps/platform/src/pages/scheduledHealthReports/ScheduledHealthReportListPage.jsx.
 * Practice-project-health-specific scheduler, kept alongside (not replacing) Simulator's
 * generic scheduled_reports feature (ScheduledReports.jsx). Mounted at
 * simulator/pm/reporting/scheduled and simulator/pmo/reporting/scheduled.
 * sim.scheduled_health_reports.project_id (not practice_project_id) references
 * sim.practice_projects — see SQL/v963u_sim_timesheet_report_integration_tables.sql.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CalendarClock, LayoutGrid, Plus, Search, Table2 } from 'lucide-react'
import { RowActionButton } from '@nidus/ui'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import PlanningProjectBar, { usePlanningProjectId } from '../../components/planning/PlanningProjectBar'
import { listSchedules, deleteSchedule } from '../../services/scheduledHealthReportService'

const EXPORT_COLUMNS = [
  { key: 'schedule_name', label: 'Schedule' },
  { key: 'frequency', label: 'Frequency' },
  { key: 'is_active', label: 'Active' },
  { key: 'next_run_at', label: 'Next run' },
  { key: 'recipient_emails', label: 'Recipients' },
]

export default function ScheduledHealthReportListPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const projectId = usePlanningProjectId()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useViewMode('scheduled-health-reports-sim', 'list')
  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'schedule_name', direction: 'asc' },
    storageKey: 'scheduled-health-reports-sim-sort',
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listSchedules({ projectId: projectId || undefined })
      setRows(data)
    } catch (e) {
      setError(e?.message || 'Failed to load scheduled reports')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((r) => (r.schedule_name || '').toLowerCase().includes(term))
  }, [rows, search])

  const sortAccessors = useMemo(() => ({
    schedule_name: (r) => r.schedule_name || '',
    frequency: (r) => r.frequency || '',
    is_active: (r) => (r.is_active ? 1 : 0),
    next_run_at: (r) => r.next_run_at || '',
  }), [])

  const sorted = sortedData(filtered, sortAccessors)
  const exportRows = useMemo(
    () => sorted.map((r) => ({ ...r, recipient_emails: (r.recipient_emails || []).join('; ') })),
    [sorted]
  )

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete schedule "${row.schedule_name}"?`)) return
    try {
      await deleteSchedule(row.id)
      await load()
    } catch (e) {
      setError(e?.message || 'Delete failed')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-3">
            <CalendarClock className="h-7 w-7 text-blue-500" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Scheduled Health Reports</h1>
          </div>
          <div className="flex items-center gap-2">
            <ExportListMenu columns={EXPORT_COLUMNS} data={exportRows} baseFilename="scheduled-health-reports" disabled={!exportRows.length} />
            <button
              type="button"
              onClick={() => navigate(`${location.pathname}/create`)}
              disabled={!projectId}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> New Schedule
            </button>
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Automated practice-project-health report schedules, frequency, and recipients.
        </p>

        <PlanningProjectBar isSim />

        <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search schedules…"
              className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
            />
          </div>
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button type="button" onClick={() => setViewMode('list')} className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`} aria-label="Table view">
              <Table2 className="h-4 w-4 text-gray-600 dark:text-gray-300" />
            </button>
            <button type="button" onClick={() => setViewMode('grid')} className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`} aria-label="Card view">
              <LayoutGrid className="h-4 w-4 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </div>

        {error && <p className="text-red-600 dark:text-red-400 mb-4" role="alert">{error}</p>}

        {!projectId ? (
          <p className="text-gray-500 dark:text-gray-400">Select a practice project to view its scheduled health reports.</p>
        ) : loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            No scheduled health reports for this project yet.
          </div>
        ) : viewMode === 'list' ? (
          <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <TableRowNumberHeader className="!normal-case" />
                  <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('schedule_name')} onSort={() => handleSort('schedule_name')} className="!normal-case whitespace-nowrap">Schedule</TableHeaderCell>
                  <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('frequency')} onSort={() => handleSort('frequency')} className="!normal-case whitespace-nowrap">Frequency</TableHeaderCell>
                  <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('is_active')} onSort={() => handleSort('is_active')} className="!normal-case whitespace-nowrap">Active</TableHeaderCell>
                  <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('next_run_at')} onSort={() => handleSort('next_run_at')} className="!normal-case whitespace-nowrap">Next run</TableHeaderCell>
                  <TableHeaderCell sortable={false} className="!normal-case text-right">Actions</TableHeaderCell>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {sorted.map((row, index) => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{row.schedule_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 capitalize">{row.frequency}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.is_active ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.next_run_at ? new Date(row.next_run_at).toLocaleString() : '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2 justify-end">
                        <RowActionButton variant="view" label="View schedule" onClick={() => navigate(`${location.pathname}/${row.id}`)} />
                        <RowActionButton variant="edit" label="Edit schedule" onClick={() => navigate(`${location.pathname}/${row.id}/edit`)} />
                        <RowActionButton variant="delete" label="Delete schedule" onClick={() => handleDelete(row)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((row, index) => (
              <div key={row.id} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <span className="text-xs text-gray-400">#{getDisplayRowNumber(index)}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{row.is_active ? 'Active' : 'Inactive'}</span>
                </div>
                <p className="font-medium text-gray-900 dark:text-white">{row.schedule_name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{row.frequency}</p>
                <div className="flex items-center gap-3 pt-2">
                  <RowActionButton variant="view" label="View schedule" onClick={() => navigate(`${location.pathname}/${row.id}`)} />
                  <RowActionButton variant="edit" label="Edit schedule" onClick={() => navigate(`${location.pathname}/${row.id}/edit`)} />
                  <RowActionButton variant="delete" label="Delete schedule" onClick={() => handleDelete(row)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
