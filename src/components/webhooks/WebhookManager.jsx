import { useState, useEffect } from 'react'
import { createWebhook, updateWebhook, deleteWebhook, getWebhookEvents, triggerWebhookEvent, getWebhooks, testWebhook } from '../../services/webhookService'
import { Plus, Trash2, Save, X, TestTube, Webhook } from 'lucide-react'

export default function WebhookManager({ projectId = null }) {
  const [webhooks, setWebhooks] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingWebhook, setEditingWebhook] = useState(null)
  const [formData, setFormData] = useState({
    webhook_name: '',
    webhook_url: '',
    events: [],
    content_type: 'application/json',
    custom_headers: {},
    is_active: true,
    project_id: projectId
  })
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchData()
  }, [projectId])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [webhooksResult, eventsResult] = await Promise.all([
        getWebhooks({ project_id: projectId }),
        getWebhookEvents()
      ])

      if (webhooksResult.success) {
        setWebhooks(webhooksResult.data || [])
      }

      if (eventsResult.success) {
        setEvents(eventsResult.data || [])
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
      let result

      if (editingWebhook) {
        result = await updateWebhook(editingWebhook.id, formData)
      } else {
        result = await createWebhook(formData)
      }

      if (result.success) {
        await fetchData()
        setShowForm(false)
        setEditingWebhook(null)
        setFormData({
          webhook_name: '',
          webhook_url: '',
          events: [],
          content_type: 'application/json',
          custom_headers: {},
          is_active: true,
          project_id: projectId
        })
        alert(editingWebhook ? 'Webhook updated successfully' : 'Webhook created successfully')
      } else {
        alert(result.message || 'Failed to save webhook')
      }
    } catch (error) {
      console.error('Error saving webhook:', error)
      alert('Failed to save webhook')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (webhookId) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return

    try {
      const result = await deleteWebhook(webhookId)
      if (result.success) {
        await fetchData()
        alert('Webhook deleted successfully')
      } else {
        alert(result.message || 'Failed to delete webhook')
      }
    } catch (error) {
      console.error('Error deleting webhook:', error)
      alert('Failed to delete webhook')
    }
  }

  const handleTest = async (webhook) => {
    try {
      setTesting(true)
      const result = await testWebhook(webhook.id)

      if (result.success) {
        alert('Test webhook triggered successfully')
        await fetchData()
      } else {
        alert(result.message || 'Failed to trigger test webhook')
      }
    } catch (error) {
      console.error('Error testing webhook:', error)
      alert('Failed to test webhook')
    } finally {
      setTesting(false)
    }
  }

  const handleEdit = (webhook) => {
    setEditingWebhook(webhook)
    setFormData({
      webhook_name: webhook.webhook_name || '',
      webhook_url: webhook.webhook_url || '',
      events: webhook.events || [],
      content_type: webhook.content_type || 'application/json',
      custom_headers: webhook.custom_headers || {},
      is_active: webhook.is_active ?? true,
      project_id: webhook.project_id || projectId
    })
    setShowForm(true)
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
          Webhooks
        </h2>
        <button
          onClick={() => {
            setEditingWebhook(null)
            setFormData({
              webhook_name: '',
              webhook_url: '',
              events: [],
              content_type: 'application/json',
              custom_headers: {},
              is_active: true,
              project_id: projectId
            })
            setShowForm(true)
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Webhook
        </button>
      </div>

      {showForm && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {editingWebhook ? 'Edit Webhook' : 'New Webhook'}
            </h3>
            <button
              onClick={() => {
                setShowForm(false)
                setEditingWebhook(null)
              }}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Webhook Name
              </label>
              <input
                type="text"
                value={formData.webhook_name}
                onChange={(e) => setFormData({ ...formData, webhook_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., Task Created Webhook"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Webhook URL
              </label>
              <input
                type="url"
                value={formData.webhook_url}
                onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="https://your-server.com/webhook"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Events
              </label>
              <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-3">
                {events.map((event) => (
                  <label key={event.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.events.includes(event.event_name)}
                      onChange={(e) => {
                        const events = e.target.checked
                          ? [...formData.events, event.event_name]
                          : formData.events.filter(e => e !== event.event_name)
                        setFormData({ ...formData, events })
                      }}
                      className="mr-2"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {event.event_name}
                      </span>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {event.event_description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Content Type
              </label>
              <select
                value={formData.content_type}
                onChange={(e) => setFormData({ ...formData, content_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="application/json">application/json</option>
                <option value="application/xml">application/xml</option>
                <option value="application/x-www-form-urlencoded">application/x-www-form-urlencoded</option>
              </select>
            </div>

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
                disabled={saving || !formData.webhook_name || !formData.webhook_url || formData.events.length === 0}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Webhook'}
              </button>
              <button
                onClick={() => {
                  setShowForm(false)
                  setEditingWebhook(null)
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {webhooks.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Webhook className="h-12 w-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
          <p>No webhooks configured yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {webhooks.map((webhook) => (
            <div
              key={webhook.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                      <Webhook className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {webhook.webhook_name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                        {webhook.webhook_url}
                      </p>
                    </div>
                  </div>

                  <div className="ml-12 space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {webhook.events?.map((event, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 text-xs font-medium rounded"
                        >
                          {event}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <span>Content Type: {webhook.content_type}</span>
                      {webhook.last_triggered_at && (
                        <span>Last triggered: {new Date(webhook.last_triggered_at).toLocaleString()}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {webhook.is_active ? (
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 text-xs font-medium rounded">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-medium rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleTest(webhook)}
                    disabled={testing}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="Test Webhook"
                  >
                    <TestTube className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleEdit(webhook)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="Edit"
                  >
                    <Save className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(webhook.id)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

