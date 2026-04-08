import { useState, useEffect, useCallback } from 'react'
import { initiateSAMLLogin, initiateOAuthLogin, getSSOProviders } from '../../services/ssoService'

export default function SSOLoginButton({ onLoginStart, onLoginComplete }) {
  const [providers, setProviders] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchProviders = useCallback(async () => {
    try {
      setLoading(true)
      const result = await getSSOProviders({ is_active: true })
      if (result.success) {
        setProviders(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching SSO providers:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch SSO providers on mount
  useEffect(() => {
    fetchProviders()
  }, [fetchProviders])

  const handleSSOLogin = useCallback(async (provider) => {
    try {
      if (onLoginStart) onLoginStart()

      if (provider.provider_type === 'saml') {
        const result = await initiateSAMLLogin(provider.id)
        if (result.success && result.sso_url) {
          // Store provider ID for callback handling
          sessionStorage.setItem('sso_provider_id', provider.id)
          // Redirect to SSO provider
          window.location.href = result.sso_url
        } else {
          if (onLoginComplete) onLoginComplete(new Error(result.message || 'SAML initiation failed'), null)
        }
      } else if (provider.provider_type === 'oauth' || provider.provider_type === 'oidc') {
        const result = await initiateOAuthLogin(provider.id)
        if (result.success && result.auth_url) {
          // Store provider ID for callback handling
          sessionStorage.setItem('sso_provider_id', provider.id)
          // Redirect to OAuth provider
          window.location.href = result.auth_url
        } else {
          if (onLoginComplete) onLoginComplete(new Error(result.message || 'OAuth initiation failed'), null)
        }
      }
    } catch (error) {
      console.error('Error initiating SSO login:', error)
      if (onLoginComplete) onLoginComplete(error, null)
    }
  }, [onLoginStart, onLoginComplete])

  if (loading) {
    return null
  }

  if (providers.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
            Or continue with SSO
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {providers.map((provider) => (
          <button
            key={provider.id}
            onClick={() => handleSSOLogin(provider)}
            className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="text-sm font-medium">
              Sign in with {provider.provider_name}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

