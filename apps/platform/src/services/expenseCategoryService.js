/**
 * Expense Categories lookup service — CRUD against expense_categories (v1226).
 */

import { platformDb } from './supabase/supabaseClient';

async function getInternalUserId() {
  const { data: { user }, error: authError } = await platformDb.auth.getUser();
  if (authError || !user) throw new Error('User not authenticated');
  const { data: userRecord, error: userError } = await platformDb
    .from('users')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();
  if (userError || !userRecord) throw new Error(userError?.message || 'User record not found');
  return userRecord.id;
}

export async function getExpenseCategories(filters = {}) {
  try {
    let query = platformDb.from('expense_categories').select('*').eq('is_deleted', false);
    query = query.eq('is_active', filters.active !== undefined ? filters.active : true);
    const { data, error } = await query.order('category_name', { ascending: true });
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching expense categories:', error);
    return { success: false, error: error.message, data: [] };
  }
}

export async function createExpenseCategory(payload) {
  try {
    const userId = await getInternalUserId();
    const insertData = {
      category_code: payload.category_code,
      category_name: payload.category_name,
      category_description: payload.category_description || null,
      is_active: payload.is_active !== undefined ? payload.is_active : true,
      created_by: userId,
      updated_by: userId,
    };
    const { data, error } = await platformDb.from('expense_categories').insert(insertData).select().single();
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error creating expense category:', error);
    return { success: false, error: error.message, data: null };
  }
}

export async function updateExpenseCategory(categoryId, payload) {
  try {
    const userId = await getInternalUserId();
    const updateData = {
      category_code: payload.category_code,
      category_name: payload.category_name,
      category_description: payload.category_description || null,
      is_active: payload.is_active !== undefined ? payload.is_active : true,
      updated_by: userId,
    };
    const { data, error } = await platformDb
      .from('expense_categories')
      .update(updateData)
      .eq('id', categoryId)
      .eq('is_deleted', false)
      .select()
      .single();
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error updating expense category:', error);
    return { success: false, error: error.message, data: null };
  }
}

export async function deleteExpenseCategory(categoryId) {
  try {
    const userId = await getInternalUserId();
    const { data, error } = await platformDb
      .from('expense_categories')
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: userId, is_active: false })
      .eq('id', categoryId)
      .eq('is_deleted', false)
      .select()
      .single();
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error deleting expense category:', error);
    return { success: false, error: error.message, data: null };
  }
}

export default {
  getExpenseCategories,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
};
