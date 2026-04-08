import { useState, useEffect, useCallback } from 'react'
import { platformDb } from '../services/supabase/supabaseClient'

const SYSTEM_WRITE_ROLES = new Set([
  'pmo_admin',
  'system_admin',
  'account_owner',
  'System Admin',
])

const PROJECT_WRITE_ROLES = new Set([
  'portfolio_manager',
  'programme_manager',
  'project_manager',
])

/**
 * True if user may create/update/delete planning artefacts for the project.
 * @param {string|null|undefined} projectId — UUID of projects.id
 */
export function useProjectRole(projectId) {
  const [canEdit, setCanEdit] = useState(false)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!projectId) {
      setCanEdit(false)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data: { user } } = await platformDb.auth.getUser()
      if (!user?.id) {
        setCanEdit(false)
        return
      }

      const { data: userRow } = await platformDb
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .eq('is_deleted', false)
        .maybeSingle()

      if (!userRow?.id) {
        setCanEdit(false)
        return
      }

      const { data: urRows } = await platformDb
        .from('user_roles')
        .select('is_deleted, roles:role_id ( role_name )')
        .eq('user_id', userRow.id)
        .eq('is_active', true)

      for (const row of urRows || []) {
        if (row.is_deleted) continue
        const name = row.roles?.role_name
        if (name && SYSTEM_WRITE_ROLES.has(name)) {
          setCanEdit(true)
          return
        }
      }

      const { data: pmRows } = await platformDb
        .from('project_memberships')
        .select('project_roles:project_role_id ( role_name )')
        .eq('project_id', projectId)
        .eq('user_id', userRow.id)
        .eq('is_active', true)

      for (const row of pmRows || []) {
        const name = row.project_roles?.role_name
        if (name && PROJECT_WRITE_ROLES.has(name)) {
          setCanEdit(true)
          return
        }
      }

      setCanEdit(false)
    } catch {
      setCanEdit(false)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { canEdit, loading, refresh }
}
