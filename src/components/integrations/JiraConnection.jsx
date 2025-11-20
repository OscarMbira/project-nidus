import { useState, useEffect } from 'react'
import { connectToJira, getJiraProjects, getJiraIssueTypes } from '../../services/jiraIntegrationService'
import { supabase } from '../../services/supabaseClient'
import { Save, X, TestTube, CheckCircle, AlertCircle, Plug } from 'lucide-react'

export default function JiraConnection({ connection, projectId, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    jira_url: '',
    jira_project_key: '',
    api_token: '',
    sync_direction: 'bidirectional',
    sync_frequency: 'manual',
    is_active: true
  })
  const [jiraProjects, setJiraProjects] = useState([])
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (connection) {
      setFormData({
        jira_url: connection.jira_url || '',
        jira_project_key: connection.jira_project_key || '',
        api_token: '', // Never show existing token
        sync_direction: connection.sync_direction || 'bidirectional',
        sync_frequency: connection.sync_frequency || 'manual',
        is_active: connection.is_active ?? true
      })
    }
  }, [connection])

  const handleTestConnection = async () => {
    try {
      setTesting(true)
      setTestResult(null)

      if (!formData.jira_url || !formData.api_token) {
        setTestResult({ success: false, message: 'Please provide Jira URL and API token' })
        return
      }

      const result = await getJiraProjects(formData.jira_url, formData.api_token)
      setTestResult(result)
    } catch (error) {
      console.error('Error testing Jira connection:', error)
      setTestResult({ success: false, message: error.message })
    } finally {
      setTesting(false)
    }
  }

  const handleLoadProjects = async () => {
    try {
      setLoading(true)
      const result = await getJiraProjects(formData.jira_url, formData.api_token)
      
      if (result.success) {
        setJiraProjects(result.data || [])
      } else {
        alert(result.message || 'Failed to load Jira projects')
      }
    } catch (error) {
      console.error('Error loading Jira projects:', error)
      alert('Failed to load Jira projects')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const connectionData = {
        ...formData,
        project_id: projectId,
        updated_by: user.id
      }

      let result
      if (connection) {
        // Update existing connection
        const { error } = await supabase
          .from('jira_connections')
          .update(connectionData)
          .eq('id', connection.id)

        if (error) throw error
        result = { success: true, data: { ...connection, ...connectionData } }
      } else {
        // Create new connection
        connectionData.created_by = user.id
        const { data, error } = await supabase
          .from('jira_connections')
          .insert([connectionData])
          .select()
          .single()

        if (error) throw error
        result = { success: true, data }
      }

      onSave && onSave(result.data)
    } catch (error) {
      console.error('Error saving Jira connection:', error)
      alert('Failed to save Jira connection')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
            <Plug className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {connection ? 'Edit Jira Connection' : 'New Jira Connection'}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Connect your Jira instance for bidirectional synchronization
            </p>
          </div>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Jira URL
          </label>
          <input
            type="url"
            value={formData.jira_url}
            onChange={(e) => setFormData({ ...formData, jira_url: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="https://your-domain.atlassian.net"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            API Token
          </label>
          <input
            type="password"
            value={formData.api_token}
            onChange={(e) => setFormData({ ...formData, api_token: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-mono"
            placeholder="Enter your Jira API token"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Create an API token from your Jira account settings
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleLoadProjects}
            disabled={loading || !formData.jira_url || !formData.api_token}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load Projects'}
          </button>
          <button
            onClick={handleTestConnection}
            disabled={testing || !formData.jira_url || !formData.api_token}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <TestTube className="h-4 w-4" />
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
        </div>

        {testResult && (
          <div className={`p-4 rounded-lg border flex items-start gap-3 ${
            testResult.success
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
          }`}>
            {testResult.success ? (
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
            )}
            <div>
              <p className={`text-sm font-medium ${
                testResult.success
                  ? 'text-green-800 dark:text-green-200'
                  : 'text-red-800 dark:text-red-200'
              }`}>
                {testResult.success ? 'Connection successful' : 'Connection failed'}
              </p>
              {testResult.message && (
                <p className={`text-xs mt-1 ${
                  testResult.success
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-red-700 dark:text-red-300'
                }`}>
                  {testResult.message}
                </p>
              )}
            </div>
          </div>
        )}

        {jiraProjects.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Jira Project
            </label>
            <select
              value={formData.jira_project_key}
              onChange={(e) => setFormData({ ...formData, jira_project_key: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Select a project</option>
              {jiraProjects.map((project) => (
                <option key={project.key} value={project.key}>
                  {project.name} ({project.key})
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Sync Direction
          </label>
          <select
            value={formData.sync_direction}
            onChange={(e) => setFormData({ ...formData, sync_direction: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="import">Import from Jira</option>
            <option value="export">Export to Jira</option>
            <option value="bidirectional">Bidirectional Sync</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Sync Frequency
          </label>
          <select
            value={formData.sync_frequency}
            onChange={(e) => setFormData({ ...formData, sync_frequency: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="manual">Manual</option>
            <option value="hourly">Hourly</option>
            <option value="daily">Daily</option>
            <option value="realtime">Real-time</option>
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
            disabled={saving || !formData.jira_url || !formData.api_token || !formData.jira_project_key}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Connection'}
          </button>
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

