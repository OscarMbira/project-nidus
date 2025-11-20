import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'
import { Shield, Eye, Download, Trash2, Filter } from 'lucide-react'

export default function DataAccessLog() {
  const [accessLogs, setAccessLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    access_type: '',
    data_category: '',
    start_date: '',
    end_date: ''
  })

  useEffect(() => {
    fetchAccessLogs()
  }, [filters])

  const fetchAccessLogs = async () => {
    try {
      setLoading(true)
      
      let query = supabase
        .from('data_access_logs')
        .select('*, user:user_id (id, email, full_name), data_subject:data_subject_id (id, email, full_name)')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(100)

      if (filters.access_type) {
        query = query.eq('access_type', filters.access_type)
      }
      if (filters.data_category) {
        query = query.eq('data_category', filters.data_category)
      }
      if (filters.start_date) {
        query = query.gte('created_at', filters.start_date)
      }
      if (filters.end_date) {
        query = query.lte('created_at', filters.end_date)
      }

      const { data, error } = await query

      if (error) throw error
      setAccessLogs(data || [])
    } catch (error) {
      console.error('Error fetching data access logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const getAccessTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'view':
        return <Eye className="h-4 w-4" />
      case 'export':
        return <Download className="h-4 w-4" />
      case 'delete':
        return <Trash2 className="h-4 w-4" />
      default:
        return <Shield className="h-4 w-4" />
    }
  }

  const getAccessTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'view':
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
      case 'export':
        return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200'
      case 'delete':
        return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Data Access Logs (GDPR)
        </h2>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Tracking data access for GDPR compliance
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Access Type
          </label>
          <select
            value={filters.access_type}
            onChange={(e) => setFilters({ ...filters, access_type: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">All Types</option>
            <option value="view">View</option>
            <option value="export">Export</option>
            <option value="delete">Delete</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Data Category
          </label>
          <select
            value={filters.data_category}
            onChange={(e) => setFilters({ ...filters, data_category: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">All Categories</option>
            <option value="personal_info">Personal Info</option>
            <option value="financial">Financial</option>
            <option value="health">Health</option>
            <option value="contact">Contact</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={filters.start_date}
            onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            End Date
          </label>
          <input
            type="date"
            value={filters.end_date}
            onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Timestamp
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                User
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Data Subject
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Access Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Data Category
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Purpose
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                IP Address
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {accessLogs.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  No data access logs found
                </td>
              </tr>
            ) : (
              accessLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {log.user?.email || log.user_id?.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {log.data_subject?.email || log.data_subject_id?.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded ${getAccessTypeColor(log.access_type)}`}>
                      {getAccessTypeIcon(log.access_type)}
                      {log.access_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {log.data_category}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {log.purpose || 'N/A'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 font-mono">
                    {log.ip_address || 'N/A'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

