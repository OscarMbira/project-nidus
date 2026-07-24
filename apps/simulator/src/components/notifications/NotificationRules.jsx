import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'
import { configureNotificationRule, triggerNotification } from '../../services/notificationIntegrationService'
import { Bell, Plus, Trash2, Save, X, Filter } from 'lucide-react'

export default function NotificationRules({ projectId = null }) {
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    event_type: '',
    notification_channel: 'email',
    channel_config: {},
    is_active: true,
    project_id: projectId
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchRules()
  }, [projectId])

  const fetchRules = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('notification_rules')
        .select('*')
        .eq('is_deleted', false)

      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      setRules(data || [])
    } catch (error) {
      console.error('Error fetching notification rules:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const ruleData = {
        ...formData,
        updated_by: user.id
      }

      let result
      const existingRule = rules.find(r => 
        r.project_id === projectId && 
        r.event_type === formData.event_type &&
        r.notification_channel === formData.notification_channel
      )

      if (existingRule) {
        const { error } = await supabase
          .from('notification_rules')
          .update(ruleData)
          .eq('id', existingRule.id)

        if (error) throw error
      } else {
        ruleData.created_by = user.id
        const { error } = await supabase
          .from('notification_rules')
          .insert([ruleData])

        if (error) throw error
      }

      await fetchRules()
      setShowForm(false)
      setFormData({
        event_type: '',
        notification_channel: 'email',
        channel_config: {},
        is_active: true,
        project_id: projectId
      })
      alert('Notification rule saved successfully')
    } catch (error) {
      console.error('Error saving rule:', error)
      alert('Failed to save notification rule')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (ruleId) => {
    if (!confirm('Are you sure you want to delete this notification rule?')) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('notification_rules')
        .update({
          is_deleted: true,
          deleted_by: user.id,
          deleted_at: new Date().toISOString()
        })
        .eq('id', ruleId)

      if (error) throw error
      await fetchRules()
      alert('Notification rule deleted successfully')
    } catch (error) {
      console.error('Error deleting rule:', error)
      alert('Failed to delete notification rule')
    }
  }

  const handleTest = async (rule) => {
    try {
      const result = await triggerNotification(rule.event_type, {
        project_id: rule.project_id,
        test: true
      })

      if (result.success) {
        alert('Test notification sent successfully!')
      } else {
        alert(result.message || 'Failed to send test notification')
      }
    } catch (error) {
      console.error('Error testing notification:', error)
      alert('Failed to send test notification')
    }
  }

  const eventTypes = [
    { value: 'all', label: 'All Events' },
    { value: 'project.created', label: 'Project Created' },
    { value: 'project.updated', label: 'Project Updated' },
    { value: 'task.created', label: 'Task Created' },
    { value: 'task.updated', label: 'Task Updated' },
    { value: 'task.completed', label: 'Task Completed' },
    { value: 'issue.created', label: 'Issue Created' },
    { value: 'issue.resolved', label: 'Issue Resolved' },
    { value: 'risk.created', label: 'Risk Created' },
    { value: 'risk.mitigated', label: 'Risk Mitigated' }
  ]

  const channels = [
    { value: 'email', label: 'Email' },
    { value: 'slack', label: 'Slack' },
    { value: 'teams', label: 'Microsoft Teams' },
    { value: 'webhook', label: 'Webhook' }
  ]

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
          Notification Rules
        </h2>
        <button
          onClick={() => {
            setFormData({
              event_type: '',
              notification_channel: 'email',
              channel_config: {},
              is_active: true,
              project_id: projectId
            })
            setShowForm(true)
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Rule
        </button>
      </div>

      {showForm && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              New Notification Rule
            </h3>
            <button
              onClick={() => setShowForm(false)}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Event Type
              </label>
              <select
                value={formData.event_type}
                onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select event type</option>
                {eventTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notification Channel
              </label>
              <select
                value={formData.notification_channel}
                onChange={(e) => setFormData({ ...formData, notification_channel: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                {channels.map((channel) => (
                  <option key={channel.value} value={channel.value}>
                    {channel.label}
                  </option>
                ))}
              </select>
            </div>

            {(formData.notification_channel === 'slack' || formData.notification_channel === 'teams') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Channel ID
                </label>
                <input
                  type="text"
                  value={formData.channel_config?.channel_id || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    channel_config: { ...formData.channel_config, channel_id: e.target.value }
                  })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-mono"
                  placeholder="Channel ID"
                />
              </div>
            )}

            {formData.notification_channel === 'webhook' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Webhook URL
                </label>
                <input
                  type="url"
                  value={formData.channel_config?.webhook_url || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    channel_config: { ...formData.channel_config, webhook_url: e.target.value }
                  })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="https://your-webhook-url.com"
                />
              </div>
            )}

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Active
              </label>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                onClick={handleSave}
                disabled={saving || !formData.event_type || !formData.notification_channel}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Rule'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {rules.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Bell className="h-12 w-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
          <p>No notification rules configured</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {rule.event_type === 'all' ? 'All Events' : rule.event_type}
                    </h3>
                    {rule.is_active ? (
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 text-xs font-medium rounded">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-medium rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Channel: {rule.notification_channel}
                    {rule.channel_config?.channel_id && ` • Channel: ${rule.channel_config.channel_id}`}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleTest(rule)}
                  className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 text-white font-medium rounded transition-colors"
                >
                  Test
                </button>
                <button
                  onClick={() => handleDelete(rule.id)}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

