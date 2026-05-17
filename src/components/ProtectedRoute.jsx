import { useEffect, useState, useCallback } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { hasRegisteredForPlatform, canAccessPlatform, updatePlatformAccess } from '../services/unifiedSubscriptionService'
import { checkOrganisationStatusByAuthId } from '../services/postLoginRouter'
import PlatformSelectionModal from './PlatformSelectionModal'

const AUTH_CHECK_TIMEOUT_MS = 15000

function delay(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('Auth check timeout')), ms))
}

export default function ProtectedRoute({
  children,
  requiredRoles = [],
  requiredPlatform = null  // 'platform' or 'simulator'
}) {
  const [loading, setLoading] = useState(true)
  const [authTimeout, setAuthTimeout] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [userRoles, setUserRoles] = useState([])
  const [showPlatformModal, setShowPlatformModal] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [redirectTo, setRedirectTo] = useState(null)
  const location = useLocation()

  const checkAuth = useCallback(async () => {
    setAuthTimeout(false)
    setLoading(true)
    try {
      const authPromise = (async () => {
        // Step 1: Auth check (must be first)
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
          setAuthenticated(false)
          setLoading(false)
          return
        }

        setCurrentUser(user)
        setAuthenticated(true)

        const onboardingRoutes = ['/onboarding', '/auth', '/register', '/login', '/verify-organisation']
        const isOnboardingRoute = onboardingRoutes.some(route => location.pathname.startsWith(route))
        const needsOrgCheck = !isOnboardingRoute && requiredPlatform === 'platform'
        const needsPlatformCheck = !!requiredPlatform

        // Step 2: Run org check + platform access update in PARALLEL (saves ~200ms)
        const [orgStatus] = await Promise.all([
          needsOrgCheck
            ? checkOrganisationStatusByAuthId(user.id).catch(e => { console.error('Org check error:', e); return null })
            : Promise.resolve(null),
          needsPlatformCheck
            ? updatePlatformAccess(user.id, requiredPlatform).catch(e => console.error('Platform access update error:', e))
            : Promise.resolve()
        ])

        if (needsOrgCheck && orgStatus && !orgStatus.exists) {
          setRedirectTo('/onboarding/organisation-setup')
          setLoading(false)
          return
        }

        // Invited team members (PMs, etc.) don't own an org and haven't gone through
        // the subscription flow. Skip the registration/access modal for them.
        const isInvitedMember = orgStatus?.isInvitedMember === true

        // Step 3: Run registration + subscription checks in PARALLEL (saves ~200ms)
        if (needsPlatformCheck && !isInvitedMember) {
          try {
            const [hasRegistered, hasAccess] = await Promise.all([
              hasRegisteredForPlatform(user.id, requiredPlatform),
              canAccessPlatform(user.id, requiredPlatform)
            ])

            if (!hasRegistered || !hasAccess) {
              setShowPlatformModal(true)
              setLoading(false)
              return
            }
          } catch (platformError) {
            console.error('Error checking platform access:', platformError)
            // Don't block access on error
          }
        }

        setLoading(false)
      })()

      await Promise.race([authPromise, delay(AUTH_CHECK_TIMEOUT_MS)])
    } catch (error) {
      if (error?.message === 'Auth check timeout') {
        setAuthTimeout(true)
      } else {
        console.error('Error checking authentication:', error)
        setAuthenticated(false)
      }
      setLoading(false)
    }
  }, [location.pathname, requiredPlatform])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const handleClosePlatformModal = () => {
    setShowPlatformModal(false)
    // Don't redirect - let user stay on current page
    // They can navigate away manually if needed
  }

  if (loading || authTimeout) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          {authTimeout ? (
            <>
              <p className="text-gray-600 dark:text-gray-400">Connection timed out. Check your network and try again.</p>
              <button
                type="button"
                onClick={checkAuth}
                className="mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
              >
                Retry
              </button>
            </>
          ) : (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" aria-hidden="true" />
              <p className="mt-4 text-gray-600 dark:text-gray-400">Checking authentication...</p>
            </>
          )}
        </div>
      </div>
    )
  }

  if (!authenticated) {
    // Redirect to login page
    // Store the attempted location so we can redirect back after login
    return <Navigate to="/platform/login" state={{ from: location }} replace />
  }

  // Handle redirects set during auth check
  if (redirectTo) {
    return <Navigate to={redirectTo} replace />
  }

  // Show platform selection modal if user needs to register for this platform
  if (showPlatformModal && requiredPlatform && currentUser) {
    return (
      <>
        <PlatformSelectionModal
          isOpen={showPlatformModal}
          onClose={handleClosePlatformModal}
          platform={requiredPlatform}
          userId={currentUser.id}
        />
        {/* Show a placeholder while modal is open */}
        <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400">Checking platform access...</p>
          </div>
        </div>
      </>
    )
  }

  return children
}

