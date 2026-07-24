/**
 * Funding Source Service
 * CRUD for funding_sources (PMO master data per organisation)
 * Note: users table has no account_id; account is resolved via accounts.owner_user_id = users.id
 */

import { platformDb } from './supabase/supabaseClient';

/** Get current user's internal id and organisation account id. Resolves from: (1) account owner, (2) project owner, (3) project member. */
async function getCurrentUserAndAccountId() {
  const { data: { user }, error: authError } = await platformDb.auth.getUser();
  if (authError || !user) return { userId: null, accountId: null };

  const { data: userRow, error: userError } = await platformDb
    .from('users')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle();
  if (userError || !userRow?.id) return { userId: userRow?.id ?? null, accountId: null };

  // 1) Account where user is owner
  const { data: accountRow, error: accountError } = await platformDb
    .from('accounts')
    .select('id')
    .eq('owner_user_id', userRow.id)
    .maybeSingle();
  if (!accountError && accountRow?.id) return { userId: userRow.id, accountId: accountRow.id };

  // 2) Any project owned by user
  const { data: projAsOwner } = await platformDb
    .from('projects')
    .select('account_id')
    .eq('owner_user_id', userRow.id)
    .not('account_id', 'is', null)
    .limit(1)
    .maybeSingle();
  if (projAsOwner?.account_id) return { userId: userRow.id, accountId: projAsOwner.account_id };

  // 3) Any project where user is member (user_projects)
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

/**
 * Get funding sources for the current user's organisation
 * @param {Object} options - { activeOnly: boolean }
 * @returns {Promise<{ success: boolean, data: Array }>}
 */
export async function getFundingSources(options = {}) {
  try {
    let query = platformDb
      .from('funding_sources')
      .select('*')
      .eq('is_deleted', false);

    if (options.activeOnly !== false) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query.order('name', { ascending: true });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    const msg = error?.message || error?.error_description || 'Unknown error';
    console.error('Error fetching funding sources:', error);
    return { success: false, error: msg, data: [] };
  }
}

/**
 * Get a single funding source by ID
 */
export async function getFundingSource(id) {
  try {
    const { data, error } = await platformDb
      .from('funding_sources')
      .select('*')
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching funding source:', error);
    return { success: false, error: error.message, data: null };
  }
}

/**
 * Create a funding source
 */
export async function createFundingSource(payload) {
  try {
    const { userId, accountId } = await getCurrentUserAndAccountId();
    if (!userId) throw new Error('User not authenticated');
    if (!accountId) throw new Error('User has no organisation');

    const insertData = {
      account_id: accountId,
      name: payload.name,
      code: payload.code || null,
      description: payload.description || null,
      is_active: payload.is_active !== undefined ? payload.is_active : true,
      created_by: userId,
      updated_by: userId
    };

    const { data, error } = await platformDb
      .from('funding_sources')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error creating funding source:', error);
    return { success: false, error: error.message, data: null };
  }
}

/**
 * Update a funding source
 */
export async function updateFundingSource(id, payload) {
  try {
    const { userId } = await getCurrentUserAndAccountId();
    if (!userId) throw new Error('User not authenticated');

    const updateData = {
      name: payload.name,
      code: payload.code !== undefined ? payload.code : undefined,
      description: payload.description !== undefined ? payload.description : undefined,
      is_active: payload.is_active !== undefined ? payload.is_active : undefined,
      updated_by: userId,
      updated_at: new Date().toISOString()
    };
    Object.keys(updateData).forEach(k => updateData[k] === undefined && delete updateData[k]);

    const { data, error } = await platformDb
      .from('funding_sources')
      .update(updateData)
      .eq('id', id)
      .eq('is_deleted', false)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error updating funding source:', error);
    return { success: false, error: error.message, data: null };
  }
}

/**
 * Soft delete a funding source
 */
export async function deleteFundingSource(id) {
  try {
    const { userId } = await getCurrentUserAndAccountId();
    if (!userId) throw new Error('User not authenticated');

    const { data, error } = await platformDb
      .from('funding_sources')
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
    console.error('Error deleting funding source:', error);
    return { success: false, error: error.message, data: null };
  }
}

export default {
  getFundingSources,
  getFundingSource,
  createFundingSource,
  updateFundingSource,
  deleteFundingSource
};
