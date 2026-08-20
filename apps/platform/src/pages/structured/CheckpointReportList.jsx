import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { useInitialFilterFromQuery } from '@nidus/shared/hooks/useInitialFilterFromQuery'
import {
  resolveCheckpointWorkPackageId,
  checkpointReportCreatePath,
  checkpointReportDetailPath,
} from '@nidus/shared/utils/checkpointReportRoutes.js'
import { FileText, Plus, Search, Filter, Calendar } from 'lucide-react'
import { getCheckpointReportsByProject } from '../../services/checkpointReportService'
import CheckpointReportStatusBadge from '../../components/structured/CheckpointReportStatusBadge'
import { format } from 'date-fns'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import ViewToggle from '@nidus/ui/ViewToggle'
import RowNumberBadge from '../../components/ui/RowNumberBadge'
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from '../../components/ui/Table'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'

const CHECKPOINT_COLUMNS = [
  { key: 'document_ref', label: 'Document Ref' },
  { key: 'report_title', label: 'Title' },
  { key: 'report_summary', label: 'Summary' },
  { key: 'checkpoint_date', label: 'Checkpoint Date' },
  { key: 'status', label: 'Status' }
]

export default function CheckpointReportList() {
  const { workPackageId: workPackageIdParam } = useParams()
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const workPackageId = resolveCheckpointWorkPackageId(workPackageIdParam)
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [pendingOnly, setPendingOnly] = useState(false)
  const [viewMode, setViewMode] = useViewMode('pm-checkpoint-reports', 'list')

  const initialQueryFilter = useInitialFilterFromQuery(['filter'])
  useEffect(() => {
    if (initialQueryFilter.filter === 'pending') setPendingOnly(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQueryFilter.filter])

  useEffect(() => {
    if (!projectId) {
      setReports([])
      setLoading(false)
      return
    }
    loadReports()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, workPackageId, statusFilter, pendingOnly])

  const loadReports = async () => {
    try {
      setLoading(true)
      const filters = pendingOnly
        ? { status_in: ['draft', 'submitted'] }
        : statusFilter !== 'all' ? { status: statusFilter } : {}
      // This page is reached both project-wide (/pm/reporting/checkpoint-reports — no
      // workPackageId in the URL) and work-package-scoped (/app/projects/:projectId/
      // work-packages/:workPackageId/checkpoint-reports) — project-scoped fetch covers
      // both, since it accepts an optional workPackageId filter.
      if (workPackageId) filters.workPackageId = workPackageId
      const data = await getCheckpointReportsByProject(projectId, filters)
      setReports(data)
    } catch (error) {
      console.error('Error loading reports:', error)
      alert('Error loading reports: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredReports = reports.filter(report => {
    const matchesSearch = !searchTerm ||
      report.report_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.document_ref?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.report_summary?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const goToReport = (report) => {
    const wpId = resolveCheckpointWorkPackageId(workPackageId, report.work_package_id)
    navigate(checkpointReportDetailPath(routeKey, wpId, report.document_ref || report.id))
  }

  const goToCreate = () => {
    navigate(checkpointReportCreatePath(routeKey, workPackageId))
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Checkpoint Reports
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {workPackageId
              ? 'Manage checkpoint reports for this work package'
              : 'Manage checkpoint reports for this project'}
          </p>
        </div>
        <div className="flex gap-2">
          <ViewToggle value={viewMode} onChange={setViewMode} ariaLabel="Checkpoint reports layout" />
          <ExportListMenu columns={CHECKPOINT_COLUMNS} data={filteredReports} baseFilename="CheckpointReports" disabled={!filteredReports.length} />
          <button
            onClick={goToCreate}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Create Report
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setPendingOnly(false)
                setStatusFilter(e.target.value)
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="reviewed">Reviewed</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          {pendingOnly && (
            <div className="md:col-span-2 flex items-center gap-2 text-sm">
              <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                Pending only (draft, submitted)
              </span>
              <button type="button" onClick={() => setPendingOnly(false)} className="text-blue-600 dark:text-blue-400 hover:underline">
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          Loading reports...
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">No checkpoint reports found</p>
          <button
            onClick={goToCreate}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Create First Report
          </button>
        </div>
      ) : viewMode === 'list' ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <TableRowNumberHeader className="!normal-case" />
                  <TableHeaderCell sortable={false} className="!normal-case">Document Ref</TableHeaderCell>
                  <TableHeaderCell sortable={false} className="!normal-case">Title</TableHeaderCell>
                  <TableHeaderCell sortable={false} className="!normal-case whitespace-nowrap">Checkpoint Date</TableHeaderCell>
                  <TableHeaderCell sortable={false} className="!normal-case">Status</TableHeaderCell>
                  <TableHeaderCell sortable={false} className="!normal-case whitespace-nowrap">Author</TableHeaderCell>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredReports.map((report, index) => (
                  <tr
                    key={report.id}
                    onClick={() => goToReport(report)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                  >
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {report.document_ref || '—'}{report.version_no ? ` v${report.version_no}` : ''}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 dark:text-white">{report.report_title || 'Untitled Report'}</div>
                      {report.report_summary && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">{report.report_summary}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {report.checkpoint_date ? format(new Date(report.checkpoint_date), 'MMM dd, yyyy') : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <CheckpointReportStatusBadge status={report.status} size="sm" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {report.author ? (report.author.full_name || report.author.email) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((report, index) => (
            <div
              key={report.id}
              onClick={() => goToReport(report)}
              className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow p-6 cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <RowNumberBadge number={getDisplayRowNumber(index)} className="shrink-0" />
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {report.report_title || 'Untitled Report'}
                    </h3>
                    <CheckpointReportStatusBadge status={report.status} />
                  </div>
                  {report.document_ref && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      {report.document_ref} - Version {report.version_no}
                    </p>
                  )}
                  {report.report_summary && (
                    <p className="text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                      {report.report_summary}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {report.checkpoint_date && format(new Date(report.checkpoint_date), 'MMM dd, yyyy')}
                    </div>
                    {report.period_start_date && report.period_end_date && (
                      <span>
                        {format(new Date(report.period_start_date), 'MMM dd')} - {format(new Date(report.period_end_date), 'MMM dd, yyyy')}
                      </span>
                    )}
                    {report.author && (
                      <span>Author: {report.author.full_name || report.author.email}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
