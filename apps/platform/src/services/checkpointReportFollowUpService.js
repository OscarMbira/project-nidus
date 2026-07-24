import { supabase } from './supabaseClient';

/**
 * Checkpoint Report Follow-Up Service
 * Handles follow-up items from previous reports
 */

/**
 * Add Follow-Up Item
 * @param {string} reportId - Report ID
 * @param {Object} followUpData - Follow-up data
 * @returns {Promise<Object>} Created follow-up
 */
export async function addFollowUp(reportId, followUpData) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!userData) throw new Error('User not found');

    // Get max display_order
    const { data: existing } = await supabase
      .from('checkpoint_report_follow_ups')
      .select('display_order')
      .eq('checkpoint_report_id', reportId)
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    const insertData = {
      ...followUpData,
      checkpoint_report_id: reportId,
      display_order: followUpData.display_order || (existing?.display_order || 0) + 1,
      created_by: userData.id,
      updated_by: userData.id
    };

    const { data, error } = await supabase
      .from('checkpoint_report_follow_ups')
      .insert(insertData)
      .select(`
        *,
        owner:owner_id(id, full_name, email)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding follow-up:', error);
    throw error;
  }
}

/**
 * Update Follow-Up Item
 * @param {string} followUpId - Follow-up ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated follow-up
 */
export async function updateFollowUp(followUpId, updates) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!userData) throw new Error('User not found');

    const updateData = {
      ...updates,
      updated_by: userData.id
    };

    const { data, error } = await supabase
      .from('checkpoint_report_follow_ups')
      .update(updateData)
      .eq('id', followUpId)
      .select(`
        *,
        owner:owner_id(id, full_name, email)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating follow-up:', error);
    throw error;
  }
}

/**
 * Mark Follow-Up as Complete
 * @param {string} followUpId - Follow-up ID
 * @param {string} resolution - Resolution text
 * @returns {Promise<Object>} Updated follow-up
 */
export async function markFollowUpComplete(followUpId, resolution) {
  try {
    return await updateFollowUp(followUpId, {
      status: 'completed',
      resolution,
      completion_date: new Date().toISOString().split('T')[0]
    });
  } catch (error) {
    console.error('Error marking follow-up complete:', error);
    throw error;
  }
}

/**
 * Get Follow-Ups for Report
 * @param {string} reportId - Report ID
 * @param {string} status - Optional status filter
 * @returns {Promise<Array>} Array of follow-ups
 */
export async function getFollowUps(reportId, status = null) {
  try {
    let query = supabase
      .from('checkpoint_report_follow_ups')
      .select(`
        *,
        owner:owner_id(id, full_name, email)
      `)
      .eq('checkpoint_report_id', reportId)
      .order('display_order', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching follow-ups:', error);
    throw error;
  }
}

/**
 * Get Open Follow-Ups
 * @param {string} reportId - Report ID
 * @returns {Promise<Array>} Array of open follow-ups
 */
export async function getOpenFollowUps(reportId) {
  try {
    return await getFollowUps(reportId);
  } catch (error) {
    console.error('Error fetching open follow-ups:', error);
    throw error;
  }
}

/**
 * Carry Forward Items from Previous Report
 * @param {string} targetReportId - Target Report ID
 * @param {string} sourceReportId - Source Report ID
 * @returns {Promise<number>} Number of items carried forward
 */
export async function carryForwardItems(targetReportId, sourceReportId) {
  try {
    const { data: openItems } = await supabase
      .from('checkpoint_report_follow_ups')
      .select('*')
      .eq('checkpoint_report_id', sourceReportId)
      .in('status', ['open', 'in_progress'])
      .order('display_order', { ascending: true });

    if (!openItems || openItems.length === 0) return 0;

    let count = 0;
    for (const item of openItems) {
      await addFollowUp(targetReportId, {
        source_report_id: sourceReportId,
        follow_up_item: item.follow_up_item,
        follow_up_type: item.follow_up_type,
        original_date: item.original_date || item.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        status: 'carried_forward',
        owner_id: item.owner_id,
        due_date: item.due_date,
        display_order: item.display_order
      });
      count++;
    }

    return count;
  } catch (error) {
    console.error('Error carrying forward items:', error);
    throw error;
  }
}
