/**
 * useProjectPermissions Hook
 * React hook for checking project permissions
 */

import { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import { getUserProjectPermissions, hasPermission, hasAnyPermission, hasAllPermissions } from '../utils/permissionChecker'

export function useProjectPermissions(projectId) {
  const [permissions, setPermissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [userId, setUserId] = useState(null)

  useEffect(() => {
    if (!projectId) {
      setLoading(false)
      return
    }

    loadPermissions()
  }, [projectId])

  const loadPermissions = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Not authenticated')
        setLoading(false)
        return
      }

      setUserId(user.id)

      const result = await getUserProjectPermissions(user.id, projectId)
      if (result.success) {
        setPermissions(result.permissions)
      } else {
        setError(result.error)
      }
    } catch (err) {
      console.error('Error loading permissions:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const checkPermission = async (permissionCode) => {
    if (!userId || !projectId) return false

    try {
      return await hasPermission(userId, projectId, permissionCode)
    } catch (err) {
      console.error('Error checking permission:', err)
      return false
    }
  }

  const checkAnyPermission = async (permissionCodes) => {
    if (!userId || !projectId) return false

    try {
      return await hasAnyPermission(userId, projectId, permissionCodes)
    } catch (err) {
      console.error('Error checking permissions:', err)
      return false
    }
  }

  const checkAllPermissions = async (permissionCodes) => {
    if (!userId || !projectId) return false

    try {
      return await hasAllPermissions(userId, projectId, permissionCodes)
    } catch (err) {
      console.error('Error checking permissions:', err)
      return false
    }
  }

  const hasPermissionCode = (permissionCode) => {
    return permissions.some((p) => p.permission_code === permissionCode)
  }

  const hasAnyPermissionCode = (permissionCodes) => {
    return permissionCodes.some((code) => hasPermissionCode(code))
  }

  const hasAllPermissionCodes = (permissionCodes) => {
    return permissionCodes.every((code) => hasPermissionCode(code))
  }

  return {
    permissions,
    permissionCodes: permissions.map((p) => p.permission_code),
    loading,
    error,
    checkPermission,
    checkAnyPermission,
    checkAllPermissions,
    hasPermissionCode,
    hasAnyPermissionCode,
    hasAllPermissionCodes,
    refresh: loadPermissions,
  }
}

