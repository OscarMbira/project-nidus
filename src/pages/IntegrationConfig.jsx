import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { testIntegrationConnection } from '../services/integrationService'
import { ArrowLeft, Save, TestTube, CheckCircle, XCircle } from 'lucide-react'

export default function IntegrationConfig() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const integrationType = searchParams.get('type') || ''
  
  const [formData, setFormData] = useState({
    integration_name: '',
    integration_type: integrationType || 'ms_project',
    integration_description: '',
    connection_config: {},
    sync_enabled: false,
    sync_direction: 'bidirectional',
    sync_frequency_minutes: 60,
    field_mappings: {},
    sync_filters: {},
    webhook_enabled: false,
  })
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)

  useEffect(() => {
    if (id) {
      fetchIntegration()
    }
  }, [id])

  const fetchIntegration = async () => {
    try {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('id', id)
        .eq('is_deleted', false)
        .single()

      if (error) throw error
      
      setFormData({
        integration_name: data.integration_name || '',
        integration_type: data.integration_type || 'ms_project',
        integration_description: data.integration_description || '',
        connection_config: data.connection_config || {},
        sync_enabled: data.sync_enabled || false,
        sync_direction: data.sync_direction || 'bidirectional',
        sync_frequency_minutes: data.sync_frequency_minutes || 60,
        field_mappings: data.field_mappings || {},
        sync_filters: data.sync_filters || {},
        webhook_enabled: data.webhook_enabled || false,
      })
    } catch (error) {
      console.error('Error fetching integration:', error)
      alert('Error loading integration: ' + error.message)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? parseInt(value) || 0 : value)
    }))
  }

  const handleConnectionConfigChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      connection_config: {
        ...prev.connection_config,
        [key]: value
      }
    }))
  }

  const handleTestConnection = async () => {
    setTesting(true)
    setTestResult(null)
    
    try {
      // If we have an ID, save first, then test
      let integrationId = id
      
      if (!integrationId) {
        // Save as draft first
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('User not authenticated')
        
        const { data: newIntegration, error: createError } = await supabase
          .from('integrations')
          .insert({
            integration_name: formData.integration_name || 'Test Integration',
            integration_type: formData.integration_type,
            connection_config: formData.connection_config,
            is_active: false,
            created_by: user.id,
          })
          .select()
          .single()
        
        if (createError) throw createError
        integrationId = newIntegration.id
      }
      
      const result = await testIntegrationConnection(integrationId)
      setTestResult(result)
      
      // Update integration with test result
      if (integrationId) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase
            .from('integrations')
            .update({
              is_connected: result.success,
              last_connection_test_at: new Date().toISOString(),
              last_connection_test_status: result.success ? 'success' : 'failed',
              last_connection_test_error: result.success ? null : result.message,
              updated_by: user.id,
            })
            .eq('id', integrationId)
        }
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Error testing connection: ' + error.message
      })
    } finally {
      setTesting(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const submitData = {
        ...formData,
        updated_by: user.id,
      }

      if (id) {
        // Update
        const { error } = await supabase
          .from('integrations')
          .update(submitData)
          .eq('id', id)

        if (error) throw error
      } else {
        // Create
        submitData.created_by = user.id
        const { error } = await supabase
          .from('integrations')
          .insert(submitData)

        if (error) throw error
      }

      navigate('/integrations')
    } catch (error) {
      console.error('Error saving integration:', error)
      alert('Error saving integration: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const renderConnectionFields = () => {
    switch (formData.integration_type) {
      case 'ms_project':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                MS Project File Path / URL
              </label>
              <input
                type="text"
                value={formData.connection_config.file_path || ''}
                onChange={(e) => handleConnectionConfigChange('file_path', e.target.value)}
                placeholder="C:\Projects\project.mpp or https://..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Authentication Method
              </label>
              <select
                value={formData.connection_config.auth_method || 'none'}
                onChange={(e) => handleConnectionConfigChange('auth_method', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="none">None (Local File)</option>
                <option value="oauth">OAuth</option>
                <option value="api_key">API Key</option>
              </select>
            </div>
          </>
        )

      case 'jira':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Jira URL *
              </label>
              <input
                type="url"
                value={formData.connection_config.url || ''}
                onChange={(e) => handleConnectionConfigChange('url', e.target.value)}
                placeholder="https://yourcompany.atlassian.net"
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email / Username *
              </label>
              <input
                type="text"
                value={formData.connection_config.username || ''}
                onChange={(e) => handleConnectionConfigChange('username', e.target.value)}
                placeholder="user@example.com"
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                API Token *
              </label>
              <input
                type="password"
                value={formData.connection_config.api_token || ''}
                onChange={(e) => handleConnectionConfigChange('api_token', e.target.value)}
                placeholder="Enter your Jira API token"
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Generate an API token from your Jira account settings
              </p>
            </div>
          </>
        )

      case 'github':
      case 'gitlab':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Repository URL *
              </label>
              <input
                type="url"
                value={formData.connection_config.repository_url || ''}
                onChange={(e) => handleConnectionConfigChange('repository_url', e.target.value)}
                placeholder="https://github.com/owner/repo or https://gitlab.com/owner/repo"
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Personal Access Token *
              </label>
              <input
                type="password"
                value={formData.connection_config.token || ''}
                onChange={(e) => handleConnectionConfigChange('token', e.target.value)}
                placeholder="Enter your personal access token"
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Create a personal access token with repo permissions
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Branch (optional)
              </label>
              <input
                type="text"
                value={formData.connection_config.branch || ''}
                onChange={(e) => handleConnectionConfigChange('branch', e.target.value)}
                placeholder="main"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </>
        )

      default:
        return (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Configuration fields for {formData.integration_type} will be available soon
          </div>
        )
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate('/integrations')}
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Integrations
      </button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {id ? 'Edit Integration' : 'Add Integration'}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Configure connection to {formData.integration_type.replace('_', ' ')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Basic Information
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Integration Name *
              </label>
              <input
                type="text"
                name="integration_name"
                value={formData.integration_name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="My Jira Integration"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Integration Type
              </label>
              <select
                name="integration_type"
                value={formData.integration_type}
                onChange={handleChange}
                disabled={!!id}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50"
              >
                <option value="ms_project">Microsoft Project</option>
                <option value="jira">Jira</option>
                <option value="github">GitHub</option>
                <option value="gitlab">GitLab</option>
                <option value="slack">Slack</option>
                <option value="teams">Microsoft Teams</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                name="integration_description"
                value={formData.integration_description}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
        </div>

        {/* Connection Configuration */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Connection Configuration
            </h2>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              <TestTube className="h-4 w-4" />
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
          </div>
          
          {testResult && (
            <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
              testResult.success
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            }`}>
              {testResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              )}
              <span className={`text-sm ${
                testResult.success
                  ? 'text-green-800 dark:text-green-300'
                  : 'text-red-800 dark:text-red-300'
              }`}>
                {testResult.message}
              </span>
            </div>
          )}

          <div className="space-y-4">
            {renderConnectionFields()}
          </div>
        </div>

        {/* Sync Configuration */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Sync Configuration
          </h2>
          <div className="space-y-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="sync_enabled"
                checked={formData.sync_enabled}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Enable Automatic Sync
              </span>
            </label>
            
            {formData.sync_enabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Sync Direction
                  </label>
                  <select
                    name="sync_direction"
                    value={formData.sync_direction}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="bidirectional">Bidirectional (Both Ways)</option>
                    <option value="unidirectional_in">Unidirectional (Import Only)</option>
                    <option value="unidirectional_out">Unidirectional (Export Only)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Sync Frequency (minutes)
                  </label>
                  <input
                    type="number"
                    name="sync_frequency_minutes"
                    value={formData.sync_frequency_minutes}
                    onChange={handleChange}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => navigate('/integrations')}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Integration'}
          </button>
        </div>
      </form>
    </div>
  )
}

