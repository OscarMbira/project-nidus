/**
 * Timesheet Overtime Type Service (v1174)
 * CRUD operations for timesheet_overtime_types lookup table — classifies why overtime
 * happened (After Hours, Public Holiday, etc.) on the Overtime grid. Mirrors
 * timesheetWorkCategoryService.js's shape. The 'weekend' row is system-managed
 * (is_system=true) — getOvertimeTypes() exposes it so the grid can read its label, but the UI
 * never offers it as a pickable option on a working day.
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * @param {Object} [filters]
 * @returns {Promise<Object>} { success, data }
 */
export async function getOvertimeTypes(filters = {}) {
  try {
    let query = platformDb
      .from('timesheet_overtime_types')
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
    console.error('Error fetching overtime types:', error);
    return { success: false, error: error.message, data: [] };
  }
}

export async function createOvertimeType(typeData) {
  try {
    const insertData = {
      code: typeData.code,
      name: typeData.name,
      description: typeData.description || null,
      is_system: false, // only 'weekend' is system-managed, never created via this form
      sort_order: typeData.sort_order || 0,
      is_active: typeData.is_active !== undefined ? typeData.is_active : true,
    };

    const { data, error } = await platformDb
      .from('timesheet_overtime_types')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error creating overtime type:', error);
    return { success: false, error: error.message, data: null };
  }
}

export async function updateOvertimeType(typeId, typeData) {
  try {
    const updateData = {
      code: typeData.code,
      name: typeData.name,
      description: typeData.description || null,
      sort_order: typeData.sort_order || 0,
      is_active: typeData.is_active !== undefined ? typeData.is_active : true,
    };

    const { data, error } = await platformDb
      .from('timesheet_overtime_types')
      .update(updateData)
      .eq('id', typeId)
      .eq('is_system', false) // the Weekend system type can't be edited via this form
      .eq('is_deleted', false)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error updating overtime type:', error);
    return { success: false, error: error.message, data: null };
  }
}

export async function deleteOvertimeType(typeId) {
  try {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: userRecord } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    const { data, error } = await platformDb
      .from('timesheet_overtime_types')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userRecord?.id || null,
        is_active: false,
      })
      .eq('id', typeId)
      .eq('is_system', false) // the Weekend system type can't be deleted via this form
      .eq('is_deleted', false)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error deleting overtime type:', error);
    return { success: false, error: error.message, data: null };
  }
}

export default {
  getOvertimeTypes,
  createOvertimeType,
  updateOvertimeType,
  deleteOvertimeType,
};
