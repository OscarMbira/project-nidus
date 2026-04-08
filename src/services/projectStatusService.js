/**
 * Project Status Service
 * CRUD operations for project_statuses lookup table
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * Get all project statuses
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} Array of project statuses
 */
export async function getProjectStatuses(filters = {}) {
  try {
    let query = platformDb
      .from('project_statuses')
      .select('*')
      .eq('is_deleted', false);

    if (filters.active !== undefined) {
      query = query.eq('is_active', filters.active);
    } else {
      query = query.eq('is_active', true);
    }

    if (filters.initial_status !== undefined) {
      query = query.eq('is_initial_status', filters.initial_status);
    }

    if (filters.final_status !== undefined) {
      query = query.eq('is_final_status', filters.final_status);
    }

    if (filters.search) {
      query = query.or(`status_name.ilike.%${filters.search}%,status_code.ilike.%${filters.search}%,status_description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query.order('status_order', { ascending: true, nullsLast: true }).order('status_name', { ascending: true });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching project statuses:', error);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * Get a single project status by ID
 * @param {string} statusId - Project status ID
 * @returns {Promise<Object>} Project status data
 */
export async function getProjectStatus(statusId) {
  try {
    const { data, error } = await platformDb
      .from('project_statuses')
      .select('*')
      .eq('id', statusId)
      .eq('is_deleted', false)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching project status:', error);
    return { success: false, error: error.message, data: null };
  }
}

/**
 * Create a new project status
 * @param {Object} statusData - Project status data
 * @returns {Promise<Object>} Created project status
 */
export async function createProjectStatus(statusData) {
  try {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get internal user ID
    const { data: userRecord } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!userRecord) throw new Error('User record not found');

    // If this is set as initial status, unset others
    if (statusData.is_initial_status) {
      await platformDb
        .from('project_statuses')
        .update({ is_initial_status: false })
        .eq('is_deleted', false);
    }

    const insertData = {
      status_code: statusData.status_code,
      status_name: statusData.status_name,
      status_description: statusData.status_description || null,
      status_color: statusData.status_color || null,
      status_icon: statusData.status_icon || null,
      status_order: statusData.status_order || null,
      is_initial_status: statusData.is_initial_status || false,
      is_final_status: statusData.is_final_status || false,
      is_active_status: statusData.is_active_status !== undefined ? statusData.is_active_status : true,
      is_system_status: false,
      is_active: statusData.is_active !== undefined ? statusData.is_active : true,
      created_by: userRecord.id,
      updated_by: userRecord.id
    };

    const { data, error } = await platformDb
      .from('project_statuses')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error creating project status:', error);
    return { success: false, error: error.message, data: null };
  }
}

/**
 * Update a project status
 * @param {string} statusId - Project status ID
 * @param {Object} statusData - Updated project status data
 * @returns {Promise<Object>} Updated project status
 */
export async function updateProjectStatus(statusId, statusData) {
  try {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get internal user ID
    const { data: userRecord } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!userRecord) throw new Error('User record not found');

    // If this is set as initial status, unset others
    if (statusData.is_initial_status) {
      await platformDb
        .from('project_statuses')
        .update({ is_initial_status: false })
        .neq('id', statusId)
        .eq('is_deleted', false);
    }

    const updateData = {
      status_code: statusData.status_code,
      status_name: statusData.status_name,
      status_description: statusData.status_description || null,
      status_color: statusData.status_color || null,
      status_icon: statusData.status_icon || null,
      status_order: statusData.status_order || null,
      is_initial_status: statusData.is_initial_status || false,
      is_final_status: statusData.is_final_status || false,
      is_active_status: statusData.is_active_status !== undefined ? statusData.is_active_status : true,
      is_active: statusData.is_active !== undefined ? statusData.is_active : true,
      updated_by: userRecord.id
    };

    const { data, error } = await platformDb
      .from('project_statuses')
      .update(updateData)
      .eq('id', statusId)
      .eq('is_deleted', false)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error updating project status:', error);
    return { success: false, error: error.message, data: null };
  }
}

/**
 * Delete a project status (soft delete)
 * @param {string} statusId - Project status ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteProjectStatus(statusId) {
  try {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get internal user ID
    const { data: userRecord } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!userRecord) throw new Error('User record not found');

    const { data, error } = await platformDb
      .from('project_statuses')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userRecord.id,
        is_active: false
      })
      .eq('id', statusId)
      .eq('is_deleted', false)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error deleting project status:', error);
    return { success: false, error: error.message, data: null };
  }
}

export default {
  getProjectStatuses,
  getProjectStatus,
  createProjectStatus,
  updateProjectStatus,
  deleteProjectStatus
};
