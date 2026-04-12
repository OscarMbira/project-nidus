/**
 * Financial module RBAC (v349) — derives flags from user_roles + role names.
 * DB permissions (finance.*) are seeded in v416; this hook mirrors plan matrix for UI.
 */

import { useState, useEffect, useCallback } from 'react'
import { platformDb } from '../services/supabase/supabaseClient'

async function getPublicUserId() {
  const {
    data: { user },
  } = await platformDb.auth.getUser()
  if (!user) return null
  const { data } = await platformDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
  return data?.id || null
}

export function useFinancialPermissions() {
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
      const names = (data || [])
        .map((r) => r.roles?.role_name)
        .filter(Boolean)
      setRoleNames(names)
    } catch (e) {
      console.error('useFinancialPermissions', e)
      setRoleNames([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const has = (n) => roleNames.includes(n)

  const canView =
    has('pmo_admin') ||
    has('system_admin') ||
    has('project_manager') ||
    has('programme_manager') ||
    has('portfolio_manager') ||
    has('project_sponsor') ||
    has('executive') ||
    has('project_board_member') ||
    has('team_lead') ||
    has('team_member') ||
    has('stakeholder') ||
    has('viewer')

  const canManage =
    has('pmo_admin') || has('system_admin') || has('project_manager') || has('programme_manager') || has('portfolio_manager')

  const canViewAll = has('pmo_admin') || has('system_admin') || has('programme_manager') || has('portfolio_manager')

  const canManageAll = has('pmo_admin') || has('system_admin')

  const readOnlyExecutive = (has('project_sponsor') || has('executive') || has('project_board_member')) && !canManage

  return {
    loading,
    roleNames,
    canView,
    canManage,
    canViewAll,
    canManageAll,
    readOnlyExecutive,
    refresh: load,
  }
}
