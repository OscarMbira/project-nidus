/**
 * Timesheet Approvals — approver queue (v963 Phase 19, GAP-13). Period-level
 * (weekly) submissions awaiting approve/reject, distinct from the existing
 * entry-level TeamTimesheetsPage. Mounted at pm/resources/timesheet-approval,
 * pmo/financial/timesheet-approvals and platform/timesheets/approvals.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, XCircle, Clock, LayoutGrid, Table2, Search } from 'lucide-react'
import { platformDb } from '@nidus/supabase'
import { RowActionButton } from '@nidus/ui'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { listPendingWeeklyApprovals, decideWeeklyTimesheet } from '../../services/timesheetPeriodService'

const EXPORT_COLUMNS = [
  { key: 'week_start_date', label: 'Week start' },
  { key: 'week_end_date', label: 'Week end' },
  { key: 'user_id', label: 'User' },
  { key: 'project_id', label: 'Project' },
  { key: 'total_hours', label: 'Total hours' },
  { key: 'approval_status', label: 'Status' },
  { key: 'submitted_at', label: 'Submitted' },
]

export default function TimesheetApproverQueuePage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [approverId, setApproverId] = useState(null)
  const [decidingId, setDecidingId] = useState(null)
  const [comment, setComment] = useState('')
  const [processing, setProcessing] = useState(null)
  const [viewMode, setViewMode] = useViewMode('timesheet-approver-queue', 'list')
  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'submitted_at', direction: 'asc' },
    storageKey: 'timesheet-approver-queue-sort',
  })

  useEffect(() => {
    platformDb.auth.getUser().then(({ data }) => setApproverId(data?.user?.id || null))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listPendingWeeklyApprovals({})
      setRows(data)
    } catch (e) {
      setError(e?.message || 'Failed to load pending approvals')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((r) => `${r.week_start_date} ${r.user_id} ${r.project_id}`.toLowerCase().includes(term))
  }, [rows, search])

  const sortAccessors = useMemo(() => ({
    week_start_date: (r) => r.week_start_date || '',
    total_hours: (r) => Number(r.total_hours) || 0,
    approval_status: (r) => r.approval_status || '',
    submitted_at: (r) => r.submitted_at || '',
  }), [])

  const sorted = sortedData(filtered, sortAccessors)

  const startDecision = (row) => {
    setDecidingId(row.id)
    setComment('')
  }

  const handleDecide = async (row, decision) => {
    if (!comment.trim()) return
    setProcessing(row.id)
    try {
      await decideWeeklyTimesheet(row.id, approverId, decision, comment.trim())
      setRows((prev) => prev.filter((r) => r.id !== row.id))
      setDecidingId(null)
      setComment('')
    } catch (e) {
      setError(e?.message || 'Failed to record decision')
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-3">
            <Clock className="h-7 w-7 text-blue-500" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Timesheet Approvals</h1>
          </div>
          <ExportListMenu columns={EXPORT_COLUMNS} data={sorted} baseFilename="timesheet-approvals" disabled={!sorted.length} />
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Weekly timesheet submissions awaiting your review. Entry-level approvals stay on Team Timesheets.
        </p>

        <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
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

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            No pending timesheet submissions.
          </div>
        ) : viewMode === 'list' ? (
          <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <TableRowNumberHeader className="!normal-case" />
                  <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('week_start_date')} onSort={() => handleSort('week_start_date')} className="!normal-case whitespace-nowrap">Week</TableHeaderCell>
                  <TableHeaderCell sortable={false} className="!normal-case whitespace-nowrap">User</TableHeaderCell>
                  <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('total_hours')} onSort={() => handleSort('total_hours')} className="!normal-case whitespace-nowrap">Hours</TableHeaderCell>
                  <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('approval_status')} onSort={() => handleSort('approval_status')} className="!normal-case whitespace-nowrap">Status</TableHeaderCell>
                  <TableHeaderCell sortable={false} className="!normal-case text-right">Actions</TableHeaderCell>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {sorted.map((row, index) => (
                  <>
                    <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <TableRowNumberCell number={getDisplayRowNumber(index)} />
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{row.week_start_date} → {row.week_end_date}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 font-mono text-xs">{row.user_id?.slice(0, 8)}…</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{row.total_hours}h</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 capitalize">{row.approval_status.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-3 justify-end">
                          <RowActionButton variant="view" label="View timesheet" onClick={() => navigate(`/platform/timesheets/weekly/${row.id}`)} />
                          {decidingId !== row.id && (
                            <button type="button" onClick={() => startDecision(row)} className="text-blue-600 dark:text-blue-400 hover:underline text-xs font-medium">
                              Review
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {decidingId === row.id && (
                      <tr key={`${row.id}-review`} className="bg-gray-50 dark:bg-gray-800/70">
                        <td />
                        <td colSpan={5} className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <input
                              type="text"
                              value={comment}
                              onChange={(e) => setComment(e.target.value)}
                              placeholder="Comment (required)…"
                              className="flex-1 min-w-[200px] rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                            />
                            <button
                              type="button"
                              onClick={() => handleDecide(row, 'approved')}
                              disabled={!comment.trim() || !!processing}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-3 py-2 text-sm text-white"
                            >
                              <CheckCircle className="h-4 w-4" /> Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDecide(row, 'rejected')}
                              disabled={!comment.trim() || !!processing}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 px-3 py-2 text-sm text-white"
                            >
                              <XCircle className="h-4 w-4" /> Reject
                            </button>
                            <button type="button" onClick={() => setDecidingId(null)} className="text-gray-500 dark:text-gray-400 hover:underline text-sm">
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
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
                  <span className="text-xs capitalize text-amber-600 dark:text-amber-400">{row.approval_status.replace(/_/g, ' ')}</span>
                </div>
                <p className="font-medium text-gray-900 dark:text-white">{row.week_start_date} → {row.week_end_date}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{row.user_id?.slice(0, 8)}…</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{row.total_hours}h</p>
                <div className="pt-2">
                  <RowActionButton variant="view" label="View timesheet" onClick={() => navigate(`/platform/timesheets/weekly/${row.id}`)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
