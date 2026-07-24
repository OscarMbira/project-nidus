/**
 * Project Type Service
 * CRUD operations for project_types lookup table
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * Get all project types
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} Array of project types
 */
export async function getProjectTypes(filters = {}) {
  try {
    let query = platformDb
      .from('project_types')
      .select('*')
      .eq('is_deleted', false);

    if (filters.active !== undefined) {
      query = query.eq('is_active', filters.active);
    } else {
      query = query.eq('is_active', true);
    }

    if (filters.category) {
      query = query.eq('type_category', filters.category);
    }

    if (filters.search) {
      query = query.or(`type_name.ilike.%${filters.search}%,type_code.ilike.%${filters.search}%,type_description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query.order('type_name', { ascending: true });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching project types:', error);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * Get a single project type by ID
 * @param {string} typeId - Project type ID
 * @returns {Promise<Object>} Project type data
 */
export async function getProjectType(typeId) {
  try {
    const { data, error } = await platformDb
      .from('project_types')
      .select('*')
      .eq('id', typeId)
      .eq('is_deleted', false)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching project type:', error);
    return { success: false, error: error.message, data: null };
  }
}

/**
 * Create a new project type
 * @param {Object} typeData - Project type data
 * @returns {Promise<Object>} Created project type
 */
export async function createProjectType(typeData) {
  try {
    const { data: { user }, error: authError } = await platformDb.auth.getUser();
    if (authError || !user) throw new Error('User not authenticated');

    // Get internal user ID
    const { data: userRecord, error: userError } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (userError || !userRecord) {
      console.error('Error fetching user record:', userError);
      throw new Error(userError?.message || 'User record not found');
    }

    const insertData = {
      type_code: typeData.type_code,
      type_name: typeData.type_name,
      type_description: typeData.type_description || null,
      type_color: typeData.type_color || null,
      type_icon: typeData.type_icon || null,
      type_category: typeData.type_category || null,
      is_system_type: false,
      is_active: typeData.is_active !== undefined ? typeData.is_active : true,
      created_by: userRecord.id,
      updated_by: userRecord.id
    };

    const { data, error } = await platformDb
      .from('project_types')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error creating project type:', error);
    return { success: false, error: error.message, data: null };
  }
}

/**
 * Update a project type
 * @param {string} typeId - Project type ID
 * @param {Object} typeData - Updated project type data
 * @returns {Promise<Object>} Updated project type
 */
export async function updateProjectType(typeId, typeData) {
  try {
    const { data: { user }, error: authError } = await platformDb.auth.getUser();
    if (authError || !user) throw new Error('User not authenticated');

    // Get internal user ID
    const { data: userRecord, error: userError } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (userError || !userRecord) {
      console.error('Error fetching user record:', userError);
      throw new Error(userError?.message || 'User record not found');
    }

    const updateData = {
      type_code: typeData.type_code,
      type_name: typeData.type_name,
      type_description: typeData.type_description || null,
      type_color: typeData.type_color || null,
      type_icon: typeData.type_icon || null,
      type_category: typeData.type_category || null,
      is_active: typeData.is_active !== undefined ? typeData.is_active : true,
      updated_by: userRecord.id
    };

    const { data, error } = await platformDb
      .from('project_types')
      .update(updateData)
      .eq('id', typeId)
      .eq('is_deleted', false)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error updating project type:', error);
    return { success: false, error: error.message, data: null };
  }
}

/**
 * Delete a project type (soft delete)
 * @param {string} typeId - Project type ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteProjectType(typeId) {
  try {
    const { data: { user }, error: authError } = await platformDb.auth.getUser();
    if (authError || !user) throw new Error('User not authenticated');

    // Get internal user ID
    const { data: userRecord, error: userError } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (userError || !userRecord) {
      console.error('Error fetching user record:', userError);
      throw new Error(userError?.message || 'User record not found');
    }

    const { data, error } = await platformDb
      .from('project_types')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userRecord.id,
        is_active: false
      })
      .eq('id', typeId)
      .eq('is_deleted', false)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error deleting project type:', error);
    return { success: false, error: error.message, data: null };
  }
}

export default {
  getProjectTypes,
  getProjectType,
  createProjectType,
  updateProjectType,
  deleteProjectType
};
