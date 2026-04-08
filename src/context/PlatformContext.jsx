/**
 * Platform Context
 * Manages current active platform state and switching functionality
 */

import { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { getUserPlatformAccess, switchPlatform, getRecommendedPlatform, setCurrentPlatform, getCurrentPlatform } from '../services/unifiedAuthService'

const PlatformContext = createContext(null)

export function usePlatform() {
  const context = useContext(PlatformContext)
  if (!context) {
    throw new Error('usePlatform must be used within PlatformProvider')
  }
  return context
}

export function PlatformProvider({ children }) {
  const [currentPlatform, setCurrentPlatformState] = useState(null)
  const [platforms, setPlatforms] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    initializePlatform()
  }, [])

  const initializePlatform = async () => {
    try {
      setLoading(true)

      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // Get user's platform access
      const { platforms: userPlatforms } = await getUserPlatformAccess(user.id)
      setPlatforms(userPlatforms || [])

      // Get current platform from session or recommend one
      let activePlatform = getCurrentPlatform()
      
      if (!activePlatform && userPlatforms.length > 0) {
        // Get recommended platform
        const { platform: recommended } = await getRecommendedPlatform(user.id)
        activePlatform = recommended || userPlatforms[0]?.platform
      }

      if (activePlatform) {
        setCurrentPlatformState(activePlatform)
        setCurrentPlatform(activePlatform)
      }
    } catch (error) {
      console.error('Error initializing platform:', error)
    } finally {
      setLoading(false)
    }
  }

  const changePlatform = async (newPlatform) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Not authenticated')
      }

      // Switch platform
      const result = await switchPlatform(user.id, newPlatform)
      if (!result.success) {
        throw new Error(result.error)
      }

      // Update state
      setCurrentPlatformState(newPlatform)
      setCurrentPlatform(newPlatform)

      // Navigate to platform dashboard
      const redirectPath = newPlatform === 'platform' || newPlatform === 'pm' ? '/platform/dashboard' : '/simulator/dashboard'
      navigate(redirectPath)

      return { success: true }
    } catch (error) {
      console.error('Error switching platform:', error)
      return { success: false, error: error.message }
    }
  }

  const refreshPlatforms = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { platforms: userPlatforms } = await getUserPlatformAccess(user.id)
      setPlatforms(userPlatforms || [])
    } catch (error) {
      console.error('Error refreshing platforms:', error)
    }
  }

  const value = {
    currentPlatform,
    platforms,
    loading,
    changePlatform,
    refreshPlatforms,
    hasMultiplePlatforms: platforms.length > 1,
  }

  return (
    <PlatformContext.Provider value={value}>
      {children}
    </PlatformContext.Provider>
  )
}

