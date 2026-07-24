/**
 * Practice Business Case List Page
 * Lists all practice business cases — no projectId required.
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FileText, Plus, Eye, Edit, Trash2, Search } from 'lucide-react'
import { getAllPracticeBCs, deletePracticeBusinessCase } from '../../services/sim/practiceBusinessCaseService'
import ExportListMenu from '../../components/ui/ExportListMenu'
import { TableRowNumberHeader, TableRowNumberCell } from '../../components/ui/Table'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'

const STATUS_COLORS = {
  draft: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
  refined: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
  approved: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
  under_review: 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200',
  archived: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'refined', label: 'Refined' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'archived', label: 'Archived' },
]

const EXPORT_COLUMNS = [
  { key: 'case_reference', label: 'Reference' },
  { key: 'case_title', label: 'Title' },
  { key: 'lifecycle_stage', label: 'Status' },
  { key: 'document_version', label: 'Version' },
  { key: 'created_at', label: 'Created' },
]

export default function PracticeBusinessCaseList() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')

  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [deleting, setDeleting] = useState(null)

  const loadCases = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await getAllPracticeBCs({
        status: statusFilter || undefined,
        projectId: projectId || undefined,
      })
      if (result.success) {
        setCases(result.data || [])
      } else {
        setError(result.error || 'Failed to load business cases')
      }
    } catch (err) {
      setError(err.message || 'Failed to load business cases')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, projectId])

  useEffect(() => { loadCases() }, [loadCases])

  const filtered = cases.filter(c =>
    !search ||
    c.case_title?.toLowerCase().includes(search.toLowerCase()) ||
    c.case_reference?.toLowerCase().includes(search.toLowerCase())
  )

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this business case? This cannot be undone.')) return
    setDeleting(id)
    const result = await deletePracticeBusinessCase(id)
    setDeleting(null)
    if (result.success) {
      setCases(prev => prev.filter(c => c.id !== id))
    } else {
      console.error('Delete failed:', result.error)
    }
  }

  const createPath = projectId
    ? `/simulator/practice-business-cases/create?projectId=${projectId}`
    : '/simulator/practice-business-cases/create'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <FileText className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Practice Business Cases</h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              Practice building business cases for your projects
            </p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by title or reference..."
            className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <ExportListMenu columns={EXPORT_COLUMNS} data={filtered} baseFilename="PracticeBusinessCases" disabled={!filtered.length} />
          <button
            onClick={() => navigate(createPath)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            <Plus className="w-4 h-4 mr-2" /> New Business Case
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
          <p className="text-gray-600 dark:text-gray-400 mb-2">No practice business cases found</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
            Create your first practice business case to get started.
          </p>
          <button
            onClick={() => navigate(createPath)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            <Plus className="w-4 h-4 mr-2" /> New Business Case
          </button>
        </div>
      )}

      {/* Table */}
      {!loading && filtered.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                <TableRowNumberHeader className="!normal-case" />
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Reference</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Project</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Version</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Created</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.map((c, index) => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="px-4 py-3 text-sm font-mono text-blue-600 dark:text-blue-400">
                      {c.case_reference || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white max-w-xs truncate">
                      {c.case_title}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {c.practice_projects?.project_name || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_COLORS[c.lifecycle_stage] || STATUS_COLORS.draft}`}>
                        {c.lifecycle_stage?.replace('_', ' ') || 'draft'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {c.document_version || 1}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate(`/simulator/practice-business-cases/${c.id}`)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/simulator/practice-business-cases/${c.id}/edit`)}
                          className="p-1.5 text-gray-500 hover:text-green-600 dark:hover:text-green-400"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          disabled={deleting === c.id}
                          className="p-1.5 text-gray-500 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-40"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800">
            {filtered.length} business case{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  )
}
