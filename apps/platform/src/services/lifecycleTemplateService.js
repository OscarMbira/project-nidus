/**
 * Lifecycle Template Service – CRUD for lifecycle_templates (PMO master data).
 * Used for Project Create dropdown and PMO Admin management screen.
 */

import { platformDb } from './supabase/supabaseClient';

async function getCurrentUserAndAccountId() {
  const { data: { user }, error: authError } = await platformDb.auth.getUser();
  if (authError || !user) return { userId: null, accountId: null };

  const { data: userRow, error: userError } = await platformDb
    .from('users')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle();
  if (userError || !userRow?.id) return { userId: userRow?.id ?? null, accountId: null };

  const { data: accountRow, error: accountError } = await platformDb
    .from('accounts')
    .select('id')
    .eq('owner_user_id', userRow.id)
    .maybeSingle();
  if (!accountError && accountRow?.id) return { userId: userRow.id, accountId: accountRow.id };

  const { data: projAsOwner } = await platformDb
    .from('projects')
    .select('account_id')
    .eq('owner_user_id', userRow.id)
    .not('account_id', 'is', null)
    .limit(1)
    .maybeSingle();
  if (projAsOwner?.account_id) return { userId: userRow.id, accountId: projAsOwner.account_id };

  const { data: memberRows } = await platformDb
    .from('user_projects')
    .select('project_id')
    .eq('user_id', userRow.id)
    .eq('is_deleted', false)
    .limit(5);
  if (memberRows?.length) {
    const projectIds = memberRows.map((r) => r.project_id);
    const { data: proj } = await platformDb
      .from('projects')
      .select('account_id')
      .in('id', projectIds)
      .not('account_id', 'is', null)
      .limit(1)
      .maybeSingle();
    if (proj?.account_id) return { userId: userRow.id, accountId: proj.account_id };
  }

  return { userId: userRow.id, accountId: null };
}

export async function getLifecycleTemplates(options = {}) {
  try {
    let query = platformDb.from('lifecycle_templates').select('*').eq('is_deleted', false);
    if (options.activeOnly !== false) query = query.eq('is_active', true);
    const { data, error } = await query.order('sort_order', { ascending: true }).order('name', { ascending: true });
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    const msg = error?.message || error?.error_description || 'Unknown error';
    console.error('Error fetching lifecycle templates:', error);
    return { success: false, error: msg, data: [] };
  }
}

export async function getLifecycleTemplate(id) {
  try {
    const { data, error } = await platformDb
      .from('lifecycle_templates')
      .select('*')
      .eq('id', id)
      .eq('is_deleted', false)
      .single();
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    const msg = error?.message || error?.error_description || 'Unknown error';
    console.error('Error fetching lifecycle template:', error);
    return { success: false, error: msg, data: null };
  }
}

export async function createLifecycleTemplate(payload) {
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

    const { data, error } = await platformDb
      .from('lifecycle_templates')
      .insert(insertData)
      .select()
      .single();
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    const msg = error?.message || error?.error_description || 'Unknown error';
    console.error('Error creating lifecycle template:', error);
    return { success: false, error: msg, data: null };
  }
}

export async function updateLifecycleTemplate(id, payload) {
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

    const { data, error } = await platformDb
      .from('lifecycle_templates')
      .update(updateData)
      .eq('id', id)
      .eq('is_deleted', false)
      .select()
      .single();
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    const msg = error?.message || error?.error_description || 'Unknown error';
    console.error('Error updating lifecycle template:', error);
    return { success: false, error: msg, data: null };
  }
}

export async function deleteLifecycleTemplate(id) {
  try {
    const { userId } = await getCurrentUserAndAccountId();
    if (!userId) throw new Error('User not authenticated');

    const { data, error } = await platformDb
      .from('lifecycle_templates')
      .update({
        is_deleted: true,
        is_active: false,
        updated_by: userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('is_deleted', false)
      .select()
      .single();
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    const msg = error?.message || error?.error_description || 'Unknown error';
    console.error('Error deleting lifecycle template:', error);
    return { success: false, error: msg, data: null };
  }
}

export default {
  getLifecycleTemplates,
  getLifecycleTemplate,
  createLifecycleTemplate,
  updateLifecycleTemplate,
  deleteLifecycleTemplate
};

