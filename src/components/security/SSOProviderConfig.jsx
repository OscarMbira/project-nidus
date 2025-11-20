import { useState, useEffect } from 'react'
import { configureSSOProvider, validateSSOProvider } from '../../services/ssoService'
import { Save, X, CheckCircle, AlertCircle } from 'lucide-react'

export default function SSOProviderConfig({ provider, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    provider_name: '',
    provider_type: 'saml',
    entity_id: '',
    sso_url: '',
    slo_url: '',
    certificate: '',
    client_id: '',
    client_secret: '',
    scopes: ['openid', 'profile', 'email'],
    attribute_mappings: {
      email: 'email',
      name: 'name',
      first_name: 'given_name',
      last_name: 'family_name'
    },
    is_active: true,
    auto_provision_users: false,
    default_role_id: null
  })
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (provider) {
      setFormData({
        provider_name: provider.provider_name || '',
        provider_type: provider.provider_type || 'saml',
        entity_id: provider.entity_id || '',
        sso_url: provider.sso_url || '',
        slo_url: provider.slo_url || '',
        certificate: provider.certificate || '',
        client_id: provider.client_id || '',
        client_secret: provider.client_secret || '',
        scopes: provider.scopes || ['openid', 'profile', 'email'],
        attribute_mappings: provider.attribute_mappings || {
          email: 'email',
          name: 'name',
          first_name: 'given_name',
          last_name: 'family_name'
        },
        is_active: provider.is_active ?? true,
        auto_provision_users: provider.auto_provision_users ?? false,
        default_role_id: provider.default_role_id || null
      })
    }
  }, [provider])

  const handleTest = async () => {
    try {
      setTesting(true)
      setTestResult(null)
      const result = await validateSSOProvider(formData)
      setTestResult(result)
    } catch (error) {
      console.error('Error testing SSO provider:', error)
      setTestResult({ success: false, message: 'Failed to test provider configuration' })
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const result = await configureSSOProvider(formData.provider_type, formData)
      if (result.success) {
        onSave && onSave(result.data)
      } else {
        alert(result.message || 'Failed to save provider')
      }
    } catch (error) {
      console.error('Error saving SSO provider:', error)
      alert('Failed to save provider')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {provider ? 'Edit SSO Provider' : 'New SSO Provider'}
        </h2>
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
            Provider Name
          </label>
          <input
            type="text"
            value={formData.provider_name}
            onChange={(e) => setFormData({ ...formData, provider_name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="e.g., Azure AD, Google Workspace"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Provider Type
          </label>
          <select
            value={formData.provider_type}
            onChange={(e) => setFormData({ ...formData, provider_type: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="saml">SAML 2.0</option>
            <option value="oauth">OAuth 2.0</option>
            <option value="oidc">OpenID Connect</option>
          </select>
        </div>

        {formData.provider_type === 'saml' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Entity ID
              </label>
              <input
                type="text"
                value={formData.entity_id}
                onChange={(e) => setFormData({ ...formData, entity_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="https://your-identity-provider.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                SSO URL
              </label>
              <input
                type="url"
                value={formData.sso_url}
                onChange={(e) => setFormData({ ...formData, sso_url: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="https://your-identity-provider.com/sso"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Single Logout URL (Optional)
              </label>
              <input
                type="url"
                value={formData.slo_url}
                onChange={(e) => setFormData({ ...formData, slo_url: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="https://your-identity-provider.com/slo"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Certificate
              </label>
              <textarea
                value={formData.certificate}
                onChange={(e) => setFormData({ ...formData, certificate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                rows="6"
                placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
              />
            </div>
          </>
        )}

        {(formData.provider_type === 'oauth' || formData.provider_type === 'oidc') && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Client ID
              </label>
              <input
                type="text"
                value={formData.client_id}
                onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="your-client-id"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Client Secret
              </label>
              <input
                type="password"
                value={formData.client_secret}
                onChange={(e) => setFormData({ ...formData, client_secret: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="your-client-secret"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                SSO URL (Authorization URL)
              </label>
              <input
                type="url"
                value={formData.sso_url}
                onChange={(e) => setFormData({ ...formData, sso_url: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="https://accounts.google.com/o/oauth2/v2/auth"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Scopes
              </label>
              <input
                type="text"
                value={formData.scopes.join(' ')}
                onChange={(e) => setFormData({ ...formData, scopes: e.target.value.split(' ').filter(s => s) })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="openid profile email"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Space-separated list of OAuth scopes
              </p>
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Attribute Mappings (JSON)
          </label>
          <textarea
            value={JSON.stringify(formData.attribute_mappings, null, 2)}
            onChange={(e) => {
              try {
                const mappings = JSON.parse(e.target.value)
                setFormData({ ...formData, attribute_mappings: mappings })
              } catch (err) {
                // Invalid JSON, ignore
              }
            }}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
            rows="6"
          />
        </div>

        <div className="flex items-center gap-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Active
            </span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.auto_provision_users}
              onChange={(e) => setFormData({ ...formData, auto_provision_users: e.target.checked })}
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Auto-provision users
            </span>
          </label>
        </div>

        {testResult && (
          <div className={`p-4 rounded-lg flex items-start gap-3 ${
            testResult.success
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700'
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

        <div className="flex gap-2 pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Provider'}
          </button>
          <button
            onClick={handleTest}
            disabled={testing}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {testing ? 'Testing...' : 'Test Connection'}
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

