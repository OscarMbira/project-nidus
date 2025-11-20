import { useState, useEffect } from 'react'
import { createApiKey, getApiKeys, updateApiKey, deleteApiKey, getApiKeyUsage, getApiScopes } from '../../services/apiManagementService'
import { Key, Plus, Trash2, Copy, Eye, EyeOff, Calendar, Activity, Save, X } from 'lucide-react'

export default function ApiKeyManager({ projectId = null }) {
  const [apiKeys, setApiKeys] = useState([])
  const [scopes, setScopes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    key_name: '',
    scopes: [],
    rate_limit: 60,
    expires_at: '',
    project_id: projectId
  })
  const [revealedKeys, setRevealedKeys] = useState({})
  const [usageData, setUsageData] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchData()
  }, [projectId])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [keysResult, scopesResult] = await Promise.all([
        getApiKeys({ project_id: projectId }),
        getApiScopes()
      ])

      if (keysResult.success) {
        setApiKeys(keysResult.data || [])
        
        // Fetch usage for each key
        const usagePromises = keysResult.data.map(key => 
          getApiKeyUsage(key.id, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date())
        )
        const usageResults = await Promise.all(usagePromises)
        const usageMap = {}
        keysResult.data.forEach((key, index) => {
          if (usageResults[index]?.success) {
            usageMap[key.id] = usageResults[index].data
          }
        })
        setUsageData(usageMap)
      }

      if (scopesResult.success) {
        setScopes(scopesResult.data || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    try {
      setSaving(true)
      const result = await createApiKey(formData)
      
      if (result.success) {
        // Show the new key (only time it will be shown)
        setRevealedKeys(prev => ({
          ...prev,
          [result.data.id]: true
        }))
        
        await fetchData()
        setShowForm(false)
        setFormData({
          key_name: '',
          scopes: [],
          rate_limit: 60,
          expires_at: '',
          project_id: projectId
        })
        
        // Copy to clipboard
        if (result.data.api_key) {
          navigator.clipboard.writeText(result.data.api_key)
          alert('API key created and copied to clipboard!')
        }
      } else {
        alert(result.message || 'Failed to create API key')
      }
    } catch (error) {
      console.error('Error creating API key:', error)
      alert('Failed to create API key')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (keyId) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) return

    try {
      const result = await deleteApiKey(keyId)
      if (result.success) {
        await fetchData()
        alert('API key deleted successfully')
      } else {
        alert(result.message || 'Failed to delete API key')
      }
    } catch (error) {
      console.error('Error deleting API key:', error)
      alert('Failed to delete API key')
    }
  }

  const handleToggleReveal = (keyId) => {
    setRevealedKeys(prev => ({
      ...prev,
      [keyId]: !prev[keyId]
    }))
  }

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text)
    alert('Copied to clipboard!')
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
          API Keys
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New API Key
        </button>
      </div>

      {showForm && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Create API Key
            </h3>
            <button
              onClick={() => {
                setShowForm(false)
                setFormData({
                  key_name: '',
                  scopes: [],
                  rate_limit: 60,
                  expires_at: '',
                  project_id: projectId
                })
              }}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Key Name
              </label>
              <input
                type="text"
                value={formData.key_name}
                onChange={(e) => setFormData({ ...formData, key_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., Production API Key"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Scopes
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-3">
                {scopes.map((scope) => (
                  <label key={scope.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.scopes.includes(scope.scope_name)}
                      onChange={(e) => {
                        const scopes = e.target.checked
                          ? [...formData.scopes, scope.scope_name]
                          : formData.scopes.filter(s => s !== scope.scope_name)
                        setFormData({ ...formData, scopes })
                      }}
                      className="mr-2"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {scope.scope_name}
                      </span>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {scope.scope_description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Rate Limit (requests/min)
                </label>
                <input
                  type="number"
                  value={formData.rate_limit}
                  onChange={(e) => setFormData({ ...formData, rate_limit: parseInt(e.target.value) || 60 })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Expires At (Optional)
                </label>
                <input
                  type="date"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                onClick={handleCreate}
                disabled={saving || !formData.key_name || formData.scopes.length === 0}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Creating...' : 'Create API Key'}
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

      {apiKeys.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Key className="h-12 w-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
          <p>No API keys created yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {apiKeys.map((key) => (
            <div
              key={key.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                      <Key className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {key.key_name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {key.project_id ? `Project: ${key.projects?.project_name || 'N/A'}` : 'User API Key'}
                      </p>
                    </div>
                  </div>

                  <div className="ml-12 space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600 dark:text-gray-400">API Key:</label>
                      <div className="flex items-center gap-2">
                        <code className="px-2 py-1 bg-gray-100 dark:bg-gray-900 rounded text-sm font-mono">
                          {revealedKeys[key.id] ? key.api_key : '••••••••••••••••'}
                        </code>
                        <button
                          onClick={() => handleToggleReveal(key.id)}
                          className="p-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                        >
                          {revealedKeys[key.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                        {revealedKeys[key.id] && (
                          <button
                            onClick={() => handleCopy(key.api_key)}
                            className="p-1 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                            title="Copy"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Activity className="h-4 w-4" />
                        Rate limit: {key.rate_limit}/min
                      </div>
                      {key.expires_at && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Expires: {new Date(key.expires_at).toLocaleDateString()}
                        </div>
                      )}
                      {key.last_used_at && (
                        <div>
                          Last used: {new Date(key.last_used_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 mt-2">
                      {key.scope?.map((scope, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 text-xs font-medium rounded"
                        >
                          {scope}
                        </span>
                      ))}
                    </div>

                    {usageData[key.id] && (
                      <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                        Usage: {usageData[key.id].total_requests || 0} requests in last 30 days
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-2">
                      {key.is_active ? (
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

                <button
                  onClick={() => handleDelete(key.id)}
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

