/**
 * PM Capacity Service
 *
 * Handles Project Manager capacity tracking and management
 * Enforces 2-project limit per PM
 */

import { platformDb } from './supabase/supabaseClient';
import { logAction } from './pmoAuditService';

/**
 * Get PM capacity status for all PMs in account
 * @param {string} accountId - Account ID
 * @returns {Promise<Object>} PM capacity data
 */
export async function getPMCapacityStatus(accountId) {
  try {
    // Get all PMs from pm_capacity_view
    const { data, error } = await platformDb
      .from('pm_capacity_view')
      .select('*')
      .eq('pm_is_active', true)
      .eq('pm_is_deleted', false)
      .order('capacity_status', { ascending: false }); // BREACH first

    if (error) throw error;

    // Filter PMs who have projects in this account
    // Since the view doesn't have account_id, we need to cross-check
    const { data: accountProjects } = await platformDb
      .from('projects')
      .select('id')
      .eq('account_id', accountId)
      .eq('is_deleted', false);

    const accountProjectIds = new Set(accountProjects?.map(p => p.id) || []);

    // Filter PMs who have at least one project in this account
    const filteredData = data?.filter(pm => {
      if (!pm.active_project_ids) return false;
      return pm.active_project_ids.some(id => accountProjectIds.has(id));
    }) || [];

    return { success: true, data: filteredData };
  } catch (error) {
    console.error('Error getting PM capacity status:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get PM capacity by user ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} PM capacity data
 */
export async function getPMCapacityByUserId(userId) {
  try {
    const { data, error } = await platformDb
      .from('pm_capacity_view')
      .select('*')
      .eq('pm_user_id', userId)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error getting PM capacity:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get PMs in breach (more than 2 active projects)
 * @param {string} accountId - Account ID
 * @returns {Promise<Object>} PMs in breach
 */
export async function getPMsInBreach(accountId) {
  try {
    const result = await getPMCapacityStatus(accountId);

    if (!result.success) {
      return result;
    }

    const breachedPMs = result.data.filter(pm => pm.capacity_status === 'BREACH');

    return { success: true, data: breachedPMs };
  } catch (error) {
    console.error('Error getting PMs in breach:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Reassign PM from one project to another
 * @param {string} projectId - Project ID to reassign PM from
 * @param {string} oldPMId - Current PM user ID
 * @param {string} newPMId - New PM user ID
 * @param {string} actorUserId - User performing the reassignment
 * @param {string} reason - Reason for reassignment
 * @returns {Promise<Object>} Reassignment result
 */
export async function reassignPM(projectId, oldPMId, newPMId, actorUserId, reason = null) {
  try {
    // Check if new PM has capacity
    const capacityCheck = await checkCapacityBeforeAssignment(newPMId, projectId);

    if (!capacityCheck.success) {
      return capacityCheck;
    }

    if (!capacityCheck.hasCapacity) {
      return {
        success: false,
        error: `Cannot assign PM: ${capacityCheck.message}`
      };
    }

    // Get project name for audit log
    const { data: project } = await platformDb
      .from('projects')
      .select('project_name')
      .eq('id', projectId)
      .single();

    // Get PM names for audit log
    const [oldPMData, newPMData] = await Promise.all([
      platformDb.from('users').select('full_name').eq('id', oldPMId).single(),
      platformDb.from('users').select('full_name').eq('id', newPMId).single()
    ]);

    // Deactivate old PM assignment
    const { error: deactivateError } = await platformDb
      .from('project_assignments')
      .update({
        is_active: false,
        updated_by: actorUserId,
        updated_at: new Date().toISOString()
      })
      .eq('project_id', projectId)
      .eq('user_id', oldPMId)
      .eq('assignment_type', 'PROJECT_MANAGER')
      .eq('is_deleted', false);

    if (deactivateError) throw deactivateError;

    // Create new PM assignment
    const { data: newAssignment, error: assignError } = await platformDb
      .from('project_assignments')
      .insert([{
        project_id: projectId,
        user_id: newPMId,
        assignment_type: 'PROJECT_MANAGER',
        is_active: true,
        assigned_by: actorUserId,
        created_by: actorUserId
      }])
      .select()
      .single();

    if (assignError) {
      // Rollback: reactivate old assignment
      await platformDb
        .from('project_assignments')
        .update({
          is_active: true,
          updated_by: actorUserId
        })
        .eq('project_id', projectId)
        .eq('user_id', oldPMId)
        .eq('assignment_type', 'PROJECT_MANAGER');

      throw assignError;
    }

    // Log action
    await logAction(actorUserId, 'REASSIGN_PM', 'PROJECT', projectId,
      `Reassigned PM on project "${project?.project_name}" from ${oldPMData.data?.full_name} to ${newPMData.data?.full_name}`, {
      project_id: projectId,
      project_name: project?.project_name,
      old_pm_id: oldPMId,
      old_pm_name: oldPMData.data?.full_name,
      new_pm_id: newPMId,
      new_pm_name: newPMData.data?.full_name,
      reason: reason
    });

    return {
      success: true,
      data: newAssignment,
      message: `Successfully reassigned PM from ${oldPMData.data?.full_name} to ${newPMData.data?.full_name}`
    };
  } catch (error) {
    console.error('Error reassigning PM:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if PM has capacity before assignment
 * @param {string} userId - PM user ID
 * @param {string} projectId - Project ID (for excluding in count)
 * @returns {Promise<Object>} Capacity check result
 */
export async function checkCapacityBeforeAssignment(userId, projectId = null) {
  try {
    // Get current capacity
    const capacityResult = await getPMCapacityByUserId(userId);

    if (!capacityResult.success) {
      return { success: false, error: capacityResult.error };
    }

    const capacity = capacityResult.data;

    // Get user name
    const { data: user } = await platformDb
      .from('users')
      .select('full_name')
      .eq('id', userId)
      .single();

    const userName = user?.full_name || 'PM';

    // Check capacity
    const activeCount = capacity.active_projects_count || 0;

    if (activeCount >= 2) {
      return {
        success: true,
        hasCapacity: false,
        currentCount: activeCount,
        message: `${userName} already has ${activeCount} active projects (maximum is 2)`,
        projects: capacity.active_project_names || []
      };
    }

    return {
      success: true,
      hasCapacity: true,
      currentCount: activeCount,
      message: `${userName} has capacity (currently ${activeCount}/2 active projects)`,
      projects: capacity.active_project_names || []
    };
  } catch (error) {
    console.error('Error checking PM capacity:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get available PMs (with capacity)
 * @param {string} accountId - Account ID
 * @returns {Promise<Object>} Available PMs
 */
export async function getAvailablePMs(accountId) {
  try {
    const result = await getPMCapacityStatus(accountId);

    if (!result.success) {
      return result;
    }

    // Filter PMs with capacity (not at capacity or in breach)
    const availablePMs = result.data.filter(pm =>
      pm.capacity_status === 'FREE' || pm.capacity_status === 'AVAILABLE'
    );

    return { success: true, data: availablePMs };
  } catch (error) {
    console.error('Error getting available PMs:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get PM workload details
 * @param {string} userId - PM user ID
 * @returns {Promise<Object>} Detailed workload information
 */
export async function getPMWorkloadDetails(userId) {
  try {
    // Get capacity view data
    const capacityResult = await getPMCapacityByUserId(userId);

    if (!capacityResult.success) {
      return capacityResult;
    }

    const capacity = capacityResult.data;

    // Get detailed project information
    let projectDetails = [];
    if (capacity.active_project_ids && capacity.active_project_ids.length > 0) {
      const { data: projects, error: projError } = await platformDb
        .from('projects')
        .select(`
          id,
          project_name,
          project_code,
          health_status,
          percentage_complete,
          planned_start_date,
          planned_end_date,
          status:status_id(status_name, status_color)
        `)
        .in('id', capacity.active_project_ids)
        .eq('is_deleted', false);

      if (projError) throw projError;

      projectDetails = projects || [];
    }

    return {
      success: true,
      data: {
        pm_id: capacity.pm_user_id,
        pm_name: capacity.pm_name,
        pm_email: capacity.pm_email,
        capacity_status: capacity.capacity_status,
        active_projects_count: capacity.active_projects_count,
        active_risks_count: capacity.active_risks_count,
        high_risk_count: capacity.high_risk_count,
        projects: projectDetails
      }
    };
  } catch (error) {
    console.error('Error getting PM workload details:', error);
    return { success: false, error: error.message };
  }
}

export default {
  getPMCapacityStatus,
  getPMCapacityByUserId,
  getPMsInBreach,
  reassignPM,
  checkCapacityBeforeAssignment,
  getAvailablePMs,
  getPMWorkloadDetails
};
