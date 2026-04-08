/**
 * CMS List Component
 * PMO Admin list view of all Communication Management Strategies
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Search, Filter, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { platformDb } from '../../services/supabaseClient'
import ExportListMenu from '../ui/ExportListMenu'

const CMS_COLUMNS = [
  { key: 'cms_reference', label: 'Reference' },
  { key: 'strategy_title', label: 'Title' },
  { key: 'status', label: 'Status' }
]

export default function CMSList({ filters = {} }) {
  const navigate = useNavigate()
  const [cmsList, setCmsList] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetchCMSList()
  }, [statusFilter, searchTerm])

  const fetchCMSList = async () => {
    try {
      setLoading(true)
      let query = platformDb
        .from('communication_management_strategies')
        .select(`
          *,
          project:project_id(id, project_name, project_code),
          author:author_id(id, full_name, email),
          owner:owner_id(id, full_name, email)
        `)
        .eq('is_deleted', false)

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      if (searchTerm) {
        query = query.or(`cms_reference.ilike.%${searchTerm}%,project.project_name.ilike.%${searchTerm}%`)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      setCmsList(data || [])
    } catch (error) {
      console.error('Error fetching CMS list:', error)
      alert('Error loading CMS list: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      case 'superseded':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4" />
      case 'under_review':
        return <Clock className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Communication Management Strategies...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Communication Management Strategies
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage all project communication management strategies
          </p>
        </div>
        <ExportListMenu columns={CMS_COLUMNS} data={cmsList} baseFilename="CMS" disabled={!cmsList.length} />
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by reference or project name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="superseded">Superseded</option>
            </select>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {cmsList.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Communication Management Strategies Found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'No CMS documents have been created yet'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {cmsList.map((cms) => (
              <div
                key={cms.id}
                onClick={() => navigate(`/projects/${cms.project_id}/cms`)}
                className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {cms.cms_reference || 'CMS Draft'}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(cms.status)}`}>
                        {getStatusIcon(cms.status)}
                        {cms.status?.replace('_', ' ').toUpperCase() || 'DRAFT'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      <strong>Project:</strong> {cms.project?.project_name || 'Unknown'} ({cms.project?.project_code || 'N/A'})
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <strong>Version:</strong> {cms.version_number || '1.0'} • 
                      <strong> Created:</strong> {new Date(cms.created_at).toLocaleDateString()}
                      {cms.owner && ` • Owner: ${cms.owner.full_name || cms.owner_name}`}
                    </p>
                  </div>
                  <div className="ml-4">
                    <FileText className="h-6 w-6 text-gray-400" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      {cmsList.length > 0 && (
        <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
          Showing {cmsList.length} Communication Management Strateg{cmsList.length === 1 ? 'y' : 'ies'}
        </div>
      )}
    </div>
  )
}
