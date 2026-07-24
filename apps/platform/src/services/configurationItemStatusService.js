/**
 * Configuration Item Status Service
 * API functions for managing configuration item status changes
 */

import { platformDb, supabase } from './supabaseClient';

/**
 * Update configuration item status
 * @param {string} itemId - Configuration Item ID
 * @param {string} newStatusId - New status definition ID
 * @param {string} changeRequestId - Change request ID (optional)
 * @param {string} reason - Reason for status change (optional)
 * @returns {Promise<Object>} Status history entry
 */
export async function updateStatus(itemId, newStatusId, changeRequestId = null, reason = null) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: userRecord } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (!userRecord) throw new Error('User record not found');

    // Use database function
    const { data: statusHistoryId, error } = await platformDb.rpc('update_ci_status', {
      p_configuration_item_id: itemId,
      p_new_status_id: newStatusId,
      p_change_request_id: changeRequestId,
      p_user_id: userRecord.id,
      p_reason: reason
    });

    if (error) throw error;

    return await getStatusHistoryEntryById(statusHistoryId);
  } catch (error) {
    console.error('Error updating status:', error);
    throw error;
  }
}

/**
 * Get status history for Configuration Item
 * @param {string} itemId - Configuration Item ID
 * @returns {Promise<Array>} Status history
 */
export async function getStatusHistory(itemId) {
  try {
    const { data, error } = await platformDb
      .from('configuration_item_status_history')
      .select(`
        *,
        previous_status:previous_status_id(id, status_name, status_code),
        new_status:new_status_id(id, status_name, status_code),
        changed_by:changed_by_user_id(id, full_name, email),
        approved_by:approved_by_user_id(id, full_name, email),
        change_request:change_request_id(id, change_request_number),
        version:version_id(id, version_number)
      `)
      .eq('configuration_item_id', itemId)
      .order('status_change_date', { ascending: false })
      .order('status_change_time', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching status history:', error);
    throw error;
  }
}

/**
 * Get current status of Configuration Item
 * @param {string} itemId - Configuration Item ID
 * @returns {Promise<Object|null>} Current status
 */
export async function getCurrentStatus(itemId) {
  try {
    const { data, error } = await platformDb
      .from('configuration_items')
      .select(`
        current_status:current_status_id(id, status_name, status_code, status_category, is_editable, requires_approval)
      `)
      .eq('id', itemId)
      .single();

    if (error) throw error;
    return data?.current_status || null;
  } catch (error) {
    console.error('Error fetching current status:', error);
    throw error;
  }
}

/**
 * Check if status transition is allowed
 * @param {string} itemId - Configuration Item ID
 * @param {string} newStatusId - New status definition ID
 * @returns {Promise<Object>} Validation result
 */
export async function canTransitionStatus(itemId, newStatusId) {
  try {
    const { data: currentStatus } = await getCurrentStatus(itemId);
    if (!currentStatus) {
      return { allowed: false, reason: 'No current status found' };
    }

    // Get status definitions to check transition rules
    const { data: newStatus } = await platformDb
      .from('cfg_status_definitions')
      .select('*')
      .eq('id', newStatusId)
      .single();

    if (!newStatus) {
      return { allowed: false, reason: 'New status not found' };
    }

    // Basic validation - can be enhanced with transition rules from strategy
    return {
      allowed: true,
      requiresApproval: newStatus.requires_approval || false,
      currentStatus: currentStatus,
      newStatus: newStatus
    };
  } catch (error) {
    console.error('Error checking status transition:', error);
    throw error;
  }
}

/**
 * Get status history entry by ID
 * @param {string} statusHistoryId - Status history ID
 * @returns {Promise<Object>} Status history entry
 */
async function getStatusHistoryEntryById(statusHistoryId) {
  try {
    const { data, error } = await platformDb
      .from('configuration_item_status_history')
      .select(`
        *,
        previous_status:previous_status_id(id, status_name, status_code),
        new_status:new_status_id(id, status_name, status_code),
        changed_by:changed_by_user_id(id, full_name, email),
        approved_by:approved_by_user_id(id, full_name, email),
        change_request:change_request_id(id, change_request_number),
        version:version_id(id, version_number)
      `)
      .eq('id', statusHistoryId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching status history entry:', error);
    throw error;
  }
}
