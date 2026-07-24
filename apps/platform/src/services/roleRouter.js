/**
 * Role Router Service
 * 
 * Determines dashboard route based on user's highest role
 */

import { platformDb } from './supabase/supabaseClient';
import { getUserSystemRoles } from './roleService';

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

/**
 * Get dashboard route based on user's role
 * @param {string} authUserId - Auth user ID
 * @returns {Promise<string>} Dashboard route path
 */
export async function getDashboardRouteByRole(authUserId) {
  try {
    const highestRole = await getHighestRole(authUserId);
    
    if (!highestRole) {
      // No roles assigned - default dashboard
      return '/platform/dashboard';
    }

    // Route mapping based on role
    const routeMap = {
      'pmo_admin': '/platform/dashboard', // PMO Admin uses unified platform dashboard
      'project_sponsor': '/platform/dashboard', // Project Sponsor dashboard (same for now)
      'executive': '/platform/dashboard',
      'account_owner': '/platform/dashboard',
      'project_manager': '/pm/dashboard', // PM Dashboard
      'programme_manager': '/platform/dashboard',
      'project_board_member': '/platform/dashboard',
      'project_assurance': '/platform/dashboard',
      'quality_assurance': '/platform/dashboard',
      'team_lead': '/platform/dashboard',
      'team_member': '/platform/dashboard',
      'stakeholder': '/platform/dashboard',
      'viewer': '/platform/dashboard'
    };

    return routeMap[highestRole.role_name] || '/platform/dashboard';
  } catch (error) {
    console.error('Error in getDashboardRouteByRole:', error);
    return '/platform/dashboard';
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
    
    return highestRole.role_name === 'project_sponsor' || 
           highestRole.role_name === 'executive';
  } catch (error) {
    console.error('Error checking Project Sponsor role:', error);
    return false;
  }
}

export default {
  getDashboardRouteByRole,
  isProjectSponsorOrExecutive
};

