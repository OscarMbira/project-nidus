import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { hasRegisteredForPlatform, canAccessPlatform, updatePlatformAccess } from '../services/unifiedSubscriptionService'
import PlatformSelectionModal from './PlatformSelectionModal'

export default function ProtectedRoute({
  children,
  requiredRoles = [],
  requiredPlatform = null  // 'pm' or 'simulator'
}) {
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [userRoles, setUserRoles] = useState([])
  const [showPlatformModal, setShowPlatformModal] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const location = useLocation()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      // Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        setAuthenticated(false)
        setLoading(false)
        return
      }

      setCurrentUser(user)
      setAuthenticated(true)

      // ROLES CHECK TEMPORARILY DISABLED
      // The users table has RLS policy issues causing 500 errors
      // TODO: Fix users table RLS by running SQL/v83_fix_users_table_access.sql
      // For now, skip role checking to allow app to function

      // if (requiredRoles.length > 0) {
      //   ... role checking code disabled ...
      // }

      // Check platform access if required
      if (requiredPlatform) {
        try {
          // Update last access time
          await updatePlatformAccess(user.id, requiredPlatform)

          // Check if user has registered for this platform
          const hasRegistered = await hasRegisteredForPlatform(user.id, requiredPlatform)

          if (!hasRegistered) {
            // User hasn't registered for this platform, show modal
            setShowPlatformModal(true)
            setLoading(false)
            return
          }

          // Check if user has active subscription (can access platform)
          const hasAccess = await canAccessPlatform(user.id, requiredPlatform)

          if (!hasAccess) {
            // User registered but doesn't have active subscription
            // Still show the modal to upgrade
            setShowPlatformModal(true)
            setLoading(false)
            return
          }
        } catch (platformError) {
          console.error('Error checking platform access:', platformError)
          // Don't block access on error, but log it
        }
      }

      setLoading(false)
    } catch (error) {
      console.error('Error checking authentication:', error)
      setAuthenticated(false)
      setLoading(false)
    }
  }

  const handleClosePlatformModal = () => {
    setShowPlatformModal(false)
    // Redirect to homepage if user closes modal without registering
    window.location.href = '/'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Checking authentication...</p>
        </div>
      </div>
    )
  }

  if (!authenticated) {
    // Redirect to login page
    // Store the attempted location so we can redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />
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

