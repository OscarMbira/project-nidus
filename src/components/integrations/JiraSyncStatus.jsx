import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'
import { syncFromJira, syncToJira, bidirectionalSync } from '../../services/jiraIntegrationService'
import { RefreshCw, Download, Upload, Repeat, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

export default function JiraSyncStatus({ connectionId }) {
  const [connection, setConnection] = useState(null)
  const [syncLogs, setSyncLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncDirection, setSyncDirection] = useState('bidirectional')

  useEffect(() => {
    fetchData()
  }, [connectionId])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      const [connectionResult, logsResult] = await Promise.all([
        supabase
          .from('jira_connections')
          .select('*')
          .eq('id', connectionId)
          .single(),
        supabase
          .from('jira_sync_logs')
          .select('*')
          .eq('jira_connection_id', connectionId)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(20)
      ])

      if (connectionResult.data) setConnection(connectionResult.data)
      if (logsResult.data) setSyncLogs(logsResult.data || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    try {
      setSyncing(true)
      let result

      if (syncDirection === 'import') {
        result = await syncFromJira(connectionId)
      } else if (syncDirection === 'export') {
        result = await syncToJira(connectionId)
      } else {
        result = await bidirectionalSync(connectionId)
      }

      if (result.success) {
        alert(`Sync completed: ${result.data?.items_synced || 0} items synced`)
        await fetchData()
      } else {
        alert(result.message || 'Sync failed')
      }
    } catch (error) {
      console.error('Error syncing:', error)
      alert('Failed to sync')
    } finally {
      setSyncing(false)
    }
  }

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
      case 'partial':
        return <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
      default:
        return <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" />
    }
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'success':
        return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200'
      case 'failed':
        return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
      case 'partial':
        return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200'
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

  if (!connection) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <p className="text-gray-500 dark:text-gray-400">No connection found</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Jira Sync Status
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {connection.jira_url} • {connection.jira_project_key}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={syncDirection}
            onChange={(e) => setSyncDirection(e.target.value)}
            disabled={syncing}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="import">Import from Jira</option>
            <option value="export">Export to Jira</option>
            <option value="bidirectional">Bidirectional</option>
          </select>
          <button
            onClick={handleSync}
            disabled={syncing || !connection.is_active}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Last Sync</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {connection.last_sync_at
                  ? new Date(connection.last_sync_at).toLocaleString()
                  : 'Never'}
              </p>
            </div>
            <Clock className="h-6 w-6 text-gray-400 dark:text-gray-500" />
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Sync Direction</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                {connection.sync_direction}
              </p>
            </div>
            <Repeat className="h-6 w-6 text-gray-400 dark:text-gray-500" />
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Sync Frequency</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                {connection.sync_frequency}
              </p>
            </div>
            <RefreshCw className="h-6 w-6 text-gray-400 dark:text-gray-500" />
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {connection.is_active ? 'Active' : 'Inactive'}
              </p>
            </div>
            {connection.is_active ? (
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            ) : (
              <XCircle className="h-6 w-6 text-gray-400 dark:text-gray-500" />
            )}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Sync History
        </h3>
        {syncLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No sync history available
          </div>
        ) : (
          <div className="space-y-3">
            {syncLogs.map((log) => (
              <div
                key={log.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(log.sync_status)}
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {log.sync_direction === 'import' ? (
                        <Download className="h-4 w-4 inline mr-1" />
                      ) : log.sync_direction === 'export' ? (
                        <Upload className="h-4 w-4 inline mr-1" />
                      ) : (
                        <Repeat className="h-4 w-4 inline mr-1" />
                      )}
                      {log.sync_direction} Sync
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {new Date(log.created_at).toLocaleString()} • {log.items_synced || 0} items synced
                      {log.items_failed > 0 && ` • ${log.items_failed} failed`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(log.sync_status)}`}>
                    {log.sync_status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

