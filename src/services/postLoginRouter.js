/**
 * Post-Login Router Service
 *
 * Centralized logic for determining where to route user after login.
 * Billing-aware routing applies only to users with billing access (owner or delegate).
 */

import { platformDb } from './supabase/supabaseClient'
import { getDashboardRouteByRole } from './roleRouter'
import {
  resolveBillingAccess,
  getSubscriptionBillingAlert,
  resolveAccountIdForUser,
} from './billingAccessService'
import { isPlatformBillingEnabled } from '../config/platformBillingFeatures.js'
import {
  inferLayoutScopeFromPathname,
  persistMenuLayoutScope,
} from '../utils/menuLayoutUtils.js'

function persistMenuScopeForRoute(route) {
  const scope = inferLayoutScopeFromPathname(route)
  if (scope === 'pm' || scope === 'pmo') {
    persistMenuLayoutScope(scope)
  }
}

async function getUserId(authUserId) {
  try {
    const { data, error } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', authUserId)
      .maybeSingle()

    if (data?.id) return data.id

    const { data: { user: authUser } } = await platformDb.auth.getUser()
    if (authUser?.email) {
      const { data: byEmail } = await platformDb
        .from('users')
        .select('id')
        .eq('email', authUser.email)
        .maybeSingle()
      if (byEmail?.id) return byEmail.id
    }

    console.error('Error fetching user ID:', error)
    return null
  } catch (error) {
    console.error('Exception fetching user ID:', error)
    return null
  }
}

async function checkOrganisationStatus(userId) {
  try {
    const { data: org, error } = await platformDb
      .from('accounts')
      .select('id, organisation_verified')
      .eq('owner_user_id', userId)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking organisation:', error)
      return { exists: false, verified: false, orgId: null, isInvitedMember: false }
    }

    if (org) {
      return {
        exists: true,
        verified: org.organisation_verified || false,
        orgId: org.id,
        isInvitedMember: false,
      }
    }

    const accountId = await resolveAccountIdForUser(userId)
    if (accountId) {
      return { exists: true, verified: true, orgId: accountId, isInvitedMember: true }
    }

    const { data: membership } = await platformDb
      .from('project_memberships')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1)

    if (membership && membership.length > 0) {
      return { exists: true, verified: true, orgId: null, isInvitedMember: true }
    }

    return { exists: false, verified: false, orgId: null, isInvitedMember: false }
  } catch (error) {
    console.error('Exception checking organisation:', error)
    return { exists: false, verified: false, orgId: null, isInvitedMember: false }
  }
}

/**
 * @param {string} authUserId
 * @param {string} [returnTo] — optional post-login override (must be same-origin path)
 */
export async function getPostLoginRoute(authUserId, returnTo = null) {
  try {
    const safeReturn =
      returnTo && String(returnTo).startsWith('/') && !String(returnTo).startsWith('//')
        ? returnTo
        : null

    const userId = await getUserId(authUserId)
    if (!userId) {
      return { route: '/onboarding/organisation-setup', reason: 'user_not_found' }
    }

    const orgStatus = await checkOrganisationStatus(userId)
    if (!orgStatus.exists) {
      return { route: '/onboarding/organisation-setup', reason: 'no_organisation' }
    }

    const dashboardRoute = await getDashboardRouteByRole(authUserId)

    if (isPlatformBillingEnabled()) {
      const billingAccess = await resolveBillingAccess(authUserId, orgStatus.orgId)

      if (billingAccess.hasBillingAccess && safeReturn?.startsWith('/platform/subscription')) {
        return { route: safeReturn, reason: 'billing_return_to' }
      }

      if (billingAccess.hasBillingAccess && billingAccess.accountId) {
        const alert = await getSubscriptionBillingAlert(billingAccess.accountId)
        if (alert.needsRedirect) {
          return {
            route: '/platform/subscription',
            reason: 'billing_action_required',
            billingAlert: alert,
          }
        }
      }

      if (safeReturn) {
        persistMenuScopeForRoute(safeReturn)
        return { route: safeReturn, reason: 'return_to' }
      }

      persistMenuScopeForRoute(dashboardRoute)
      return {
        route: dashboardRoute,
        reason: billingAccess.hasBillingAccess
          ? 'organisation_verified_billing_user_dashboard'
          : 'organisation_verified_role_based',
      }
    }

    if (safeReturn && !safeReturn.startsWith('/platform/subscription')) {
      persistMenuScopeForRoute(safeReturn)
      return { route: safeReturn, reason: 'return_to' }
    }

    persistMenuScopeForRoute(dashboardRoute)
    return {
      route: dashboardRoute,
      reason: 'organisation_verified_role_based',
    }
  } catch (error) {
    console.error('Error in getPostLoginRoute:', error)
    return { route: '/platform/dashboard', reason: 'error_fallback' }
  }
}

export async function checkOrganisationStatusByAuthId(authUserId) {
  const userId = await getUserId(authUserId)
  if (!userId) {
    return { exists: false, verified: false, orgId: null }
  }
  return checkOrganisationStatus(userId)
}

export async function getSimulatorDashboardRouteByRole(authUserId) {
  try {
    const { getUserSystemRoles } = await import('./roleService')
    const rolesResult = await getUserSystemRoles(authUserId)

    if (!rolesResult.success || !rolesResult.data?.length) {
      return '/simulator/dashboard'
    }

    const hasPMO = rolesResult.data.some((a) => a.roles?.role_name === 'pmo_admin')
    const hasPM = rolesResult.data.some((a) => a.roles?.role_name === 'project_manager')

    if (hasPMO) return '/simulator/pmo/dashboard'
    if (hasPM) return '/simulator/pm/dashboard'
    return '/simulator/dashboard'
  } catch (error) {
    console.error('Error in getSimulatorDashboardRouteByRole:', error)
    return '/simulator/dashboard'
  }
}

export async function getSimulatorPostLoginRoute(authUserId) {
  try {
    const userId = await getUserId(authUserId)
    if (!userId) {
      return { route: '/simulator/dashboard', reason: 'user_not_found' }
    }

    const orgStatus = await checkOrganisationStatus(userId)
    if (!orgStatus.exists) {
      return { route: '/onboarding/organisation-setup', reason: 'no_organisation' }
    }

    const dashboardRoute = await getSimulatorDashboardRouteByRole(authUserId)
    return { route: dashboardRoute, reason: 'organisation_verified_role_based_simulator' }
  } catch (error) {
    console.error('Error in getSimulatorPostLoginRoute:', error)
    return { route: '/simulator/dashboard', reason: 'error_fallback_simulator' }
  }
}

export default {
  getPostLoginRoute,
  getSimulatorPostLoginRoute,
  getSimulatorDashboardRouteByRole,
  checkOrganisationStatusByAuthId,
}
