import { useState, useEffect } from 'react'
import { syncTasksToCalendar, syncMilestonesToCalendar } from '../../services/calendarSyncService'
import { supabase } from '../../services/supabaseClient'
import { Calendar, RefreshCw, CheckCircle, XCircle, Clock, Settings } from 'lucide-react'

import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'
export default function CalendarSyncConfig() {
  const [connections, setConnections] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncSettings, setSyncSettings] = useState({
    provider: 'google',
    sync_tasks: true,
    sync_milestones: true,
    sync_frequency: 'manual'
  })
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState(null)

  useEffect(() => {
    fetchConnections()
  }, [])

  const fetchConnections = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [googleResult, m365Result] = await Promise.all([
        supabase
          .from('google_connections')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .contains('connected_services', ['calendar'])
          .single(),
        supabase
          .from('microsoft365_connections')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .contains('connected_services', ['calendar'])
          .single()
      ])

      const connectionsList = []
      if (googleResult.data) connectionsList.push({ ...googleResult.data, provider: 'google' })
      if (m365Result.data) connectionsList.push({ ...m365Result.data, provider: 'microsoft365' })

      setConnections(connectionsList)

      // Get last sync
      const { data: syncLog } = await supabase
        .from('google_calendar_sync_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('last_sync_at', { ascending: false })
        .limit(1)
        .single()

      if (syncLog) {
        setLastSync({ ...syncLog, provider: 'google' })
      } else {
        const { data: outlookLog } = await supabase
          .from('outlook_sync_logs')
          .select('*')
          .eq('user_id', user.id)
          .eq('sync_type', 'calendar')
          .order('last_sync_at', { ascending: false })
          .limit(1)
          .single()

        if (outlookLog) {
          setLastSync({ ...outlookLog, provider: 'microsoft365' })
        }
      }
    } catch (error) {
      console.error('Error fetching connections:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    try {
      setSyncing(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let syncedTasks = 0
      let syncedMilestones = 0

      if (syncSettings.sync_tasks) {
        const tasksResult = await syncTasksToCalendar(user.id, syncSettings.provider)
        if (tasksResult.success) {
          syncedTasks = tasksResult.data?.synced || 0
        }
      }

      if (syncSettings.sync_milestones) {
        const milestonesResult = await syncMilestonesToCalendar(user.id, null, syncSettings.provider)
        if (milestonesResult.success) {
          syncedMilestones = milestonesResult.data?.synced || 0
        }
      }

      await fetchConnections()
      alert(`Sync completed: ${syncedTasks} tasks and ${syncedMilestones} milestones synced`)
    } catch (error) {
      console.error('Error syncing calendar:', error)
      alert('Failed to sync calendar')
    } finally {
      setSyncing(false)
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

  if (connections.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center py-8">
          <XCircle className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No calendar connections available
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Please connect Google Workspace or Microsoft 365 and enable Calendar service first
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
          <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Calendar Sync Configuration
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Sync your tasks and milestones to your calendar
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Last Sync</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {lastSync?.last_sync_at
                    ? new Date(lastSync.last_sync_at).toLocaleString()
                    : 'Never'}
                </p>
              </div>
              <Clock className="h-6 w-6 text-gray-400 dark:text-gray-500" />
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Events Synced</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {lastSync?.items_synced || lastSync?.events_synced || 0}
                </p>
              </div>
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Calendar Provider
          </label>
          <select
            value={syncSettings.provider}
            onChange={(e) => setSyncSettings({ ...syncSettings, provider: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            {connections.map((conn, index) => (
              <option key={conn.provider} value={conn.provider}>
                {conn.provider === 'google' ? 'Google Calendar' : 'Microsoft 365 Calendar'}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-4">
          <label className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Sync Tasks
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Sync assigned tasks to your calendar
              </p>
            </div>
            <input
              type="checkbox"
              checked={syncSettings.sync_tasks}
              onChange={(e) => setSyncSettings({ ...syncSettings, sync_tasks: e.target.checked })}
              className="ml-3"
            />
          </label>

          <label className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Sync Milestones
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Sync project milestones to your calendar
              </p>
            </div>
            <input
              type="checkbox"
              checked={syncSettings.sync_milestones}
              onChange={(e) => setSyncSettings({ ...syncSettings, sync_milestones: e.target.checked })}
              className="ml-3"
            />
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sync Frequency
            </label>
            <select
              value={syncSettings.sync_frequency}
              onChange={(e) => setSyncSettings({ ...syncSettings, sync_frequency: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="manual">Manual</option>
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="realtime">Real-time</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <button
            onClick={handleSync}
            disabled={syncing || (!syncSettings.sync_tasks && !syncSettings.sync_milestones)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </div>
    </div>
  )
}

