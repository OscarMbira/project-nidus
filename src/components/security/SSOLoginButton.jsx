import { useState, useEffect } from 'react'
import { initiateSAMLLogin, initiateOAuthLogin, getSSOProviders } from '../../services/ssoService'

export default function SSOLoginButton({ onLoginStart, onLoginComplete }) {
  const [providers, setProviders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProviders()
  }, [])

  const fetchProviders = async () => {
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
  }

  const handleSSOLogin = async (provider) => {
    try {
      if (onLoginStart) onLoginStart()

      if (provider.provider_type === 'saml') {
        const result = await initiateSAMLLogin(provider.id)
        if (result.success && result.sso_url) {
          // Store provider ID for callback handling
          sessionStorage.setItem('sso_provider_id', provider.id)
          // Redirect to SSO provider
          window.location.href = result.sso_url
        }
      } else if (provider.provider_type === 'oauth' || provider.provider_type === 'oidc') {
        const result = await initiateOAuthLogin(provider.id)
        if (result.success && result.auth_url) {
          // Store provider ID for callback handling
          sessionStorage.setItem('sso_provider_id', provider.id)
          // Call onLoginComplete if provided
          if (onLoginComplete) onLoginComplete()
          // Redirect to OAuth provider
          window.location.href = result.auth_url
        }
      }
    } catch (error) {
      console.error('Error initiating SSO login:', error)
      alert('Failed to initiate SSO login')
      if (onLoginComplete) onLoginComplete()
    }
  }

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

