/**
 * Permission Gate Component
 * Declarative component for permission-based rendering
 *
 * Usage:
 * <PermissionGate permission="tasks.edit" projectId={projectId}>
 *   <EditButton />
 * </PermissionGate>
 */

import { useState, useEffect } from 'react'
import { hasPermission } from '../../utils/permissionChecker'
import { supabase } from '../../services/supabaseClient'

export default function PermissionGate({
  children,
  permission,
  permissions = [],
  projectId,
  requireAll = false,
  fallback = null,
}) {
  const [hasAccess, setHasAccess] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkPermissions()
  }, [permission, permissions, projectId, requireAll])

  const checkPermissions = async () => {
    if (!projectId) {
      setHasAccess(false)
      setLoading(false)
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setHasAccess(false)
        setLoading(false)
        return
      }

      // Check single permission
      if (permission) {
        const hasPerm = await hasPermission(user.id, projectId, permission)
        setHasAccess(hasPerm)
      }
      // Check multiple permissions
      else if (permissions.length > 0) {
        const checks = await Promise.all(
          permissions.map((perm) => hasPermission(user.id, projectId, perm))
        )

        if (requireAll) {
          setHasAccess(checks.every((check) => check === true))
        } else {
          setHasAccess(checks.some((check) => check === true))
        }
      } else {
        setHasAccess(false)
      }
    } catch (error) {
      console.error('Error checking permissions:', error)
      setHasAccess(false)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return null // Or a loading spinner
  }

  if (!hasAccess) {
    return fallback
  }

  return children
}

