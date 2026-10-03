/**
 * Assignment Role Service
 * CRUD operations for assignment_roles lookup table (v1164)
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * Get all assignment roles
 * @param {Object} filters - Optional filters
 * @returns {Promise<Object>} { success, data }
 */
export async function getAssignmentRoles(filters = {}) {
  try {
    let query = platformDb
      .from('assignment_roles')
      .select('*')
      .eq('is_deleted', false);

    if (filters.active !== undefined) {
      query = query.eq('is_active', filters.active);
    } else {
      query = query.eq('is_active', true);
    }

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query
      .order('sort_order', { ascending: true, nullsLast: true })
      .order('name', { ascending: true });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching assignment roles:', error);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * Create a new assignment role
 * @param {Object} roleData - Assignment role data
 * @returns {Promise<Object>} { success, data }
 */
export async function createAssignmentRole(roleData) {
  try {
    const insertData = {
      code: roleData.code,
      name: roleData.name,
      description: roleData.description || null,
      sort_order: roleData.sort_order || 0,
      is_active: roleData.is_active !== undefined ? roleData.is_active : true,
    };

    const { data, error } = await platformDb
      .from('assignment_roles')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error creating assignment role:', error);
    return { success: false, error: error.message, data: null };
  }
}

/**
 * Update an assignment role
 * @param {string} roleId - Assignment role ID
 * @param {Object} roleData - Updated assignment role data
 * @returns {Promise<Object>} { success, data }
 */
export async function updateAssignmentRole(roleId, roleData) {
  try {
    const updateData = {
      code: roleData.code,
      name: roleData.name,
      description: roleData.description || null,
      sort_order: roleData.sort_order || 0,
      is_active: roleData.is_active !== undefined ? roleData.is_active : true,
    };

    const { data, error } = await platformDb
      .from('assignment_roles')
      .update(updateData)
      .eq('id', roleId)
      .eq('is_deleted', false)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error updating assignment role:', error);
    return { success: false, error: error.message, data: null };
  }
}

/**
 * Delete an assignment role (soft delete)
 * @param {string} roleId - Assignment role ID
 * @returns {Promise<Object>} { success, data }
 */
export async function deleteAssignmentRole(roleId) {
  try {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: userRecord } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    const { data, error } = await platformDb
      .from('assignment_roles')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userRecord?.id || null,
        is_active: false,
      })
      .eq('id', roleId)
      .eq('is_deleted', false)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error deleting assignment role:', error);
    return { success: false, error: error.message, data: null };
  }
}

export default {
  getAssignmentRoles,
  createAssignmentRole,
  updateAssignmentRole,
  deleteAssignmentRole,
};
