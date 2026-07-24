import { supabase } from './supabaseClient';

/**
 * Checkpoint Report Quality Service
 * Handles quality activities and quality checks for Checkpoint Reports
 */

/**
 * Add Quality Activity
 * @param {string} reportId - Report ID
 * @param {Object} activityData - Activity data
 * @returns {Promise<Object>} Created activity
 */
export async function addQualityActivity(reportId, activityData) {
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
      .from('checkpoint_report_quality_activities')
      .select('display_order')
      .eq('checkpoint_report_id', reportId)
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    const insertData = {
      ...activityData,
      checkpoint_report_id: reportId,
      display_order: activityData.display_order || (existing?.display_order || 0) + 1,
      created_by: userData.id,
      updated_by: userData.id
    };

    const { data, error } = await supabase
      .from('checkpoint_report_quality_activities')
      .insert(insertData)
      .select(`
        *,
        responsible:responsible_id(id, full_name, email)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding quality activity:', error);
    throw error;
  }
}

/**
 * Update Quality Activity
 * @param {string} activityId - Activity ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated activity
 */
export async function updateQualityActivity(activityId, updates) {
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
      .from('checkpoint_report_quality_activities')
      .update(updateData)
      .eq('id', activityId)
      .select(`
        *,
        responsible:responsible_id(id, full_name, email)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating quality activity:', error);
    throw error;
  }
}

/**
 * Delete Quality Activity
 * @param {string} activityId - Activity ID
 * @returns {Promise<void>}
 */
export async function deleteQualityActivity(activityId) {
  try {
    const { error } = await supabase
      .from('checkpoint_report_quality_activities')
      .delete()
      .eq('id', activityId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting quality activity:', error);
    throw error;
  }
}

/**
 * Get Quality Activities for Report
 * @param {string} reportId - Report ID
 * @param {string} periodType - Optional: 'current' or 'next'
 * @returns {Promise<Array>} Array of activities
 */
export async function getQualityActivities(reportId, periodType = null) {
  try {
    let query = supabase
      .from('checkpoint_report_quality_activities')
      .select(`
        *,
        responsible:responsible_id(id, full_name, email)
      `)
      .eq('checkpoint_report_id', reportId)
      .order('display_order', { ascending: true });

    if (periodType) {
      query = query.eq('period_type', periodType);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching quality activities:', error);
    throw error;
  }
}

/**
 * Get Quality Activities for Current Period
 * @param {string} reportId - Report ID
 * @returns {Promise<Array>} Array of activities
 */
export async function getQualityActivitiesCurrent(reportId) {
  try {
    return await getQualityActivities(reportId, 'current');
  } catch (error) {
    console.error('Error fetching current quality activities:', error);
    throw error;
  }
}

/**
 * Get Quality Activities for Next Period
 * @param {string} reportId - Report ID
 * @returns {Promise<Array>} Array of activities
 */
export async function getQualityActivitiesNext(reportId) {
  try {
    return await getQualityActivities(reportId, 'next');
  } catch (error) {
    console.error('Error fetching next quality activities:', error);
    throw error;
  }
}

/**
 * Run Quality Checks
 * @param {string} reportId - Report ID
 * @returns {Promise<Array>} Quality check results
 */
export async function runQualityChecks(reportId) {
  try {
    const { data, error } = await supabase.rpc('run_checkpoint_quality_checks', {
      p_checkpoint_report_id: reportId
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error running quality checks:', error);
    throw error;
  }
}

/**
 * Get Quality Check Status
 * @param {string} reportId - Report ID
 * @returns {Promise<Object>} Quality check summary
 */
export async function getQualityCheckStatus(reportId) {
  try {
    const { data, error } = await supabase.rpc('get_checkpoint_quality_summary', {
      p_checkpoint_report_id: reportId
    });

    if (error) throw error;
    return data?.[0] || null;
  } catch (error) {
    console.error('Error getting quality check status:', error);
    return null;
  }
}

/**
 * Update Quality Check
 * @param {string} checkId - Quality Check ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated check
 */
export async function updateQualityCheck(checkId, updates) {
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
      checked_by: userData.id,
      checked_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('checkpoint_report_quality_checks')
      .update(updateData)
      .eq('id', checkId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating quality check:', error);
    throw error;
  }
}

/**
 * Get Quality Checks for Report
 * @param {string} reportId - Report ID
 * @returns {Promise<Array>} Array of quality checks
 */
export async function getQualityChecks(reportId) {
  try {
    const { data, error } = await supabase
      .from('checkpoint_report_quality_checks')
      .select('*')
      .eq('checkpoint_report_id', reportId)
      .order('criterion_number', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching quality checks:', error);
    throw error;
  }
}
