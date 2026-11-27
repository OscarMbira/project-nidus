/**
 * v1356 — Domain-routed SSO on the login page (retires v51 provider list).
 * After the user enters an email, resolve the organisation SSO connection and
 * offer a single “Continue with SSO” action when a verified domain matches.
 */
import { useCallback, useState } from 'react'
import {
  initiateOrgSsoLogin,
  resolveSsoLoginDomain,
} from '@nidus/shared/services/organisationApiService'

export default function SSOLoginButton({ email, onLoginStart, onLoginComplete }) {
  const [busy, setBusy] = useState(false)
  const [hint, setHint] = useState('')

  const handleContinue = useCallback(async () => {
    const trimmed = (email || '').trim()
    if (!trimmed.includes('@')) {
      setHint('Enter your work email first so we can find your organisation’s SSO.')
      return
    }
    setBusy(true)
    setHint('')
    try {
      if (onLoginStart) onLoginStart()
      const connection = await resolveSsoLoginDomain(trimmed)
      if (!connection) {
        setHint('No SSO is configured for this email domain. Sign in with email and password, or ask your admin.')
        if (onLoginComplete) onLoginComplete(null, null)
        return
      }
      sessionStorage.setItem('sso_connection_id', connection.connection_id)
      const result = await initiateOrgSsoLogin(connection)
      if (!result.success) {
        setHint(result.message || 'Could not start SSO.')
        if (onLoginComplete) onLoginComplete(new Error(result.message || 'SSO failed'), null)
      }
    } catch (error) {
      setHint(error.message || 'Could not start SSO.')
      if (onLoginComplete) onLoginComplete(error, null)
    } finally {
      setBusy(false)
    }
  }, [email, onLoginStart, onLoginComplete])

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300 dark:border-gray-600" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
            Or continue with SSO
          </span>
        </div>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={handleContinue}
        className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
      >
        <span className="text-sm font-medium">{busy ? 'Looking up SSO…' : 'Continue with SSO'}</span>
      </button>
      {hint && <p className="text-sm text-gray-700 dark:text-gray-200">{hint}</p>}
    </div>
  )
}
