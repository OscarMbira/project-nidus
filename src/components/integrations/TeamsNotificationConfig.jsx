import { useState, useEffect } from 'react'
import { sendTeamsNotification, getTeamsChannels } from '../../services/microsoft365Service'
import { supabase } from '../../services/supabaseClient'
import { MessageSquare, TestTube, CheckCircle, AlertCircle, Save } from 'lucide-react'

export default function TeamsNotificationConfig({ projectId = null }) {
  const [connection, setConnection] = useState(null)
  const [channels, setChannels] = useState([])
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    channel_id: '',
    message_template: 'Project {project_name}: {event_type} - {message}',
    enabled: false
  })
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchData()
  }, [projectId])

  const fetchData = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get Microsoft 365 connection
      const { data: conn } = await supabase
        .from('microsoft365_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      if (conn) {
        setConnection(conn)
        
        // Load Teams channels
        const channelsResult = await getTeamsChannels()
        if (channelsResult.success) {
          setChannels(channelsResult.data || [])
        }
      }

      // Load notification rules for this project
      if (projectId) {
        const { data: rules } = await supabase
          .from('notification_rules')
          .select('*')
          .eq('project_id', projectId)
          .eq('notification_channel', 'teams')
          .eq('is_active', true)
          .single()

        if (rules && rules.channel_config) {
          setFormData({
            channel_id: rules.channel_config.channel_id || '',
            message_template: rules.channel_config.message_template || formData.message_template,
            enabled: true
          })
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      if (!formData.enabled) {
        // Delete rule if disabled
        if (projectId) {
          await supabase
            .from('notification_rules')
            .update({ is_active: false, updated_by: user.id })
            .eq('project_id', projectId)
            .eq('notification_channel', 'teams')
        }
        alert('Teams notifications disabled')
        return
      }

      // Save or update notification rule
      const ruleData = {
        project_id: projectId,
        event_type: 'all',
        notification_channel: 'teams',
        channel_config: {
          channel_id: formData.channel_id,
          message_template: formData.message_template
        },
        is_active: true,
        updated_by: user.id
      }

      if (projectId) {
        const { error } = await supabase
          .from('notification_rules')
          .upsert(ruleData, {
            onConflict: 'project_id,notification_channel'
          })

        if (error) throw error
      }

      alert('Teams notification configuration saved successfully')
    } catch (error) {
      console.error('Error saving configuration:', error)
      alert('Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    try {
      setTesting(true)
      const result = await sendTeamsNotification({
        channel_id: formData.channel_id,
        message: 'Test notification from Project Nidus'
      })

      if (result.success) {
        alert('Test notification sent successfully!')
      } else {
        alert(result.message || 'Failed to send test notification')
      }
    } catch (error) {
      console.error('Error testing notification:', error)
      alert('Failed to send test notification')
    } finally {
      setTesting(false)
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
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Microsoft 365 connection required
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Please connect your Microsoft 365 account first
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
          <MessageSquare className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Teams Notifications
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Configure Teams notifications for this project
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Enable Teams Notifications
            </label>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Send project updates to Teams channels
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {formData.enabled && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Teams Channel ID
              </label>
              <input
                type="text"
                value={formData.channel_id}
                onChange={(e) => setFormData({ ...formData, channel_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-mono"
                placeholder="19:channel_id@thread.tacv2"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Enter the Teams channel ID where notifications should be sent
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Message Template
              </label>
              <textarea
                value={formData.message_template}
                onChange={(e) => setFormData({ ...formData, message_template: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                rows="3"
                placeholder="Project {project_name}: {event_type} - {message}"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Available variables: {'{project_name}'}, {'{event_type}'}, {'{message}'}, {'{user_name}'}
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                onClick={handleSave}
                disabled={saving || !formData.channel_id}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
              <button
                onClick={handleTest}
                disabled={testing || !formData.channel_id}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <TestTube className="h-4 w-4" />
                {testing ? 'Sending...' : 'Send Test'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

