/**
 * Unified Authentication Service
 * Handles authentication and platform access for both PM and Simulator platforms
 *
 * IMPORTANT: This service works with both platforms
 * Uses appDb for Platform data, simDb for Simulator data
 */

import { appDb, supabase } from './supabase/supabaseClient'
import { getPlatformAccess, canAccessPlatform, updatePlatformAccess } from './unifiedSubscriptionService'

/**
 * Login user and return platform access information
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<{success: boolean, user: object|null, platforms: array, error: string|null}>}
 */
export async function login(email, password) {
  try {
    // Authenticate with Supabase
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) throw authError

    if (!data.user) {
      return {
        success: false,
        user: null,
        platforms: [],
        error: 'Authentication failed',
      }
    }

    // Run platform access check and org check in parallel
    const [platformsData, orgResult] = await Promise.all([
      getPlatformAccess(data.user.id),
      appDb
        .from('accounts')
        .select('id, organisation_verified')
        .eq('owner_user_id', data.user.id)
        .maybeSingle(),
    ])

    // Filter to only registered platforms
    const registeredPlatforms = platformsData.filter((p) => p.has_registered)

    const org = orgResult.data

    // Add organisation status to response
    const result = {
      success: true,
      user: data.user,
      platforms: registeredPlatforms,
      error: null,
    }

    if (!org) {
      // No organisation - redirect to create one
      result.requiresOrganisationSetup = true
    } else if (!org.organisation_verified) {
      // Organisation exists but not verified
      result.requiresOrganisationVerification = true
      result.organisationId = org.id
    }

    return result
  } catch (error) {
    console.error('Login error:', error)
    return {
      success: false,
      user: null,
      platforms: [],
      error: error.message || 'Login failed',
    }
  }
}

/**
 * Get user's platform access information
 * @param {string} userId - Auth user ID
 * @returns {Promise<{success: boolean, platforms: array, error: string|null}>}
 */
export async function getUserPlatformAccess(userId) {
  try {
    const platforms = await getPlatformAccess(userId)
    const registeredPlatforms = platforms.filter((p) => p.has_registered)

    // Check active subscription status for each platform
    const platformsWithStatus = await Promise.all(
      registeredPlatforms.map(async (platform) => {
        const hasActiveSubscription = await canAccessPlatform(userId, platform.platform)
        return {
          ...platform,
          hasActiveSubscription,
        }
      })
    )

    return {
      success: true,
      platforms: platformsWithStatus,
      error: null,
    }
  } catch (error) {
    console.error('Error getting platform access:', error)
    return {
      success: false,
      platforms: [],
      error: error.message || 'Failed to get platform access',
    }
  }
}

/**
 * Switch active platform context
 * @param {string} userId - Auth user ID
 * @param {string} platform - Platform to switch to ('platform' or 'simulator')
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function switchPlatform(userId, platform) {
  try {
    // Validate platform - accept both 'platform' and legacy 'pm' for backward compatibility
    const normalizedPlatform = platform === 'pm' ? 'platform' : platform;
    if (normalizedPlatform !== 'platform' && normalizedPlatform !== 'simulator') {
      return {
        success: false,
        error: 'Invalid platform',
      }
    }

    // Check if user has access to this platform
    const hasAccess = await canAccessPlatform(userId, normalizedPlatform)
    if (!hasAccess) {
      return {
        success: false,
        error: `You don't have access to ${normalizedPlatform} platform`,
      }
    }

    // Update platform access (tracks last access)
    await updatePlatformAccess(userId, normalizedPlatform)

    // Store current platform in sessionStorage
    sessionStorage.setItem('currentPlatform', normalizedPlatform)

    return {
      success: true,
      error: null,
    }
  } catch (error) {
    console.error('Error switching platform:', error)
    return {
      success: false,
      error: error.message || 'Failed to switch platform',
    }
  }
}

/**
 * Get current active platform from session
 * @returns {string|null} - Current platform ('platform' or 'simulator') or null
 */
export function getCurrentPlatform() {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem('currentPlatform')
}

/**
 * Set current active platform in session
 * @param {string} platform - Platform to set ('platform' or 'simulator')
 */
export function setCurrentPlatform(platform) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem('currentPlatform', platform)
}

/**
 * Clear current platform from session
 */
export function clearCurrentPlatform() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem('currentPlatform')
}

/**
 * Get recommended platform for user (based on access and usage)
 * @param {string} userId - Auth user ID
 * @returns {Promise<{success: boolean, platform: string|null, error: string|null}>}
 */
export async function getRecommendedPlatform(userId) {
  try {
    const { platforms } = await getUserPlatformAccess(userId)

    if (platforms.length === 0) {
      return {
        success: true,
        platform: null,
        error: null,
      }
    }

    if (platforms.length === 1) {
      return {
        success: true,
        platform: platforms[0].platform,
        error: null,
      }
    }

    // If user has both platforms, prefer the one with active subscription
    const activePlatform = platforms.find((p) => p.hasActiveSubscription)
    if (activePlatform) {
      return {
        success: true,
        platform: activePlatform.platform,
        error: null,
      }
    }

    // Otherwise, prefer the one with most recent access
    const sortedPlatforms = platforms.sort((a, b) => {
      const aTime = a.last_access_at ? new Date(a.last_access_at).getTime() : 0
      const bTime = b.last_access_at ? new Date(b.last_access_at).getTime() : 0
      return bTime - aTime
    })

    return {
      success: true,
      platform: sortedPlatforms[0]?.platform || 'platform',
      error: null,
    }
  } catch (error) {
    console.error('Error getting recommended platform:', error)
    return {
      success: false,
      platform: null,
      error: error.message || 'Failed to get recommended platform',
    }
  }
}

export default {
  login,
  getUserPlatformAccess,
  switchPlatform,
  getCurrentPlatform,
  setCurrentPlatform,
  clearCurrentPlatform,
  getRecommendedPlatform,
}

