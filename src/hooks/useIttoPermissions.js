/**
 * ITTO UI permissions (v352) — combines global roles for template vs project actions.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { platformDb } from '../services/supabase/supabaseClient'

async function getPublicUserId() {
  const {
    data: { user },
  } = await platformDb.auth.getUser()
  if (!user) return null
  const { data } = await platformDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
  return data?.id || null
}

export function useIttoPermissions() {
  const [loading, setLoading] = useState(true)
  const [roleNames, setRoleNames] = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const uid = await getPublicUserId()
      if (!uid) {
        setRoleNames([])
        return
      }
      const { data, error } = await platformDb
        .from('user_roles')
        .select('roles(role_name)')
        .eq('user_id', uid)
        .eq('is_active', true)
        .eq('is_deleted', false)
      if (error) throw error
      const names = (data || []).map((r) => r.roles?.role_name).filter(Boolean)
      setRoleNames(names)
    } catch (e) {
      console.error('useIttoPermissions', e)
      setRoleNames([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const has = (n) => roleNames.some((r) => r === n || r?.toLowerCase?.() === n)

  const isSystem = has('system_admin') || has('System Admin')
  const isPmo = has('pmo_admin') || has('PMO Admin')
  const isPm = has('project_manager')
  const canManageOrgTemplates = isSystem || isPmo
  const canCopyTemplate = useMemo(
    () =>
      isSystem ||
      isPmo ||
      isPm ||
      has('programme_manager') ||
      has('portfolio_manager') ||
      has('team_lead') ||
      has('Team Lead') ||
      has('team_manager') ||
      has('pm_team_manager') ||
      has('Team Manager'),
    [roleNames, isSystem, isPmo, isPm]
  )

  const canWriteProjectIto = useMemo(
    () =>
      isSystem ||
      isPm ||
      has('team_lead') ||
      has('team_manager') ||
      has('pm_team_manager'),
    [roleNames, isSystem, isPm]
  )

  const canDeleteProjectIto = isSystem || isPm

  return {
    loading,
    roleNames,
    canManageOrgTemplates,
    canCopyTemplate,
    canWriteProjectIto,
    canDeleteProjectIto,
  }
}
