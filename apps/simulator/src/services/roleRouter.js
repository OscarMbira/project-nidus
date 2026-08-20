/**
 * Role Router Service
 * 
 * Determines dashboard route based on user's highest role
 */

import { platformDb } from './supabase/supabaseClient';
import { getUserSystemRoles } from './roleService';
import { PMO_LAYOUT_ROLES, PM_LAYOUT_ROLES } from '@nidus/shared/utils/menuLayoutUtils';

/**
 * Get user's highest role level
 * @param {string} authUserId - Auth user ID
 * @returns {Promise<{roleName: string, roleLevel: number}|null>}
 */
async function getHighestRole(authUserId) {
  try {
    const rolesResult = await getUserSystemRoles(authUserId);
    
    if (!rolesResult.success || !rolesResult.data || rolesResult.data.length === 0) {
      return null;
    }

    // Find the role with the highest level
    let highestRole = null;
    let highestLevel = -1;

    rolesResult.data.forEach(assignment => {
      if (assignment.roles && assignment.roles.role_level > highestLevel) {
        highestLevel = assignment.roles.role_level;
        highestRole = assignment.roles;
      }
    });

    return highestRole;
  } catch (error) {
    console.error('Error getting highest role:', error);
    return null;
  }
}

function normalizeRoleName(roleName) {
  return String(roleName || '').trim().toLowerCase().replace(/\s+/g, '_');
}

/**
 * Get dashboard route based on user's role
 * @param {string} authUserId - Auth user ID
 * @returns {Promise<string>} Dashboard route path
 */
export async function getDashboardRouteByRole(authUserId) {
  try {
    const highestRole = await getHighestRole(authUserId);
    
    if (!highestRole) {
      // No roles in user_roles — prefer project-scoped PM home over org Executive Dashboard
      return '/pm/dashboard';
    }

    const roleName = normalizeRoleName(highestRole.role_name);

    // Org / PMO admins → Executive (Platform) Dashboard
    if (PMO_LAYOUT_ROLES.has(roleName)) {
      return '/platform/dashboard';
    }

    // Executives get the dedicated read-only strategic view
    if (roleName === 'executive') {
      return '/platform/executive/dashboard';
    }

    // Project Manager and other PM-layout roles → PM Dashboard
    if (PM_LAYOUT_ROLES.has(roleName) || roleName === 'pm_project_manager' || roleName === 'team_member' || roleName === 'team_lead') {
      return '/pm/dashboard';
    }

    return '/pm/dashboard';
  } catch (error) {
    console.error('Error in getDashboardRouteByRole:', error);
    return '/pm/dashboard';
  }
}

/**
 * Check if user is Project Sponsor/Executive
 * @param {string} authUserId - Auth user ID
 * @returns {Promise<boolean>}
 */
export async function isProjectSponsorOrExecutive(authUserId) {
  try {
    const highestRole = await getHighestRole(authUserId);
    if (!highestRole) return false;
    
    const roleName = normalizeRoleName(highestRole.role_name);
    return roleName === 'project_sponsor' || roleName === 'executive';
  } catch (error) {
    console.error('Error checking Project Sponsor role:', error);
    return false;
  }
}

export default {
  getDashboardRouteByRole,
  isProjectSponsorOrExecutive
};
