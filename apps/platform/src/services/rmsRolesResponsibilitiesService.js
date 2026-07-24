/**
 * RMS Roles & Responsibilities Service
 * API functions for managing risk roles
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * Add risk role
 * @param {string} rmsId - RMS ID
 * @param {Object} roleData - Role data
 * @returns {Promise<Object>} Created role
 */
export async function addRole(rmsId, roleData) {
  try {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: userData, error: userError } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (userError || !userData) {
      return { success: false, error: 'User not found' };
    }

    // Get next display order
    const { data: existing } = await platformDb
      .from('rms_roles_responsibilities')
      .select('display_order')
      .eq('rms_id', rmsId)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0
      ? existing[0].display_order + 1
      : 0;

    const insertData = {
      ...roleData,
      rms_id: rmsId,
      display_order: roleData.display_order ?? nextOrder,
      created_by: userData.id
    };

    const { data, error } = await platformDb
      .from('rms_roles_responsibilities')
      .insert(insertData)
      .select('*')
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error adding role:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update risk role
 * @param {string} roleId - Role ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated role
 */
export async function updateRole(roleId, updates) {
  try {
    const { data, error } = await platformDb
      .from('rms_roles_responsibilities')
      .update(updates)
      .eq('id', roleId)
      .select('*')
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating role:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete risk role
 * @param {string} roleId - Role ID
 * @returns {Promise<Object>} Success result
 */
export async function deleteRole(roleId) {
  try {
    const { error } = await platformDb
      .from('rms_roles_responsibilities')
      .delete()
      .eq('id', roleId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting role:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get roles for RMS
 * @param {string} rmsId - RMS ID
 * @returns {Promise<Object>} Roles list
 */
export async function getRoles(rmsId) {
  try {
    const { data, error } = await platformDb
      .from('rms_roles_responsibilities')
      .select(`
        *,
        assigned_to_user:assigned_to_id(id, full_name, email)
      `)
      .eq('rms_id', rmsId)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching roles:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Assign user to role
 * @param {string} roleId - Role ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Updated role
 */
export async function assignRole(roleId, userId) {
  try {
    // Get user name
    const { data: userData } = await platformDb
      .from('users')
      .select('id, full_name')
      .eq('id', userId)
      .eq('is_deleted', false)
      .single();

    const { data, error } = await platformDb
      .from('rms_roles_responsibilities')
      .update({
        assigned_to_id: userId,
        assigned_to_name: userData?.full_name || null
      })
      .eq('id', roleId)
      .select(`
        *,
        assigned_to_user:assigned_to_id(id, full_name, email)
      `)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error assigning role:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get independent roles for RMS
 * @param {string} rmsId - RMS ID
 * @returns {Promise<Object>} Independent roles list
 */
export async function getIndependentRoles(rmsId) {
  try {
    const { data, error } = await platformDb
      .from('rms_roles_responsibilities')
      .select(`
        *,
        assigned_to_user:assigned_to_id(id, full_name, email)
      `)
      .eq('rms_id', rmsId)
      .in('independence_level', ['project_independent', 'corporate', 'external'])
      .order('display_order', { ascending: true });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching independent roles:', error);
    return { success: false, error: error.message };
  }
}
