/**
 * Lessons Reports Widget
 * Compact table preview of reports generated from the lessons log
 */

import { useState, useEffect, useMemo } from 'react'
import { FileText, ArrowRight, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getLessonsReportsByProject, deleteLessonsReport } from '../../services/lessonsReportService'
import { platformProjectPath } from '@nidus/shared/utils/projectRouteParam.js'
import { RowActionButton } from '@nidus/ui'
import { TableRowNumberHeader, TableRowNumberCell } from '../ui/Table'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'

const PREVIEW_COUNT = 3

export default function LessonsReportsWidget({ projectId, routeKey, lessonsLogId }) {
  const navigate = useNavigate()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

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
    } finally {
      setLoading(false)
    }
  }

  const goToReports = () => navigate(platformProjectPath(routeKey, 'lessons', 'reports'))
  const goToReport = (report) => navigate(platformProjectPath(routeKey, 'lessons', 'reports', report.report_reference || report.id))
  const goToEdit = (report) => navigate(platformProjectPath(routeKey, 'lessons', 'reports', report.report_reference || report.id, 'edit'))
  const canEdit = (report) => report.report_status === 'draft' || report.report_status === 'submitted'

  const handleDelete = async (e, report) => {
    e.stopPropagation()
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

  const filteredReports = useMemo(() => {
    const t = searchTerm.trim().toLowerCase()
    if (!t) return reports
    return reports.filter((r) =>
      (r.report_reference || '').toLowerCase().includes(t) ||
      (r.report_type || '').toLowerCase().includes(t) ||
      (r.report_status || '').toLowerCase().includes(t)
    )
  }, [reports, searchTerm])

  const header = (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {reports.length > 0 ? `Lessons Reports (${reports.length})` : 'Lessons Reports'}
        </h3>
      </div>
      <button
        onClick={reports.length > 0 ? goToReports : () => navigate(platformProjectPath(routeKey, 'lessons', 'reports', 'create'))}
        className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
      >
        {reports.length > 0 ? 'View All' : 'Create Report'}
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  )

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        {header}
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (reports.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        {header}
        <p className="text-sm text-gray-500 dark:text-gray-400">No reports created yet</p>
      </div>
    )
  }

  const preview = filteredReports.slice(0, PREVIEW_COUNT)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      {header}

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search reports..."
          className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>

      {preview.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">No reports match your search.</p>
      ) : (
      <div className="overflow-x-auto">
        <table className="min-w-[44rem] w-full border-collapse">
          <thead className="bg-gray-50 dark:bg-gray-700/60">
            <tr>
              <TableRowNumberHeader className="!normal-case" />
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reference</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Report Date</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Version</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {preview.map((report, index) => (
              <tr
                key={report.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                onClick={() => goToReport(report)}
              >
                <TableRowNumberCell number={getDisplayRowNumber(index)} />
                <td className="px-3 py-3 whitespace-nowrap font-medium text-gray-900 dark:text-white">
                  {report.report_reference}
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-sm capitalize text-gray-700 dark:text-gray-300">
                  {report.report_type}
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(report.report_status)}`}>
                    {report.report_status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {report.report_date ? new Date(report.report_date).toLocaleDateString() : 'N/A'}
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {report.version_no || '1.0'}
                </td>
                <td className="px-3 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <div className="inline-flex items-center gap-1 justify-end">
                    <RowActionButton variant="view" label="View report" onClick={() => goToReport(report)} />
                    {canEdit(report) && (
                      <>
                        <RowActionButton variant="edit" label="Edit report" onClick={() => goToEdit(report)} />
                        <RowActionButton
                          variant="delete"
                          label="Delete report"
                          onClick={(e) => handleDelete(e, report)}
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
      )}

      {reports.length > PREVIEW_COUNT && (
        <button
          onClick={goToReports}
          className="w-full mt-4 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center gap-2"
        >
          View All {reports.length} Reports
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
