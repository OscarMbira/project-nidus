import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { Plus, Plug, CheckCircle, XCircle, RefreshCw, Settings, Trash2, Play, Pause } from 'lucide-react'
import { format } from 'date-fns'

export default function Integrations() {
  const navigate = useNavigate()
  const [integrations, setIntegrations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchIntegrations()
  }, [])

  const fetchIntegrations = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('is_deleted', false)
        .order('integration_name', { ascending: true })

      if (error) throw error
      setIntegrations(data || [])
    } catch (error) {
      console.error('Error fetching integrations:', error)
      alert('Error loading integrations: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleTestConnection = async (integration) => {
    try {
      // In a real implementation, this would call a backend function to test the connection
      alert(`Testing connection to ${integration.integration_name}...`)
      // TODO: Implement actual connection test
    } catch (error) {
      console.error('Error testing connection:', error)
      alert('Error testing connection: ' + error.message)
    }
  }

  const handleSyncNow = async (integration) => {
    try {
      // In a real implementation, this would trigger a sync
      alert(`Starting sync for ${integration.integration_name}...`)
      // TODO: Implement actual sync trigger
    } catch (error) {
      console.error('Error syncing:', error)
      alert('Error starting sync: ' + error.message)
    }
  }

  const handleToggleActive = async (integration) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('integrations')
        .update({
          is_active: !integration.is_active,
          updated_by: user.id,
        })
        .eq('id', integration.id)

      if (error) throw error
      fetchIntegrations()
    } catch (error) {
      console.error('Error toggling integration:', error)
      alert('Error updating integration: ' + error.message)
    }
  }

  const handleDelete = async (integration) => {
    if (!window.confirm(`Delete integration "${integration.integration_name}"?`)) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('integrations')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: user.id
        })
        .eq('id', integration.id)

      if (error) throw error
      fetchIntegrations()
    } catch (error) {
      console.error('Error deleting integration:', error)
      alert('Error deleting integration: ' + error.message)
    }
  }

  const getIntegrationIcon = (type) => {
    const icons = {
      ms_project: '📊',
      jira: '🔷',
      github: '🐙',
      gitlab: '🦊',
      slack: '💬',
      teams: '👥',
      azure_devops: '☁️',
      trello: '📋',
      asana: '✨',
    }
    return icons[type] || '🔌'
  }

  const getIntegrationColor = (type) => {
    const colors = {
      ms_project: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      jira: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      github: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      gitlab: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      slack: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      teams: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    }
    return colors[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  }

  const stats = {
    total: integrations.length,
    active: integrations.filter(i => i.is_active).length,
    connected: integrations.filter(i => i.is_connected).length,
    syncing: integrations.filter(i => i.sync_enabled).length,
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Integrations
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Connect and sync with external tools and services
            </p>
          </div>
          <button
            onClick={() => navigate('/integrations/create')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Integration
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Integrations</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <Plug className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.active}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Connected</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.connected}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Syncing</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.syncing}</p>
            </div>
            <RefreshCw className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Integration Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {['ms_project', 'jira', 'github', 'gitlab', 'slack', 'teams'].map(type => {
          const integration = integrations.find(i => i.integration_type === type)
          return (
            <button
              key={type}
              onClick={() => navigate(`/integrations/create?type=${type}`)}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow text-left"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{getIntegrationIcon(type)}</span>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                  {type.replace('_', ' ')}
                </h3>
              </div>
              {integration ? (
                <div className="flex items-center gap-2">
                  {integration.is_connected ? (
                    <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                      Connected
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                      Not Connected
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">Click to configure</p>
              )}
            </button>
          )
        })}
      </div>

      {/* Integrations List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Configured Integrations
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading integrations...</p>
            </div>
          </div>
        ) : integrations.length === 0 ? (
          <div className="text-center py-12">
            <Plug className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">No Integrations</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mb-4">Add your first integration</p>
            <button
              onClick={() => navigate('/integrations/create')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 mx-auto"
            >
              <Plus className="h-4 w-4" />
              Add Integration
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {integrations.map((integration) => (
              <div
                key={integration.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="text-4xl">{getIntegrationIcon(integration.integration_type)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {integration.integration_name}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getIntegrationColor(integration.integration_type)}`}>
                          {integration.integration_type.replace('_', ' ')}
                        </span>
                        {integration.is_connected ? (
                          <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Connected
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 flex items-center gap-1">
                            <XCircle className="h-3 w-3" />
                            Not Connected
                          </span>
                        )}
                        {integration.is_active ? (
                          <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                            Inactive
                          </span>
                        )}
                      </div>
                      {integration.integration_description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {integration.integration_description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        {integration.sync_enabled && (
                          <span className="flex items-center gap-1">
                            <RefreshCw className="h-4 w-4" />
                            Sync: Every {integration.sync_frequency_minutes} min
                          </span>
                        )}
                        {integration.last_sync_at && (
                          <span>
                            Last sync: {format(new Date(integration.last_sync_at), 'MMM d, yyyy HH:mm')}
                          </span>
                        )}
                        {integration.sync_error_count > 0 && (
                          <span className="text-red-600 dark:text-red-400">
                            {integration.sync_error_count} error(s)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTestConnection(integration)}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg flex items-center gap-1"
                      title="Test Connection"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </button>
                    {integration.sync_enabled && (
                      <button
                        onClick={() => handleSyncNow(integration)}
                        className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg flex items-center gap-1"
                        title="Sync Now"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/integrations/${integration.id}/sync`)}
                      className="px-3 py-2 bg-purple-200 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm rounded-lg hover:bg-purple-300 dark:hover:bg-purple-900/50"
                      title="View Sync"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => navigate(`/integrations/${integration.id}/edit`)}
                      className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                      title="Edit"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(integration)}
                      className={`px-3 py-2 text-sm rounded-lg flex items-center gap-1 ${
                        integration.is_active
                          ? 'bg-orange-200 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-300 dark:hover:bg-orange-900/50'
                          : 'bg-green-200 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-300 dark:hover:bg-green-900/50'
                      }`}
                      title={integration.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {integration.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => handleDelete(integration)}
                      className="px-3 py-2 bg-red-200 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm rounded-lg hover:bg-red-300 dark:hover:bg-red-900/50"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

