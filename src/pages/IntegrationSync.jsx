import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { ArrowLeft, RefreshCw, CheckCircle, XCircle, Clock, Filter } from 'lucide-react'
import { format } from 'date-fns'
import { getSyncHistory, getItemMappings } from '../services/integrationService'
import { TableRowNumberHeader, TableRowNumberCell } from '../components/ui/Table'
import { getDisplayRowNumber } from '../utils/tableRowNumberUtils'

export default function IntegrationSync() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [integration, setIntegration] = useState(null)
  const [syncHistory, setSyncHistory] = useState([])
  const [mappings, setMappings] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('history') // history, mappings
  const [filters, setFilters] = useState({
    mapping_status: '',
    external_item_type: '',
  })

  useEffect(() => {
    if (id) {
      fetchIntegration()
      fetchSyncHistory()
      fetchMappings()
    }
  }, [id, filters])

  const fetchIntegration = async () => {
    try {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('id', id)
        .eq('is_deleted', false)
        .single()

      if (error) throw error
      setIntegration(data)
    } catch (error) {
      console.error('Error fetching integration:', error)
      alert('Error loading integration: ' + error.message)
    }
  }

  const fetchSyncHistory = async () => {
    try {
      const result = await getSyncHistory(id, 50)
      if (result.success) {
        setSyncHistory(result.data)
      }
    } catch (error) {
      console.error('Error fetching sync history:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMappings = async () => {
    try {
      const result = await getItemMappings(id, filters)
      if (result.success) {
        setMappings(result.data)
      }
    } catch (error) {
      console.error('Error fetching mappings:', error)
    }
  }

  const handleSyncNow = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Trigger sync
      const { error } = await supabase
        .from('integration_sync_log')
        .insert({
          integration_id: id,
          sync_type: 'manual',
          sync_direction: integration.sync_direction || 'bidirectional',
          sync_status: 'running',
          created_by: user.id,
        })

      if (error) throw error
      alert('Sync started!')
      fetchSyncHistory()
    } catch (error) {
      console.error('Error starting sync:', error)
      alert('Error starting sync: ' + error.message)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      case 'running': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate('/integrations')}
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Integrations
      </button>

      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {integration?.integration_name} - Sync
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              View sync history and item mappings
            </p>
          </div>
          <button
            onClick={handleSyncNow}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Sync Now
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('history')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Sync History
          </button>
          <button
            onClick={() => setActiveTab('mappings')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'mappings'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Item Mappings ({mappings.length})
          </button>
        </nav>
      </div>

      {/* Sync History Tab */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {syncHistory.length === 0 ? (
            <div className="text-center py-12">
              <RefreshCw className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">No Sync History</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm">Sync operations will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                <TableRowNumberHeader className="!normal-case" />
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Started
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Items Synced
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Duration
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {syncHistory.map((sync, index) => (
                    <tr key={sync.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {sync.started_at
                          ? format(new Date(sync.started_at), 'MMM d, yyyy HH:mm')
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white capitalize">
                        {sync.sync_type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(sync.sync_status)}`}>
                          {sync.sync_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {sync.items_synced || 0} items
                        {sync.items_created > 0 && (
                          <span className="text-green-600 dark:text-green-400 ml-2">
                            (+{sync.items_created})
                          </span>
                        )}
                        {sync.items_updated > 0 && (
                          <span className="text-blue-600 dark:text-blue-400 ml-2">
                            (~{sync.items_updated})
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {sync.duration_ms ? `${(sync.duration_ms / 1000).toFixed(2)}s` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Mappings Tab */}
      {activeTab === 'mappings' && (
        <div>
          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
            <div className="flex items-center gap-4">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={filters.mapping_status}
                onChange={(e) => setFilters({ ...filters, mapping_status: e.target.value })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="conflict">Conflict</option>
                <option value="error">Error</option>
              </select>
              <select
                value={filters.external_item_type}
                onChange={(e) => setFilters({ ...filters, external_item_type: e.target.value })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">All Types</option>
                <option value="issue">Issue</option>
                <option value="task">Task</option>
                <option value="commit">Commit</option>
                <option value="pull_request">Pull Request</option>
              </select>
            </div>
          </div>

          {/* Mappings List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {mappings.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">No Mappings</p>
                <p className="text-gray-400 dark:text-gray-500 text-sm">Item mappings will appear here after sync</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                <TableRowNumberHeader className="!normal-case" />
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        External Item
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Internal Item
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Last Synced
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {mappings.map((mapping, index) => (
                      <tr key={mapping.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {mapping.external_item_key || mapping.external_item_id}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {mapping.external_item_type}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {mapping.internal_item_id}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {mapping.internal_item_type}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${
                            mapping.mapping_status === 'active'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : mapping.mapping_status === 'conflict'
                              ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                          }`}>
                            {mapping.mapping_status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {mapping.last_synced_at
                            ? format(new Date(mapping.last_synced_at), 'MMM d, yyyy HH:mm')
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

