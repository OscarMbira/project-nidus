/**
 * Budget Category Service – CRUD for budget_categories (PMO master data).
 * Uses same account resolution as fundingSourceService.
 */

import { platformDb } from './supabase/supabaseClient';

async function getCurrentUserAndAccountId() {
  const { data: { user }, error: authError } = await platformDb.auth.getUser();
  if (authError || !user) return { userId: null, accountId: null };
  const { data: userRow, error: userError } = await platformDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle();
  if (userError || !userRow?.id) return { userId: userRow?.id ?? null, accountId: null };
  const { data: accountRow, error: accountError } = await platformDb.from('accounts').select('id').eq('owner_user_id', userRow.id).maybeSingle();
  if (!accountError && accountRow?.id) return { userId: userRow.id, accountId: accountRow.id };
  const { data: projAsOwner } = await platformDb.from('projects').select('account_id').eq('owner_user_id', userRow.id).not('account_id', 'is', null).limit(1).maybeSingle();
  if (projAsOwner?.account_id) return { userId: userRow.id, accountId: projAsOwner.account_id };
  const { data: memberRows } = await platformDb.from('user_projects').select('project_id').eq('user_id', userRow.id).eq('is_deleted', false).limit(5);
  if (memberRows?.length) {
    const projectIds = memberRows.map((r) => r.project_id);
    const { data: proj } = await platformDb.from('projects').select('account_id').in('id', projectIds).not('account_id', 'is', null).limit(1).maybeSingle();
    if (proj?.account_id) return { userId: userRow.id, accountId: proj.account_id };
  }
  return { userId: userRow.id, accountId: null };
}

export async function getBudgetCategories(options = {}) {
  try {
    let query = platformDb.from('budget_categories').select('*').eq('is_deleted', false);
    if (options.activeOnly !== false) query = query.eq('is_active', true);
    const { data, error } = await query.order('sort_order', { ascending: true });
    if (error) throw error;
    const list = data || [];
    list.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || (a.name || '').localeCompare(b.name || ''));
    return { success: true, data: list };
  } catch (error) {
    const msg = error?.message || error?.error_description || 'Unknown error';
    console.error('Error fetching budget categories:', error);
    return { success: false, error: msg, data: [] };
  }
}

export async function getBudgetCategory(id) {
  try {
    const { data, error } = await platformDb.from('budget_categories').select('*').eq('id', id).eq('is_deleted', false).single();
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching budget category:', error);
    return { success: false, error: error.message, data: null };
  }
}

export async function createBudgetCategory(payload) {
  try {
    const { userId, accountId } = await getCurrentUserAndAccountId();
    if (!userId) throw new Error('User not authenticated');
    if (!accountId) throw new Error('User has no organisation');
    const insertData = {
      account_id: accountId,
      name: payload.name,
      code: payload.code || null,
      description: payload.description || null,
      sort_order: payload.sort_order != null ? payload.sort_order : 0,
      is_active: payload.is_active !== undefined ? payload.is_active : true,
      created_by: userId,
      updated_by: userId
    };
    const { data, error } = await platformDb.from('budget_categories').insert(insertData).select().single();
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error creating budget category:', error);
    return { success: false, error: error.message, data: null };
  }
}

export async function updateBudgetCategory(id, payload) {
  try {
    const { userId } = await getCurrentUserAndAccountId();
    if (!userId) throw new Error('User not authenticated');
    const updateData = {
      name: payload.name,
      code: payload.code !== undefined ? payload.code : undefined,
      description: payload.description !== undefined ? payload.description : undefined,
      sort_order: payload.sort_order !== undefined ? payload.sort_order : undefined,
      is_active: payload.is_active !== undefined ? payload.is_active : undefined,
      updated_by: userId,
      updated_at: new Date().toISOString()
    };
    Object.keys(updateData).forEach((k) => updateData[k] === undefined && delete updateData[k]);
    const { data, error } = await platformDb.from('budget_categories').update(updateData).eq('id', id).eq('is_deleted', false).select().single();
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error updating budget category:', error);
    return { success: false, error: error.message, data: null };
  }
}

export async function deleteBudgetCategory(id) {
  try {
    const { userId } = await getCurrentUserAndAccountId();
    if (!userId) throw new Error('User not authenticated');
    const { data, error } = await platformDb.from('budget_categories').update({
      is_deleted: true,
      is_active: false,
      updated_by: userId,
      updated_at: new Date().toISOString()
    }).eq('id', id).eq('is_deleted', false).select().single();
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error deleting budget category:', error);
    return { success: false, error: error.message, data: null };
  }
}

export default { getBudgetCategories, getBudgetCategory, createBudgetCategory, updateBudgetCategory, deleteBudgetCategory };
