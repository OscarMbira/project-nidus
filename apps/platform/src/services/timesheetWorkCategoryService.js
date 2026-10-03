/**
 * Timesheet Work Category Service (v1170)
 * CRUD operations for timesheet_work_categories lookup table — replaces the old hardcoded
 * CHECK constraint on timesheet_entries.work_category. Mirrors assignmentRoleService.js's shape.
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * @param {Object} [filters]
 * @returns {Promise<Object>} { success, data }
 */
export async function getWorkCategories(filters = {}) {
  try {
    let query = platformDb
      .from('timesheet_work_categories')
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
    console.error('Error fetching work categories:', error);
    return { success: false, error: error.message, data: [] };
  }
}

export async function createWorkCategory(categoryData) {
  try {
    const insertData = {
      code: categoryData.code,
      name: categoryData.name,
      description: categoryData.description || null,
      sort_order: categoryData.sort_order || 0,
      is_active: categoryData.is_active !== undefined ? categoryData.is_active : true,
    };

    const { data, error } = await platformDb
      .from('timesheet_work_categories')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error creating work category:', error);
    return { success: false, error: error.message, data: null };
  }
}

export async function updateWorkCategory(categoryId, categoryData) {
  try {
    const updateData = {
      code: categoryData.code,
      name: categoryData.name,
      description: categoryData.description || null,
      sort_order: categoryData.sort_order || 0,
      is_active: categoryData.is_active !== undefined ? categoryData.is_active : true,
    };

    const { data, error } = await platformDb
      .from('timesheet_work_categories')
      .update(updateData)
      .eq('id', categoryId)
      .eq('is_deleted', false)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error updating work category:', error);
    return { success: false, error: error.message, data: null };
  }
}

export async function deleteWorkCategory(categoryId) {
  try {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: userRecord } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    const { data, error } = await platformDb
      .from('timesheet_work_categories')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userRecord?.id || null,
        is_active: false,
      })
      .eq('id', categoryId)
      .eq('is_deleted', false)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error deleting work category:', error);
    return { success: false, error: error.message, data: null };
  }
}

export default {
  getWorkCategories,
  createWorkCategory,
  updateWorkCategory,
  deleteWorkCategory,
};
