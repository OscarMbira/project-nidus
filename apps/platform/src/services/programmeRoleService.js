/**
 * Programme-scoped roles & membership service (v982 Phase 3 — Portfolio/Programme-Scoped Roles &
 * Authority Model). Mirrors portfolioRoleService.js exactly, substituting programme scope.
 */
import { platformDb } from '@nidus/supabase'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'
import { getUserSystemRoles } from './roleService'
import { getOrganisationUsers } from './organisationRoleService'

const ROLES_SELECT = 'id, programme_id, role_name, role_display_name, role_description, role_level, is_template, is_active'
const MEMBERSHIP_SELECT = 'id, programme_id, user_id, programme_role_id, invitation_status, is_active, created_at, updated_at, user:user_id (id, full_name, email), programme_role:programme_role_id (id, role_name, role_display_name)'

export async function getProgrammeMembershipAccess(programmeId) {
  try {
    if (!programmeId) return { success: false, canManage: false, error: 'Missing programme id' }
    const { data: { user } = {} } = await platformDb.auth.getUser()
    if (!user) return { success: true, canManage: false, error: null }

    const { data: hasRole } = await platformDb.rpc('has_programme_role', {
      p_auth_user_id: user.id,
      p_programme_id: programmeId,
      p_role_names: ['programme_manager'],
    })
    if (hasRole) return { success: true, canManage: true, error: null }

    const { data: programme } = await platformDb
      .from('programmes')
      .select('id, account_id, portfolio_id, programme_owner_user_id, programme_manager_user_id')
      .eq('id', programmeId)
      .maybeSingle()
    if (!programme) return { success: true, canManage: false, error: null }

    const { data: userRow } = await platformDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
    if (userRow && (userRow.id === programme.programme_owner_user_id || userRow.id === programme.programme_manager_user_id)) {
      return { success: true, canManage: true, error: null }
    }

    if (programme.portfolio_id) {
      const { data: hasPortfolioRole } = await platformDb.rpc('has_portfolio_role', {
        p_auth_user_id: user.id,
        p_portfolio_id: programme.portfolio_id,
        p_role_names: ['portfolio_manager'],
      })
      if (hasPortfolioRole) return { success: true, canManage: true, error: null }
    }

    const rolesRes = await getUserSystemRoles(user.id)
    const roleNames = (rolesRes?.data || []).map((r) => r.roles?.role_name).filter(Boolean)
    const isPmoOrAdmin = roleNames.includes('pmo_admin') || roleNames.includes('system_admin')
    if (isPmoOrAdmin) {
      const accountId = await getCurrentUserAccountId()
      if (roleNames.includes('system_admin') || (programme.account_id && accountId === programme.account_id)) {
        return { success: true, canManage: true, error: null }
      }
    }
    return { success: true, canManage: false, error: null }
  } catch (error) {
    console.error('getProgrammeMembershipAccess:', error)
    return { success: false, canManage: false, error: error.message || 'Failed to check access' }
  }
}

export async function getProgrammeRoleTemplates() {
  try {
    const { data, error } = await platformDb
      .from('programme_roles')
      .select(ROLES_SELECT)
      .is('programme_id', null)
      .eq('is_template', true)
      .eq('is_active', true)
      .order('role_level', { ascending: false })
    if (error) throw error
    return { success: true, data: data || [], error: null }
  } catch (error) {
    console.error('getProgrammeRoleTemplates:', error)
    return { success: false, data: [], error: error.message || 'Failed to load programme role templates' }
  }
}

export async function getProgrammeMembers(programmeId) {
  try {
    if (!programmeId) return { success: false, data: [], error: 'Missing programme id' }
    const { data, error } = await platformDb
      .from('programme_memberships')
      .select(MEMBERSHIP_SELECT)
      .eq('programme_id', programmeId)
      .eq('is_active', true)
      .order('created_at', { ascending: true })
    if (error) throw error
    return { success: true, data: data || [], error: null }
  } catch (error) {
    console.error('getProgrammeMembers:', error)
    return { success: false, data: [], error: error.message || 'Failed to load programme members' }
  }
}

export async function getGrantableUsersForProgramme() {
  try {
    const { data: { user } = {} } = await platformDb.auth.getUser()
    if (!user) return { success: false, data: [], error: 'Not authenticated' }
    const res = await getOrganisationUsers(user.id, true)
    return res
  } catch (error) {
    console.error('getGrantableUsersForProgramme:', error)
    return { success: false, data: [], error: error.message || 'Failed to load organisation users' }
  }
}

export async function addProgrammeMember(programmeId, userId, programmeRoleId) {
  try {
    if (!programmeId || !userId || !programmeRoleId) return { success: false, data: null, error: 'Missing required fields' }
    const { data: { user } = {} } = await platformDb.auth.getUser()
    const { data: userRow } = user
      ? await platformDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
      : { data: null }

    const { data, error } = await platformDb
      .from('programme_memberships')
      .insert([{
        programme_id: programmeId,
        user_id: userId,
        programme_role_id: programmeRoleId,
        invited_by_user_id: userRow?.id || null,
        invitation_status: 'accepted',
        is_active: true,
      }])
      .select(MEMBERSHIP_SELECT)
      .single()
    if (error) throw error
    return { success: true, data, error: null }
  } catch (error) {
    console.error('addProgrammeMember:', error)
    return { success: false, data: null, error: error.message || 'Failed to add programme member' }
  }
}

export async function updateProgrammeMemberRole(membershipId, programmeRoleId) {
  try {
    if (!membershipId || !programmeRoleId) return { success: false, data: null, error: 'Missing required fields' }
    const { data, error } = await platformDb
      .from('programme_memberships')
      .update({ programme_role_id: programmeRoleId, updated_at: new Date().toISOString() })
      .eq('id', membershipId)
      .select(MEMBERSHIP_SELECT)
      .single()
    if (error) throw error
    return { success: true, data, error: null }
  } catch (error) {
    console.error('updateProgrammeMemberRole:', error)
    return { success: false, data: null, error: error.message || 'Failed to update programme member role' }
  }
}

export async function removeProgrammeMember(membershipId) {
  try {
    if (!membershipId) return { success: false, error: 'Missing membership id' }
    const { error } = await platformDb
      .from('programme_memberships')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', membershipId)
    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    console.error('removeProgrammeMember:', error)
    return { success: false, error: error.message || 'Failed to remove programme member' }
  }
}
