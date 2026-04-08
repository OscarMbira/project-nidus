/**
 * BusinessCaseList
 * Reusable list component showing all business cases with filter and action buttons.
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Eye, Edit, FileText, Search } from 'lucide-react'
import { getAllBusinessCases } from '../../services/businessCaseService'
import BusinessCaseStatusBadge from './BusinessCaseStatusBadge'
import ExportListMenu from '../ui/ExportListMenu'

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'superseded', label: 'Superseded' },
  { value: 'archived', label: 'Archived' },
]

const EXPORT_COLUMNS = [
  { key: 'case_reference', label: 'Reference' },
  { key: 'case_title', label: 'Title' },
  { key: 'document_status', label: 'Status' },
  { key: 'version_number', label: 'Version' },
  { key: 'created_date', label: 'Created Date' },
  { key: 'recommended_option', label: 'Recommended Option' },
  { key: 'overall_risk_rating', label: 'Risk Rating' },
]

export default function BusinessCaseList({ basePath = '/pmo/initiation/business-case', projectId, programmeId }) {
  const navigate = useNavigate()
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')

  const fetchCases = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAllBusinessCases({
        status: statusFilter || undefined,
        projectId: projectId || undefined,
        programmeId: programmeId || undefined,
      })
      setCases(data)
    } catch (err) {
      console.error('Error fetching business cases:', err)
      setError(err.message || 'Failed to load business cases')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, projectId, programmeId])

  useEffect(() => { fetchCases() }, [fetchCases])

  const filtered = cases.filter(c =>
    !search ||
    c.case_title?.toLowerCase().includes(search.toLowerCase()) ||
    c.case_reference?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search business cases..."
            className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none"
          >
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <ExportListMenu columns={EXPORT_COLUMNS} data={filtered} baseFilename="BusinessCases" disabled={!filtered.length} />
          <button
            onClick={() => navigate(`${basePath}/create`)}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> New Business Case
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-10 text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400 mb-2">No business cases found</p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            {statusFilter || search ? 'Try adjusting your filters.' : 'Create your first business case to get started.'}
          </p>
        </div>
      )}

      {/* Table */}
      {!loading && filtered.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Reference</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Version</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Created</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Project</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.map((bc) => (
                  <tr key={bc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono font-medium text-blue-600 dark:text-blue-400">
                      {bc.case_reference}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white max-w-xs truncate">
                      {bc.case_title}
                    </td>
                    <td className="px-4 py-3">
                      <BusinessCaseStatusBadge status={bc.document_status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{bc.version_number}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{bc.created_date}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {bc.projects?.name || bc.programmes?.name || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`${basePath}/${bc.id}/view`)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {['draft', 'rejected'].includes(bc.document_status) && (
                          <button
                            onClick={() => navigate(`${basePath}/${bc.id}/edit`)}
                            className="p-1.5 text-gray-500 hover:text-green-600 dark:hover:text-green-400"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800">
            {filtered.length} record{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  )
}
