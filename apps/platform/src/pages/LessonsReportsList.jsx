/**
 * Lessons Reports List Page
 * List all Lessons Reports for a project
 */

import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { platformProjectPath } from '@nidus/shared/utils/projectRouteParam.js'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { Plus, Search, FileText, Calendar, User } from 'lucide-react'
import { getLessonsReportsByProject, deleteLessonsReport } from '../services/lessonsReportService'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import { RowActionButton, ViewToggle } from '@nidus/ui'
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from '../components/ui/Table'
import RowNumberBadge from '../components/ui/RowNumberBadge'

const LESSONS_REPORT_COLUMNS = [
  { key: 'report_reference', label: 'Reference' },
  { key: 'report_type', label: 'Type' },
  { key: 'report_status', label: 'Status' },
  { key: 'report_date', label: 'Report Date' },
  { key: 'version_no', label: 'Version' },
  { key: 'author_name', label: 'Author' },
  { key: 'executive_summary', label: 'Executive Summary' }
]

const SORT_ACCESSORS = {
  report_reference: (r) => r.report_reference,
  report_type: (r) => r.report_type,
  report_status: (r) => r.report_status,
  report_date: (r) => r.report_date,
  version_no: (r) => r.version_no,
  author_name: (r) => r.author_name || r.author?.full_name,
  created_at: (r) => r.created_at,
}

export default function LessonsReportsList() {
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [viewMode, setViewMode] = useViewMode('pm-lessons-reports', 'list')

  const { sortedData, handleSort, getSortDirectionForColumn } = useSortableTable({
    defaultSort: { column: 'report_reference', direction: 'asc' },
    storageKey: 'pm-lessons-reports-sort',
  })

  useEffect(() => {
    if (projectId) {
      loadReports()
    }
  }, [projectId])

  const loadReports = async () => {
    try {
      setLoading(true)
      const result = await getLessonsReportsByProject(projectId)
      if (result.success) {
        setReports(result.data || [])
      }
    } catch (error) {
      console.error('Error loading reports:', error)
      alert('Error loading reports: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredReports = useMemo(() => {
    const filtered = reports.filter(report => {
      const matchesSearch = !searchTerm ||
        report.report_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.executive_summary?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesType = filterType === 'all' || report.report_type === filterType
      const matchesStatus = filterStatus === 'all' || report.report_status === filterStatus

      return matchesSearch && matchesType && matchesStatus
    })
    return sortedData(filtered, SORT_ACCESSORS)
  }, [reports, searchTerm, filterType, filterStatus, sortedData])

  const canEdit = (report) => report.report_status === 'draft' || report.report_status === 'submitted'

  const handleView = (report) => {
    navigate(platformProjectPath(routeKey, 'lessons', 'reports', report.report_reference || report.id))
  }

  const handleEdit = (report) => {
    navigate(platformProjectPath(routeKey, 'lessons', 'reports', report.report_reference || report.id, 'edit'))
  }

  const handleDelete = async (report) => {
    if (!confirm(`Delete report "${report.report_reference}"?`)) return
    setDeletingId(report.id)
    try {
      const result = await deleteLessonsReport(report.id)
      if (result.success) {
        setReports((prev) => prev.filter((r) => r.id !== report.id))
      } else {
        alert('Error deleting report: ' + result.error)
      }
    } catch (error) {
      console.error('Error deleting report:', error)
      alert('Error deleting report: ' + error.message)
    } finally {
      setDeletingId(null)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200'
      case 'distributed': return 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
      case 'closed': return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
      case 'under_review': return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200'
      case 'submitted': return 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200'
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Lessons Reports
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Formal lessons reports for organizational learning
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ViewToggle value={viewMode === 'list' ? 'list' : 'grid'} onChange={(v) => setViewMode(v === 'list' ? 'list' : 'grid')} ariaLabel="Lessons Reports layout" />
          <ExportListMenu columns={LESSONS_REPORT_COLUMNS} data={filteredReports} baseFilename="LessonsReports" disabled={!filteredReports.length} />
          <button
            onClick={() => navigate(platformProjectPath(routeKey, 'lessons', 'reports', 'create'))}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Report
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search reports..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Types</option>
              <option value="project">Project Reports</option>
              <option value="stage">Stage Reports</option>
              <option value="interim">Interim Reports</option>
            </select>
          </div>
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="distributed">Distributed</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reports List */}
      {filteredReports.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Reports Found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {reports.length === 0
              ? 'No lessons reports have been created for this project yet.'
              : 'No reports match your search criteria.'}
          </p>
          {reports.length === 0 && (
            <button
              onClick={() => navigate(platformProjectPath(routeKey, 'lessons', 'reports', 'create'))}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create First Report
            </button>
          )}
        </div>
      ) : viewMode === 'list' ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[72rem] w-full border-collapse">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <TableRowNumberHeader className="!normal-case" />
                  <TableHeaderCell
                    sortable
                    sortDirection={getSortDirectionForColumn('report_reference')}
                    onSort={() => handleSort('report_reference')}
                    className="!normal-case whitespace-nowrap min-w-[10rem]"
                  >
                    Reference
                  </TableHeaderCell>
                  <TableHeaderCell
                    sortable
                    sortDirection={getSortDirectionForColumn('report_type')}
                    onSort={() => handleSort('report_type')}
                    className="!normal-case whitespace-nowrap"
                  >
                    Type
                  </TableHeaderCell>
                  <TableHeaderCell
                    sortable
                    sortDirection={getSortDirectionForColumn('report_status')}
                    onSort={() => handleSort('report_status')}
                    className="!normal-case whitespace-nowrap"
                  >
                    Status
                  </TableHeaderCell>
                  <TableHeaderCell
                    sortable
                    sortDirection={getSortDirectionForColumn('report_date')}
                    onSort={() => handleSort('report_date')}
                    className="!normal-case whitespace-nowrap"
                  >
                    Report Date
                  </TableHeaderCell>
                  <TableHeaderCell
                    sortable
                    sortDirection={getSortDirectionForColumn('version_no')}
                    onSort={() => handleSort('version_no')}
                    className="!normal-case whitespace-nowrap"
                  >
                    Version
                  </TableHeaderCell>
                  <TableHeaderCell
                    sortable
                    sortDirection={getSortDirectionForColumn('author_name')}
                    onSort={() => handleSort('author_name')}
                    className="!normal-case whitespace-nowrap min-w-[10rem]"
                  >
                    Author
                  </TableHeaderCell>
                  <TableHeaderCell
                    sortable={false}
                    className="!normal-case text-right sticky right-0 min-w-[8.5rem] bg-gray-50 dark:bg-gray-700 z-[2] shadow-[-8px_0_12px_-8px_rgba(0,0,0,0.15)]"
                  >
                    Actions
                  </TableHeaderCell>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredReports.map((report, index) => (
                  <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 group">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="px-4 py-4 whitespace-nowrap font-mono text-sm text-gray-500 dark:text-gray-400">
                      {report.report_reference}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm capitalize text-gray-700 dark:text-gray-300">
                      {report.report_type}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(report.report_status)}`}>
                        {report.report_status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {report.report_date ? new Date(report.report_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {report.version_no || '1.0'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {report.author_name || report.author?.full_name || '—'}
                    </td>
                    <td
                      className="px-3 py-3 text-right sticky right-0 min-w-[8.5rem] whitespace-nowrap bg-white dark:bg-gray-800 group-hover:bg-gray-50 dark:group-hover:bg-gray-700/50 z-[2] shadow-[-8px_0_12px_-8px_rgba(0,0,0,0.12)]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center gap-1 justify-end">
                        <RowActionButton variant="view" label="View report" onClick={() => handleView(report)} />
                        {canEdit(report) && (
                          <>
                            <RowActionButton variant="edit" label="Edit report" onClick={() => handleEdit(report)} />
                            <RowActionButton
                              variant="delete"
                              label="Delete report"
                              onClick={() => handleDelete(report)}
                              disabled={deletingId === report.id}
                            />
                          </>
                        )}
                      </div>
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
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <RowNumberBadge number={getDisplayRowNumber(index)} />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {report.report_reference}
                    </h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(report.report_status)}`}>
                      {report.report_status?.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-gray-500 capitalize">{report.report_type}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {report.report_date ? new Date(report.report_date).toLocaleDateString() : 'N/A'}
                    </span>
                    {report.author_name || report.author?.full_name ? (
                      <span className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {report.author_name || report.author?.full_name}
                      </span>
                    ) : null}
                    <span>Version {report.version_no || '1.0'}</span>
                  </div>
                  {report.executive_summary && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                      {report.executive_summary.substring(0, 200)}...
                    </p>
                  )}
                </div>
                <div className="flex gap-1 ml-4">
                  <RowActionButton variant="view" label="View report" onClick={() => handleView(report)} />
                  {canEdit(report) && (
                    <>
                      <RowActionButton variant="edit" label="Edit report" onClick={() => handleEdit(report)} />
                      <RowActionButton
                        variant="delete"
                        label="Delete report"
                        onClick={() => handleDelete(report)}
                        disabled={deletingId === report.id}
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
