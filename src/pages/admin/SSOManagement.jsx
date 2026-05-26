import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSSOProviders, configureSSOProvider, validateSSOProvider } from '../../services/ssoService'
import { TableRowNumberHeader, TableRowNumberCell } from '../../components/ui/Table'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'

export default function SSOManagement() {
  const [providers, setProviders] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingProvider, setEditingProvider] = useState(null)
  const [formData, setFormData] = useState({
    provider_name: '',
    provider_type: 'saml',
    entity_id: '',
    sso_url: '',
    slo_url: '',
    certificate: '',
    client_id: '',
    client_secret: '',
    scopes: [],
    attribute_mappings: {},
    is_active: true,
    auto_provision_users: false,
    default_role_id: null
  })
  const navigate = useNavigate()

  useEffect(() => {
    fetchProviders()
  }, [])

  const fetchProviders = async () => {
    try {
      setLoading(true)
      const result = await getSSOProviders()
      if (result.success) {
        setProviders(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching SSO providers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddProvider = () => {
    setEditingProvider(null)
    setFormData({
      provider_name: '',
      provider_type: 'saml',
      entity_id: '',
      sso_url: '',
      slo_url: '',
      certificate: '',
      client_id: '',
      client_secret: '',
      scopes: [],
      attribute_mappings: {},
      is_active: true,
      auto_provision_users: false,
      default_role_id: null
    })
    setShowAddForm(true)
  }

  const handleEditProvider = (provider) => {
    setEditingProvider(provider)
    setFormData({
      provider_name: provider.provider_name,
      provider_type: provider.provider_type,
      entity_id: provider.entity_id || '',
      sso_url: provider.sso_url,
      slo_url: provider.slo_url || '',
      certificate: '',
      client_id: '',
      client_secret: '',
      scopes: provider.scopes || [],
      attribute_mappings: provider.attribute_mappings || {},
      is_active: provider.is_active,
      auto_provision_users: provider.auto_provision_users || false,
      default_role_id: provider.default_role_id || null
    })
    setShowAddForm(true)
  }

  const handleSaveProvider = async () => {
    try {
      const result = await configureSSOProvider(formData.provider_type, formData)
      if (result.success) {
        alert('SSO provider saved successfully')
        setShowAddForm(false)
        fetchProviders()
      }
    } catch (error) {
      console.error('Error saving SSO provider:', error)
      alert('Failed to save SSO provider')
    }
  }

  const handleTestProvider = async (providerId) => {
    try {
      const result = await validateSSOProvider(providerId)
      if (result.success && result.valid) {
        alert('SSO provider is valid')
      } else {
        alert('SSO provider validation failed')
      }
    } catch (error) {
      console.error('Error testing SSO provider:', error)
      alert('Failed to test SSO provider')
    }
  }

  const getProviderTypeColor = (type) => {
    const colors = {
      saml: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      oauth: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      oidc: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
    }
    return colors[type] || colors.saml
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading SSO providers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            SSO Provider Management
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Configure and manage Single Sign-On (SSO) providers
          </p>
        </div>
        <button
          onClick={handleAddProvider}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
        >
          + Add SSO Provider
        </button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {editingProvider ? 'Edit SSO Provider' : 'Add SSO Provider'}
          </h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Provider Name *
                </label>
                <input
                  type="text"
                  value={formData.provider_name}
                  onChange={(e) => setFormData({ ...formData, provider_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., Azure AD, Google Workspace"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Provider Type *
                </label>
                <select
                  value={formData.provider_type}
                  onChange={(e) => setFormData({ ...formData, provider_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="saml">SAML 2.0</option>
                  <option value="oauth">OAuth 2.0</option>
                  <option value="oidc">OpenID Connect</option>
                </select>
              </div>
            </div>

            {formData.provider_type === 'saml' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Entity ID *
                  </label>
                  <input
                    type="text"
                    value={formData.entity_id}
                    onChange={(e) => setFormData({ ...formData, entity_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Entity ID from IdP"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    SAML Certificate
                  </label>
                  <textarea
                    value={formData.certificate}
                    onChange={(e) => setFormData({ ...formData, certificate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                    rows="4"
                    placeholder="Paste SAML certificate here"
                  />
                </div>
              </>
            )}

            {(formData.provider_type === 'oauth' || formData.provider_type === 'oidc') && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Client ID *
                  </label>
                  <input
                    type="text"
                    value={formData.client_id}
                    onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                    placeholder="OAuth Client ID"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Client Secret *
                  </label>
                  <input
                    type="password"
                    value={formData.client_secret}
                    onChange={(e) => setFormData({ ...formData, client_secret: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                    placeholder="OAuth Client Secret"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Scopes (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formData.scopes.join(', ')}
                    onChange={(e) => setFormData({ ...formData, scopes: e.target.value.split(',').map(s => s.trim()).filter(s => s) })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                    placeholder="openid, profile, email"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                SSO URL *
              </label>
              <input
                type="url"
                value={formData.sso_url}
                onChange={(e) => setFormData({ ...formData, sso_url: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                placeholder="https://provider.com/sso"
              />
            </div>

            {formData.provider_type === 'saml' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  SLO URL (Single Logout)
                </label>
                <input
                  type="url"
                  value={formData.slo_url}
                  onChange={(e) => setFormData({ ...formData, slo_url: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                  placeholder="https://provider.com/slo"
                />
              </div>
            )}

            <div className="flex items-center gap-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600 relative"></div>
                <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Active
                </span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.auto_provision_users}
                  onChange={(e) => setFormData({ ...formData, auto_provision_users: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600 relative"></div>
                <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Auto-provision users
                </span>
              </label>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                onClick={handleSaveProvider}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
              >
                Save Provider
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Providers List */}
      {providers.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No SSO providers configured
          </p>
          <button
            onClick={handleAddProvider}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
          >
            Add Your First SSO Provider
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                <TableRowNumberHeader className="!normal-case" />
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Provider Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    SSO URL
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Auto-provision
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {providers.map((provider, index) => (
                  <tr key={provider.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {provider.provider_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded ${getProviderTypeColor(provider.provider_type)}`}>
                        {provider.provider_type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <span className="truncate max-w-xs block">{provider.sso_url}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {provider.auto_provision_users ? 'Yes' : 'No'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded ${
                        provider.is_active
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                      }`}>
                        {provider.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditProvider(provider)}
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleTestProvider(provider.id)}
                          className="text-green-600 hover:text-green-700 dark:text-green-400"
                        >
                          Test
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

