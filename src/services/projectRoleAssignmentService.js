/**
 * Project Role Assignment Service
 * 
 * Handles role assignment during project creation and project member management
 * PMO Admin can assign roles during project creation
 * Project Managers can invite team members
 */

import { platformDb } from './supabase/supabaseClient';
import { isPmoAdmin } from './organisationRoleService';
import { assignSystemRole } from './roleService';

/**
 * Check if user is Project Manager for a specific project
 * @param {string} authUserId - Auth user ID
 * @param {string} projectId - Project ID
 * @returns {Promise<boolean>}
 */
export async function isProjectManager(authUserId, projectId) {
  try {
    // Get internal user ID
    const { data: user } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', authUserId)
      .single();

    if (!user) return false;

    // Check if user is project manager for this project
    const { data: project } = await platformDb
      .from('projects')
      .select('project_manager_user_id')
      .eq('id', projectId)
      .single();

    if (!project) return false;

    // Check if user is the project manager
    if (project.project_manager_user_id === user.id) {
      return true;
    }

    // Also check user_roles for project_manager role on this project
    const { data: roleAssignment } = await platformDb
      .from('user_roles')
      .select('id')
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .single();

    if (roleAssignment) {
      // Check if role is project_manager
      const { data: role } = await platformDb
        .from('user_roles')
        .select('roles:role_id(role_name)')
        .eq('id', roleAssignment.id)
        .single();

      if (role?.roles?.role_name === 'project_manager' || 
          role?.roles?.role_name === 'programme_manager') {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking project manager status:', error);
    return false;
  }
}

/**
 * Assign roles to users during project creation
 * Only PMO Admin can do this
 * @param {string} projectId - Project ID
 * @param {Array} roleAssignments - Array of {userId, roleName} objects
 * @param {string} assignerAuthUserId - Auth user ID of the assigner
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function assignProjectRolesDuringCreation(
  projectId,
  roleAssignments,
  assignerAuthUserId,
  skipAdminCheck = false
) {
  try {
    // Skip isPmoAdmin re-check when caller has already verified admin status
    if (!skipAdminCheck) {
      const isAdmin = await isPmoAdmin(assignerAuthUserId);
      if (!isAdmin) {
        return {
          success: false,
          error: 'Only PMO Admin can assign roles during project creation'
        };
      }
    }

    // Get assigner's internal user ID
    const { data: assigner } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', assignerAuthUserId)
      .single();

    if (!assigner) {
      return { success: false, error: 'Assigner not found' };
    }

    if (!roleAssignments || roleAssignments.length === 0) {
      return { success: true, results: [], errors: null };
    }

    // Batch-fetch all role IDs in a single query instead of one query per assignment
    const uniqueRoleNames = [...new Set(roleAssignments.map(a => a.roleName))];
    const { data: rolesData } = await platformDb
      .from('roles')
      .select('id, role_name')
      .in('role_name', uniqueRoleNames)
      .eq('is_active', true);

    const roleMap = new Map((rolesData || []).map(r => [r.role_name, r.id]));

    const results = [];
    const errors = [];
    const insertRows = [];
    let pmUserId = null; // Track for project_manager_user_id update

    for (const assignment of roleAssignments) {
      const roleId = roleMap.get(assignment.roleName);
      if (!roleId) {
        errors.push(`Role '${assignment.roleName}' not found`);
        continue;
      }

      // Resolve internal userId (only if authUserId provided; otherwise userId is already internal)
      let userId = assignment.userId;
      if (assignment.authUserId) {
        const { data: user } = await platformDb
          .from('users')
          .select('id')
          .eq('auth_user_id', assignment.authUserId)
          .single();

        if (!user) {
          errors.push(`User with auth ID ${assignment.authUserId} not found`);
          continue;
        }
        userId = user.id;
      }

      insertRows.push({
        user_id: userId,
        role_id: roleId,
        project_id: projectId,
        assigned_by: assigner.id,
        is_active: true
      });

      results.push({ userId, roleName: assignment.roleName, status: 'assigned' });

      if (assignment.roleName === 'project_manager' || assignment.roleName === 'pm_project_manager') {
        pmUserId = userId;
      }
    }

    // Batch insert all role assignments in one query
    if (insertRows.length > 0) {
      const { error: insertError } = await platformDb
        .from('user_roles')
        .insert(insertRows);

      if (insertError) {
        // On unique violation, fall back silently (duplicate assignments)
        if (insertError.code !== '23505') {
          errors.push(`Failed to assign roles: ${insertError.message}`);
        }
      }
    }

    // Update project_manager_user_id if a PM was assigned
    if (pmUserId) {
      await platformDb
        .from('projects')
        .update({ project_manager_user_id: pmUserId })
        .eq('id', projectId);
    }

    return {
      success: errors.length === 0,
      results,
      errors: errors.length > 0 ? errors : null
    };
  } catch (error) {
    console.error('Error assigning project roles:', error);
    return {
      success: false,
      error: error.message || 'Failed to assign project roles'
    };
  }
}

/** System-level roles to exclude from project assignment dropdown */
const SYSTEM_ROLE_NAMES = ['system_admin', 'pmo_admin', 'org_admin', 'super_admin', 'viewer'];

/**
 * Get available project roles for assignment
 * Excludes system-level admin roles; includes all other active roles (v12 + v86 seeds).
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function getAvailableProjectRoles() {
  try {
    const { data, error } = await platformDb
      .from('roles')
      .select('id, role_name, role_display_name, role_description, role_level')
      .eq('is_active', true)
      .eq('is_deleted', false)
      .order('role_level', { ascending: false });

    if (error) throw error;

    const systemSet = new Set(SYSTEM_ROLE_NAMES);
    const filtered = (data || []).filter((r) => !systemSet.has(r.role_name));

    return {
      success: true,
      data: filtered,
      error: null
    };
  } catch (error) {
    console.error('Error fetching project roles:', error);
    return {
      success: false,
      data: [],
      error: error.message || 'Failed to fetch project roles'
    };
  }
}

/**
 * Get roles that Project Managers can assign (Team Manager, Team Member)
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function getProjectManagerAssignableRoles() {
  try {
    const { data, error } = await platformDb
      .from('roles')
      .select('id, role_name, role_display_name, role_description, role_level')
      .eq('is_active', true)
      .eq('is_deleted', false)
      .in('role_name', [
        'team_manager',
        'pm_team_manager',
        'team_member'
      ])
      .order('role_level', { ascending: false });

    if (error) throw error;

    return {
      success: true,
      data: data || [],
      error: null
    };
  } catch (error) {
    console.error('Error fetching PM assignable roles:', error);
    return {
      success: false,
      data: [],
      error: error.message || 'Failed to fetch assignable roles'
    };
  }
}

export default {
  isProjectManager,
  assignProjectRolesDuringCreation,
  getAvailableProjectRoles,
  getProjectManagerAssignableRoles
};

