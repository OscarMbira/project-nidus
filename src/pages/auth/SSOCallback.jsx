import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { processSAMLResponse, processOAuthCallback } from '../../services/ssoService'
import { supabase } from '../../services/supabaseClient'

export default function SSOCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [processing, setProcessing] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    handleSSOCallback()
  }, [])

  const handleSSOCallback = async () => {
    try {
      setProcessing(true)

      // Get provider ID from session storage or URL params
      const providerId = sessionStorage.getItem('sso_provider_id')
      const code = searchParams.get('code')
      const state = searchParams.get('state')
      const samlResponse = searchParams.get('SAMLResponse')

      if (samlResponse) {
        // Process SAML response
        const result = await processSAMLResponse(samlResponse)
        if (result.success) {
          // Refresh session and redirect to dashboard
          await supabase.auth.refreshSession()
          navigate('/dashboard')
        } else {
          setError(result.message || 'SAML authentication failed')
        }
      } else if (code && state && providerId) {
        // Process OAuth callback
        const result = await processOAuthCallback(code, state, providerId)
        if (result.success) {
          // Refresh session and redirect to dashboard
          await supabase.auth.refreshSession()
          navigate('/dashboard')
        } else {
          setError(result.message || 'OAuth authentication failed')
        }
      } else {
        setError('Invalid SSO callback parameters')
      }
    } catch (error) {
      console.error('Error processing SSO callback:', error)
      setError('Failed to process SSO authentication')
    } finally {
      setProcessing(false)
    }
  }

  if (processing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Processing SSO authentication...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="text-red-600 dark:text-red-400 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            SSO Authentication Failed
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error}
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Return to Login
          </button>
        </div>
      </div>
    )
  }

  return null
}

