/**
 * Post-Login Router Service
 * 
 * Centralized logic for determining where to route user after login
 * Handles organisation checks and subscription-based routing (when enabled)
 */

import { platformDb } from './supabase/supabaseClient';
import { getDashboardRouteByRole } from './roleRouter';
import { getUserSystemRoles } from './roleService';

// Feature flag for subscription routing (disabled for development)
const ENABLE_SUBSCRIPTION_ROUTING = false;

/**
 * Get the user's internal ID from auth user ID
 * @param {string} authUserId - Supabase auth user ID
 * @returns {Promise<string|null>} - Internal users.id or null
 */
async function getUserId(authUserId) {
  try {
    const { data, error } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', authUserId)
      .single();

    if (error || !data) {
      console.error('Error fetching user ID:', error);
      return null;
    }

    return data.id;
  } catch (error) {
    console.error('Exception fetching user ID:', error);
    return null;
  }
}

/**
 * Check if user has an organisation, or is an invited project member.
 * Invited PMs/team members never own an org but are legitimate platform users.
 * @param {string} userId - Internal users.id
 * @returns {Promise<{exists: boolean, verified: boolean, orgId: string|null, isInvitedMember: boolean}>}
 */
async function checkOrganisationStatus(userId) {
  try {
    const { data: org, error } = await platformDb
      .from('accounts')
      .select('id, organisation_verified')
      .eq('owner_user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking organisation:', error);
      return { exists: false, verified: false, orgId: null, isInvitedMember: false };
    }

    if (org) {
      return {
        exists: true,
        verified: org.organisation_verified || false,
        orgId: org.id,
        isInvitedMember: false,
      };
    }

    // No org ownership — check if this user is an invited project member.
    // Invited PMs/team members don't own an org but have legitimate platform access.
    const { data: membership } = await platformDb
      .from('project_memberships')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1);

    if (membership && membership.length > 0) {
      return { exists: true, verified: true, orgId: null, isInvitedMember: true };
    }

    return { exists: false, verified: false, orgId: null, isInvitedMember: false };
  } catch (error) {
    console.error('Exception checking organisation:', error);
    return { exists: false, verified: false, orgId: null, isInvitedMember: false };
  }
}

/**
 * Check subscription status (for future use when subscription routing is enabled)
 * @param {string} accountId - Account ID
 * @returns {Promise<{hasTrial: boolean, hasPaid: boolean}>}
 */
async function checkSubscriptionStatus(accountId) {
  if (!ENABLE_SUBSCRIPTION_ROUTING) {
    // Subscription routing disabled - return defaults
    return { hasTrial: false, hasPaid: false };
  }

  try {
    // Check for active trial projects
    const { data: trialProjects } = await platformDb
      .from('projects')
      .select('id')
      .eq('account_id', accountId)
      .eq('is_trial', true)
      .gt('trial_expires_at', new Date().toISOString())
      .limit(1);

    // Check for active paid subscriptions
    const { data: paidSubscriptions } = await platformDb
      .from('platform_subscriptions')
      .select('id')
      .eq('account_id', accountId)
      .eq('status', 'active')
      .limit(1);

    return {
      hasTrial: (trialProjects && trialProjects.length > 0),
      hasPaid: (paidSubscriptions && paidSubscriptions.length > 0)
    };
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return { hasTrial: false, hasPaid: false };
  }
}

/**
 * Get the route user should be sent to after login
 * @param {string} authUserId - Supabase auth user ID
 * @returns {Promise<{route: string, reason: string}>}
 */
export async function getPostLoginRoute(authUserId) {
  try {
    // Step 1: Get internal user ID
    const userId = await getUserId(authUserId);
    if (!userId) {
      console.warn('User ID not found, redirecting to organisation setup');
      return {
        route: '/onboarding/organisation-setup',
        reason: 'user_not_found'
      };
    }

    // Step 2: Check organisation status
    const orgStatus = await checkOrganisationStatus(userId);
    
    if (!orgStatus.exists) {
      // No organisation - force setup
      return {
        route: '/onboarding/organisation-setup',
        reason: 'no_organisation'
      };
    }

    // TEMPORARILY DISABLED: Email verification check
    // Organisations are automatically verified when created
    // Skip verification check and proceed to dashboard
    /*
    if (!orgStatus.verified) {
      // Organisation exists but not verified
      return {
        route: '/onboarding/organisation-verification-notice',
        reason: 'organisation_not_verified',
        state: { organisationId: orgStatus.orgId }
      };
    }
    */

    // Step 3: Organisation verified - check role and route accordingly
    // Get role-based dashboard route
    const dashboardRoute = await getDashboardRouteByRole(authUserId);
    
    // For now, subscription routing is disabled, so use role-based routing
    if (!ENABLE_SUBSCRIPTION_ROUTING) {
      return {
        route: dashboardRoute,
        reason: 'organisation_verified_role_based'
      };
    }

    // Step 4: Future - Check subscription status (when enabled)
    const subscriptionStatus = await checkSubscriptionStatus(orgStatus.orgId);
    
    if (subscriptionStatus.hasTrial) {
      return {
        route: '/platform/dashboard',
        reason: 'has_trial'
      };
    }

    if (subscriptionStatus.hasPaid) {
      return {
        route: '/platform/dashboard',
        reason: 'has_paid_subscription'
      };
    }

    // No projects/subscriptions - route to project type selection
    return {
      route: '/onboarding/project-type-selection',
      reason: 'no_projects'
    };
  } catch (error) {
    console.error('Error in getPostLoginRoute:', error);
    // Default to dashboard on error
    return {
      route: '/platform/dashboard',
      reason: 'error_fallback'
    };
  }
}

/**
 * Check organisation status (exported for use in other components)
 * @param {string} authUserId - Supabase auth user ID
 * @returns {Promise<{exists: boolean, verified: boolean, orgId: string|null}>}
 */
export async function checkOrganisationStatusByAuthId(authUserId) {
  const userId = await getUserId(authUserId);
  if (!userId) {
    return { exists: false, verified: false, orgId: null };
  }
  return await checkOrganisationStatus(userId);
}

/**
 * Get simulator dashboard route based on user's role
 * Routes to /simulator/pmo/dashboard for PMO Admin or /simulator/pm/dashboard for PM
 * @param {string} authUserId - Auth user ID
 * @returns {Promise<string>} Simulator dashboard route path
 */
export async function getSimulatorDashboardRouteByRole(authUserId) {
  try {
    const rolesResult = await getUserSystemRoles(authUserId);
    
    if (!rolesResult.success || !rolesResult.data || rolesResult.data.length === 0) {
      // No roles assigned - default to simulator dashboard
      return '/simulator/dashboard';
    }

    // Check for PMO Admin role first (highest priority for simulator)
    const hasPMO = rolesResult.data.some(
      assignment => assignment.roles && assignment.roles.role_name === 'pmo_admin'
    );
    
    // Check for PM role
    const hasPM = rolesResult.data.some(
      assignment => assignment.roles && assignment.roles.role_name === 'project_manager'
    );

    // Route mapping for simulator
    if (hasPMO) {
      return '/simulator/pmo/dashboard';
    }
    
    if (hasPM) {
      return '/simulator/pm/dashboard';
    }

    // Default to general simulator dashboard
    return '/simulator/dashboard';
  } catch (error) {
    console.error('Error in getSimulatorDashboardRouteByRole:', error);
    return '/simulator/dashboard';
  }
}

/**
 * Get the simulator route user should be sent to after simulator login
 * @param {string} authUserId - Supabase auth user ID
 * @returns {Promise<{route: string, reason: string}>}
 */
export async function getSimulatorPostLoginRoute(authUserId) {
  try {
    // Step 1: Get internal user ID
    const userId = await getUserId(authUserId);
    if (!userId) {
      console.warn('User ID not found, redirecting to simulator dashboard');
      return {
        route: '/simulator/dashboard',
        reason: 'user_not_found'
      };
    }

    // Step 2: Check organisation status (still needed for simulator)
    const orgStatus = await checkOrganisationStatus(userId);
    
    if (!orgStatus.exists) {
      // No organisation - redirect to organisation setup
      return {
        route: '/onboarding/organisation-setup',
        reason: 'no_organisation'
      };
    }

    // Step 3: Organisation verified - check role and route to appropriate simulator dashboard
    const dashboardRoute = await getSimulatorDashboardRouteByRole(authUserId);
    
    return {
      route: dashboardRoute,
      reason: 'organisation_verified_role_based_simulator'
    };
  } catch (error) {
    console.error('Error in getSimulatorPostLoginRoute:', error);
    // Default to simulator dashboard on error
    return {
      route: '/simulator/dashboard',
      reason: 'error_fallback_simulator'
    };
  }
}

export default {
  getPostLoginRoute,
  getSimulatorPostLoginRoute,
  getSimulatorDashboardRouteByRole,
  checkOrganisationStatusByAuthId,
  checkSubscriptionStatus
};

