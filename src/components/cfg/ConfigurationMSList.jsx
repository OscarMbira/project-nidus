/**
 * Configuration Management Strategy List Component
 * PMO Admin list view of all Configuration Management Strategies
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Search, Filter, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { platformDb } from '../../services/supabaseClient'
import ExportListMenu from '../ui/ExportListMenu'

const CFG_MS_COLUMNS = [
  { key: 'cms_reference', label: 'Reference' },
  { key: 'status', label: 'Status' },
  { key: 'version_number', label: 'Version' }
]

export default function ConfigurationMSList({ filters = {} }) {
  const navigate = useNavigate()
  const [cfgMsList, setCfgMsList] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetchConfigurationMSList()
  }, [statusFilter, searchTerm])

  const fetchConfigurationMSList = async () => {
    try {
      setLoading(true)
      let query = platformDb
        .from('configuration_management_strategies')
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
      setCfgMsList(data || [])
    } catch (error) {
      console.error('Error fetching Configuration MS list:', error)
      alert('Error loading Configuration MS list: ' + error.message)
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
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Configuration Management Strategies...</p>
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
            Configuration Management Strategies
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage all project configuration management strategies
          </p>
        </div>
        <ExportListMenu columns={CFG_MS_COLUMNS} data={cfgMsList} baseFilename="ConfigurationMS" disabled={!cfgMsList.length} />
      </div>

      {/* Search and Filters */}
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
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="superseded">Superseded</option>
            </select>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {cfgMsList.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              No Configuration Management Strategies found
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {cfgMsList.map((cfgMs) => (
              <button
                key={cfgMs.id}
                onClick={() => {
                  if (cfgMs.project) {
                    navigate(`/platform/projects/${cfgMs.project.id}/configuration-ms`)
                  }
                }}
                className="w-full px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {cfgMs.cms_reference}
                      </h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(cfgMs.status)}`}>
                        {getStatusIcon(cfgMs.status)}
                        {cfgMs.status.replace('_', ' ')}
                      </span>
                    </div>
                    {cfgMs.project && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Project: {cfgMs.project.project_name}
                        {cfgMs.project.project_code && ` (${cfgMs.project.project_code})`}
                      </p>
                    )}
                    {cfgMs.version_number && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Version {cfgMs.version_number}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    {cfgMs.created_at && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Created {new Date(cfgMs.created_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
