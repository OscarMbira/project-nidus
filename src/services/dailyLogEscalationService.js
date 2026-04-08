/**
 * Daily Log Escalation Service
 * Provides escalation functionality for daily log entries
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * Escalate entry to issue
 * @param {string} entryId - Entry ID
 * @returns {Promise<Object>} Escalation result
 */
export async function escalateToIssue(entryId) {
  try {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Get user ID from users table
    const { data: userRecord, error: userError } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (userError || !userRecord) {
      return { success: false, error: 'User record not found' };
    }

    // Call database function
    const { data, error } = await platformDb.rpc('escalate_entry_to_issue', {
      p_entry_id: entryId,
      p_user_id: userRecord.id
    });

    if (error) throw error;

    // Fetch updated entry
    const { data: entry, error: fetchError } = await platformDb
      .from('daily_log_entries')
      .select('*')
      .eq('id', entryId)
      .single();

    if (fetchError) throw fetchError;

    return { success: true, data: { issue_id: data, entry } };
  } catch (error) {
    console.error('Error escalating entry to issue:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Escalate entry to risk
 * @param {string} entryId - Entry ID
 * @returns {Promise<Object>} Escalation result
 */
export async function escalateToRisk(entryId) {
  try {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Get user ID from users table
    const { data: userRecord, error: userError } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (userError || !userRecord) {
      return { success: false, error: 'User record not found' };
    }

    // Call database function
    const { data, error } = await platformDb.rpc('escalate_entry_to_risk', {
      p_entry_id: entryId,
      p_user_id: userRecord.id
    });

    if (error) throw error;

    // Fetch updated entry
    const { data: entry, error: fetchError } = await platformDb
      .from('daily_log_entries')
      .select('*')
      .eq('id', entryId)
      .single();

    if (fetchError) throw fetchError;

    return { success: true, data: { risk_id: data, entry } };
  } catch (error) {
    console.error('Error escalating entry to risk:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Escalate entry to change request
 * @param {string} entryId - Entry ID
 * @returns {Promise<Object>} Escalation result
 */
export async function escalateToChangeRequest(entryId) {
  try {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Get user ID from users table
    const { data: userRecord, error: userError } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (userError || !userRecord) {
      return { success: false, error: 'User record not found' };
    }

    // Update entry status manually (no function exists yet for change requests)
    const { data, error } = await platformDb
      .from('daily_log_entries')
      .update({
        status: 'escalated',
        escalated_to: 'change_request',
        updated_at: new Date().toISOString()
      })
      .eq('id', entryId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error escalating entry to change request:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Link entry to existing issue
 * @param {string} entryId - Entry ID
 * @param {string} issueId - Issue ID
 * @returns {Promise<Object>} Updated entry
 */
export async function linkToIssue(entryId, issueId) {
  try {
    const { data, error } = await platformDb
      .from('daily_log_entries')
      .update({
        escalated_to: 'issue',
        escalated_item_id: issueId,
        status: 'escalated',
        updated_at: new Date().toISOString()
      })
      .eq('id', entryId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error linking entry to issue:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Link entry to existing risk
 * @param {string} entryId - Entry ID
 * @param {string} riskId - Risk ID
 * @returns {Promise<Object>} Updated entry
 */
export async function linkToRisk(entryId, riskId) {
  try {
    const { data, error } = await platformDb
      .from('daily_log_entries')
      .update({
        escalated_to: 'risk',
        escalated_item_id: riskId,
        status: 'escalated',
        updated_at: new Date().toISOString()
      })
      .eq('id', entryId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error linking entry to risk:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Unlink entry from escalated item
 * @param {string} entryId - Entry ID
 * @returns {Promise<Object>} Updated entry
 */
export async function unlinkItem(entryId) {
  try {
    const { data, error } = await platformDb
      .from('daily_log_entries')
      .update({
        escalated_to: null,
        escalated_item_id: null,
        status: 'open',
        updated_at: new Date().toISOString()
      })
      .eq('id', entryId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error unlinking entry:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get linked items for an entry
 * @param {string} entryId - Entry ID
 * @returns {Promise<Object>} Linked items
 */
export async function getLinkedItems(entryId) {
  try {
    const { data, error } = await platformDb
      .from('daily_log_entries')
      .select('escalated_to, escalated_item_id')
      .eq('id', entryId)
      .single();

    if (error) throw error;

    const linkedItems = {
      type: data.escalated_to,
      id: data.escalated_item_id
    };

    // TODO: Fetch actual issue/risk data when tables are available
    // if (data.escalated_to === 'issue' && data.escalated_item_id) {
    //   const issue = await getIssueById(data.escalated_item_id);
    //   linkedItems.item = issue;
    // }

    return { success: true, data: linkedItems };
  } catch (error) {
    console.error('Error getting linked items:', error);
    return { success: false, error: error.message };
  }
}
