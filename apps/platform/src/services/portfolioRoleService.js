/**
 * Portfolio-scoped roles & membership service (v982 Phase 3 — Portfolio/Programme-Scoped Roles &
 * Authority Model). Mirrors the shape of project-level role/membership management, simplified to
 * direct assignment among existing account members (no email-invitation flow — see
 * projectMembershipService.js for that fuller, project-level pattern; this phase's brief scope is
 * "assign a role to an existing platform user", not a new invitation system).
 * All writes are RLS-enforced (SQL/v992_portfolio_programme_rls_helpers.sql) — this service does
 * not duplicate the authorization logic client-side beyond gating the UI.
 */
import { platformDb } from '@nidus/supabase'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'
import { getUserSystemRoles } from './roleService'
import { getOrganisationUsers } from './organisationRoleService'

const ROLES_SELECT = 'id, portfolio_id, role_name, role_display_name, role_description, role_level, is_template, is_active'
const MEMBERSHIP_SELECT = 'id, portfolio_id, user_id, portfolio_role_id, invitation_status, is_active, created_at, updated_at, user:user_id (id, full_name, email), portfolio_role:portfolio_role_id (id, role_name, role_display_name)'

/**
 * Resolves whether the caller may manage membership on this specific portfolio: an existing
 * portfolio_manager grant, the portfolio's own owner/manager field, an account PMO Admin/owner of
 * the portfolio's account, or system_admin. Mirrors the RLS write policy's own logic so the UI can
 * gate its Add/Edit/Remove controls without a failed write round-trip.
 */
export async function getPortfolioMembershipAccess(portfolioId) {
  try {
    if (!portfolioId) return { success: false, canManage: false, error: 'Missing portfolio id' }
    const { data: { user } = {} } = await platformDb.auth.getUser()
    if (!user) return { success: true, canManage: false, error: null }

    const { data: hasRole } = await platformDb.rpc('has_portfolio_role', {
      p_auth_user_id: user.id,
      p_portfolio_id: portfolioId,
      p_role_names: ['portfolio_manager'],
    })
    if (hasRole) return { success: true, canManage: true, error: null }

    const { data: portfolio } = await platformDb
      .from('portfolios')
      .select('id, account_id, portfolio_owner_user_id, portfolio_manager_user_id')
      .eq('id', portfolioId)
      .maybeSingle()
    if (!portfolio) return { success: true, canManage: false, error: null }

    const { data: userRow } = await platformDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
    if (userRow && (userRow.id === portfolio.portfolio_owner_user_id || userRow.id === portfolio.portfolio_manager_user_id)) {
      return { success: true, canManage: true, error: null }
    }

    const rolesRes = await getUserSystemRoles(user.id)
    const roleNames = (rolesRes?.data || []).map((r) => r.roles?.role_name).filter(Boolean)
    const isPmoOrAdmin = roleNames.includes('pmo_admin') || roleNames.includes('system_admin')
    if (isPmoOrAdmin) {
      const accountId = await getCurrentUserAccountId()
      if (roleNames.includes('system_admin') || (portfolio.account_id && accountId === portfolio.account_id)) {
        return { success: true, canManage: true, error: null }
      }
    }
    return { success: true, canManage: false, error: null }
  } catch (error) {
    console.error('getPortfolioMembershipAccess:', error)
    return { success: false, canManage: false, error: error.message || 'Failed to check access' }
  }
}

/** @returns {Promise<{success: boolean, data: array, error: string|null}>} */
export async function getPortfolioRoleTemplates() {
  try {
    const { data, error } = await platformDb
      .from('portfolio_roles')
      .select(ROLES_SELECT)
      .is('portfolio_id', null)
      .eq('is_template', true)
      .eq('is_active', true)
      .order('role_level', { ascending: false })
    if (error) throw error
    return { success: true, data: data || [], error: null }
  } catch (error) {
    console.error('getPortfolioRoleTemplates:', error)
    return { success: false, data: [], error: error.message || 'Failed to load portfolio role templates' }
  }
}

/** @returns {Promise<{success: boolean, data: array, error: string|null}>} */
export async function getPortfolioMembers(portfolioId) {
  try {
    if (!portfolioId) return { success: false, data: [], error: 'Missing portfolio id' }
    const { data, error } = await platformDb
      .from('portfolio_memberships')
      .select(MEMBERSHIP_SELECT)
      .eq('portfolio_id', portfolioId)
      .eq('is_active', true)
      .order('created_at', { ascending: true })
    if (error) throw error
    return { success: true, data: data || [], error: null }
  } catch (error) {
    console.error('getPortfolioMembers:', error)
    return { success: false, data: [], error: error.message || 'Failed to load portfolio members' }
  }
}

/** Grantable users — this portfolio's own account's members (reuses the existing org-users lookup). */
export async function getGrantableUsersForPortfolio() {
  try {
    const { data: { user } = {} } = await platformDb.auth.getUser()
    if (!user) return { success: false, data: [], error: 'Not authenticated' }
    const res = await getOrganisationUsers(user.id, true)
    return res
  } catch (error) {
    console.error('getGrantableUsersForPortfolio:', error)
    return { success: false, data: [], error: error.message || 'Failed to load organisation users' }
  }
}

export async function addPortfolioMember(portfolioId, userId, portfolioRoleId) {
  try {
    if (!portfolioId || !userId || !portfolioRoleId) return { success: false, data: null, error: 'Missing required fields' }
    const { data: { user } = {} } = await platformDb.auth.getUser()
    const { data: userRow } = user
      ? await platformDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
      : { data: null }

    const { data, error } = await platformDb
      .from('portfolio_memberships')
      .insert([{
        portfolio_id: portfolioId,
        user_id: userId,
        portfolio_role_id: portfolioRoleId,
        invited_by_user_id: userRow?.id || null,
        invitation_status: 'accepted',
        is_active: true,
      }])
      .select(MEMBERSHIP_SELECT)
      .single()
    if (error) throw error
    return { success: true, data, error: null }
  } catch (error) {
    console.error('addPortfolioMember:', error)
    return { success: false, data: null, error: error.message || 'Failed to add portfolio member' }
  }
}

export async function updatePortfolioMemberRole(membershipId, portfolioRoleId) {
  try {
    if (!membershipId || !portfolioRoleId) return { success: false, data: null, error: 'Missing required fields' }
    const { data, error } = await platformDb
      .from('portfolio_memberships')
      .update({ portfolio_role_id: portfolioRoleId, updated_at: new Date().toISOString() })
      .eq('id', membershipId)
      .select(MEMBERSHIP_SELECT)
      .single()
    if (error) throw error
    return { success: true, data, error: null }
  } catch (error) {
    console.error('updatePortfolioMemberRole:', error)
    return { success: false, data: null, error: error.message || 'Failed to update portfolio member role' }
  }
}

export async function removePortfolioMember(membershipId) {
  try {
    if (!membershipId) return { success: false, error: 'Missing membership id' }
    const { error } = await platformDb
      .from('portfolio_memberships')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', membershipId)
    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    console.error('removePortfolioMember:', error)
    return { success: false, error: error.message || 'Failed to remove portfolio member' }
  }
}
