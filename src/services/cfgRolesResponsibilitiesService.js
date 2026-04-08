/**
 * Configuration Roles and Responsibilities Service
 * API functions for managing configuration management roles
 */

import { platformDb, supabase } from './supabaseClient';

/**
 * Add role
 * @param {string} cfgMsId - Configuration MS ID
 * @param {Object} roleData - Role data
 * @returns {Promise<Object>} Created role
 */
export async function addRole(cfgMsId, roleData) {
  try {
    // Get next display order
    const { data: existing } = await platformDb
      .from('cfg_roles_responsibilities')
      .select('display_order')
      .eq('cfg_ms_id', cfgMsId)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0
      ? existing[0].display_order + 1
      : 0;

    const insertData = {
      ...roleData,
      cfg_ms_id: cfgMsId,
      display_order: roleData.display_order ?? nextOrder
    };

    const { data, error } = await platformDb
      .from('cfg_roles_responsibilities')
      .insert(insertData)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding role:', error);
    throw error;
  }
}

/**
 * Update role
 * @param {string} roleId - Role ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated role
 */
export async function updateRole(roleId, updates) {
  try {
    const { data, error } = await platformDb
      .from('cfg_roles_responsibilities')
      .update(updates)
      .eq('id', roleId)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating role:', error);
    throw error;
  }
}

/**
 * Delete role
 * @param {string} roleId - Role ID
 * @returns {Promise<boolean>} Success
 */
export async function deleteRole(roleId) {
  try {
    const { error } = await platformDb
      .from('cfg_roles_responsibilities')
      .delete()
      .eq('id', roleId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting role:', error);
    throw error;
  }
}

/**
 * Get roles for Configuration MS
 * @param {string} cfgMsId - Configuration MS ID
 * @returns {Promise<Array>} Roles
 */
export async function getRoles(cfgMsId) {
  try {
    const { data, error } = await platformDb
      .from('cfg_roles_responsibilities')
      .select(`
        *,
        assigned_user:assigned_to_id(id, full_name, email)
      `)
      .eq('cfg_ms_id', cfgMsId)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching roles:', error);
    throw error;
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
    // Get user details
    const { data: user } = await platformDb
      .from('users')
      .select('id, full_name')
      .eq('id', userId)
      .eq('is_deleted', false)
      .single();

    if (!user) throw new Error('User not found');

    const { data, error } = await platformDb
      .from('cfg_roles_responsibilities')
      .update({
        assigned_to_id: userId,
        assigned_to_name: user.full_name
      })
      .eq('id', roleId)
      .select(`
        *,
        assigned_user:assigned_to_id(id, full_name, email)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error assigning role:', error);
    throw error;
  }
}

/**
 * Unassign user from role
 * @param {string} roleId - Role ID
 * @returns {Promise<Object>} Updated role
 */
export async function unassignRole(roleId) {
  try {
    const { data, error } = await platformDb
      .from('cfg_roles_responsibilities')
      .update({
        assigned_to_id: null,
        assigned_to_name: null
      })
      .eq('id', roleId)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error unassigning role:', error);
    throw error;
  }
}
