/**
 * Permission Checker Utility
 * Handles permission checking for PM Platform projects
 */

import { appDb } from '../services/supabaseClient'

/**
 * Get user's permissions for a project
 * @param {string} userId - Auth user ID
 * @param {string} projectId - Project UUID
 * @returns {Promise<{success: boolean, permissions: array, error: string|null}>}
 */
export async function getUserProjectPermissions(userId, projectId) {
  try {
    const { data, error } = await appDb.rpc('get_user_project_permissions', {
      p_auth_user_id: userId,
      p_project_id: projectId,
    })

    if (error) throw error

    return {
      success: true,
      permissions: data || [],
      error: null,
    }
  } catch (error) {
    console.error('Error fetching user permissions:', error)
    return {
      success: false,
      permissions: [],
      error: error.message || 'Failed to fetch permissions',
    }
  }
}

/**
 * Check if user has a specific permission in a project
 * @param {string} userId - Auth user ID
 * @param {string} projectId - Project UUID
 * @param {string} permissionCode - Permission code (e.g., 'tasks.edit')
 * @returns {Promise<boolean>}
 */
export async function hasPermission(userId, projectId, permissionCode) {
  try {
    const { data, error } = await appDb.rpc('has_project_permission', {
      p_auth_user_id: userId,
      p_project_id: projectId,
      p_permission_code: permissionCode,
    })

    if (error) throw error

    return data === true
  } catch (error) {
    console.error('Error checking permission:', error)
    return false
  }
}

/**
 * Check if user has any of the specified permissions
 * @param {string} userId - Auth user ID
 * @param {string} projectId - Project UUID
 * @param {array} permissionCodes - Array of permission codes
 * @returns {Promise<boolean>}
 */
export async function hasAnyPermission(userId, projectId, permissionCodes) {
  if (!permissionCodes || permissionCodes.length === 0) {
    return false
  }

  try {
    // Check each permission
    const checks = await Promise.all(
      permissionCodes.map((code) => hasPermission(userId, projectId, code))
    )

    return checks.some((hasPerm) => hasPerm === true)
  } catch (error) {
    console.error('Error checking permissions:', error)
    return false
  }
}

/**
 * Check if user has all of the specified permissions
 * @param {string} userId - Auth user ID
 * @param {string} projectId - Project UUID
 * @param {array} permissionCodes - Array of permission codes
 * @returns {Promise<boolean>}
 */
export async function hasAllPermissions(userId, projectId, permissionCodes) {
  if (!permissionCodes || permissionCodes.length === 0) {
    return true
  }

  try {
    // Check each permission
    const checks = await Promise.all(
      permissionCodes.map((code) => hasPermission(userId, projectId, code))
    )

    return checks.every((hasPerm) => hasPerm === true)
  } catch (error) {
    console.error('Error checking permissions:', error)
    return false
  }
}

/**
 * Get permission cache key
 * @param {string} userId - Auth user ID
 * @param {string} projectId - Project UUID
 * @returns {string}
 */
function getCacheKey(userId, projectId) {
  return `permissions:${userId}:${projectId}`
}

/**
 * Permission cache (in-memory, expires after 5 minutes)
 */
const permissionCache = new Map()

/**
 * Clear permission cache for a user/project
 * @param {string} userId - Auth user ID
 * @param {string} projectId - Project UUID
 */
export function clearPermissionCache(userId, projectId) {
  const key = getCacheKey(userId, projectId)
  permissionCache.delete(key)
}

/**
 * Clear all permission cache
 */
export function clearAllPermissionCache() {
  permissionCache.clear()
}

/**
 * Check permission with caching
 * @param {string} userId - Auth user ID
 * @param {string} projectId - Project UUID
 * @param {string} permissionCode - Permission code
 * @returns {Promise<boolean>}
 */
export async function hasPermissionCached(userId, projectId, permissionCode) {
  const cacheKey = getCacheKey(userId, projectId)
  const cached = permissionCache.get(cacheKey)

  // Check if cache is valid (5 minutes)
  if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
    return cached.permissions.includes(permissionCode)
  }

  // Fetch permissions
  const { permissions } = await getUserProjectPermissions(userId, projectId)
  const permissionCodes = permissions.map((p) => p.permission_code)

  // Cache the result
  permissionCache.set(cacheKey, {
    permissions: permissionCodes,
    timestamp: Date.now(),
  })

  return permissionCodes.includes(permissionCode)
}

export default {
  getUserProjectPermissions,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasPermissionCached,
  clearPermissionCache,
  clearAllPermissionCache,
}

