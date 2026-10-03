/**
 * Timesheet Entry Review Reason Catalog Service (v1169)
 * CRUD operations for timesheet_entry_approve_reasons / timesheet_entry_reject_reasons —
 * mirrors assignmentRoleService.js's shape, parameterized by decision so both catalogs
 * share one implementation.
 */

import { platformDb } from './supabase/supabaseClient';

const TABLE_BY_DECISION = {
  approved: 'timesheet_entry_approve_reasons',
  rejected: 'timesheet_entry_reject_reasons',
};

function tableFor(decision) {
  const table = TABLE_BY_DECISION[decision];
  if (!table) throw new Error(`Unknown reason catalog decision: ${decision}`);
  return table;
}

/**
 * @param {'approved'|'rejected'} decision
 * @param {Object} [filters]
 * @returns {Promise<Object>} { success, data }
 */
export async function getReviewReasons(decision, filters = {}) {
  try {
    let query = platformDb
      .from(tableFor(decision))
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
    console.error('Error fetching review reasons:', error);
    return { success: false, error: error.message, data: [] };
  }
}

/** Resolve reason ids to display names across BOTH catalogs in one pair of lookups — for
 * rendering Review History where a row's decision (and so its source table) is already known. */
export async function getReviewReasonsByIds(decision, ids) {
  if (!ids || ids.length === 0) return { success: true, data: [] };
  try {
    const { data, error } = await platformDb
      .from(tableFor(decision))
      .select('id, name')
      .in('id', ids);
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error resolving review reasons:', error);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * @param {'approved'|'rejected'} decision
 * @param {Object} reasonData
 * @returns {Promise<Object>} { success, data }
 */
export async function createReviewReason(decision, reasonData) {
  try {
    const insertData = {
      code: reasonData.code,
      name: reasonData.name,
      description: reasonData.description || null,
      sort_order: reasonData.sort_order || 0,
      is_active: reasonData.is_active !== undefined ? reasonData.is_active : true,
    };

    const { data, error } = await platformDb
      .from(tableFor(decision))
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error creating review reason:', error);
    return { success: false, error: error.message, data: null };
  }
}

export async function updateReviewReason(decision, reasonId, reasonData) {
  try {
    const updateData = {
      code: reasonData.code,
      name: reasonData.name,
      description: reasonData.description || null,
      sort_order: reasonData.sort_order || 0,
      is_active: reasonData.is_active !== undefined ? reasonData.is_active : true,
    };

    const { data, error } = await platformDb
      .from(tableFor(decision))
      .update(updateData)
      .eq('id', reasonId)
      .eq('is_deleted', false)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error updating review reason:', error);
    return { success: false, error: error.message, data: null };
  }
}

export async function deleteReviewReason(decision, reasonId) {
  try {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: userRecord } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    const { data, error } = await platformDb
      .from(tableFor(decision))
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userRecord?.id || null,
        is_active: false,
      })
      .eq('id', reasonId)
      .eq('is_deleted', false)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error deleting review reason:', error);
    return { success: false, error: error.message, data: null };
  }
}

export default {
  getReviewReasons,
  getReviewReasonsByIds,
  createReviewReason,
  updateReviewReason,
  deleteReviewReason,
};
